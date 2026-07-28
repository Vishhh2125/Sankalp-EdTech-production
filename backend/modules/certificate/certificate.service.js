import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../middleware/error.middleware.js';
import minioClient from '../../config/minio.js';
import { getPublicUrl } from '../../utils/presigned-url.js';
import config from '../../config/index.js';
import { generateCertificatePdfBuffer } from '../../utils/certificate-pdf.js';

const prisma = new PrismaClient();

/**
 * Evaluates whether a student has completed all enabled criteria for a course,
 * and issues a Certificate of Completion if 100% fulfilled.
 * 
 * Non-intrusive & Idempotent:
 * - Exits immediately if certificate is disabled or student already has a certificate.
 * - Handles 0 quizzes or 0 assignments gracefully (0/0 = 100% fulfilled).
 */
export async function evaluateCertificateCompletion(userId, showId) {
  if (!userId || !showId) return null;

  // 1. Fetch Show and Certificate Settings
  const show = await prisma.show.findUnique({
    where: { id: showId },
    include: {
      teacher: { select: { id: true, name: true } },
    },
  });

  if (!show || !show.certificate_enabled) {
    return null;
  }

  // 2. Idempotency Guard: Check if certificate was ALREADY generated
  const existingCert = await prisma.certificate.findUnique({
    where: {
      idx_cert_user_show: {
        user_id: userId,
        show_id: showId,
      },
    },
  });

  if (existingCert) {
    return existingCert;
  }

  // 3. Lecture Watch Requirement Check (cert_req_videos)
  if (show.cert_req_videos) {
    const episodes = await prisma.episode.findMany({
      where: { show_id: showId, approval_status: 'PUBLISHED' },
    });

    if (episodes.length > 0) {
      const episodeIds = episodes.map((ep) => ep.id);
      const watchRecords = await prisma.watchHistory.findMany({
        where: {
          user_id: userId,
          episode_id: { in: episodeIds },
        },
      });

      const watchMap = new Map(watchRecords.map((w) => [w.episode_id, w]));

      const allVideosCompleted = episodes.every((ep) => {
        const wh = watchMap.get(ep.id);
        if (!wh) return false;
        if (wh.is_completed) return true;
        if (ep.duration_sec && ep.duration_sec > 0) {
          return (wh.progress_sec / ep.duration_sec) >= 0.90;
        }
        return true; // Marked in watch history
      });

      if (!allVideosCompleted) {
        return null;
      }
    }
  }

  // 4. Quiz Requirement Check (cert_req_quizzes)
  if (show.cert_req_quizzes) {
    const quizzes = await prisma.quiz.findMany({
      where: { show_id: showId, is_active: true },
    });

    if (quizzes.length > 0) {
      for (const qz of quizzes) {
        const attempts = await prisma.quizAttempt.findMany({
          where: { user_id: userId, quiz_id: qz.id },
        });

        const passThreshold = qz.pass_score_percent !== undefined ? qz.pass_score_percent : 70;
        const isPassed = attempts.some((att) => {
          if (!att.total_questions || att.total_questions === 0) return false;
          return (att.score / att.total_questions) * 100 >= passThreshold;
        });

        if (!isPassed) {
          return null;
        }
      }
    }
  }

  // 5. Assignment Requirement Check (cert_req_assignments)
  if (show.cert_req_assignments) {
    const assignments = await prisma.assignment.findMany({
      where: { show_id: showId, is_active: true },
    });

    if (assignments.length > 0) {
      for (const asm of assignments) {
        const submission = await prisma.assignmentSubmission.findUnique({
          where: {
            assignment_id_user_id: {
              assignment_id: asm.id,
              user_id: userId,
            },
          },
        });

        if (!submission || (submission.status !== 'GRADED_PASSED' && submission.status !== 'GRADED')) {
          return null;
        }
      }
    }
  }

  // 6. ALL CONDITIONS SATISFIED -> GENERATE CERTIFICATE
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const certCode = `CERT-2026-${uuidv4().substring(0, 8).toUpperCase()}`;
  const issueDateStr = new Date().toISOString();
  const instructorName = show.teacher ? show.teacher.name : 'AlphaMinds Academic Team';

  const snapshotData = {
    student_name: user.name,
    course_title: show.title,
    instructor_name: instructorName,
    certificate_code: certCode,
    issued_at: issueDateStr,
  };

  // Generate PDF Buffer
  let pdfUrl = null;
  try {
    const pdfBuffer = await generateCertificatePdfBuffer(snapshotData);
    const objectName = `certificates/${showId}/${userId}/${certCode}.pdf`;

    await minioClient.putObject(
      config.minio.bucket,
      objectName,
      pdfBuffer,
      pdfBuffer.length,
      { 'Content-Type': 'application/pdf' }
    );

    pdfUrl = getPublicUrl(objectName);
  } catch (err) {
    console.error('Failed to generate or upload certificate PDF:', err);
    // Non-fatal: still save DB record with null pdf_url so certificate is not lost
  }

  return prisma.certificate.create({
    data: {
      user_id: userId,
      show_id: showId,
      certificate_code: certCode,
      snapshot_data: snapshotData,
      pdf_url: pdfUrl,
      issued_at: new Date(),
    },
  });
}

