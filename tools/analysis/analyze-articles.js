const data = require('../../src/assets/constitution.json');

const articles = {};

// Group sections by section_number
data.sections.forEach(section => {
  const num = section.section_number;
  if (!articles[num]) {
    articles[num] = [];
  }
  articles[num].push({
    section_number: num,
    heading: section.heading,
    text: section.text,
    textLength: section.text ? section.text.length : 0,
    chunk_id: section.chunk_id
  });
});

// Find articles with multiple entries
const multiArticles = Object.entries(articles)
  .filter(([num, arr]) => arr.length > 1)
  .map(([num, arr]) => ({
    section_number: num,
    count: arr.length,
    entries: arr
  }));

console.log(`\nFound ${multiArticles.length} articles with multiple entries\n`);

// Show first 15 examples
multiArticles.slice(0, 15).forEach(article => {
  console.log(`\n=== Article ${article.section_number} (${article.count} entries) ===`);
  article.entries.forEach((entry, idx) => {
    console.log(`\n  [${idx + 1}] ${entry.heading || '(no heading)'}`);
    console.log(`      Text length: ${entry.textLength} chars`);
    console.log(`      Text preview: ${entry.text.substring(0, 100)}...`);
  });
});

// Analyze pattern: Is first entry always the shortest?
console.log('\n\n=== PATTERN ANALYSIS ===\n');
const firstIsHeader = multiArticles.filter(article => {
  const firstEntry = article.entries[0];
  const otherEntries = article.entries.slice(1);
  const avgOtherLength = otherEntries.reduce((sum, e) => sum + e.textLength, 0) / otherEntries.length;
  return firstEntry.textLength < avgOtherLength * 0.5; // First is less than 50% of average
});

console.log(`Articles where first entry is significantly shorter: ${firstIsHeader.length}/${multiArticles.length}`);
console.log(`Percentage: ${(firstIsHeader.length / multiArticles.length * 100).toFixed(1)}%`);

