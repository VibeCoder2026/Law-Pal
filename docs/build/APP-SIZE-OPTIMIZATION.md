# App Size Optimization Strategies (On-Demand PDFs)

**Current Model:** Acts PDFs download on demand and are cached locally.
**Goal:** Keep initial install small while allowing offline access after download.

---

## Current State

- Base APK does NOT bundle PDFs.
- First open of an Act downloads the PDF from `src/assets/acts-pdf-urls.json`.
- PDFs are cached locally for offline use.

**Impact:** Initial install is much smaller; storage usage grows as users download PDFs.

---

## Primary Levers

### 1. Keep on-demand downloads (default)
**Pros:** Smallest initial install, fastest updates
**Cons:** Requires internet on first open

### 2. Compress PDFs on the server
Reduce bandwidth and cache size by compressing PDFs before hosting.
- Use Ghostscript with `/ebook` or `/screen`
- Validate quality for legal text readability

### 3. Optional offline packs
Offer grouped downloads (e.g., Criminal, Family, Business) so users can bulk-download what they need.

### 4. Cache management
Add a storage screen to:
- Show cached PDFs size
- Clear old downloads
- Prefer Wi-Fi for large downloads

---

## Recommendations

**Short term (v1):**
- Stay on-demand
- Compress only the largest PDFs on the server

**Mid term (v1.1):**
- Add optional offline packs
- Add cache management UI

**Long term (v2):**
- Parse high-use Acts into SQLite text for faster search
- Keep PDFs as optional reference downloads

---

## Checklist

- [ ] Verify `src/assets/acts-pdf-urls.json` coverage
- [ ] Confirm PDF download + cache works on device
- [ ] Add cache management UI (optional)
