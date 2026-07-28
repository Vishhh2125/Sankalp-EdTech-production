import { prisma } from '../../prisma/client.js';
import { checkShowAccess } from '../user/episode-access.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import minioClient from '../../config/minio.js';
import config from '../../config/index.js';
import { getPublicUrl } from '../../utils/presigned-url.js';
import { scanFile } from '../../utils/virus-scanner.js';
import { evaluateCertificateCompletion } from '../certificate/certificate.service.js';

function validateFileType(filename, mimetype) {
  const allowedExtensions = ['.ppt', '.pptx', '.doc', '.docx', '.pdf', '.png', '.jpg', '.jpeg'];
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ];

  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext) && allowedMimeTypes.includes(mimetype);
}

// ==========================================
// User capabilities (Lock computation)
// ==========================================

async function getAssignments(showId, userId, isGuest) {
  const showAccess = await checkShowAccess(userId, isGuest, showId);

  const assignments = await prisma.assignment.findMany({
    where: { show_id: showId, is_active: true },
    orderBy: { order_index: 'asc' },
  });

  if (showAccess.is_locked) {
    return assignments.map((asm) => ({
      id: asm.id,
      show_id: asm.show_id,
      title: asm.title,
      problem_statement: null,
      due_at: asm.due_at,
      min_passing_grade: asm.min_passing_grade,
      order_index: asm.order_index,
      is_locked: true,
      lock_reason: showAccess.lock_reason,
      submission: null,
    }));
  }

  // Fetch user submissions for this show's assignments
  const submissions = userId
    ? await prisma.assignmentSubmission.findMany({
        where: { user_id: userId, assignment: { show_id: showId } },
      })
    : [];

  const submissionMap = new Map(
    submissions.map((sub) => [sub.assignment_id, sub])
  );

  let prevSubmitted = true; // First assignment is always unlocked

  return assignments.map((asm, index) => {
    const submission = submissionMap.get(asm.id) || null;
    let is_locked = false;

    if (index > 0 && !prevSubmitted) {
      is_locked = true;
    }

    // Set the tracker for the next assignment in list
    prevSubmitted = submission && (submission.status === 'SUBMITTED' || submission.status === 'GRADED');

    return {
      id: asm.id,
      show_id: asm.show_id,
      title: asm.title,
      problem_statement: is_locked ? null : asm.problem_statement,
      due_at: asm.due_at,
      min_passing_grade: asm.min_passing_grade,
      order_index: asm.order_index,
      is_locked,
      submission: submission ? {
        id: submission.id,
        status: submission.status,
        score: submission.score,
        feedback: submission.feedback,
        answer_text: submission.answer_text,
        attachment_url: submission.attachment_url,
        submitted_at: submission.submitted_at,
        graded_at: submission.graded_at,
      } : null,
    };
  });
}

async function getMaterials(showId, userId, isGuest) {
  const showAccess = await checkShowAccess(userId, isGuest, showId);
  if (showAccess.is_locked) {
    throw new AppError('Access to course coursework is locked', 403);
  }

  return prisma.material.findMany({
    where: { show_id: showId, is_active: true },
    orderBy: { order_index: 'asc' },
  });
}

async function getQuizzes(showId, userId, isGuest) {
  const showAccess = await checkShowAccess(userId, isGuest, showId);

  const quizzes = await prisma.quiz.findMany({
    where: { show_id: showId, is_active: true },
    orderBy: { order_index: 'asc' },
    include: {
      _count: {
        select: { questions: true },
      },
    },
  });

  if (showAccess.is_locked) {
    return quizzes.map((qz) => ({
      id: qz.id,
      show_id: qz.show_id,
      title: qz.title,
      order_index: qz.order_index,
      pass_score_percent: qz.pass_score_percent,
      is_locked: true,
      lock_reason: showAccess.lock_reason,
      question_count: qz._count.questions,
      attempt: null,
    }));
  }

  // Fetch user attempts for these quizzes
  const attempts = userId
    ? await prisma.quizAttempt.findMany({
        where: { user_id: userId, quiz: { show_id: showId } },
      })
    : [];

  const attemptMap = new Map(attempts.map((att) => [att.quiz_id, att]));

  let prevCompleted = true; // First quiz is always unlocked

  return quizzes.map((qz, index) => {
    const attempt = attemptMap.get(qz.id) || null;
    let is_locked = false;

    if (index > 0 && !prevCompleted) {
      is_locked = true;
    }

    // Set the tracker for the next quiz in list
    prevCompleted = attempt !== null;

    return {
      id: qz.id,
      show_id: qz.show_id,
      title: qz.title,
      order_index: qz.order_index,
      pass_score_percent: qz.pass_score_percent,
      is_locked,
      question_count: qz._count.questions,
      attempt: attempt ? {
        id: attempt.id,
        score: attempt.score,
        total_questions: attempt.total_questions,
        completed_at: attempt.completed_at,
      } : null,
    };
  });
}

