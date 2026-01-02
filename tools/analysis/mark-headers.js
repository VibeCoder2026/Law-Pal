/**
 * Identify and mark header-only articles in constitution.json
 *
 * Logic:
 * - Group articles by section_number
 * - If multiple articles share same section_number:
 *   - Mark first one as header if its text is < 100 chars
 *   - OR if its text is < 50% the average length of other articles
 */

const fs = require('fs');
const path = require('path');
const data = require('../../src/assets/constitution.json');

const articles = {};

// Group sections by section_number
data.sections.forEach(section => {
  const num = section.section_number;
  if (!articles[num]) {
    articles[num] = [];
  }
  articles[num].push(section);
});

let headerCount = 0;
let totalSections = data.sections.length;

// Process each section
const processedSections = data.sections.map(section => {
  const sectionNum = section.section_number;
  const sameNumberArticles = articles[sectionNum];

  // Only process if multiple articles share this number
  if (sameNumberArticles.length > 1) {
    const isFirst = sameNumberArticles[0].chunk_id === section.chunk_id;
    const textLength = section.text ? section.text.length : 0;

    // Calculate average length of other articles
    const otherArticles = sameNumberArticles.filter(a => a.chunk_id !== section.chunk_id);
    const avgOtherLength = otherArticles.reduce((sum, a) => {
      return sum + (a.text ? a.text.length : 0);
    }, 0) / otherArticles.length;

    // Mark as header if:
    // 1. It's the first article AND
    // 2. Text is < 100 chars OR < 50% of average
    if (isFirst && (textLength < 100 || textLength < avgOtherLength * 0.5)) {
      headerCount++;
      return {
        ...section,
        is_header_only: true
      };
    }
  }

  return {
    ...section,
    is_header_only: false
  };
});

console.log(`\n=== HEADER DETECTION RESULTS ===`);
console.log(`Total sections: ${totalSections}`);
console.log(`Header-only articles: ${headerCount}`);
console.log(`Percentage: ${(headerCount / totalSections * 100).toFixed(1)}%`);
console.log(`\nSample header articles:`);

// Show 10 examples
const headers = processedSections.filter(s => s.is_header_only).slice(0, 10);
headers.forEach(h => {
  console.log(`\n  Section ${h.section_number}: "${h.heading || '(no heading)'}"`);
  console.log(`  Text: "${h.text.substring(0, 80)}..."`);
  console.log(`  Length: ${h.text.length} chars`);
});

// Save updated data
const updatedData = {
  ...data,
  sections: processedSections
};

fs.writeFileSync(
  path.join(__dirname, '../../src/assets/constitution-with-headers.json'),
  JSON.stringify(updatedData, null, 2)
);

console.log(`\n\n✅ Updated data saved to: src/assets/constitution-with-headers.json`);
console.log(`\nNext steps:`);
console.log(`1. Review the updated JSON file`);
console.log(`2. Update database schema to add 'is_header_only' column`);
console.log(`3. Update UI components to filter out header-only articles`);

