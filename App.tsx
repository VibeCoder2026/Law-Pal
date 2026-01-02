import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import DatabaseService from './src/db/database';
import ActsImportService from './src/services/actsImportService';
import Analytics from './src/services/analytics';
import LoadingScreen from './src/components/LoadingScreen';

// Global error handler with analytics tracking
const errorHandler = (error: Error, isFatal?: boolean) => {
  console.error('=== GLOBAL ERROR ===');
  console.error('Fatal:', isFatal);
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('===================');

  // Track crash in analytics
  if (isFatal) {
    Analytics.trackCrash(error, true);
  } else {
    Analytics.trackError(error, {
      component: 'Global',
      action: 'errorHandler',
      metadata: { isFatal },
    });
  }
};

// Set up global error handlers
if (ErrorUtils) {
  ErrorUtils.setGlobalHandler(errorHandler);
}

// Capture unhandled promise rejections
const originalHandler = global.Promise;
global.Promise = class extends originalHandler<any> {
  constructor(executor: (resolve: (value?: any) => void, reject: (reason?: any) => void) => void) {
    super((resolve: (value?: any) => void, reject: (reason?: any) => void) => {
      return executor(
        resolve,
        (error: Error) => {
          console.error('=== UNHANDLED PROMISE REJECTION ===');
          console.error('Error:', error);
          console.error('Stack:', error.stack);
          console.error('===================================');

          // Track unhandled rejection
          Analytics.trackError(error, {
            component: 'Global',
            action: 'unhandledRejection',
          });

          reject(error);
        }
      );
    });
  }
} as any;

function AppContent() {
  const { colors } = useTheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('[App] Initializing database...');
      await DatabaseService.init();
      console.log('[App] Database initialized successfully');

      // Import Acts if needed (runs in background)
      const needsActsImport = await ActsImportService.needsImport();
      if (needsActsImport) {
        console.log('[App] Acts import needed - starting import...');
        // Run import in background without blocking app startup
        ActsImportService.importActs()
          .then(() => {
            console.log('[App] Acts import completed successfully');
          })
          .catch((error) => {
            console.error('[App] Acts import failed:', error);
            Analytics.trackError(error instanceof Error ? error : new Error(String(error)), {
              component: 'App',
              action: 'importActs',
            });
          });
      } else {
        console.log('[App] Acts already imported');
      }

      // Track session start
      Analytics.resetSession();
      Analytics.setUserProperty('app_version', '1.0.0');

      setIsReady(true);
    } catch (error) {
      console.error('[App] Failed to initialize app:', error);
      console.error('[App] Error details:', JSON.stringify(error, null, 2));

      // Track initialization error
      Analytics.trackError(error instanceof Error ? error : new Error(String(error)), {
        component: 'App',
        action: 'initializeApp',
      });
    }
  };

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});