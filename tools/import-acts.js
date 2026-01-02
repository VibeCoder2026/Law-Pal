const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

/**
 * Import Acts from tiered-catalog.json into database-ready JSON format
 *
 * This script:
 * 1. Reads tiered-catalog.json with 461 Acts organized into 13 tiers
 * 2. For each Act, extracts text from PDF
 * 3. Parses sections from the PDF text
 * 4. Generates acts-import.json with all metadata and sections
 */

const CATALOG_PATH = path.join(__dirname, '../law_sources/tiered-catalog.json');
const LAW_SOURCES_DIR = path.join(__dirname, '../law_sources');
const OUTPUT_PATH = path.join(__dirname, '../src/assets/acts-import.json');

// Section parsing regex patterns
const SECTION_PATTERNS = {
  // Match: "1. Short title." or "12. Powers of commissioners."
  numbered: /^(\d+)\.\s+(.+?)$/gm,

  // Match section content (everything until next section or end)
  content: /^(\d+)\.\s+(.+?)(?=^\d+\.|$)/gms,
};

/**
 * Extract text from PDF file
 */
async function extractPDFText(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`   ❌ Error extracting PDF: ${error.message}`);
    return null;
  }
}

/**
 * Parse sections from Act text - IMPROVED VERSION
 * Returns array of { section_number, heading, text }
 */
function parseSections(actText, actTitle) {
  const sections = [];

  // Step 1: Skip front matter and find where main content starts
  let contentStart = 0;

  // Look for end of "ARRANGEMENT OF SECTIONS" table of contents
  const arrangementIndex = actText.indexOf('ARRANGEMENT OF SECTIONS');
  if (arrangementIndex !== -1) {
    // Find the divider line after TOC (usually underscores or equals)
    const afterArrangement = actText.substring(arrangementIndex);
    const dividerMatch = afterArrangement.match(/_{5,}|={5,}/);

    if (dividerMatch) {
      contentStart = arrangementIndex + dividerMatch.index + dividerMatch[0].length;
    } else {
      // Fallback: look for first real section (usually after 500 chars past TOC start)
      // Look for pattern like "\n\n1." followed by actual content
      const searchText = afterArrangement.substring(100);  // Skip TOC headers
      const firstSectionMatch = searchText.match(/\n{2,}1\.\s+[^\n]+\n{2,}/);
      if (firstSectionMatch) {
        contentStart = arrangementIndex + 100 + firstSectionMatch.index;
      }
    }
  }

  // If still no content start found, try other markers
  if (contentStart === 0) {
    // Look for common Act start patterns
    const patterns = [
      /\[.*?[,\s]*\d{4}\]\s*\n/,  // Date like "[20TH FEBRUARY, 1970]"
      /Short title\.\s*\n.*?\n.*?1\./s,  // "Short title." heading followed by section 1
    ];

    for (const pattern of patterns) {
      const match = actText.match(pattern);
      if (match) {
        contentStart = match.index + match[0].length;
        break;
      }
    }
  }

  const mainText = actText.substring(contentStart);

  // Step 2: Extract all sections
  const sectionRegex = /^(\d+)\.\s*(.+?)$/gm;
  const sectionMatches = [...mainText.matchAll(sectionRegex)];

  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const sectionNumber = match[1];
    let heading = match[2].trim();

    // Get section start position (right after the section heading line)
    const sectionHeaderEnd = match.index + match[0].length;

    // Get section end position (start of next section, or end of text)
    const nextSectionStart = i < sectionMatches.length - 1
      ? sectionMatches[i + 1].index
      : mainText.length;

    // Extract everything between this section and the next
    let fullContent = mainText.substring(sectionHeaderEnd, nextSectionStart).trim();

    // Clean up the text
    fullContent = fullContent
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\s*\n\s*\n\s*/g, '\n\n')  // Preserve paragraph breaks
      .trim();

    // Skip if this looks like a TOC entry (very short with no punctuation)
    if (fullContent.length < 20 && !fullContent.match(/[.;,:]/)) {
      continue;
    }

    // If the heading looks incomplete (just margin note), try to get better heading from content
    if (heading.length < 3 || /^[A-Z\s]+$/.test(heading)) {
      const firstLine = fullContent.split('\n')[0];
      if (firstLine && firstLine.length < 100 && firstLine.length > heading.length) {
        heading = firstLine;
      }
    }

    sections.push({
      section_number: sectionNumber,
      heading: heading,
      text: fullContent || heading,  // Fallback to heading if no content
    });
  }

  return sections;
}

