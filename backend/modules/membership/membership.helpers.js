/**
 * Active membership filter (rule 6):
 * status ACTIVE AND (end_date IS NULL OR end_date >= now)
 */
export function activeMembershipWhere(now = new Date()) {
  return {
    status: 'ACTIVE',
    OR: [{ end_date: null }, { end_date: { gte: now } }],
  };
}

export function isLifetimePlan(planOrDuration) {
  const duration =
    typeof planOrDuration === 'string' ? planOrDuration : planOrDuration?.duration;
  return String(duration || '').toLowerCase() === 'lifetime';
}

export function formatMembershipResponse(m) {
  return {
    id: m.id,
    plan_id: m.plan_id,
    plan_name: m.plan.name,
    duration: m.plan.duration,
    category_id: m.plan.category_id,
    category_name: m.plan.category_id
      ? m.plan.category?.name ?? null
      : 'All Categories',
    start_date: m.start_date,
    end_date: m.end_date,
    status: m.status,
    is_lifetime: isLifetimePlan(m.plan),
  };
}

export const membershipPlanInclude = {
  plan: {
    select: {
      name: true,
      duration: true,
      category_id: true,
      category: { select: { name: true } },
    },
  },
};
