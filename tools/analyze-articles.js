const data = require('../src/assets/constitution.json');

const sections = data.sections;
const nums = sections.map(s => parseInt(s.section_number)).filter(n => !isNaN(n)).sort((a,b) => a-b);

console.log('Min article:', Math.min(...nums));
console.log('Max article:', Math.max(...nums));
console.log('Total sections:', sections.length);
console.log('Unique article numbers:', new Set(nums).size);

// Show sample articles 1-50
const sample = sections
  .filter(s => {
    const n = parseInt(s.section_number);
    return n >= 1 && n <= 50;
  })
  .map(s => ({
    num: s.section_number,
    heading: s.heading || s.text.substring(0, 60) + '...'
  }));

console.log('\nSample articles 1-50:');
sample.forEach(s => {
  console.log(`  ${s.num}: ${s.heading}`);
});

// Articles around 150-200 range
const range150 = sections
  .filter(s => {
    const n = parseInt(s.section_number);
    return n >= 150 && n <= 200;
  })
  .map(s => s.section_number);

console.log('\nArticles 150-200:', [...new Set(range150)].sort());
