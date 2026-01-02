# Manual PDF Parsing Strategy - Case by Case Approach

## Goal
Extract full legal text from all 459 Acts by analyzing and handling each PDF structure individually, rather than using a generic parser.

---

## Why This Approach

**Problems with Generic Parser:**
- ❌ Only extracted headings (10-50 chars)
- ❌ Confused Table of Contents with content
- ❌ Failed on 6 Acts completely
- ❌ Inconsistent across different PDF layouts

**Benefits of Case-by-Case:**
- ✅ Guaranteed accurate extraction
- ✅ Can handle unusual formatting
- ✅ Better than 750 MB APK
- ✅ Consistent with Constitution UX
- ✅ Full-text search works perfectly

---

## Strategy: Pattern-Based Grouping

Instead of 459 unique parsers, identify **common patterns** by tier/category.

### Step 1: Analyze Sample PDFs by Tier

For each tier, pick 2-3 sample Acts:

**Tier A - Know Your Rights (Constitutional/Electoral)**
- Sample: Republic Act, High Court Act
- Pattern: Look for common structure

**Tier B - Family & Safety**
- Sample: Adoption Act, Domestic Violence Act
- Pattern: Identify shared layout

**Tier C - Business & Commerce**
- Sample: Companies Act, Trade Act
- Pattern: Find similarities

### Step 2: Create Pattern Templates

For each pattern found, create extraction logic:

```javascript
// Example: Pattern 1 - Standard Act Format
function parseStandardAct(pdfText) {
  // 1. Skip TOC (find "ARRANGEMENT OF SECTIONS")
  // 2. Find content start (date marker or divider)
  // 3. Extract sections with full text
  // 4. Clean and format
}

// Example: Pattern 2 - Tabular Acts
function parseTabulaAct(pdfText) {
  // Different logic for table-heavy Acts
}
```

### Step 3: Build Category-Specific Parsers

```javascript
const parsingStrategies = {
  'constitutional-electoral': parseStandardAct,
  'criminal-justice': parseStandardAct,
  'family-social': parseFamilyAct,
  'commercial-business': parseCommercialAct,
  // etc.
};
```

### Step 4: Manual Overrides for Edge Cases

For the 6 Acts that failed:
```javascript
const manualOverrides = {
  'act-protection-children': customParser1,
  'act-bureau-statistics': customParser2,
  // etc.
};
```

---

## Implementation Plan

### Phase 1: Analysis (2-3 hours)
1. Pick 3 Acts from each tier (13 tiers × 3 = 39 Acts)
2. Analyze PDF structure for each
3. Group by similar patterns
4. Document pattern characteristics

### Phase 2: Build Parsers (4-6 hours)
1. Create parser for each pattern type (~5-10 patterns)
2. Test on sample Acts
3. Refine until extraction is perfect

### Phase 3: Batch Processing (2-3 hours)
1. Run parsers on all 459 Acts
2. Flag any that fail
3. Handle failures with custom logic or manual extraction

### Phase 4: Quality Check (2 hours)
1. Randomly sample 50 Acts
2. Compare extracted text to PDF
3. Fix any issues found

**Total Time Estimate: 10-14 hours**

---

## Tools We'll Create

### 1. PDF Structure Analyzer
```javascript
// tools/analyze-act-structure.js
// Outputs structure report for a PDF:
// - TOC location
// - Content start markers
// - Section numbering style
// - Special formatting notes
```

### 2. Pattern Detector
```javascript
// tools/detect-pattern.js
// Automatically suggests which parser to use
```

### 3. Batch Processor
```javascript
// tools/batch-parse-acts.js
// Processes all Acts using appropriate parser
// Generates report of successes/failures
```

### 4. Validation Tool
```javascript
// tools/validate-extraction.js
// Compares extracted text length to PDF
// Flags suspiciously short sections
```

---

## Data Model (Same as Constitution)

```sql
-- Acts stored in same sections table
INSERT INTO sections (
  doc_id,           -- act-046-01
  chunk_id,         -- act-046-01-s5
  section_number,   -- "5"
  heading,          -- "Who may adopt"
  text,             -- Full legal text
  ordinal           -- 5
)
```

---

## Example: Analyzing One Act

Let's analyze **Adoption of Children Act (Ch. 46:01)** as example:

```bash
node tools/analyze-act-structure.js law_sources/family-social/Ch_046_01_Adoption_of_Children_Act.pdf
```

**Output:**
```
📄 Adoption of Children Act

Structure Analysis:
  Total pages: 15
  TOC found: Yes (pages 1-2)
  TOC marker: "ARRANGEMENT OF SECTIONS"
  Content starts: Page 3, after "_______________"
  Section style: Numbered (1. 2. 3.)
  Subsection style: Lettered (a), (b), (c)

Pattern Match: STANDARD_ACT_FORMAT
Recommended Parser: parseStandardAct()

Sample extraction:
  Section 5: "Who may adopt"
  Text length: 245 characters ✓
  Full text: "An application for an adoption order may be made by two spouses jointly, or by one person, but..."
```

---

## Quality Metrics

### Success Criteria
- ✅ Extract >95% of Acts successfully
- ✅ Average section length >200 characters
- ✅ All major Acts (top 100 by usage) perfect
- ✅ APK size <100 MB
- ✅ Search works across all Acts

### Current Status (From Previous Attempt)
- ❌ Extracted ~98% of Acts (453/459)
- ❌ But many had only headings (10-50 chars)
- ❌ Need full text extraction

### Target Status
- ✅ Extract 100% of Acts (with manual help for edge cases)
- ✅ All sections have full text (>100 chars average)
- ✅ Formatting preserved (paragraphs, lists)

---

## Advantages Over 750 MB APK

| Aspect | PDF Bundle | Parsed Text |
|--------|-----------|-------------|
| APK Size | 750 MB | ~50-100 MB |
| Install time | 10-15 min | 1-2 min |
| Storage needed | 750 MB+ | 100 MB |
| Search speed | Slow (needs indexing) | Fast (FTS5) |
| Offline access | ✅ Full | ✅ Full |
| Formatting | ✅ Perfect | ⚠️ Good enough |
| User experience | View PDF | Read text |

---

## Next Steps

**Option A: Start Now** (Recommended)
1. Cancel current build
2. Start with Tier A (10 Acts)
3. Perfect the parser for those
4. Expand to other tiers
5. Ship lightweight app

**Option B: Finish Current Build First**
1. Let 750 MB build complete
2. Test PDF viewing works
3. Then work on parsing in parallel
4. Ship v2 with parsed text

**Option C: Hybrid**
1. Ship PDF version now (750 MB)
2. Add "Lite" version with parsed text later
3. Let users choose

---

## Decision Point

Which approach do you prefer?
- **All-in on parsing**: Cancel build, go manual parsing route
- **Ship PDFs now**: Complete current build, parse later for v2
- **Parallel development**: PDF version + parsed version simultaneously

The manual parsing approach is **definitely doable** - we just need to invest the time to handle each PDF properly.



