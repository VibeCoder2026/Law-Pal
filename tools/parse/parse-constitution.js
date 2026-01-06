const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const pdf = require('pdf-parse');

/**
 * Parses the Guyana Constitution PDF and extracts structured section data
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
  const sections = extractSections(data.text);

  console.log(`✅ Found ${sections.length} sections`);

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
  console.log(`   - First section: ${sections[0]?.heading || 'N/A'}`);
  console.log(`   - Last section: ${sections[sections.length - 1]?.heading || 'N/A'}`);
}

/**
 * Extracts sections from the constitution text
 * This function attempts to identify section boundaries and headings
 */
function extractSections(text) {
  const sections = [];

  // Clean up the text - normalize line breaks and spaces
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Pattern to match section numbers (e.g., "1.", "2.", etc.)
  // This is a basic pattern - you may need to adjust based on actual PDF structure
  const sectionPattern = /^(\d+)\.\s+(.+?)$/gm;

  // Split by potential section markers
  // Strategy 1: Look for numbered sections (Article 1., Article 2., etc.)
  const articlePattern = /(?:^|\n)(Article\s+(\d+[A-Za-z]*)\.\s*)(.+?)(?=\n(?:Article\s+\d+|$))/gis;

  let match;
  let sectionCounter = 1;

  // Try to match Article patterns first
  while ((match = articlePattern.exec(cleanText)) !== null) {
    const articleNum = match[2].trim();
    const content = match[3].trim();

    // Try to extract heading (usually the first line or bold text)
    const lines = content.split('\n').filter(line => line.trim());
    const heading = lines[0]?.trim() || `Article ${articleNum}`;
    const bodyText = lines.slice(1).join('\n').trim();

    sections.push({
      chunk_id: `sec-${sectionCounter}`,
      section_number: articleNum,
      heading: heading,
      text: bodyText || content
    });

    sectionCounter++;
  }

  // If no articles found, try different patterns
  if (sections.length === 0) {
    console.log('⚠️  No articles found with standard pattern. Trying alternative parsing...');

    // Alternative: Split by page breaks and create sections
    // This is a fallback that creates sections from chunks of text
    const chunks = cleanText.split(/\n{2,}/).filter(chunk => chunk.trim().length > 100);

    chunks.forEach((chunk, index) => {
      const lines = chunk.split('\n').filter(line => line.trim());
      const heading = lines[0]?.trim().substring(0, 100) || `Section ${index + 1}`;
      const bodyText = lines.slice(1).join('\n').trim();

      sections.push({
        chunk_id: `sec-${index + 1}`,
        section_number: String(index + 1),
        heading: heading,
        text: bodyText || chunk
      });
    });
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
