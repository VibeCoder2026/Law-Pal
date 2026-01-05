import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../types';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import pdfUrlData from '../assets/acts-pdf-urls.json';
import { addRecentItem, getActLastPage, setActReadingProgress } from '../utils/recentItems';
import { APP_CONFIG } from '../constants';

// Dynamic import for react-native-pdf (only works in custom dev client)
let Pdf: any = null;
try {
  Pdf = require('react-native-pdf').default;
} catch (e) {
  console.log('[ActPdfViewer] react-native-pdf not available - using placeholder mode');
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteParams = RouteProp<RootStackParamList, 'ActPdfViewer'>;

const { width, height } = Dimensions.get('window');

export default function ActPdfViewerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { colors, isDarkMode } = useTheme();
  const { actTitle, pdfFilename, initialPage } = route.params;

  const requestedPage =
    typeof initialPage === 'number' && initialPage > 0 ? initialPage : null;
  const [currentPage, setCurrentPage] = useState(requestedPage || 1);
  const [pdfPage, setPdfPage] = useState(requestedPage || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingToDevice, setIsSavingToDevice] = useState(false);
  const lastSavedPageRef = useRef<number | null>(null);

  // Check if PDF viewer is available
  const isPdfAvailable = Pdf !== null;
  const pdfUrlMap = (pdfUrlData as any).urls || (pdfUrlData as any);
  const pdfKey = pdfFilename;

  useEffect(() => {
    let isActive = true;

    const preparePdf = async () => {
      setError(null);
      setLoading(true);
      setDownloadProgress(0);

      const storedPage = requestedPage ? null : await getActLastPage(pdfKey);
      const startPage = requestedPage || storedPage || 1;

      if (!isActive) return;

      lastSavedPageRef.current = startPage;
      setCurrentPage(startPage);
      setPdfPage(startPage);
      await loadPdfAsset();
    };

    preparePdf();

    return () => {
      isActive = false;
    };
  }, [pdfFilename, pdfKey, requestedPage]);

  const loadPdfAsset = async () => {
    try {
      console.log('[ActPdfViewer] Loading PDF:', pdfFilename);
      await addRecentItem({
        id: `act:${pdfKey}`,
        item_type: 'act',
        doc_id: pdfKey,
        chunk_id: pdfKey,
        title: actTitle,
        subtitle: 'Act PDF',
        timestamp: Date.now(),
      });

      const localPath = `${FileSystem.documentDirectory}pdfs/${pdfKey}`;
      const info = await FileSystem.getInfoAsync(localPath);

      if (info.exists) {
        console.log('[ActPdfViewer] Using cached PDF:', localPath);
        setPdfUri(localPath);
        setLoading(true);
        return;
      }

      const url = pdfUrlMap[pdfKey];
      if (!url) {
        setError('PDF is not available for download yet.');
        setLoading(false);
        return;
      }

      setDownloadUrl(url);
      setPdfUri(null);
      setLoading(false);
    } catch (err) {
      console.error('[ActPdfViewer] Error loading PDF asset:', err);
      setError('Could not locate PDF file');
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadUrl) {
      Alert.alert('Download Unavailable', 'No download link is available for this PDF.');
      return;
    }

    try {
      const localPath = `${FileSystem.documentDirectory}pdfs/${pdfKey}`;
      const dirPath = localPath.substring(0, localPath.lastIndexOf('/'));
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });

      setIsDownloading(true);
      setDownloadProgress(0);

      const maxAttempts = Math.max(1, APP_CONFIG.DOWNLOAD.MAX_RETRIES);
      let attempt = 0;
      let downloadedUri: string | null = null;
      let lastError: unknown = null;

      while (attempt < maxAttempts && !downloadedUri) {
        attempt += 1;
        try {
          const downloadResumable = FileSystem.createDownloadResumable(
            downloadUrl,
            localPath,
            {},
            (progress) => {
              if (progress.totalBytesExpectedToWrite > 0) {
                setDownloadProgress(
                  progress.totalBytesWritten / progress.totalBytesExpectedToWrite
                );
              }
            }
          );

          const result = await downloadResumable.downloadAsync();
          if (result?.uri) {
            downloadedUri = result.uri;
            break;
          }
          throw new Error('Download did not return a file');
        } catch (error) {
          lastError = error;
          if (attempt < maxAttempts) {
            setDownloadProgress(0);
            const delayMs = APP_CONFIG.DOWNLOAD.RETRY_BASE_MS * attempt;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      if (downloadedUri) {
        setPdfUri(downloadedUri);
        setLoading(true);
      } else {
        throw lastError || new Error('Download failed');
      }
    } catch (downloadError) {
      console.error('[ActPdfViewer] Download failed:', downloadError);
      setError('Download failed. Check your connection and try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenInBrowser = async () => {
    if (!downloadUrl) {
      Alert.alert('Link Unavailable', 'No link is available for this PDF.');
      return;
    }

    try {
      await Linking.openURL(downloadUrl);
    } catch (linkError) {
      Alert.alert('Open Failed', 'Unable to open the link.');
    }
  };

  const handleSaveToDevice = async () => {
    if (!pdfUri) {
      Alert.alert('PDF Not Available', 'Download the PDF first before saving to device.');
      return;
    }

    setIsSavingToDevice(true);

    try {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Not Supported', 'Saving files is not supported on this device.');
        return;
      }

      // Extract filename from pdfKey (e.g., "criminal-law/Act_123.pdf" -> "Act_123.pdf")
      const filename = pdfKey.split('/').pop() || 'document.pdf';

      // Use expo-sharing to let user save to their preferred location
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Save ${filename}`,
        UTI: 'com.adobe.pdf',
      });

      Alert.alert(
        'Save Complete',
        'Use the share menu to save to Downloads, Files, or any other app.'
      );
    } catch (saveError) {
      console.error('[ActPdfViewer] Save to device failed:', saveError);
      Alert.alert('Save Failed', 'Unable to save the file. Please try again.');
    } finally {
      setIsSavingToDevice(false);
    }
  };

  const pdfSource = pdfUri ? { uri: pdfUri, cache: false } : null;

  console.log('[ActPdfViewer] PDF available:', isPdfAvailable);
  console.log('[ActPdfViewer] PDF source:', pdfSource);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {actTitle}
          </Text>
          {totalPages > 0 && (
            <Text style={[styles.pageInfo, { color: colors.textSecondary }]}>
              Page {currentPage} of {totalPages}
            </Text>
          )}
        </View>
        {pdfUri && (
          <TouchableOpacity
            onPress={handleSaveToDevice}
            style={styles.saveButton}
            disabled={isSavingToDevice}
          >
            {isSavingToDevice ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="share-outline" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* PDF Viewer or Placeholder */}
      {!isPdfAvailable ? (
        // Placeholder when react-native-pdf is not available (Expo Go mode)
        <View style={styles.placeholderContainer}>
          <Ionicons name="document-text" size={80} color={colors.primary} style={styles.icon} />
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>
            PDF Viewer Requires Custom Build
          </Text>
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            To view PDFs, you need to build a custom development client:
          </Text>
          <View style={[styles.commandBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.commandText, { color: colors.primary }]}>
              npx expo run:android
            </Text>
          </View>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            This will compile the app with native PDF viewing support.
          </Text>
          <View style={styles.details}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              PDF Document:
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {pdfFilename}
            </Text>
          </View>
        </View>
      ) : !pdfSource ? (
        <View style={styles.downloadContainer}>
          <Ionicons
            name={error ? 'alert-circle-outline' : 'cloud-download-outline'}
            size={72}
            color={error ? colors.error : colors.primary}
          />
          <Text style={[styles.placeholderTitle, { color: error ? colors.error : colors.text }]}>
            {error || 'Download PDF for Offline Use'}
          </Text>
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            {error
              ? 'Check your connection or try again.'
              : 'This document isn’t saved on your device yet.'}
          </Text>

          {isDownloading ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Downloading... {Math.round(downloadProgress * 100)}%
              </Text>
            </View>
          ) : downloadUrl ? (
            <View style={styles.downloadActions}>
              <TouchableOpacity
                style={[styles.downloadButton, { backgroundColor: colors.primary }]}
                onPress={handleDownload}
              >
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={styles.downloadButtonText}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleOpenInBrowser}
              >
                <Ionicons name="globe-outline" size={18} color={colors.text} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Open in Browser
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              No download link is available for this document.
            </Text>
          )}
        </View>
      ) : (
        <>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading PDF...
              </Text>
            </View>
          )}
          <Pdf
            source={pdfSource!}
            page={pdfPage}
            onLoadComplete={(numberOfPages: number) => {
              console.log('[ActPdfViewer] PDF loaded:', numberOfPages, 'pages');
              setTotalPages(numberOfPages);
              const safePage = pdfPage > numberOfPages ? 1 : pdfPage;
              if (safePage !== pdfPage) {
                setPdfPage(safePage);
                setCurrentPage(safePage);
              }
              setActReadingProgress(pdfKey, safePage);
              setLoading(false);
            }}
            onPageChanged={(page: number, numberOfPages: number) => {
              console.log('[ActPdfViewer] Page changed:', page, '/', numberOfPages);
              setCurrentPage(page);
              setPdfPage(page);
              if (lastSavedPageRef.current !== page) {
                lastSavedPageRef.current = page;
                setActReadingProgress(pdfKey, page);
              }
            }}
            onError={(error: any) => {
              console.error('[ActPdfViewer] PDF error:', error);
              setError('Failed to load PDF. Make sure PDFs are accessible.');
              setLoading(false);
            }}
            onLoadProgress={(percent: number) => {
              console.log('[ActPdfViewer] Loading progress:', Math.round(percent * 100) + '%');
            }}
            style={styles.pdf}
            trustAllCerts={false}
            enablePaging={true}
            spacing={10}
            fitPolicy={0}
          />
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
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  saveButton: {
    padding: 8,
    marginLeft: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  pageInfo: {
    fontSize: 12,
    marginTop: 4,
  },
  pdf: {
    flex: 1,
    width: width,
    height: height,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  downloadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  icon: {
    marginBottom: 24,
    opacity: 0.8,
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  commandBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  commandText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  details: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  downloadActions: {
    marginTop: 20,
    width: '100%',
    gap: 12,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
