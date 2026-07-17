import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { ROUTES } from '../constants/routes';
import { fetchActiveLiveStreams } from '../components/live/liveApi';
import { useNetwork } from '../context/NetworkContext';
import { useGuestAuth } from '../context/GuestAuthContext';
import { API_BASE_URL } from '../constants/config';


export default function LiveScreen() {
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useStyles(theme, insets);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { isOffline } = useNetwork();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await fetchActiveLiveStreams();
      setStreams(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load live streams');
      setStreams([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    load();
  }, [isFocused, load]);

  const { isGuest, openLogin } = useGuestAuth();

  const openViewer = (stream) => {
    if (isGuest) {
      Alert.alert(
        'Login Required',
        'Please log in to join live streams.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: openLogin },
        ],
        { cancelable: true }
      );
      return;
    }
    const isLive = stream.is_live || stream.status === 'LIVE';
    if (!isLive && stream.status === 'SCHEDULED') {
      Alert.alert(
        'Stream Scheduled',
        `This stream is scheduled for ${new Date(stream.scheduled_at).toLocaleString()}. Please check back then!`,
        [{ text: 'OK' }]
      );
      return;
    }
    navigation.navigate(ROUTES.LIVE_VIEWER, {
      streamId: stream.id,
      title: stream.title,
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live</Text>
          <Text style={styles.headerSub}>Watch streams happening now</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live</Text>
        <Text style={styles.headerSub}>Watch streams happening now</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{isOffline ? 'You are offline' : error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={streams}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />
        }
        contentContainerStyle={streams.length === 0 ? styles.emptyWrap : styles.list}
        ListEmptyComponent={
          !error ? (
            <View style={styles.empty}>
              <Ionicons name={isOffline ? "cloud-offline-outline" : "radio-outline"} size={48} color={theme.gray} />
              <Text style={styles.emptyTitle}>{isOffline ? 'You are offline' : 'No live streams right now'}</Text>
              <Text style={styles.emptySub}>{isOffline ? 'Check your internet connection and try again.' : 'Check back soon — new shows go live from the admin panel.'}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isLive = item.is_live || item.status === 'LIVE';
          const badgeBg = isLive ? 'rgba(255,76,0,0.15)' : 'rgba(255,214,10,0.15)';
          const badgeDot = isLive ? theme.primary : theme.gold;
          const badgeText = isLive ? 'LIVE' : 'SCHEDULED';
          const linkText = isLive ? 'Watch now' : '';
          const linkColor = isLive ? theme.primary : theme.gold;

          const resolvedUrl = resolveThumbnailUrl(item.show?.thumbnail_url || item.thumbnail_url);

          const formatDate = (dateString) => {
            if (!dateString) return '';
            const d = new Date(dateString);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year}, ${hours}:${minutes}`;
          };

          return (
            <Pressable style={styles.card} onPress={() => openViewer(item)}>
              {/* Thumbnail Left */}
              <View style={styles.thumbnailWrap}>
                {resolvedUrl ? (
                  <Image
                    source={{ uri: resolvedUrl }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.thumbnail, styles.centered, { backgroundColor: '#2C2C2E' }]}>
                    <Ionicons name="film-outline" size={28} color={theme.gray} />
                  </View>
                )}
              </View>

              {/* Info Right */}
              <View style={styles.info}>
                <View style={{ gap: 2 }}>
                  <View style={styles.rowHeader}>
                    {/* Badge */}
                    <View style={[styles.liveBadge, { backgroundColor: badgeBg }]}>
                      <View style={[styles.liveDot, { backgroundColor: badgeDot }]} />
                      <Text style={[styles.liveBadgeText, { color: badgeDot }]}>{badgeText}</Text>
                    </View>
                  </View>

                  {/* Course Name */}
                  {item.show?.title ? (
                    <Text style={styles.cardCourse} numberOfLines={1}>
                      {item.show.title}
                    </Text>
                  ) : null}

                  {/* Stream Title */}
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>

                  {/* Scheduled Time */}
                  {item.scheduled_at && !isLive ? (
                    <Text style={styles.cardSub} numberOfLines={1}>
                      Sch: {formatDate(item.scheduled_at)}
                    </Text>
                  ) : null}
                </View>

                {/* Footer Action Link */}
                <View style={styles.watchRow}>
                  {linkText ? (
                    <Text style={[styles.watchText, { color: linkColor }]}>{linkText}</Text>
                  ) : <View />}
                  <Ionicons name="chevron-forward" size={18} color={linkColor} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function resolveThumbnailUrl(url) {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('file://')) return url;
  return `${API_BASE_URL}${url}`;
}

const useStyles = (theme, insets = {}) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.deepBlack },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  headerTitle: { color: theme.text, fontSize: 26, fontWeight: '800' },
  headerSub: { color: theme.gray, fontSize: 13, marginTop: 4, marginBottom: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 16 + (insets.bottom || 0), gap: 14 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', paddingBottom: insets.bottom || 0 },
  empty: { alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { color: theme.text, fontSize: 17, fontWeight: '700', marginTop: 12 },
  emptySub: { color: theme.gray, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 16,
    overflow: 'hidden',
    height: 120,
    borderWidth: 1,
    borderColor: theme.border,
  },
  thumbnailWrap: {
    width: 95,
    height: '100%',
    backgroundColor: theme.isDark ? '#1C1C1E' : '#F3F4F6',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveBadgeText: { fontSize: 11, fontWeight: '800' },
  cardCourse: { color: theme.gray, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  cardTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  cardSub: { color: theme.gray, fontSize: 12, marginTop: 2 },
  watchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  watchText: { fontWeight: '700', fontSize: 13 },
  errorBox: { padding: 16, alignItems: 'center' },
  errorText: { color: theme.text, fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.primary, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
});
