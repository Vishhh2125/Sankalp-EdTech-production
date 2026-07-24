import { prisma } from '../../prisma/client.js';
import { getSignedEpisodeHlsPath } from '../../utils/hls-signed-url.js';
import { activeMembershipWhere } from '../membership/membership.helpers.js';

function buildEpisodeHlsPath(episode) {
  return getSignedEpisodeHlsPath(episode);
}

function buildUnlockResponse(episode, coins) {
  return {
    coins,
    episode_id: episode.id,
    show_id: episode.show_id,
    coin_cost: episode.coin_cost,
    is_locked: false,
    hls_url: buildEpisodeHlsPath(episode),
  };
}

/**
 * Unlock a paid episode for a user (coins, membership, show purchase, or idempotent access).
 * @returns {{ ok: true, data: object, message: string } | { ok: false, status: number, data: object|null, message: string }}
 */
export async function unlockEpisodeForUser(userId, episodeId) {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: {
      id: true,
      show_id: true,
      episode_num: true,
      title: true,
      is_free: true,
      coin_cost: true,
      is_show_only: true,
      status: true,
      hls_master_url: true,
      show: { select: { title: true, category_id: true } },
    },
  });

  if (!episode) {
    return { ok: false, status: 404, data: null, message: 'Lecture not found' };
  }
  if (episode.is_free) {
    return { ok: false, status: 400, data: null, message: 'Lecture is free' };
  }

  // If episode is show-only, block individual unlock
  if (episode.is_show_only) {
    return {
      ok: false,
      status: 400,
      data: null,
      message: 'This lecture can only be unlocked by purchasing the show',
    };
  }

  if (!episode.coin_cost || episode.coin_cost <= 0) {
    return { ok: false, status: 400, data: null, message: 'Lecture has no coin cost' };
  }

  const categoryId = episode.show?.category_id;
  const now = new Date();

  // Check if show is purchased or admin granted (non-revoked)
  const showPurchase = await prisma.showAccess.findFirst({
    where: { user_id: userId, show_id: episode.show_id, revoked_at: null },
  });
  if (showPurchase) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });
    return {
      ok: true,
      data: buildUnlockResponse(episode, user?.coins ?? 0),
      message: 'Unlocked via show purchase',
    };
  }

  const existingAccess = await prisma.episodeAccess.findUnique({
    where: { idx_ea_user_ep: { user_id: userId, episode_id: episodeId } },
  });
  if (existingAccess) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });
    return {
      ok: true,
      data: buildUnlockResponse(episode, user?.coins ?? 0),
      message: 'Already unlocked',
    };
  }

  const membership = await prisma.userMembership.findFirst({
    where: {
      user_id: userId,
      ...activeMembershipWhere(now),
      plan: {
        OR: [{ category_id: null }, { category_id: categoryId }],
      },
    },
  });
  if (membership) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });
    return {
      ok: true,
      data: buildUnlockResponse(episode, user?.coins ?? 0),
      message: 'Unlocked via membership',
    };
  }

  const txResult = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, coins: true },
    });
    if (!user) return { error: 'USER_NOT_FOUND' };

    const accessAgain = await tx.episodeAccess.findUnique({
      where: { idx_ea_user_ep: { user_id: userId, episode_id: episodeId } },
    });
    if (accessAgain) {
      return { coins: user.coins ?? 0, idempotent: true };
    }

    const balance = user.coins ?? 0;
    if (balance < episode.coin_cost) {
      return { error: 'INSUFFICIENT', coins: balance };
    }

    const nextCoins = balance - episode.coin_cost;

    await tx.user.update({
      where: { id: userId },
      data: { coins: nextCoins },
    });

    await tx.episodeAccess.create({
      data: {
        user_id: userId,
        episode_id: episodeId,
        coins_spent: episode.coin_cost,
      },
    });

    const unlockLabel = episode.show?.title
      ? `${episode.show.title} · Lec.${episode.episode_num}`
      : episode.title || `Lecture ${episode.episode_num}`;

    await tx.coinTransaction.create({
      data: {
        user_id: userId,
        type: 'debit',
        amount: episode.coin_cost,
        reason: 'episode_unlock',
        ref_id: episodeId,
        title: 'Lecture unlock',
        description: unlockLabel,
        status: 'completed',
      },
    });

    return { coins: nextCoins };
  });

  if (txResult.error === 'USER_NOT_FOUND') {
    return { ok: false, status: 404, data: null, message: 'User not found' };
  }
  if (txResult.error === 'INSUFFICIENT') {
    return {
      ok: false,
      status: 402,
      data: { coins: txResult.coins },
      message: 'Insufficient coins',
    };
  }

  return {
    ok: true,
    data: buildUnlockResponse(episode, txResult.coins),
    message: 'Lecture unlocked',
  };
}

/**
 * Unlock a paid show for a user (coins, membership, or idempotent access).
 * @returns {{ ok: true, data: object, message: string } | { ok: false, status: number, data: object|null, message: string }}
 */
export async function unlockShowForUser(userId, showId) {
  const show = await prisma.show.findUnique({
    where: { id: showId },
    select: {
      id: true,
      title: true,
      is_free: true,
      coin_cost: true,
    },
  });

  if (!show) {
    return { ok: false, status: 404, data: null, message: 'Show not found' };
  }
  if (show.is_free) {
    return { ok: false, status: 400, data: null, message: 'Show is free' };
  }
  if (!show.coin_cost || show.coin_cost <= 0) {
    return { ok: false, status: 400, data: null, message: 'Show has no coin cost' };
  }

  const existingAccess = await prisma.showAccess.findFirst({
    where: { user_id: userId, show_id: showId, revoked_at: null },
  });
  if (existingAccess) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });
    return {
      ok: true,
      data: {
        coins: user?.coins ?? 0,
        show_id: showId,
        is_locked: false,
      },
      message: 'Already purchased',
    };
  }

  const txResult = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, coins: true },
    });
    if (!user) return { error: 'USER_NOT_FOUND' };

    const accessAgain = await tx.showAccess.findUnique({
      where: { idx_sa_user_show: { user_id: userId, show_id: showId } },
    });
    if (accessAgain) {
      return { coins: user.coins ?? 0, idempotent: true };
    }

    const balance = user.coins ?? 0;
    if (balance < show.coin_cost) {
      return { error: 'INSUFFICIENT', coins: balance };
    }

    const nextCoins = balance - show.coin_cost;

    await tx.user.update({
      where: { id: userId },
      data: { coins: nextCoins },
    });

    await tx.showAccess.create({
      data: {
        user_id: userId,
        show_id: showId,
        coins_spent: show.coin_cost,
      },
    });

    await tx.coinTransaction.create({
      data: {
        user_id: userId,
        type: 'debit',
        amount: show.coin_cost,
        reason: 'show_unlock',
        ref_id: showId,
        title: 'Show purchase',
        description: show.title,
        status: 'completed',
      },
    });

    return { coins: nextCoins };
  });

  if (txResult.error === 'USER_NOT_FOUND') {
    return { ok: false, status: 404, data: null, message: 'User not found' };
  }
  if (txResult.error === 'INSUFFICIENT') {
    return {
      ok: false,
      status: 402,
      data: { coins: txResult.coins },
      message: 'Insufficient coins',
    };
  }

  return {
    ok: true,
    data: {
      coins: txResult.coins,
      show_id: showId,
      is_locked: false,
    },
    message: 'Show purchased successfully',
  };
}
