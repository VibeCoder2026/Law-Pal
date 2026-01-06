/**
 * Download and Organize Legal PDFs from Ministry of Legal Affairs
 *
 * This script uses Puppeteer to scrape the AJAX-loaded content and download all PDFs,
 * organizing them into category folders.
 *
 * Usage: node tools/download/download-legal-pdfs.js
 */

const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const BASE_URL = 'https://mola.gov.gy/public/laws-of-guyana';
const TOTAL_PAGES = 52;
const OUTPUT_DIR = path.join(ROOT_DIR, 'law_sources');
const DELAY_MS = 2000; // 2 second delay between pages

/**
 * Categorize documents by title
 */
function categorizeDocument(title, chapter) {
  const categories = {
    'constitutional-electoral': /constitution|republic|national assembly|election|representation|parliament|voter|ballot/i,
    'criminal-justice': /criminal|penal|offences|offense|police|prison|court|magistrate|judge|jury|evidence|probation|parole/i,
    'civil-law': /civil|contract|property|land|estate|mortgage|lease|rent|title|deed|inheritance/i,
    'commercial-business': /business|company|trade|commerce|banking|insurance|partnership|corporation|securities|investment/i,
    'labor-employment': /labour|labor|employment|worker|trade union|wage|salary|workplace|occupational/i,
    'tax-revenue': /tax|revenue|customs|excise|vat|duty|income tax|stamp|levy/i,
    'family-social': /marriage|family|adoption|maintenance|matrimonial|child|divorce|domestic/i,
    'administrative-public': /administrative|public service|commission|board|minister|government|public authority|ombudsman/i,
    'environment-resources': /environment|forestry|fisheries|wildlife|mining|petroleum|water|conservation|protection/i,
    'health-welfare': /health|medical|pharmacy|drug|mental|hospital|sanitation|food|hygiene/i,
    'education': /education|school|university|teacher|student|curriculum|examination/i,
    'transport-infrastructure': /transport|motor|vehicle|shipping|aviation|road|traffic|maritime|airport/i,
    'finance-banking': /bank|financial|credit|loan|money|currency|exchange|payment/i,
    'media-communications': /broadcasting|telecommunication|media|press|radio|television|internet|postal/i,
    'agriculture': /agriculture|farming|crop|livestock|veterinary|pest|fertilizer/i,
    'housing-development': /housing|building|construction|planning|development|urban|town/i,
    'energy-utilities': /energy|electricity|power|utility|water supply|sewerage/i,
    'immigration-citizenship': /immigration|passport|visa|citizenship|alien|deportation|naturalization/i,
    'indigenous-amerindian': /amerindian|indigenous|tribal|native|land rights/i,
    'consumer-protection': /consumer|price|control|competition|fair trading|standards/i,
  };

  // Try to match against categories
  for (const [category, pattern] of Object.entries(categories)) {
    if (pattern.test(title)) {
      return category;
    }
  }

  // Default category based on chapter prefix
  if (chapter.startsWith('001:')) return 'constitutional-electoral';
  if (chapter.startsWith('002:')) return 'criminal-justice';
  if (chapter.startsWith('003:')) return 'civil-law';

  return 'uncategorized';
}

/**
 * Download a file from URL
 */
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const file = require('fs').createWriteStream(filepath);

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        require('fs').unlinkSync(filepath);
        return downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        require('fs').unlinkSync(filepath);
        return reject(new Error(`Failed to download: ${response.statusCode}`));
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      require('fs').unlinkSync(filepath);
      reject(err);
    });
  });
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .substring(0, 200); // Limit length
}

/**
 * Scrape all pages and collect document information
 */