// ==========================================
// Admin capabilities (Coursework CRUD)
// ==========================================

async function createAssignment(showId, data) {
  const show = await prisma.show.findUnique({ where: { id: showId } });
  if (!show) throw new AppError('Show not found', 404);

  const dueRaw = data.due_at || data.due_date;
  return prisma.assignment.create({
    data: {
      show_id: showId,
      title: data.title,
      problem_statement: data.problem_statement || '',
      due_at: dueRaw ? new Date(dueRaw) : null,
      order_index: parseInt(data.order_index, 10),
      min_passing_grade: data.min_passing_grade || 'GRADE_C',
      is_active: data.is_active !== undefined ? data.is_active : true,
    },
  });
}

async function updateAssignment(id, data) {
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) throw new AppError('Assignment not found', 404);

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.problem_statement !== undefined) updateData.problem_statement = data.problem_statement || '';
  if (data.due_at !== undefined || data.due_date !== undefined) {
    const dueRaw = data.due_at || data.due_date;
    updateData.due_at = dueRaw ? new Date(dueRaw) : null;
  }
  if (data.order_index !== undefined) updateData.order_index = parseInt(data.order_index, 10);
  if (data.min_passing_grade !== undefined) updateData.min_passing_grade = data.min_passing_grade;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  return prisma.assignment.update({
    where: { id },
    data: updateData,
  });
}

async function deleteAssignment(id) {
  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) throw new AppError('Assignment not found', 404);

  return prisma.assignment.delete({ where: { id } });
}

async function createMaterial(showId, data, file) {
  if (!file) throw new AppError('Material file is required', 400);

  // Validate type
  if (!validateFileType(file.originalname, file.mimetype)) {
    fs.unlink(file.path, () => {});
    throw new AppError('Invalid file type. Allowed: PPT, DOC, PDF, PNG, JPEG', 400);
  }

  // Validate size (15MB)
  if (file.size > 15 * 1024 * 1024) {
    fs.unlink(file.path, () => {});
    throw new AppError('File size exceeds the maximum limit of 15MB', 400);
  }

  // Scan for malware
  const scanResult = await scanFile(file.path);
  if (!scanResult.clean) {
    fs.unlink(file.path, () => {});
    throw new AppError('Malware detected in uploaded file', 400);
  }

  const show = await prisma.show.findUnique({ where: { id: showId } });
  if (!show) {
    fs.unlink(file.path, () => {});
    throw new AppError('Show not found', 404);
  }

  const materialId = uuidv4();
  const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const objectName = `materials/${showId}/${materialId}/${safeFilename}`;

  try {
    const metaData = { 'Content-Type': file.mimetype };
    await minioClient.fPutObject(config.minio.bucket, objectName, file.path, metaData);
    const fileUrl = getPublicUrl(objectName);

    fs.unlink(file.path, () => {});

    return prisma.material.create({
      data: {
        id: materialId,
        show_id: showId,
        title: data.title,
        file_url: fileUrl,
        file_type: path.extname(file.originalname).substring(1).toUpperCase(),
        file_size_bytes: file.size,
        order_index: parseInt(data.order_index, 10),
        is_active: data.is_active !== undefined ? data.is_active : true,
      },
    });
  } catch (err) {
    fs.unlink(file.path, () => {});
    throw new AppError(`Failed to save material: ${err.message}`, 500);
  }
}

async function updateMaterial(id, data) {
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) throw new AppError('Material not found', 404);

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.file_url !== undefined) updateData.file_url = data.file_url;
  if (data.file_type !== undefined) updateData.file_type = data.file_type;
  if (data.file_size_bytes !== undefined) updateData.file_size_bytes = data.file_size_bytes ? parseInt(data.file_size_bytes, 10) : null;
  if (data.order_index !== undefined) updateData.order_index = parseInt(data.order_index, 10);
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  return prisma.material.update({
    where: { id },
    data: updateData,
  });
}

async function deleteMaterial(id) {
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) throw new AppError('Material not found', 404);

  return prisma.material.delete({ where: { id } });
}

