const data = require('../src/assets/acts-import.json');

const republicAct = data.sections.filter(s => s.doc_id === 'act-001-01');

console.log('Republic Act - Total sections:', republicAct.length);
console.log('\n===== First 10 sections =====');

republicAct.slice(0, 10).forEach(s => {
  console.log(`\n--- Section ${s.section_number}: ${s.heading} ---`);
  console.log(`Text length: ${s.text.length} chars`);
  console.log(`Text: ${s.text.substring(0, 300)}`);
});

// Also check one of the "good" acts
console.log('\n\n===== INCOME TAX ACT (Good extraction) =====');
const incomeTax = data.sections.filter(s => s.doc_id === 'act-081-01');
console.log('Income Tax Act - Total sections:', incomeTax.length);

incomeTax.slice(0, 3).forEach(s => {
  console.log(`\n--- Section ${s.section_number}: ${s.heading} ---`);
  console.log(`Text length: ${s.text.length} chars`);
  console.log(`Text: ${s.text.substring(0, 300)}`);
});
