# Local Development Setup - Instant Hot Reload

**Goal:** Build the app once locally, then get instant hot-reload for all code changes without uploading to EAS every time.

---

## Why Local Development?

**Current EAS Workflow (Slow):**
```
Make change → Upload 1.5GB → Wait 10 min → Download APK → Install → Test
Total: ~15-20 minutes per change
```

**Local Dev Workflow (Fast):**
```
Make change → Hot reload → Test
Total: ~2-3 seconds per change
```

**When to Use Each:**
- **Local Dev:** 99% of development (code changes, UI tweaks, bug fixes)
- **EAS Build:** Production releases, adding new native dependencies

---

## Setup Steps

### 1. Set Environment Variables

Add Android SDK to your PATH:

**Option A: PowerShell (Temporary - this session only)**
```powershell
$env:ANDROID_HOME = "$env:USERPROFILE\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator"
```

**Option B: Permanent (Recommended)**
1. Open "Environment Variables" in Windows Settings
2. Add new System Variable:
   - Name: `ANDROID_HOME`
   - Value: `C:\Users\keoma\AppData\Local\Android\Sdk`
3. Edit `Path` variable, add:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\emulator`
4. Restart terminal

**Verify:**
```bash
adb version  # Should show adb version info
```

---

### 2. Install Java (Required for Android Builds)

Expo requires Java 17 or 21 for local builds.

**Check if Java is installed:**
```bash
java -version
```

**If not installed, download:**
- Java 21 (LTS): https://adoptium.net/temurin/releases/?version=21
- Install and verify:
  ```bash
  java -version  # Should show "21.x.x"
  ```

---

### 3. First Local Build (One-Time Setup)

This will take 30-60 minutes the first time, but you only do it once:

```bash
# Clean any previous builds
npx expo prebuild --clean

# Build and install dev client on connected device/emulator
npx expo run:android

# This will:
# 1. Generate android/ folder with native code
# 2. Compile the APK
# 3. Install on connected device/emulator
```

**What happens:**
- ✅ Downloads Gradle dependencies (~2GB)
- ✅ Compiles React Native (~10-15 min)
- ✅ Builds APK (~5-10 min)
- ✅ Installs on device automatically

**Expected output:**
```
› Building app...
› Installing app...
✔ Built and installed Android app
› Opening app on Android...
```

---

### 4. Daily Development Workflow

After the first build completes, you **never need to rebuild** for code changes:

```bash
# Start Metro bundler with dev client
npx expo start --dev-client

# On your device, open the "Law Pal GY (dev)" app
# Metro will load JavaScript and you're ready!
```

**Now any change you make hot-reloads in 2-3 seconds:**
- Edit ChatScreen.tsx → Saves → Hot reloads on device
- Modify AIService.ts → Saves → Updates instantly
- Change styles → Saves → UI updates immediately

**No more:**
- ❌ Uploading 1.5GB to EAS
- ❌ Waiting 10 minutes for build
- ❌ Downloading APK
- ❌ Re-installing

---

## When Do You Need to Rebuild?

**Rebuild Required (npx expo run:android):**
- Adding new native npm packages (e.g., @react-native-voice/voice)
- Changing expo plugins in app.config.js
- Updating Expo SDK version

**No Rebuild Needed (just hot reload):**
- ✅ All TypeScript/JavaScript code
- ✅ React components
- ✅ Styles and themes
- ✅ Database queries
- ✅ AIService changes
- ✅ Navigation changes
- ✅ Adding new screens

---

## File Size Considerations

**Local Build Disk Usage:**
- `android/` folder: ~500MB (generated native code)
- `node_modules/`: ~400MB (dependencies)
- Gradle cache: ~2GB (downloaded once)
- Build artifacts: ~1GB (can be cleaned)
- **Total: ~4GB**

**But you gain:**
- ✅ No EAS upload wait (saves 5-10 min per build)
- ✅ Instant hot reload (2-3 seconds vs 15 minutes)
- ✅ Offline development (no internet needed)
- ✅ Unlimited builds (no EAS build minute limits)

**You can clean build artifacts anytime:**
```bash
cd android
./gradlew clean  # Removes ~1GB of build cache
cd ..
```

---

## Device Connection Options

### Option 1: USB Connected Phone
```bash
# Enable USB debugging on phone (Settings → Developer Options)
# Connect via USB
adb devices  # Should show your device

