import { prisma } from '../../prisma/client.js';
import { activeMembershipWhere } from '../membership/membership.helpers.js';

/**
 * Fetch all enrolled courses (shows) for a user based on:
 * 1. Direct course purchase (ShowAccess)
 * 2. Individual episode purchase (EpisodeAccess)
 * 3. Package purchase (PackagePurchase -> PackageShow)
 * 4. Active membership access (UserMembership)
 *
 * Returns distinct array of course objects with access information and progress.
 */
export async function getMyCoursesForUser(userId) {
  const now = new Date();

  // 1. Direct Show Access (ShowAccess where revoked_at is null)
  const showAccesses = await prisma.showAccess.findMany({
    where: {
      user_id: userId,
      revoked_at: null,
      show: { is_active: true, approval_status: 'PUBLISHED' },
    },
    select: {
      show_id: true,
      access_type: true,
      purchased_at: true,
    },
  });

  // 2. Episode Access (EpisodeAccess -> mapped to show_id)
  const episodeAccesses = await prisma.episodeAccess.findMany({
    where: {
      user_id: userId,
      episode: { show: { is_active: true, approval_status: 'PUBLISHED' } },
    },
    select: {
      unlocked_at: true,
      episode: {
        select: {
          id: true,
          show_id: true,
        },
      },
    },
  });

  // 3. Package Purchases (PackagePurchase -> PackageShow -> show_id)
  const packagePurchases = await prisma.packagePurchase.findMany({
    where: {
      user_id: userId,
      package: { is_active: true },
    },
    select: {
      purchased_at: true,
      package: {
        select: {
          package_shows: {
            where: { show: { is_active: true, approval_status: 'PUBLISHED' } },
            select: { show_id: true },
          },
        },
      },
    },
  });

  // 4. Active Memberships
  const activeMemberships = await prisma.userMembership.findMany({
    where: {
      user_id: userId,
      ...activeMembershipWhere(now),
    },
    include: {
      plan: true,
    },
  });

  // Map of showId -> { accessType, accessLabel, lastAccessedAt, unlockedEpisodeIds }
  const courseAccessMap = new Map();

  function setAccess(showId, type, label, date, episodeId = null) {
    if (!courseAccessMap.has(showId)) {
      courseAccessMap.set(showId, {
        showId,
        accessType: type,
        accessLabel: label,
        lastAccessedAt: date,
        unlockedEpisodeIds: new Set(),
      });
    }
    const current = courseAccessMap.get(showId);
    if (date && (!current.lastAccessedAt || new Date(date) > new Date(current.lastAccessedAt))) {
      current.lastAccessedAt = date;
    }
    if (episodeId) {
      current.unlockedEpisodeIds.add(episodeId);
    }

    // Priority ordering: FULL_COURSE > PACKAGE > EPISODE > MEMBERSHIP
    const priority = { FULL_COURSE: 4, PACKAGE: 3, EPISODE: 2, MEMBERSHIP: 1 };
    if ((priority[type] || 0) > (priority[current.accessType] || 0)) {
      current.accessType = type;
      current.accessLabel = label;
    }
  }

  // Populate from ShowAccess
  for (const sa of showAccesses) {
    const label = sa.access_type === 'ADMIN_GRANTED' ? 'Granted by Admin' : 'Full Access';
    setAccess(sa.show_id, 'FULL_COURSE', label, sa.purchased_at);
  }

  // Populate from PackagePurchase
  for (const pp of packagePurchases) {
    for (const ps of pp.package?.package_shows || []) {
      setAccess(ps.show_id, 'PACKAGE', 'Package Bundle', pp.purchased_at);
    }
  }

  // Populate from EpisodeAccess
  for (const ea of episodeAccesses) {
    if (ea.episode?.show_id) {
      setAccess(ea.episode.show_id, 'EPISODE', 'Episode Access', ea.unlocked_at, ea.episode.id);
    }
  }

  // Populate from Active Memberships
  if (activeMemberships.length > 0) {
    for (const mem of activeMemberships) {
      const categoryId = mem.plan?.category_id;
      const membershipShows = await prisma.show.findMany({
        where: {
          is_active: true,
          approval_status: 'PUBLISHED',
          ...(categoryId ? { category_id: categoryId } : {}),
        },
        select: { id: true },
      });
      for (const s of membershipShows) {
        setAccess(s.id, 'MEMBERSHIP', 'Membership Access', mem.start_date);
      }
    }
  }

  if (courseAccessMap.size === 0) {
    return [];
  }

  const allShowIds = Array.from(courseAccessMap.keys());

  // Fetch full details of shows, episodes, categories, teachers, and user's watch history
  const [shows, watchHistories] = await Promise.all([
    prisma.show.findMany({
      where: {
        id: { in: allShowIds },
        is_active: true,
        approval_status: 'PUBLISHED',
      },
      include: {
        category: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
        episodes: {
          where: { approval_status: 'PUBLISHED' },
          select: { id: true, episode_num: true, duration_sec: true, title: true },
          orderBy: { episode_num: 'asc' },
        },
      },
    }),
    prisma.watchHistory.findMany({
      where: {
        user_id: userId,
        episode: { show_id: { in: allShowIds } },
      },
      orderBy: { last_watched: 'desc' },
      select: {
        episode_id: true,
        progress_sec: true,
        last_watched: true,
        episode: { select: { show_id: true, episode_num: true, duration_sec: true, video_source: true, is_free: true } },
      },
    }),
  ]);

  // Group watch history per show and count completed episodes
  const watchByShow = new Map();
  const completedByShow = new Map();
  for (const wh of watchHistories) {
    const sid = wh.episode?.show_id;
    if (sid) {
      if (!watchByShow.has(sid)) {
        watchByShow.set(sid, wh);
      }
      const isYt = wh.episode?.video_source === 'YOUTUBE';
      const dur = wh.episode?.duration_sec || 0;
      const isComp = isYt ? true : (dur > 0 ? wh.progress_sec >= Math.floor(dur * 0.90) : wh.progress_sec > 0);
      if (isComp) {
        completedByShow.set(sid, (completedByShow.get(sid) || 0) + 1);
      }
    }
  }

  // Construct final result items
  const result = shows.map((show) => {
    const access = courseAccessMap.get(show.id);
    const latestWatch = watchByShow.get(show.id);
    const totalEpisodes = show.episodes?.length || 0;
    const completedEpisodes = completedByShow.get(show.id) || 0;

    let dynamicLabel = access.accessLabel;
    if (access.accessType === 'EPISODE') {
      const unlockedCount = access.unlockedEpisodeIds.size;
      dynamicLabel = `${unlockedCount} ${unlockedCount === 1 ? 'Lecture' : 'Lectures'} Unlocked`;
    }

    return {
      show_id: show.id,
      show_title: show.title,
      synopsis: show.synopsis,
      thumbnail_url: show.thumbnail_url,
      banner_url: show.banner_url,
      category: show.category?.name || null,
      category_id: show.category?.id || null,
      teacher_name: show.teacher?.name || null,
      total_episodes: totalEpisodes,
      unlocked_episodes: access.accessType === 'EPISODE' ? access.unlockedEpisodeIds.size : totalEpisodes,
      completed_episodes: completedEpisodes,
      access_type: access.accessType,
      access_label: dynamicLabel,
      last_accessed: latestWatch?.last_watched || access.lastAccessedAt || show.created_at,
      latest_watched_episode_id: latestWatch?.episode_id || null,
      latest_watched_episode_num: latestWatch?.episode?.episode_num || (totalEpisodes > 0 ? 1 : null),
      progress_sec: latestWatch?.progress_sec || 0,
      duration_sec: latestWatch?.episode?.duration_sec || 0,
    };
  });

  result.sort((a, b) => new Date(b.last_accessed) - new Date(a.last_accessed));

  return result;
}
