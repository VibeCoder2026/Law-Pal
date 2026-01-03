import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);

  useEffect(() => {
    loadPinnedItems();
  }, []);

  const loadPinnedItems = async () => {
    try {
      const items = await DatabaseService.getAllPinnedItems();
      setPinnedItems(items);
    } catch (error) {
      console.error('[HomeScreen] Failed to load pinned items:', error);
    }
  };

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

  const handleUnpin = async (item: PinnedItem, event: any) => {
    // Stop propagation to prevent navigation
    event.stopPropagation();

    await DatabaseService.removePinnedItem(item.doc_id, item.chunk_id);
    // Reload pinned items after unpinning
    loadPinnedItems();
  };

  const handleBrowseConstitution = () => {
    navigation.navigate('ActPdfViewer', {
      actTitle: 'Constitution of the Co-operative Republic of Guyana',
      pdfFilename: CONSTITUTION_PDF_PATH,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
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
            <View style={styles.sectionHeader}>
              <Ionicons name="pin" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8, marginBottom: 0 }]}>
                Quick Access
              </Text>
            </View>
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
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Categories
          </Text>

          <TouchableOpacity
            style={[styles.categoryCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Chat')}
            activeOpacity={0.7}
          >
            <View style={styles.categoryHeader}>
              <Ionicons name="chatbubbles" size={28} color={colors.primary} />
              <Text style={[styles.categoryTitle, { color: colors.text }]}>
                AI Legal Assistant
              </Text>
            </View>
            <Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>
              Ask questions about Guyana's laws and get instant answers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryCard, { backgroundColor: colors.surface }]}
            onPress={handleBrowseConstitution}
            activeOpacity={0.7}
          >
            <View style={styles.categoryHeader}>
              <Ionicons name="document-text" size={28} color={colors.primary} />
              <Text style={[styles.categoryTitle, { color: colors.text }]}>
                Browse Constitution
              </Text>
            </View>
            <Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>
              View the complete Constitution PDF document
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('ActsTiers')}
            activeOpacity={0.7}
          >
            <View style={styles.categoryHeader}>
              <Ionicons name="hammer" size={28} color={colors.primary} />
              <Text style={[styles.categoryTitle, { color: colors.text }]}>
                Acts & Statutes
              </Text>
            </View>
            <Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>
              Browse legislative acts and statutory laws
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.categoryCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('Feedback')}
            activeOpacity={0.7}
          >
            <View style={styles.categoryHeader}>
              <Ionicons name="chatbox-ellipses" size={28} color={colors.primary} />
              <Text style={[styles.categoryTitle, { color: colors.text }]}>
                Send Feedback
              </Text>
            </View>
            <Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>
              Tell us what to improve or request new features
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
