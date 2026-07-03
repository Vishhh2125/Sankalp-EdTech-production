import { useCallback, useEffect, useState } from 'react';

import { fetchHomeAnnouncements } from '../components/home/homePromoApi';
import {
  filterUnseenAnnouncements,
  getSeenAnnouncementIds,
  markAnnouncementIdsSeen,
} from '../components/home/homePromoStorage';
import {
  registerAnnouncementRefresh,
  unregisterAnnouncementRefresh,
} from '../components/home/homePromoRefresh';

/**
 * useHomeAnnouncements
 *
 * Loads unseen announcements once on mount and exposes:
 *   - unseenAnnouncements  — array for HomeAnnouncementBar
 *   - refreshAnnouncements — callable by admin tooling via triggerAnnouncementRefresh()
 *   - dismissAnnouncements — marks all current items seen and clears the list
 *
 * The AppState "active" listener that re-fetched on every app foreground has been
 * removed. That listener was firing GET /api/content/home/announcements dozens of
 * times per second (in combination with PromoFlowGate's own fetch and the
 * render-loop bug), flooding the server with redundant 304 requests.
 *
 * Announcements are already fetched by PromoFlowGate on each session open and on
 * each app foreground event, so this hook only needs to load on mount to populate
 * the persistent announcement bar. Admin-triggered refreshes still work via the
 * registerAnnouncementRefresh / triggerAnnouncementRefresh mechanism.
 */
export function useHomeAnnouncements() {
  const [unseenAnnouncements, setUnseenAnnouncements] = useState([]);

  const refreshAnnouncements = useCallback(async () => {
    try {
      const [list, seenIds] = await Promise.all([
        fetchHomeAnnouncements(),
        getSeenAnnouncementIds(),
      ]);
      setUnseenAnnouncements(
        filterUnseenAnnouncements(list.slice(0, 3), seenIds)
      );
    } catch {
      setUnseenAnnouncements([]);
    }
  }, []);

  // Fetch on mount and register for admin-triggered refreshes.
  // No AppState listener — PromoFlowGate already handles foreground re-fetching.
  useEffect(() => {
    refreshAnnouncements();
    registerAnnouncementRefresh(refreshAnnouncements);
    return () => unregisterAnnouncementRefresh();
  }, [refreshAnnouncements]);

  const dismissAnnouncements = useCallback(async () => {
    const ids = unseenAnnouncements.map((a) => a.id);
    if (ids.length) await markAnnouncementIdsSeen(ids);
    setUnseenAnnouncements([]);
  }, [unseenAnnouncements]);

  return {
    unseenAnnouncements,
    refreshAnnouncements,
    dismissAnnouncements,
  };
}