const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const INPUT_FILE = path.join(ROOT_DIR, 'src', 'assets', 'acts-import.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'src', 'assets', 'chunks');
const SECTIONS_PER_CHUNK = 2000; // ~2000 sections per file keeps it roughly 1-2MB

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('📦 Reading large JSON file...');
const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
const data = JSON.parse(rawData);

// 1. Save Metadata separately
const metadata = {
  documents: data.documents,
  stats: data.stats
};
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'acts-metadata.json'), 
  JSON.stringify(metadata)
);
console.log(`✅ Wrote metadata file (${data.documents.length} docs)`);

// 2. Split Sections
const sections = data.sections || [];
const totalSections = sections.length;
console.log(`📊 Found ${totalSections} sections to split.`);

let chunkCount = 0;
for (let i = 0; i < totalSections; i += SECTIONS_PER_CHUNK) {
  chunkCount++;
  const chunk = sections.slice(i, i + SECTIONS_PER_CHUNK);
  const fileName = `acts-sections-${chunkCount}.json`;
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, fileName), 
    JSON.stringify(chunk)
  );
  console.log(`   ✅ Wrote ${fileName} (${chunk.length} sections)`);
}

// 3. Generate an index file so the app knows what to load
const indexInfo = {
  metadataFile: 'acts-metadata.json',
  sectionChunks: chunkCount,
  totalSections: totalSections
};
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'index.json'),
  JSON.stringify(indexInfo, null, 2)
);

console.log(`
✨ Split complete! Created ${chunkCount} section chunks.`);
console.log(`   IMPORTANT: You must now update ActsImportService to read from src/assets/chunks/`);
