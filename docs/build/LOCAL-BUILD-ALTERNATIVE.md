# Local Build Alternative (Without EAS)

If you prefer to build locally without Expo account:

## Install Android Studio

1. **Download**: https://developer.android.com/studio
2. **Install**: Follow installer (takes ~30 min)
3. **Open Android Studio**:
   - Tools → SDK Manager
   - Install Android SDK 34
   - Install Android SDK Build Tools 34.0.0

## Set Environment Variables

Add to system PATH:
```
%LOCALAPPDATA%\Android\Sdk\platform-tools
%LOCALAPPDATA%\Android\Sdk\tools
```

## Build Locally

```bash
# Generate native Android code (already done via expo prebuild)
# This created the ./android folder

# Build debug APK
cd android
./gradlew assembleDebug

# APK location:
# android/app/build/outputs/apk/debug/app-debug.apk
```

## Build Release APK

```bash
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

## Install on Device

```bash
# Via ADB
adb install android/app/build/outputs/apk/release/app-release.apk
```

## Pros/Cons

**Local Build Pros:**
- ✅ No Expo account needed
- ✅ No cloud dependency
- ✅ Full control over build process

**Local Build Cons:**
- ❌ Need to install ~3GB of Android tools
- ❌ Setup takes 30-60 minutes
- ❌ Need to manage SDK updates
- ❌ Build errors harder to debug

**EAS Build Pros:**
- ✅ No setup required
- ✅ Just login and build
- ✅ Build servers maintained by Expo
- ✅ Consistent environment

**EAS Build Cons:**
- ❌ Need Expo account (free)
- ❌ Need internet for builds
- ❌ Build takes 15-20 min (in queue)

## My Recommendation

**Use EAS** for your first build because:
1. Faster to get started (just login)
2. No risk of local configuration issues
3. You can always switch to local builds later

Once you verify PDFs work, you can decide if you want to set up Android Studio for future builds.



