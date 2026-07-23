import { formatMembershipEnd } from './membershipApi';

/** Calendar days from today (local) until membership end date. */
export function getMembershipDaysRemaining(endDateIso) {
  if (!endDateIso) return null;
  const end = new Date(endDateIso);
  if (Number.isNaN(end.getTime())) return null;

  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = endDay.getTime() - today.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

const REMINDER_DAYS = [3, 2];

function isActiveTermMembership(m) {
  if (!m?.end_date) return false;
  if (m.status && m.status !== 'ACTIVE') return false;
  return true;
}

/**
 * Returns reminder payload for the term membership expiring soonest (3 or 2 days left).
 * Skips lifetime memberships (end_date null).
 */
export function getMembershipExpiryReminder({ plan, memberships }) {
  if (plan !== 'MEMBER') return null;
  if (!Array.isArray(memberships) || memberships.length === 0) return null;

  let soonest = null;
  let soonestDays = null;

  for (const m of memberships) {
    if (!isActiveTermMembership(m)) continue;
    const daysLeft = getMembershipDaysRemaining(m.end_date);
    if (daysLeft == null || daysLeft < 0) continue;
    if (!REMINDER_DAYS.includes(daysLeft)) continue;
    if (soonestDays === null || daysLeft < soonestDays) {
      soonestDays = daysLeft;
      soonest = m;
    }
  }

  if (!soonest || soonestDays == null) return null;

  const endLabel = formatMembershipEnd(soonest.end_date);
  const planName = soonest.plan_name?.trim();
  const categorySuffix = soonest.category_name ? ` (${soonest.category_name})` : '';

  if (soonestDays === 3) {
    return {
      daysLeft: 3,
      title: '3 days left on your membership',
      body: planName
        ? `Your ${planName}${categorySuffix} plan ends on ${endLabel}. Extend now to keep unlimited access and ad-free watching.`
        : `Your membership ends on ${endLabel}. Extend now to keep unlimited access and ad-free watching.`,
      cta: 'Extend now',
    };
  }

  return {
    daysLeft: 2,
    title: '2 days left on your membership',
    body: planName
      ? `Your ${planName}${categorySuffix} plan ends on ${endLabel}. Extend now so you don't lose access to locked lectures.`
      : `Your membership ends on ${endLabel}. Extend now so you don't lose access to locked lectures.`,
    cta: 'Extend now',
  };
}
