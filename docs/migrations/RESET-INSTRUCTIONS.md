# Database Reset Instructions

## What I Just Did

Added a `FORCE_DB_RESET` flag in [src/constants/index.ts:16](../../src/constants/index.ts#L16) that's currently set to `true`.

## What Will Happen Next

When you restart the app:

1. **Database Reset** (automatic):
   - ✅ Drops all existing tables
   - ✅ Clears all version storage
   - ✅ Logs warning reminders

2. **Fresh Migration** (automatic):
   - ✅ Creates base tables (sections, bookmarks)
   - ✅ Creates new tables (documents, tiers)
   - ✅ Creates FTS with doc_title
   - ✅ Populates tiers
   - ✅ Records migration history

3. **Content Import** (automatic):
   - ✅ Imports Constitution (931 sections)
   - ✅ Includes is_header_only flags
   - ✅ Filters out 213 header articles in UI

## Console Output You'll See

```
[DB] ⚠️  FORCE_DB_RESET enabled - dropping all tables...
[DB] ✅ Database reset complete - fresh migration will run
[DB] ⚠️  REMEMBER: Set FORCE_DB_RESET = false in src/constants/index.ts
[DB] Schema version - Current: 0, Target: 2
[DB] Running schema migrations...
[Migration 2] Adding Acts & Statutes support...
[Migration 2] Ensured base tables exist
[Migration 2] Created documents table
[Migration 2] Created tiers table
[Migration 2] Populated tiers table
...
[Migration 2] Migration complete!
[DB] Constitution version - Stored: 0, Current: 2
[DB] Constitution version mismatch - reimporting...
[DB] Imported 931/931 sections
[DB] Constitution import complete
```

## ⚠️ IMPORTANT: After First Successful Launch

Once the app works, **immediately** change this line in [src/constants/index.ts:16](../../src/constants/index.ts#L16):

```typescript
// FROM:
export const FORCE_DB_RESET = true;

// TO:
export const FORCE_DB_RESET = false;
```

If you don't do this, the database will reset on every app launch and you'll lose all bookmarks!

## Testing Checklist

After the app loads successfully:

- [ ] App opens without errors
- [ ] Navigate to any Part → Chapter → Articles
- [ ] Verify article list doesn't show short header entries
- [ ] Search for "president" - results should exclude headers
- [ ] Create a bookmark - verify it saves
- [ ] **Set FORCE_DB_RESET = false**
- [ ] Restart app - bookmark should still exist

## If It Still Fails

Check the Metro bundler console for the exact error. The most common issues:

1. **TypeScript compilation error** - Fix syntax and restart
2. **Migration SQL error** - Check migrations.ts for SQL syntax
3. **Import error** - Check constitution.json is valid JSON

---

**Ready to test!** Restart the Expo server and watch the console output.



