const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..', '..');

/**
 * Improved section parser that extracts full legal text
 */
function parseSections(pdfText, actTitle) {
  const sections = [];

  // Step 1: Skip front matter and find where main content starts
  let contentStart = 0;

  // Look for end of "ARRANGEMENT OF SECTIONS" table of contents
  const arrangementIndex = pdfText.indexOf('ARRANGEMENT OF SECTIONS');
  if (arrangementIndex !== -1) {
    // Find the divider line after TOC (usually underscores or equals)
    const afterArrangement = pdfText.substring(arrangementIndex);
    const dividerMatch = afterArrangement.match(/_{5,}|={5,}/);

    if (dividerMatch) {
      contentStart = arrangementIndex + dividerMatch.index + dividerMatch[0].length;
    } else {
      // Fallback: look for "1. " followed by actual text (not just heading)
      const firstSectionMatch = afterArrangement.match(/\n\n1\.\s+[A-Z][^\n]+\n\n[^\n]/);
      if (firstSectionMatch) {
        contentStart = arrangementIndex + firstSectionMatch.index;
      }
    }
  }

  // If still no content start found, try other markers
  if (contentStart === 0) {
    // Look for common Act start patterns
    const patterns = [
      /\[.*?[,\s]*\d{4}\]\s*\n/,  // Date like "[20TH FEBRUARY, 1970]"
      /Short title\.\s*\n.*?\n.*?1\./,  // "Short title." followed by section 1
    ];

    for (const pattern of patterns) {
      const match = pdfText.match(pattern);
      if (match) {
        contentStart = match.index + match[0].length;
        break;
      }
    }
  }

  const mainText = pdfText.substring(contentStart);

  // Step 2: Extract all sections using improved regex
  // Match section number at start of line, followed by content
  const sectionRegex = /^(\d+)\.\s*(.+?)$/gm;
  const sectionMatches = [...mainText.matchAll(sectionRegex)];

  console.log(`  Found ${sectionMatches.length} sections in main content`);

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

    // Skip if this looks like a TOC entry (very short with no substance)
    if (fullContent.length < 20 && !fullContent.match(/[.;,]/)) {
      console.log(`  Skipping section ${sectionNumber} (TOC entry): "${heading}"`);
      continue;
    }

    // If the heading looks incomplete or is just a margin note, extract better heading
    if (heading.length < 3 || /^[A-Z\s]+$/.test(heading)) {
      // Try to extract heading from the first sentence of content
      const firstLine = fullContent.split('\n')[0];
      if (firstLine && firstLine.length < 100) {
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

// Test the improved parser
async function testParser() {
  const testPDF = path.join(
    ROOT_DIR,
    'law_sources',
    'constitutional-electoral',
    'Ch_001_02_Republic_Act.pdf'
  );

  console.log('Testing improved parser on Republic Act...\n');

  const dataBuffer = fs.readFileSync(testPDF);
  const data = await pdf(dataBuffer);

  const sections = parseSections(data.text, 'Republic Act');

  console.log(`\n\nExtracted ${sections.length} sections:\n`);

  sections.slice(0, 5).forEach(s => {
    console.log(`\n--- Section ${s.section_number}: ${s.heading} ---`);
    console.log(`Text length: ${s.text.length} characters`);
    console.log(`Text preview: ${s.text.substring(0, 200)}...`);
  });
}

testParser().catch(err => console.error('Error:', err));
