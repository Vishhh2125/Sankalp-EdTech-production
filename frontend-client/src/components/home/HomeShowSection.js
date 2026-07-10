import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { API_BASE_URL } from '../../constants/config';

// Wider card to match reference image (Udemy-style)
const CARD_WIDTH = 110;

function ThumbnailProgressBar({ progressSec, durationSec }) {
  if (!durationSec || durationSec === 0) return null;
  const pct = Math.min((progressSec / durationSec) * 100, 100);
  if (pct <= 0) return null;

  return (
    <View style={styles.progressBarTrack}>
      <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
    </View>
  );
}

function resolveThumbnailUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
}

function SectionCard({ item, onPress }) {
  const uri = resolveThumbnailUrl(item.thumbnail_url);
  const categoryLabel = item.tags?.length > 0
    ? item.tags[0]
    : (item.category_name || item.category || '');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Poster image — tall, portrait ratio */}
      <View style={styles.posterWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterFallback]} />
        )}

        {/* Tag badge top-right */}
        {item.tag ? (
          <View style={[
            styles.tagBadge,
            { backgroundColor: item.tag === 'Hot' ? '#FF2D55' : '#7B2FFF' }
          ]}>
            <Text style={styles.tagBadgeText}>{item.tag}</Text>
          </View>
        ) : null}

        {/* View count */}
        <View style={styles.viewBadge}>
          <Ionicons name="eye-outline" size={10} color="#fff" />
          <Text style={styles.viewText}>
            {formatViews(item.view_count)}
          </Text>
        </View>

        {/* Progress bar */}
        <ThumbnailProgressBar
          progressSec={item.progress_sec || 0}
          durationSec={item.duration_sec || 0}
        />
      </View>

      {/* Title */}
      <Text style={styles.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>

      {/* Category / tag label */}
      {categoryLabel ? (
        <Text style={styles.cardCategory} numberOfLines={1}>
          {categoryLabel}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

function formatViews(viewCount) {
  if (typeof viewCount !== 'number' || Number.isNaN(viewCount)) return '0';
  if (viewCount >= 1_000_000) return `${(viewCount / 1_000_000).toFixed(1)}M`;
  if (viewCount >= 1_000) return `${(viewCount / 1_000).toFixed(1)}K`;
  return String(viewCount);
}

export default function HomeShowSection({
  title,
  items = [],
  onItemPress,
  onExpand,
  categoryTabs = [],
  activeCategoryId,
  onCategoryPress,
  renderItem,
  emptyText,
}) {
  if (!items.length && !emptyText) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        {categoryTabs.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabContent}
          >
            {categoryTabs.map((tab) => {
              const isActive =
                String(tab.id ?? 'all') === String(activeCategoryId ?? 'all');

              return (
                <TouchableOpacity
                  key={`${tab.id ?? 'all'}-${tab.name}`}
                  onPress={() => onCategoryPress?.(tab)}
                  activeOpacity={0.8}
                  style={[
                    styles.categoryTab,
                    isActive && styles.categoryTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      isActive && styles.categoryTabTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {tab.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}
        {onExpand && items.length > 0 ? (
          <Pressable style={styles.expandBtn} onPress={onExpand} hitSlop={8}>
            <Ionicons name="chevron-forward" size={22} color={theme.gray} />
          </Pressable>
        ) : null}
      </View>

      {items.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {items.map((item, index) => {
            const itemId = item.id || item.show_id || item.history_id || item.bookmark_id || 'item';
            const itemKey = `${itemId}-${index}`;
            return (
              renderItem ? (
                <View key={itemKey} style={styles.cardSlot}>
                  {renderItem(item)}
                </View>
              ) : (
                <SectionCard
                  key={itemKey}
                  item={item}
                  onPress={() => onItemPress?.(item)}
                />
              )
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
    gap: 10,
  },

  title: {
    color: theme.white,
    fontSize: 18,
    fontWeight: '800',
  },

  categoryTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 6,
  },

  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#555',
  },

  categoryTabActive: {
    borderColor: theme.white,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  categoryTabText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },

  categoryTabTextActive: {
    color: theme.white,
  },

  expandBtn: {
    padding: 4,
    flexShrink: 0,
  },

  scrollContent: {
    paddingHorizontal: 4,
    gap: 12,
  },

  cardSlot: {
    marginRight: 0,
  },

  // Wider card — matches Udemy-style reference image
  card: {
    width: CARD_WIDTH,
  },

  posterWrap: {
    width: '100%',
    aspectRatio: 2 / 3,          // Taller portrait ratio
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
    position: 'relative',
  },

  poster: {
    width: '100%',
    height: '100%',
  },

  posterFallback: {
    backgroundColor: theme.surface,
  },

  tagBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderBottomLeftRadius: 6,
  },

  tagBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  viewBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },

  viewText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },

  cardTitle: {
    color: theme.white,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    lineHeight: 18,
  },

  cardCategory: {
    color: theme.gray,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },

  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 2,
  },

  empty: {
    color: theme.gray,
    fontSize: 13,
    paddingHorizontal: 4,
  },
});