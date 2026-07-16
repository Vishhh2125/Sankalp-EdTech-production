import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { formatCount } from './shortVideoPlayer/utils';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.9);
const EPISODE_GAP = 6;
const EPISODES_PER_PAGE = 30;

function Tag({ label }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function getRangeStart(episodeNum = 1) {
  return Math.floor((Math.max(episodeNum, 1) - 1) / EPISODES_PER_PAGE) * EPISODES_PER_PAGE + 1;
}

function buildRanges(totalEpisodes) {
  const ranges = [];
  const safeTotal = Math.max(totalEpisodes || 0, 0);

  for (let start = 1; start <= safeTotal; start += EPISODES_PER_PAGE) {
    const end = Math.min(start + EPISODES_PER_PAGE - 1, safeTotal);
    ranges.push({
      key: `${start}-${end}`,
      start,
      label: `${start}-${end}`,
    });
  }

  return ranges;
}

function EpisodeCell({ episode, isCurrentEpisode, onPress }) {
  if (!episode) return null;

  const locked = episode.is_locked;
  const isReady = episode.status === 'ready';

  return (
    <Pressable
      style={[
        styles.episodeCell,
        locked && styles.episodeCellLocked,
        isCurrentEpisode && styles.episodeCellActive,
        !isReady && styles.episodeCellPending,
      ]}
      onPress={() => onPress && onPress(episode)}
      disabled={!onPress}
    >
      <Text style={[styles.episodeNumber, { color: appTheme.textPrimary }]}>{episode.episode_num}</Text>
      {locked ? (
        <Ionicons
          name="lock-closed"
          size={15}
          color={appTheme.textSecondary}
          style={styles.lockIcon}
        />
      ) : null}
    </Pressable>
  );
}

export default function DramaDetailsSheet({
  visible,
  item,
  details = null,
  loading = false,
  error = null,
  initialTab = 'synopsis',
  onClose,
  onRangeChange,
  onEpisodePress,
}) {
  const { theme: appTheme } = useTheme();
  const styles = useStyles(appTheme);
  const [tab, setTab] = useState(initialTab);
  const [activeRangeStart, setActiveRangeStart] = useState(1);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!visible || !item) return;

    setTab(initialTab);
    setActiveRangeStart(getRangeStart(item.episode_num || 1));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [visible, initialTab, item]);

  const synopsisText =
    item?.synopsis ||
    'In a world where loyalty clashes with temptation, a rebellious heir and his alluring new stepsister navigate dangerous power struggles, family betrayals, and a forbidden romance—risking everything to protect their secrets and each other.';

  const tags = item?.tags || ['Rebellious', 'Forbidden Love', 'Step-Siblings', 'Modern'];

  const allEpisodes = useMemo(() => {
    const max = item?.episodeCount || 57;
    const list = [];
    for (let i = 1; i <= max; i++) list.push(i);
    return list;
  }, [item]);

  const ranges = useMemo(() => buildRanges(item?.episodeCount), [item]);

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdropWrap}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: appTheme.background, borderColor: appTheme.border }]}>
          {/* Header */}
          <View style={styles.topRow}>
            <View style={styles.posterRow}>
              <Image source={item.image} style={styles.poster} resizeMode="cover" />
              <View style={styles.posterMeta}>
                <Text style={[styles.title, { color: appTheme.textPrimary }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.metaText, { color: appTheme.textSecondary }]}>{item.views} Views</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: appTheme.elevatedSurface }]} onPress={onClose}>
              <Ionicons name="close" size={26} color={appTheme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={[styles.tabsRow, { borderBottomColor: appTheme.border }]}>
            <Pressable onPress={() => setTab('synopsis')} style={styles.tabBtn}>
              <Text style={[styles.tabText, { color: tab === 'synopsis' ? appTheme.textPrimary : appTheme.textSecondary }]}>
                Synopsis
              </Text>
              {tab === 'synopsis' && <View style={[styles.tabUnderline, { backgroundColor: appTheme.primary }]} />}
            </Pressable>
            <Pressable onPress={() => setTab('episodes')} style={styles.tabBtn}>
              <Text style={[styles.tabText, { color: tab === 'episodes' ? appTheme.textPrimary : appTheme.textSecondary }]}>
                Episodes
              </Text>
              {tab === 'episodes' && <View style={[styles.tabUnderline, { backgroundColor: appTheme.primary }]} />}
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {tab === 'synopsis' ? (
              <View>
                <Text style={[styles.sectionTitle, { color: appTheme.textPrimary }]}>Synopsis</Text>
                <Text style={[styles.synopsis, { color: appTheme.textSecondary }]}>{synopsisText}</Text>
                <View style={styles.tagsRow}>
                  {tags.map((t) => (
                    <Tag key={t} label={t} />
                  ))}
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.rangeRow}>
                  {ranges.map((r) => (
                    <Pressable key={r.key} onPress={() => setActiveRangeStart(r.start)}>
                      <Text style={[styles.rangeText, { color: activeRangeStart === r.start ? appTheme.textPrimary : appTheme.textSecondary }]}>
                        {r.label}
                      </Text>
                      {activeRangeStart === r.start && <View style={[styles.rangeUnderline, { backgroundColor: appTheme.primary }]} />}
                    </Pressable>
                  ))}
                </View>

                <View style={styles.episodesGrid}>
                  {allEpisodes
                    .filter((n) => n >= activeRangeStart && n < activeRangeStart + EPISODES_PER_PAGE)
                    .map((n) => {
                      const epData = { episode_num: n, is_locked: n > (item?.unlockedUntil || 0), status: 'ready' };
                      return <EpisodeCell key={n} episode={epData} isCurrentEpisode={n === item.episode_num} onPress={onEpisodePress} />;
                    })}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = (appTheme) => StyleSheet.create({
  backdropWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  posterRow: {
    flexDirection: 'row',
    gap: 14,
    flex: 1,
  },
  poster: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  posterMeta: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 24,
    borderBottomWidth: 1,
  },
  tabBtn: {
    paddingVertical: 12,
  },
  tabText: {
  },
  tabTextActive: {
    color: theme.textPrimary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: theme.textPrimary,
    borderRadius: 2,
  },
  content: {
    paddingTop: 18,
    paddingBottom: 50,
  },
  sectionTitle: {
    color: theme.background,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 14,
  },
  synopsis: {
    color: theme.textSecondary,
    fontSize: 21,
    lineHeight: 33,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tagText: {
    color: theme.gray,
    fontSize: 11,
    fontWeight: '600',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  rangeText: {
    color: theme.gray,
    fontSize: 14,
    fontWeight: '700',
  },
  rangeTextActive: {
    color: theme.textPrimary,
  },
  rangeUnderline: {
    marginTop: 4,
    height: 2,
    backgroundColor: theme.textPrimary,
    width: '100%',
  },
  episodesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: EPISODE_GAP, // Very thin margin
  },
  episodeCell: {
    width: '15.2%', // Fits exactly 6 per row with 6px gaps
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2, // Vertical gap
  },
  episodeNumber: {
    color: theme.textPrimary,
    fontWeight: '900',
    fontSize: 22,
  },
  lockIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});
