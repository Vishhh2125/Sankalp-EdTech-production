import express from 'express';
import Joi from 'joi';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAdminOrTeacher } from '../../middleware/ownership.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as ctrl from './certificate.controller.js';

const router = express.Router();

const certificateConfigSchema = Joi.object({
  certificate_enabled: Joi.boolean().optional(),
  cert_req_videos: Joi.boolean().optional(),
  cert_req_quizzes: Joi.boolean().optional(),
  cert_req_assignments: Joi.boolean().optional(),
}).min(1);

// User Certificate Endpoints
router.get('/user/certificates', requireAuth, ctrl.getUserCertificates);
router.get('/user/certificates/:showId', requireAuth, ctrl.getCertificateForCourse);

// Admin / Teacher Certificate Configuration Endpoints
router.get('/shows/:showId/certificate-config', requireAuth, ctrl.getCertificateConfig);
router.put('/shows/:showId/certificate-config', requireAuth, requireAdminOrTeacher('coursework'), validate(certificateConfigSchema), ctrl.updateCertificateConfig);

export default router;
