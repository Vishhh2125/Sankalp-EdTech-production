import { randomBytes } from 'crypto';
import { prisma } from '../../prisma/client.js';
import { AppError } from '../../middleware/error.middleware.js';
import { activeMembershipWhere } from '../membership/membership.helpers.js';
import {
  getRtmpIngestUrl,
  getWhipPublishUrl,
  getViewerHlsUrl,
  parseStreamKeyFromPath,
  mapProtocolToSource,
  extractYoutubeVideoId,
} from './live.config.js';

function generateStreamKey() {
  return randomBytes(16).toString('hex');
}

const MEDIAMTX_API_URL = (process.env.MEDIAMTX_API_URL || 'http://mediamtx:9997').replace(/\/$/, '');

function protocolFromMediaMtxPath(pathInfo) {
  const type = String(pathInfo?.source?.type || '').toLowerCase();
  if (type.includes('webrtc')) return 'WHIP';
  if (type.includes('rtmp')) return 'RTMP';
  return null;
}

async function getMediaMtxPathMap() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const res = await fetch(`${MEDIAMTX_API_URL}/v3/paths/list`, {
      signal: controller.signal,
    });
    if (!res.ok) return new Map();

    const data = await res.json();
    return new Map((data.items || []).map((item) => [item.name, item]));
  } catch {
    return new Map();
  } finally {
    clearTimeout(timeout);
  }
}

async function reconcileStreamWithMediaMtx(stream, pathMap = null) {
  if (!stream || stream.status === 'ENDED') return stream;
  if (stream.source_type !== 'MEDIAMTX') return stream;

  const paths = pathMap || await getMediaMtxPathMap();
  const pathInfo = paths.get(`live/${stream.stream_key}`);
  const isOnline = Boolean(pathInfo?.ready || pathInfo?.online || pathInfo?.available);

  if (isOnline && stream.status !== 'LIVE') {
    return prisma.liveStream.update({
      where: { id: stream.id },
      data: {
        status: 'LIVE',
        started_at: stream.started_at || new Date(pathInfo.readyTime || pathInfo.onlineTime || Date.now()),
        source_protocol: protocolFromMediaMtxPath(pathInfo) || stream.source_protocol,
        ended_at: null,
      },
      include: {
        creator: { select: { id: true, name: true } },
        show: { select: { id: true, title: true, thumbnail_url: true } }
      },
    });
  }

  if (isOnline) {
    const sourceProtocol = protocolFromMediaMtxPath(pathInfo);
    if (sourceProtocol && stream.source_protocol !== sourceProtocol) {
      return prisma.liveStream.update({
        where: { id: stream.id },
        data: { source_protocol: sourceProtocol },
        include: {
          creator: { select: { id: true, name: true } },
          show: { select: { id: true, title: true, thumbnail_url: true } }
        },
      });
    }
  }

  return stream;
}

function formatStream(stream, includeIngest = false) {
  const base = {
    id: stream.id,
    title: stream.title,
    thumbnail_url: stream.thumbnail_url,
    stream_key: stream.stream_key,
    status: stream.status,
    source_protocol: stream.source_protocol,
    source_type: stream.source_type,
    youtube_video_id: stream.youtube_video_id,
    created_by: stream.created_by,
    scheduled_at: stream.scheduled_at,
    scheduled_end_at: stream.scheduled_end_at,
    started_at: stream.started_at,
    ended_at: stream.ended_at,
    created_at: stream.created_at,
    show_id: stream.show_id,
    is_public: stream.is_public,
    show: stream.show
      ? { id: stream.show.id, title: stream.show.title, thumbnail_url: stream.show.thumbnail_url }
      : undefined,
    creator: stream.creator
      ? { id: stream.creator.id, name: stream.creator.name }
      : undefined,
  };
  if (includeIngest && stream.source_type === 'MEDIAMTX') {
    return {
      ...base,
      rtmp_url: getRtmpIngestUrl(),
      whip_url: getWhipPublishUrl(stream.stream_key),
    };
  }
  return base;
}

