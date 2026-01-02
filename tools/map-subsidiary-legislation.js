const fs = require('fs');
const pdfParse = require('pdf-parse');

const dataBuffer = fs.readFileSync('../law_sources/constitution.pdf');

pdfParse(dataBuffer).then(data => {
  const text = data.text;
  const lines = text.split('\n');

  let inSubLeg = false;
  let currentDoc = null;

  console.log('=== SUBSIDIARY LEGISLATION STRUCTURE ===\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect start of subsidiary legislation documents
    if (line.includes('PUBLIC SERVICE COMMISSION RULES') ||
        line.includes('JUDICIAL SERVICE COMMISSION RULES')) {
      currentDoc = line.includes('PUBLIC') ? 'Public Service' : 'Judicial Service';
      console.log('\n=== ' + currentDoc + ' Commission Rules ===');
      inSubLeg = true;
    }

    if (!inSubLeg) continue;

    // Look for Parts in subsidiary legislation
    const partMatch = line.match(/^PART ([IVX]+)$/);
    if (partMatch) {
      const num = partMatch[1];
      const title = lines[i+1]?.trim() || '';
      console.log(`  PART ${num}: ${title}`);
    }
  }
});
