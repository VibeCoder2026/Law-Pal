const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..', '..');

// Analyze a sample PDF to understand structure
async function analyzePDF(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);

  const actName = path.basename(pdfPath, '.pdf');
  console.log(`\n${'='.repeat(80)}`);
  console.log(`ANALYZING: ${actName}`);
  console.log(`${'='.repeat(80)}\n`);

  console.log(`Total pages: ${data.numpages}`);
  console.log(`Total text length: ${data.text.length} characters\n`);

  // Show first 3000 characters to understand structure
  console.log('===== FIRST 3000 CHARACTERS =====');
  console.log(data.text.substring(0, 3000));
  console.log('\n===== LOOKING FOR SECTION PATTERNS =====\n');

  // Find section patterns
  const sectionMatches = [...data.text.matchAll(/^(\d+)\.\s+(.+?)$/gm)];
  console.log(`Found ${sectionMatches.length} potential sections\n`);

  if (sectionMatches.length > 0) {
    console.log('First 5 section matches:');
    sectionMatches.slice(0, 5).forEach(m => {
      console.log(`  Section ${m[1]}: ${m[2]}`);
    });

    // Show context around first section
    if (sectionMatches.length > 1) {
      const firstMatch = sectionMatches[0];
      const secondMatch = sectionMatches[1];

      console.log(`\n===== CONTENT BETWEEN SECTION 1 AND SECTION 2 =====`);
      const start = firstMatch.index;
      const end = secondMatch.index;
      const between = data.text.substring(start, end);
      console.log(between);
      console.log(`\nLength: ${between.length} characters`);
    }
  }
}

// Test with Republic Act
const republicActPath = path.join(
  ROOT_DIR,
  'law_sources',
  'constitutional-electoral',
  'Ch_001_02_Republic_Act.pdf'
);

analyzePDF(republicActPath)
  .then(() => console.log('\n\nAnalysis complete!'))
  .catch(err => console.error('Error:', err));