# Run app
npx expo run:android
```

### Option 2: Android Emulator
```bash
# List available emulators
emulator -list-avds

# Start emulator (replace with your AVD name)
emulator -avd Pixel_5_API_34

# In another terminal:
npx expo run:android
```

### Option 3: Wireless ADB (WiFi Testing)
```bash
# Connect device via USB first
adb tcpip 5555

# Disconnect USB, then connect via WiFi (replace with device IP)
adb connect 192.168.1.XXX:5555

# Verify
adb devices  # Should show device over WiFi

# Run app
npx expo run:android
```

---

## Troubleshooting

### "ANDROID_HOME not set"
```bash
# Set temporarily in PowerShell:
$env:ANDROID_HOME = "$env:USERPROFILE\AppData\Local\Android\Sdk"

# Or permanently via Windows Environment Variables
```

### "Java not found"
```bash
# Install Java 21 from https://adoptium.net/temurin/releases/?version=21
# Verify:
java -version
```

### "No devices found"
```bash
# Start emulator:
emulator -avd Pixel_5_API_34

# Or connect phone via USB and enable USB debugging
```

### "Build failed - out of memory"
Add to `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m
```

### "PDFs not loading"
```bash
# PDFs are downloaded on demand now.
# Check the URL map:
rg -n "your-act.pdf" src/assets/acts-pdf-urls.json

# Ensure device has network access on first open.
```

---

## Comparing Workflows

### EAS Build (Production)
```bash
# Use for: Production releases, final testing
npx eas build --profile production --platform android

# Pros: Clean build, signed APK, no local setup needed
# Cons: 10-15 min per build, uses build minutes, requires upload
```

### Local Build (Development)
```bash
# First time only (30-60 min):
npx expo run:android

# Daily development (instant):
npx expo start --dev-client

# Pros: Instant hot reload, offline, unlimited builds
# Cons: Requires Android Studio setup, ~4GB disk space
```

---

## Recommended Workflow

**For Active Development:**
```bash
# Morning: Start Metro bundler
npx expo start --dev-client

# Day: Make changes, hot reload instantly
# Edit ChatScreen.tsx → Save → Test (2 seconds)
# Edit AIService.ts → Save → Test (2 seconds)

# Evening: Commit changes
git add .
git commit -m "Added voice input to chat"
```

**For Weekly Releases:**
```bash
# Build production APK via EAS
npx eas build --profile production --platform android

# Test on real devices
# Deploy to testers or Play Store
```

---

## Quick Start Commands

```bash
# 1. First time setup (run once):
npx expo prebuild --clean
npx expo run:android

# 2. Daily development (run every morning):
npx expo start --dev-client

# 3. Production build (run weekly):
npx eas build --profile production --platform android
```

---

## Expected Build Time

**First Local Build:**
- Gradle dependencies download: ~10 min
- React Native compilation: ~15 min
- APK assembly: ~5 min
- **Total: ~35-45 minutes** (one time!)

**Subsequent Local Builds (if needed):**
- Gradle cache exists: ~5-10 min
- Only recompiles changed code

**Hot Reload (after first build):**
- Code change → Save → Test: **2-3 seconds** ⚡

---

## Benefits Summary

| Feature | EAS Build | Local Dev Build |
|---------|-----------|-----------------|
| First build time | 10 min | 35-45 min |
| Code change testing | 15 min | 2-3 sec ⚡ |
| Internet required | Yes | No |
| Disk space | 0 | ~4GB |
| Build minutes used | Yes | No |
| Hot reload | No | Yes ✅ |
| Production ready | Yes ✅ | No |

**Recommendation:** Use local dev for daily work, EAS for production releases.

---

Ready to set up? Run these commands:

```bash
# 1. Set ANDROID_HOME (if not already)
$env:ANDROID_HOME = "$env:USERPROFILE\AppData\Local\Android\Sdk"

# 2. Verify adb works
adb version

# 3. Start first build
npx expo run:android
```

This will give you instant hot-reload for all future changes! 🚀



