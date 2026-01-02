# Database Migration Test Guide

## Quick Status
**Expo Server:** Running on port 8082
**Migration Version:** 2 (Acts & Statutes support)
**Status:** Ready to test

## What to Look For

### 1. Console Logs During App Startup

When you open the app, check the Metro bundler logs for migration messages:

```
[DB] Initializing database...
[DB] Schema version - Current: X, Target: 2
[DB] Running schema migrations...
[Migration 2] Adding Acts & Statutes support...
[Migration 2] Created documents table
[Migration 2] Created tiers table
[Migration 2] Populated tiers table (13 tiers)
[Migration 2] Migration complete!
```

### 2. Expected Behavior

**If Fresh Install:**
- Creates all tables from scratch
- Imports Constitution
- Migration runs seamlessly

**If Existing Database:**
- Detects schema version 1
- Runs Migration 2
- Preserves all bookmarks
- Preserves all Constitution data
- Updates schema to version 2

### 3. Quick UI Tests

Once app loads:
- ✅ Home screen shows Constitution
- ✅ Search works
- ✅ Can open any article (e.g., Article 1, Article 146)
- ✅ Bookmarks screen works (if you had bookmarks)
- ✅ Can add new bookmarks
- ✅ No crashes or freezes

## How to Test

### Option 1: Using Expo Go (Recommended)
1. Open Expo Go app on your phone
2. Scan QR code from http://localhost:8082
3. Watch for migration logs in Metro bundler
4. Test app functionality

### Option 2: Using Simulator
1. Press `a` for Android or `i` for iOS in Metro bundler
2. Wait for app to build and install
3. Watch console logs
4. Test app

### Option 3: Web (Quick Test)
1. Press `w` in Metro bundler
2. Opens in browser
3. Check console for migration logs

## What Changed

### New Database Tables
- `documents` - Master registry (Constitution + future Acts)
- `tiers` - 13 tier categories for organizing Acts
- `migration_history` - Tracks applied migrations

### Modified Tables
- `sections` - Added `parent_section`, `section_type`, `ordinal` columns
- `sections_fts` - Added `doc_title` for better search results

### Nothing Changed (Backwards Compatible)
- `bookmarks` - Works exactly the same
- All existing Constitution data preserved
- All existing functionality works

## Troubleshooting

### Migration Doesn't Run
**Symptom:** No migration logs appear
**Cause:** Schema already at version 2 (already migrated)
**Fix:** Expected behavior - migration is idempotent

### App Crashes on Startup
**Symptom:** White screen or crash
**Cause:** Migration error
**Fix:** Check Metro bundler logs for error details

### Bookmarks Missing
**Symptom:** Bookmarks screen empty
**Cause:** Migration backup failed
**Fix:** Should not happen - bookmarks table unchanged

### Search Not Working
**Symptom:** Search returns no results
**Cause:** FTS index rebuild failed
**Fix:** Check migration logs for FTS errors

## Success Indicators

You'll know migration succeeded if you see:
```
[Migration 2] Migration complete!
[DB] Schema migrations complete
[DB] Constitution content up to date
```

And the app:
- Opens without crashes
- Shows Constitution articles
- Search works
- Bookmarks work (if any existed)

## Ready to Test!

The Expo server is running. You can now:
1. Open the app on your device/simulator
2. Watch the console logs
3. Test the UI functionality
4. Report any issues

**Next:** Once migration passes, we'll move on to parsing and importing Acts!



