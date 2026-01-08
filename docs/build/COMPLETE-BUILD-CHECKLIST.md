# Complete Build Checklist - On-Demand PDFs

## Update (Jan 2026)

Acts PDFs are downloaded on demand and cached locally. This means:
- Do NOT bundle `law_sources/` into the APK.
- First open of an Act requires internet; later opens are offline.
- Verify `src/assets/acts-pdf-urls.json` coverage for Acts.

**Goal:** Build a complete dev APK with all features working.

---

## What Should Be Included

### Core Features
1. Constitution reader (SQLite, search, bookmarks)
2. Acts library (metadata + tiered navigation)
3. PDF viewer (downloads on demand, cached locally)
4. AI chat (proxy via Cloudflare Worker)
5. Search (FTS5 across Constitution + Acts)
6. UI/UX (tabs, dark mode, loading states)

---

## Build Steps (Development)

### Step 1: Configure environment
- Local: add `EXPO_PUBLIC_AI_PROXY_URL` in `.env`
- EAS: set `EXPO_PUBLIC_AI_PROXY_URL` for preview/production builds

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Build and install dev client
```bash
npx expo run:android
```

### Step 4: Start Metro
```bash
npx expo start --dev-client
```

---

## Verification Checklist

### App launch
- [ ] App opens without crash
- [ ] Loading screen appears
- [ ] Home screen loads

### Constitution
- [ ] Library -> Constitution loads
- [ ] Open an Article and read content
- [ ] Bookmark an Article and see it in Bookmarks

### Acts + PDF
- [ ] Acts -> Tier -> Act opens
- [ ] First open downloads PDF
- [ ] PDF displays with page navigation
- [ ] Reopen Act offline (cached)

### AI chat
- [ ] AI responds with citations
- [ ] If error, confirm proxy URL is set

### Search
- [ ] Search returns results
- [ ] Tap result opens Reader

---

## Troubleshooting

### PDF not loading
- Confirm Act exists in `src/assets/acts-pdf-urls.json`
- Ensure device has network on first open
- Delete cached file and retry (or clear app storage)

### AI chat error
- Check `EXPO_PUBLIC_AI_PROXY_URL` in `.env` and EAS
- Verify Worker is deployed and responding

### Build errors after native changes
- Remove build artifacts:
```bash
Remove-Item -Recurse -Force android\app\.cxx, android\app\build, android\.gradle
```
- Rebuild: `npx expo run:android`

---

## Success Criteria

- [ ] App installs and launches
- [ ] Constitution + Acts work
- [ ] PDFs download and cache
- [ ] AI chat responds
- [ ] Base APK size is small (PDFs not bundled)
