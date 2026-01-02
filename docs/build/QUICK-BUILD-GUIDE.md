# Quick Build Guide - PDF Viewer APK

## Current Situation

- ✅ App works in Expo Go (shows placeholder for PDF viewer)
- ❌ Native PDF viewing requires custom build
- ❌ Android Studio not installed locally

## Solution: EAS Cloud Build

Build the APK in the cloud without needing Android Studio.

### Step 1: Login to Expo

You need an Expo account (it's free):

```bash
npx eas login
```

If you don't have an account:
```bash
npx eas register
```

### Step 2: Build Development APK

```bash
npx eas build --platform android --profile development
```

This will:
- Build the APK on Expo's servers (takes ~10-15 minutes)
- Include react-native-pdf native module
- Generate a download link for the APK

### Step 3: Install APK

1. Download the APK from the link provided
2. Transfer to your Android device
3. Install (you may need to enable "Install from unknown sources")

### Step 4: Run with Development Build

After installing the development APK:

```bash
npx expo start --dev-client
```

Your device will connect and hot-reload will work like Expo Go.

## Alternative: Build Production APK

For a standalone APK (no Metro connection needed):

```bash
npx eas build --platform android --profile production
```

This creates a fully standalone APK you can distribute.

## Important Notes

1. **First build takes longer** (~10-15 minutes) - subsequent builds are faster
2. **Free tier limits**: Expo provides free builds with some limits
3. **Development builds** need Metro running (`npx expo start --dev-client`)
4. **Production builds** are standalone and don't need Metro

## If You Want to Build Locally Instead

You'll need to install Android Studio:

1. Download Android Studio: https://developer.android.com/studio
2. Install Android SDK
3. Add to PATH: `%LOCALAPPDATA%\Android\Sdk\platform-tools`
4. Then run: `npx expo run:android`

## Testing PDF Viewer

Once you have the custom build installed:

1. Open the app
2. Navigate: Home → Acts & Statutes
3. Select a tier (e.g., "Know Your Rights")
4. Tap any Act
5. PDF should load with full native viewing

The placeholder message will be gone and you'll see the actual PDF!



