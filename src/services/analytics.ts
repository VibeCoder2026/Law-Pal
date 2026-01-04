/**
 * Analytics Service
 *
 * Simple event tracking that logs to console for now.
 * Can be upgraded to Sentry, Firebase Analytics, or other services.
 *
 * Usage:
 *   Analytics.trackEvent('open_article', { article_number: '146' });
 *   Analytics.trackError(error, 'Failed to load article');
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG, STORAGE_KEYS } from '../constants';

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

interface ErrorContext {
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface AnalyticsEvent {
  name: string;
  timestamp: string;
  sessionDuration: number;
  properties?: EventProperties;
}

class AnalyticsService {
  private enabled: boolean = true;
  private sessionStartTime: number = Date.now();

  private async enqueueEvent(event: AnalyticsEvent): Promise<void> {
    if (!APP_CONFIG.ANALYTICS.STORE_LOCALLY) return;

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ANALYTICS_QUEUE);
      const queue = raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
      const nextQueue = [event, ...queue].slice(0, APP_CONFIG.ANALYTICS.MAX_QUEUE);
      await AsyncStorage.setItem(STORAGE_KEYS.ANALYTICS_QUEUE, JSON.stringify(nextQueue));
    } catch (error) {
      console.error('[Analytics] Failed to enqueue event', error);
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, properties?: EventProperties): void {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);

    console.log(`[Analytics] 📊 ${eventName}`, {
      timestamp,
      sessionDuration,
      ...properties,
    });

    void this.enqueueEvent({
      name: eventName,
      timestamp,
      sessionDuration,
      properties,
    });

    // TODO: Send to analytics service (Firebase, Mixpanel, etc.)
    // Example:
    // await analytics().logEvent(eventName, properties);
  }

  /**
   * Track article opened
   */
  trackOpenArticle(articleNumber: string, source: 'library' | 'search' | 'jump' | 'bookmark'): void {
    this.trackEvent('open_article', {
      article_number: articleNumber,
      source,
    });
  }

  /**
   * Track search query
   */
  trackSearch(query: string, resultCount: number): void {
    this.trackEvent('search_query', {
      query,
      result_count: resultCount,
    });
  }

  /**
   * Track jump to article
   */
  trackJumpToArticle(articleNumber: string, success: boolean): void {
    this.trackEvent('jump_to_article', {
      article_number: articleNumber,
      success,
    });
  }

  /**
   * Track bookmark action
   */
  trackBookmark(action: 'add' | 'remove', articleNumber: string): void {
    this.trackEvent(`bookmark_${action}`, {
      article_number: articleNumber,
    });
  }

  /**
   * Track share action
   */
  trackShare(articleNumber: string, method: 'share' | 'copy'): void {
    this.trackEvent('share_excerpt', {
      article_number: articleNumber,
      method,
    });
  }

  /**
   * Track screen view
   */
  trackScreenView(screenName: string): void {
    this.trackEvent('screen_view', {
      screen_name: screenName,
    });
  }

  /**
   * Track navigation
   */
  trackNavigation(from: string, to: string, params?: Record<string, any>): void {
    this.trackEvent('navigation', {
      from,
      to,
      ...params,
    });
  }

  /**
   * Track error with context
   */
  trackError(error: Error | unknown, context?: ErrorContext): void {
    const timestamp = new Date().toISOString();

    const errorInfo = {
      timestamp,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      component: context?.component,
      action: context?.action,
      metadata: context?.metadata,
    };

    console.error(`[Analytics] ❌ ERROR`, errorInfo);

    void this.enqueueEvent({
      name: 'error',
      timestamp,
      sessionDuration: Math.floor((Date.now() - this.sessionStartTime) / 1000),
      properties: {
        message: errorInfo.message,
        component: context?.component,
        action: context?.action,
      },
    });

    // TODO: Send to error tracking service (Sentry, Bugsnag, etc.)
    // Example:
    // Sentry.captureException(error, {
    //   contexts: { custom: context },
    // });
  }

  /**
   * Track app crash
   */
  trackCrash(error: Error, isFatal: boolean = true): void {
    console.error(`[Analytics] 💥 CRASH (fatal: ${isFatal})`, {
      message: error.message,
      stack: error.stack,
    });

    void this.enqueueEvent({
      name: 'crash',
      timestamp: new Date().toISOString(),
      sessionDuration: Math.floor((Date.now() - this.sessionStartTime) / 1000),
      properties: {
        message: error.message,
        fatal: isFatal,
      },
    });

    // TODO: Send to crash reporting service
    // Example:
    // crashlytics().recordError(error);
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: string, duration: number, metadata?: Record<string, any>): void {
    this.trackEvent('performance', {
      metric,
      duration_ms: duration,
      ...metadata,
    });
  }

  /**
   * Set user properties (for analytics segmentation)
   */
  setUserProperty(property: string, value: string | number | boolean): void {
    console.log(`[Analytics] 👤 User Property: ${property} = ${value}`);

    // TODO: Set user property in analytics service
    // Example:
    // await analytics().setUserProperty(property, value);
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`[Analytics] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Reset session (e.g., on app restart)
   */
  resetSession(): void {
    this.sessionStartTime = Date.now();
    this.trackEvent('session_start');
  }
}

// Export singleton instance
export default new AnalyticsService();
