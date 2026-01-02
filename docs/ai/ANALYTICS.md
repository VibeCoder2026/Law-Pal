# Analytics & Error Tracking

This app includes basic event tracking and error monitoring that logs to the console. It can easily be upgraded to use professional services like Sentry, Firebase Analytics, or Mixpanel.

## Current Implementation

All analytics are handled through the `Analytics` service (`src/services/analytics.ts`).

### Events Being Tracked

1. **open_article** - When a user opens an article
   - Properties: `article_number`, `source` (library/search/jump/bookmark)

2. **search_query** - When a user performs a search
   - Properties: `query`, `result_count`

3. **jump_to_article** - When a user uses "Jump to Article"
   - Properties: `article_number`, `success`

4. **bookmark_add / bookmark_remove** - When a user adds/removes bookmarks
   - Properties: `article_number`

5. **share_excerpt** - When a user shares an article
   - Properties: `article_number`, `method` (share/copy)

6. **screen_view** - Screen navigation events
   - Properties: `screen_name`

7. **session_start** - When the app starts

### Error Tracking

- **Global error handler** - Catches all uncaught JavaScript errors
- **Unhandled promise rejections** - Catches async errors
- **Component-level errors** - Errors in specific screens/actions
- **Fatal crashes** - Tracks app crashes with full stack traces

## Current Output

All events currently log to the console with this format:

```
[Analytics] 📊 open_article {
  timestamp: "2025-01-15T10:30:45.123Z",
  sessionDuration: 45,
  article_number: "146",
  source: "library"
}
```

Errors log with:

```
[Analytics] ❌ ERROR {
  timestamp: "2025-01-15T10:30:45.123Z",
  message: "Article not found",
  stack: "...",
  component: "ReaderScreen",
  action: "loadSection",
  metadata: { chunk_id: "sec-123" }
}
```

## Upgrading to Sentry

### 1. Install Sentry

```bash
npx expo install @sentry/react-native
```

### 2. Initialize Sentry in App.tsx

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  enableInExpoDevelopment: false,
  debug: __DEV__,
});
```

### 3. Update Analytics Service

In `src/services/analytics.ts`, add Sentry integration:

```typescript
import * as Sentry from '@sentry/react-native';

class AnalyticsService {
  trackError(error: Error | unknown, context?: ErrorContext): void {
    // ... existing console.error ...

    // Send to Sentry
    Sentry.captureException(error, {
      contexts: { custom: context },
    });
  }

  trackCrash(error: Error, isFatal: boolean = true): void {
    // ... existing console.error ...

    // Send to Sentry
    Sentry.captureException(error, {
      level: 'fatal',
      tags: { isFatal: isFatal.toString() },
    });
  }
}
```

### 4. Add Breadcrumbs

```typescript
trackEvent(eventName: string, properties?: EventProperties): void {
  // ... existing code ...

  // Add Sentry breadcrumb
  Sentry.addBreadcrumb({
    category: 'analytics',
    message: eventName,
    data: properties,
    level: 'info',
  });
}
```

## Upgrading to Firebase Analytics

### 1. Install Firebase

```bash
npx expo install @react-native-firebase/app @react-native-firebase/analytics
```

### 2. Configure Firebase

Follow the [Firebase setup guide](https://rnfirebase.io/) for Expo.

### 3. Update Analytics Service

```typescript
import analytics from '@react-native-firebase/analytics';

class AnalyticsService {
  async trackEvent(eventName: string, properties?: EventProperties): Promise<void> {
    // ... existing console.log ...

    // Send to Firebase
    await analytics().logEvent(eventName, properties);
  }

  async setUserProperty(property: string, value: string | number | boolean): Promise<void> {
    // ... existing code ...

    await analytics().setUserProperty(property, String(value));
  }
}
```

## Upgrading to Mixpanel

### 1. Install Mixpanel

```bash
npm install mixpanel-react-native
```

### 2. Initialize Mixpanel

```typescript
import { Mixpanel } from 'mixpanel-react-native';

const mixpanel = new Mixpanel('YOUR_PROJECT_TOKEN');
await mixpanel.init();
```

### 3. Update Analytics Service

```typescript
class AnalyticsService {
  private mixpanel?: Mixpanel;

  async init(token: string): Promise<void> {
    this.mixpanel = new Mixpanel(token);
    await this.mixpanel.init();
  }

  trackEvent(eventName: string, properties?: EventProperties): void {
    // ... existing console.log ...

    // Send to Mixpanel
    this.mixpanel?.track(eventName, properties);
  }
}
```

## Privacy Considerations

Before deploying analytics to production:

1. **Add Privacy Policy** - Disclose what data you collect
2. **Add Opt-Out** - Allow users to disable analytics
3. **Anonymize Data** - Don't track PII (personally identifiable information)
4. **GDPR Compliance** - If serving EU users, ensure compliance

### Example Opt-Out

```typescript
// In user settings
const toggleAnalytics = (enabled: boolean) => {
  Analytics.setEnabled(enabled);
  await AsyncStorage.setItem('analytics_enabled', enabled.toString());
};
```

## Testing Analytics

To verify events are being tracked:

1. **Development**: Check console logs for `[Analytics]` messages
2. **Production**: Use Sentry/Firebase debug mode
3. **Testing**: Write unit tests that mock the Analytics service

## Recommended Services by Use Case

- **Error Tracking**: [Sentry](https://sentry.io/) - Best for crash reporting and error monitoring
- **User Analytics**: [Mixpanel](https://mixpanel.com/) or [Amplitude](https://amplitude.com/) - Best for user behavior analysis
- **General Purpose**: [Firebase Analytics](https://firebase.google.com/products/analytics) - Free, integrates well with other Firebase services
- **Combined**: Use Sentry for errors + Firebase/Mixpanel for analytics

## Performance Tracking

The analytics service includes performance tracking:

```typescript
const startTime = Date.now();
// ... do something ...
const duration = Date.now() - startTime;

Analytics.trackPerformance('database_query', duration, {
  query_type: 'search',
});
```

This can be upgraded to use:
- Firebase Performance Monitoring
- Sentry Performance Monitoring
- Custom APM solutions



