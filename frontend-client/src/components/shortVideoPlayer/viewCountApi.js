import { API_BASE_URL } from '../../constants/config';
import { createAuthenticatedApi } from '../../services/api';

const userApi = createAuthenticatedApi({
  baseURL: `${API_BASE_URL}/api/user`,
});

/**
 * Fires POST /api/user/shows/:showId/view once the 30s threshold is met.
 * Failures are logged but never surfaced to the user.
 */
export async function recordView({ showId, sessionId, episodeId, watchDurationSec, accessToken }) {
  try {
    await userApi.post(
      `/shows/${showId}/view`,
      {
        session_id: sessionId,
        episode_id: episodeId ?? null,
        watch_duration_sec: Math.floor(watchDurationSec),
      },
      accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}
    );
    console.log(`[viewCount] View recorded - show: ${showId}, session: ${sessionId}, duration: ${Math.floor(watchDurationSec)}s`);
  } catch (err) {
    console.warn(`[viewCount] Failed to record view - show: ${showId}`, err?.response?.data || err?.message);
  }
}