async function scrapeAllDocuments() {
  console.log('🚀 Starting Puppeteer...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set user agent to avoid blocking
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const allDocuments = [];

  console.log(`📄 Scraping ${TOTAL_PAGES} pages...\n`);

  for (let pageNum = 1; pageNum <= TOTAL_PAGES; pageNum++) {
    try {
      console.log(`Page ${pageNum}/${TOTAL_PAGES}...`);

      const url = pageNum === 1 ? BASE_URL : `${BASE_URL}?page=${pageNum}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for content to load
      await page.waitForSelector('a[href*=".pdf"]', { timeout: 10000 });

      // Extract document information
      const documents = await page.evaluate(() => {
        const docs = [];
        const seen = new Set();
        const elements = document.querySelectorAll('a[href*=".pdf"]');

        elements.forEach(link => {
          const href = link.getAttribute('href');
          const parent = link.closest('div, section, article') || link.parentElement;

          // Try to find the title - look for headings near the link
          let title = '';
          const headings = parent.querySelectorAll('h1, h2, h3, h4, h5, h6');
          if (headings.length > 0) {
            title = headings[headings.length - 1].textContent.trim();
          } else {
            title = link.textContent.trim();
          }

          // Extract chapter number from title
          const chapterMatch = title.match(/Chapter\s+(\d+:\d+)/i);
          const chapter = chapterMatch ? chapterMatch[1] : '';

          // Clean title
          title = title.replace(/^Chapter\s+\d+:\d+\s+-\s*/i, '').trim();

          if (href && title) {
            const pdfUrl = href.startsWith('http') ? href : new URL(href, window.location.href).href;

            // Deduplicate using URL as the unique key
            if (!seen.has(pdfUrl)) {
              seen.add(pdfUrl);
              docs.push({
                title,
                chapter,
                pdfUrl
              });
            }
          }
        });

        return docs;
      });

      console.log(`  Found ${documents.length} documents`);

      documents.forEach(doc => {
        doc.page = pageNum;
        doc.category = categorizeDocument(doc.title, doc.chapter);
      });

      allDocuments.push(...documents);

      // Delay between pages
      if (pageNum < TOTAL_PAGES) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }

    } catch (error) {
      console.error(`  ❌ Error on page ${pageNum}:`, error.message);
    }
  }

  await browser.close();

  console.log(`\n✅ Scraped ${allDocuments.length} documents total\n`);

  return allDocuments;
}

/**
 * Download and organize PDFs
 */
async function downloadAndOrganize(documents) {
  console.log('📥 Starting downloads...\n');

  // Create main output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Group by category
  const byCategory = {};
  documents.forEach(doc => {
    if (!byCategory[doc.category]) {
      byCategory[doc.category] = [];
    }
    byCategory[doc.category].push(doc);
  });

  // Create category folders
  for (const category of Object.keys(byCategory)) {
    const categoryDir = path.join(OUTPUT_DIR, category);
    await fs.mkdir(categoryDir, { recursive: true });
  }

  // Download each PDF
  let downloaded = 0;
  let failed = 0;

  for (const doc of documents) {
    try {
      const categoryDir = path.join(OUTPUT_DIR, doc.category);

      // Create filename
      const filenameParts = [];
      if (doc.chapter) filenameParts.push(`Ch_${doc.chapter.replace(':', '_')}`);
      filenameParts.push(sanitizeFilename(doc.title));
      const filename = filenameParts.join('_') + '.pdf';

      const filepath = path.join(categoryDir, filename);

      // Skip if already exists
      try {
        await fs.access(filepath);
        console.log(`  ⏭️  Skip (exists): ${filename}`);
        downloaded++;
        continue;
      } catch {
        // File doesn't exist, proceed with download
      }

      console.log(`  ⬇️  Downloading: ${filename}`);
      await downloadFile(doc.pdfUrl, filepath);

      downloaded++;

      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`  ❌ Failed: ${doc.title}`, error.message);
      failed++;
    }
  }

  console.log(`\n✅ Download complete!`);
  console.log(`   Downloaded: ${downloaded}`);
  console.log(`   Failed: ${failed}`);

  // Save catalog
  const catalog = {
    totalDocuments: documents.length,
    downloadedAt: new Date().toISOString(),
    source: BASE_URL,
    categories: Object.keys(byCategory).map(cat => ({
      name: cat,
      count: byCategory[cat].length,
      documents: byCategory[cat].map(d => ({
        chapter: d.chapter,
        title: d.title,
        filename: sanitizeFilename((d.chapter ? `Ch_${d.chapter.replace(':', '_')}_` : '') + d.title) + '.pdf'
      }))
    })),
  };

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'catalog.json'),
    JSON.stringify(catalog, null, 2)
  );

  console.log(`\n📊 Summary by category:`);
  catalog.categories
    .sort((a, b) => b.count - a.count)
    .forEach(cat => {
      console.log(`   ${cat.name.padEnd(30)} ${cat.count} documents`);
    });
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('  Legal Documents Downloader');
    console.log('  Ministry of Legal Affairs - Guyana');
    console.log('═══════════════════════════════════════════════════\n');

    const documents = await scrapeAllDocuments();

    if (documents.length === 0) {
      console.error('❌ No documents found!');
      process.exit(1);
    }

    await downloadAndOrganize(documents);

    console.log('\n🎉 All done!');
    console.log(`📁 PDFs saved to: ${OUTPUT_DIR}\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { scrapeAllDocuments, downloadAndOrganize, categorizeDocument };
