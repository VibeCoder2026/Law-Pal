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

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

interface ErrorContext {
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class AnalyticsService {
  private enabled: boolean = true;
  private sessionStartTime: number = Date.now();

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
