# Database Migration Plan: Constitution + Acts Integration

## Overview

This migration adds Acts & Statutes support to the existing Constitution database while maintaining backward compatibility and preserving all user data (bookmarks).

## Migration Phases

### Phase 1: Schema Extension (Non-Breaking)
Add new tables and columns without dropping existing data.

**New Tables:**
- `documents` - Master document registry
- `tiers` - Tier metadata
- `migration_history` - Track migration versions

**Modified Tables:**
- `sections` - Add new nullable columns for Act support

**No Changes:**
- `bookmarks` - Works as-is for both Constitution and Acts
- `sections_fts` - Will be rebuilt with new fields

### Phase 2: Data Migration
Migrate existing Constitution data into new schema.

**Steps:**
1. Insert Constitution into `documents` table
2. Update existing `sections` with `doc_id` references
3. Rebuild FTS index with document titles

### Phase 3: Verification
Ensure existing functionality works perfectly.

**Tests:**
- Search still works
- Bookmarks still work
- Reader still works
- Navigation still works

## Migration SQL

### Step 1: Create New Tables

```sql
-- Documents master table
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

CREATE INDEX idx_documents_type ON documents(doc_type);
CREATE INDEX idx_documents_tier ON documents(tier_id, tier_priority);
CREATE INDEX idx_documents_chapter ON documents(chapter_number);

-- Tiers metadata table
CREATE TABLE IF NOT EXISTS tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  priority INTEGER NOT NULL,
  icon TEXT,
  is_priority BOOLEAN DEFAULT 0
);

-- Migration history
CREATE TABLE IF NOT EXISTS migration_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER NOT NULL UNIQUE,
  description TEXT NOT NULL,
  executed_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

### Step 2: Populate Tiers Table

```sql
INSERT INTO tiers (id, name, description, priority, icon, is_priority) VALUES
  ('tier-a-rights', 'Know Your Rights', 'Everyday legal rights - police, courts, crimes, evidence', 1, 'shield-account', 1),
  ('tier-b-work-money', 'Work & Money', 'Employment, wages, business, consumer rights, debt', 2, 'cash-multiple', 1),
  ('tier-c-family-safety', 'Family & Safety', 'Domestic violence, children, marriage, custody, protection', 3, 'home-heart', 1),
  ('tier-d-land-housing', 'Land & Housing', 'Property, land titles, rent, housing, deeds, planning', 4, 'home-city', 1),
  ('tier-e-democracy-gov', 'Democracy & Government', 'Elections, parliament, local government, integrity, procurement', 5, 'vote', 0),
  ('tier-f-digital-life', 'Digital Life', 'Cybercrime, electronic transactions, privacy, data, telecommunications', 6, 'laptop', 0),
  ('tier-g-finance-tax', 'Finance & Tax', 'Banking, taxation, customs, revenue, financial services', 7, 'bank', 0),
  ('tier-h-health-education', 'Health & Education', 'Healthcare, medical, schools, universities, training', 8, 'school', 0),
  ('tier-i-environment-resources', 'Environment & Resources', 'Environment, mining, forestry, agriculture, wildlife', 9, 'leaf', 0),
  ('tier-j-transport-immigration', 'Transport & Immigration', 'Roads, vehicles, aviation, shipping, immigration, citizenship', 10, 'airplane-car', 0),
  ('tier-k-indigenous-special', 'Indigenous & Special Rights', 'Amerindian rights, special populations, cultural heritage', 11, 'account-group', 0),
  ('tier-l-legal-profession', 'Legal Profession & Administration', 'Legal practitioners, notaries, coroners, court administration', 12, 'gavel', 0),
  ('tier-z-other', 'Other Legal Documents', 'Specialized and administrative laws', 99, 'book', 0);
```

### Step 3: Extend Sections Table

```sql
-- Add new columns to sections (all nullable for backward compatibility)
ALTER TABLE sections ADD COLUMN parent_section TEXT;
ALTER TABLE sections ADD COLUMN section_type TEXT;
ALTER TABLE sections ADD COLUMN ordinal INTEGER;

