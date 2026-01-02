# Build Instructions for PDF Viewing

## Overview

The app now uses **react-native-pdf** for native PDF viewing, which requires a custom development build (not Expo Go).

## Why Custom Build?

- **react-native-pdf** is a native module that requires Android/iOS native code
- Expo Go doesn't support custom native modules
- Custom builds work exactly like Expo Go, but with your native modules included

## Development Build (First Time Setup)

### 1. Build the Development Client

For Android:
```bash
npx expo run:android
```

For iOS (Mac only):
```bash
npx expo run:ios
```

**What this does:**
- Compiles native code with react-native-pdf
- Installs a custom development build on your device/emulator
- This build works like Expo Go but with PDF viewing support

### 2. Start Metro Bundler

After the build completes, Metro will start automatically. If not:
```bash
npx expo start --dev-client
```

**Important:** Use `--dev-client` flag (not regular `expo start`)

## Daily Development Workflow

Once you've built the development client once, you only need to rebuild when:
- Adding new native modules
- Changing app.json native config
- Updating native dependencies

For regular JS/TS changes:
1. Keep the development build installed on your device
2. Run: `npx expo start --dev-client`
3. Changes hot-reload like normal Expo Go

## Production APK Build

### Option 1: EAS Build (Recommended - Cloud Build)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS
eas build:configure

# Build APK
eas build --platform android --profile preview
```

### Option 2: Local Build

```bash
# Build locally (requires Android Studio)
npx expo run:android --variant release
```

The APK will be in:
```
android/app/build/outputs/apk/release/app-release.apk
```

## PDF File Access

PDFs are bundled in the app via `law_sources/**` pattern in app.json.

Current approach in ActPdfViewerScreen.tsx:
- Uses `file://` protocol to access bundled PDFs
- Path: `law_sources/{category}/{filename}.pdf`

## Troubleshooting

### "react-native-pdf" not found
- Make sure you ran `npx expo run:android` (not `expo start`)
- Delete `node_modules` and run `npm install`

### PDFs not loading
- Check PDF path in logs: Look for `[ActPdfViewer] PDF URI:`
- Ensure PDFs are in `law_sources/` folder
- Verify `app.json` has `law_sources/**` in `assetBundlePatterns`

### Metro bundler issues
- Run: `npx expo start --dev-client --clear`
- Or: `rm -rf node_modules && npm install`

## Testing PDF Viewer

1. Build and install development client: `npx expo run:android`
2. Navigate in app: Home → Acts & Statutes → Select Tier → Select Act
3. PDF should load and display with:
   - Page navigation
   - Pinch-to-zoom
   - Smooth scrolling
   - Page counter in header

## Next Steps

- Test PDF loading on development build
- Verify all 459 Acts can load their PDFs
- Build production APK for distribution
- Test on physical device (not just emulator)



