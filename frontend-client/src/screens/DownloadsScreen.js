import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';

import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../constants/config';
import { ROUTES } from '../constants/routes';
import { getDownloadedEpisodes, removeDownload } from '../services/downloadManager';
import { initShowPlayer } from '../redux/slices/showPlayerSlice';

function ThumbnailProgressBar({ progressSec, durationSec }) {
  if (!durationSec || durationSec === 0) return null;
  const pct = Math.min((progressSec / durationSec) * 100, 100);
  if (pct <= 0) return null;

  return (
    <View style={pStyles.track}>
      <View style={[pStyles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

function resolveThumbnailUrl(url) {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('file://')) return url;
  return `${API_BASE_URL}${url}`;
}

const pStyles = StyleSheet.create({
  track: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 2,
  },
});

function ShowCard({ item, onPress, onLongPress, selectionMode, selected, onDelete }) {
  const resolvedThumbnailUrl = resolveThumbnailUrl(item.thumbnail_url);

  return (
    <Pressable
      style={({ pressed }) => [
        cardStyles.card,
        pressed && !selectionMode && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {selectionMode && (
        <View style={cardStyles.selectIconWrap}>
          <Ionicons
            name={selected ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={selected ? theme.primary : theme.white}
          />
        </View>
      )}

      <View style={cardStyles.thumbnailWrap}>
        {resolvedThumbnailUrl ? (
          <Image
            source={{ uri: resolvedThumbnailUrl }}
            style={cardStyles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[cardStyles.thumbnail, { backgroundColor: theme.surface }]} />
        )}

        {!selectionMode && (
          <View style={cardStyles.playOverlay}>
            <Ionicons name="play" size={18} color={theme.white} />
          </View>
        )}

        <ThumbnailProgressBar
          progressSec={item.progress_sec || 0}
          durationSec={item.duration_sec || 0}
        />
      </View>

      <View style={cardStyles.info}>
        <Text style={cardStyles.category} numberOfLines={1}>
          {item.tags?.length > 0 ? item.tags[0] : (item.category || 'Drama')}
        </Text>
        <Text style={cardStyles.title} numberOfLines={2}>
          {item.show_title}
        </Text>
        <Text style={cardStyles.epLine}>
          EP.{item.episode_num} {'/'} EP.{item.total_episodes || '?'}
        </Text>
      </View>

      {!selectionMode && onDelete && (
        <TouchableOpacity style={cardStyles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color={theme.white} />
        </TouchableOpacity>
      )}
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 16,
    overflow: 'hidden',
    height: 110,
    marginBottom: 14,
    position: 'relative',
  },
  selectIconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 2,
  },
  deleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailWrap: {
    width: 140,
    height: '100%',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -18,
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 4,
  },
  category: {
    color: '#E0E0E0',
    fontSize: 11,
    fontWeight: '400',
  },
  title: {
    color: theme.white,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  epLine: {
    color: theme.lightGray,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
});

function EmptyState({ icon, title, subtitle }) {
  const { theme: appTheme } = useTheme();
  return (
    <View style={emptyStyles.wrap}>
      <Ionicons name={icon} size={48} color={appTheme.border} />
      <Text style={[emptyStyles.title, { color: appTheme.text }]}>{title}</Text>
      <Text style={emptyStyles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: theme.darkGray,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default function DownloadsScreen() {
  const { theme: appTheme } = useTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [downloads, setDownloads] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useFocusEffect(
    useCallback(() => {
      getDownloadedEpisodes().then(setDownloads);
    }, [])
  );

  const handleCardPressAction = useCallback((entry) => {
    if (selectionMode) {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(entry.episodeId)) newSet.delete(entry.episodeId);
        else newSet.add(entry.episodeId);
        if (newSet.size === 0) setSelectionMode(false);
        return newSet;
      });
      return;
    }

    dispatch(
      initShowPlayer({
        showId: entry.show_id,
        initialEpisodes: [
          {
            id: entry.episode_id,
            show_id: entry.show_id,
            episode_num: entry.episode_num,
            title: entry.show_title,
            duration: entry.duration_sec,
            thumbnail_url: entry.thumbnail_url,
            is_free: true,
            coin_cost: 0,
            status: 'ready',
            localVideoPath: entry.localVideoPath,
          },
        ],
        startEpisodeNum: entry.episode_num,
        totalEpisodes: entry.total_episodes,
      })
    );

    navigation.navigate(ROUTES.SHOW_PLAYER, { fromMyList: true });
  }, [dispatch, navigation, selectionMode]);

  const handleCardLongPress = useCallback((entry) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedItems(new Set([entry.episodeId]));
    }
  }, [selectionMode]);

  const cancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedItems(new Set());
  }, []);

  const confirmDeleteSelected = useCallback(async () => {
    for (const id of selectedItems) {
      await removeDownload(id);
    }
    const updatedDownloads = await getDownloadedEpisodes();
    setDownloads(updatedDownloads);
    
    setSelectionMode(false);
    setSelectedItems(new Set());
  }, [selectedItems]);

  const handleDeleteDirect = useCallback((item) => {
    if (selectionMode) return;
    setDeleteTarget(item);
    setDeleteModalVisible(true);
  }, [selectionMode]);

  const confirmDeleteDirect = useCallback(async () => {
    if (deleteTarget) {
      const id = deleteTarget.episodeId;
      if (id) {
        await removeDownload(id);
      }
      const updatedDownloads = await getDownloadedEpisodes();
      setDownloads(updatedDownloads);
    }
    setDeleteModalVisible(false);
    setDeleteTarget(null);
  }, [deleteTarget]);

  const isBulk = deleteTarget === null;
  const modalTitle = isBulk ? "Delete Selected" : "Remove Item";
  const modalText = isBulk
    ? "Are you sure you want to delete the selected videos from your downloads?"
    : "Are you sure you want to remove this video from your downloads?";

  return (
    <View style={[styles.screen, { backgroundColor: appTheme.screenBg }]}>
      {selectionMode && (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={cancelSelection} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.selectionTitle, { color: appTheme.text }]}>{selectedItems.size} Selected</Text>
          <TouchableOpacity onPress={() => { setDeleteTarget(null); setDeleteModalVisible(true); }} style={styles.deleteActionBtn}>
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {downloads.length === 0 ? (
        <EmptyState
          icon="download-outline"
          title="No downloads yet"
          subtitle="Download episodes to watch them offline"
        />
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.episodeId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ShowCard
              item={{
                show_id: item.showName, // mock for local playback
                show_title: item.showName || item.title,
                thumbnail_url: item.localImagePath,
                category: 'Downloaded',
                episode_id: item.episodeId,
                episode_num: item.episodeNum,
                duration_sec: item.duration,
                progress_sec: 0,
                total_episodes: item.episodeNum,
                tags: ['Offline'],
              }}
              selectionMode={selectionMode}
              selected={selectedItems.has(item.episodeId)}
              onDelete={() => handleDeleteDirect(item)}
              onPress={() => handleCardPressAction({
                episodeId: item.episodeId,
                show_id: item.showName || item.episodeId,
                show_title: item.showName || item.title,
                thumbnail_url: item.localImagePath,
                episode_id: item.episodeId,
                episode_num: item.episodeNum,
                duration_sec: item.duration,
                progress_sec: 0,
                total_episodes: 1, 
                localVideoPath: item.localVideoPath,
              })}
              onLongPress={() => handleCardLongPress({
                episodeId: item.episodeId,
              })}
            />
          )}
        />
      )}

      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContainer, { backgroundColor: appTheme.surface }]}>
            <Text style={[styles.modalTitle, { color: appTheme.text }]}>{modalTitle}</Text>
            <Text style={styles.modalText}>{modalText}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteTarget(null);
                }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnDelete}
                onPress={isBulk ? confirmDeleteSelected : confirmDeleteDirect}
              >
                <Text style={styles.modalBtnDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  cancelBtn: { padding: 4 },
  cancelBtnText: { color: theme.gray, fontSize: 15, fontWeight: '600' },
  selectionTitle: { fontSize: 16, fontWeight: '700' },
  deleteActionBtn: { padding: 4 },
  deleteActionText: { color: theme.primary, fontSize: 15, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    color: theme.lightGray,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalBtnDelete: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: theme.primary,
    alignItems: 'center',
  },
  modalBtnDeleteText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