/**
 * Gets certificate status for a user and course.
 */
export async function getCertificateForCourse(userId, showId) {
  const show = await prisma.show.findUnique({
    where: { id: showId },
    select: {
      id: true,
      title: true,
      certificate_enabled: true,
      cert_req_videos: true,
      cert_req_quizzes: true,
      cert_req_assignments: true,
    },
  });

  if (!show) throw new AppError('Course not found', 404);

  const cert = await prisma.certificate.findUnique({
    where: {
      idx_cert_user_show: {
        user_id: userId,
        show_id: showId,
      },
    },
  });

  const rules = {
    certificate_enabled: show.certificate_enabled,
    cert_req_videos: show.cert_req_videos,
    cert_req_quizzes: show.cert_req_quizzes,
    cert_req_assignments: show.cert_req_assignments,
  };

  if (cert) {
    return {
      is_eligible: true,
      is_issued: true,
      certificate: cert,
      rules,
      config: show,
    };
  }

  // Check progress evaluation
  const evaluatedCert = await evaluateCertificateCompletion(userId, showId);

  return {
    is_eligible: !!evaluatedCert,
    is_issued: !!evaluatedCert,
    certificate: evaluatedCert || null,
    rules,
    config: show,
  };
}

/**
 * Lists all certificates earned by a user.
 */
export async function getUserCertificates(userId) {
  return prisma.certificate.findMany({
    where: { user_id: userId },
    orderBy: { issued_at: 'desc' },
    include: {
      show: {
        select: {
          id: true,
          title: true,
          thumbnail_url: true,
        },
      },
    },
  });
}

/**
 * Gets certificate configuration for a course.
 */
export async function getCertificateConfig(showId) {
  const show = await prisma.show.findUnique({
    where: { id: showId },
    select: {
      id: true,
      title: true,
      certificate_enabled: true,
      cert_req_videos: true,
      cert_req_quizzes: true,
      cert_req_assignments: true,
    },
  });

  if (!show) throw new AppError('Course not found', 404);
  return show;
}

/**
 * Updates certificate configuration for a course.
 */
export async function updateCertificateConfig(showId, data) {
  const show = await prisma.show.findUnique({ where: { id: showId } });
  if (!show) throw new AppError('Course not found', 404);

  const updateData = {};
  if (data.certificate_enabled !== undefined) updateData.certificate_enabled = data.certificate_enabled;
  if (data.cert_req_videos !== undefined) updateData.cert_req_videos = data.cert_req_videos;
  if (data.cert_req_quizzes !== undefined) updateData.cert_req_quizzes = data.cert_req_quizzes;
  if (data.cert_req_assignments !== undefined) updateData.cert_req_assignments = data.cert_req_assignments;

  return prisma.show.update({
    where: { id: showId },
    data: updateData,
    select: {
      id: true,
      title: true,
      certificate_enabled: true,
      cert_req_videos: true,
      cert_req_quizzes: true,
      cert_req_assignments: true,
    },
  });
}
