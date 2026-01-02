# App Size Optimization Strategies

**Current Size:** 761 MB (460 PDFs)
**Target Goal:** <200 MB for initial install

---

## Analysis

### Largest Files:
1. Labour Act: 47 MB
2. Customs Act: 21 MB
3. National Registration Act: 17 MB
4. Guyana Shipping Act: 16 MB
5. Trade Marks Act: 14 MB

**Top 5 = 115 MB (15% of total!)**

### Largest Categories:
1. Uncategorized: 244 MB
2. Criminal Justice: 67 MB
3. Commercial Business: 63 MB
4. Labor Employment: 56 MB
5. Tax Revenue: 46 MB

---

## Strategy 1: **Tiered Download** (Recommended - Best UX)

### Ship Essential Acts Only
**Initial APK:** ~100-150 MB with top 50 most-used Acts

**Implementation:**
```
Phase 1 - Bundled (Essential Acts):
- Constitution (12 MB) ✅ Already have
- Top 50 most-accessed Acts (~100 MB)
  - Criminal Justice (key Acts)
  - Know Your Rights (Tier A)
  - Family/Social (Tier B)

Phase 2 - On-Demand Download:
- Remaining 400+ Acts available for download
- User taps Act → "Download to view offline" prompt
- Download once, cache locally
- ~500-600 MB total if user downloads all
```

**Pros:**
- ✅ Small initial install (~150 MB)
- ✅ Fast app updates
- ✅ Users only download what they need
- ✅ Full offline access after first download

**Cons:**
- ❌ Requires internet for first-time access to non-bundled Acts
- ❌ Need server to host PDFs (or use EAS CDN)

---

## Strategy 2: **PDF Compression**

### Compress Large PDFs
Use Ghostscript or similar to compress oversized PDFs:

```bash
# Example: Labour Act 47 MB → ~15-20 MB
gs -sDEVICE=pdfwrite \
   -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/ebook \
   -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=compressed.pdf \
   input.pdf
```

**Settings:**
- `/screen` = lowest quality, smallest size (~10-20 MB reduction)
- `/ebook` = medium quality, good size (~30-40% reduction)
- `/printer` = good quality, moderate reduction

**Impact:**
- Labour Act: 47 MB → ~20-25 MB (50% reduction)
- Top 20 PDFs: ~250 MB → ~100-130 MB
- **Total: 761 MB → ~400-500 MB**

**Pros:**
- ✅ All Acts still bundled offline
- ✅ Significant size reduction
- ✅ No code changes needed

**Cons:**
- ❌ Slightly lower PDF quality
- ❌ Need to compress 460 PDFs
- ❌ Still large (400-500 MB)

---

## Strategy 3: **Hybrid - Parse + PDF** (Best Long-Term)

### Extract Text for Reading, Keep PDFs for Reference

**Phase 1 - Text Parsing (Priority Acts):**
- Parse top 100 most-used Acts → SQLite text
- Small, searchable, offline
- ~20-30 MB for 100 Acts of text

**Phase 2 - PDF Access:**
- "View Original PDF" button → downloads PDF on demand
- Or bundle compressed PDFs for offline

**Implementation:**
1. Use our manual parsing strategy (case-by-case)
2. Start with Tier A (Know Your Rights) - 10 Acts
3. Expand to other tiers based on usage analytics
4. Keep PDFs as downloadable reference

**Pros:**
- ✅ Tiny initial app (~80-100 MB with essential text)
- ✅ Fast search (FTS5)
- ✅ Consistent UX with Constitution
- ✅ PDFs available when needed

**Cons:**
- ❌ Time investment to parse (10-14 hours)
- ❌ Need to maintain both text and PDFs

---

## Strategy 4: **Split APKs by Category** (Advanced)

### Create Multiple App Variants
- Law Pal GY - Essential (150 MB)
- Law Pal GY - Full (750 MB)
- Law Pal GY - Professional (all + downloadable)

**Pros:**
- ✅ Users choose what they need
- ✅ Essential version gets more downloads