async function createQuiz(showId, data) {
  const show = await prisma.show.findUnique({ where: { id: showId } });
  if (!show) throw new AppError('Show not found', 404);

  return prisma.quiz.create({
    data: {
      show_id: showId,
      title: data.title,
      order_index: parseInt(data.order_index, 10),
      pass_score_percent: data.pass_score_percent !== undefined ? parseInt(data.pass_score_percent, 10) : 70,
      is_active: data.is_active !== undefined ? data.is_active : true,
    },
  });
}

async function updateQuiz(id, data) {
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) throw new AppError('Quiz not found', 404);

  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.order_index !== undefined) updateData.order_index = parseInt(data.order_index, 10);
  if (data.pass_score_percent !== undefined) updateData.pass_score_percent = parseInt(data.pass_score_percent, 10);
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  return prisma.quiz.update({
    where: { id },
    data: updateData,
  });
}

async function deleteQuiz(id) {
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) throw new AppError('Quiz not found', 404);

  return prisma.quiz.delete({ where: { id } });
}

async function createQuizQuestion(quizId, data) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new AppError('Quiz not found', 404);

  // We check if the quiz has attempts. If yes, reject question creation
  const hasAttempts = await prisma.quizAttempt.findFirst({ where: { quiz_id: quizId } });
  if (hasAttempts) {
    throw new AppError('Cannot add questions to a quiz that has already been attempted', 400);
  }

  // Create question and options inside a transaction
  return prisma.$transaction(async (tx) => {
    const question = await tx.quizQuestion.create({
      data: {
        quiz_id: quizId,
        question_text: data.question_text,
        explanation: data.explanation || null,
        order_index: parseInt(data.order_index, 10),
      },
    });

    // Create options
    await Promise.all(
      data.options.map((opt) =>
        tx.quizOption.create({
          data: {
            question_id: question.id,
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            order_index: parseInt(opt.order_index, 10),
          },
        })
      )
    );

    return tx.quizQuestion.findUnique({
      where: { id: question.id },
      include: { options: true },
    });
  });
}

async function deleteQuizQuestion(id) {
  const question = await prisma.quizQuestion.findUnique({
    where: { id },
    select: { quiz_id: true },
  });
  if (!question) throw new AppError('Quiz question not found', 404);

  const hasAttempts = await prisma.quizAttempt.findFirst({ where: { quiz_id: question.quiz_id } });
  if (hasAttempts) {
    throw new AppError('Cannot delete questions from a quiz that has already been attempted', 400);
  }

  return prisma.quizQuestion.delete({ where: { id } });
}

async function submitAssignment(assignmentId, userId, data, file) {
  if (!data.answer_text && !file) {
    throw new AppError('Submission must include either text answer or file attachment', 400);
  }

  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) {
    if (file) fs.unlink(file.path, () => {});
    throw new AppError('Assignment not found', 404);
  }

  const showAccess = await checkShowAccess(userId, false, assignment.show_id);
  if (showAccess.is_locked) {
    if (file) fs.unlink(file.path, () => {});
    throw new AppError('Access to course coursework is locked', 403);
  }

  if (file) {
    // Validate type
    if (!validateFileType(file.originalname, file.mimetype)) {
      fs.unlink(file.path, () => {});
      throw new AppError('Invalid file type. Allowed: PPT, DOC, PDF, PNG, JPEG', 400);
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      fs.unlink(file.path, () => {});
      throw new AppError('File size exceeds the maximum limit of 5MB', 400);
    }

    // Scan for malware
    const scanResult = await scanFile(file.path);
    if (!scanResult.clean) {
      fs.unlink(file.path, () => {});
      throw new AppError('Malware detected in uploaded file', 400);
    }
  }

  const existingSubmission = await prisma.assignmentSubmission.findUnique({
    where: {
      assignment_id_user_id: {
        assignment_id: assignmentId,
        user_id: userId,
      },
    },
  });

  if (existingSubmission && (existingSubmission.status === 'GRADED_PASSED' || existingSubmission.status === 'GRADED')) {
    if (file) fs.unlink(file.path, () => {});
    throw new AppError('Cannot resubmit an approved assignment', 400);
  }

  let fileUrl = null;
  if (file) {
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectName = `assignments/${assignmentId}/submissions/${userId}/${safeFilename}`;
    try {
      const metaData = { 'Content-Type': file.mimetype };
      await minioClient.fPutObject(config.minio.bucket, objectName, file.path, metaData);
      fileUrl = getPublicUrl(objectName);
      fs.unlink(file.path, () => {});
    } catch (err) {
      fs.unlink(file.path, () => {});
      throw new AppError(`Failed to save attachment: ${err.message}`, 500);
    }
  }

  if (existingSubmission) {
    return prisma.assignmentSubmission.update({
      where: { id: existingSubmission.id },
      data: {
        answer_text: data.answer_text !== undefined ? data.answer_text : existingSubmission.answer_text,
        attachment_url: file ? fileUrl : existingSubmission.attachment_url,
        status: 'SUBMITTED',
        submitted_at: new Date(),
      },
    });
  }

  return prisma.assignmentSubmission.create({
    data: {
      assignment_id: assignmentId,
      user_id: userId,
      answer_text: data.answer_text || null,
      attachment_url: fileUrl,
      status: 'SUBMITTED',
      submitted_at: new Date(),
    },
  });
}

