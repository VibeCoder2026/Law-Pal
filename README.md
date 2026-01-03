# Law Pal GY - Constitution Reader

A mobile app for reading and searching the Constitution of Guyana offline, built with React Native and Expo.

## Features

- **Offline-first**: All constitution content stored in SQLite database with FTS5 search
- **Full-text search**: Fast search across all sections with relevance ranking
- **Bookmarks**: Save sections for quick access (persists across app restarts)
- **Reader controls**: Dark mode, adjustable font size, share excerpts
- **Smart navigation**: Jump directly to sections by number (e.g., "146", "212A")
- **Content versioning**: Automatic database updates when content changes
- **Premium UX**: Enhanced list rows with preview text, stable navigation
- **On-demand PDFs**: Acts PDFs download when opened and remain available offline

## How to Run

### Prerequisites
- Node.js 16+ and npm
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (for development)

### Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npx expo start
```

3. Run on your device:
   - Press `a` for Android emulator
   - Press `i` for iOS simulator (macOS only)
   - Scan QR code with Expo Go app for physical device testing

### Production Build

For Android APK:
```bash
npx eas build --platform android --profile preview
```

For iOS:
```bash
npx eas build --platform ios --profile preview
```

## Tech Stack

- **React Native** 0.81.5 with **Expo** 54.0.30
- **TypeScript** 5.9.2
- **SQLite** with FTS5 (Full-Text Search) via expo-sqlite ~16.0.10
- **React Navigation** 7.x for screen navigation
- **AsyncStorage** 2.2.0 for persistent preferences
- **Expo Vector Icons** (Ionicons)

## Project Structure

```
constitution-reader/
├── src/
│   ├── db/              # Database service with content versioning
│   │   └── database.ts  # SQLite operations, FTS5, migrations
│   ├── screens/         # Main app screens
│   │   ├── HomeScreen.tsx
│   │   ├── LibraryScreen.tsx      # Browse all sections + jump to section
│   │   ├── SearchScreen.tsx       # Full-text search
│   │   ├── ReaderScreen.tsx       # Reader with controls + share
│   │   └── BookmarksScreen.tsx
│   ├── contexts/        # React contexts
│   │   └── ThemeContext.tsx       # Dark mode + font size state
│   ├── navigation/      # React Navigation setup
│   ├── types/           # TypeScript type definitions
│   ├── constants/       # App constants
│   │   └── index.ts     # CONTENT_VERSION, DOC_ID, STORAGE_KEYS
│   ├── assets/          # Constitution JSON data
│   │   └── constitution.json
│   └── components/      # Reusable UI components
├── App.tsx              # Main app entry point
└── package.json
```

## Documentation

- [docs/README.md](docs/README.md) - Index of guides, build notes, status, and logs

## Scripts & Tools

- `tools/` - Parsing and import utilities for legal documents (see `tools/README.md`)
- `tools/analysis/` - One-off analysis helpers (e.g., header detection, structure checks)

## Repository Notes

- `src/config/apikey.ts` is ignored by Git; copy `src/config/apikey.example.ts` and add your key locally.
- `law_sources/` contains large PDFs and is not tracked; run `node tools/download-legal-pdfs.js` or use Git LFS if you want to publish the assets.

## Content Import & Versioning

The app uses a **content versioning system** to automatically update the database when JSON content changes:

### How It Works

1. **Version Constant**: `CONTENT_VERSION` in [src/constants/index.ts](src/constants/index.ts) (integer)

2. **On App Launch**: `DatabaseService.init()` in [App.tsx:24](App.tsx#L24) checks:
   - Stored version from AsyncStorage
   - Current version from constants
   - If versions differ → trigger migration

3. **Migration Process** (when version changes):
   ```
   1. Backup all bookmarks (doc_id + chunk_id pairs)
   2. Drop sections and sections_fts tables
   3. Recreate tables with fresh schema
   4. Import content from constitution.json (batch insert)
   5. Restore bookmarks using stable chunk_ids
   6. Update stored version in AsyncStorage
   ```

4. **Updating Content**:
   - Update [src/assets/constitution.json](src/assets/constitution.json)
   - Increment `CONTENT_VERSION` in [src/constants/index.ts](src/constants/index.ts)
   - Next app launch automatically reimports data
   - **Bookmarks survive updates** (stored by stable chunk_id)

### Stable ID System

The app uses **stable identifiers** everywhere to ensure reliability:

- **doc_id**: Document identifier (e.g., `'constitution'`)
- **chunk_id**: Unique section identifier (e.g., `'sec-146'`, `'sec-212A'`)

All navigation, bookmarks, and database queries use `chunk_id` - **never array indices or row IDs**. This ensures:
- Bookmarks survive database migrations
- Deep links remain stable across updates
- Search results always navigate to correct sections

### Database Schema

```sql
-- Main sections table (content storage)
CREATE TABLE sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id TEXT NOT NULL,
  chunk_id TEXT NOT NULL UNIQUE,    -- Stable identifier
  section_number TEXT NOT NULL,
  heading TEXT,
  text TEXT NOT NULL,
  part TEXT,
  chapter TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- FTS5 virtual table (full-text search index)
