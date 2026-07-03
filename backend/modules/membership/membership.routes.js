import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/admin.middleware.js';
import {
  getActivePlans,
  simulateMembershipPurchaseHandler,
  getAllMembershipPlans,
  getMembershipPlan,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  toggleMembershipPlanStatus,
  getMembershipStatsHandler,
  getSubscriptionHistoryHandler,
} from './membership.controller.js';

const router = express.Router();

// Public routes
router.get('/plans', getActivePlans);
router.post('/simulate-purchase', requireAuth, simulateMembershipPurchaseHandler);

// Admin routes (membership section)
router.use(requireAuth);
router.use(requireAdmin('membership'));

router.get('/stats', getMembershipStatsHandler);
router.get('/history', getSubscriptionHistoryHandler);
router.get('/plans', getAllMembershipPlans);
router.get('/plans/:planId', getMembershipPlan);
router.post('/plans', createMembershipPlan);
router.patch('/plans/:planId', updateMembershipPlan);
router.patch('/plans/:planId/toggle', toggleMembershipPlanStatus);
router.delete('/plans/:planId', deleteMembershipPlan);

export default router;