-- Create index for ordinal ordering
CREATE INDEX IF NOT EXISTS idx_sections_ordinal ON sections(doc_id, ordinal);
```

### Step 4: Insert Constitution Document

```sql
INSERT INTO documents (doc_id, doc_type, title, tier_id, tier_priority)
VALUES (
  'guyana-constitution',
  'constitution',
  'Constitution of the Co-operative Republic of Guyana',
  NULL,
  0
);
```

### Step 5: Update Sections Ordinal

```sql
-- Set ordinal based on existing section numbers
UPDATE sections
SET ordinal = CAST(
  CASE
    WHEN section_number GLOB '*[A-Z]*' THEN
      -- Handle section numbers like "212A" -> extract base number
      CAST(REPLACE(REPLACE(REPLACE(section_number, 'A', ''), 'B', ''), 'C', '') AS INTEGER) * 100 +
      (CASE
        WHEN section_number LIKE '%A' THEN 1
        WHEN section_number LIKE '%B' THEN 2
        WHEN section_number LIKE '%C' THEN 3
        ELSE 0
      END)
    ELSE
      -- Regular numbers
      CAST(section_number AS INTEGER) * 100
  END AS INTEGER
)
WHERE doc_id = 'guyana-constitution';
```

### Step 6: Rebuild FTS Index

```sql
-- Drop existing FTS table and triggers
DROP TRIGGER IF EXISTS sections_ai;
DROP TRIGGER IF EXISTS sections_ad;
DROP TRIGGER IF EXISTS sections_au;
DROP TABLE IF EXISTS sections_fts;

-- Create new FTS table with document title
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

-- Recreate triggers
CREATE TRIGGER sections_ai AFTER INSERT ON sections BEGIN
  INSERT INTO sections_fts(rowid, doc_id, chunk_id, doc_title, section_number, heading, text)
  SELECT new.id, new.doc_id, new.chunk_id, d.title, new.section_number, new.heading, new.text
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

-- Populate FTS from existing sections
INSERT INTO sections_fts(rowid, doc_id, chunk_id, doc_title, section_number, heading, text)
SELECT s.id, s.doc_id, s.chunk_id, d.title, s.section_number, s.heading, s.text
FROM sections s
JOIN documents d ON s.doc_id = d.doc_id;
```

### Step 7: Record Migration

```sql
INSERT INTO migration_history (version, description)
VALUES (2, 'Add Acts & Statutes support - create documents and tiers tables');
```

## Version Constants

Update `src/constants/index.ts`:

```typescript
// Old
export const CONTENT_VERSION = 1;

// New
export const DB_SCHEMA_VERSION = 2; // Schema structure version
export const CONSTITUTION_VERSION = 1; // Constitution content version
export const ACTS_VERSION = 0; // Acts content version (0 = not imported yet)
```

## Migration Implementation Strategy

### Option A: Automatic Migration (Recommended)
Database service automatically detects schema version and runs migration on app startup.

**Pros:**
- Seamless user experience
- No manual intervention
- Handles edge cases

**Cons:**
- Slightly longer first startup after update

### Option B: Manual Migration
User triggers migration from settings screen.

**Pros:**
- User has control
- Can show progress

**Cons:**
- Extra step for users
- Risk of users not migrating

## Rollback Plan

If migration fails:

1. **Keep backups** - Before migration, export bookmarks to AsyncStorage
2. **Atomic transactions** - Wrap all migration SQL in BEGIN/COMMIT
3. **Version check** - Don't re-run migrations if already applied
4. **Error recovery** - If migration fails, restore from backup

## Testing Checklist

Before deploying migration:

- [ ] Backup existing database
- [ ] Run migration on fresh install
- [ ] Run migration on existing Constitution database
- [ ] Verify all existing sections are searchable
- [ ] Verify all bookmarks are preserved
- [ ] Verify Constitution reader still works
- [ ] Test rollback scenario
- [ ] Check FTS search performance
- [ ] Verify indexes are created correctly

## File Changes Required

1. **src/db/database.ts** - Implement migration logic
2. **src/constants/index.ts** - Update version constants
3. **src/db/migrations.ts** (NEW) - Migration SQL scripts
4. **src/db/seedData.ts** (NEW) - Tier metadata

## Timeline

- **Phase 1** (Schema): 30 minutes
- **Phase 2** (Migration): 30 minutes
- **Phase 3** (Testing): 1 hour
- **Total**: ~2 hours

## Next Steps After Migration

1. Parse sample Act PDFs
2. Create Act import script
3. Import Acts data
4. Build Acts UI screens
5. Implement unified search UI



