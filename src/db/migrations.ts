/**
 * Database Migrations
 *
 * Each migration is a function that takes a database connection and executes
 * the necessary SQL to upgrade the schema.
 */

import * as SQLite from 'expo-sqlite';
import { TIER_SEED_DATA } from './seedData';

export interface Migration {
  version: number;
  description: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

/**
 * Migration 1: Initial Constitution schema
 * (This is the baseline - no actual migration needed as it's already deployed)
 */
const migration1: Migration = {
  version: 1,
  description: 'Initial Constitution schema',
  up: async (db: SQLite.SQLiteDatabase) => {
    // Already deployed - this is just for documentation
    console.log('[Migration 1] Skipped (baseline schema)');
  },
};

/**
 * Migration 2: Add Acts & Statutes support
 * - Create documents table
 * - Create tiers table
 * - Extend sections table
 * - Rebuild FTS with document titles
 */
const migration2: Migration = {
  version: 2,
  description: 'Add Acts & Statutes support',
  up: async (db: SQLite.SQLiteDatabase) => {
    console.log('[Migration 2] Adding Acts & Statutes support...');

    // Step 0: Ensure base tables exist (for fresh installs)
    await db.execAsync(`
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

      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id TEXT NOT NULL,
        chunk_id TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        UNIQUE(doc_id, chunk_id)
      );

      CREATE INDEX IF NOT EXISTS idx_sections_chunk_id ON sections(chunk_id);
      CREATE INDEX IF NOT EXISTS idx_sections_section_number ON sections(section_number);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_chunk ON bookmarks(doc_id, chunk_id);
    `);
    console.log('[Migration 2] Ensured base tables exist');

    // Step 1: Create documents table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id TEXT NOT NULL UNIQUE,
        doc_type TEXT NOT NULL CHECK(doc_type IN ('constitution', 'act')),
        title TEXT NOT NULL,
        chapter_number TEXT,
        category TEXT,
        tier_id TEXT,
        tier_priority INTEGER,
        pdf_filename TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);
      CREATE INDEX IF NOT EXISTS idx_documents_tier ON documents(tier_id, tier_priority);
      CREATE INDEX IF NOT EXISTS idx_documents_chapter ON documents(chapter_number);
    `);
    console.log('[Migration 2] Created documents table');

    // Step 2: Create tiers table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tiers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        priority INTEGER NOT NULL,
        icon TEXT,
        is_priority BOOLEAN DEFAULT 0
      );
    `);
    console.log('[Migration 2] Created tiers table');

    // Step 3: Populate tiers
    for (const tier of TIER_SEED_DATA) {
      await db.runAsync(
        `INSERT OR REPLACE INTO tiers (id, name, description, priority, icon, is_priority)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tier.id, tier.name, tier.description, tier.priority, tier.icon || null, tier.is_priority ? 1 : 0]
      );
    }
    console.log('[Migration 2] Populated tiers table');

    // Step 4: Create migration_history table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        description TEXT NOT NULL,
        executed_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);
    console.log('[Migration 2] Created migration_history table');

    // Step 5: Extend sections table
    try {
      await db.execAsync(`
        ALTER TABLE sections ADD COLUMN parent_section TEXT;
        ALTER TABLE sections ADD COLUMN section_type TEXT;
        ALTER TABLE sections ADD COLUMN ordinal INTEGER;
      `);
      console.log('[Migration 2] Extended sections table');
    } catch (error: any) {
      // Columns might already exist if migration is re-run
      if (!error.message?.includes('duplicate column name')) {
        throw error;
      }
      console.log('[Migration 2] Sections table already extended');
    }

    // Step 6: Create index for ordinal
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_sections_ordinal ON sections(doc_id, ordinal);
    `);

    // Step 7: Insert Constitution document
    await db.runAsync(
      `INSERT OR IGNORE INTO documents (doc_id, doc_type, title, tier_id, tier_priority)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'guyana-constitution',
        'constitution',
        'Constitution of the Co-operative Republic of Guyana',
        null,
        0
      ]
    );
    console.log('[Migration 2] Inserted Constitution document');

    // Step 8: Update sections with ordinal values
    const sections = await db.getAllAsync<{ id: number; section_number: string }>(
      'SELECT id, section_number FROM sections'
    );

    for (const section of sections) {
      let ordinal = 0;
      const sectionNum = section.section_number;

      // Calculate ordinal from section number
      if (/^\d+$/.test(sectionNum)) {
        // Pure number: "146" -> 14600
        ordinal = parseInt(sectionNum, 10) * 100;
      } else if (/^\d+[A-Z]$/.test(sectionNum)) {
        // Number with letter: "212A" -> 21201, "212B" -> 21202
        const baseNum = parseInt(sectionNum.replace(/[A-Z]/g, ''), 10);
        const letter = sectionNum.match(/[A-Z]/)?.[0] || 'A';
        const offset = letter.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
        ordinal = baseNum * 100 + offset;
      } else {
        // Default to ID for complex numbers
        ordinal = section.id * 100;
      }

      await db.runAsync(
        'UPDATE sections SET ordinal = ? WHERE id = ?',
        [ordinal, section.id]
      );
    }
    console.log('[Migration 2] Updated section ordinals');

    // Step 9: Rebuild FTS index with document titles
    await db.execAsync(`
      -- Drop existing triggers
      DROP TRIGGER IF EXISTS sections_ai;
      DROP TRIGGER IF EXISTS sections_ad;
      DROP TRIGGER IF EXISTS sections_au;

      -- Drop existing FTS table
      DROP TABLE IF EXISTS sections_fts;

      -- Create new FTS table with doc_title
      CREATE VIRTUAL TABLE sections_fts USING fts5(
        doc_id UNINDEXED,
        chunk_id UNINDEXED,
        doc_title UNINDEXED,
        section_number,
        heading,
        text,
        content=sections,
        content_rowid=id
      );

      -- Recreate triggers with doc_title
      CREATE TRIGGER sections_ai AFTER INSERT ON sections BEGIN
        INSERT INTO sections_fts(rowid, doc_id, chunk_id, doc_title, section_number, heading, text)
        SELECT new.id, new.doc_id, new.chunk_id, COALESCE(d.title, 'Unknown'), new.section_number, new.heading, new.text
        FROM documents d WHERE d.doc_id = new.doc_id;
      END;

      CREATE TRIGGER sections_ad AFTER DELETE ON sections BEGIN
        DELETE FROM sections_fts WHERE rowid = old.id;
      END;

      CREATE TRIGGER sections_au AFTER UPDATE ON sections BEGIN
        UPDATE sections_fts SET
          section_number = new.section_number,
          heading = new.heading,
          text = new.text
        WHERE rowid = new.id;
      END;
    `);
    console.log('[Migration 2] Rebuilt FTS triggers');

    // Step 10: Populate FTS from existing sections
    await db.execAsync(`
      INSERT INTO sections_fts(rowid, doc_id, chunk_id, doc_title, section_number, heading, text)
      SELECT s.id, s.doc_id, s.chunk_id, COALESCE(d.title, 'Unknown'), s.section_number, s.heading, s.text
      FROM sections s
      LEFT JOIN documents d ON s.doc_id = d.doc_id;
    `);
    console.log('[Migration 2] Populated FTS index');

    // Step 11: Record migration
    await db.runAsync(
      `INSERT OR IGNORE INTO migration_history (version, description) VALUES (?, ?)`,
      [2, 'Add Acts & Statutes support']
    );
    console.log('[Migration 2] Migration complete!');
  },
};

/**
 * Migration 3: Add AI Feedback support
 */
const migration3: Migration = {
  version: 3,
  description: 'Add AI feedback tracking',
  up: async (db: SQLite.SQLiteDatabase) => {
    console.log('[Migration 3] Adding AI feedback tracking...');

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ai_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        response TEXT NOT NULL,
        rating INTEGER NOT NULL, -- 1: Thumbs Up, -1: Thumbs Down, 0: Flag
        metadata TEXT, -- JSON string of source IDs, model info, etc.
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_feedback_query ON ai_feedback(query);
      CREATE INDEX IF NOT EXISTS idx_feedback_rating ON ai_feedback(rating);
    `);

    await db.runAsync(
      'INSERT OR IGNORE INTO migration_history (version, description) VALUES (?, ?)',
      [3, 'Add AI feedback tracking']
    );
    console.log('[Migration 3] Migration complete!');
  },
};

