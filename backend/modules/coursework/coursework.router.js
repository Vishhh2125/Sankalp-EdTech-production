import express from 'express';
import multer from 'multer';
import os from 'os';
import * as ctrl from './coursework.controller.js';
import { requireAuth, allowGuest } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  createMaterialSchema,
  updateMaterialSchema,
  createQuizSchema,
  updateQuizSchema,
  createQuizQuestionSchema,
  gradeSubmissionSchema,
  submitQuizAnswersSchema,
} from './coursework.validation.js';

const router = express.Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
  }),
});


// ==========================================
// Assignments
// ==========================================
router.get('/shows/:showId/assignments', allowGuest, ctrl.getAssignments);
router.post('/shows/:showId/assignments', requireAuth, requireAdmin('coursework'), validate(createAssignmentSchema), ctrl.createAssignment);
router.put('/assignments/:id', requireAuth, requireAdmin('coursework'), validate(updateAssignmentSchema), ctrl.updateAssignment);
router.delete('/assignments/:id', requireAuth, requireAdmin('coursework'), ctrl.deleteAssignment);
router.post('/assignments/:id/submit', requireAuth, upload.single('attachment'), ctrl.submitAssignment);

// ==========================================
// Materials
// ==========================================
router.get('/shows/:showId/materials', allowGuest, ctrl.getMaterials);
router.post('/shows/:showId/materials', requireAuth, requireAdmin('coursework'), upload.single('file'), validate(createMaterialSchema), ctrl.createMaterial);
router.put('/materials/:id', requireAuth, requireAdmin('coursework'), validate(updateMaterialSchema), ctrl.updateMaterial);
router.delete('/materials/:id', requireAuth, requireAdmin('coursework'), ctrl.deleteMaterial);

// ==========================================
// Quizzes
// ==========================================
router.get('/shows/:showId/quizzes', allowGuest, ctrl.getQuizzes);
router.post('/shows/:showId/quizzes', requireAuth, requireAdmin('coursework'), validate(createQuizSchema), ctrl.createQuiz);
router.put('/quizzes/:id', requireAuth, requireAdmin('coursework'), validate(updateQuizSchema), ctrl.updateQuiz);
router.delete('/quizzes/:id', requireAuth, requireAdmin('coursework'), ctrl.deleteQuiz);

// ==========================================
// Quiz Questions & Options (Taking & Attempts)
// ==========================================
router.get('/quizzes/:id/questions', allowGuest, ctrl.getQuizQuestions);
router.post('/quizzes/:id/attempt', requireAuth, validate(submitQuizAnswersSchema), ctrl.submitQuizAttempt);
router.post('/quizzes/:id/questions', requireAuth, requireAdmin('coursework'), validate(createQuizQuestionSchema), ctrl.createQuizQuestion);
router.delete('/quizzes/questions/:questionId', requireAuth, requireAdmin('coursework'), ctrl.deleteQuizQuestion);

// ==========================================
// Admin Submissions & Grading
// ==========================================
router.get('/admin/submissions', requireAuth, requireAdmin('submissions'), ctrl.getSubmissions);
router.post('/admin/submissions/:id/grade', requireAuth, requireAdmin('submissions'), validate(gradeSubmissionSchema), ctrl.gradeSubmission);

export default router;
