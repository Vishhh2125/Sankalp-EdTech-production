import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { fetchCmsPageBySlug } from '../services/cmsApi';
import HtmlRenderer from '../components/HtmlRenderer';

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function CmsViewerScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: appTheme } = useTheme();
  const styles = useStyles(appTheme);

  const { slug, title: initialTitle } = route.params || {};

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPage = async () => {
    if (!slug) {
      setError('Page not specified');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchCmsPageBySlug(slug);
      setPage(data);
    } catch (err) {
      console.error(`Failed to load CMS page ${slug}:`, err);
      setError('Failed to load page content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, [slug]);

  const displayTitle = page?.name || initialTitle || 'Information';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          onPress={() => navigation.goBack()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={appTheme.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {displayTitle}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={appTheme.primary || '#FF6B35'} />
            <Text style={styles.loadingText}>Loading content...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={48} color={appTheme.error || '#EF4444'} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={loadPage}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.pageBox}>
            <Text style={styles.pageTitle}>{page?.name}</Text>
            {page?.updated_at ? (
              <Text style={styles.updatedText}>
                Last updated: {formatDate(page.updated_at)}
              </Text>
            ) : null}

            <View style={styles.divider} />

            <HtmlRenderer html={page?.content} appTheme={appTheme} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = (appTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: appTheme.deepBlack || '#0B0D13',
    },
    header: {
      height: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justify: 'space-between',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: appTheme.border || 'rgba(255,255,255,0.08)',
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: appTheme.text || '#FFFFFF',
      flex: 1,
      textAlign: 'center',
    },
    container: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    loadingBox: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: appTheme.textMuted || '#999',
      fontSize: 14,
      marginTop: 12,
    },
    errorBox: {
      paddingVertical: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      color: appTheme.text || '#FFF',
      fontSize: 15,
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 20,
    },
    retryBtn: {
      backgroundColor: appTheme.primary || '#FF6B35',
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
    },
    retryBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    pageBox: {
      backgroundColor: appTheme.surface || 'rgba(255,255,255,0.04)',
      borderRadius: 14,
      padding: 20,
      borderWidth: 1,
      borderColor: appTheme.border || 'rgba(255,255,255,0.06)',
    },
    pageTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: appTheme.text || '#FFFFFF',
      marginBottom: 6,
    },
    updatedText: {
      fontSize: 12,
      color: appTheme.textMuted || '#888',
      marginBottom: 12,
    },
    divider: {
      height: 1,
      backgroundColor: appTheme.border || 'rgba(255,255,255,0.08)',
      marginVertical: 14,
    },
  });
