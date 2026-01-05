/**
 * Application Constants
 */

/**
 * Database Schema Version
 * Increment when database schema changes (e.g., adding new tables)
 */
export const DB_SCHEMA_VERSION = 4;

/**
 * Force Database Reset (DEVELOPMENT ONLY)
 * Set to true to drop and recreate all tables on next app launch
 * IMPORTANT: Set back to false after reset completes!
 */
export const FORCE_DB_RESET = false; // Database reset complete - data will now persist

/**
 * Content Versions
 * Increment when document content changes
 */
export const CONSTITUTION_VERSION = 1; // Constitution content version
export const ACTS_VERSION = 2; // Acts content version (2 = 459 Acts with 33,461 sections - full legal text)

/**
 * Legacy CONTENT_VERSION for backward compatibility
 * @deprecated Use CONSTITUTION_VERSION instead
 */
export const CONTENT_VERSION = CONSTITUTION_VERSION;

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  CONTENT_VERSION: 'content_version', // Legacy - kept for migration
  CONSTITUTION_VERSION: 'constitution_version',
  ACTS_VERSION: 'acts_version',
  DB_SCHEMA_VERSION: 'db_schema_version',
  FONT_SIZE: 'reader_font_size',
  DARK_MODE: 'dark_mode',
  RECENT_ITEMS: 'recent_items',
  ACT_READING_PROGRESS: 'act_reading_progress',
  ANALYTICS_QUEUE: 'analytics_queue',
} as const;

/**
 * Default font sizes for reader
 */
export const FONT_SIZES = {
  MIN: 12,
  DEFAULT: 16,
  MAX: 24,
} as const;

/**
 * App configuration (tune behavior in one place)
 */
export const APP_CONFIG = {
  AI: {
    CONTEXT_SIZE: 12,
    SEARCH_RESULTS_LIMIT: 100,
    TEMPERATURE: 0.2,
    TOP_P: 0.8,
    TOP_K: 40,
    RATE_LIMIT_WINDOW_MS: 60_000,
    RATE_LIMIT_MAX_REQUESTS: 8,
  },
  SEARCH: {
    MAX_RESULTS: 50,
  },
  UI: {
    MIN_FONT_SIZE: FONT_SIZES.MIN,
    MAX_FONT_SIZE: FONT_SIZES.MAX,
    RECENT_ITEMS_LIMIT: 10,
  },
  DOWNLOAD: {
    MAX_RETRIES: 2,
    RETRY_BASE_MS: 800,
  },
  ANALYTICS: {
    STORE_LOCALLY: true,
    MAX_QUEUE: 200,
  },
} as const;

/**
 * Document IDs
 */
export const DOC_ID = 'guyana-constitution'; // Full ID for consistency
export const CONSTITUTION_DOC_ID = 'guyana-constitution';
export const CONSTITUTION_PDF_PATH =
  'constitutional-electoral/Ch_001_01_Constitution_of_The_Co-operative_Republic_of_Guyana_Act.pdf';

/**
 * Feedback channels (set these to your own values)
 */
export const FEEDBACK_GOOGLE_FORM_URL = 'YOUR_GOOGLE_FORM_URL'; // Create a Google Form and paste the prefilled URL here
export const FEEDBACK_EMAIL = 'YOUR_EMAIL'; // e.g. you@example.com
