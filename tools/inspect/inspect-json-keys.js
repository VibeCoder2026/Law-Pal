const fs = require('fs');
const path = require('path');
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const file = path.join(ROOT_DIR, 'src', 'assets', 'acts-import.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log('Keys:', Object.keys(data));
if (data.documents) {
    console.log('Documents count:', data.documents.length);
    if (data.documents.length > 0) {
        console.log('Sample Doc keys:', Object.keys(data.documents[0]));
        // Check if sections are nested inside documents
        if (data.documents[0].sections) {
             console.log('Sections in first doc:', data.documents[0].sections.length);
        }
    }
}
// Check if sections are top-level
if (data.sections) {
    console.log('Top-level Sections count:', data.sections.length);
}
