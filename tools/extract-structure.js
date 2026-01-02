const fs = require('fs');
const pdfParse = require('pdf-parse');

const dataBuffer = fs.readFileSync('../law_sources/constitution.pdf');

pdfParse(dataBuffer).then(data => {
  const text = data.text;
  const lines = text.split('\n');

  console.log('=== PARTS ===');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^PART\s+[IVX0-9]+/i) && !line.includes('PART OF')) {
      console.log(`\nLine ${i}: ${line}`);
      // Print next few lines for context
      for (let j = 1; j <= 3 && (i+j) < lines.length; j++) {
        const nextLine = lines[i+j].trim();
        if (nextLine) {
          console.log(`  +${j}: ${nextLine}`);
        }
      }
    }
  }

  console.log('\n\n=== TITLES ===');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^TITLE\s+[IVX0-9A-Z]+/i)) {
      console.log(`\nLine ${i}: ${line}`);
      for (let j = 1; j <= 3 && (i+j) < lines.length; j++) {
        const nextLine = lines[i+j].trim();
        if (nextLine) {
          console.log(`  +${j}: ${nextLine}`);
        }
      }
    }
  }

  console.log('\n\n=== CHAPTERS ===');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^CHAPTER\s+[IVX0-9]+/i)) {
      console.log(`\nLine ${i}: ${line}`);
      for (let j = 1; j <= 3 && (i+j) < lines.length; j++) {
        const nextLine = lines[i+j].trim();
        if (nextLine) {
          console.log(`  +${j}: ${nextLine}`);
        }
      }
    }
  }
});