**Cons:**
- ❌ Maintain multiple builds
- ❌ Confusing for users

---

## Recommended Approach: **Hybrid Strategy**

### Immediate (This Week):
1. **Compress large PDFs** (top 50 over 5 MB)
   - Tool: Ghostscript or online PDF compressor
   - Settings: `/ebook` quality
   - Expected reduction: 761 MB → ~450-500 MB
   - Time: 2-3 hours

2. **Ship compressed PDF version**
   - APK: ~500-550 MB
   - All Acts available offline
   - Good enough for v1.0

### Next Sprint (v1.1):
3. **Add tiered download system**
   - Bundle top 50 Acts (~150 MB)
   - Others downloadable on-demand
   - APK: ~200 MB, up to 750 MB if user downloads all

### Long-Term (v2.0):
4. **Parse high-use Acts to text**
   - Identify top 20-30 Acts from analytics
   - Parse to SQLite (like Constitution)
   - Keep PDFs as "View Original" option
   - APK: ~100-150 MB

---

## Implementation: Quick PDF Compression

### Compress All PDFs >5 MB

```bash
# Create compressed version
mkdir -p law_sources_compressed

# Compress large PDFs
find law_sources -name "*.pdf" -size +5M -exec sh -c '
  input="$1"
  output="law_sources_compressed/${input#law_sources/}"
  mkdir -p "$(dirname "$output")"
  gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
     -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH \
     -sOutputFile="$output" "$input"
' _ {} \;

# Copy small PDFs as-is
find law_sources -name "*.pdf" ! -size +5M -exec sh -c '
  input="$1"
  output="law_sources_compressed/${input#law_sources/}"
  mkdir -p "$(dirname "$output")"
  cp "$input" "$output"
' _ {} \;
```

**Result:**
- `law_sources/` → 761 MB (original)
- `law_sources_compressed/` → ~400-500 MB (compressed)
- Use compressed for builds
- Keep original as backup

---

## Other Optimizations

### 1. Remove Unnecessary Assets
```
# Check current asset sizes
du -sh assets/*

# Optimize images
- Use WebP instead of PNG (50-80% smaller)
- Compress icon.png, splash-icon.png
```

### 2. Enable Proguard/R8 (Android Code Minification)
Add to `android/app/build.gradle`:
```gradle
buildTypes {
  release {
    minifyEnabled true
    shrinkResources true
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
  }
}
```
**Saves:** ~5-10 MB in code/libraries

### 3. Use Android App Bundle (AAB) Instead of APK
- Google Play optimizes delivery
- Users download only resources for their device
- **Saves:** ~10-20% size

---

## Size Comparison

| Approach | Initial Download | Total Offline | Pros |
|----------|-----------------|---------------|------|
| **Current (All PDFs)** | 750 MB | 750 MB | Simple, all offline |
| **Compressed PDFs** | 450-500 MB | 450-500 MB | 35% smaller, all offline |
| **Tiered Download** | 150 MB | 750 MB | 80% smaller initial |
| **Parsed Text** | 100 MB | 100 MB | 87% smaller, fast search |
| **Hybrid (Parsed + Download)** | 150 MB | 200-400 MB | Best balance |

---

## My Recommendation

### For This Build:
1. Let current build finish (or cancel and compress first)
2. **Compress large PDFs** (2-3 hours work)
3. Rebuild with compressed PDFs
4. Ship v1.0 with ~500 MB APK

### For v1.1 (Next Week):
5. Implement tiered downloads
6. Bundle only essential Acts
7. APK drops to ~200 MB

### For v2.0 (After Launch):
8. Analyze which Acts users access most
9. Parse top 20-30 to text
10. APK down to ~100-150 MB

---

## Quick Win: Compress Now

Want me to help you set up PDF compression? I can:
1. Install Ghostscript (or use online tool)
2. Compress all PDFs >5 MB
3. Test compressed quality
4. Replace in `law_sources/`
5. Rebuild with ~40% size reduction

**Time:** 2-3 hours
**Result:** 761 MB → ~450 MB (300 MB saved!)

Would you like to do this now before the build completes?



