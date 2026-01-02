import * as SQLite from 'expo-sqlite';
import { ConstitutionDocument, ConstitutionSection, Bookmark } from '../types';
import constitutionData from '../assets/constitution.json';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    try {
      this.db = await SQLite.openDatabaseAsync('guyana-laws.db');
      await this.migrateSchema();
      await this.createTables();
      await this.seedDatabase();
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  private async migrateSchema() {
    if (!this.db) return;

    try {
      // Check if old schema exists (with 'id' column instead of 'chunk_id')
      const tableInfo = await this.db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(sections)"
      );

      if (tableInfo && tableInfo.length > 0) {
        const hasOldSchema = tableInfo.some((col) => col.name === 'id');
        const hasNewSchema = tableInfo.some((col) => col.name === 'chunk_id');

        if (hasOldSchema && !hasNewSchema) {
          // Drop old tables and recreate with new schema
          console.log('Migrating database schema...');
          await this.db.execAsync('DROP TABLE IF EXISTS sections_fts');
          await this.db.execAsync('DROP TABLE IF EXISTS sections');
          await this.db.execAsync('DROP TABLE IF EXISTS bookmarks');
        }
      }
    } catch (error) {
      console.log('Migration check:', error);
      // If tables don't exist yet, continue normally
    }
  }

  private async createTables() {
    if (!this.db) return;

    // Create sections table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sections (
        chunk_id TEXT PRIMARY KEY,
        doc_id TEXT,
        section_number TEXT,
        heading TEXT,
        text TEXT
      );
    `);

    // Create FTS virtual table for full-text search
    await this.db.execAsync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS sections_fts USING fts5(
        chunk_id UNINDEXED,
        heading,
        text,
        content=sections,
        content_rowid=rowid
      );
    `);

    // Create triggers to keep FTS table in sync
    await this.db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS sections_ai AFTER INSERT ON sections BEGIN
        INSERT INTO sections_fts(rowid, chunk_id, heading, text)
        VALUES (new.rowid, new.chunk_id, new.heading, new.text);
      END;
    `);

    await this.db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS sections_ad AFTER DELETE ON sections BEGIN
        DELETE FROM sections_fts WHERE rowid = old.rowid;
      END;
    `);

    await this.db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS sections_au AFTER UPDATE ON sections BEGIN
        DELETE FROM sections_fts WHERE rowid = old.rowid;
        INSERT INTO sections_fts(rowid, chunk_id, heading, text)
        VALUES (new.rowid, new.chunk_id, new.heading, new.text);
      END;
    `);

    // Create bookmarks table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        doc_id TEXT,
        chunk_id TEXT,
        title TEXT,
        createdAt INTEGER,
        note TEXT
      );
    `);
  }

  private async seedDatabase() {
    if (!this.db) return;

    const count = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sections'
    );

    if (count && count.count === 0) {
      const data = constitutionData as ConstitutionDocument;

      if (data.sections && data.sections.length > 0) {
        const stmt = await this.db.prepareAsync(
          'INSERT INTO sections (chunk_id, doc_id, section_number, heading, text) VALUES (?, ?, ?, ?, ?)'
        );

        for (const section of data.sections) {
          await stmt.executeAsync([
            section.chunk_id,
            data.doc_id,
            section.section_number,
            section.heading || '',
            section.text,
          ]);
        }

        await stmt.finalizeAsync();
      }
    }
  }

  async searchSections(query: string): Promise<ConstitutionSection[]> {
    if (!this.db || !query.trim()) return [];

    try {
      const results = await this.db.getAllAsync<ConstitutionSection>(
        `SELECT s.* FROM sections s
         INNER JOIN sections_fts fts ON s.rowid = fts.rowid
         WHERE sections_fts MATCH ?
         ORDER BY rank
         LIMIT 50`,
        [query]
      );

      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  async getAllSections(): Promise<ConstitutionSection[]> {
    if (!this.db) return [];

    try {
      const results = await this.db.getAllAsync<ConstitutionSection>(
        'SELECT * FROM sections ORDER BY rowid'
      );
      return results;
    } catch (error) {
      console.error('Error fetching sections:', error);
      return [];
    }
  }

  async getSectionByChunkId(chunk_id: string): Promise<ConstitutionSection | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.getFirstAsync<ConstitutionSection>(
        'SELECT * FROM sections WHERE chunk_id = ?',
        [chunk_id]
      );
      return result || null;
    } catch (error) {
      console.error('Error fetching section:', error);
      return null;
    }
  }

  async addBookmark(doc_id: string, chunk_id: string, title: string, note?: string): Promise<void> {
    if (!this.db) return;

    const id = `bookmark-${Date.now()}`;
    await this.db.runAsync(
      'INSERT INTO bookmarks (id, doc_id, chunk_id, title, createdAt, note) VALUES (?, ?, ?, ?, ?, ?)',
      [id, doc_id, chunk_id, title, Date.now(), note || '']
    );
  }

  async removeBookmark(chunk_id: string): Promise<void> {
    if (!this.db) return;

    await this.db.runAsync('DELETE FROM bookmarks WHERE chunk_id = ?', [chunk_id]);
  }

  async getAllBookmarks(): Promise<Bookmark[]> {
    if (!this.db) return [];

    try {
      const results = await this.db.getAllAsync<Bookmark>(
        'SELECT * FROM bookmarks ORDER BY createdAt DESC'
      );
      return results;
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      return [];
    }
  }

  async isBookmarked(chunk_id: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      const result = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM bookmarks WHERE chunk_id = ?',
        [chunk_id]
      );
      return (result?.count ?? 0) > 0;
    } catch (error) {
      console.error('Error checking bookmark:', error);
      return false;
    }
  }
}

export default new DatabaseService();
