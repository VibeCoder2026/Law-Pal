import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../types';
import * as FileSystem from 'expo-file-system';

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
  const { actTitle, pdfFilename } = route.params;

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);

  // Check if PDF viewer is available
  const isPdfAvailable = Pdf !== null;

  useEffect(() => {
    setError(null);
    setLoading(true);
    setFallbackAttempted(false);
    loadPdfAsset();
  }, [pdfFilename]);

  const loadPdfAsset = async () => {
    try {
      console.log('[ActPdfViewer] Loading PDF:', pdfFilename);

      // For Android, use the bundle-assets protocol for APK assets
      // PDFs are copied to android/app/src/main/assets during build
      if (Platform.OS === 'android') {
        // react-native-pdf expects bundle-assets:// for APK assets
        const assetPath = `bundle-assets://law_sources/${pdfFilename}`;
        console.log('[ActPdfViewer] Android asset path:', assetPath);
        setPdfUri(assetPath);
      } else {
        // For iOS, use bundle directory
        const bundlePath = `${(FileSystem as any).bundleDirectory}law_sources/${pdfFilename}`;
        console.log('[ActPdfViewer] iOS bundle path:', bundlePath);
        setPdfUri(bundlePath);
      }
    } catch (err) {
      console.error('[ActPdfViewer] Error loading PDF asset:', err);
      setError('Could not locate PDF file');
      setLoading(false);
    }
  };

  // Don't cache since PDFs are already bundled in APK assets
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
      ) : error || !pdfSource ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || 'Failed to load PDF'}
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
            {pdfFilename}
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
            {pdfSource?.uri || 'No PDF source'}
          </Text>
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
            onLoadComplete={(numberOfPages: number) => {
              console.log('[ActPdfViewer] PDF loaded:', numberOfPages, 'pages');
              setTotalPages(numberOfPages);
              setLoading(false);
            }}
            onPageChanged={(page: number, numberOfPages: number) => {
              console.log('[ActPdfViewer] Page changed:', page, '/', numberOfPages);
              setCurrentPage(page);
            }}
            onError={(error: any) => {
              console.error('[ActPdfViewer] PDF error:', error);
              if (Platform.OS === 'android' && !fallbackAttempted) {
                const fallbackPath = `file:///android_asset/law_sources/${pdfFilename}`;
                console.log('[ActPdfViewer] Retrying with android_asset path:', fallbackPath);
                setFallbackAttempted(true);
                setPdfUri(fallbackPath);
                setLoading(true);
                return;
              }
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});