export async function createStream(data, adminId) {
  const { title, thumbnail_url, scheduled_at, scheduled_end_at, source_type = 'YOUTUBE', youtube_video_id, show_id, is_public = true, ignore_conflicts = false } = data;

  if (scheduled_at && scheduled_end_at) {
    const sTime = new Date(scheduled_at).getTime();
    const eTime = new Date(scheduled_end_at).getTime();
    if (eTime <= sTime) {
      throw new AppError('Scheduled end time must be after scheduled start time', 400);
    }
  }

  // Conflict Overlap Check
  if (!ignore_conflicts) {
    const targetStart = scheduled_at ? new Date(scheduled_at) : new Date();
    const targetEnd = scheduled_end_at ? new Date(scheduled_end_at) : new Date(targetStart.getTime() + 2 * 60 * 60 * 1000);

    const activeStreams = await prisma.liveStream.findMany({
      where: {
        status: { in: ['LIVE', 'SCHEDULED'] }
      },
      select: {
        id: true,
        title: true,
        status: true,
        scheduled_at: true,
        scheduled_end_at: true,
        started_at: true,
        created_at: true
      }
    });

    const conflicts = [];
    for (const s of activeStreams) {
      const sStart = s.started_at || s.scheduled_at || s.created_at;
      const sEnd = s.scheduled_end_at || new Date(sStart.getTime() + 2 * 60 * 60 * 1000);

      if (targetStart < sEnd && sStart < targetEnd) {
        const formatTime = (dateObj) => new Date(dateObj).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        conflicts.push({
          id: s.id,
          title: s.title,
          status: s.status,
          scheduled_at: sStart.toISOString(),
          scheduled_end_at: sEnd.toISOString(),
          formatted_time: `${formatTime(sStart)} to ${formatTime(sEnd)}`
        });
      }
    }

    if (conflicts.length > 0) {
      return {
        has_conflict: true,
        conflicts
      };
    }
  }

  const streamKey = generateStreamKey();

  if (source_type === 'YOUTUBE') {
    const youtubeId = extractYoutubeVideoId(youtube_video_id);
    if (!youtubeId) {
      throw new AppError('Invalid YouTube video ID or URL', 400);
    }

    const stream = await prisma.liveStream.create({
      data: {
        title: title.trim(),
        thumbnail_url: thumbnail_url || null,
        stream_key: streamKey,
        status: 'SCHEDULED',
        source_type: 'YOUTUBE',
        youtube_video_id: youtubeId,
        created_by: adminId,
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
        scheduled_end_at: scheduled_end_at ? new Date(scheduled_end_at) : null,
        show_id,
        is_public,
      },
      include: {
        creator: { select: { id: true, name: true } },
        show: { select: { id: true, title: true, thumbnail_url: true } }
      },
    });

    return {
      stream: formatStream(stream, false),
      stream_id: stream.id,
    };
  } else {
    // LEGACY: MediaMTX path — retained for fallback
    const stream = await prisma.liveStream.create({
      data: {
        title: title.trim(),
        thumbnail_url: thumbnail_url || null,
        stream_key: streamKey,
        status: 'SCHEDULED',
        source_type: 'MEDIAMTX',
        created_by: adminId,
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
        scheduled_end_at: scheduled_end_at ? new Date(scheduled_end_at) : null,
        show_id,
        is_public,
      },
      include: {
        creator: { select: { id: true, name: true } },
        show: { select: { id: true, title: true, thumbnail_url: true } }
      },
    });

    return {
      stream: formatStream(stream, true),
      stream_id: stream.id,
      stream_key: streamKey,
      rtmp_url: getRtmpIngestUrl(),
      whip_url: getWhipPublishUrl(streamKey),
    };
  }
}

export async function listStreams({ endedPeriodDays = 7, requesting_user = null } = {}) {
  const periodCutoff = new Date();
  periodCutoff.setDate(periodCutoff.getDate() - endedPeriodDays);

  const whereClause = {
    OR: [
      { status: { in: ['LIVE', 'SCHEDULED'] } },
      {
        status: 'ENDED',
        ended_at: { gte: periodCutoff },
      },
    ],
  };

  if (requesting_user && requesting_user.role === 'TEACHER') {
    whereClause.created_by = requesting_user.id;
  }

  const streams = await prisma.liveStream.findMany({
    where: whereClause,
    orderBy: [
      // Active streams first, then ended by most recent
      { status: 'asc' }, // ENDED < LIVE < SCHEDULED alphabetically — we sort below
      { created_at: 'desc' },
    ],
    take: 200,
    include: {
      creator: { select: { id: true, name: true } },
      show: { select: { id: true, title: true, thumbnail_url: true } }
    },
  });

  // Sort: LIVE first, then SCHEDULED, then ENDED
  const order = { LIVE: 0, SCHEDULED: 1, ENDED: 2 };
  streams.sort((a, b) => {
    const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
    if (diff !== 0) return diff;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const pathMap = await getMediaMtxPathMap();
  const reconciled = await Promise.all(streams.map((s) => reconcileStreamWithMediaMtx(s, pathMap)));
  return reconciled.map((s) => formatStream(s, true));
}

export async function getStreamById(id) {
  const stream = await prisma.liveStream.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      show: { select: { id: true, title: true, thumbnail_url: true } }
    },
  });
  if (!stream) throw new AppError('Stream not found', 404);
  const reconciled = await reconcileStreamWithMediaMtx(stream);
  return formatStream(reconciled, true);
}

