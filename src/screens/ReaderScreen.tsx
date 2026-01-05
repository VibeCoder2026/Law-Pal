import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Share,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList, ConstitutionSection, LegalDocument } from '../types';
import DatabaseService from '../db/database';
import { DOC_ID, CONSTITUTION_PDF_PATH } from '../constants';
import constitutionData from '../assets/constitution.json';
import constitutionPageIndex from '../assets/constitution-page-index.json';
import Analytics from '../services/analytics';
import { addRecentItem } from '../utils/recentItems';
import { getActMetadataById, getActPdfPath } from '../utils/actsMetadata';

type ReaderRouteProp = RouteProp<RootStackParamList, 'Reader'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ReaderScreen() {
  const route = useRoute<ReaderRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDarkMode, fontSize, increaseFontSize, decreaseFontSize, toggleDarkMode } =
    useTheme();

  const [section, setSection] = useState<ConstitutionSection | null>(null);
  const [documentInfo, setDocumentInfo] = useState<LegalDocument | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const docId = useMemo(
    () => route.params?.doc_id || section?.doc_id || DOC_ID,
    [route.params?.doc_id, section?.doc_id]
  );
  const isAct = useMemo(
    () => docId.startsWith('act-') || documentInfo?.doc_type === 'act',
    [docId, documentInfo?.doc_type]
  );

  useEffect(() => {
    loadSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params.chunk_id, route.params.doc_id]);

  useEffect(() => {
    checkBookmark();
    checkPinned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params.chunk_id, docId]);

  const loadSection = async () => {
    const chunkId = route.params?.chunk_id;
    if (!chunkId) return;

    try {
      console.log('[ReaderScreen] Loading section:', chunkId);

      // Try database first
      let data = await DatabaseService.getSectionByChunkId(chunkId);
      console.log('[ReaderScreen] Database result:', data ? 'Found' : 'Not found');

      // Fallback to JSON if not in database
      if (!data) {
        console.log('[ReaderScreen] Falling back to JSON data');
        const sections = constitutionData.sections as ConstitutionSection[];
        data = sections.find(s => s.chunk_id === chunkId) || null;
        if (data) {
          data.doc_id = DOC_ID;
        }
        console.log('[ReaderScreen] JSON result:', data ? 'Found' : 'Not found');
      }

      if (!data) {
        console.error('[ReaderScreen] Section not found:', chunkId);
        Analytics.trackError(new Error('Article not found'), {
          component: 'ReaderScreen',
          action: 'loadSection',
          metadata: { chunk_id: chunkId },
        });
      } else {
        // Track article opened
        Analytics.trackOpenArticle(data.section_number, 'library');
        await addRecentItem({
          id: `${data.doc_id || DOC_ID}:${data.chunk_id}`,
          item_type: data.doc_id?.startsWith('act-') ? 'act' : 'constitution',
          doc_id: data.doc_id || DOC_ID,
          chunk_id: data.chunk_id,
          title: `${data.doc_id?.startsWith('act-') ? 'Section' : 'Article'} ${data.section_number}`,
          subtitle: data.heading || undefined,
          timestamp: Date.now(),
        });
      }

      setSection(data);

      const docIdForSection = data?.doc_id || route.params?.doc_id || DOC_ID;
      if (docIdForSection.startsWith('act-')) {
        const docInfo = await DatabaseService.getDocumentById(docIdForSection).catch(() => null);
        setDocumentInfo(docInfo);
      } else {
        setDocumentInfo(null);
      }
    } catch (error: unknown) {
      console.error('[ReaderScreen] Error loading section:', error);
      if (error instanceof Error) {
        console.error('[ReaderScreen] Error stack:', error.stack);
        Analytics.trackError(error, {
          component: 'ReaderScreen',
          action: 'loadSection',
          metadata: { chunk_id: chunkId },
        });
      }
    }
  };

  const checkBookmark = async () => {
    const chunkId = route.params?.chunk_id;
    if (!chunkId) return;
    if (docId.startsWith('act-')) {
      setIsBookmarked(false);
      return;
    }
    const bookmarked = await DatabaseService.isBookmarked(chunkId);
    setIsBookmarked(bookmarked);
  };

  const checkPinned = async () => {
    const chunkId = route.params?.chunk_id;
    if (!chunkId) return;
    if (docId.startsWith('act-')) {
      setIsPinned(false);
      return;
    }
    const pinned = await DatabaseService.isPinned(docId, chunkId);
    setIsPinned(pinned);
  };

  const toggleBookmark = async () => {
    const chunkId = route.params?.chunk_id;
    if (!chunkId) return;
    if (docId.startsWith('act-')) return;

    if (isBookmarked) {
      await DatabaseService.removeBookmark(DOC_ID, chunkId);
      setIsBookmarked(false);
      if (section) {
        Analytics.trackBookmark('remove', section.section_number);
      }
    } else if (section) {
      await DatabaseService.addBookmark(DOC_ID, chunkId);
      setIsBookmarked(true);
      Analytics.trackBookmark('add', section.section_number);
    }
  };

  const togglePin = async () => {
    const chunkId = route.params?.chunk_id;
    if (!chunkId || !section) return;
    if (docId.startsWith('act-')) return;

    if (isPinned) {
      await DatabaseService.removePinnedItem(docId, chunkId);
      setIsPinned(false);
    } else {
      await DatabaseService.addPinnedItem(
        docId,
        chunkId,
        'constitution',
        `Article ${section.section_number}`,
        section.heading || undefined
      );
      setIsPinned(true);
    }
  };

  const handleViewPDF = async () => {
    if (!section) return;

    if (!docId.startsWith('act-')) {
      const pageMap =
        (constitutionPageIndex as { sections?: Record<string, number> }).sections ||
        (constitutionPageIndex as Record<string, number>);
      const sectionNumber = section?.section_number?.toUpperCase();
      const mappedPage =
        sectionNumber && pageMap ? Number(pageMap[sectionNumber]) : undefined;
      const initialPage = mappedPage && mappedPage > 0 ? mappedPage : undefined;

      navigation.navigate('ActPdfViewer', {
        actTitle: 'Constitution of the Co-operative Republic of Guyana',
        pdfFilename: CONSTITUTION_PDF_PATH,
        initialPage,
      });
      return;
    }

    const docInfo =
      documentInfo || (await DatabaseService.getDocumentById(docId).catch(() => null));
    const pdfPath =
      docInfo?.category && docInfo?.pdf_filename
        ? `${docInfo.category}/${docInfo.pdf_filename}`
        : getActPdfPath(docId);

    if (!pdfPath) {
      Alert.alert('PDF Unavailable', 'This Act does not have a PDF available yet.');
      return;
    }

    const initialPage = await DatabaseService.getActPageHint(
      docId,
      section.chunk_id,
      section.text
    );
    const actTitle =
      docInfo?.title || getActMetadataById(docId)?.title || 'Act';

    navigation.navigate('ActPdfViewer', {
      actTitle,
      pdfFilename: pdfPath,
      initialPage,
    });
  };

  const handleShare = async () => {
    if (!section) return;

    const docTitle = isAct
      ? documentInfo?.title || getActMetadataById(docId)?.title || 'Act'
      : 'Constitution of Guyana';
    const label = isAct ? 'Section' : 'Article';
    const shareContent = `${docTitle} - ${label} ${section.section_number}\n\n${
      section.heading ? section.heading + '\n\n' : ''
    }${section.text}`;

    try {
      await Share.share({
        message: shareContent,
        title: `Constitution of Guyana — Article ${section.section_number}`,
      });
      Analytics.trackShare(section.section_number, 'share');
    } catch (error: unknown) {
      console.error('[ReaderScreen] Error sharing:', error);
      Analytics.trackError(error instanceof Error ? error : new Error(String(error)), {
        component: 'ReaderScreen',
        action: 'handleShare',
        metadata: { article_number: section.section_number },
      });
      Alert.alert('Error', 'Failed to share article');
    }
  };

  if (!section) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {!isAct && (
            <TouchableOpacity onPress={togglePin} style={styles.iconButton}>
              <Ionicons
                name={isPinned ? 'pin' : 'pin-outline'}
                size={24}
                color={isPinned ? colors.accent : colors.text}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleViewPDF} style={styles.iconButton}>
            <Ionicons name="document-text-outline" size={24} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>

          {!isAct && (
            <TouchableOpacity onPress={toggleBookmark} style={styles.iconButton}>
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setShowControls(!showControls)}
            style={styles.iconButton}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {showControls && (
        <View style={[styles.controlsPanel, { backgroundColor: colors.surface }]}>
          <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: colors.text }]}>Font Size</Text>
            <View style={styles.controlButtons}>
              <TouchableOpacity
                onPress={decreaseFontSize}
                style={[styles.controlButton, { backgroundColor: colors.background }]}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.fontSizeValue, { color: colors.text }]}>
                {fontSize}
              </Text>
              <TouchableOpacity
                onPress={increaseFontSize}
                style={[styles.controlButton, { backgroundColor: colors.background }]}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: colors.text }]}>Dark Mode</Text>
            <TouchableOpacity
              onPress={toggleDarkMode}
              style={[
                styles.toggleButton,
                { backgroundColor: isDarkMode ? colors.primary : colors.background },
              ]}
            >
              <View
                style={[
                  styles.toggleCircle,
                  { backgroundColor: colors.surface },
                  isDarkMode && styles.toggleCircleActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          {isAct && (
            <Text style={[styles.docTitle, { color: colors.textSecondary }]}>
              {documentInfo?.title || getActMetadataById(docId)?.title || 'Act'}
            </Text>
          )}
          <Text style={[styles.sectionNumber, { color: colors.accent }]}>
            {isAct ? 'Section' : 'Article'} {section.section_number}
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {section.heading || `${isAct ? 'Section' : 'Article'} ${section.section_number}`}
          </Text>
        </View>

        <Text
          style={[
            styles.sectionContent,
            { color: colors.text, fontSize, lineHeight: fontSize * 1.6 },
          ]}
        >
          {section.text}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  controlsPanel: {
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  toggleButton: {
    width: 56,
    height: 32,
    borderRadius: 16,
    padding: 2,
    justifyContent: 'center',
  },
  toggleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  docTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sectionNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  sectionContent: {
    lineHeight: 28,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 18,
  },
});
