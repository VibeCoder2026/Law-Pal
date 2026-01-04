# Complete Build Checklist - All Features Included

## Update (Jan 2026)

Acts PDFs are now downloaded on demand and cached locally. This means:
- You no longer need to bundle `law_sources/**` in the APK.
- Steps that copy PDFs into Android assets are legacy and can be skipped.
- Offline testing should be done after the first download of a PDF.

**Date:** January 1, 2026
**Goal:** Build a complete local dev APK with ALL features working

---

## What Should Be Included

### ✅ Core Features
1. **Constitution Reader**
   - Full Constitution text in SQLite
   - Hierarchical navigation (Parts → Chapters → Articles)
   - Full-text search with FTS5
   - Bookmarks functionality

2. **Acts Library**
   - 459 Acts metadata in SQLite
   - **761MB of PDFs** bundled in android/assets
   - Tiered organization (A, B, C)
   - Category-based grouping

3. **PDF Viewer**
   - react-native-pdf integration
   - Load PDFs from `file:///android_asset/law_sources/`
   - Support subdirectories (civil-law/, criminal-justice/, etc.)

4. **Gemini AI Chat**
   - Google Gemini 2.0 Flash integration
   - Query expansion (slang → legal terms)
   - SQLite FTS5 search for context
   - Citation-based responses
   - API key configured

5. **Search**
   - Full-text search across Constitution
   - Results with highlighting
   - Fast FTS5 queries

6. **UI/UX**
   - Dark mode support
   - Bottom tab navigation
   - Professional styling
   - Loading states

---

## Build Steps

### Step 1: Clean Prebuild (Apply Plugins)

```powershell
# Navigate to project
cd C:\Users\keoma\constitution-reader

# Clean and regenerate android/ with plugins
npx expo prebuild --clean
```

**What this does:**
- ✅ Deletes `android/` folder
- ✅ Regenerates fresh Android native code
- ✅ Applies `expo-dev-client` plugin
- ✅ Applies `expo-sqlite` plugin
- ✅ Applies `./plugins/withLawSourcesAssets` plugin
- ✅ Adds `copyLawSources` Gradle task

**Expected output:**
```
✔ Created native directories | /android /ios
✔ Updated package.json and added index.js entry point for iOS and Android
✔ Config synced
```

**Time:** 2-5 minutes

---

### Step 2: Verify Gradle Task Added

```powershell
# Check if copyLawSources task was added
grep -n "copyLawSources" android/app/build.gradle
```

**Expected output:**
```
[line number]: task copyLawSources(type: Copy) {
[line number]: preBuild.dependsOn(copyLawSources)
```

**If not found:** The plugin didn't apply. Check:
```powershell
# Verify plugin is in app.json
grep "withLawSourcesAssets" app.json
```

---

### Step 3: Build Complete APK

```powershell
npx expo run:android
```

**What happens:**
1. **Gradle Sync** (~2-5 min)
   - Downloads dependencies (if needed)
   - Configures build

2. **copyLawSources Task Runs** (~5-10 min)
   - Copies `law_sources/` (761MB) → `android/app/src/main/assets/law_sources/`
   - You should see in build output:
   ```
   > Task :app:copyLawSources
   Copying law_sources from C:\Users\keoma\constitution-reader\law_sources to android\app\src\main\assets\law_sources
   ```

3. **Compile React Native** (~10-15 min)
   - Bundles JavaScript
   - Compiles native modules

4. **Build APK** (~5-10 min)
   - Assembles debug APK
   - Should be ~750MB (66MB code + 761MB PDFs - 77MB compression)

5. **Install on Device** (~2-5 min)
   - Uninstalls old version (if signature matches)
   - Installs new APK
   - Launches app

**Total time:** 25-45 minutes

---

### Step 4: Monitor Build Progress

**Watch for these key outputs:**

```
> Task :app:copyLawSources
Copying law_sources from ... to ...
```
✅ **Critical:** This confirms PDFs are being copied

```
> Task :app:bundleDebugJsAndAssets
```
✅ JavaScript bundle being created

```
> Task :app:assembleDebug
BUILD SUCCESSFUL in 23m 14s
```
✅ APK created successfully

```
› Installing android\app\build\outputs\apk\debug\app-debug.apk
```
✅ Installing on device

---

### Step 5: Verify Build Completeness

After build completes, verify everything is included:

#### A. Check APK Size
```powershell
ls -lh android/app/build/outputs/apk/debug/app-debug.apk
```

