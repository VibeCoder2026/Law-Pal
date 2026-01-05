/**
 * Database Service with Content Versioning
 * Handles SQLite operations with FTS5 full-text search
 */

import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DB_SCHEMA_VERSION,
  CONSTITUTION_VERSION,
  STORAGE_KEYS,
  CONSTITUTION_DOC_ID,
  FORCE_DB_RESET,
  APP_CONFIG,
} from '../constants';
import constitutionData from '../assets/constitution.json';
import { ConstitutionSection, Tier, LegalDocument, SearchResult } from '../types';
import { runMigrations, getCurrentVersion } from './migrations';
import { extractPageFromText } from '../utils/pdfPage';

class DatabaseService {
  public db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialize database with schema migration and content versioning
   */
  async init(): Promise<void> {
    try {
      console.log('[DB] Initializing database...');
      this.db = await SQLite.openDatabaseAsync('constitution.db');

      // Step 0: Force reset if flag is enabled (DEVELOPMENT ONLY)
      if (FORCE_DB_RESET) {
        console.log('[DB] ⚠️  FORCE_DB_RESET enabled - dropping all tables...');
        await this.db.execAsync(`
          DROP TABLE IF EXISTS sections_fts;
          DROP TABLE IF EXISTS sections;
          DROP TABLE IF EXISTS bookmarks;
          DROP TABLE IF EXISTS documents;
          DROP TABLE IF EXISTS tiers;
          DROP TABLE IF EXISTS migration_history;
          DROP TRIGGER IF EXISTS sections_ai;
          DROP TRIGGER IF EXISTS sections_ad;
          DROP TRIGGER IF EXISTS sections_au;
        `);
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.DB_SCHEMA_VERSION,
          STORAGE_KEYS.CONSTITUTION_VERSION,
          STORAGE_KEYS.ACTS_VERSION,
        ]);
        console.log('[DB] ✅ Database reset complete - fresh migration will run');
        console.log('[DB] ⚠️  REMEMBER: Set FORCE_DB_RESET = false in src/constants/index.ts');
      }

      // Step 1: Run schema migrations
      const currentSchemaVersion = await getCurrentVersion(this.db);
      const storedSchemaVersion = await AsyncStorage.getItem(STORAGE_KEYS.DB_SCHEMA_VERSION);
      const storedSchemaNum = storedSchemaVersion ? parseInt(storedSchemaVersion, 10) : 1;

      console.log('[DB] Schema version - Current:', currentSchemaVersion, 'Target:', DB_SCHEMA_VERSION);

      if (currentSchemaVersion < DB_SCHEMA_VERSION || storedSchemaNum < DB_SCHEMA_VERSION) {
        console.log('[DB] Running schema migrations...');
        await runMigrations(this.db);
        await AsyncStorage.setItem(STORAGE_KEYS.DB_SCHEMA_VERSION, DB_SCHEMA_VERSION.toString());
        console.log('[DB] Schema migrations complete');
      } else {
        console.log('[DB] Schema is up to date');
      }

      // Step 2: Check Constitution content version
      const storedConstVersion = await AsyncStorage.getItem(STORAGE_KEYS.CONSTITUTION_VERSION);
      const currentConstVersion = storedConstVersion ? parseInt(storedConstVersion, 10) : 0;

      console.log('[DB] Constitution version - Stored:', currentConstVersion, 'Current:', CONSTITUTION_VERSION);

      if (currentConstVersion !== CONSTITUTION_VERSION) {
        console.log('[DB] Constitution version mismatch - reimporting...');
        await this.recreateConstitutionData();
        await this.importContent();
        await AsyncStorage.setItem(STORAGE_KEYS.CONSTITUTION_VERSION, CONSTITUTION_VERSION.toString());
        console.log('[DB] Constitution import complete');
      } else {
        console.log('[DB] Constitution content up to date');
      }

