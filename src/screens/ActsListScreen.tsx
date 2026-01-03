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
import { RootStackParamList, LegalDocument } from '../types';
import DatabaseService from '../db/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, 'ActsList'>;

export default function ActsListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { colors, isDarkMode } = useTheme();
  const { tier_id, tier_name } = route.params;

  const [acts, setActs] = useState<LegalDocument[]>([]);
  const [pinnedStatus, setPinnedStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadActs();
  }, [tier_id]);

  const loadActs = async () => {
    try {
      const db = DatabaseService;
      if (!db.db) {
        console.warn('[ActsList] Database not initialized');
        return;
      }

      const actsData = await db.db.getAllAsync<LegalDocument>(
        `SELECT * FROM documents
         WHERE tier_id = ? AND doc_type = 'act'
         ORDER BY title ASC`,
        [tier_id]
      );

      setActs(actsData);

      // Load pinned status for all acts
      const pinnedMap: Record<string, boolean> = {};
      for (const act of actsData) {
        const fullPath = act.category && act.pdf_filename ? `${act.category}/${act.pdf_filename}` : '';
        if (fullPath) {
          const isPinned = await DatabaseService.isPinned(act.doc_id, fullPath);
          pinnedMap[act.doc_id] = isPinned;
        }
      }
      setPinnedStatus(pinnedMap);
    } catch (error) {
      console.error('[ActsList] Error loading acts:', error);
      setActs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleActPress = (act: LegalDocument) => {
    // Navigate to PDF viewer
    if (act.pdf_filename && act.category) {
      // Construct full path: category/filename
      const fullPath = `${act.category}/${act.pdf_filename}`;
      navigation.navigate('ActPdfViewer', {
        actTitle: act.title,
        pdfFilename: fullPath,
      });
    } else {
      console.error('[ActsList] No PDF filename or category for act:', act.doc_id);
    }
  };

  const filteredActs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return acts;

    return acts.filter((act) => {
      const titleMatch = act.title?.toLowerCase().includes(query);
      const chapterMatch = act.chapter_number?.toLowerCase().includes(query);
      return Boolean(titleMatch || chapterMatch);
    });
  }, [acts, searchQuery]);

  const actsCountLabel = searchQuery.trim()
    ? `${filteredActs.length} of ${acts.length} Acts`
    : `${acts.length} Acts`;

  const togglePin = async (act: LegalDocument, event: any) => {
    // Stop propagation to prevent navigation
    event.stopPropagation();

    const fullPath = act.category && act.pdf_filename ? `${act.category}/${act.pdf_filename}` : '';
    if (!fullPath) return;

    const isPinned = pinnedStatus[act.doc_id];

    if (isPinned) {
      await DatabaseService.removePinnedItem(act.doc_id, fullPath);
      setPinnedStatus(prev => ({ ...prev, [act.doc_id]: false }));
    } else {
      await DatabaseService.addPinnedItem(
        act.doc_id,
        fullPath,
        'act',
        act.title,
        `Ch. ${act.chapter_number}`
      );
      setPinnedStatus(prev => ({ ...prev, [act.doc_id]: true }));
    }
  };

  const renderAct = ({ item }: { item: LegalDocument }) => (
    <TouchableOpacity
      style={[styles.actCard, { backgroundColor: colors.surface }]}
      onPress={() => handleActPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.actContent}>
        <Text style={[styles.actChapter, { color: colors.primary }]}>
          Ch. {item.chapter_number}
        </Text>
        <Text style={[styles.actTitle, { color: colors.text }]}>
          {item.title}
        </Text>
      </View>
      <View style={styles.actActions}>
        <TouchableOpacity
          onPress={(e) => togglePin(item, e)}
          style={styles.pinButton}
        >
          <Ionicons
            name={pinnedStatus[item.doc_id] ? 'pin' : 'pin-outline'}
            size={20}
            color={pinnedStatus[item.doc_id] ? colors.accent : colors.textSecondary}
          />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{tier_name}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {actsCountLabel}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Loading Acts...
          </Text>
        </View>
      ) : acts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="document-text-outline"
            size={64}
            color={colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No Acts in this tier
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Ionicons
              name="search"
              size={20}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Filter Acts by title or chapter..."
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
          {filteredActs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="search-outline"
                size={64}
                color={colors.textSecondary}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No matches found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Try a different title or chapter number
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredActs}
              renderItem={renderAct}
              keyExtractor={(item) => item.doc_id}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  listContent: {
    padding: 20,
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
  actCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actContent: {
    flex: 1,
  },
  actChapter: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  actTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  actActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pinButton: {
    padding: 4,
  },
});
