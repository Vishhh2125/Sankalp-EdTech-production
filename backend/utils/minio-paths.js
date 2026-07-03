/**
 * MinIO Path Helpers
 * Generates paths for HLS streaming structure: dramas/<showId>/episodes/<episodeId>/<quality>/
 * Show thumbnail is shared across all episodes of a drama
 */

const BASE_FOLDER = 'dramas';

/**
 * Get show base path
 * @param {string} showId - Show/Drama UUID
 * @returns {string} - "dramas/<showId>"
 */
export function getShowBasePath(showId) {
  return `${BASE_FOLDER}/${showId}`;
}

/**
 * Get show thumbnail path (shared by all episodes)
 * @param {string} showId - Show/Drama UUID
 * @returns {string} - "dramas/<showId>/thumbnail.jpg"
 */
export function getShowThumbnailPath(showId) {
  return `${getShowBasePath(showId)}/thumbnail.jpg`;
}

/**
 * Get episode base path
 * @param {string} showId - Show/Drama UUID
 * @param {string} episodeId - Episode UUID
 * @returns {string} - "dramas/<showId>/episodes/<episodeId>"
 */
export function getEpisodeBasePath(showId, episodeId) {
  return `${getShowBasePath(showId)}/episodes/${episodeId}`;
}

/**
 * Get master playlist path
 * @param {string} showId - Show/Drama UUID
 * @param {string} episodeId - Episode UUID
 * @returns {string} - "dramas/<showId>/episodes/<episodeId>/master.m3u8"
 */
export function getMasterPlaylistPath(showId, episodeId) {
  return `${getEpisodeBasePath(showId, episodeId)}/master.m3u8`;
}

/**
 * Get quality folder path
 * @param {string} showId - Show/Drama UUID
 * @param {string} episodeId - Episode UUID
 * @param {string} quality - Quality name (e.g., "720p", "480p")
 * @returns {string} - "dramas/<showId>/episodes/<episodeId>/<quality>"
 */
export function getQualityFolderPath(showId, episodeId, quality) {
  return `${getEpisodeBasePath(showId, episodeId)}/${quality}`;
}

/**
 * Get quality playlist path (index.m3u8)
 * @param {string} showId - Show/Drama UUID
 * @param {string} episodeId - Episode UUID
 * @param {string} quality - Quality name (e.g., "720p", "480p")
 * @returns {string} - "dramas/<showId>/episodes/<episodeId>/<quality>/index.m3u8"
 */
export function getQualityPlaylistPath(showId, episodeId, quality) {
  return `${getQualityFolderPath(showId, episodeId, quality)}/index.m3u8`;
}

/**
 * Get segment path
 * @param {string} showId - Show/Drama UUID
 * @param {string} episodeId - Episode UUID
 * @param {string} quality - Quality name (e.g., "720p", "480p")
 * @param {string} segmentFilename - Segment filename (e.g., "seg_000.ts")
 * @returns {string} - "dramas/<showId>/episodes/<episodeId>/<quality>/<segmentFilename>"
 */
export function getSegmentPath(showId, episodeId, quality, segmentFilename) {
  return `${getQualityFolderPath(showId, episodeId, quality)}/${segmentFilename}`;
}

export default {
  getShowBasePath,
  getShowThumbnailPath,
  getEpisodeBasePath,
  getMasterPlaylistPath,
  getQualityFolderPath,
  getQualityPlaylistPath,
  getSegmentPath,
};
