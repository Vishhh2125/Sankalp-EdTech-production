import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { courseworkApi } from '../services/courseworkApi';
import { downloadFile } from '../utils/fileDownloader';
import { API_BASE_URL } from '../constants/config';

function resolveThumbnailUrl(url) {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('file://')) {
    if (url.includes('/ott-media/')) return `${API_BASE_URL}${url.substring(url.indexOf('/ott-media/'))}`;
    if (url.includes('/uploads/')) return `${API_BASE_URL}${url.substring(url.indexOf('/uploads/'))}`;
    return url;
  }
  const separator = url.startsWith('/') ? '' : '/';
  return `${API_BASE_URL}${separator}${url}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function MyCertificatesScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const insets = useSafeAreaInsets();

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCertificates = useCallback(async () => {
    try {
      const res = await courseworkApi.getUserCertificates();
      const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setCertificates(list);
    } catch (err) {
      console.error('[MyCertificatesScreen] Failed to load certificates:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCertificates();
  };

  const renderCertificateItem = ({ item }) => {
    const courseTitle = item.show?.title || 'Course Certificate';
    const thumbnailUrl = resolveThumbnailUrl(item.show?.thumbnail_url);
    const certCode = item.certificate_code || '';
    const dateFormatted = formatDate(item.issued_at);

    return (
      <View style={styles.card}>
        {/* Left Poster Thumbnail */}
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.thumbnailFallback}>
            <Ionicons name="ribbon" size={28} color={theme.primary} />
          </View>
        )}

        {/* Center Details */}
        <View style={styles.cardContent}>
          <Text style={styles.courseTitle} numberOfLines={1}>
            {courseTitle}
          </Text>
          {dateFormatted ? (
            <Text style={styles.issuedDate}>Issued: {dateFormatted}</Text>
          ) : null}
          <View style={styles.codeBadge}>
            <Ionicons name="shield-checkmark" size={12} color={theme.primary} />
            <Text style={styles.codeBadgeText}>{certCode}</Text>
          </View>
        </View>

        {/* Right Download Action Button */}
        <Pressable
          style={({ pressed }) => [styles.downloadBtn, pressed && styles.downloadBtnPressed]}
          onPress={() => {
            if (item.pdf_url) {
              downloadFile(item.pdf_url, `${courseTitle}_Certificate`, 'pdf');
            }
          }}
          hitSlop={8}
        >
          <Ionicons name="download-outline" size={16} color="#FFF" />
          <Text style={styles.downloadBtnText}>PDF</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 44) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.white} />
        </Pressable>
        <Text style={styles.headerTitle}>My Certificates</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{certificates.length} Earned</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading certificates...</Text>
        </View>
      ) : (
        <FlatList
          data={certificates}
          keyExtractor={(item) => item.id || item.certificate_code}
          renderItem={renderCertificateItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom + 24, 40) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            certificates.length > 0 ? (
              <View style={styles.heroBanner}>
                <View style={styles.heroIconWrap}>
                  <Ionicons name="ribbon" size={28} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>Official Verified Certificates</Text>
                  <Text style={styles.heroSub}>
                    Congratulations! You have completed course requirements and earned official certificates.
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="trophy-outline" size={48} color={theme.gray} />
              </View>
              <Text style={styles.emptyTitle}>No Certificates Yet</Text>
              <Text style={styles.emptySub}>
                Complete all course lectures, quizzes, and assignments to earn your official completion certificates.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const useStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.deepBlack || '#0F1117',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: theme.surface || '#181B23',
      borderBottomWidth: 1,
      borderBottomColor: theme.border || '#303541',
      gap: 12,
    },
    headerTitle: {
      flex: 1,
      color: theme.white || '#F5F6F8',
      fontSize: 18,
      fontWeight: '800',
    },
    countBadge: {
      backgroundColor: 'rgba(255, 92, 26, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 92, 26, 0.3)',
    },
    countBadgeText: {
      color: theme.primary || '#FF5C1A',
      fontSize: 12,
      fontWeight: '700',
    },
    loadingBlock: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      color: theme.gray || '#667085',
      fontSize: 14,
    },
    listContent: {
      padding: 16,
    },
    heroBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface || '#181B23',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(255, 92, 26, 0.25)',
      padding: 14,
      marginBottom: 16,
      gap: 12,
    },
    heroIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 92, 26, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: {
      color: theme.white || '#F5F6F8',
      fontSize: 14,
      fontWeight: '700',
    },
    heroSub: {
      color: theme.textSecondary || '#A7ADBB',
      fontSize: 11,
      marginTop: 2,
      lineHeight: 16,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface || '#181B23',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border || '#303541',
      padding: 12,
      marginBottom: 12,
      gap: 12,
    },
    thumbnail: {
      width: 60,
      height: 80,
      borderRadius: 8,
      backgroundColor: theme.border || '#303541',
    },
    thumbnailFallback: {
      width: 60,
      height: 80,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 92, 26, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: {
      flex: 1,
      justifyContent: 'center',
    },
    courseTitle: {
      color: theme.white || '#F5F6F8',
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 4,
    },
    issuedDate: {
      color: theme.textSecondary || '#A7ADBB',
      fontSize: 12,
      marginBottom: 6,
    },
    codeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 92, 26, 0.12)',
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      gap: 4,
    },
    codeBadgeText: {
      color: theme.primary || '#FF5C1A',
      fontSize: 10,
      fontWeight: '700',
    },
    downloadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.primary || '#FF5C1A',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 4,
    },
    downloadBtnPressed: {
      opacity: 0.8,
    },
    downloadBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '800',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    emptyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      color: theme.white || '#F5F6F8',
      fontSize: 17,
      fontWeight: '800',
      marginBottom: 6,
    },
    emptySub: {
      color: theme.textSecondary || '#A7ADBB',
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
