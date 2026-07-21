import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { getTeacherProfile, putTeacherProfile } from './teacher.controller.js';

const router = express.Router();

router.get('/profile', requireAuth, getTeacherProfile);
router.put('/profile', requireAuth, putTeacherProfile);

export default router;
