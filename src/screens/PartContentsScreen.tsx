import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import {
  RootStackParamList,
  ConstitutionPart,
  ConstitutionChapter,
  ConstitutionTitle,
  ConstitutionSubtitle,
  ArticleGroup,
  ConstitutionSection,
} from '../types';
import constitutionStructure from '../assets/constitution-structure.json';
import constitutionData from '../assets/constitution.json';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'PartContents'>;
type RouteParams = RouteProp<RootStackParamList, 'PartContents'>;

type ContentItem = ConstitutionChapter | ConstitutionTitle | ConstitutionSubtitle;

export default function PartContentsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { colors } = useTheme();
  const { part, title } = route.params;

  const [contents, setContents] = useState<ContentItem[]>([]);
  const [contentType, setContentType] = useState<'chapters' | 'titles'>('chapters');

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = () => {
    // If viewing a title with chapters (e.g., Title 7 Service Commissions)
    if (title && title.chapters && title.chapters.length > 0) {
      const chapters = constitutionStructure.chapters.filter((ch) =>
        title.chapters?.includes(ch.id)
      );
      setContents(chapters as ContentItem[]);
      setContentType('chapters');
      return;
    }

    // If viewing a part
    if (part) {
      if (part.chapters && part.chapters.length > 0) {
        // Load chapters (Part 1)
        const chapters = constitutionStructure.chapters.filter((ch) =>
          part.chapters?.includes(ch.id)
        );
        setContents(chapters as ContentItem[]);
        setContentType('chapters');
      } else if (part.titles && part.titles.length > 0) {
        // Load titles (Part 2) - only expand subtitles, NOT chapters
        const allContents: ContentItem[] = [];

        constitutionStructure.titles
          .filter((t) => part.titles?.includes(t.id))
          .forEach((t) => {
            if (t.subtitles && t.subtitles.length > 0) {
              // Title has subtitles - add the subtitles instead of the title
              const subtitles = constitutionStructure.subtitles.filter((sub) =>
                t.subtitles?.includes(sub.id)
              );
              allContents.push(...(subtitles as ContentItem[]));
            } else {
              // Add the title itself (whether it has chapters or not)
              allContents.push(t as ContentItem);
            }
          });

        setContents(allContents);
        setContentType('titles');
      }
    }
  };

  const handleContentPress = (item: ContentItem) => {
    try {
      console.log('[PartContentsScreen] Handling content press:', item.title);

      // Check if this is a title with chapters (like Title 7)
      const isTitle = 'titleNumber' in item;
      if (isTitle) {
        const titleItem = item as ConstitutionTitle;
        if (titleItem.chapters && titleItem.chapters.length > 0) {
          // Navigate to another PartContents screen showing the chapters
          console.log('[PartContentsScreen] Title has chapters, navigating to show them');
          navigation.push('PartContents', { title: titleItem });
          return;
        }
      }

      // Otherwise, show articles for this chapter/title/subtitle
      console.log('[PartContentsScreen] Article range:', item.articleStart, '-', item.articleEnd);

      // Get all article chunk_ids in this range
      const sections = constitutionData.sections as ConstitutionSection[];
      const allArticles: string[] = [];

      for (let i = item.articleStart; i <= item.articleEnd; i++) {
        const articlesForNumber = sections.filter((s) => {
          const num = parseInt(s.section_number);
          return num === i;
        });

        allArticles.push(...articlesForNumber.map((a) => a.chunk_id));
      }

      console.log('[PartContentsScreen] Found articles:', allArticles.length);

      if (allArticles.length === 0) {
        console.warn('[PartContentsScreen] No articles found for range');
        return;
      }

      // Create a single group containing all articles in this range
      const group: ArticleGroup = {
        id: `range-${item.articleStart}-${item.articleEnd}`,
        baseArticle: item.articleStart.toString(),
        title: item.title,
        articles: allArticles,
        articleCount: allArticles.length,
        firstChunkId: allArticles[0],
      };

      console.log('[PartContentsScreen] Navigating to article list with', allArticles.length, 'articles');
      navigation.navigate('ArticleList', { group });
    } catch (error: unknown) {
      console.error('[PartContentsScreen] Error handling content press:', error);
      if (error instanceof Error) {
        console.error('[PartContentsScreen] Error stack:', error.stack);
      }
    }
  };

  const renderContent = ({ item }: { item: ContentItem }) => {
    const isChapter = 'chapterNumber' in item;
    const isSubtitle = 'subtitleNumber' in item;

    let number: string;
    let label: string;

    if (isChapter) {
      number = (item as ConstitutionChapter).chapterNumber;
      label = `Chapter ${number}`;
    } else if (isSubtitle) {
      number = (item as ConstitutionSubtitle).subtitleNumber;
      label = `Subtitle ${number}`;
    } else {
      number = (item as ConstitutionTitle).titleNumber;
      label = `Title ${number}`;
    }

    const articleRange = `Articles ${item.articleStart}-${item.articleEnd}`;

    return (
      <TouchableOpacity
        style={[styles.contentCard, { backgroundColor: colors.surface }]}
        onPress={() => handleContentPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.contentHeader}>
          <View style={[styles.numberBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.numberText, { color: colors.primary }]}>
              {label}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>

        <Text style={[styles.contentTitle, { color: colors.text }]}>
          {item.title}
        </Text>

        <View style={styles.contentFooter}>
          <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.articleRange, { color: colors.textSecondary }]}>
            {articleRange}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.background}
      />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.breadcrumb, { color: colors.textSecondary }]}>
            {title ? `Title ${title.titleNumber}` : `Part ${part?.partNumber}`}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {title ? title.title : part?.title}
          </Text>
        </View>
      </View>

      <FlatList
        data={contents}
        renderItem={renderContent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No {contentType} available
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  breadcrumb: {
    fontSize: 12,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  contentCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  numberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  numberText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    lineHeight: 22,
  },
  contentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  articleRange: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
});
