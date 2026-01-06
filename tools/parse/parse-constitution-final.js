const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const pdf = require('pdf-parse');

/**
 * Complete Hierarchical Parser - Final Version
 * Extracts full Constitution structure: PARTS → CHAPTERS → ARTICLES
 */
async function parseConstitutionPDF() {
  const pdfPath = path.join(ROOT_DIR, 'law_sources', 'constitution.pdf');
  const outputPath = path.join(ROOT_DIR, 'src', 'assets', 'constitution.json');

  console.log('📄 Reading PDF file...');
  const dataBuffer = fs.readFileSync(pdfPath);

  console.log('🔍 Parsing PDF content...');
  const data = await pdf(dataBuffer);

  console.log(`📊 Extracted ${data.numpages} pages\n`);

  // Extract complete hierarchical structure
  const structure = extractHierarchy(data.text);

  console.log(`\n✅ Parsing Complete!`);
  console.log(`   📚 Parts: ${structure.parts.length}`);
  console.log(`   📖 Chapters: ${structure.parts.reduce((sum, p) => sum + p.chapters.length, 0)}`);
  console.log(`   📝 Articles: ${structure.totalArticles}`);

  // Write to JSON
  fs.writeFileSync(outputPath, JSON.stringify(structure, null, 2));
  console.log(`\n💾 Saved to ${outputPath}`);

  // Show structure preview
  console.log(`\n📋 Structure Preview:`);
  structure.parts.slice(0, 3).forEach(part => {
    console.log(`\n   ${part.title}`);
    part.chapters.slice(0, 2).forEach(chapter => {
      console.log(`     └─ ${chapter.title} (${chapter.articles.length} articles)`);
    });
  });
}

function extractHierarchy(rawText) {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = text.split('\n').map(l => l.trim());

  const structure = {
    doc_id: "guyana-constitution",
    title: "Constitution of the Co-operative Republic of Guyana",
    parts: [],
    totalArticles: 0
  };

  let currentPart = null;
  let currentChapter = null;
  let inConstitution = false;
  let articleCounter = 0;

  // Track position in text for article extraction
  let textPosition = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Constitution start (skip the Act preamble)
    if (line.match(/^SCHEDULE/) || line.match(/PART\s+I$/)) {
      inConstitution = true;
    }

    // Stop at Subsidiary Legislation
    if (line.match(/SUBSIDIARY LEGISLATION/)) {
      break;
    }

    if (!inConstitution) continue;

    // Detect PART markers
    const partMatch = line.match(/^PART\s+([IVX]+)$/);
    if (partMatch) {
      // Save previous part
      if (currentPart) {
        structure.parts.push(currentPart);
      }

      const partNum = partMatch[1];
      const nextLine = lines[i + 1] || '';

      currentPart = {
        id: `part-${romanToInt(partNum)}`,
        partNumber: partNum,
        title: `PART ${partNum}${nextLine.length > 0 && !nextLine.match(/^(CHAPTER|TITLE|\d+\.)/) ? ': ' + nextLine : ''}`,
        chapters: []
      };

      currentChapter = null;
      console.log(`   Found ${currentPart.title}`);
      continue;
    }

    // Detect CHAPTER markers
    const chapterMatch = line.match(/^CHAPTER\s+([IVX]+)$/);
    if (chapterMatch && currentPart) {
      const chapterNum = chapterMatch[1];
      const nextLine = lines[i + 1] || '';

      currentChapter = {
        id: `ch-${currentPart.partNumber}-${chapterNum}`,
        chapterNumber: chapterNum,
        title: `CHAPTER ${chapterNum}${nextLine.length > 0 && !nextLine.match(/^\d+\./) ? ': ' + nextLine : ''}`,
        articles: []
      };

      currentPart.chapters.push(currentChapter);
      console.log(`     └─ Found CHAPTER ${chapterNum}`);
      continue;
    }

    // Detect ARTICLE markers (number followed by dot and heading)
    const articleMatch = line.match(/^(\d{1,3}[A-Z]*)\.\s+(.+)$/);
    if (articleMatch && currentChapter) {
      const articleNum = articleMatch[1];
      const heading = articleMatch[2];

      // Skip false positives
      if (heading.match(/^(LAWS OF|Cap\.|Page|L\.R\.O\.)/)) continue;
      if (heading.length < 10) continue;

      // Extract article text (simplified - just take next few lines)
      let articleText = '';
      for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
        const nextLine = lines[j];
        // Stop at next article or chapter
        if (nextLine.match(/^(\d{1,3}[A-Z]*)\.\s+/) ||
            nextLine.match(/^(CHAPTER|PART)\s+[IVX]+$/)) {
          break;
        }
        if (!nextLine.match(/^(LAWS OF|Cap\.|L\.R\.O\.)/)) {
          articleText += nextLine + ' ';
        }
      }

      const article = {
        chunk_id: `art-${++articleCounter}`,
        articleNumber: articleNum,
        heading: heading.substring(0, 200),
        text: cleanText(articleText.substring(0, 3000)),
        partNumber: currentPart.partNumber,
        chapterNumber: currentChapter.chapterNumber
      };

      currentChapter.articles.push(article);
      structure.totalArticles++;
    }
  }

  // Save last part
  if (currentPart) {
    structure.parts.push(currentPart);
  }

  return structure;
}

function romanToInt(roman) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let result = 0;
  for (let i = 0; i < roman.length; i++) {
    const current = map[roman[i]];
    const next = map[roman[i + 1]];
    if (next && current < next) {
      result -= current;
    } else {
      result += current;
    }
  }
  return result;
}

function cleanText(text) {
  return text
    .replace(/LAWS OF GUYANA[\s\S]*?Constitution/g, '')
    .replace(/Cap\.\s*\d+:\d+/g, '')
    .replace(/L\.R\.O\.\s*\d+\/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

parseConstitutionPDF()
  .then(() => {
    console.log('\n✅ Complete hierarchical parsing finished!');
    console.log('🎯 Full Constitution structure ready for navigation');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
