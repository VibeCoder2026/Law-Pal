# Session Summary - Law Pal GY

**Date:** 2026-01-03
**Focus:** AI retrieval, UI navigation, and PDF access updates

---

## Completed Work

### 1. AI Retrieval and Tone
- AND-first/OR-fallback FTS search with keyword sanitization
- Act title boost to avoid Constitution-only answers
- Balanced context selection across Acts and Constitution
- Tone routing (friendly/warm/formal) and a prompt rule to avoid repeated greetings
- Suggested follow-up questions parsed from the model output
- Feedback stored in `ai_feedback`

### 2. PDF Delivery and Deep Links
- Acts PDFs now download on demand and cache to device storage
- URL map generated at `src/assets/acts-pdf-urls.json`
- Constitution PDF page index generated for page-accurate opens
- `ActPdfViewer` supports `initialPage` when available

### 3. Home UI Navigation
- "Categories" renamed to "Options"
- Options list scrolls vertically only when pins exist; static otherwise
- Pinned Acts row loops horizontally when pins exist
- Legal disclaimer stays pinned at the bottom of the home screen
- Pin state refreshes on focus so pins appear immediately

### 4. Tooling and Config
- `tools/parse/build-constitution-page-index.py` added for page index regeneration
- `tools/README.md` updated with page index instructions
- VS Code empty editor hint disabled (local settings)

### 5. Beta UX Improvements
- Home "Recent" section shows last-opened Acts and Articles
- Acts list shows download status with a "Downloaded only" filter
- Act PDF viewer remembers the last-read page
- Removed unused `LibraryScreen.old.tsx`
- Ignored `tools/tmp/` artifacts in `.gitignore`

### 6. Stability + Config
- AI rate limiting to protect API quotas
- PDF download retry with backoff
- Centralized limits in `APP_CONFIG`
- Tooling-only deps moved to devDependencies
- `.env`-based API key loading via app config
- Analytics event queue stored locally for later export/integration

---

## Current Status
- Dev build runs with on-demand PDF downloads
- AI responses cite sources and adjust tone by topic
- Home menu uses looping lists when pins exist

## Known Gaps / Follow-ups
- Verify PDF URL coverage for all Acts (missing entries show "not available")
- Update remaining build docs that still describe bundled PDFs
- Rebuild app after icon updates to see the new icon on device

## Key Files Touched
- `src/services/AIService.ts`
- `src/db/database.ts`
- `src/screens/ActPdfViewerScreen.tsx`
- `src/screens/ReaderScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/assets/acts-pdf-urls.json`
- `src/assets/constitution-page-index.json`
- `tools/parse/build-constitution-page-index.py`

---

**Date:** 2026-01-05
**Focus:** Tooling and docs structure cleanup

## Completed Work
- Split `tools/` into `analysis/`, `download/`, `import/`, `inspect/`, `parse/`, and `output/`
- Moved parsing, import, and scraping scripts into the new folders
- Updated tool scripts to resolve paths from repo root for consistent execution
- Updated `tools/README.md` and docs references to the new paths
- Updated `tools/package.json` scripts to point at the new locations

## Key Files Touched
- `tools/README.md`
- `tools/package.json`
- `tools/analysis/analyze-pdf-structure.js`
- `tools/download/download-legal-pdfs.js`
- `tools/import/import-acts.js`
- `tools/inspect/inspect-pdf.js`
- `tools/parse/parse-constitution-v3.js`

---

**Date:** 2026-01-06
**Focus:** Home screen polish and loading branding

## Completed Work
- Updated the Home screen disclaimer to sit directly below the Options grid
- Removed the disclaimer divider line
- Swapped the loading icon to a congress/landmark icon
- Set the app icon to `assets/app_icon.png` (requires rebuild to display on device)
- Updated Constitution UI labels to use "Article" and added a browse hint in the Library screen
- Replaced Android launcher mipmaps with `assets/app_icon.png` (requires clean rebuild to show on device)
- Updated AI context format to include explicit `doc_id` and `chunk_id` for citation reliability

## Key Files Touched
- `src/screens/HomeScreen.tsx`
- `src/components/LoadingScreen.tsx`
- `app.config.js`

---

**Date:** 2026-01-08
**Focus:** EAS production build stability

## Completed Work
- Removed `NODE_ENV=production` from `eas.json` production profile to keep dev deps available during EAS installs
- Updated production build docs to warn against `NODE_ENV` in EAS profiles

## Key Files Touched
- `eas.json`
- `docs/build/PRODUCTION-BUILD-STEPS.md`

---

**Date:** 2026-01-08
**Focus:** Production APK build + AI proxy env

## Completed Work
- Production APK build completed
- Identified missing `EXPO_PUBLIC_AI_PROXY_URL` in EAS production env (AI chat disabled in APK)

## Follow-ups
- Add `EXPO_PUBLIC_AI_PROXY_URL` to EAS production env and rebuild
