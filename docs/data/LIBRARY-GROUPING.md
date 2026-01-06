# Library Grouping Feature

## Overview

The Library screen now displays Constitution articles in a hierarchical, organized structure. Related articles (like Article 161, 161A, 161B) are grouped together, making it easier for users to navigate and read related content.

## How It Works

### 1. Data Structure

The enhanced parser (`tools/parse/parse-constitution-v3.js`) creates two key data structures:

**Sections** - Individual articles:
```typescript
{
  chunk_id: "sec-1",
  section_number: "161A",
  heading: "Article heading...",
  text: "Article content...",
  baseArticle: "161",  // Extracted base number
  chapter: null,
  part: null
}
```

**Groups** - Collections of related articles:
```typescript
{
  id: "group-161",
  baseArticle: "161",
  title: "Article 161 heading",
  articles: ["sec-1", "sec-2", "sec-3"],  // chunk_ids
  articleCount: 3,
  firstChunkId: "sec-1"
}
```

### 2. Navigation Flow

```
Library Screen (Groups)
    ↓
    ├─→ Single Article → Reader Screen
    │
    └─→ Multiple Articles → Article List Screen
             ↓
             └─→ Select Article → Reader Screen
```

**User Experience:**
1. **Library Screen** shows 227 grouped sections
2. Tap a group with:
   - **1 article** → Goes directly to Reader
   - **Multiple articles** → Shows ArticleList screen
3. **ArticleList Screen** displays all sub-articles (161, 161A, 161B, etc.)
4. Tap any article → Opens in Reader

### 3. Key Files Modified

#### New Files
- [src/screens/ArticleListScreen.tsx](../../src/screens/ArticleListScreen.tsx) - Shows articles within a group
- [tools/parse/parse-constitution-v3.js](../../tools/parse/parse-constitution-v3.js) - Enhanced parser with grouping

#### Modified Files
- [src/screens/LibraryScreen.tsx](../../src/screens/LibraryScreen.tsx) - Now shows groups instead of individual articles
- [src/types/index.ts](../../src/types/index.ts) - Added `ArticleGroup` and `ConstitutionSection` updates
- [src/navigation/AppNavigator.tsx](../../src/navigation/AppNavigator.tsx) - Added ArticleList screen route

### 4. Parser Usage

```bash
cd tools

# Run the enhanced parser with grouping
npm run parse:v3
```

**Output:**
- 931 articles
- 227 groups
- Average 4.1 articles per group
- Updated `src/assets/constitution.json`

## UI Features

### Library Screen
- Displays groups with base article numbers in circular icons
- Shows article count for each group ("3 articles" vs "Article 161")
- Clean, organized list with proper spacing
- Smart navigation based on article count

### Article List Screen
- Header shows group title and base article
- Back button to return to Library
- Each article displayed with:
  - Circular badge with article number
  - Article heading
  - Preview of article text
- Tap to read full article

### Design Elements
- Consistent theming (dark/light mode)
- Material Design-style cards with elevation
- Circular icon badges for visual hierarchy
- Responsive touch targets

## Benefits

✅ **Better Organization**
- Related articles grouped logically
- Easier to find specific amendments (161A, 161B, etc.)
- Reduced scrolling through 900+ individual items

✅ **Improved Navigation**
- Two-level hierarchy (Groups → Articles → Reader)
- Smart routing (skip Article List if only one article)
- Clear breadcrumbs and back navigation

✅ **Enhanced UX**
- Visual article numbers in badges
- Article counts for transparency
- Preview text for context

✅ **Scalability**
- Supports any number of articles/groups
- Works with future document additions
- Flexible grouping logic

## Customization

### Adjust Grouping Logic

Edit `tools/parse/parse-constitution-v3.js`:

```javascript
// Change how base articles are extracted
function extractBaseArticle(articleNum) {
  const match = articleNum.match(/^(\d+)/);
  return match ? match[1] : articleNum;
}
```

### Filter Out Groups

In [src/screens/LibraryScreen.tsx](../../src/screens/LibraryScreen.tsx#L29):

```typescript
const loadGroups = () => {
  if (constitutionData.groups) {
    // Filter to only show groups with multiple articles
    const filtered = constitutionData.groups.filter(g => g.articleCount > 1);
    setGroups(filtered as ArticleGroup[]);
  }
};
```

### Add Chapter/Part Organization

The data structure supports `chapter` and `part` fields. You can:
1. Update parser to detect CHAPTER/PART markers
2. Group by chapter first, then by article
3. Add SectionList with headers in Library screen

## Testing

After running the parser:

1. **Verify Data:**
   ```bash
   # Check group count
   node -p "JSON.parse(require('fs').readFileSync('src/assets/constitution.json')).groups.length"

   # Sample first group
   node -p "JSON.parse(require('fs').readFileSync('src/assets/constitution.json')).groups[0]"
   ```

2. **Test Navigation:**
   - Tap group with 1 article → Should go to Reader
   - Tap group with multiple articles → Should show ArticleList
   - From ArticleList, tap article → Should go to Reader
   - Use back button → Should return to previous screen

3. **Check Search:**
   - Search still works with individual articles
   - Bookmarks link to correct articles

## Future Enhancements

Potential improvements:

1. **Chapter/Part Headers**
   - Group by CHAPTER I, CHAPTER II, etc.
   - Use SectionList with sticky headers

2. **Article Numbering Display**
   - Show "Article 161 (A-C)" for ranges
   - Highlight current article in group

3. **Quick Jump**
   - Add alphabet sidebar for fast scrolling
   - Jump to specific article number

4. **Related Articles**
   - Show "See also Article X" links
   - Cross-references between sections

5. **Breadcrumb Navigation**
   - Show "Chapter > Article > Sub-article" path
   - Tap breadcrumb to navigate up

## Summary

✅ **Completed:**
- Enhanced parser with intelligent grouping
- 931 articles organized into 227 logical groups
- New ArticleList screen for sub-articles
- Updated Library UI with grouped display
- Smart navigation based on article count
- Full TypeScript type safety

📱 **Ready to Use:**
Run `npm run parse:v3` to regenerate data, then start your app to see the new grouped Library interface!



