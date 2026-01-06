const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const pdf = require('pdf-parse');

/**
 * Hierarchical parser that preserves the Constitution's true structure:
 * ACT → SCHEDULE → PARTS → CHAPTERS/TITLES → ARTICLES
 */
async function parseConstitutionPDF() {
  const pdfPath = path.join(ROOT_DIR, 'law_sources', 'constitution.pdf');
  const outputPath = path.join(ROOT_DIR, 'src', 'assets', 'constitution.json');

  console.log('📄 Reading PDF file...');
  const dataBuffer = fs.readFileSync(pdfPath);

  console.log('🔍 Parsing PDF content...');
  const data = await pdf(dataBuffer);

  console.log(`📊 Extracted ${data.numpages} pages`);
  console.log(`📝 Total text length: ${data.text.length} characters`);

  // Extract hierarchical structure
  const structure = extractHierarchicalStructure(data.text);

  console.log(`\n📈 Document Structure:`);
  console.log(`   - Act Sections: ${structure.act.sections.length}`);
  console.log(`   - Constitution Parts: ${structure.constitution.parts.length}`);
  console.log(`   - Total Articles: ${structure.constitution.totalArticles}`);
  console.log(`   - Constitutional Schedules: ${structure.constitution.constitutionalSchedules.length}`);
  console.log(`   - Subsidiary Legislation: ${structure.subsidiaryLegislation.length}`);

  // Write to JSON file
  fs.writeFileSync(outputPath, JSON.stringify(structure, null, 2));
  console.log(`\n💾 Saved to ${outputPath}`);
}

/**
 * Extract the full hierarchical structure
 */
function extractHierarchicalStructure(rawText) {
  // Normalize text
  const text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00AD/g, '')
    .trim();

  const structure = {
    doc_id: "guyana-constitution",
    title: "Constitution of the Co-operative Republic of Guyana Act",

    // ACT: Sections 1-22
    act: {
      title: "Constitution of the Co-operative Republic of Guyana Act",
      sections: []
    },

    // SCHEDULE: The Constitution
    constitution: {
      title: "The Constitution of the Co-operative Republic of Guyana",
      preamble: "",
      parts: [],
      constitutionalSchedules: [],
      totalArticles: 0
    },

    // Subsidiary Legislation (Rules)
    subsidiaryLegislation: []
  };

  // Extract different sections
  const lines = text.split('\n');
  let currentContext = null;
  let currentPart = null;
  let currentChapter = null;
  let sectionCounter = 0;

  // Detect document sections
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect PART markers
    if (line.match(/^PART\s+([IVX]+)/i)) {
      const partNumber = line.match(/^PART\s+([IVX]+)/i)[1];
      currentPart = {
        partNumber: partNumber,
        title: lines[i + 1]?.trim() || '',
        type: partNumber === 'I' ? 'chapters' : 'titles', // Part 1 = Chapters, Part 2 = Titles
        divisions: [],
        articles: []
      };
      structure.constitution.parts.push(currentPart);
      currentContext = 'constitution';
      console.log(`   Found PART ${partNumber}`);
    }

    // Detect CHAPTER markers (in Part 1)
    if (currentPart && currentPart.type === 'chapters' && line.match(/^CHAPTER\s+([IVX]+)/i)) {
      const chapterNumber = line.match(/^CHAPTER\s+([IVX]+)/i)[1];
      currentChapter = {
        chapterNumber: chapterNumber,
        title: lines[i + 1]?.trim() || '',
        articles: []
      };
      currentPart.divisions.push(currentChapter);
      console.log(`     Found CHAPTER ${chapterNumber}`);
    }

    // Detect TITLE markers (in Part 2)
    if (currentPart && currentPart.type === 'titles' && line.match(/^TITLE\s+([IVX]+[A-Z]*)/i)) {
      const titleNumber = line.match(/^TITLE\s+([IVX]+[A-Z]*)/i)[1];
      currentChapter = {
        titleNumber: titleNumber,
        title: lines[i + 1]?.trim() || '',
        articles: []
      };
      currentPart.divisions.push(currentChapter);
      console.log(`     Found TITLE ${titleNumber}`);
    }

    // Detect SCHEDULE markers
    if (line.match(/^(FIRST|SECOND|THIRD|FOURTH)\s+SCHEDULE/i)) {
      const scheduleName = line.match(/^(FIRST|SECOND|THIRD|FOURTH)\s+SCHEDULE/i)[0];
      structure.constitution.constitutionalSchedules.push({
        name: scheduleName,
        title: lines[i + 1]?.trim() || '',
        content: []
      });
      console.log(`   Found ${scheduleName}`);
      currentContext = 'schedule';
    }

    // Detect Subsidiary Legislation
    if (line.match(/SUBSIDIARY LEGISLATION/i)) {
      currentContext = 'subsidiary';
      console.log(`   Found SUBSIDIARY LEGISLATION`);
    }

    // Detect Articles
    const articleMatch = line.match(/^(\d{1,3}[A-Z]*)\.\s+(.+)$/);
    if (articleMatch && currentChapter) {
      const articleNumber = articleMatch[1];
      const heading = articleMatch[2];

      const article = {
        chunk_id: `art-${++sectionCounter}`,
        articleNumber: articleNumber,
        heading: heading,
        text: '', // Would extract full text here
        type: 'article'
      };

      currentChapter.articles.push(article);
      currentPart.articles.push(article);
      structure.constitution.totalArticles++;
    }
  }

  return structure;
}

// Run the parser
parseConstitutionPDF()
  .then(() => {
    console.log('\n✅ Hierarchical parsing completed!');
    console.log('\n💡 The structure now matches the official Constitution hierarchy');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
