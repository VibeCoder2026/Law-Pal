const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

/**
 * Inspects the PDF to understand its structure
 */
async function inspectPDF() {
  const ROOT_DIR = path.resolve(__dirname, '..', '..');
  const pdfPath = path.join(ROOT_DIR, 'law_sources', 'constitution.pdf');

  console.log('📄 Reading PDF file...');
  const dataBuffer = fs.readFileSync(pdfPath);

  console.log('🔍 Parsing PDF content...');
  const data = await pdf(dataBuffer);

  console.log(`\n📊 PDF Statistics:`);
  console.log(`   - Pages: ${data.numpages}`);
  console.log(`   - Text length: ${data.text.length} characters`);

  // Show first 3000 characters to understand structure
  console.log(`\n📝 First 3000 characters of text:\n`);
  console.log('='.repeat(80));
  console.log(data.text.substring(0, 3000));
  console.log('='.repeat(80));

  // Look for patterns
  console.log(`\n🔍 Looking for patterns:\n`);

  // Count "Article" occurrences
  const articleMatches = data.text.match(/\bArticle\s+\d+[A-Za-z]*/gi);
  console.log(`   - "Article X" patterns found: ${articleMatches ? articleMatches.length : 0}`);
  if (articleMatches) {
    console.log(`   - First 10 matches: ${articleMatches.slice(0, 10).join(', ')}`);
  }

  // Count numbered sections
  const numberedSections = data.text.match(/^\d+\.\s+/gm);
  console.log(`   - Numbered sections (X.) found: ${numberedSections ? numberedSections.length : 0}`);

  // Look for chapter markers
  const chapters = data.text.match(/\bCHAPTER\s+[IVXLC]+/gi);
  console.log(`   - "CHAPTER" markers found: ${chapters ? chapters.length : 0}`);
  if (chapters) {
    console.log(`   - Chapters: ${chapters.slice(0, 5).join(', ')}`);
  }

  // Look for part markers
  const parts = data.text.match(/\bPART\s+[IVXLC]+/gi);
  console.log(`   - "PART" markers found: ${parts ? parts.length : 0}`);

  // Save a larger sample for manual inspection
  const samplePath = path.join(ROOT_DIR, 'tools', 'output', 'pdf-sample.txt');
  fs.writeFileSync(samplePath, data.text.substring(0, 20000));
  console.log(`\n💾 Saved first 20,000 characters to ${samplePath} for inspection`);
}

inspectPDF()
  .then(() => {
    console.log('\n✅ Inspection completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
