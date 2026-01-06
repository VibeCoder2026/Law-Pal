const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const pdfParse = require('pdf-parse');

const dataBuffer = fs.readFileSync(path.join(ROOT_DIR, 'law_sources', 'constitution.pdf'));

pdfParse(dataBuffer).then(data => {
  const text = data.text;

  // Extract pages 15-29 (approximate character positions)
  // PDF pages don't map directly, so we'll look for the ARRANGEMENT section

  const arrangementStart = text.indexOf('ARRANGEMENT OF ARTICLES');
  const arrangementEnd = text.indexOf('THE CONSTITUTION', arrangementStart + 100);

  if (arrangementStart === -1) {
    console.log('Could not find ARRANGEMENT OF ARTICLES');
    console.log('Searching for alternative markers...');

    // Look for common TOC markers
    const alt1 = text.indexOf('PART 1');
    const alt2 = text.indexOf('PART I');
    console.log('PART 1 at:', alt1);
    console.log('PART I at:', alt2);

    // Print first 2000 characters to see structure
    console.log('\n=== First 2000 characters ===');
    console.log(text.substring(0, 2000));
    return;
  }

  const toc = text.substring(arrangementStart, arrangementEnd);
  const lines = toc.split('\n');

  console.log('=== TABLE OF CONTENTS (Pages 15-29) ===\n');

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed && trimmed.length > 3) {
      console.log(trimmed);
    }
  });
});
