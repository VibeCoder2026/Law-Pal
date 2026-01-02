/**
 * Detailed check of the missing articles flagged in verification
 * Articles: 122, 130, 132, 168
 */

const constitutionData = require('../../src/assets/constitution.json');
const sections = constitutionData.sections;

const missingArticles = ['122', '130', '132', '168'];

console.log('\n=== CHECKING MISSING ARTICLES ===\n');

missingArticles.forEach(articleNum => {
  console.log(`\n--- Article ${articleNum} ---`);

  const matches = sections.filter(s => s.section_number === articleNum);

  if (matches.length === 0) {
    console.log('❌ NOT FOUND IN CONSTITUTION.JSON');
  } else {
    console.log(`Found ${matches.length} section(s) with this number:\n`);

    matches.forEach((section, idx) => {
      console.log(`[${idx + 1}] chunk_id: ${section.chunk_id}`);
      console.log(`    heading: ${section.heading || '(no heading)'}`);
      console.log(`    text: ${section.text.substring(0, 120)}...`);
      console.log(`    text length: ${section.text.length} chars`);
      console.log(`    is_header_only: ${section.is_header_only}`);
      console.log(`    part: ${section.part || '(none)'}`);
      console.log(`    chapter: ${section.chapter || '(none)'}`);
      console.log('');
    });
  }
});

// Also check if these exist in the backup
console.log('\n\n=== CHECKING BACKUP FILE ===\n');
try {
  const backupData = require('../../src/assets/constitution-backup.json');
  const backupSections = backupData.sections;

  missingArticles.forEach(articleNum => {
    const matches = backupSections.filter(s => s.section_number === articleNum);
    console.log(`Article ${articleNum} in backup: ${matches.length} section(s)`);
  });
} catch (error) {
  console.log('Could not load backup file');
}

