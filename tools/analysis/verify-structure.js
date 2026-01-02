/**
 * Verify that header filtering didn't accidentally omit important structural sections
 * Checks all Parts, Chapters, and Titles to ensure their article ranges are covered
 */

const constitutionData = require('../../src/assets/constitution.json');
const constitutionStructure = require('../../src/assets/constitution-structure.json');

const sections = constitutionData.sections;

// Function to check if section is header-only (matches our filter logic)
function isHeaderOnly(section) {
  if (section.is_header_only !== undefined) {
    return section.is_header_only;
  }
  const textLength = section.text ? section.text.length : 0;
  return textLength < 100;
}

// Get all non-header sections
const nonHeaderSections = sections.filter(s => !isHeaderOnly(s));
const headerSections = sections.filter(s => isHeaderOnly(s));

console.log('\n=== HEADER FILTERING VERIFICATION ===\n');
console.log(`Total sections: ${sections.length}`);
console.log(`Header-only sections: ${headerSections.length}`);
console.log(`Non-header sections: ${nonHeaderSections.length}`);

// Create a map of section_number -> sections (non-headers only)
const sectionNumberMap = new Map();
nonHeaderSections.forEach(s => {
  const num = s.section_number;
  if (!sectionNumberMap.has(num)) {
    sectionNumberMap.set(num, []);
  }
  sectionNumberMap.get(num).push(s);
});

console.log(`\nUnique section numbers (non-headers): ${sectionNumberMap.size}`);

// Check Part 1 Chapters
console.log('\n\n=== PART 1: CHAPTERS ===\n');
const part1Issues = [];

constitutionStructure.chapters.forEach(chapter => {
  const start = chapter.articleStart;
  const end = chapter.articleEnd;

  console.log(`\nChapter ${chapter.chapterNumber}: ${chapter.title}`);
  console.log(`  Expected range: Articles ${start} - ${end}`);

  const missingArticles = [];
  for (let i = start; i <= end; i++) {
    const articleNum = i.toString();
    if (!sectionNumberMap.has(articleNum)) {
      missingArticles.push(articleNum);
    }
  }

  if (missingArticles.length > 0) {
    console.log(`  ⚠️  MISSING: Articles ${missingArticles.join(', ')}`);
    part1Issues.push({
      chapter: chapter.chapterNumber,
      title: chapter.title,
      missing: missingArticles
    });
  } else {
    console.log(`  ✅ All articles present`);
  }
});

// Check Part 2 Titles
console.log('\n\n=== PART 2: TITLES ===\n');
const part2Issues = [];

constitutionStructure.titles.forEach(title => {
  const start = title.articleStart;
  const end = title.articleEnd;

  console.log(`\nTitle ${title.titleNumber}: ${title.title}`);
  console.log(`  Expected range: Articles ${start} - ${end}`);

  const missingArticles = [];
  for (let i = start; i <= end; i++) {
    const articleNum = i.toString();
    if (!sectionNumberMap.has(articleNum)) {
      missingArticles.push(articleNum);
    }
  }

  if (missingArticles.length > 0) {
    console.log(`  ⚠️  MISSING: Articles ${missingArticles.join(', ')}`);
    part2Issues.push({
      title: title.titleNumber,
      name: title.title,
      missing: missingArticles
    });
  } else {
    console.log(`  ✅ All articles present`);
  }
});

// Check Subtitles
console.log('\n\n=== SUBTITLES ===\n');
const subtitleIssues = [];

if (constitutionStructure.subtitles && constitutionStructure.subtitles.length > 0) {
  constitutionStructure.subtitles.forEach(subtitle => {
    const start = subtitle.articleStart;
    const end = subtitle.articleEnd;

    console.log(`\nSubtitle ${subtitle.subtitleNumber}: ${subtitle.title}`);
    console.log(`  Expected range: Articles ${start} - ${end}`);

    const missingArticles = [];
    for (let i = start; i <= end; i++) {
      const articleNum = i.toString();
      if (!sectionNumberMap.has(articleNum)) {
        missingArticles.push(articleNum);
      }
    }

    if (missingArticles.length > 0) {
      console.log(`  ⚠️  MISSING: Articles ${missingArticles.join(', ')}`);
      subtitleIssues.push({
        subtitle: subtitle.subtitleNumber,
        title: subtitle.title,
        missing: missingArticles
      });
    } else {
      console.log(`  ✅ All articles present`);
    }
  });
} else {
  console.log('No subtitles defined in structure.');
}

// Summary
console.log('\n\n=== VERIFICATION SUMMARY ===\n');

if (part1Issues.length === 0 && part2Issues.length === 0 && subtitleIssues.length === 0) {
  console.log('✅ ALL STRUCTURAL SECTIONS VERIFIED');
  console.log('   No articles were incorrectly filtered out.');
  console.log('   All Part 1 Chapters, Part 2 Titles, and Subtitles have complete article coverage.');
} else {
  console.log('⚠️  DISCREPANCIES FOUND:\n');

  if (part1Issues.length > 0) {
    console.log('Part 1 Chapters with missing articles:');
    part1Issues.forEach(issue => {
      console.log(`  - Chapter ${issue.chapter} (${issue.title}): Missing ${issue.missing.join(', ')}`);
    });
  }

  if (part2Issues.length > 0) {
    console.log('\nPart 2 Titles with missing articles:');
    part2Issues.forEach(issue => {
      console.log(`  - Title ${issue.title} (${issue.name}): Missing ${issue.missing.join(', ')}`);
    });
  }

  if (subtitleIssues.length > 0) {
    console.log('\nSubtitles with missing articles:');
    subtitleIssues.forEach(issue => {
      console.log(`  - Subtitle ${issue.subtitle} (${issue.title}): Missing ${issue.missing.join(', ')}`);
    });
  }
}

// Show examples of what WAS filtered
console.log('\n\n=== EXAMPLES OF FILTERED HEADERS ===\n');
console.log('These sections were marked as header-only and filtered:\n');

headerSections.slice(0, 20).forEach(h => {
  console.log(`Section ${h.section_number}: "${h.heading || '(no heading)'}"`);
  console.log(`  Text: "${h.text.substring(0, 80)}..."`);
  console.log(`  Length: ${h.text.length} chars\n`);
});

console.log(`\n... and ${headerSections.length - 20} more header sections.`);

