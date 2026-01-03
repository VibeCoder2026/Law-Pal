# Legal Documents Tools

This directory contains tools for downloading and parsing Guyana's legal documents.

## Setup

1. Install dependencies:
   ```bash
   cd tools
   npm install
   ```

## Usage

### Parse Constitution PDF

Parses `law_sources/constitution.pdf` and generates `src/assets/constitution.json`:

```bash
# Method 1: Original parser (finds fewer sections)
npm run parse

# Method 2: Improved parser (finds 900+ sections)
npm run parse:v2

# Method 3: Enhanced parser with grouping (✅ RECOMMENDED)
npm run parse:v3

# Inspect PDF structure
npm run inspect
```

**Recommended:** Use `npm run parse:v3` for the best experience. It extracts 931 articles and organizes them into 227 logical groups for easier navigation.

This will:
- Read the PDF from `law_sources/constitution.pdf`
- Extract all sections/articles with their headings and text
- Generate a structured JSON file at `src/assets/constitution.json`
- Print a summary of sections found

## Output Format

The generated JSON follows this structure:

```json
{
  "doc_id": "guyana-constitution",
  "title": "Constitution of the Co-operative Republic of Guyana",
  "sections": [
    {
      "chunk_id": "sec-1",
      "section_number": "1",
      "heading": "Section heading here",
      "text": "Full text of the section..."
    }
  ]
}
```

## Customizing the Parser

If the automatic parsing doesn't work perfectly for your PDF structure, you can modify `parse-constitution.js`:

1. Adjust the regex patterns in `extractSections()` to match your PDF's structure
2. Change how headings are extracted
3. Modify the section numbering logic

## Download Legal Documents (Acts & Statutes)

### 1. Install Puppeteer

```bash
npm install puppeteer
```

### 2. Run the Downloader

```bash
node tools/download-legal-pdfs.js
```

This will:
- Scrape all 52 pages from https://mola.gov.gy/public/laws-of-guyana
- Download ~400-500 legal documents (PDFs)
- Organize them into category folders in `law_sources/`
- Create a catalog.json with metadata

## Build PDF URL Map (for on-demand downloads)

If you want the app to download PDFs on demand instead of bundling them, generate the URL map:

```bash
node tools/build-pdf-url-map.js
```

This outputs `src/assets/acts-pdf-urls.json`, mapping `category/filename.pdf` to the source URL.

**Estimated time:** 30-60 minutes

### Output Structure

```
law_sources/
├── constitutional-electoral/     # Constitution, Elections, Parliament
├── criminal-justice/             # Criminal Law, Police, Courts
├── civil-law/                    # Contracts, Property, Land
├── commercial-business/          # Companies, Trade, Banking
├── labor-employment/             # Labor laws, Unions, Wages
├── tax-revenue/                  # Taxation, Customs
├── family-social/                # Marriage, Adoption, Family
├── administrative-public/        # Public Service, Commissions
├── environment-resources/        # Environment, Forestry, Mining
├── health-welfare/               # Health, Medical, Pharmacy
├── education/                    # Schools, Universities
├── transport-infrastructure/     # Transport, Roads, Aviation
├── finance-banking/              # Banking, Financial Services
├── media-communications/         # Broadcasting, Telecommunications
├── agriculture/                  # Farming, Livestock, Veterinary
├── housing-development/          # Housing, Construction, Planning
├── energy-utilities/             # Energy, Electricity, Water
├── immigration-citizenship/      # Immigration, Passports, Citizenship
├── indigenous-amerindian/        # Indigenous/Amerindian Rights
├── consumer-protection/          # Consumer Protection, Standards
├── uncategorized/                # Other documents
└── catalog.json                  # Complete document catalog
```

## Troubleshooting

### Constitution Parser

**No sections found**: The PDF structure might be different than expected. Check the console output and adjust the parsing patterns in `extractSections()`.

**Text looks messy**: PDF text extraction isn't perfect. You may need to add additional text cleaning logic.

**Missing sections**: Some PDFs have complex layouts. You might need to try different extraction strategies or manually review the output.

### Legal Documents Downloader

**Puppeteer installation fails**:
```bash
npm install puppeteer --legacy-peer-deps
```

**Downloads fail**: Run the script again - it skips already downloaded files.

**Too slow**: Adjust `DELAY_MS` in the script (default: 2000ms)
