import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList, Bookmark } from '../types';
import DatabaseService from '../db/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function BookmarksScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDarkMode } = useTheme();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadBookmarks();
    }, [])
  );

  const loadBookmarks = async () => {
    try {
      const sections = await DatabaseService.getBookmarkedSections();
      // Convert sections to Bookmark format
      const bookmarkData: Bookmark[] = sections.map((section, index) => ({
        id: section.chunk_id,
        doc_id: 'guyana-constitution',
        chunk_id: section.chunk_id,
        title: section.heading || `Section ${section.section_number}`,
        createdAt: Date.now(), // We don't have actual timestamp, use current time
        note: undefined,
      }));
      setBookmarks(bookmarkData);
    } catch (error) {
      console.error('[Bookmarks] Error loading bookmarks:', error);
      setBookmarks([]);
    }
  };

  const handleRemoveBookmark = async (chunk_id: string) => {
    try {
      await DatabaseService.removeBookmark('guyana-constitution', chunk_id);
      loadBookmarks();
    } catch (error) {
      console.error('[Bookmarks] Error removing bookmark:', error);
    }
  };

  const renderBookmark = ({ item }: { item: Bookmark }) => (
    <View style={[styles.bookmarkItem, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.bookmarkContent}
        onPress={() => navigation.navigate('Reader', { chunk_id: item.chunk_id })}
      >
        <Ionicons
          name="bookmark"
          size={24}
          color={colors.primary}
          style={styles.bookmarkIcon}
        />
        <View style={styles.bookmarkText}>
          <Text style={[styles.bookmarkTitle, { color: colors.text }]}>
            {item.title}
          </Text>
          <Text style={[styles.bookmarkDate, { color: colors.textSecondary }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleRemoveBookmark(item.chunk_id)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={20} color={colors.accent} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Bookmarks</Text>
      </View>

      {bookmarks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="bookmark-outline"
            size={64}
            color={colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No bookmarks yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Bookmark sections to read them later
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          renderItem={renderBookmark}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
  },
  bookmarkItem: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  bookmarkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bookmarkIcon: {
    marginRight: 12,
  },
  bookmarkText: {
    flex: 1,
  },
  bookmarkTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookmarkDate: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 8,
  },
});