**Expected:** ~700-800MB
- 66MB: App code + JavaScript
- 761MB: PDFs (compressed to ~684MB in APK)

**If only 66MB:** PDFs weren't included! Check step 2.

#### B. Check PDFs in Assets
```powershell
du -sh android/app/src/main/assets/law_sources
```

**Expected:** ~761MB
**Should contain:**
```
law_sources/
├── civil-law/
├── commercial-business/
├── criminal-justice/
├── family-social/
├── land-property/
├── labor-employment/
├── public-administration/
├── tax-revenue/
└── uncategorized/
```

#### C. Count PDF Files
```powershell
find android/app/src/main/assets/law_sources -name "*.pdf" | wc -l
```

**Expected:** 459 PDFs

---

## Installation & Testing

### Step 6: Install APK on Device

If build completed but installation failed (signature mismatch):

```powershell
# Uninstall old versions
adb uninstall com.anonymous.guyanalaws
adb uninstall com.lawpalgy.app

# Install new build
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

### Step 7: Test All Features

#### Test 1: App Launches
- [ ] App opens without crashes
- [ ] Splash screen shows
- [ ] Home screen loads

#### Test 2: Constitution Reader
- [ ] Navigate to Library → Constitution
- [ ] Browse Parts → Chapters → Articles
- [ ] Open Article 1 (should show full text)
- [ ] Test search: Search for "fundamental rights"
- [ ] Create a bookmark
- [ ] Verify bookmark appears in Bookmarks tab

#### Test 3: Acts Library & PDF Viewer
- [ ] Navigate to Library → Acts
- [ ] See tier categories (Tier A, B, C)
- [ ] Open Tier A - Know Your Rights
- [ ] Tap "Marriage Act"
- [ ] PDF should load (not "file not found" error)
- [ ] Test zoom in/out
- [ ] Test page navigation
- [ ] Go back and try different categories:
  - [ ] Criminal Justice → Criminal Law (Offences) Act
  - [ ] Commercial Business → Companies Act
  - [ ] Land Property → State Lands Act

**Critical:** If PDFs show "Could not locate PDF file", the build is incomplete!

#### Test 4: Gemini AI Chat
- [ ] Tap "Chat" button on Home screen
- [ ] See welcome message from assistant
- [ ] Ask: "What are my rights under Article 40?"
- [ ] Should get AI response with citations
- [ ] Ask: "What if someone squatting on my land?"
- [ ] Verify query expansion works (check console logs)
- [ ] Ask: "How do I start a business in Guyana?"
- [ ] Citations should be clickable/tappable

**If error "Please configure API key":** API key missing or invalid

#### Test 5: Search Functionality
- [ ] Navigate to Search tab
- [ ] Search: "freedom of speech"
- [ ] Results should appear with highlights
- [ ] Tap result → Navigate to article

#### Test 6: Dark Mode
- [ ] Toggle dark mode (if UI has toggle)
- [ ] Or system dark mode should apply
- [ ] All screens should adapt

#### Test 7: Performance
- [ ] App startup time: <5 seconds
- [ ] PDF loading: <3 seconds for small Acts
- [ ] Search response: <1 second
- [ ] AI chat response: 2-5 seconds
- [ ] Navigation: Smooth, no lag

---

## Hot Reload Testing

### Step 8: Test Development Workflow

Now test the instant hot-reload feature:

```powershell
# Start Metro bundler
npx expo start --dev-client
```

**Metro should show:**
```
› Metro waiting on exp://192.168.x.x:8081
› Press a │ open Android
```

#### Make a Test Change

1. **Open:** `src/screens/HomeScreen.tsx`

2. **Find the welcome text** (around line 50-60)

3. **Change it:**
   ```typescript
   // Before:
   <Text style={styles.title}>Welcome to Law Pal GY</Text>

   // After:
   <Text style={styles.title}>Welcome - Hot Reload Test!</Text>
   ```

4. **Save file** (Ctrl+S)

5. **Check device:** App should update in 2-3 seconds! ⚡

6. **Verify:** Home screen now shows "Welcome - Hot Reload Test!"

**If it doesn't update:**
- Shake device → "Reload"
- Or press 'r' in Metro terminal

#### Make Another Change

1. **Open:** `src/screens/ChatScreen.tsx`

2. **Change welcome message** (line 31):
   ```typescript
   // Before:
   text: "Hello! I'm your Law Pal GY assistant..."

   // After:
   text: "Hi there! Ask me anything about Guyana law! 🇬🇾"
   ```

3. **Save** → App updates in 2-3 seconds

4. **Navigate to Chat screen** → See new message

**Hot reload confirmed!** You can now develop with instant feedback! 🚀

---

## Troubleshooting

### Issue: APK Only 66MB (PDFs Missing)

**Cause:** `copyLawSources` Gradle task didn't run

**Solution:**
```powershell
# 1. Verify plugin exists
cat plugins/withLawSourcesAssets.js

