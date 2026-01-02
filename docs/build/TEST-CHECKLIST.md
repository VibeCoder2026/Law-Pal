# Test Checklist - Guyana Laws App

Quick reference for testing all core functionality.

## Must-Pass Offline Flows ⭐

These 3 tests are critical - the app must pass all of them:

### ✅ Test 1: Library → Reader Flow
**Goal**: Verify sections load correctly from Library
- [ ] Open Library tab
- [ ] Tap any section (e.g., "Section 146")
- [ ] Reader opens with **full section text** displayed
- [ ] Section number and heading match
- [ ] Back button returns to Library
- [ ] **Test 3+ different sections** to verify consistency

**Expected**: Every section opens with complete text, no loading errors

---

### ✅ Test 2: Search → Reader Flow
**Goal**: Verify search results navigate to correct sections
- [ ] Open Search tab
- [ ] Search for "president" (or any keyword)
- [ ] Tap a search result
- [ ] Reader opens with **exact matching section**
- [ ] Verify section number matches search result
- [ ] Search term should be visible in content
- [ ] **Try 3+ different searches** and tap results

**Expected**: Search results always open the correct section with matching content

---

### ✅ Test 3: Bookmark Persistence Flow
**Goal**: Verify bookmarks survive app restarts
- [ ] Open any section in Reader
- [ ] Tap bookmark icon (should fill in solid)
- [ ] Go to Bookmarks tab - section appears in list
- [ ] **Force close app** (swipe away from recent apps)
- [ ] Reopen app
- [ ] Check Bookmarks tab - **bookmark still exists**
- [ ] Tap bookmarked section - Reader opens correct content
- [ ] Tap bookmark icon again to remove
- [ ] Return to Bookmarks tab - bookmark removed

**Expected**: Bookmarks persist across app restarts using stable chunk_id

---

## Content Versioning Test 🔄

### ✅ Test 4: Version Update Flow
**Goal**: Verify database updates when CONTENT_VERSION changes
- [ ] Note current `CONTENT_VERSION` in `src/constants/index.ts`
- [ ] Create a bookmark on any section
- [ ] Increment `CONTENT_VERSION` by 1
- [ ] Force close and restart app
- [ ] Check Metro console logs:
  - Should see: `[DB] Version mismatch - reimporting content...`
  - Should see: `[DB] Content import complete`
- [ ] Verify bookmark **still exists** in Bookmarks tab
- [ ] Open bookmarked section - text loads correctly

**Expected**: Database reimports fresh content but preserves bookmarks

---

## UI/UX Features ✨

### ✅ Test 5: Jump to Section
**Goal**: Verify direct navigation by section number
- [ ] Library tab → "Jump to section" input at top
- [ ] Enter valid section number (e.g., "146")
- [ ] Press Go/Enter on keyboard
- [ ] Reader opens **correct section**
- [ ] Try section with letter suffix (e.g., "212A")
- [ ] Try invalid number (e.g., "999999")
- [ ] Should show "Section Not Found" alert

**Expected**: Valid sections open immediately, invalid shows error

---

### ✅ Test 6: Reader Controls
**Goal**: Verify reader settings work and persist
- [ ] Open any section in Reader
- [ ] Tap settings icon (top right)
- [ ] Controls panel slides open
- [ ] **Font Size**: Tap - and + buttons
  - Text size changes immediately
  - Try min and max limits
- [ ] **Dark Mode**: Toggle switch
  - Background/text colors change immediately
  - Status bar adjusts color
- [ ] Close app completely
- [ ] Reopen and navigate to same section
- [ ] **Preferences persist** (font size and dark mode)

**Expected**: All controls work immediately, preferences saved

---

### ✅ Test 7: Share Feature
**Goal**: Verify share functionality formats text correctly
- [ ] Open any section in Reader
- [ ] Tap share icon (top right)
- [ ] Native share dialog appears
- [ ] Preview text includes:
  - "Constitution of Guyana — Section {number}"
  - Section heading (if available)
  - Full section content
- [ ] Share via messaging app to verify format
- [ ] Shared text should be well-formatted

**Expected**: Shared text includes proper header and full content

---

## Performance & Edge Cases 🚀

### ✅ Test 8: First Launch
**Goal**: Verify initial setup works smoothly
- [ ] Uninstall app completely
- [ ] Reinstall and launch
- [ ] App initializes database (~2-3 seconds)
- [ ] Library shows all sections loaded
- [ ] Search works immediately
- [ ] No crashes or errors

**Expected**: Smooth first-time experience, all features work

---

### ✅ Test 9: Offline Operation
**Goal**: Verify app works completely offline
- [ ] Enable airplane mode / disable WiFi and cellular
- [ ] All screens function normally:
  - Library browsing
  - Search
  - Reader
  - Bookmarks
- [ ] No "no internet" errors
- [ ] Content loads instantly

**Expected**: 100% offline functionality, no network errors

---

## Quick Test Summary

**Critical (Must Pass):**
- ✅ Test 1: Library → Reader
- ✅ Test 2: Search → Reader
- ✅ Test 3: Bookmark Persistence

**Important:**
- ✅ Test 4: Version Updates
- ✅ Test 5: Jump to Section
- ✅ Test 6: Reader Controls
- ✅ Test 7: Share Feature

**Edge Cases:**
- ✅ Test 8: First Launch
- ✅ Test 9: Offline Operation

---

## Pass Criteria

**Ship-blocking issues:**
- Any of Tests 1-3 fail
- Database doesn't initialize on first launch
- App crashes on normal usage

**Should fix before release:**
- Tests 4-7 fail
- Performance issues (>5s load times)
- UI glitches in reader controls

**Nice to have:**
- All edge case tests pass
- No console warnings
- Smooth animations

---

## Testing Tips

1. **Force close properly**: Swipe app away from recent apps, don't just minimize
2. **Check console logs**: Metro bundler shows useful debug info
3. **Test on real device**: Some SQLite issues only appear on physical devices
4. **Clear app data**: Settings → Apps → Guyana Laws → Clear Data (for fresh start)
5. **Test both themes**: Some UI bugs only show in dark/light mode
6. **Use different sections**: Don't just test Section 1, try 146, 212A, etc.

---

## Quick Bug Report Template

If you find an issue:

```
**Test**: [Test number and name]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Steps to reproduce**:
1. Step one
2. Step two
3. ...

**Device**: [Android/iOS, version]
**Console errors**: [Copy any errors from Metro logs]
```



