#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📁 Copying law_sources to Android assets...');

const sourceDir = path.join(__dirname, '..', 'law_sources');
const targetDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'law_sources');

// Create target directory
fs.mkdirSync(path.dirname(targetDir), { recursive: true });

// Copy directory recursively
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`❌ Source directory not found: ${src}`);
    process.exit(1);
  }

  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);

    files.forEach(file => {
      copyRecursive(
        path.join(src, file),
        path.join(dest, file)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  copyRecursive(sourceDir, targetDir);
  console.log('✅ PDFs copied to Android assets successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Error copying PDFs:', error);
  process.exit(1);
}
