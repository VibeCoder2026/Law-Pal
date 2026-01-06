const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const pdf = require('pdf-parse');

/**
 * Improved parser for Guyana Constitution PDF
 * Extracts articles with better pattern matching
 */
async function parseConstitutionPDF() {
  const pdfPath = path.join(ROOT_DIR, 'law_sources', 'constitution.pdf');
  const outputPath = path.join(ROOT_DIR, 'src', 'assets', 'constitution.json');

  console.log('📄 Reading PDF file...');
  const dataBuffer = fs.readFileSync(pdfPath);

  console.log('🔍 Parsing PDF content...');
  const data = await pdf(dataBuffer);

  console.log(`📊 Extracted ${data.numpages} pages`);
  console.log(`📝 Total text length: ${data.text.length} characters`);

  // Extract sections from the text
  const sections = extractArticles(data.text);

  console.log(`✅ Found ${sections.length} articles/sections`);

  // Create the output structure
  const output = {
    doc_id: "guyana-constitution",
    title: "Constitution of the Co-operative Republic of Guyana",
    sections: sections
  };

  // Write to JSON file
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`💾 Saved to ${outputPath}`);
  console.log(`\n📈 Summary:`);
  console.log(`   - Total sections: ${sections.length}`);
  if (sections.length > 0) {
    console.log(`   - First section: ${sections[0].heading}`);
    console.log(`   - Last section: ${sections[sections.length - 1].heading}`);
  }
}

/**
 * Extracts articles from constitution text
 * Uses multiple strategies to capture all content
 */
function extractArticles(rawText) {
  const sections = [];

  // Clean and normalize text
  const text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00AD/g, '') // Remove soft hyphens
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();

  // Strategy 1: Find article boundaries
  // Pattern matches: "1.", "1A.", "123.", etc. at start of line or after whitespace
  // Looking for numbered articles in the constitution proper

  // Split text into manageable chunks to find article starts
  const lines = text.split('\n');

  let currentArticle = null;
  let articleNumber = '';
  let articleHeading = '';
  let articleText = [];
  let inConstitutionBody = false;
  let sectionCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Detect when we've entered the actual Constitution (after the Act preamble)
    if (line.includes('PART I') || line.includes('CHAPTER I')) {
      inConstitutionBody = true;
    }

    // Only process if we're in the constitution body
    if (!inConstitutionBody) continue;

    // Check if this line starts an article (e.g., "1.", "2A.", "123.", etc.)
    const articleMatch = line.match(/^(\d+[A-Z]*)\.\s+(.+)$/i);

    if (articleMatch) {
      // Save previous article if exists
      if (currentArticle) {
        sections.push({
          chunk_id: `sec-${sectionCounter}`,
          section_number: articleNumber,
          heading: articleHeading,
          text: articleText.join(' ').trim()
        });
        sectionCounter++;
      }

      // Start new article
      articleNumber = articleMatch[1];
      articleHeading = articleMatch[2].trim();
      articleText = [];
      currentArticle = true;
    } else if (currentArticle) {
      // Continue building current article text
      // Skip page headers/footers
      if (!line.match(/^(LAWS OF GUYANA|Cap\.|L\.R\.O\.|Constitution of)/)) {
        articleText.push(line);
      }
    }
  }

  // Save last article
  if (currentArticle && articleText.length > 0) {
    sections.push({
      chunk_id: `sec-${sectionCounter}`,
      section_number: articleNumber,
      heading: articleHeading,
      text: articleText.join(' ').trim()
    });
  }

  // If we didn't find articles with the above method, try alternative
  if (sections.length < 50) {
    console.log('⚠️  Standard parsing found few articles. Trying alternative method...');
    return extractArticlesAlternative(rawText);
  }

  return sections;
}

/**
 * Alternative extraction method using regex on full text
 */
function extractArticlesAlternative(rawText) {
  const sections = [];

  // Normalize text
  const text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // More aggressive pattern: Find any line that looks like "NUMBER. TEXT"
  // where NUMBER is 1-3 digits optionally followed by A-Z
  const articlePattern = /(\d{1,3}[A-Z]*)\.\s+([^\n]+)/g;

  let match;
  const potentialArticles = [];

  while ((match = articlePattern.exec(text)) !== null) {
    potentialArticles.push({
      number: match[1],
      heading: match[2].trim(),
      position: match.index
    });
  }

  console.log(`   - Found ${potentialArticles.length} potential articles`);

  // Extract text between articles
  for (let i = 0; i < potentialArticles.length; i++) {
    const current = potentialArticles[i];
    const next = potentialArticles[i + 1];

    const start = current.position;
    const end = next ? next.position : text.length;
    const fullText = text.substring(start, end).trim();

    // Remove the heading from the text
    const bodyText = fullText.substring(fullText.indexOf('\n') + 1).trim();

    // Filter out very short entries (likely false positives)
    if (bodyText.length > 20) {
      sections.push({
        chunk_id: `sec-${i + 1}`,
        section_number: current.number,
        heading: current.heading.substring(0, 200), // Limit heading length
        text: bodyText.substring(0, 5000) // Limit text length per section
      });
    }
  }

  return sections;
}

// Run the parser
parseConstitutionPDF()
  .then(() => {
    console.log('\n✅ Constitution parsing completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error parsing constitution:', error);
    process.exit(1);
  });
