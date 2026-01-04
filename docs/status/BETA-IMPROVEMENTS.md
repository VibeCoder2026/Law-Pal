# Beta Improvements (Jan 2026)

## Why These Changes

The beta focus is to reduce friction for everyday users in Guyana:
- Help people resume where they left off.
- Make offline readiness obvious.
- Keep navigation fast and predictable.

## What Changed

### 1. Recent Activity (Home)
- Added a "Recent" row for last-opened Acts and Articles.
- Tapping a recent item resumes the document.
- Recent cards show last-opened time and include a Clear action.

### 2. Act Reading Progress
- The Act PDF viewer remembers the last-read page.
- Reopening an Act resumes from that page.

### 3. Download Visibility in Acts List
- Each Act now shows whether it is saved offline.
- A "Downloaded only" filter helps offline users.

### 4. Cleanup
- Removed `src/screens/LibraryScreen.old.tsx` (unused legacy file).
- Ignored `tools/tmp/` generated artifacts.

### 5. Stability + Config
- Added AI rate limiting to protect usage quotas.
- Added retry/backoff for PDF downloads.
- Centralized limits in `APP_CONFIG` (AI, search, UI, downloads).
- Moved tooling-only deps (`puppeteer`, `pdf-parse`) to devDependencies.
- Analytics now stores a local event queue for later export/integration.

## Files Touched

- `src/utils/recentItems.ts`
- `src/screens/HomeScreen.tsx`
- `src/screens/ActPdfViewerScreen.tsx`
- `src/screens/ActsListScreen.tsx`
- `src/screens/ReaderScreen.tsx`
- `src/constants/index.ts`
- `src/types/index.ts`
- `.gitignore`
