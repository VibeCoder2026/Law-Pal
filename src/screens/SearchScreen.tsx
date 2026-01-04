import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList, SearchResult } from '../types';
import DatabaseService from '../db/database';
import Analytics from '../services/analytics';
import { APP_CONFIG } from '../constants';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDarkMode } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);

    if (text.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await DatabaseService.search(text, {
        limit: APP_CONFIG.SEARCH.MAX_RESULTS,
      });
      setResults(searchResults);
      Analytics.trackSearch(text, searchResults.length);
    } catch (error) {
      console.error('[Search] Error searching:', error);
      Analytics.trackError(error instanceof Error ? error : new Error(String(error)), {
        component: 'SearchScreen',
        action: 'handleSearch',
        metadata: { query: text },
      });
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const renderResult = ({ item }: { item: SearchResult }) => {
    const contentPreview = item.text.substring(0, 150) + '...';
    const isAct = item.doc_type === 'act';

    return (
      <TouchableOpacity
        style={[styles.resultItem, { backgroundColor: colors.surface }]}
        onPress={() => navigation.navigate('Reader', { chunk_id: item.chunk_id, doc_id: item.doc_id })}
      >
        <View style={styles.resultHeader}>
          <Ionicons name={isAct ? "hammer" : "document-text"} size={18} color={colors.primary} />
          <View style={styles.titleContainer}>
            <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
              {item.heading || `Section ${item.section_number}`}
            </Text>
            <Text style={[styles.resultDocTitle, { color: colors.primary }]} numberOfLines={1}>
              {item.doc_title}
            </Text>
          </View>
        </View>
        <Text
          style={[styles.resultContent, { color: colors.textSecondary }]}
          numberOfLines={3}
        >
          {contentPreview}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Search</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons
          name="search"
          size={20}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search Guyana laws..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {isSearching ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : query.trim().length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="search-outline"
            size={64}
            color={colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Search for keywords, laws, or regulations
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Try searching for specific acts or legal terms
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="document-text-outline"
            size={64}
            color={colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No results found
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Try different keywords
          </Text>
        </View>
      ) : (
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {results.length} {results.length === 1 ? 'result' : 'results'} found
          </Text>
        </View>
      )}

      {results.length > 0 && (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item.chunk_id}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  centerContainer: {
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  resultItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    marginLeft: 8,
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultDocTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  resultContent: {
    fontSize: 14,
    lineHeight: 20,
  },
});
