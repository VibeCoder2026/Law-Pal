const fs = require('fs');
const pdfParse = require('pdf-parse');

const dataBuffer = fs.readFileSync('../law_sources/constitution.pdf');

pdfParse(dataBuffer).then(data => {
  const text = data.text;
  const lines = text.split('\n');

  let inConstitution = false;
  let currentPart = null;
  let currentTitle = null;

  const structure = {
    part1: { chapters: [], subtitles: [] },
    part2: { titles: [], subtitles: [] }
  };

  console.log('=== SCANNING CONSTITUTION FOR ALL SUBSECTIONS ===\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Mark start of Constitution
    if (line.includes('SCHEDULE') && !inConstitution) {
      inConstitution = true;
      console.log('✓ Entered Constitution at line', i);
    }

    // Stop at subsidiary legislation
    if (line.match(/^PART [IVX]+$/) && !line.match(/^PART [12]$/)) {
      console.log('✓ Reached subsidiary legislation at line', i);
      break;
    }

    if (!inConstitution) continue;

    // Detect Parts
    if (line === 'PART 1' || line === 'PART  1') {
      currentPart = 1;
      currentTitle = null;
      console.log('\n=== PART 1 ===');
    } else if (line === 'PART 2' || line === 'PART  2') {
      currentPart = 2;
      currentTitle = null;
      console.log('\n=== PART 2 ===');
    }

    if (currentPart === 1) {
      // Look for Chapters in Part 1
      const chapterMatch = line.match(/^CHAPTER\s+([IVX]+)$/);
      if (chapterMatch) {
        const num = chapterMatch[1];
        const title = lines[i + 1]?.trim() || '';
        console.log(`  CHAPTER ${num}: ${title}`);
        structure.part1.chapters.push({ num, title });
      }

      // Look for Subtitles in Part 1
      const subtitleMatch = line.match(/^SUBTITLE\s+([0-9IVX]+)$/i);
      if (subtitleMatch) {
        const num = subtitleMatch[1];
        const title = lines[i + 1]?.trim() || '';
        console.log(`    SUBTITLE ${num}: ${title}`);
        structure.part1.subtitles.push({ num, title });
      }
    } else if (currentPart === 2) {
      // Look for Titles in Part 2
      const titleMatch = line.match(/^TITLE\s+([0-9IVX]+[A-Z]?)$/);
      if (titleMatch) {
        const num = titleMatch[1];
        const title = lines[i + 1]?.trim() || '';
        currentTitle = num;
        console.log(`  TITLE ${num}: ${title}`);
        structure.part2.titles.push({ num, title, subtitles: [] });
      }

      // Look for Subtitles in Part 2
      const subtitleMatch = line.match(/^SUBTITLE\s+([0-9IVX]+)$/i);
      if (subtitleMatch) {
        const num = subtitleMatch[1];
        const title = lines[i + 1]?.trim() || '';
        console.log(`    SUBTITLE ${num} (in Title ${currentTitle}): ${title}`);

        // Find current title and add subtitle to it
        const titleObj = structure.part2.titles.find(t => t.num === currentTitle);
        if (titleObj) {
          titleObj.subtitles.push({ num, title });
        }
      }
    }
  }

  console.log('\n\n=== SUMMARY ===');
  console.log(`Part 1: ${structure.part1.chapters.length} Chapters, ${structure.part1.subtitles.length} Subtitles`);
  console.log(`Part 2: ${structure.part2.titles.length} Titles`);

  // Check which titles have subtitles
  const titlesWithSubtitles = structure.part2.titles.filter(t => t.subtitles.length > 0);
  console.log(`\nTitles with subtitles: ${titlesWithSubtitles.length}`);
  titlesWithSubtitles.forEach(t => {
    console.log(`  - Title ${t.num}: ${t.subtitles.length} subtitle(s)`);
  });
});
