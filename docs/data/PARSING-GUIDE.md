# PDF Parsing Guide for Guyana Constitution

## Problem Solved

You had a 12.1 MB PDF of Guyana's Constitution that was too large to upload to Claude directly. This guide documents the solution: a local PDF parser that extracts structured data for your Constitution Reader app.

## What Was Created

### 1. PDF Parser Tools (`tools/` directory)

Three Node.js scripts to process the Constitution PDF:

- **`parse-constitution.js`** - Original parser (basic implementation)
- **`parse-constitution-v2.js`** - Improved parser (✅ recommended)
- **`inspect-pdf.js`** - PDF analysis tool

### 2. Package Configuration

- **`tools/package.json`** - Dependencies and scripts
- Uses `pdf-parse` library for PDF text extraction

## Quick Start

```bash
# 1. Navigate to tools directory
cd tools

# 2. Install dependencies (already done)
npm install

# 3. Run the improved parser
npm run parse:v2
```

This will:
- Read `law_sources/constitution.pdf` (376 pages, 644K characters)
- Extract **945 sections** with headings and text
- Generate `src/assets/constitution.json`
- Your app will automatically use the new data

## Output Format

The parser generates JSON matching your app's expected structure:

```json
{
  "doc_id": "guyana-constitution",
  "title": "Constitution of the Co-operative Republic of Guyana",
  "sections": [
    {
      "chunk_id": "sec-1",
      "section_number": "5",
      "heading": "Exercise of powers of Parliament before appointed day.",
      "text": "Full text content..."
    }
    // ... 944 more sections
  ]
}
```

## PDF Analysis Results

From `npm run inspect`:

- **Pages:** 376
- **Total text:** 644,673 characters
- **Articles found:** 206 article markers
- **Chapters:** 41 chapters
- **Parts:** 24 parts
- **Sections extracted:** 945 (includes articles, rules, schedules, etc.)

## Parser Strategies

### Method 1: Original Parser
- Uses Article pattern matching
- Found: 13 sections
- Status: ⚠️ Too conservative

### Method 2: Improved Parser (Recommended)
- Uses numbered section pattern (`\d+.`)
- Handles complex layouts
- Found: 945 sections
- Status: ✅ Best results

## How the Parser Works

1. **Load PDF:** Reads binary data from `constitution.pdf`
2. **Extract Text:** Uses `pdf-parse` to convert PDF to plain text
3. **Pattern Matching:** Finds sections by detecting patterns like:
   - `5. Exercise of powers...`
   - `Article 123A. Some heading...`
4. **Structure Data:** Creates JSON objects with:
   - `chunk_id`: Unique identifier
   - `section_number`: Original section number
   - `heading`: Section title
   - `text`: Section content
5. **Save Output:** Writes to `src/assets/constitution.json`

## Customizing the Parser

If you need to adjust the parsing logic, edit `parse-constitution-v2.js`:

```javascript
// Line ~50: Adjust article pattern matching
const articleMatch = line.match(/^(\d+[A-Z]*)\.\s+(.+)$/i);

// Line ~80: Modify text extraction
articleText.push(line);

// Line ~110: Alternative regex pattern
const articlePattern = /(\d{1,3}[A-Z]*)\.\s+([^\n]+)/g;
```

## Troubleshooting

### Issue: Parser finds too few sections
**Solution:** Use `parse:v2` instead of `parse`

### Issue: Text looks messy or incomplete
**Cause:** PDF text extraction isn't perfect for complex layouts
**Solution:** Adjust cleaning logic in `extractArticles()` function

### Issue: Missing specific articles
**Solution:** Run `npm run inspect` to analyze PDF structure, then adjust regex patterns

### Issue: Duplicate sections
**Cause:** Multiple pattern matches for same content
**Solution:** Add deduplication logic based on `section_number`

## Testing Your Changes

After parsing, verify the output:

```bash
# Check section count
cd ../src/assets
node -p "JSON.parse(require('fs').readFileSync('constitution.json')).sections.length"

# View first section
node -p "JSON.parse(require('fs').readFileSync('constitution.json')).sections[0]"

# Search for specific article
node -p "JSON.parse(require('fs').readFileSync('constitution.json')).sections.find(s => s.section_number === '1')"
```

## Integration with Your App

The app automatically loads from `src/assets/constitution.json`:

- **Database Service** ([src/services/database.ts:96](../../src/services/database.ts#L96)) - Seeds SQLite database
- **Library Screen** ([src/screens/LibraryScreen.tsx](../../src/screens/LibraryScreen.tsx)) - Displays all sections
- **Search Screen** ([src/screens/SearchScreen.tsx](../../src/screens/SearchScreen.tsx)) - Full-text search
- **Reader Screen** ([src/screens/ReaderScreen.tsx](../../src/screens/ReaderScreen.tsx)) - Shows section content

After parsing, simply restart your app to see the new data!

## Future Improvements

Consider these enhancements:

1. **Better Text Extraction:** Use OCR for scanned PDFs
2. **Hierarchy Preservation:** Maintain Chapter/Part/Article structure
3. **Cross-References:** Link related sections
4. **Metadata Extraction:** Dates, amendments, repealed sections
5. **Multi-Document Support:** Parse other legal documents

## Summary

✅ **Completed:**
- Created PDF parser infrastructure
- Extracted 945 sections from 376-page PDF
- Generated properly structured JSON
- Documented the entire process

✅ **Ready to Use:**
- Run `npm run parse:v2` anytime to re-parse the PDF
- Your app will automatically use the new data
- No need to upload large files to Claude anymore

🎉 Your Constitution Reader app now has complete data from the source PDF!



