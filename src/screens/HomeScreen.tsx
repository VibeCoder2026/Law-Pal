import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../types';
import DatabaseService from '../db/database';
import { CONSTITUTION_PDF_PATH } from '../constants';

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

const QUICK_ACCESS_COLLAPSED_KEY = 'quick_access_collapsed';

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);
  const [isQuickAccessCollapsed, setIsQuickAccessCollapsed] = useState(false);

  const loadPinnedItems = useCallback(async () => {
    try {
      const items = await DatabaseService.getAllPinnedItems();
      setPinnedItems(items);

      // Load collapsed state
      const collapsed = await AsyncStorage.getItem(QUICK_ACCESS_COLLAPSED_KEY);
      setIsQuickAccessCollapsed(collapsed === 'true');
    } catch (error) {
      console.error('[HomeScreen] Failed to load pinned items:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPinnedItems();
    }, [loadPinnedItems])
  );

  const toggleQuickAccessCollapsed = useCallback(async () => {
    const newState = !isQuickAccessCollapsed;
    setIsQuickAccessCollapsed(newState);
    await AsyncStorage.setItem(QUICK_ACCESS_COLLAPSED_KEY, newState.toString());
  }, [isQuickAccessCollapsed]);

  const handlePinnedItemPress = (item: PinnedItem) => {
    if (item.item_type === 'constitution') {
      navigation.navigate('Reader', {
        doc_id: item.doc_id,
        chunk_id: item.chunk_id,
      });
    } else if (item.item_type === 'act') {
      navigation.navigate('ActPdfViewer', {
        actTitle: item.title,
        pdfFilename: item.chunk_id,
      });
    }
  };

  const handleUnpin = async (item: PinnedItem, event: any) => {
    event.stopPropagation();
    await DatabaseService.removePinnedItem(item.doc_id, item.chunk_id);
    loadPinnedItems();
  };

  const handleBrowseConstitution = useCallback(() => {
    navigation.navigate('ActPdfViewer', {
      actTitle: 'Constitution of the Co-operative Republic of Guyana',
      pdfFilename: CONSTITUTION_PDF_PATH,
    });
  }, [navigation]);

  const options = useMemo(() => [
    {
      key: 'constitution',
      title: 'Browse Constitution',
      description: 'View the complete Constitution PDF document',
      icon: 'document-text' as const,
      onPress: handleBrowseConstitution,
    },
    {
      key: 'acts',
      title: 'Acts & Statutes',
      description: 'Browse legislative acts and statutory laws',
      icon: 'hammer' as const,
      onPress: () => navigation.navigate('ActsTiers'),
    },
    {
      key: 'recent',
      title: 'Recently opened',
      description: 'Reopen acts you viewed most recently',
      icon: 'time' as const,
      onPress: () => navigation.navigate('RecentItems'),
    },
    {
      key: 'chat',
      title: 'AI Legal Assistant',
      description: "Ask questions about Guyana's laws and get instant answers",
      icon: 'chatbubbles' as const,
      onPress: () => navigation.navigate('Chat'),
    },
    {
      key: 'feedback',
      title: 'Send Feedback',
      description: 'Tell us what to improve or request new features',
      icon: 'chatbox-ellipses' as const,
      onPress: () => navigation.navigate('Feedback'),
    },
  ], [handleBrowseConstitution, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.mainContent}>
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

        {pinnedItems.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={toggleQuickAccessCollapsed}
              activeOpacity={0.7}
            >
              <Ionicons name="pin" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8, marginBottom: 0, flex: 1 }]}>
                Quick Access ({pinnedItems.length})
              </Text>
              <Ionicons
                name={isQuickAccessCollapsed ? 'chevron-down' : 'chevron-up'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {!isQuickAccessCollapsed && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pinnedContainer}
              >
                {pinnedItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
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
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Options
          </Text>

          <View style={styles.optionsGrid}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.optionTile, { backgroundColor: colors.surface }]}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={option.icon} size={26} color={colors.primary} />
                </View>
                <Text style={[styles.optionTitle, { color: colors.text }]} numberOfLines={2}>
                  {option.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.disclaimerSection}>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: 'bold' }}>Disclaimer:</Text> This app is for informational purposes only and does not constitute official legal advice. Law Pal 🇬🇾 is not affiliated with the Government of Guyana. Always verify with official gazetted documents and consult a legal professional for serious matters.
          </Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
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
    paddingBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  optionTile: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  disclaimerSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
