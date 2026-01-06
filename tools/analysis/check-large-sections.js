const data = require('../../src/assets/acts-import.json');

console.log('Analyzing sections for potential issues...\n');

// Check for very large sections
const largeSections = [];
const sections = data.sections;

for (let i = 0; i < sections.length; i++) {
  const section = sections[i];
  const textLength = section.text ? section.text.length : 0;

  if (textLength > 50000) {
    largeSections.push({
      index: i,
      doc_id: section.doc_id,
      section_number: section.section_number,
      heading: section.heading,
      textLength: textLength,
    });
  }
}

console.log(`Total sections: ${sections.length}`);
console.log(`Sections with >50k chars: ${largeSections.length}\n`);

if (largeSections.length > 0) {
  console.log('Large sections found:');
  largeSections.forEach(s => {
    console.log(`  [${s.index}] ${s.doc_id} Section ${s.section_number}: ${s.textLength} chars - "${s.heading}"`);
  });
}

// Check sections around index 30,500
console.log('\n\nSections around index 30,500:');
for (let i = 30495; i < 30505 && i < sections.length; i++) {
  const s = sections[i];
  console.log(`  [${i}] ${s.doc_id} Section ${s.section_number}: ${s.text?.length || 0} chars - "${s.heading}"`);
}