/**
 * Process a single Act document
 */
async function processAct(actDoc, tierId, tierPriority, categoryFolder) {
  const { chapter, title, filename, originalCategory } = actDoc;

  // Generate doc_id from chapter number
  const docId = `act-${chapter.replace(/:/g, '-')}`;

  console.log(`\n📄 Processing: ${title}`);
  console.log(`   Chapter: ${chapter}`);
  console.log(`   File: ${filename}`);

  // Find PDF file - could be in category folder or acts/ folder
  let pdfPath = path.join(LAW_SOURCES_DIR, categoryFolder, filename);

  if (!fs.existsSync(pdfPath)) {
    // Try acts/ folder
    pdfPath = path.join(LAW_SOURCES_DIR, 'acts', filename);
  }

  if (!fs.existsSync(pdfPath)) {
    console.log(`   ⚠️  PDF not found, skipping...`);
    return null;
  }

  // Extract PDF text
  const actText = await extractPDFText(pdfPath);
  if (!actText) {
    return null;
  }

  console.log(`   📝 Extracted ${actText.length} characters`);

  // Parse sections
  const sections = parseSections(actText, title);
  console.log(`   ✅ Parsed ${sections.length} sections`);

  return {
    document: {
      doc_id: docId,
      doc_type: 'act',
      title: title,
      chapter_number: chapter,
      category: originalCategory,
      tier_id: tierId,
      tier_priority: tierPriority,
      pdf_filename: filename,
    },
    sections: sections.map((section, index) => ({
      doc_id: docId,
      chunk_id: `${docId}-s${section.section_number}`,
      section_number: section.section_number,
      heading: section.heading,
      text: section.text,
      ordinal: index + 1,
    })),
  };
}

/**
 * Main import process
 */
async function importActs() {
  console.log('📚 Acts Import Tool\n');
  console.log('This will extract text from all Act PDFs and prepare database import data.\n');

  // Read tiered catalog
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  console.log(`📖 Loaded catalog with ${catalog.totalDocuments} documents in ${catalog.tiers.length} tiers\n`);

  const results = {
    documents: [],
    sections: [],
    stats: {
      total: 0,
      processed: 0,
      failed: 0,
      totalSections: 0,
    },
  };

  // Process each tier
  for (const tier of catalog.tiers) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📁 Tier: ${tier.name} (${tier.documents.length} acts)`);
    console.log(`${'='.repeat(80)}`);

    for (const actDoc of tier.documents) {
      results.stats.total++;

      try {
        const result = await processAct(
          actDoc,
          tier.id,
          tier.priority,
          actDoc.originalCategory
        );

        if (result) {
          results.documents.push(result.document);
          results.sections.push(...result.sections);
          results.stats.processed++;
          results.stats.totalSections += result.sections.length;
        } else {
          results.stats.failed++;
        }
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        results.stats.failed++;
      }

      // Add small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Write output
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 Import Summary:');
  console.log(`   Total Acts: ${results.stats.total}`);
  console.log(`   Processed: ${results.stats.processed}`);
  console.log(`   Failed: ${results.stats.failed}`);
  console.log(`   Total Sections: ${results.stats.totalSections}`);
  console.log(`   Avg Sections/Act: ${Math.round(results.stats.totalSections / results.stats.processed)}`);

  // Save to JSON
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\n✅ Saved import data to: ${OUTPUT_PATH}`);
  console.log(`   Documents: ${results.documents.length}`);
  console.log(`   Sections: ${results.sections.length}`);
}

// Run
importActs()
  .then(() => {
    console.log('\n✅ Import complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
