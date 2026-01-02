const fs = require('fs');
const pdfParse = require('pdf-parse');

const dataBuffer = fs.readFileSync('../law_sources/constitution.pdf');

pdfParse(dataBuffer).then(data => {
  const text = data.text;
  const lines = text.split('\n');

  console.log('=== SEARCHING FOR SUBTITLES ===\n');

  let inTitle5 = false;
  let inConstitution = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Mark when we're in the main Constitution
    if (line.includes('SCHEDULE') && !inConstitution) {
      inConstitution = true;
      console.log('Entered main Constitution at line', i);
    }

    // Skip if we're in subsidiary legislation (after main constitution ends)
    if (line.match(/^PART [IVX]+$/) && line !== 'PART 1' && line !== 'PART 2') {
      console.log('\nExited Constitution (subsidiary legislation starts) at line', i);
      break;
    }

    if (!inConstitution) continue;

    // Detect Title 5
    if (line === 'TITLE 5' || line === 'TITLE  5') {
      inTitle5 = true;
      console.log('\n=== TITLE 5 FOUND at line', i, '===');
    }

    // Detect when we leave Title 5
    if (inTitle5 && (line === 'TITLE 6' || line === 'TITLE  6')) {
      inTitle5 = false;
      console.log('\n=== END OF TITLE 5 at line', i, '===\n');
    }

    // Look for SUBTITLE pattern
    if (line.match(/^SUBTITLE\s+[0-9IVX]+/i)) {
      console.log(`Line ${i}: ${line}`);
      // Print next 3 lines for context
      for (let j = 1; j <= 3 && (i+j) < lines.length; j++) {
        const nextLine = lines[i+j].trim();
        if (nextLine) {
          console.log(`  +${j}: ${nextLine}`);
        }
      }
      console.log('');
    }
  }
});
