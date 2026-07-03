import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import {
  getActiveTopUpPlans,
  getAllTopUpPlansHandler,
  getTopUpPlan,
  createTopUpPlanHandler,
  updateTopUpPlanHandler,
  deleteTopUpPlanHandler,
  toggleTopUpPlanStatusHandler,
} from './topup.controller.js';

const router = express.Router();

// Public routes
router.get('/plans', getActiveTopUpPlans);

// Admin routes (topup section)
router.use(requireAuth);
router.use(requireAdmin('topup'));

router.get('/plans', getAllTopUpPlansHandler);
router.get('/plans/:planId', getTopUpPlan);
router.post('/plans', createTopUpPlanHandler);
router.patch('/plans/:planId', updateTopUpPlanHandler);
router.patch('/plans/:planId/toggle', toggleTopUpPlanStatusHandler);
router.delete('/plans/:planId', deleteTopUpPlanHandler);

export default router;
