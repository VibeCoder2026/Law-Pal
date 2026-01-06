const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const pdfParse = require('pdf-parse');

const dataBuffer = fs.readFileSync(path.join(ROOT_DIR, 'law_sources', 'constitution.pdf'));

pdfParse(dataBuffer).then(data => {
  const text = data.text;
  const lines = text.split('\n');

  const structure = {
    parts: [],
    chapters: [],
    titles: []
  };

  let currentPart = null;
  let inConstitution = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect start of main Constitution (after the Act sections)
    if (line.includes('SCHEDULE') || line.includes('THE CONSTITUTION')) {
      inConstitution = true;
    }

    if (!inConstitution) continue;

    // Match PART
    const partMatch = line.match(/^PART\s+([0-9IVX]+)$/i);
    if (partMatch && !line.includes('PART OF')) {
      const partNum = partMatch[1];
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';

      currentPart = {
        number: partNum,
        title: nextLine,
        line: i
      };

      console.log(`\nPART ${partNum}: ${nextLine}`);
    }

    // Match CHAPTER
    const chapterMatch = line.match(/^CHAPTER\s+([IVX0-9]+)$/i);
    if (chapterMatch && currentPart) {
      const chapterNum = chapterMatch[1];
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';

      console.log(`  CHAPTER ${chapterNum}: ${nextLine}`);
    }

    // Match TITLE
    const titleMatch = line.match(/^TITLE\s+([IVX0-9A-Z]+)$/i);
    if (titleMatch && currentPart) {
      const titleNum = titleMatch[1];
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';

      console.log(`  TITLE ${titleNum}: ${nextLine}`);
    }
  }
});
