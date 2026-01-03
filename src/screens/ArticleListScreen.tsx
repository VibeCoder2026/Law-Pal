import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList, ConstitutionSection } from '../types';
import constitutionData from '../assets/constitution.json';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ArticleList'>;
type ArticleListRouteProp = RouteProp<RootStackParamList, 'ArticleList'>;

export default function ArticleListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ArticleListRouteProp>();
  const { colors, isDarkMode } = useTheme();
  const [articles, setArticles] = useState<ConstitutionSection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { group } = route.params;

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = () => {
    // Load all articles in this group directly from JSON and sort by section number
    const allSections = constitutionData.sections as ConstitutionSection[];
    const groupArticles = allSections.filter(section =>
      group.articles.includes(section.chunk_id)
    );

    // Sort articles by section number (handles 161, 161A, 161B correctly)
    const sorted = groupArticles.sort((a, b) => {
      // Extract base number and suffix
      const matchA = a.section_number.match(/^(\d+)([A-Z]*)$/);
      const matchB = b.section_number.match(/^(\d+)([A-Z]*)$/);

      if (!matchA || !matchB) return 0;

      const numA = parseInt(matchA[1]);
      const numB = parseInt(matchB[1]);

      // First sort by base number
      if (numA !== numB) return numA - numB;

      // If base numbers are equal, sort by suffix (A, B, C, etc.)
      return matchA[2].localeCompare(matchB[2]);
    });

    setArticles(sorted);
  };

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return articles;

    return articles.filter((article) => {
      const numberMatch = article.section_number?.toLowerCase().includes(query);
      const headingMatch = article.heading?.toLowerCase().includes(query);
      const textMatch = article.text?.toLowerCase().includes(query);
      return Boolean(numberMatch || headingMatch || textMatch);
    });
  }, [articles, searchQuery]);

  const renderArticle = ({ item }: { item: ConstitutionSection }) => (
    <TouchableOpacity
      style={[styles.articleItem, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('Reader', { chunk_id: item.chunk_id })}
    >
      <View style={styles.articleNumber}>
        <Text style={[styles.articleNumberText, { color: colors.primary }]}>
          {item.section_number}
        </Text>
      </View>
      <View style={styles.articleContent}>
        <Text style={[styles.articleTitle, { color: colors.text }]}>
          {item.heading || `Article ${item.section_number}`}
        </Text>
        <Text
          style={[styles.articlePreview, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.text}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Article {group.baseArticle}
          </Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {group.title}
          </Text>
        </View>
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
          placeholder="Filter by number or keyword..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredArticles}
        renderItem={renderArticle}
        keyExtractor={(item) => item.chunk_id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={searchQuery.trim() ? 'search-outline' : 'document-outline'}
              size={64}
              color={colors.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery.trim() ? 'No matches found' : 'No articles found'}
            </Text>
            {searchQuery.trim() && (
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Try a different keyword or article number
              </Text>
            )}
          </View>
        }
      />
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
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    marginRight: 16,
    marginTop: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 30,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  articleItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  articleNumber: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  articleNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  articlePreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
