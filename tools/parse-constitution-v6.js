const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

/**
 * Constitution-only parser (v6)
 * Extracts ONLY the Constitution articles (not Act sections or subsidiary rules)
 * Stops at "SUBSIDIARY LEGISLATION" marker
 */
async function parseConstitutionPDF() {
  const pdfPath = path.join(__dirname, '../law_sources/constitution.pdf');
  const outputPath = path.join(__dirname, '../src/assets/constitution.json');

  console.log('📄 Reading PDF file...');
  const dataBuffer = fs.readFileSync(pdfPath);

  console.log('🔍 Parsing PDF content...');
  const data = await pdf(dataBuffer);

  console.log(`📊 Extracted ${data.numpages} pages`);

  // Extract ONLY Constitution articles
  const { sections, groups } = extractConstitutionOnly(data.text);

  console.log(`\n✅ Found ${sections.length} Constitution articles in ${groups.length} groups`);

  const output = {
    doc_id: "guyana-constitution",
    title: "Constitution of the Co-operative Republic of Guyana",
    sections: sections,
    groups: groups
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`💾 Saved to ${outputPath}`);

  console.log(`\n📚 Sample groups:`);
  groups.slice(0, 5).forEach(g => {
    console.log(`   - Article ${g.baseArticle}: ${g.title.substring(0, 60)} (${g.articleCount})`);
  });
}

function extractConstitutionOnly(rawText) {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Find the Constitution SCHEDULE section
  const scheduleStart = text.indexOf('SCHEDULE');
  const subsidiaryStart = text.indexOf('SUBSIDIARY LEGISLATION');

  if (scheduleStart === -1) {
    console.log('⚠️  Could not find SCHEDULE marker');
    return { sections: [], groups: [] };
  }

  // Extract only the Constitution portion
  const constitutionText = subsidiaryStart > scheduleStart
    ? text.substring(scheduleStart, subsidiaryStart)
    : text.substring(scheduleStart);

  console.log(`📖 Constitution text length: ${constitutionText.length} chars`);

  // Now extract articles from this section only
  const sections = [];
  const articlePattern = /(\d{1,3}[A-Z]*)\.\s+([^\n]+)/g;
  let match;
  const potentialArticles = [];

  while ((match = articlePattern.exec(constitutionText)) !== null) {
    const articleNum = match[1];
    const heading = match[2].trim();

    // Filter out false positives
    if (heading.length > 10 && !heading.match(/^(LAWS OF|Cap\.|Page|L\.R\.O\.)/i)) {
      potentialArticles.push({
        number: articleNum,
        heading: heading,
        position: match.index,
        baseNumber: extractBaseArticle(articleNum)
      });
    }
  }

  console.log(`   - Found ${potentialArticles.length} potential articles`);

  // Extract text for each article
  for (let i = 0; i < potentialArticles.length; i++) {
    const current = potentialArticles[i];
    const next = potentialArticles[i + 1];

    const start = current.position;
    const end = next ? next.position : constitutionText.length;
    const fullText = constitutionText.substring(start, end).trim();
    const bodyText = fullText.substring(fullText.indexOf('\n') + 1).trim();

    if (bodyText.length > 20) {
      sections.push({
        chunk_id: `art-${sections.length + 1}`,
        section_number: current.number,
        heading: current.heading.substring(0, 200),
        text: cleanText(bodyText.substring(0, 3000)),
        baseArticle: current.baseNumber,
        type: 'constitution-article'
      });
    }
  }

  // Create smart groups (consecutive articles with same base)
  const groups = [];
  let currentGroup = null;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (!currentGroup) {
      currentGroup = {
        id: `group-${groups.length + 1}`,
        baseArticle: section.baseArticle,
        title: section.heading.substring(0, 100),
        articles: [section.chunk_id],
        articleCount: 1,
        firstChunkId: section.chunk_id
      };
    } else {
      const sameBase = section.baseArticle === currentGroup.baseArticle;
      const isSubArticle = section.section_number.length > currentGroup.baseArticle.length;

      if (sameBase && isSubArticle) {
        currentGroup.articles.push(section.chunk_id);
        currentGroup.articleCount++;
      } else {
        groups.push(currentGroup);
        currentGroup = {
          id: `group-${groups.length + 1}`,
          baseArticle: section.baseArticle,
          title: section.heading.substring(0, 100),
          articles: [section.chunk_id],
          articleCount: 1,
          firstChunkId: section.chunk_id
        };
      }
    }

    if (i === sections.length - 1 && currentGroup) {
      groups.push(currentGroup);
    }
  }

  return { sections, groups };
}

function extractBaseArticle(articleNum) {
  const match = articleNum.match(/^(\d+)/);
  return match ? match[1] : articleNum;
}

function cleanText(text) {
  return text
    .replace(/LAWS OF GUYANA[\s\S]*?Constitution of the Co-operative Republic of Guyana/g, '')
    .replace(/Cap\.\s*\d+:\d+/g, '')
    .replace(/L\.R\.O\.\s*\d+\/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

parseConstitutionPDF()
  .then(() => {
    console.log('\n✅ Constitution-only parsing completed!');
    console.log('💡 Extracted only Constitution articles (no Act sections or subsidiary rules)');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