async function getSubmissions(filters, page = 1, limit = 20) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.show_id) where.assignment = { show_id: filters.show_id };

  if (filters.requesting_user && filters.requesting_user.role === 'TEACHER') {
    where.assignment = {
      ...where.assignment,
      show: { teacher_id: filters.requesting_user.id }
    };
  }

  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.assignmentSubmission.count({ where }),
    prisma.assignmentSubmission.findMany({
      where,
      skip,
      take: limit,
      orderBy: { submitted_at: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        assignment: {
          select: { id: true, title: true, show_id: true }
        }
      }
    })
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    items
  };
}

async function gradeSubmission(submissionId, score, feedback, letter_grade) {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  });
  if (!submission) throw new AppError('Submission not found', 404);

  const gradeDefaults = {
    GRADE_A: 95,
    GRADE_B: 85,
    GRADE_C: 75,
    GRADE_D: 65,
    GRADE_F: 50,
  };

  let numericScore = score !== undefined && score !== null && !isNaN(parseInt(score, 10))
    ? parseInt(score, 10)
    : (letter_grade && gradeDefaults[letter_grade] !== undefined ? gradeDefaults[letter_grade] : 75);

  let letterGrade = letter_grade || 'GRADE_F';
  if (!letter_grade) {
    if (numericScore >= 90) letterGrade = 'GRADE_A';
    else if (numericScore >= 80) letterGrade = 'GRADE_B';
    else if (numericScore >= 70) letterGrade = 'GRADE_C';
    else if (numericScore >= 60) letterGrade = 'GRADE_D';
  }

  const minGradeScores = {
    GRADE_A: 90,
    GRADE_B: 80,
    GRADE_C: 70,
    GRADE_D: 60,
    GRADE_F: 0,
  };
  const minScoreRequired = minGradeScores[submission.assignment.min_passing_grade] || 70;
  const status = numericScore >= minScoreRequired ? 'GRADED_PASSED' : 'NEEDS_REVISION';

  const updatedSubmission = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      score: numericScore,
      letter_grade: letterGrade,
      status: status,
      feedback: feedback || null,
      graded_at: new Date(),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignment: { select: { id: true, title: true, show_id: true } },
    },
  });

  if (status === 'GRADED_PASSED' && updatedSubmission.assignment && updatedSubmission.assignment.show_id) {
    evaluateCertificateCompletion(submission.user_id, updatedSubmission.assignment.show_id).catch(() => {});
  }

  return updatedSubmission;
}

async function getQuizQuestions(quizId, userId, isGuest, isAdmin = false) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new AppError('Quiz not found', 404);

  // Check show-level access (skip for admin)
  if (!isAdmin) {
    const showAccess = await checkShowAccess(userId, isGuest, quiz.show_id);
    if (showAccess.is_locked) {
      throw new AppError('Access to course coursework is locked', 403);
    }

    // Check quiz sequencing lock
    const quizzes = await prisma.quiz.findMany({
      where: { show_id: quiz.show_id, is_active: true },
      orderBy: { order_index: 'asc' },
    });

    const quizIndex = quizzes.findIndex((q) => q.id === quizId);
    if (quizIndex > 0) {
      const prevQuiz = quizzes[quizIndex - 1];
      const prevAttempt = await prisma.quizAttempt.findFirst({
        where: { user_id: userId, quiz_id: prevQuiz.id },
      });
      if (!prevAttempt) {
        throw new AppError('This quiz is locked because the previous quiz has not been attempted', 403);
      }
    }
  }

  const includeOptions = isAdmin
    ? { orderBy: { order_index: 'asc' } }
    : {
        select: {
          id: true,
          option_text: true,
          order_index: true,
        },
        orderBy: { order_index: 'asc' },
      };

  return prisma.quizQuestion.findMany({
    where: { quiz_id: quizId },
    orderBy: { order_index: 'asc' },
    include: {
      options: includeOptions,
    },
  });
}

