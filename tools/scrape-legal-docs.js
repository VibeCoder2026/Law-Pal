/**
 * Scrape Legal Documents from Ministry of Legal Affairs
 *
 * This script scrapes all PDF links from https://mola.gov.gy/public/laws-of-guyana
 * and creates a catalog of all available Acts and Statutes.
 *
 * Usage: node tools/scrape-legal-docs.js
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'https://mola.gov.gy/public/laws-of-guyana';
const TOTAL_PAGES = 52;
const OUTPUT_DIR = path.join(__dirname, '..', 'law_sources');
const CATALOG_FILE = path.join(OUTPUT_DIR, 'catalog.json');

// Delay between requests to be respectful to the server
const DELAY_MS = 1000;

/**
 * Fetch HTML content from a URL
 */
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Extract document information from HTML
 */
function parseDocuments(html) {
  const documents = [];

  // Simple regex-based parsing (would be better with a proper HTML parser in production)
  // Looking for patterns like: Chapter 001:01 - "Title of Act"
  const chapterRegex = /Chapter\s+(\d+:\d+)\s+-\s+"([^"]+)"/g;
  const pdfRegex = /href="([^"]*\.pdf)"/gi;

  let match;
  const chapters = [];
  while ((match = chapterRegex.exec(html)) !== null) {
    chapters.push({
      chapter: match[1],
      title: match[2]
    });
  }

  const pdfLinks = [];
  while ((match = pdfRegex.exec(html)) !== null) {
    pdfLinks.push(match[1]);
  }

  // Match chapters with PDF links
  for (let i = 0; i < chapters.length && i < pdfLinks.length; i++) {
    documents.push({
      chapter: chapters[i].chapter,
      title: chapters[i].title,
      pdfUrl: pdfLinks[i].startsWith('http') ? pdfLinks[i] : `https://mola.gov.gy${pdfLinks[i]}`,
    });
  }

  return documents;
}

/**
 * Categorize documents by type
 */
function categorizeDocument(title, chapter) {
  const categories = {
    constitutional: /constitution|republic|national assembly|election|representation/i,
    criminal: /criminal|penal|offences|police|prison|court/i,
    civil: /civil|contract|property|land|estate|mortgage/i,
    commercial: /business|company|trade|commerce|banking|insurance/i,
    labor: /labour|labor|employment|worker|trade union/i,
    tax: /tax|revenue|customs|excise|vat/i,
    family: /marriage|family|adoption|maintenance|matrimonial/i,
    administrative: /administrative|public service|commission|board/i,
    environmental: /environment|forestry|fisheries|wildlife|mining/i,
    health: /health|medical|pharmacy|drug|mental/i,
    education: /education|school|university|teacher/i,
    transport: /transport|motor|vehicle|shipping|aviation/i,
    other: /.*/
  };

  for (const [category, pattern] of Object.entries(categories)) {
    if (pattern.test(title)) {
      return category;
    }
  }

  return 'other';
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main scraping function
 */
async function scrapeAllPages() {
  console.log('Starting to scrape legal documents...');
  console.log(`Total pages to scrape: ${TOTAL_PAGES}`);

  const allDocuments = [];

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    try {
      console.log(`\nScraping page ${page}/${TOTAL_PAGES}...`);

      const url = page === 1 ? BASE_URL : `${BASE_URL}?page=${page}`;
      const html = await fetchPage(url);
      const documents = parseDocuments(html);

      console.log(`  Found ${documents.length} documents on page ${page}`);

      // Add metadata
      documents.forEach(doc => {
        doc.page = page;
        doc.category = categorizeDocument(doc.title, doc.chapter);
        doc.scrapedAt = new Date().toISOString();
      });

      allDocuments.push(...documents);

      // Be respectful - wait between requests
      if (page < TOTAL_PAGES) {
        await sleep(DELAY_MS);
      }
    } catch (error) {
      console.error(`Error scraping page ${page}:`, error.message);
    }
  }

  return allDocuments;
}

/**
 * Save catalog to file
 */
async function saveCatalog(documents) {
  // Create output directory if it doesn't exist
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Group by category
  const byCategory = {};
  documents.forEach(doc => {
    if (!byCategory[doc.category]) {
      byCategory[doc.category] = [];
    }
    byCategory[doc.category].push(doc);
  });

  const catalog = {
    totalDocuments: documents.length,
    scrapedAt: new Date().toISOString(),
    source: BASE_URL,
    categories: Object.keys(byCategory).map(category => ({
      name: category,
      count: byCategory[category].length
    })),
    documents: documents,
    byCategory: byCategory
  };

  await fs.writeFile(CATALOG_FILE, JSON.stringify(catalog, null, 2));

  console.log(`\n✅ Catalog saved to: ${CATALOG_FILE}`);
  console.log(`📊 Total documents: ${documents.length}`);
  console.log('\n📁 Documents by category:');
  catalog.categories
    .sort((a, b) => b.count - a.count)
    .forEach(cat => {
      console.log(`  ${cat.name.padEnd(20)} ${cat.count}`);
    });
}

/**
 * Run the scraper
 */
async function main() {
  try {
    const documents = await scrapeAllPages();
    await saveCatalog(documents);

    console.log('\n🎉 Scraping complete!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { scrapeAllPages, categorizeDocument };
