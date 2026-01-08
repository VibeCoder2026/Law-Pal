import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList, RecentItem, ActReadingProgress } from '../types';
import { APP_CONFIG } from '../constants';
import { getRecentItems, getActProgressMap, clearRecentItems } from '../utils/recentItems';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RecentItems'>;

export default function RecentItemsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [recentProgress, setRecentProgress] = useState<Record<string, ActReadingProgress>>({});

  const loadRecentItems = useCallback(async () => {
    try {
      const items = await getRecentItems();
      const limitedItems = items.slice(0, APP_CONFIG.UI.RECENT_ITEMS_LIMIT);
      setRecentItems(limitedItems);
      if (limitedItems.length > 0) {
        const progressMap = await getActProgressMap();
        setRecentProgress(progressMap);
      }
    } catch (error) {
      console.error('[RecentItemsScreen] Failed to load recent items:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentItems();
    }, [loadRecentItems])
  );

  const handleRecentItemPress = (item: RecentItem) => {
    if (item.item_type === 'constitution') {
      navigation.navigate('Reader', {
        doc_id: item.doc_id,
        chunk_id: item.chunk_id,
      });
      return;
    }

    const progress = recentProgress[item.chunk_id];
    const initialPage = progress && progress.page > 0 ? progress.page : undefined;
    navigation.navigate('ActPdfViewer', {
      actTitle: item.title,
      pdfFilename: item.chunk_id,
      initialPage,
    });
  };

  const handleClearRecents = () => {
    Alert.alert(
      'Clear recent items?',
      'This will remove all recent items from the Home screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearRecentItems();
            setRecentItems([]);
            setRecentProgress({});
          },
        },
      ]
    );
  };

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Just now';
    const diffMs = Date.now() - timestamp;
    if (diffMs < 60_000) return 'Just now';
    if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
    if (diffMs < 604_800_000) return `${Math.floor(diffMs / 86_400_000)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Recently opened</Text>
        {recentItems.length > 0 ? (
          <TouchableOpacity onPress={handleClearRecents} style={styles.clearButton}>
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.clearButtonPlaceholder} />
        )}
      </View>

      {recentItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time" size={44} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Open an Act or Constitution article and it will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={recentItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const progress = item.item_type === 'act' ? recentProgress[item.chunk_id] : null;
            const progressLabel = progress ? `Page ${progress.page}` : undefined;
            const metaParts = [progressLabel, formatRelativeTime(item.timestamp)].filter(Boolean);
            return (
              <TouchableOpacity
                style={[styles.recentCard, { backgroundColor: colors.surface }]}
                onPress={() => handleRecentItemPress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.recentIconContainer, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons
                    name={item.item_type === 'constitution' ? 'document-text' : 'hammer'}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.recentContent}>
                  <Text style={[styles.recentTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.subtitle && (
                    <Text style={[styles.recentSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  )}
                  {metaParts.length > 0 && (
                    <Text style={[styles.recentMeta, { color: colors.textSecondary }]}>
                      {metaParts.join(' - ')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearButtonPlaceholder: {
    width: 48,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  recentIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  recentContent: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  recentSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  recentMeta: {
    fontSize: 11,
    marginTop: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
