import * as service from './coursework.service.js';

// ==========================================
// User capabilities (Lock calculations & read)
// ==========================================

async function getAssignments(req, res, next) {
  try {
    const { showId } = req.params;
    const userId = req.user?.id || null;
    const isGuest = req.isGuest || false;

    const result = await service.getAssignments(showId, userId, isGuest);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function getMaterials(req, res, next) {
  try {
    const { showId } = req.params;
    const userId = req.user?.id || null;
    const isGuest = req.isGuest || false;

    const result = await service.getMaterials(showId, userId, isGuest);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function getQuizzes(req, res, next) {
  try {
    const { showId } = req.params;
    const userId = req.user?.id || null;
    const isGuest = req.isGuest || false;

    const result = await service.getQuizzes(showId, userId, isGuest);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// ==========================================
// Admin capabilities (Coursework CRUD)
// ==========================================

async function createAssignment(req, res, next) {
  try {
    const { showId } = req.params;
    const result = await service.createAssignment(showId, req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

async function updateAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const result = await service.updateAssignment(id, req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function deleteAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const result = await service.deleteAssignment(id);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function createMaterial(req, res, next) {
  try {
    const { showId } = req.params;
    const result = await service.createMaterial(showId, req.body, req.file);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

async function updateMaterial(req, res, next) {
  try {
    const { id } = req.params;
    const result = await service.updateMaterial(id, req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function deleteMaterial(req, res, next) {
  try {
    const { id } = req.params;
    const result = await service.deleteMaterial(id);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function createQuiz(req, res, next) {
  try {
    const { showId } = req.params;
    const result = await service.createQuiz(showId, req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

async function updateQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const result = await service.updateQuiz(id, req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function deleteQuiz(req, res, next) {
  try {
    const { id } = req.params;
    const result = await service.deleteQuiz(id);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function createQuizQuestion(req, res, next) {
  try {
    const { id } = req.params; // Quiz ID
    const result = await service.createQuizQuestion(id, req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

async function deleteQuizQuestion(req, res, next) {
  try {
    const { questionId } = req.params;
    const result = await service.deleteQuizQuestion(questionId);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function submitAssignment(req, res, next) {
  try {
    const { id } = req.params; // Assignment ID
    const userId = req.user.id;
    const result = await service.submitAssignment(id, userId, req.body, req.file);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function getSubmissions(req, res, next) {
  try {
    const { status, show_id } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await service.getSubmissions({ status, show_id, requesting_user: req.user }, page, limit);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function gradeSubmission(req, res, next) {
  try {
    const { id } = req.params; // Submission ID
    const { score, feedback, letter_grade } = req.body;

    const result = await service.gradeSubmission(id, score, feedback, letter_grade);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function getQuizQuestions(req, res, next) {
  try {
    const { id } = req.params; // Quiz ID
    const userId = req.user?.id || null;
    const isGuest = req.isGuest || false;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUB_ADMIN';

    const result = await service.getQuizQuestions(id, userId, isGuest, isAdmin);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

async function submitQuizAttempt(req, res, next) {
  try {
    const { id } = req.params; // Quiz ID
    const userId = req.user.id;
    const { answers } = req.body;

    const result = await service.submitQuizAttempt(id, userId, answers);
    res.json(result);
  } catch (e) {
    next(e);
  }
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