      // Step 3: Check Acts content version (will be handled by ActsImportService)
      // Note: Acts import is deferred to avoid blocking app startup
      // The ActsImportService will be triggered separately

    } catch (error) {
      console.error('[DB] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Drop and recreate Constitution data only (preserves schema and bookmarks)
   */
  private async recreateConstitutionData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('[DB] Recreating Constitution data...');

    // Delete existing Constitution sections
    await this.db.runAsync(
      'DELETE FROM sections WHERE doc_id = ?',
      [CONSTITUTION_DOC_ID]
    );

    console.log('[DB] Constitution data cleared, ready for reimport');
  }

  /**
   * Drop and recreate all tables (preserves bookmarks)
   * @deprecated Use migrations instead
   */
  private async recreateTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('[DB] Recreating tables...');

    // Try to backup bookmarks (might fail if old schema)
    let bookmarks: Array<{ doc_id: string; chunk_id: string }> = [];
    try {
      bookmarks = await this.getAllBookmarks();
      console.log('[DB] Backed up', bookmarks.length, 'bookmarks');
    } catch (error) {
      console.log('[DB] Could not backup bookmarks (old schema), starting fresh');
    }

    // Drop existing tables
    await this.db.execAsync(`
      DROP TABLE IF EXISTS sections_fts;
      DROP TABLE IF EXISTS sections;
      DROP TABLE IF EXISTS bookmarks;
    `);

    // Recreate tables
    await this.createTables();

    // Restore bookmarks
    for (const bookmark of bookmarks) {
      await this.addBookmark(bookmark.doc_id, bookmark.chunk_id);
    }

    console.log('[DB] Tables recreated, bookmarks preserved:', bookmarks.length);
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      -- Main sections table with stable IDs
      CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id TEXT NOT NULL,
        chunk_id TEXT NOT NULL UNIQUE,
        section_number TEXT NOT NULL,
        heading TEXT,
        text TEXT NOT NULL,
        part TEXT,
        chapter TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- FTS5 virtual table for full-text search
      CREATE VIRTUAL TABLE IF NOT EXISTS sections_fts USING fts5(
        chunk_id UNINDEXED,
        section_number,
        heading,
        text,
        content=sections,
        content_rowid=id
      );

      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS sections_ai AFTER INSERT ON sections BEGIN
        INSERT INTO sections_fts(rowid, chunk_id, section_number, heading, text)
        VALUES (new.id, new.chunk_id, new.section_number, new.heading, new.text);
      END;

      CREATE TRIGGER IF NOT EXISTS sections_ad AFTER DELETE ON sections BEGIN
        DELETE FROM sections_fts WHERE rowid = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS sections_au AFTER UPDATE ON sections BEGIN
        UPDATE sections_fts SET
          section_number = new.section_number,
          heading = new.heading,
          text = new.text
        WHERE rowid = new.id;
      END;

      -- Bookmarks table with stable IDs
      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id TEXT NOT NULL,
        chunk_id TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        UNIQUE(doc_id, chunk_id)
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_sections_chunk_id ON sections(chunk_id);
      CREATE INDEX IF NOT EXISTS idx_sections_section_number ON sections(section_number);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_chunk ON bookmarks(doc_id, chunk_id);
    `);

    console.log('[DB] Tables created successfully');
  }

  /**
   * Import all content from constitution.json
   */
  private async importContent(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('[DB] Importing Constitution content...');
    const sections = constitutionData.sections as ConstitutionSection[];

    // Batch insert for performance
    const batchSize = 50;
    for (let i = 0; i < sections.length; i += batchSize) {
      const batch = sections.slice(i, i + batchSize);

      for (const section of batch) {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO sections (doc_id, chunk_id, section_number, heading, text, part, chapter)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            CONSTITUTION_DOC_ID,
            section.chunk_id,
            section.section_number || section.baseArticle || '',
            section.heading || '',
            section.text || '',
            section.part || '',
            section.chapter || '',
          ]
        );
      }

      console.log(`[DB] Imported ${Math.min(i + batchSize, sections.length)}/${sections.length} sections`);
    }

    console.log('[DB] Constitution import complete');
  }

  /**
   * Get section by chunk_id (stable ID)
   */
  async getSectionByChunkId(chunkId: string): Promise<ConstitutionSection | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM sections WHERE chunk_id = ?',
      [chunkId]
    );

    if (!result) return null;

    return {
      doc_id: result.doc_id,
      chunk_id: result.chunk_id,
      section_number: result.section_number,
      heading: result.heading,
      text: result.text,
      part: result.part,
      chapter: result.chapter,
      baseArticle: result.section_number,
    };
  }

  /**
   * Get section by section number (e.g., "146", "212A")
   */
  async getSectionByNumber(sectionNumber: string): Promise<ConstitutionSection | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM sections WHERE section_number = ? LIMIT 1',
      [sectionNumber]
    );

    if (!result) return null;

    return {
      doc_id: result.doc_id,
      chunk_id: result.chunk_id,
      section_number: result.section_number,
      heading: result.heading,
      text: result.text,
      part: result.part,
      chapter: result.chapter,
      baseArticle: result.section_number,
    };
  }

  /**
   * Get all sections
   */
  async getAllSections(): Promise<ConstitutionSection[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM sections ORDER BY CAST(section_number AS INTEGER), section_number'
    );

    return results.map((row) => ({
      doc_id: row.doc_id,
      chunk_id: row.chunk_id,
      section_number: row.section_number,
      heading: row.heading,
      text: row.text,
      part: row.part,
      chapter: row.chapter,
      baseArticle: row.section_number,
    }));
  }

  /**
   * Full-text search across Constitution and Acts
   */
  async search(
    query: string,
    options: { limit?: number } = {}
  ): Promise<SearchResult[]> {
    // Reinitialize database if null (can happen during hot reload)
    if (!this.db) {
      console.warn('[DB] Database was null during search, reinitializing...');
      try {
        await this.init();
      } catch (error) {
        console.error('[DB] Failed to reinitialize database:', error);
        throw new Error('Database not initialized and reinitialization failed');
      }
    }

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Clean and prepare FTS5 query - remove common stop words for better relevance
    const stopWords = new Set([
      'what', 'are', 'my', 'the', 'a', 'an', 'is', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
      'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
      'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
      'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'does',
      'did', 'has', 'have', 'had', 'do', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);

    // Extract meaningful terms only
    const terms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove punctuation
      .trim()
      .split(/\s+/)               // Split on whitespace
      .filter(term => term.length >= 3 && !stopWords.has(term))  // Filter stop words & short terms
      .map(term => `"${term.replace(/"/g, '""')}"`);  // Quote each term

    if (terms.length === 0) {
      return [];
    }

    const orQuery = terms.join(' OR ');
    const andQuery = terms.length > 1 ? terms.join(' AND ') : orQuery;
    const limit = options.limit ?? APP_CONFIG.SEARCH.MAX_RESULTS;

    try {
      const runQuery = async (ftsQuery: string) => {
        console.log(`[DB] FTS5 query: ${ftsQuery}`);
        return this.db!.getAllAsync<any>(
          `SELECT
            s.doc_id,
            s.chunk_id,
            s.section_number,
            s.heading,
            s.text,
            s.part,
            s.chapter,
            d.title as doc_title,
            d.doc_type,
            d.tier_id,
            d.chapter_number
           FROM sections s
           LEFT JOIN documents d ON s.doc_id = d.doc_id
           INNER JOIN sections_fts fts ON s.id = fts.rowid
           WHERE sections_fts MATCH ?
           ORDER BY
             CASE WHEN s.doc_id = ? THEN 0 ELSE 1 END,
             rank
           LIMIT ?`,
          [ftsQuery, CONSTITUTION_DOC_ID, limit]
        );
      };

      let results = await runQuery(andQuery);
      if (results.length === 0 && andQuery !== orQuery) {
        results = await runQuery(orQuery);
      }

      return results.map((row) => {
        const docType = row.doc_type || (row.doc_id?.startsWith('act-') ? 'act' : 'constitution');
        return {
        doc_id: row.doc_id,
        doc_title: row.doc_title || 'Constitution of Guyana',
        doc_type: docType,
        chunk_id: row.chunk_id,
        section_number: row.section_number,
        heading: row.heading,
        text: row.text,
        tier_id: row.tier_id,
        chapter: row.chapter,
        part: row.part,
        };
      });
    } catch (error) {
      console.error('[DB] Search query failed:', error);
      console.error('[DB] Query was:', andQuery);
      throw error;
    }
  }

  /**
   * Find Acts by title tokens (used to boost Act-specific queries).
   */
  async searchDocumentsByTitle(
    query: string,
    limit = 5
  ): Promise<Array<{ doc_id: string; title: string }>> {
    if (!this.db) throw new Error('Database not initialized');

    const stopWords = new Set([
      'act',
      'acts',
      'chapter',
      'cap',
      'law',
      'laws',
      'order',
      'regulation',
      'regulations',
      'section',
      'sections',
    ]);

    const tokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((term) => term.length >= 3 && !stopWords.has(term));

    if (tokens.length === 0) {
      return [];
    }

    const clauses = tokens.map(() => 'title LIKE ?').join(' AND ');
    const params = tokens.map((term) => `%${term}%`);

    const results = await this.db.getAllAsync<any>(
      `SELECT doc_id, title
       FROM documents
       WHERE doc_type = 'act' AND ${clauses}
       ORDER BY title ASC
       LIMIT ?`,
      [...params, limit]
    );

    return results.map((row) => ({
      doc_id: row.doc_id,
      title: row.title,
    }));
  }

  /**
   * Fetch a small sample of sections for specific documents.
   */
  async getSectionsForDocuments(
    docIds: string[],
    limitPerDoc = 3
  ): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');
    if (docIds.length === 0) return [];

    const placeholders = docIds.map(() => '?').join(',');
    const rows = await this.db.getAllAsync<any>(
      `SELECT
        s.doc_id,
        s.chunk_id,
        s.section_number,
        s.heading,
        s.text,
        s.part,
        s.chapter,
        s.ordinal,
        d.title as doc_title,
        d.doc_type,
        d.tier_id,
        d.chapter_number
       FROM sections s
       LEFT JOIN documents d ON s.doc_id = d.doc_id
       WHERE s.doc_id IN (${placeholders})
       ORDER BY s.doc_id, COALESCE(s.ordinal, s.id)`,
      docIds
    );

    const counts: Record<string, number> = {};
    const results: SearchResult[] = [];

    for (const row of rows) {
      const count = counts[row.doc_id] || 0;
      if (count >= limitPerDoc) continue;

      counts[row.doc_id] = count + 1;
      results.push({
        doc_id: row.doc_id,
        doc_title: row.doc_title || 'Constitution of Guyana',
        doc_type: row.doc_type || 'constitution',
        chunk_id: row.chunk_id,
        section_number: row.section_number,
        heading: row.heading,
        text: row.text,
        tier_id: row.tier_id,
        chapter: row.chapter,
        part: row.part,
      });
    }

    return results;
  }

  /**
   * Bookmark management
   */
  async addBookmark(docId: string, chunkId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'INSERT OR IGNORE INTO bookmarks (doc_id, chunk_id) VALUES (?, ?)',
      [docId, chunkId]
    );
  }

  async removeBookmark(docId: string, chunkId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'DELETE FROM bookmarks WHERE doc_id = ? AND chunk_id = ?',
      [docId, chunkId]
    );
  }

  async isBookmarked(chunkId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM bookmarks WHERE chunk_id = ?',
      [chunkId]
    );

    return (result?.count || 0) > 0;
  }

  async getAllBookmarks(): Promise<Array<{ doc_id: string; chunk_id: string }>> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      'SELECT doc_id, chunk_id FROM bookmarks ORDER BY created_at DESC'
    );

    return results;
  }

  async getBookmarkedSections(): Promise<ConstitutionSection[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      `SELECT s.* FROM sections s
       INNER JOIN bookmarks b ON s.chunk_id = b.chunk_id
       ORDER BY b.created_at DESC`
    );

    return results.map((row) => ({
      doc_id: row.doc_id,
      chunk_id: row.chunk_id,
      section_number: row.section_number,
      heading: row.heading,
      text: row.text,
      part: row.part,
      chapter: row.chapter,
      baseArticle: row.section_number,
    }));
  }

  /**
   * Tier Management
   */
  async getAllTiers(): Promise<Tier[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      `SELECT t.*, COUNT(d.id) as document_count
       FROM tiers t
       LEFT JOIN documents d ON t.id = d.tier_id
       GROUP BY t.id
       ORDER BY t.priority`
    );

    return results.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      priority: row.priority,
      icon: row.icon,
      is_priority: row.is_priority === 1,
      document_count: row.document_count,
    }));
  }

  async getTierById(tierId: string): Promise<Tier | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(
      `SELECT t.*, COUNT(d.id) as document_count
       FROM tiers t
       LEFT JOIN documents d ON t.id = d.tier_id
       WHERE t.id = ?
       GROUP BY t.id`,
      [tierId]
    );

    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      description: result.description,
      priority: result.priority,
      icon: result.icon,
      is_priority: result.is_priority === 1,
      document_count: result.document_count,
    };
  }

  /**
   * Legal Documents Management
   */
  async getDocumentsByTier(tierId: string): Promise<LegalDocument[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      `SELECT * FROM documents
       WHERE tier_id = ?
       ORDER BY tier_priority, title`,
      [tierId]
    );

    return results.map((row) => ({
      id: row.id,
      doc_id: row.doc_id,
      doc_type: row.doc_type,
      title: row.title,
      chapter_number: row.chapter_number,
      category: row.category,
      tier_id: row.tier_id,
      tier_priority: row.tier_priority,
      pdf_filename: row.pdf_filename,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  async getDocumentById(docId: string): Promise<LegalDocument | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<any>(
      'SELECT * FROM documents WHERE doc_id = ?',
      [docId]
    );

    if (!result) return null;

    return {
      id: result.id,
      doc_id: result.doc_id,
      doc_type: result.doc_type,
      title: result.title,
      chapter_number: result.chapter_number,
      category: result.category,
      tier_id: result.tier_id,
      tier_priority: result.tier_priority,
      pdf_filename: result.pdf_filename,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  async getAllActs(): Promise<LegalDocument[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      `SELECT * FROM documents
       WHERE doc_type = 'act'
       ORDER BY chapter_number, title`
    );

    return results.map((row) => ({
      id: row.id,
      doc_id: row.doc_id,
      doc_type: row.doc_type,
      title: row.title,
      chapter_number: row.chapter_number,
      category: row.category,
      tier_id: row.tier_id,
      tier_priority: row.tier_priority,
      pdf_filename: row.pdf_filename,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Get sections for a specific document
   */
  async getSectionsByDocId(docId: string): Promise<ConstitutionSection[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      `SELECT * FROM sections
       WHERE doc_id = ?
       ORDER BY ordinal, CAST(section_number AS INTEGER), section_number`,
      [docId]
    );

    return results.map((row) => ({
      doc_id: row.doc_id,
      chunk_id: row.chunk_id,
      section_number: row.section_number,
      heading: row.heading,
      text: row.text,
      part: row.part,
      chapter: row.chapter,
      baseArticle: row.section_number,
    }));
  }

  /**
   * Best-effort page hint for Act sections.
   * Uses embedded "LAWS OF GUYANA <page>" markers from nearby sections.
   */
  async getActPageHint(
    docId: string,
    chunkId: string,
    sectionText?: string | null
  ): Promise<number | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    if (!docId.startsWith('act-')) return undefined;

    let page = extractPageFromText(sectionText);
    if (page) return page;

    const row = await this.db.getFirstAsync<any>(
      'SELECT id, ordinal, text FROM sections WHERE doc_id = ? AND chunk_id = ? LIMIT 1',
      [docId, chunkId]
    );

    if (!row) return undefined;

    page = extractPageFromText(row.text);
    if (page) return page;

    const orderValue = row.ordinal ?? row.id;
    const candidates = await this.db.getAllAsync<any>(
      `SELECT text
       FROM sections
       WHERE doc_id = ?
         AND COALESCE(ordinal, id) <= ?
         AND text LIKE '%LAWS%GUYANA%'
       ORDER BY COALESCE(ordinal, id) DESC
       LIMIT 8`,
      [docId, orderValue]
    );

    for (const candidate of candidates) {
      page = extractPageFromText(candidate.text);
      if (page) return page;
    }

    return undefined;
  }

  /**
   * Get successful AI feedback examples for few-shot prompting
   */
  async getSuccessfulFeedback(limit: number = 3): Promise<Array<{ query: string; response: string }>> {
    if (!this.db) return [];
    try {
      const results = await this.db.getAllAsync<any>(
        'SELECT query, response FROM ai_feedback WHERE rating = 1 ORDER BY created_at DESC LIMIT ?',
        [limit]
      );
      return results.map(row => ({ query: row.query, response: row.response }));
    } catch (e) {
      return [];
    }
  }

  /**
   * Pinned Items Management
   */
  async addPinnedItem(
    docId: string,
    chunkId: string,
    itemType: 'constitution' | 'act',
    title: string,
    subtitle?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get the next display order (highest + 1)
    const maxOrder = await this.db.getFirstAsync<{ max_order: number }>(
      'SELECT COALESCE(MAX(display_order), -1) as max_order FROM pinned_items'
    );
    const nextOrder = (maxOrder?.max_order || 0) + 1;

    await this.db.runAsync(
      `INSERT OR REPLACE INTO pinned_items (doc_id, chunk_id, item_type, title, subtitle, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [docId, chunkId, itemType, title, subtitle || null, nextOrder]
    );
  }

  async removePinnedItem(docId: string, chunkId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'DELETE FROM pinned_items WHERE doc_id = ? AND chunk_id = ?',
      [docId, chunkId]
    );
  }

  async isPinned(docId: string, chunkId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM pinned_items WHERE doc_id = ? AND chunk_id = ?',
      [docId, chunkId]
    );

    return (result?.count || 0) > 0;
  }

  async getAllPinnedItems(): Promise<Array<{
    id: number;
    doc_id: string;
    chunk_id: string;
    item_type: 'constitution' | 'act';
    title: string;
    subtitle?: string;
    display_order: number;
  }>> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync<any>(
      'SELECT * FROM pinned_items ORDER BY display_order'
    );

    return results.map((row) => ({
      id: row.id,
      doc_id: row.doc_id,
      chunk_id: row.chunk_id,
      item_type: row.item_type,
      title: row.title,
      subtitle: row.subtitle,
      display_order: row.display_order,
    }));
  }

  async reorderPinnedItem(id: number, newOrder: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      'UPDATE pinned_items SET display_order = ? WHERE id = ?',
      [newOrder, id]
    );
  }
}

// Export singleton instance
export default new DatabaseService();
