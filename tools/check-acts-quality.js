const data = require('../src/assets/acts-import.json');

const actStats = {};

data.sections.forEach(s => {
  const docId = s.doc_id;
  if (!actStats[docId]) {
    actStats[docId] = { total: 0, good: 0 };
  }
  actStats[docId].total++;
  if (s.text.length > 100) {
    actStats[docId].good++;
  }
});

const ranked = Object.entries(actStats)
  .map(([id, stats]) => ({
    id,
    total: stats.total,
    good: stats.good,
    pct: ((stats.good / stats.total) * 100).toFixed(0)
  }))
  .filter(a => a.total > 10)
  .sort((a, b) => b.good - a.good)
  .slice(0, 15);

console.log('Top 15 Acts by content quality:\n');
ranked.forEach(a => {
  const doc = data.documents.find(d => d.doc_id === a.id);
  const title = doc.title.substring(0, 55).padEnd(55);
  console.log(`${title} - ${a.good}/${a.total} sections (${a.pct}%)`);
});
