import { useTheme } from '../../context/ThemeContext';
import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { formatFileSize } from '../../services/courseworkApi';
import { downloadFile } from '../../utils/fileDownloader';

export default function MaterialsTab({ materials, loading, hasAccess }) {
  const { theme: appTheme } = useTheme();
  const styles = useStyles(appTheme);
  if (loading) {
    return (
      <View style={styles.stateBlock}>
        <ActivityIndicator size="small" color={appTheme.primary} />
        <Text style={styles.stateText}>Loading materials...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={styles.lockedOverlay}>
        <Ionicons name="lock-closed" size={36} color={appTheme.gray} />
        <Text style={styles.lockedTitle}>Content Locked</Text>
        <Text style={styles.lockedSub}>
          Subscribe or unlock an episode to access course materials.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Course Materials</Text>
      <Text style={styles.subtitle}>Access all study materials and resources.</Text>

      {materials.length === 0 ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateText}>No materials available yet.</Text>
        </View>
      ) : (
        materials.map((m) => (
          <Pressable
            key={m.id}
            style={styles.card}
            onPress={() => {
              if (m.file_url) {
                downloadFile(m.file_url, m.title, m.file_type);
              }
            }}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="document-text" size={22} color={appTheme.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>{m.title}</Text>
              <Text style={styles.cardMeta}>
                {m.file_type?.toUpperCase() || 'FILE'}
                {m.file_size_bytes ? ` · ${formatFileSize(m.file_size_bytes)}` : ''}
              </Text>
            </View>
            <Pressable
              style={styles.downloadBtn}
              onPress={() => {
                if (m.file_url) {
                  downloadFile(m.file_url, m.title, m.file_type);
                }
              }}
            >
              <Ionicons name="download-outline" size={20} color={appTheme.white} />
            </Pressable>
          </Pressable>
        ))
      )}
    </View>
  );
}

const useStyles = (appTheme) => StyleSheet.create({
  sectionTitle: {
    color: appTheme.white,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: appTheme.gray,
    fontSize: 13,
    marginBottom: 18,
  },
  stateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  stateText: {
    color: appTheme.gray,
    fontSize: 13,
    textAlign: 'center',
  },
  lockedOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  lockedTitle: {
    color: appTheme.white,
    fontSize: 17,
    fontWeight: '800',
  },
  lockedSub: {
    color: appTheme.gray,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appTheme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appTheme.border,
    marginBottom: 10,
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(255,45,85,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: appTheme.white,
    fontSize: 14,
    fontWeight: '700',
  },
  cardMeta: {
    color: appTheme.gray,
    fontSize: 11,
    marginTop: 3,
  },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
