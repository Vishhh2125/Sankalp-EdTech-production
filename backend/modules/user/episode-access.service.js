import { prisma } from '../../prisma/client.js';
import { activeMembershipWhere } from '../membership/membership.helpers.js';

async function checkEpisodeAccess(userId, isGuest, episodeId, isFree, categoryId) {
  // 1. Is the episode marked Free?
  if (isFree) return { is_locked: false, lock_reason: null };

  const ep = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: {
      is_free: true,
      is_show_only: true,
      show_id: true,
      show: {
        select: {
          id: true,
          is_free: true,
          coin_cost: true,
          category_id: true,
        }
      }
    }
  });

  if (!ep) {
    return { is_locked: true, lock_reason: 'episode_not_found' };
  }

  // Double check is_free from database
  if (ep.is_free) return { is_locked: false, lock_reason: null };

  // 2. Is the user a guest (not logged in)?
  if (isGuest || !userId) {
    return { is_locked: true, lock_reason: 'login_required' };
  }

  // Allow admins and sub-admins full access
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user && (user.role === 'ADMIN' || user.role === 'SUB_ADMIN')) {
    return { is_locked: false, lock_reason: null };
  }

  // 3. Does the user have an active membership that covers this show's category?
  const now = new Date();
  const membershipWhere = {
    user_id: userId,
    ...activeMembershipWhere(now),
  };

  const showCatId = ep.show?.category_id || categoryId;
  if (showCatId) {
    membershipWhere.plan = {
      OR: [{ category_id: null }, { category_id: showCatId }],
    };
  }

  const membership = await prisma.userMembership.findFirst({
    where: membershipWhere,
  });
  if (membership) return { is_locked: false, lock_reason: null };

  // 4. Has the user bought this show?
  const showPurchase = await prisma.showAccess.findUnique({
    where: {
      idx_sa_user_show: {
        user_id: userId,
        show_id: ep.show_id,
      }
    }
  });
  if (showPurchase) return { is_locked: false, lock_reason: null };

  // 5. Is the episode marked Paid (coin unlock) and has the user already unlocked it individually?
  if (!ep.is_show_only) {
    const coinUnlock = await prisma.episodeAccess.findUnique({
      where: { idx_ea_user_ep: { user_id: userId, episode_id: episodeId } },
    });
    if (coinUnlock) return { is_locked: false, lock_reason: null };
  }

  // 6. Otherwise Locked
  return {
    is_locked: true,
    lock_reason: ep.is_show_only ? 'show_only' : 'coins_or_membership',
  };
}

async function checkShowAccess(userId, isGuest, showId) {
  const show = await prisma.show.findUnique({
    where: { id: showId },
    select: { category_id: true },
  });

  const freeEpisode = await prisma.episode.findFirst({
    where: { show_id: showId, is_free: true },
  });
  if (freeEpisode) return { is_locked: false, lock_reason: null };

  if (isGuest || !userId) {
    return { is_locked: true, lock_reason: 'login_required' };
  }

  // Allow admins and sub-admins full access
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user && (user.role === 'ADMIN' || user.role === 'SUB_ADMIN')) {
    return { is_locked: false, lock_reason: null };
  }

  const now = new Date();
  const membershipWhere = {
    user_id: userId,
    ...activeMembershipWhere(now),
  };

  if (show?.category_id) {
    membershipWhere.plan = {
      OR: [{ category_id: null }, { category_id: show.category_id }],
    };
  }

  const membership = await prisma.userMembership.findFirst({
    where: membershipWhere,
  });
  if (membership) return { is_locked: false, lock_reason: null };

  const showPurchase = await prisma.showAccess.findUnique({
    where: {
      idx_sa_user_show: {
        user_id: userId,
        show_id: showId,
      }
    }
  });
  if (showPurchase) return { is_locked: false, lock_reason: null };

  const coinUnlock = await prisma.episodeAccess.findFirst({
    where: {
      user_id: userId,
      episode: {
        show_id: showId,
      },
    },
  });
  if (coinUnlock) return { is_locked: false, lock_reason: null };

  return { is_locked: true, lock_reason: 'course_locked' };
}

export { checkEpisodeAccess, checkShowAccess };
