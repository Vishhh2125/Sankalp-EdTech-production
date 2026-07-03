import { prisma } from '../../prisma/client.js';
import { activeMembershipWhere } from '../membership/membership.helpers.js';

async function checkEpisodeAccess(userId, isGuest, episodeId, isFree, categoryId) {
  if (isFree) return { is_locked: false, lock_reason: null };

  if (isGuest || !userId) {
    return { is_locked: true, lock_reason: 'login_required' };
  }

  const now = new Date();
  const membershipWhere = {
    user_id: userId,
    ...activeMembershipWhere(now),
  };

  if (categoryId) {
    membershipWhere.plan = {
      OR: [{ category_id: null }, { category_id: categoryId }],
    };
  }

  const membership = await prisma.userMembership.findFirst({
    where: membershipWhere,
  });
  if (membership) return { is_locked: false, lock_reason: null };

  const coinUnlock = await prisma.episodeAccess.findUnique({
    where: { idx_ea_user_ep: { user_id: userId, episode_id: episodeId } },
  });
  if (coinUnlock) return { is_locked: false, lock_reason: null };

  return { is_locked: true, lock_reason: 'coins_or_membership' };
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