async function submitQuizAttempt(quizId, userId, answers) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new AppError('Quiz not found', 404);

  // Check if student has ALREADY PASSED this quiz in a previous attempt
  const previousAttempts = await prisma.quizAttempt.findMany({
    where: { user_id: userId, quiz_id: quizId },
  });

  const passScorePercent = quiz.pass_score_percent !== undefined ? quiz.pass_score_percent : 70;
  const hasPassed = previousAttempts.some((att) => {
    if (!att.total_questions || att.total_questions === 0) return false;
    const pct = (att.score / att.total_questions) * 100;
    return pct >= passScorePercent;
  });

  if (hasPassed) {
    throw new AppError('Quiz has already been passed. Further attempts are locked.', 400);
  }

  // Check show-level access
  const showAccess = await checkShowAccess(userId, false, quiz.show_id);
  if (showAccess.is_locked) {
    throw new AppError('Access to course coursework is locked', 403);
  }

  // Check sequencing lock
  const quizzes = await prisma.quiz.findMany({
    where: { show_id: quiz.show_id, is_active: true },
    orderBy: { order_index: 'asc' },
  });

  const quizIndex = quizzes.findIndex((q) => q.id === quizId);
  if (quizIndex > 0) {
    const prevQuiz = quizzes[quizIndex - 1];
    const prevAttempt = await prisma.quizAttempt.findFirst({
      where: { user_id: userId, quiz_id: prevQuiz.id },
    });
    if (!prevAttempt) {
      throw new AppError('This quiz is locked because the previous quiz has not been attempted', 403);
    }
  }

  // Fetch quiz questions & correct options
  const questions = await prisma.quizQuestion.findMany({
    where: { quiz_id: quizId },
    include: { options: true },
  });

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // Auto-scoring logic
  let correctCount = 0;
  const processedAnswers = [];

  for (const ans of answers) {
    const question = questionMap.get(ans.question_id);
    if (!question) {
      throw new AppError(`Invalid question ID: ${ans.question_id} for this quiz`, 400);
    }

    const selectedOption = question.options.find((o) => o.id === ans.option_id);
    if (!selectedOption) {
      throw new AppError(`Invalid option ID: ${ans.option_id} for question: ${ans.question_id}`, 400);
    }

    if (selectedOption.is_correct) {
      correctCount++;
    }

    processedAnswers.push({
      question_id: ans.question_id,
      selected_option_id: ans.option_id,
      is_correct: selectedOption.is_correct,
      correct_option_id: question.options.find((o) => o.is_correct).id,
    });
  }

  // Record attempt in transaction
  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.create({
      data: {
        quiz_id: quizId,
        user_id: userId,
        score: correctCount,
        total_questions: questions.length,
        completed_at: new Date(),
      },
    });

    await Promise.all(
      processedAnswers.map((pa) =>
        tx.quizAnswer.create({
          data: {
            attempt_id: attempt.id,
            question_id: pa.question_id,
            selected_option_id: pa.selected_option_id,
            is_correct: pa.is_correct,
          },
        })
      )
    );

    return attempt;
  });

  if (result.total_questions > 0 && (result.score / result.total_questions) * 100 >= passScorePercent) {
    evaluateCertificateCompletion(userId, quiz.show_id).catch(() => {});
  }

  // Construct response with instant explanations and correctness answers
  const details = questions.map((q) => {
    const ans = processedAnswers.find((pa) => pa.question_id === q.id);
    const correctOpt = q.options.find((o) => o.is_correct);

    return {
      id: q.id,
      question_text: q.question_text,
      explanation: q.explanation,
      selected_option_id: ans ? ans.selected_option_id : null,
      is_correct: ans ? ans.is_correct : false,
      correct_option: {
        id: correctOpt.id,
        option_text: correctOpt.option_text,
      },
      options: q.options.map((o) => ({
        id: o.id,
        option_text: o.option_text,
        is_correct: o.is_correct,
        order_index: o.order_index,
      })),
    };
  });

  return {
    id: result.id,
    quiz_id: quizId,
    score: result.score,
    total_questions: result.total_questions,
    completed_at: result.completed_at,
    results: details,
  };
}

export {
  getAssignments,
  getMaterials,
  getQuizzes,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createQuizQuestion,
  deleteQuizQuestion,
  submitAssignment,
  getSubmissions,
  gradeSubmission,
  getQuizQuestions,
  submitQuizAttempt,
};
