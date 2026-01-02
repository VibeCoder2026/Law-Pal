const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

/**
 * Enhanced parser that creates hierarchical grouping for articles
 * Groups related articles (e.g., 161, 161A, 161B) under common headings
 */
async function parseConstitutionPDF() {
  const pdfPath = path.join(__dirname, '../law_sources/constitution.pdf');
  const outputPath = path.join(__dirname, '../src/assets/constitution.json');

  console.log('📄 Reading PDF file...');
  const dataBuffer = fs.readFileSync(pdfPath);

  console.log('🔍 Parsing PDF content...');
  const data = await pdf(dataBuffer);

  console.log(`📊 Extracted ${data.numpages} pages`);
  console.log(`📝 Total text length: ${data.text.length} characters`);

  // Extract and organize sections
  const { sections, groups } = extractAndGroupArticles(data.text);

  console.log(`✅ Found ${sections.length} articles in ${groups.length} groups`);

  // Create the output structure with grouping metadata
  const output = {
    doc_id: "guyana-constitution",
    title: "Constitution of the Co-operative Republic of Guyana",
    sections: sections,
    groups: groups
  };

  // Write to JSON file
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`💾 Saved to ${outputPath}`);

  console.log(`\n📈 Summary:`);
  console.log(`   - Total sections: ${sections.length}`);
  console.log(`   - Total groups: ${groups.length}`);
  console.log(`   - Avg sections per group: ${(sections.length / groups.length).toFixed(1)}`);

  if (groups.length > 0) {
    console.log(`\n📚 Sample groups:`);
    groups.slice(0, 5).forEach(g => {
      console.log(`   - ${g.title} (${g.articleCount} articles)`);
    });
  }
}

/**
 * Extracts articles and creates hierarchical groups
 */
function extractAndGroupArticles(rawText) {
  const sections = [];
  const groupsMap = new Map(); // Track groups by base article number

  // Normalize text
  const text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00AD/g, '')
    .trim();

  // Find all potential articles
  const articlePattern = /(\d{1,3}[A-Z]*)\.\s+([^\n]+)/g;
  let match;
  const potentialArticles = [];

  while ((match = articlePattern.exec(text)) !== null) {
    const articleNum = match[1];
    const heading = match[2].trim();

    // Filter out likely false positives
    if (heading.length > 10 && !heading.match(/^(LAWS OF|Cap\.|Page|L\.R\.O\.)/)) {
      potentialArticles.push({
        number: articleNum,
        heading: heading,
        position: match.index
      });
    }
  }

  console.log(`   - Found ${potentialArticles.length} potential articles`);

  // Extract text between articles and group them
  for (let i = 0; i < potentialArticles.length; i++) {
    const current = potentialArticles[i];
    const next = potentialArticles[i + 1];

    const start = current.position;
    const end = next ? next.position : text.length;
    const fullText = text.substring(start, end).trim();

    // Extract body text (skip the heading line)
    const bodyText = fullText.substring(fullText.indexOf('\n') + 1).trim();

    // Only include if has meaningful content
    if (bodyText.length > 20) {
      const section = {
        chunk_id: `sec-${sections.length + 1}`,
        section_number: current.number,
        heading: current.heading.substring(0, 200),
        text: cleanText(bodyText.substring(0, 5000)),
        baseArticle: extractBaseArticle(current.number),
        chapter: null, // Will be populated if we detect chapters
        part: null     // Will be populated if we detect parts
      };

      sections.push(section);

      // Group articles by base number
      const baseNum = section.baseArticle;
      if (!groupsMap.has(baseNum)) {
        groupsMap.set(baseNum, {
          id: `group-${baseNum}`,
          baseArticle: baseNum,
          title: current.heading.substring(0, 100),
          articles: [],
          articleCount: 0,
          firstChunkId: section.chunk_id
        });
      }

      const group = groupsMap.get(baseNum);
      group.articles.push(section.chunk_id);
      group.articleCount++;
    }
  }

  // Convert groups map to array
  const groups = Array.from(groupsMap.values());

  return { sections, groups };
}

/**
 * Extracts the base article number (e.g., "161A" -> "161", "23" -> "23")
 */
function extractBaseArticle(articleNum) {
  const match = articleNum.match(/^(\d+)/);
  return match ? match[1] : articleNum;
}

/**
 * Cleans extracted text by removing headers, footers, and formatting artifacts
 */
function cleanText(text) {
  return text
    // Remove page headers/footers
    .replace(/LAWS OF GUYANA[\s\S]*?Constitution of the Co-operative Republic of Guyana/g, '')
    .replace(/Cap\.\s*\d+:\d+/g, '')
    .replace(/L\.R\.O\.\s*\d+\/\d+/g, '')
    // Normalize spacing
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Run the parser
parseConstitutionPDF()
  .then(() => {
    console.log('\n✅ Constitution parsing completed successfully!');
    console.log('\n💡 Note: Sections now include grouping information for better organization');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error parsing constitution:', error);
    process.exit(1);
  });