# 2. Verify it's in app.json
grep "withLawSourcesAssets" app.json

# 3. Clean prebuild
npx expo prebuild --clean

# 4. Manually check build.gradle was modified
grep "copyLawSources" android/app/build.gradle

# 5. If still not there, manually add to android/app/build.gradle:
# (See plugins/withLawSourcesAssets.js for task code)

# 6. Rebuild
npx expo run:android
```

---

### Issue: PDFs Show "File Not Found"

**Cause 1:** PDFs in wrong location
```powershell
# Check where PDFs are:
find android/app/src/main/assets -name "*.pdf" | head -n 5

# Should be: android/app/src/main/assets/law_sources/category/filename.pdf
```

**Cause 2:** Wrong path in code
```typescript
// In ActPdfViewerScreen.tsx, should be:
const assetPath = `file:///android_asset/law_sources/${pdfFilename}`;

// Where pdfFilename includes category:
// e.g., "civil-law/Ch_005_02_Land_Registry_Act.pdf"
```

---

### Issue: AI Chat Shows "Configure API Key"

**Check:**
```powershell
  # Verify API key exists
  cat .env
```

**Should show:**
```typescript
export const GOOGLE_AI_API_KEY = 'YOUR_API_KEY_HERE';
```

**If missing or placeholder:**
1. Get key: https://aistudio.google.com/app/apikey
2. Update `.env` with `GOOGLE_AI_API_KEY=your_actual_api_key_here`
3. Restart Metro (or hot reload if already running)

---

### Issue: Installation Failed - Signature Mismatch

```
INSTALL_FAILED_UPDATE_INCOMPATIBLE
```

**Solution:**
```powershell
# Uninstall ALL old versions
adb uninstall com.anonymous.guyanalaws
adb uninstall com.lawpalgy.app

# Reinstall
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

### Issue: Build Fails - Out of Memory

**Add to** `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m
org.gradle.daemon=true
org.gradle.parallel=true
```

---

### Issue: Metro Can't Connect

```powershell
# Use USB reverse
adb reverse tcp:8081 tcp:8081

# Restart Metro
npx expo start --dev-client

# On device, shake → Settings → Change Bundle Location
# Enter: localhost:8081
```

---

## Success Criteria

### ✅ Build is Complete When:

- [ ] APK size: ~700-800MB (not 66MB)
- [ ] PDFs in assets: 761MB (459 files)
- [ ] App installs without errors
- [ ] Constitution reader works
- [ ] Acts PDFs load correctly (all categories)
- [ ] AI chat responds with citations
- [ ] Search returns results
- [ ] Hot reload works (2-3 sec updates)
- [ ] No crashes on startup
- [ ] All navigation works

---

## Next Steps After Complete Build

### Daily Development
```powershell
# Start Metro
npx expo start --dev-client

# Make changes → Save → Test (2-3 sec)
```

### Weekly Production Build (EAS)
```powershell
npx eas build --profile production --platform android
```

### Optional Enhancements
1. Add voice input (@react-native-voice/voice)
2. Add text-to-speech (expo-speech)
3. Compress PDFs (save ~300MB)
4. Implement tiered downloads
5. Add conversation history
6. Add suggested questions

---

## Quick Reference

```powershell
# Complete rebuild from scratch
npx expo prebuild --clean
npx expo run:android

# Daily development
npx expo start --dev-client

# Check APK size
ls -lh android/app/build/outputs/apk/debug/app-debug.apk

# Check PDFs included
du -sh android/app/src/main/assets/law_sources

# Uninstall and reinstall
adb uninstall com.lawpalgy.app && adb install android/app/build/outputs/apk/debug/app-debug.apk

# Hot reload not working? Reload manually
# Press 'r' in Metro OR shake device → "Reload"
```

---

**Ready to build? Start with:**
```powershell
cd C:\Users\keoma\constitution-reader
npx expo prebuild --clean
```



