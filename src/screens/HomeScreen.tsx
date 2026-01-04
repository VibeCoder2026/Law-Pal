import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList, RecentItem, ActReadingProgress } from '../types';
import DatabaseService from '../db/database';
import { CONSTITUTION_PDF_PATH } from '../constants';
import { getRecentItems, getActProgressMap, clearRecentItems } from '../utils/recentItems';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PinnedItem {
  id: number;
  doc_id: string;
  chunk_id: string;
  item_type: 'constitution' | 'act';
  title: string;
  subtitle?: string;
  display_order: number;
}

type PinnedListItem = PinnedItem & { listKey: string };

interface OptionItem {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

type OptionListItem = OptionItem & { listKey: string };

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [recentProgress, setRecentProgress] = useState<Record<string, ActReadingProgress>>({});
  const pinnedListRef = useRef<FlatList<PinnedListItem>>(null);
  const pinnedSectionWidthRef = useRef(0);
  const isPinnedResettingRef = useRef(false);
  const hasPinnedCenteredRef = useRef(false);
  const optionsListRef = useRef<FlatList<OptionListItem>>(null);
  const optionsSectionHeightRef = useRef(0);
  const isResettingRef = useRef(false);
  const hasCenteredRef = useRef(false);

  const loadPinnedItems = useCallback(async () => {
    try {
      const items = await DatabaseService.getAllPinnedItems();
      setPinnedItems(items);
    } catch (error) {
      console.error('[HomeScreen] Failed to load pinned items:', error);
    }
  }, []);

