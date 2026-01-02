const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

/**
 * Smart parser that groups only genuinely related articles
 * (e.g., 161, 161A, 161B that appear consecutively in the document)
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
 * Extracts articles and creates smart hierarchical groups
 * Only groups articles that appear consecutively with the same base number
 */
function extractAndGroupArticles(rawText) {
  const sections = [];
  const groups = [];

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
        position: match.index,
        baseNumber: extractBaseArticle(articleNum)
      });
    }
  }

  console.log(`   - Found ${potentialArticles.length} potential articles`);

  // Extract text between articles
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
        baseArticle: current.baseNumber,
        chapter: null,
        part: null
      };

      sections.push(section);
    }
  }

  // Now create smart groups - only group consecutive articles with same base number
  let currentGroup = null;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextSection = sections[i + 1];

    // Check if we should start a new group or continue current one
    if (!currentGroup) {
      // Start new group
      currentGroup = {
        id: `group-${groups.length + 1}`,
        baseArticle: section.baseArticle,
        title: section.heading.substring(0, 100),
        articles: [section.chunk_id],
        articleCount: 1,
        firstChunkId: section.chunk_id
      };
    } else {
      // Check if next section belongs to current group
      // Only group if: same base article AND consecutive in document
      const sameBase = section.baseArticle === currentGroup.baseArticle;
      const isSubArticle = section.section_number.length > currentGroup.baseArticle.length;

      if (sameBase && isSubArticle) {
        // Add to current group
        currentGroup.articles.push(section.chunk_id);
        currentGroup.articleCount++;
      } else {
        // Finalize current group and start new one
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

    // If this is the last section, finalize the group
    if (i === sections.length - 1 && currentGroup) {
      groups.push(currentGroup);
    }
  }

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
    console.log('\n💡 Note: Smart grouping only groups consecutive articles with same base number');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error parsing constitution:', error);
    process.exit(1);
  });
