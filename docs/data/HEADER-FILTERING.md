# Header-Only Article Filtering

## Problem

The Constitution contains many articles with the same section number, where the first article is just a short header/description (e.g., "The territory" - 17 chars) followed by actual content in subsequent articles (200-400+ chars).

**Example - Article 2:**
1. "The territory." (17 chars) - **Header only**
2. "The territory of the State comprises..." (213 chars) - **Actual content**

This creates visual noise in the Library and Search screens, showing header-only articles that don't provide meaningful content.

## Analysis Results

- **Total sections**: 931
- **Header-only articles**: 213 (22.9%)
- **Pattern**: 86.9% of multi-entry articles have a first entry that's significantly shorter than the rest

## Solution Implemented

**Approach**: Filter header-only articles in the UI (Option A - Simple)

### Changes Made

#### 1. constitution.json Updated
- Backed up original to `constitution-backup.json`
- Added `is_header_only: true/false` flag to all sections
- Detection logic: Section is header-only if:
  - Text length < 100 characters AND
  - Other articles exist with same section_number AND
  - This is the first entry for that section_number

#### 2. TypeScript Types Updated
- Added `is_header_only?: boolean` to `ConstitutionSection` interface in [src/types/index.ts](../../src/types/index.ts:17)

#### 3. Utility Functions Created
**File**: [src/utils/sectionFilters.ts](../../src/utils/sectionFilters.ts)

```typescript
// Check if section is header-only
isHeaderOnly(section: ConstitutionSection): boolean

// Filter array to remove headers
filterNonHeaders(sections: ConstitutionSection[]): ConstitutionSection[]

// Get first non-header per section number
getFirstNonHeaderPerSection(sections: ConstitutionSection[]): ConstitutionSection[]
```

#### 4. UI Components Updated

**ArticleListScreen** ([src/screens/ArticleListScreen.tsx:40](../../src/screens/ArticleListScreen.tsx#L40))
- Filters out header articles before displaying in article list
- Users see only articles with actual content

**SearchScreen** ([src/screens/SearchScreen.tsx:43](../../src/screens/SearchScreen.tsx#L43))
- Filters search results to exclude header-only matches
- More relevant search results

#### 5. Version Bumped
- `CONSTITUTION_VERSION` increased from 1 → 2 in [src/constants/index.ts:15](../../src/constants/index.ts#L15)
- Triggers automatic reimport of constitution.json with new flags

## How It Works

### At App Startup
1. Database checks `CONSTITUTION_VERSION` in AsyncStorage
2. If version mismatch (1 ≠ 2), triggers reimport:
   - Deletes existing Constitution sections
   - Imports fresh data from `constitution.json` (with `is_header_only` flags)
   - Saves new version number

### In UI Components
1. Load sections from database OR JSON
2. Call `filterNonHeaders(sections)` before rendering
3. Only non-header articles shown to user

### Detection Logic
```typescript
function isHeaderOnly(section: ConstitutionSection): boolean {
  // Use flag from JSON if available
  if (section.is_header_only !== undefined) {
    return section.is_header_only;
  }

  // Fallback: detect by text length
  const textLength = section.text ? section.text.length : 0;
  return textLength < 100;
}
```

## Benefits

✅ **No database schema changes** - Keeps migration simple
✅ **Backward compatible** - Fallback detection if flag missing
✅ **Easy to disable** - Remove filter calls to restore all articles
✅ **Performance** - Filter runs in-memory, no extra queries
✅ **User experience** - Cleaner article lists, more relevant search results

## Testing

### Before Filtering
- Article lists showed 931 total sections
- Many entries like "The territory" with no content
- Search returned header-only matches

### After Filtering
- Article lists show ~718 sections (931 - 213 headers)
- Each visible article has meaningful content
- Search results are more relevant

### How to Test
1. **Article List**: Navigate to any Part/Chapter → verify no short header entries
2. **Search**: Search for "territory" → should only show full content articles
3. **Jump to Article**: Library → "Jump to section 2" → opens first non-header Section 2

## Rollback Plan

If issues arise, rollback is simple:

1. **Restore original JSON**:
   ```bash
   cp src/assets/constitution-backup.json src/assets/constitution.json
   ```

2. **Revert version**:
   ```typescript
   export const CONSTITUTION_VERSION = 1;
   ```

3. **Remove filter calls** (optional):
   - In ArticleListScreen.tsx: remove `filterNonHeaders()` call
   - In SearchScreen.tsx: remove `filterNonHeaders()` call

## Future Enhancements

### Option B: Database Column (If Needed Later)

If we need more flexibility (e.g., show headers as section dividers), we can:

1. Add `is_header_only BOOLEAN DEFAULT 0` column to `sections` table
2. Create Migration 3 to update schema
3. Store flag during import
4. Query with `WHERE is_header_only = 0` for better performance

**Not implemented now** because Option A (UI filtering) is simpler and sufficient.

## Files Modified

- ✅ [src/assets/constitution.json](../../src/assets/constitution.json) - Added is_header_only flags
- ✅ [src/assets/constitution-backup.json](../../src/assets/constitution-backup.json) - Original backup
- ✅ [src/types/index.ts](../../src/types/index.ts) - Added is_header_only field to interface
- ✅ [src/utils/sectionFilters.ts](../../src/utils/sectionFilters.ts) - Created filter utilities
- ✅ [src/screens/ArticleListScreen.tsx](../../src/screens/ArticleListScreen.tsx) - Applied filter
- ✅ [src/screens/SearchScreen.tsx](../../src/screens/SearchScreen.tsx) - Applied filter
- ✅ [src/constants/index.ts](../../src/constants/index.ts) - Bumped CONSTITUTION_VERSION to 2

## Developer Notes

- Header detection script: [mark-headers.js](../../tools/analysis/mark-headers.js)
- Analysis script: [analyze-articles.js](../../tools/analysis/analyze-articles.js)
- Both scripts can be re-run if needed to regenerate flags




