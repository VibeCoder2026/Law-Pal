const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

/**
 * Inspects an Act PDF to understand its structure
 */
async function inspectAct(pdfPath) {
  console.log(`\n📄 Reading: ${path.basename(pdfPath)}`);

  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf(dataBuffer);

  console.log(`\n📊 Statistics:`);
  console.log(`   Pages: ${data.numpages}`);
  console.log(`   Text length: ${data.text.length} characters`);

  // Show first 2000 characters
  console.log(`\n📝 First 2000 characters:\n`);
  console.log('='.repeat(80));
  console.log(data.text.substring(0, 2000));
  console.log('='.repeat(80));

  // Look for section patterns
  console.log(`\n🔍 Pattern Analysis:\n`);

  // Count different section patterns
  const patterns = {
    'Section X': data.text.match(/\bSection\s+\d+[A-Za-z]*/gi),
    'X. (numbered)': data.text.match(/^\d+\.\s+[A-Z]/gm),
    '(X) (parentheses)': data.text.match(/^\(\d+\)\s+/gm),
    'Article X': data.text.match(/\bArticle\s+\d+/gi),
    'Part X': data.text.match(/\bPART\s+[IVXLC\d]+/gi),
    'Chapter X': data.text.match(/\bCHAPTER\s+[IVXLC\d]+/gi),
  };

  Object.entries(patterns).forEach(([name, matches]) => {
    console.log(`   ${name}: ${matches ? matches.length : 0} found`);
    if (matches && matches.length > 0 && matches.length <= 10) {
      console.log(`      Examples: ${matches.slice(0, 5).join(', ')}`);
    }
  });

  return data;
}

// Main
const actPath = process.argv[2] || 'law_sources/administrative-public/Ch_019_03_Chapter_019-03_Commission_of_Inquiry_Act.pdf';

inspectAct(actPath)
  .then(() => {
    console.log('\n✅ Inspection completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