/**
 * Migration 4: Add Pinned Items support
 */
const migration4: Migration = {
  version: 4,
  description: 'Add pinned items for Quick Access',
  up: async (db: SQLite.SQLiteDatabase) => {
    console.log('[Migration 4] Adding pinned items support...');

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pinned_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_id TEXT NOT NULL,
        chunk_id TEXT NOT NULL,
        item_type TEXT NOT NULL CHECK(item_type IN ('constitution', 'act')),
        title TEXT NOT NULL,
        subtitle TEXT,
        display_order INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        UNIQUE(doc_id, chunk_id)
      );

      CREATE INDEX IF NOT EXISTS idx_pinned_items_type ON pinned_items(item_type);
      CREATE INDEX IF NOT EXISTS idx_pinned_items_order ON pinned_items(display_order);
    `);

    await db.runAsync(
      'INSERT OR IGNORE INTO migration_history (version, description) VALUES (?, ?)',
      [4, 'Add pinned items for Quick Access']
    );
    console.log('[Migration 4] Migration complete!');
  },
};

/**
 * All migrations in order
 */
export const MIGRATIONS: Migration[] = [
  migration1,
  migration2,
  migration3,
  migration4,
];

/**
 * Get the current schema version from the database
 */
export async function getCurrentVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  try {
    // Check if migration_history table exists
    const tableExists = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sqlite_master
       WHERE type='table' AND name='migration_history'`
    );

    if (!tableExists || tableExists.count === 0) {
      // No migration history table = version 1 (initial schema)
      return 1;
    }

    // Get latest migration version
    const result = await db.getFirstAsync<{ version: number }>(
      'SELECT MAX(version) as version FROM migration_history'
    );

    return result?.version || 1;
  } catch (error) {
    console.error('[Migration] Error getting current version:', error);
    return 1;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const currentVersion = await getCurrentVersion(db);
  const targetVersion = MIGRATIONS[MIGRATIONS.length - 1].version;

  console.log(`[Migration] Current version: ${currentVersion}, Target version: ${targetVersion}`);

  if (currentVersion >= targetVersion) {
    console.log('[Migration] Database is up to date');
    return;
  }

  // Run pending migrations
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.log(`[Migration] Running migration ${migration.version}: ${migration.description}`);

      try {
        await migration.up(db);
        console.log(`[Migration] Migration ${migration.version} completed successfully`);
      } catch (error) {
        console.error(`[Migration] Migration ${migration.version} failed:`, error);
        throw new Error(`Migration ${migration.version} failed: ${error}`);
      }
    }
  }

  console.log('[Migration] All migrations completed successfully');
}
