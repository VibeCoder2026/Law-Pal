const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const pdf = require('pdf-parse');

/**
 * Hierarchical parser (v5) - Proper Constitution structure
 * ACT → SCHEDULE → PARTS → CHAPTERS → ARTICLES
 */
async function parseConstitutionPDF() {
  const pdfPath = path.join(ROOT_DIR, 'law_sources', 'constitution.pdf');
  const outputPath = path.join(ROOT_DIR, 'src', 'assets', 'constitution.json');

  console.log('📄 Reading PDF file...');
  const dataBuffer = fs.readFileSync(pdfPath);

  console.log('🔍 Parsing PDF content...');
  const data = await pdf(dataBuffer);

  console.log(`📊 Extracted ${data.numpages} pages`);

  // Extract hierarchical structure
  const structure = extractHierarchicalStructure(data.text);

  console.log(`\n✅ Parsing complete!`);
  console.log(`   - Parts: ${structure.constitution.parts.length}`);
  console.log(`   - Total Chapters: ${structure.constitution.parts.reduce((sum, p) => sum + p.chapters.length, 0)}`);
  console.log(`   - Total Articles: ${structure.constitution.totalArticles}`);

  // Write to JSON file
  fs.writeFileSync(outputPath, JSON.stringify(structure, null, 2));
  console.log(`\n💾 Saved to ${outputPath}`);

  // Print sample structure
  console.log(`\n📚 Structure Preview:`);
  structure.constitution.parts.slice(0, 2).forEach(part => {
    console.log(`\n   ${part.title}`);
    part.chapters.slice(0, 3).forEach(chapter => {
      console.log(`     └─ ${chapter.title} (${chapter.articles.length} articles)`);
    });
  });
}

function extractHierarchicalStructure(rawText) {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = text.split('\n');

  const structure = {
    doc_id: "guyana-constitution",
    title: "Constitution of the Co-operative Republic of Guyana",

    constitution: {
      title: "The Constitution of the Co-operative Republic of Guyana",
      parts: [],
      totalArticles: 0
    }
  };

  let currentPart = null;
  let currentChapter = null;
  let articleCounter = 0;

  // Parse line by line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect PART markers (e.g., "PART I", "PART II")
    const partMatch = line.match(/^PART\s+([IVX]+)$/i);
    if (partMatch) {
      const partNum = partMatch[1].toUpperCase();
      const nextLine = lines[i + 1]?.trim() || '';

      // Save previous part
      if (currentPart) {
        structure.constitution.parts.push(currentPart);
      }

      currentPart = {
        id: `part-${romanToInt(partNum)}`,
        partNumber: partNum,
        title: `PART ${partNum}`,
        subtitle: nextLine.length > 5 && !nextLine.match(/^CHAPTER/i) ? nextLine : '',
        chapters: []
      };

      currentChapter = null;
      console.log(`   Found ${currentPart.title}`);
      continue;
    }

    // Detect CHAPTER markers (e.g., "CHAPTER I", "CHAPTER II")
    const chapterMatch = line.match(/^CHAPTER\s+([IVX]+)$/i);
    if (chapterMatch && currentPart) {
      const chapterNum = chapterMatch[1].toUpperCase();
      const nextLine = lines[i + 1]?.trim() || '';

      currentChapter = {
        id: `chapter-${romanToInt(currentPart.partNumber)}-${romanToInt(chapterNum)}`,
        chapterNumber: chapterNum,
        title: `CHAPTER ${chapterNum}`,
        subtitle: nextLine.length > 5 && !nextLine.match(/^\d+\./) ? nextLine : '',
        articles: []
      };

      currentPart.chapters.push(currentChapter);
      console.log(`     └─ Found CHAPTER ${chapterNum}`);
      continue;
    }

    // Detect ARTICLE markers (e.g., "1.", "38A.", "161.", etc.)
    const articleMatch = line.match(/^(\d{1,3}[A-Z]*)\.\s+(.+)$/);
    if (articleMatch && currentChapter) {
      const articleNum = articleMatch[1];
      const heading = articleMatch[2].trim();

      // Skip if it looks like a false positive
      if (heading.match(/^(LAWS OF|Cap\.|Page|L\.R\.O\.)/i)) continue;
      if (heading.length < 10) continue;

      // Extract article text (from next line until next article or chapter)
      let articleText = '';
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        // Stop if we hit another article, chapter, or part
        if (nextLine.match(/^\d{1,3}[A-Z]*\.\s+/) ||
            nextLine.match(/^CHAPTER\s+[IVX]+$/i) ||
            nextLine.match(/^PART\s+[IVX]+$/i)) {
          break;
        }
        // Skip headers/footers
        if (!nextLine.match(/^(LAWS OF|Cap\.|L\.R\.O\.)/)) {
          articleText += nextLine + ' ';
        }
        j++;
        if (j - i > 50) break; // Limit text extraction
      }

      const article = {
        chunk_id: `art-${++articleCounter}`,
        articleNumber: articleNum,
        heading: heading.substring(0, 200),
        text: cleanText(articleText.substring(0, 3000)),
        partNumber: currentPart.partNumber,
        chapterNumber: currentChapter.chapterNumber,
        type: 'article'
      };

      currentChapter.articles.push(article);
      structure.constitution.totalArticles++;
    }
  }

  // Save last part
  if (currentPart) {
    structure.constitution.parts.push(currentPart);
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
    .replace(/LAWS OF GUYANA[\s\S]*?Constitution of the Co-operative Republic of Guyana/g, '')
    .replace(/Cap\.\s*\d+:\d+/g, '')
    .replace(/L\.R\.O\.\s*\d+\/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Run the parser
parseConstitutionPDF()
  .then(() => {
    console.log('\n✅ Hierarchical parsing completed!');
    console.log('💡 Structure now matches official Constitution hierarchy');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
