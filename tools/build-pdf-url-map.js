/**
 * Build a mapping of category/filename -> PDF URL from mola.gov.gy
 * Outputs src/assets/acts-pdf-urls.json for in-app downloads.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');

const BASE_URL = 'https://mola.gov.gy/public/laws-of-guyana';
const TOTAL_PAGES = 52;
const DELAY_MS = 500;

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function scrapeAllDocuments() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const allDocuments = [];

  for (let pageNum = 1; pageNum <= TOTAL_PAGES; pageNum++) {
    const url = pageNum === 1 ? BASE_URL : `${BASE_URL}?page=${pageNum}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('a[href*=".pdf"]', { timeout: 10000 });

    const documents = await page.evaluate(() => {
      const docs = [];
      const seen = new Set();
      const elements = document.querySelectorAll('a[href*=".pdf"]');

      elements.forEach((link) => {
        const href = link.getAttribute('href');
        const parent = link.closest('div, section, article') || link.parentElement;

        let title = '';
        const headings = parent.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length > 0) {
          title = headings[headings.length - 1].textContent.trim();
        } else {
          title = link.textContent.trim();
        }

        const chapterMatch = title.match(/Chapter\s+(\d+:\d+)/i);
        const chapter = chapterMatch ? chapterMatch[1] : '';
        title = title.replace(/^Chapter\s+\d+:\d+\s+-\s*/i, '').trim();

        if (href && title) {
          const pdfUrl = href.startsWith('http') ? href : new URL(href, window.location.href).href;
          if (!seen.has(pdfUrl)) {
            seen.add(pdfUrl);
            docs.push({ title, chapter, pdfUrl });
          }
        }
      });

      return docs;
    });

    allDocuments.push(...documents);

    if (pageNum < TOTAL_PAGES) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  await browser.close();

  // Deduplicate by URL across pages
  const deduped = new Map();
  allDocuments.forEach((doc) => {
    if (!deduped.has(doc.pdfUrl)) {
      deduped.set(doc.pdfUrl, doc);
    }
  });

  return Array.from(deduped.values());
}

async function main() {
  const metadataPath = path.join(__dirname, '..', 'src', 'assets', 'chunks', 'acts-metadata.json');
  const outputPath = path.join(__dirname, '..', 'src', 'assets', 'acts-pdf-urls.json');

  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
  const scraped = await scrapeAllDocuments();

  const scrapedByKey = new Map();
  const scrapedByChapter = new Map();

  scraped.forEach((doc) => {
    const key = `${doc.chapter || ''}::${normalizeTitle(doc.title)}`;
    if (!scrapedByKey.has(key)) {
      scrapedByKey.set(key, doc);
    }
    if (doc.chapter) {
      if (!scrapedByChapter.has(doc.chapter)) {
        scrapedByChapter.set(doc.chapter, []);
      }
      scrapedByChapter.get(doc.chapter).push(doc);
    }
  });

  const urls = {};
  const missing = [];

  metadata.documents.forEach((doc) => {
    const chapter = doc.chapter_number || '';
    const key = `${chapter}::${normalizeTitle(doc.title)}`;
    let match = scrapedByKey.get(key);

    if (!match && chapter && scrapedByChapter.has(chapter)) {
      const options = scrapedByChapter.get(chapter);
      if (options.length === 1) {
        match = options[0];
      }
    }

    if (match) {
      const pathKey = doc.category && doc.pdf_filename
        ? `${doc.category}/${doc.pdf_filename}`
        : doc.pdf_filename;
      urls[pathKey] = match.pdfUrl;
    } else {
      missing.push({
        doc_id: doc.doc_id,
        chapter_number: doc.chapter_number,
        title: doc.title,
      });
    }
  });

  const output = {
    generatedAt: new Date().toISOString(),
    source: BASE_URL,
    totalScraped: scraped.length,
    totalMapped: Object.keys(urls).length,
    totalMissing: missing.length,
    urls,
    missing,
  };

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));

  console.log(`Saved URL map to ${outputPath}`);
  console.log(`Mapped: ${output.totalMapped}, Missing: ${output.totalMissing}`);
  if (missing.length > 0) {
    console.log('Missing examples:', missing.slice(0, 10));
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to build PDF URL map:', error);
    process.exit(1);
  });
}
