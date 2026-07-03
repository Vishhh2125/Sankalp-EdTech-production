import { prisma } from '../../prisma/client.js';
import {
  activeMembershipWhere,
  formatMembershipResponse,
  isLifetimePlan,
  membershipPlanInclude,
} from './membership.helpers.js';

/**
 * Add plan duration to a start date (supports seed values: weekly, monthly, annual).
 * Returns null for lifetime plans.
 */
export function addPlanDuration(startDate, durationRaw) {
  const duration = String(durationRaw || '').toLowerCase();
  if (duration === 'lifetime') {
    return null;
  }

  const d = new Date(startDate);

  if (duration === 'weekly' || duration === 'week') {
    d.setDate(d.getDate() + 7);
  } else if (duration === 'monthly' || duration === 'month') {
    d.setMonth(d.getMonth() + 1);
  } else if (duration === 'annual' || duration === 'year' || duration === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setDate(d.getDate() + 30);
  }

  return d;
}

function lifetimeScopeCovers(membership, targetCategoryId) {
  const scopeCategoryId = membership.plan.category_id;
  if (scopeCategoryId === null) {
    return true;
  }
  return scopeCategoryId === targetCategoryId;
}

function coverageBlockMessage(membership) {
  const scopeCategoryId = membership.plan.category_id;
  if (scopeCategoryId === null) {
    return 'You already have lifetime access to All Categories';
  }
  const categoryName = membership.plan.category?.name || 'this category';
  return `You already have lifetime access to ${categoryName}`;
}

async function fetchActiveMembershipsForUser(userId, now) {
  return prisma.userMembership.findMany({
    where: {
      user_id: userId,
      ...activeMembershipWhere(now),
    },
    include: membershipPlanInclude,
  });
}

/**
 * Simulated membership purchase (no payment gateway).
 * Applies category scope and purchase precedence rules (C).
 */
export async function simulateMembershipPurchase(userId, planId) {
  const plan = await prisma.membershipPlan.findFirst({
    where: { id: planId, is_active: true },
    include: { category: { select: { name: true } } },
  });

  if (!plan) {
    return { ok: false, status: 400, message: 'Invalid or inactive membership plan' };
  }

  const now = new Date();
  const purchaseScopeCategoryId = plan.category_id;
  const purchaseIsLifetime = isLifetimePlan(plan);

  const activeMemberships = await fetchActiveMembershipsForUser(userId, now);

  const blockingLifetime = activeMemberships.find(
    (m) => isLifetimePlan(m.plan) && lifetimeScopeCovers(m, purchaseScopeCategoryId)
  );
  if (blockingLifetime) {
    return {
      ok: false,
      status: 409,
      message: coverageBlockMessage(blockingLifetime),
    };
  }

  const startDate = now;
  const endDate = purchaseIsLifetime ? null : addPlanDuration(now, plan.duration);

  const result = await prisma.$transaction(async (tx) => {
    const expireWhere = {
      user_id: userId,
      ...activeMembershipWhere(now),
    };

    if (purchaseScopeCategoryId === null && purchaseIsLifetime) {
      await tx.userMembership.updateMany({
        where: expireWhere,
        data: { status: 'EXPIRED' },
      });
    } else if (purchaseScopeCategoryId === null) {
      await tx.userMembership.updateMany({
        where: {
          ...expireWhere,
          end_date: { not: null },
        },
        data: { status: 'EXPIRED' },
      });
    } else {
      await tx.userMembership.updateMany({
        where: {
          ...expireWhere,
          plan: { category_id: purchaseScopeCategoryId },
        },
        data: { status: 'EXPIRED' },
      });
    }

    const payment = await tx.paymentTransaction.create({
      data: {
        user_id: userId,
        type: 'membership',
        amount: plan.price,
        currency: plan.currency,
        gateway: 'simulated',
        status: 'completed',
      },
    });

    await tx.userMembership.create({
      data: {
        user_id: userId,
        plan_id: plan.id,
        payment_id: payment.id,
        start_date: startDate,
        end_date: endDate,
        status: 'ACTIVE',
      },
    });

    const remainingActive = await tx.userMembership.findMany({
      where: {
        user_id: userId,
        ...activeMembershipWhere(now),
      },
      include: membershipPlanInclude,
    });

    const hasAnyActive = remainingActive.length > 0;

    await tx.user.update({
      where: { id: userId },
      data: { plan: hasAnyActive ? 'MEMBER' : 'FREE' },
    });

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { coins: true, plan: true },
    });

    return { memberships: remainingActive, user, payment };
  });

  const memberships = result.memberships.map(formatMembershipResponse);
  const hasAllAccess = result.memberships.some((m) => m.plan.category_id === null);

  return {
    ok: true,
    data: {
      plan: result.user.plan,
      coins: result.user.coins ?? 0,
      memberships,
      has_all_access: hasAllAccess,
    },
    message: 'Membership activated',
  };
}
