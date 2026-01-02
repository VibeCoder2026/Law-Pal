const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

/**
 * Test Acts import on a small subset (5 acts) to verify parsing logic
 */

const CATALOG_PATH = path.join(__dirname, '../law_sources/tiered-catalog.json');
const LAW_SOURCES_DIR = path.join(__dirname, '../law_sources');

// Section parsing - IMPROVED VERSION
function parseSections(actText, actTitle) {
  const sections = [];

  // Step 1: Skip front matter and find where main content starts
  let contentStart = 0;

  const arrangementIndex = actText.indexOf('ARRANGEMENT OF SECTIONS');
  if (arrangementIndex !== -1) {
    const afterArrangement = actText.substring(arrangementIndex);
    const dividerMatch = afterArrangement.match(/_{5,}|={5,}/);

    if (dividerMatch) {
      contentStart = arrangementIndex + dividerMatch.index + dividerMatch[0].length;
    } else {
      const searchText = afterArrangement.substring(100);
      const firstSectionMatch = searchText.match(/\n{2,}1\.\s+[^\n]+\n{2,}/);
      if (firstSectionMatch) {
        contentStart = arrangementIndex + 100 + firstSectionMatch.index;
      }
    }
  }

  if (contentStart === 0) {
    const patterns = [
      /\[.*?[,\s]*\d{4}\]\s*\n/,
      /Short title\.\s*\n.*?\n.*?1\./s,
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

    const sectionHeaderEnd = match.index + match[0].length;
    const nextSectionStart = i < sectionMatches.length - 1
      ? sectionMatches[i + 1].index
      : mainText.length;

    let fullContent = mainText.substring(sectionHeaderEnd, nextSectionStart).trim();

    fullContent = fullContent
      .replace(/\s+/g, ' ')
      .replace(/\s*\n\s*\n\s*/g, '\n\n')
      .trim();

    if (fullContent.length < 20 && !fullContent.match(/[.;,:]/)) {
      continue;
    }

    if (heading.length < 3 || /^[A-Z\s]+$/.test(heading)) {
      const firstLine = fullContent.split('\n')[0];
      if (firstLine && firstLine.length < 100 && firstLine.length > heading.length) {
        heading = firstLine;
      }
    }

    sections.push({
      section_number: sectionNumber,
      heading: heading,
      text: fullContent || heading,
    });
  }

  return sections;
}

async function extractPDFText(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);
  return data.text;
}

async function testImport() {
  console.log('🧪 Testing Acts Import (5 sample acts)\n');

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

  // Get first 5 acts from first tier
  const testActs = catalog.tiers[0].documents.slice(0, 5);

  for (const actDoc of testActs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 ${actDoc.title}`);
    console.log(`   Chapter: ${actDoc.chapter}`);

    // Find PDF
    let pdfPath = path.join(LAW_SOURCES_DIR, actDoc.originalCategory, actDoc.filename);
    if (!fs.existsSync(pdfPath)) {
      pdfPath = path.join(LAW_SOURCES_DIR, 'acts', actDoc.filename);
    }

    if (!fs.existsSync(pdfPath)) {
      console.log(`   ⚠️  PDF not found at: ${actDoc.filename}`);
      continue;
    }

    // Extract and parse
    const actText = await extractPDFText(pdfPath);
    const sections = parseSections(actText, actDoc.title);

    console.log(`   📝 Text length: ${actText.length} chars`);
    console.log(`   ✅ Sections found: ${sections.length}`);

    // Show first 3 sections
    if (sections.length > 0) {
      console.log(`\n   First 3 sections:`);
      sections.slice(0, 3).forEach(s => {
        const textPreview = s.text.substring(0, 100).replace(/\n/g, ' ');
        console.log(`      ${s.section_number}. ${s.heading}`);
        console.log(`         Text: ${textPreview}...`);
      });
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Test complete!\n');
}

testImport()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