  const loadRecentItems = useCallback(async () => {
    try {
      const items = await getRecentItems();
      setRecentItems(items);
      if (items.length > 0) {
        const progressMap = await getActProgressMap();
        setRecentProgress(progressMap);
      }
    } catch (error) {
      console.error('[HomeScreen] Failed to load recent items:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPinnedItems();
      loadRecentItems();
    }, [loadPinnedItems, loadRecentItems])
  );

  useEffect(() => {
    hasCenteredRef.current = false;
    optionsSectionHeightRef.current = 0;
    isResettingRef.current = false;
    hasPinnedCenteredRef.current = false;
    pinnedSectionWidthRef.current = 0;
    isPinnedResettingRef.current = false;
  }, [pinnedItems.length]);

  const handlePinnedItemPress = (item: PinnedItem) => {
    if (item.item_type === 'constitution') {
      navigation.navigate('Reader', {
        doc_id: item.doc_id,
        chunk_id: item.chunk_id,
      });
    } else if (item.item_type === 'act') {
      // Navigate to Act PDF viewer
      navigation.navigate('ActPdfViewer', {
        actTitle: item.title,
        pdfFilename: item.chunk_id, // For Acts, chunk_id stores the PDF filename
      });
    }
  };

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

  const handleUnpin = async (item: PinnedItem, event: any) => {
    // Stop propagation to prevent navigation
    event.stopPropagation();

    await DatabaseService.removePinnedItem(item.doc_id, item.chunk_id);
    // Reload pinned items after unpinning
    loadPinnedItems();
  };

  const handleBrowseConstitution = useCallback(() => {
    navigation.navigate('ActPdfViewer', {
      actTitle: 'Constitution of the Co-operative Republic of Guyana',
      pdfFilename: CONSTITUTION_PDF_PATH,
    });
  }, [navigation]);

  const options = useMemo<OptionItem[]>(() => [
    {
      key: 'chat',
      title: 'AI Legal Assistant',
      description: "Ask questions about Guyana's laws and get instant answers",
      icon: 'chatbubbles',
      onPress: () => navigation.navigate('Chat'),
    },
    {
      key: 'constitution',
      title: 'Browse Constitution',
      description: 'View the complete Constitution PDF document',
      icon: 'document-text',
      onPress: handleBrowseConstitution,
    },
    {
      key: 'acts',
      title: 'Acts & Statutes',
      description: 'Browse legislative acts and statutory laws',
      icon: 'hammer',
      onPress: () => navigation.navigate('ActsTiers'),
    },
    {
      key: 'feedback',
      title: 'Send Feedback',
      description: 'Tell us what to improve or request new features',
      icon: 'chatbox-ellipses',
      onPress: () => navigation.navigate('Feedback'),
    },
  ], [handleBrowseConstitution, navigation]);

  const optionsLoopData = useMemo<OptionListItem[]>(() => {
    const tripled: OptionListItem[] = [];
    for (let i = 0; i < 3; i += 1) {
      for (const option of options) {
        tripled.push({ ...option, listKey: `${option.key}-${i}` });
      }
    }
    return tripled;
  }, [options]);

  const pinnedLoopData = useMemo<PinnedListItem[]>(() => {
    const tripled: PinnedListItem[] = [];
    for (let i = 0; i < 3; i += 1) {
      for (const item of pinnedItems) {
        tripled.push({ ...item, listKey: `${item.id}-${i}` });
      }
    }
    return tripled;
  }, [pinnedItems]);

  const handleOptionsContentSizeChange = useCallback((_: number, height: number) => {
    if (height <= 0) return;
    const sectionHeight = height / 3;
    optionsSectionHeightRef.current = sectionHeight;

    if (!hasCenteredRef.current) {
      hasCenteredRef.current = true;
      requestAnimationFrame(() => {
        optionsListRef.current?.scrollToOffset({
          offset: sectionHeight,
          animated: false,
        });
      });
    }
  }, []);

  const handlePinnedContentSizeChange = useCallback((width: number) => {
    if (width <= 0) return;
    const sectionWidth = width / 3;
    pinnedSectionWidthRef.current = sectionWidth;

    if (!hasPinnedCenteredRef.current) {
      hasPinnedCenteredRef.current = true;
      requestAnimationFrame(() => {
        pinnedListRef.current?.scrollToOffset({
          offset: sectionWidth,
          animated: false,
        });
      });
    }
  }, []);

  const handleOptionsScroll = useCallback((event: any) => {
    if (isResettingRef.current) return;
    const sectionHeight = optionsSectionHeightRef.current;
    if (!sectionHeight) return;

    const offsetY = event.nativeEvent.contentOffset.y;
    const threshold = sectionHeight * 0.2;

    if (offsetY <= threshold) {
      isResettingRef.current = true;
      optionsListRef.current?.scrollToOffset({
        offset: offsetY + sectionHeight,
        animated: false,
      });
      requestAnimationFrame(() => {
        isResettingRef.current = false;
      });
    } else if (offsetY >= sectionHeight * 2 - threshold) {
      isResettingRef.current = true;
      optionsListRef.current?.scrollToOffset({
        offset: offsetY - sectionHeight,
        animated: false,
      });
      requestAnimationFrame(() => {
        isResettingRef.current = false;
      });
    }
  }, []);

  const handlePinnedScroll = useCallback((event: any) => {
    if (isPinnedResettingRef.current) return;
    const sectionWidth = pinnedSectionWidthRef.current;
    if (!sectionWidth) return;

    const offsetX = event.nativeEvent.contentOffset.x;
    const threshold = sectionWidth * 0.2;

    if (offsetX <= threshold) {
      isPinnedResettingRef.current = true;
      pinnedListRef.current?.scrollToOffset({
        offset: offsetX + sectionWidth,
        animated: false,
      });
      requestAnimationFrame(() => {
        isPinnedResettingRef.current = false;
      });
    } else if (offsetX >= sectionWidth * 2 - threshold) {
      isPinnedResettingRef.current = true;
      pinnedListRef.current?.scrollToOffset({
        offset: offsetX - sectionWidth,
        animated: false,
      });
      requestAnimationFrame(() => {
        isPinnedResettingRef.current = false;
      });
    }
  }, []);

  const renderOption = useCallback(({ item }: { item: OptionListItem }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: colors.surface }]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.categoryHeader}>
        <Ionicons name={item.icon} size={28} color={colors.primary} />
        <Text style={[styles.categoryTitle, { color: colors.text }]}>
          {item.title}
        </Text>
      </View>
      <Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>
        {item.description}
      </Text>
    </TouchableOpacity>
  ), [colors.primary, colors.surface, colors.text, colors.textSecondary]);

  const useLoopingOptions = pinnedItems.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              Law Pal 🇬🇾
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Legal Reference
            </Text>
          </View>
          <TouchableOpacity onPress={toggleDarkMode} style={styles.themeButton}>
            <Ionicons
              name={isDarkMode ? 'sunny' : 'moon'}
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {recentItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.recentHeaderRow}>
              <View style={styles.recentHeaderLeft}>
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8, marginBottom: 0 }]}>
                  Recent
                </Text>
              </View>
              <TouchableOpacity onPress={handleClearRecents} style={styles.clearButton}>
                <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentContainer}
              data={recentItems}
              keyExtractor={(item) => item.id}
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
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {pinnedItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pin" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8, marginBottom: 0 }]}>
                Quick Access
              </Text>
            </View>
            <FlatList
              ref={pinnedListRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pinnedContainer}
              data={pinnedLoopData}
              keyExtractor={(item) => item.listKey}
              onScroll={handlePinnedScroll}
              onContentSizeChange={handlePinnedContentSizeChange}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pinnedCard, { backgroundColor: colors.surface }]}
                  onPress={() => handlePinnedItemPress(item)}
                  activeOpacity={0.7}
                >
                  <TouchableOpacity
                    style={styles.unpinButton}
                    onPress={(e) => handleUnpin(item, e)}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <View style={[styles.pinnedIconContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons
                      name={item.item_type === 'constitution' ? 'document-text' : 'hammer'}
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={[styles.pinnedTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.subtitle && (
                    <Text style={[styles.pinnedSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        <View style={[styles.section, styles.optionsSection]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Options
          </Text>

          {useLoopingOptions ? (
            <FlatList
              ref={optionsListRef}
              style={styles.optionsScroll}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}
              data={optionsLoopData}
              keyExtractor={(item) => item.listKey}
              renderItem={renderOption}
              onScroll={handleOptionsScroll}
              onContentSizeChange={handleOptionsContentSizeChange}
              scrollEventThrottle={16}
            />
          ) : (
            <ScrollView
              style={styles.optionsScroll}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.categoryCard, { backgroundColor: colors.surface }]}
                  onPress={option.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryHeader}>
                    <Ionicons name={option.icon} size={28} color={colors.primary} />
                    <Text style={[styles.categoryTitle, { color: colors.text }]}>
                      {option.title}
                    </Text>
                  </View>
                  <Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>
                    {option.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <View style={[styles.disclaimerSection, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          <Text style={{ fontWeight: 'bold' }}>Disclaimer:</Text> This app is for informational purposes only and does not constitute official legal advice. Law Pal 🇬🇾 is not affiliated with the Government of Guyana. Always verify with official gazetted documents and consult a legal professional for serious matters.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  themeButton: {
    padding: 8,
  },
  section: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  optionsSection: {
    flex: 1,
    minHeight: 0,
  },
  optionsScroll: {
    flex: 1,
    minHeight: 0,
  },
  optionsContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    paddingLeft: 20,
  },
  pinnedContainer: {
    paddingLeft: 20,
    paddingRight: 20,
    gap: 12,
  },
  pinnedCard: {
    width: 160,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  unpinButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 4,
  },
  pinnedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  pinnedTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  pinnedSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 20,
    marginBottom: 15,
  },
  recentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recentContainer: {
    paddingLeft: 20,
    paddingRight: 20,
    gap: 12,
  },
  recentCard: {
    width: 180,
    padding: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  recentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  recentSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  recentMeta: {
    fontSize: 11,
    marginTop: 6,
  },
  categoryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  categoryDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimerSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    opacity: 0.9,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
