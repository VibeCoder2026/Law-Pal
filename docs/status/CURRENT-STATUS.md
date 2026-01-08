# Law Pal GY - Current Status

**Date:** 2026-01-06
**Build Status:** Local dev build installed (expo run:android)

---

## Recent Updates

- AI retrieval: AND-first/OR-fallback FTS, stopword filtering, Act title boost, balanced Acts + Constitution context.
- Conversational guardrails: tone routing (domestic, criminal, rights) and no repeated greetings in responses.
- AI citations: context now lists explicit `doc_id` and `chunk_id` values to reduce link mismatch.
- PDF access: Acts download on demand with local caching; Constitution PDF deep-links to correct pages.
- Home UI: Options grid tiles, disclaimer placed directly under the grid (no divider), pins refresh on focus.
- Loading screen: congress/landmark icon added to match legal theme.
- App icon: `assets/app_icon.png` set in `app.config.js` (requires rebuild/reinstall).
- Android icon: native mipmaps in `android/app/src/main/res/mipmap-*` now use `assets/app_icon.png` (requires rebuild to take effect).
- Constitution UI: labels updated to “Article” for Constitution items, with a browse hint on the Library screen.

## Core Features (Working)

- Constitution reader, full-text search (FTS5), bookmarks, and dark mode.
- Acts library with tiered navigation and native PDF viewer.
- AI assistant with citations, suggestions, and feedback controls.
- On-demand PDF downloads with offline reuse after first download.

## In Progress

- Validate coverage of all Acts in `src/assets/acts-pdf-urls.json`.
- Icon refresh (requires rebuild/reinstall to show on device).
- Optional packs or grouped downloads for Acts.

## App Size Notes

- Base install is smaller because PDFs are not bundled.
- First open of an Act requires network; subsequent opens are offline (cached).

## Next Steps

1. Spot-check Act-only queries and confirm citations.
2. Test PDF downloads across multiple tiers and verify caching.
3. Finish doc updates that still describe bundled PDFs.

## Coming Soon

- Legal Scenario Simulator: guided interviews that generate a personalized legal checklist with citations.