CREATE VIRTUAL TABLE sections_fts USING fts5(
  chunk_id UNINDEXED,
  section_number,
  heading,
  text,
  content=sections,
  content_rowid=id
);

-- Bookmarks table (survives migrations)
CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id TEXT NOT NULL,
  chunk_id TEXT NOT NULL,           -- Logical reference to sections.chunk_id (No FK to allow table dropping)
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  UNIQUE(doc_id, chunk_id)
);
```

Auto-sync triggers keep `sections_fts` in sync with `sections` table on insert/update/delete.

## Data Format

Constitution content is stored in [src/assets/constitution.json](src/assets/constitution.json):

```json
{
  "doc_id": "constitution",
  "title": "Constitution of the Co-operative Republic of Guyana",
  "sections": [
    {
      "chunk_id": "sec-146",
      "section_number": "146",
      "heading": "Executive authority of Guyana",
      "text": "The executive authority of Guyana belongs to...",
      "part": "PART VIII",
      "chapter": "THE EXECUTIVE"
    }
  ]
}
```

### Field Descriptions

- **chunk_id**: Unique stable ID (required) - format: `sec-{number}` or `sec-{number}{letter}`
- **section_number**: Display number (required) - e.g., "146", "212A"
- **heading**: Section title (optional but recommended)
- **text**: Full section content (required)
- **part**: Organizational grouping (optional)
- **chapter**: Organizational grouping (optional)

## Testing Checklist

### Must-Pass Offline Flows

Run these tests to verify core functionality:

#### ✅ 1. Library → Reader Flow
- [ ] Open Library tab
- [ ] Tap any section (e.g., "Section 146")
- [ ] Reader opens with **full section text** displayed
- [ ] Section number and heading match
- [ ] Back button returns to Library
- [ ] **Test 3+ different sections** to verify consistency

#### ✅ 2. Search → Reader Flow
- [ ] Open Search tab
- [ ] Search for "president" or any keyword
- [ ] Tap a search result
- [ ] Reader opens with **exact matching section**
- [ ] Verify section number matches search result
- [ ] Search term should be visible in content
- [ ] **Try 3+ different searches** and tap results

#### ✅ 3. Bookmark Persistence Flow
- [ ] Open any section in Reader
- [ ] Tap bookmark icon (should fill in solid)
- [ ] Go to Bookmarks tab - section appears in list
- [ ] **Force close app** (swipe away from recent apps)
- [ ] Reopen app
- [ ] Check Bookmarks tab - **bookmark still exists**
- [ ] Tap bookmarked section - Reader opens correct content
- [ ] Tap bookmark icon again to remove
- [ ] Return to Bookmarks tab - bookmark removed

### Content Versioning Test

#### ✅ 4. Version Update Flow (Advanced)
- [ ] Note current `CONTENT_VERSION` value in [src/constants/index.ts](src/constants/index.ts)
- [ ] Create a bookmark on any section
- [ ] Increment `CONTENT_VERSION` by 1
- [ ] Force close and restart app
- [ ] Check Metro bundler console logs:
  - Should see `[DB] Version mismatch - reimporting content...`
  - Should see `[DB] Content import complete`
- [ ] Verify bookmark **still exists** in Bookmarks tab
- [ ] Open bookmarked section - text loads correctly

### UI/UX Features

#### ✅ 5. Jump to Section
- [ ] Library tab → "Jump to section" input at top
- [ ] Enter valid section number (e.g., "146")
- [ ] Press Go/Enter on keyboard
- [ ] Reader opens **correct section**
- [ ] Try section with letter suffix (e.g., "212A")
- [ ] Try invalid number (e.g., "999999")
- [ ] Should show "Section Not Found" alert

#### ✅ 6. Reader Controls
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

#### ✅ 7. Share Feature
- [ ] Open any section in Reader
- [ ] Tap share icon (top right)
- [ ] Native share dialog appears
- [ ] Preview text includes:
  - "Constitution of Guyana — Section {number}"
  - Section heading (if available)
  - Full section content
- [ ] Share via messaging app to verify format
- [ ] Shared text should be well-formatted

### Performance & Edge Cases

#### ✅ 8. First Launch
- [ ] Uninstall app completely
- [ ] Reinstall and launch
- [ ] App initializes database (~2-3 seconds)
- [ ] Library shows all sections loaded
- [ ] Search works immediately
- [ ] No crashes or errors

#### ✅ 9. Offline Operation
- [ ] Enable airplane mode / disable WiFi and cellular
- [ ] All screens function normally:
  - Library browsing
  - Search
  - Reader
  - Bookmarks
- [ ] No "no internet" errors
- [ ] Content loads instantly

## Key Features Explained

### Library Screen
- **Jump to Section** input at top - type section number (e.g., "146" or "212A") to navigate directly
- **Enhanced list rows**:
  - Line 1: Section {number} — {heading}
  - Line 2: Preview text (first ~140 characters)
  - Fallback to first sentence if no heading

### Search Screen
- **FTS5 full-text search** - searches section numbers, headings, and content
- Results ranked by relevance
- Limited to 50 results for performance
- Tap result → navigates to Reader with exact section

### Reader Screen
- **Share button** - shares section with formatted header
- **Bookmark button** - saves for quick access
- **Settings button** - opens font size and dark mode controls
- **Back button** - returns to previous screen
- **Responsive font sizing** - respects user preference
- **Dark mode support** - persists across sessions

### Bookmarks Screen
- Shows all bookmarked sections
- Tap to open in Reader
- Swipe to delete (platform-specific)
- Survives app restarts and content updates

## Known Limitations

- PDF viewing requires production APK build (not available in Expo Go during development)
- First-time PDF access requires an internet connection to download the file
- First app launch imports ~400 sections (takes 2-3 seconds)
- Search limited to 50 results for performance
- FTS5 queries don't support wildcards within words

## Troubleshooting

### Database not updating after JSON changes
- Increment `CONTENT_VERSION` in [src/constants/index.ts](src/constants/index.ts)
- Force close and restart app
- Check console for "Version mismatch" message

### Bookmarks lost after update
- Ensure bookmark uses stable `chunk_id` (not array index)
- Check `chunk_id` format matches JSON data
- Verify migration logic preserved bookmarks

### Search not working
- Verify database initialization completed
- Check console for FTS5 errors
- Try restarting app to trigger fresh import

### App crashes on startup
- Clear app data: Settings → Apps → Guyana Laws → Clear Data
- Reinstall app
- Check console for initialization errors

## Development Notes

### Adding New Content
1. Update `src/assets/constitution.json` with new sections
2. Ensure each section has unique `chunk_id`
3. Increment `CONTENT_VERSION` in `src/constants/index.ts`
4. Test migration preserves existing bookmarks

### Code Organization
- **Database logic**: [src/db/database.ts](src/db/database.ts)
- **Navigation types**: [src/types/index.ts](src/types/index.ts)
- **Theme state**: [src/contexts/ThemeContext.tsx](src/contexts/ThemeContext.tsx)
- **Constants**: [src/constants/index.ts](src/constants/index.ts)

## License

Copyright © 2025. All rights reserved.