export async function checkLiveStreamAccess(userId, streamId) {
  const stream = await prisma.liveStream.findUnique({
    where: { id: streamId },
    include: {
      show: {
        select: {
          id: true,
          category_id: true,
          is_free: true,
        }
      }
    }
  });

  if (!stream) {
    return { has_access: false, reason: 'stream_not_found' };
  }

  // Public streams are visible/joinable in list (caller blocks guests on /join and /play routes)
  if (stream.is_public) {
    return { has_access: true };
  }

  // Subscribers-only streams logic below:
  if (!userId) {
    return { has_access: false, reason: 'login_required' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user && (user.role === 'ADMIN' || user.role === 'SUB_ADMIN')) {
    return { has_access: true };
  }

  const showId = stream.show?.id;
  if (!showId) {
    return { has_access: false, reason: 'no_course_linked' };
  }

  // Rule 1: Direct purchase of the show
  const directPurchase = await prisma.showAccess.findUnique({
    where: {
      idx_sa_user_show: {
        user_id: userId,
        show_id: showId,
      }
    }
  });
  if (directPurchase) {
    return { has_access: true };
  }

  // Rule 2: Package purchase that includes the show
  const packagePurchase = await prisma.packagePurchase.findFirst({
    where: {
      user_id: userId,
      package: {
        package_shows: {
          some: {
            show_id: showId,
          }
        }
      }
    }
  });
  if (packagePurchase) {
    return { has_access: true };
  }

  // Rule 3: Active membership that covers this show's category
  const now = new Date();
  const membershipWhere = {
    user_id: userId,
    ...activeMembershipWhere(now),
  };
  const categoryId = stream.show.category_id;
  if (categoryId) {
    membershipWhere.plan = {
      OR: [{ category_id: null }, { category_id: categoryId }],
    };
  }
  const membership = await prisma.userMembership.findFirst({
    where: membershipWhere,
  });
  if (membership) {
    return { has_access: true };
  }

  return { has_access: false, reason: 'upgrade_required' };
}

export async function getActiveStreams(userId) {
  const candidates = await prisma.liveStream.findMany({
    where: { status: { in: ['SCHEDULED', 'LIVE'] } },
    orderBy: { started_at: 'desc' },
    include: {
      creator: { select: { id: true, name: true } },
      show: { select: { id: true, title: true, thumbnail_url: true, category_id: true } }
    },
  });
  const pathMap = await getMediaMtxPathMap();
  const streams = await Promise.all(candidates.map((s) => reconcileStreamWithMediaMtx(s, pathMap)));
  const reconciled = streams.filter((s) => s.status === 'LIVE' || s.status === 'SCHEDULED');
  
  // Sort: LIVE streams first, then SCHEDULED streams sorted by scheduled_at ascending (soonest first)
  const sorted = reconciled.sort((a, b) => {
    if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
    if (a.status !== 'LIVE' && b.status === 'LIVE') return 1;
    if (a.status === 'LIVE') {
      return new Date(b.started_at || b.created_at) - new Date(a.started_at || a.created_at);
    } else {
      if (!a.scheduled_at) return 1;
      if (!b.scheduled_at) return -1;
      return new Date(a.scheduled_at) - new Date(b.scheduled_at);
    }
  });

  const filtered = [];
  for (const s of sorted) {
    const access = await checkLiveStreamAccess(userId, s.id);
    if (access.has_access) {
      filtered.push({
        ...formatStream(s),
        is_live: s.status === 'LIVE',
      });
    }
  }
  return filtered;
}

export async function getPlayUrl(streamId, userId) {
  const stream = await prisma.liveStream.findUnique({
    where: { id: streamId },
    include: { creator: { select: { id: true, name: true } } },
  });
  if (!stream) throw new AppError('Stream not found', 404);
  const reconciled = await reconcileStreamWithMediaMtx(stream);
  if (reconciled.status !== 'LIVE') {
    throw new AppError('Stream is not live', 404);
  }

  // Validate access
  const access = await checkLiveStreamAccess(userId, streamId);
  if (!access.has_access) {
    if (access.reason === 'login_required') {
      throw new AppError('Authentication required to watch live streams', 401);
    }
    throw new AppError('This stream is for subscribers only. Upgrade to unlock.', 403);
  }

  if (reconciled.source_type === 'YOUTUBE') {
    return {
      stream_id: reconciled.id,
      title: reconciled.title,
      video_source: 'YOUTUBE',
      youtube_video_id: reconciled.youtube_video_id,
      status: reconciled.status,
    };
  }

  return {
    stream_id: reconciled.id,
    title: reconciled.title,
    hls_url: getViewerHlsUrl(reconciled.stream_key),
    status: reconciled.status,
  };
}

export async function markStreamLive(streamId, adminId) {
  const stream = await prisma.liveStream.findUnique({
    where: { id: streamId },
    include: { creator: { select: { id: true, name: true } } },
  });
  if (!stream) throw new AppError('Stream not found', 404);
  if (stream.source_type !== 'YOUTUBE') {
    throw new AppError('Only valid for YouTube live streams', 400);
  }
  if (stream.status !== 'SCHEDULED') {
    throw new AppError('Stream is not in SCHEDULED status', 400);
  }

  const updated = await prisma.liveStream.update({
    where: { id: streamId },
    data: {
      status: 'LIVE',
      started_at: new Date(),
    },
    include: {
      creator: { select: { id: true, name: true } },
      show: { select: { id: true, title: true, thumbnail_url: true } }
    },
  });

  return formatStream(updated);
}

export async function forceEndStream(streamId) {
  const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
  if (!stream) throw new AppError('Stream not found', 404);

  const now = new Date();
  const updated = await prisma.liveStream.update({
    where: { id: streamId },
    data: {
      status: 'ENDED',
      ended_at: stream.ended_at || now,
    },
    include: {
      creator: { select: { id: true, name: true } },
      show: { select: { id: true, title: true, thumbnail_url: true } }
    },
  });

  // Close all active viewer sessions for this stream
  await prisma.liveViewerSession.updateMany({
    where: {
      stream_id: streamId,
      is_active: true,
    },
    data: {
      is_active: false,
      left_at: now,
    },
  });

  return formatStream(updated);
}

// LEGACY: MediaMTX webhook handlers — unused for YOUTUBE source_type streams, retained for fallback.
/**
 * MediaMTX HTTP auth hook — allow publish only for valid, non-ended stream keys.
 * Read/playback on live/* is allowed for v1 (free access).
 */
export async function handleAuthHook(payload) {
  const { action, path } = payload;
  const streamKey = parseStreamKeyFromPath(path);

  console.log(`[MediaMTX AuthHook] action: "${action}", path: "${path}", streamKey: "${streamKey}"`);

  if (!streamKey) {
    console.warn(`[MediaMTX AuthHook] DENIED: unable to parse streamKey from path "${path}"`);
    return { allowed: false };
  }

  const readActions = ['read', 'playback'];
  if (readActions.includes(action)) {
    console.log(`[MediaMTX AuthHook] ALLOWED: action is "${action}"`);
    return { allowed: true };
  }

  if (action !== 'publish') {
    console.warn(`[MediaMTX AuthHook] DENIED: invalid action "${action}" for stream key`);
    return { allowed: false };
  }

  const stream = await prisma.liveStream.findUnique({
    where: { stream_key: streamKey },
    select: { status: true },
  });

  if (!stream || stream.status === 'ENDED') {
    console.warn(`[MediaMTX AuthHook] DENIED: stream "${streamKey}" status is ${stream ? stream.status : 'NOT_FOUND'}`);
    return { allowed: false };
  }

  console.log(`[MediaMTX AuthHook] ALLOWED: publish for stream "${streamKey}"`);
  return { allowed: true };
}

export async function handleOnLive(payload) {
  const streamKey = parseStreamKeyFromPath(payload.path);
  if (!streamKey) return { ok: false, reason: 'invalid_path' };

  const sourceProtocol =
    mapProtocolToSource(payload.protocol) ||
    mapProtocolToSource(payload.source_type);

  const stream = await prisma.liveStream.findUnique({
    where: { stream_key: streamKey },
  });
  if (!stream || stream.status === 'ENDED') {
    return { ok: false, reason: 'stream_not_found_or_ended' };
  }

  const now = new Date();
  await prisma.liveStream.update({
    where: { id: stream.id },
    data: {
      status: 'LIVE',
      started_at: stream.started_at || now,
      source_protocol: sourceProtocol || stream.source_protocol,
    },
  });

  return { ok: true, stream_id: stream.id };
}

export async function handleOnEnded(payload) {
  const streamKey = parseStreamKeyFromPath(payload.path);
  if (!streamKey) return { ok: false, reason: 'invalid_path' };

  const stream = await prisma.liveStream.findUnique({
    where: { stream_key: streamKey },
  });
  if (!stream) return { ok: false, reason: 'stream_not_found' };

  if (stream.status === 'ENDED') {
    return { ok: true, stream_id: stream.id, already_ended: true };
  }

  const now = new Date();
  await prisma.liveStream.update({
    where: { id: stream.id },
    data: {
      status: 'ENDED',
      ended_at: now,
    },
  });

  // Close all active viewer sessions for this stream
  await prisma.liveViewerSession.updateMany({
    where: {
      stream_id: stream.id,
      is_active: true,
    },
    data: {
      is_active: false,
      left_at: now,
    },
  });

  return { ok: true, stream_id: stream.id };
}

// ──────────────────────────────────────
// VIEWER TRACKING
// ──────────────────────────────────────

export async function joinStream(streamId, userId) {
  // Validate stream exists
  const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
  if (!stream) throw new AppError('Stream not found', 404);

  // Validate access
  const access = await checkLiveStreamAccess(userId, streamId);
  if (!access.has_access) {
    if (access.reason === 'login_required') {
      throw new AppError('Authentication required to join live streams', 401);
    }
    throw new AppError('This stream is for subscribers only. Upgrade to unlock.', 403);
  }

  // If authenticated user, check for existing active session and deactivate other active streams
  if (userId) {
    const existing = await prisma.liveViewerSession.findFirst({
      where: {
        stream_id: streamId,
        user_id: userId,
        is_active: true,
      },
    });

    // Deactivate any active sessions on other streams for this user
    await prisma.liveViewerSession.updateMany({
      where: {
        user_id: userId,
        stream_id: { not: streamId },
        is_active: true,
      },
      data: {
        is_active: false,
        left_at: new Date(),
      },
    });

    if (existing) {
      return { session_id: existing.id, already_joined: true };
    }
  }

  // Create new session
  const session = await prisma.liveViewerSession.create({
    data: {
      stream_id: streamId,
      user_id: userId || null,
      guest_name: userId ? null : 'Guest',
    },
  });

  return { session_id: session.id, already_joined: false };
}

export async function leaveStream(sessionId) {
  const session = await prisma.liveViewerSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || !session.is_active) {
    return { ok: true, already_left: true };
  }

  await prisma.liveViewerSession.update({
    where: { id: sessionId },
    data: {
      is_active: false,
      left_at: new Date(),
    },
  });

  return { ok: true };
}

