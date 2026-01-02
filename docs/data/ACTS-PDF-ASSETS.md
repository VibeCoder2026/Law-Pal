# PDF Asset Build Fix (Android APK)

## Goal

Ensure PDFs load offline inside the Android APK from:
`law_sources/<category>/<filename>.pdf`

## Root Cause

PDFs were not packaged into the APK assets reliably. Copying into
`android/app/src/main/assets` before `expo prebuild` was ineffective because
prebuild regenerates the Android folder and wipes assets.

## Fix Summary

1) Copy PDFs into Android assets at Gradle build time.
2) Use the correct Android asset URI for `react-native-pdf`.
3) Add a fallback URI if the primary scheme fails.

## Code Changes

### 1) Gradle copy task (runs during build)

Added a config plugin that injects a Gradle task:
`plugins/withLawSourcesAssets.js`

It adds a `copyLawSources` task and wires it into `preBuild`, so PDFs are copied
after prebuild and before the APK is packaged.

### 2) Register the plugin

`app.json`

```json
"plugins": [
  "expo-dev-client",
  "expo-sqlite",
  "expo-asset",
  "./plugins/withLawSourcesAssets"
]
```

### 3) Correct PDF URI on Android

`src/screens/ActPdfViewerScreen.tsx`

Primary URI:
`bundle-assets://law_sources/<category>/<filename>.pdf`

Fallback URI (if primary fails):
`file:///android_asset/law_sources/<category>/<filename>.pdf`

## Build Steps

1) Run EAS build:
```
npx eas build --platform android --profile production
```

2) Confirm the Gradle log shows:
```
Copying law_sources from <repo>/law_sources to <repo>/android/app/src/main/assets/law_sources
```

3) Install the APK and test:
Acts & Statutes -> Tier (e.g., "Know Your Rights") -> Act -> PDF opens offline.

## Quick Verification (Local)

Count PDFs before and after copy:
- Source: `law_sources/`
- Target: `android/app/src/main/assets/law_sources/`

Counts should match.

## Notes

- The tap flow uses `category + pdf_filename` from the database, so the path
  is always `law_sources/<category>/<pdf_filename>`.
- `assetBundlePatterns` still includes `law_sources/**`, but Android needs the
  assets folder + correct URI for native PDF loading.



