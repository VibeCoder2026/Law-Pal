/**
 * Acts Import Service
 *
 * Handles importing Acts & Statutes from JSON chunks into SQLite database
 * Optimized for memory usage by processing small chunks sequentially.
 */

import DatabaseService from '../db/database';
import { ACTS_VERSION, STORAGE_KEYS } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Metadata
import metadata from '../assets/chunks/acts-metadata.json';
import indexInfo from '../assets/chunks/index.json';

// Function to lazy load chunks
// We must statically import or use a switch because dynamic require is not supported by Metro
const loadChunk = (index: number) => {
  switch (index) {
    case 1: return require('../assets/chunks/acts-sections-1.json');
    case 2: return require('../assets/chunks/acts-sections-2.json');
    case 3: return require('../assets/chunks/acts-sections-3.json');
    case 4: return require('../assets/chunks/acts-sections-4.json');
    case 5: return require('../assets/chunks/acts-sections-5.json');
    case 6: return require('../assets/chunks/acts-sections-6.json');
    case 7: return require('../assets/chunks/acts-sections-7.json');
    case 8: return require('../assets/chunks/acts-sections-8.json');
    case 9: return require('../assets/chunks/acts-sections-9.json');
    case 10: return require('../assets/chunks/acts-sections-10.json');
    case 11: return require('../assets/chunks/acts-sections-11.json');
    case 12: return require('../assets/chunks/acts-sections-12.json');
    case 13: return require('../assets/chunks/acts-sections-13.json');
    case 14: return require('../assets/chunks/acts-sections-14.json');
    case 15: return require('../assets/chunks/acts-sections-15.json');
    case 16: return require('../assets/chunks/acts-sections-16.json');
    case 17: return require('../assets/chunks/acts-sections-17.json');
    default: return [];
  }
};

class ActsImportService {
  private static instance: ActsImportService;
  private importing: boolean = false;

  private constructor() {}

  public static getInstance(): ActsImportService {
    if (!ActsImportService.instance) {
      ActsImportService.instance = new ActsImportService();
    }
    return ActsImportService.instance;
  }

  /**
   * Check if Acts need to be imported/updated
   */
  async needsImport(): Promise<boolean> {
    try {
      const storedVersion = await AsyncStorage.getItem(STORAGE_KEYS.ACTS_VERSION);
      const currentVersion = parseInt(storedVersion || '0', 10);

      console.log(`[ActsImport] Version check - Stored: ${currentVersion}, Target: ${ACTS_VERSION}`);

      return currentVersion < ACTS_VERSION;
    } catch (error) {
      console.error('[ActsImport] Error checking version:', error);
      return true; // Import if we can't check
    }
  }

  /**
   * Import all Acts from chunks
   */
  async importActs(): Promise<void> {
    if (this.importing) {
      console.log('[ActsImport] Import already in progress...');
      return;
    }

    this.importing = true;
    // Get database instance (must use 'any' to access raw db property if not typed)
    const dbService = DatabaseService as any;

    try {
      console.log('[ActsImport] Starting Acts import (Chunked)...');
      console.log(`[ActsImport] Documents to import: ${metadata.documents.length}`);
      console.log(`[ActsImport] Section chunks to import: ${indexInfo.sectionChunks}`);

      // 1. Import Documents (Metadata)
      console.log('[ActsImport] Importing documents...');
      
      // Use transaction for documents
      await dbService.db.execAsync('BEGIN TRANSACTION');
      
      try {
        for (const doc of metadata.documents) {
          await dbService.db.runAsync(
            `INSERT OR REPLACE INTO documents (doc_id, doc_type, title, chapter_number, category, tier_id, tier_priority, pdf_filename)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              doc.doc_id,
              doc.doc_type,
              doc.title,
              doc.chapter_number,
              doc.category || null,
              doc.tier_id,
              doc.tier_priority,
              doc.pdf_filename,
            ]
          );
        }
        await dbService.db.execAsync('COMMIT');
        console.log(`[ActsImport] Imported ${metadata.documents.length} documents`);
      } catch (docError) {
        await dbService.db.execAsync('ROLLBACK');
        throw docError;
      }

      // 2. Import Sections (Chunk by Chunk)
      console.log('[ActsImport] Importing sections...');
      let totalImported = 0;

      for (let i = 1; i <= indexInfo.sectionChunks; i++) {
        console.log(`[ActsImport] Processing chunk ${i}/${indexInfo.sectionChunks}...`);
        
        // Load chunk into memory
        const sections = loadChunk(i);
        
        if (!sections || sections.length === 0) {
          console.warn(`[ActsImport] Chunk ${i} is empty or failed to load`);
          continue;
        }

        // Transaction for this chunk
        await dbService.db.execAsync('BEGIN TRANSACTION');
        
        try {
          for (const section of sections) {
            await dbService.db.runAsync(
              `INSERT OR REPLACE INTO sections (doc_id, chunk_id, section_number, heading, text, ordinal)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                section.doc_id,
                section.chunk_id,
                section.section_number,
                section.heading || null,
                section.text,
                section.ordinal || null,
              ]
            );
            totalImported++;
          }
          await dbService.db.execAsync('COMMIT');
          
          // Optional: Force a tiny delay to let UI breathe
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (chunkError) {
          console.error(`[ActsImport] Error importing chunk ${i}:`, chunkError);
          await dbService.db.execAsync('ROLLBACK');
          throw chunkError;
        }
        
        // Log progress
        console.log(`[ActsImport] Chunk ${i} done. Total sections: ${totalImported}`);
      }

      // 3. Update Version
      await AsyncStorage.setItem(STORAGE_KEYS.ACTS_VERSION, ACTS_VERSION.toString());
      console.log(`[ActsImport] ✅ Acts import complete! Version: ${ACTS_VERSION}. Total Sections: ${totalImported}`);

    } catch (error) {
      console.error('[ActsImport] Import failed:', error);
      throw error;
    } finally {
      this.importing = false;
    }
  }

  /**
   * Get import stats
   */
  async getImportStats() {
    try {
      const dbService = DatabaseService as any;

      const docResult = await dbService.db.getFirstAsync(
        `SELECT COUNT(*) as count FROM documents WHERE doc_type = 'act'`
      );

      const sectionResult = await dbService.db.getFirstAsync(
        `SELECT COUNT(*) as count FROM sections WHERE doc_id LIKE 'act-%'`
      );

      return {
        documents: docResult?.count || 0,
        sections: sectionResult?.count || 0,
      };
    } catch (error) {
      console.error('[ActsImport] Error getting stats:', error);
      return { documents: 0, sections: 0 };
    }
  }
}

export default ActsImportService.getInstance();