export async function getViewers(streamId) {
  const sessions = await prisma.liveViewerSession.findMany({
    where: {
      stream_id: streamId,
      is_active: true,
    },
    orderBy: { joined_at: 'asc' },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  const viewers = sessions.map((s) => ({
    session_id: s.id,
    user_id: s.user_id,
    name: s.user?.name || s.guest_name || 'Guest',
    avatar_url: null,
    joined_at: s.joined_at,
  }));

  return {
    viewer_count: viewers.length,
    viewers,
  };
}

export async function getExportData(streamId) {
  const stream = await prisma.liveStream.findUnique({
    where: { id: streamId },
    include: {
      show: { select: { title: true } }
    }
  });

  if (!stream) {
    throw new AppError('Stream not found', 404);
  }

  const sessions = await prisma.liveViewerSession.findMany({
    where: { stream_id: streamId },
    orderBy: { joined_at: 'asc' },
    include: {
      user: { select: { name: true } }
    }
  });

  // Format Date as DD-MM-YYYY
  const streamDate = stream.started_at || stream.scheduled_at || stream.created_at;
  let formattedDate = '';
  if (streamDate) {
    const d = new Date(streamDate);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    formattedDate = `${day}-${month}-${year}`;
  }

  const exportTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const list = sessions.map(s => {
    const studentName = s.user?.name || s.guest_name || 'Guest';
    const joinTime = new Date(s.joined_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    let leaveTime = '';
    if (s.is_active || !s.left_at) {
      leaveTime = `Still Active (As of ${exportTime})`;
    } else {
      leaveTime = new Date(s.left_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }

    return {
      student_name: studentName,
      joined_at: joinTime,
      left_at: leaveTime
    };
  });

  return {
    course_title: stream.show?.title || '',
    stream_title: stream.title || '',
    date: formattedDate,
    sessions: list
  };
}
