import { prisma } from '../prisma/client.js';
import logger from '../config/logger.js';

/**
 * Record an admin-panel action for the activity log.
 */
export async function logAdminActivity({ userId, action, entityType = null, entityId = null, details = null }) {
  try {
    await prisma.adminActivityLog.create({
      data: {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      },
    });
  } catch (err) {
    logger.warn('Failed to write admin activity log', { error: err.message, userId, action });
  }
}
