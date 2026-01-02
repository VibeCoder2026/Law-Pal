# Acts & Statutes Database Schema

## Overview

This document outlines the database schema for integrating Guyana's Acts and Statutes into the Constitution Reader app.

## Design Principles

1. **Unified Search** - Acts and Constitution must be searchable together
2. **Tiered Organization** - Acts organized by user-friendly tiers
3. **Document Versioning** - Support for future PDF updates
4. **Backward Compatibility** - Don't break existing Constitution functionality
5. **FTS5 Full-Text Search** - Fast search across all legal documents

## Database Tables

### 1. `documents` (NEW)
Master table for all legal documents (Constitution + Acts)

```sql
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id TEXT NOT NULL UNIQUE,           -- e.g., "guyana-constitution", "act-001-01"
  doc_type TEXT NOT NULL,                 -- "constitution" or "act"
  title TEXT NOT NULL,                    -- Full document title
  chapter_number TEXT,                    -- For Acts: "001:01", "010:05", etc.
  category TEXT,                          -- Original category from catalog
  tier_id TEXT,                           -- Tiered grouping: "tier-a-rights", etc.
  tier_priority INTEGER,                  -- For sorting within tier
  pdf_filename TEXT,                      -- Original PDF filename
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_documents_type ON documents(doc_type);
CREATE INDEX idx_documents_tier ON documents(tier_id, tier_priority);
CREATE INDEX idx_documents_chapter ON documents(chapter_number);
```

### 2. `sections` (MODIFIED)
Extended to support both Constitution and Acts

```sql
CREATE TABLE sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id TEXT NOT NULL,                   -- FK to documents.doc_id
  chunk_id TEXT NOT NULL UNIQUE,          -- Stable ID for this section
  section_number TEXT NOT NULL,           -- "1", "146", "212A" (Constitution) or "1", "2(1)(a)" (Acts)
  heading TEXT,                           -- Section/Article heading
  text TEXT NOT NULL,                     -- Full text content
  part TEXT,                              -- For Constitution parts
  chapter TEXT,                           -- For Constitution chapters
  parent_section TEXT,                    -- For nested sections in Acts
  section_type TEXT,                      -- "article", "section", "subsection", "clause"
  ordinal INTEGER,                        -- Order within document
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
);

CREATE INDEX idx_sections_doc_id ON sections(doc_id);
CREATE INDEX idx_sections_chunk_id ON sections(chunk_id);
CREATE INDEX idx_sections_section_number ON sections(doc_id, section_number);
CREATE INDEX idx_sections_ordinal ON sections(doc_id, ordinal);
```

### 3. `sections_fts` (MODIFIED)
FTS5 table for full-text search across ALL documents

```sql
CREATE VIRTUAL TABLE sections_fts USING fts5(
  doc_id UNINDEXED,
  chunk_id UNINDEXED,
  doc_title UNINDEXED,                    -- NEW: Document title for search results
  section_number,
  heading,
  text,
  content=sections,
  content_rowid=id
);
```

### 4. `tiers` (NEW)
Tiered grouping metadata

```sql
CREATE TABLE tiers (
  id TEXT PRIMARY KEY,                    -- "tier-a-rights", "tier-b-work-money", etc.
  name TEXT NOT NULL,                     -- "Know Your Rights", "Work & Money"
  description TEXT NOT NULL,              -- Tier description
  priority INTEGER NOT NULL,              -- Sort order (1 = highest priority)
  icon TEXT,                              -- Icon name for UI
  is_priority BOOLEAN DEFAULT 0           -- Mark Tiers A-D as high priority
);

-- Pre-populate with tier metadata
INSERT INTO tiers VALUES
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

### 5. `bookmarks` (NO CHANGE)
Existing bookmarks table works with both Constitution and Acts

```sql
CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  UNIQUE(doc_id, chunk_id)
);

CREATE INDEX idx_bookmarks_chunk ON bookmarks(doc_id, chunk_id);
```

## Migration Strategy

### Phase 1: Schema Update (Non-Breaking)
1. Create `documents` table
2. Create `tiers` table
3. Add new columns to `sections` table (nullable)
4. Extend `sections_fts` with new fields

### Phase 2: Migrate Existing Constitution Data
1. Insert Constitution into `documents` table
2. Update existing `sections` to link to Constitution document
3. Rebuild FTS index with document titles

### Phase 3: Import Acts Data
1. Parse PDFs to extract text
2. Insert Acts into `documents` table
3. Insert Act sections into `sections` table
4. FTS triggers auto-populate search index

## TypeScript Types

```typescript
export interface LegalDocument {
  id: number;
  doc_id: string;
  doc_type: 'constitution' | 'act';
  title: string;
  chapter_number?: string;
  category?: string;
  tier_id?: string;
  tier_priority?: number;
  pdf_filename?: string;
  created_at: number;
  updated_at: number;
}

export interface ActSection {
  id: number;
  doc_id: string;
  chunk_id: string;
  section_number: string;
  heading?: string;
  text: string;
  parent_section?: string;
  section_type?: 'article' | 'section' | 'subsection' | 'clause';
  ordinal: number;
  created_at: number;
}

export interface Tier {
  id: string;
  name: string;
  description: string;
  priority: number;
  icon?: string;
  is_priority: boolean;
  document_count?: number; // Calculated
}

export interface SearchResult {
  doc_id: string;
  doc_title: string;
  doc_type: 'constitution' | 'act';
  chunk_id: string;
  section_number: string;
  heading?: string;
  text: string;
  tier_id?: string;
}
```

## Content Versioning

Current approach:
- `CONTENT_VERSION` constant increments when data changes
- On version mismatch, database is rebuilt

For Acts:
- Separate version for Acts: `ACTS_CONTENT_VERSION`
- Allow independent updates to Constitution vs Acts
- Store in AsyncStorage: `acts_content_version`

## Query Examples

### Get all Acts in a tier
```sql
SELECT d.*
FROM documents d
WHERE d.tier_id = 'tier-a-rights' AND d.doc_type = 'act'
ORDER BY d.tier_priority, d.title;
```

### Get all sections for an Act
```sql
SELECT s.*
FROM sections s
WHERE s.doc_id = 'act-001-01'
ORDER BY s.ordinal;
```

### Unified search across Constitution + Acts
```sql
SELECT
  s.doc_id,
  d.title as doc_title,
  d.doc_type,
  s.chunk_id,
  s.section_number,
  s.heading,
  s.text,
  d.tier_id
FROM sections s
INNER JOIN documents d ON s.doc_id = d.doc_id
INNER JOIN sections_fts fts ON s.id = fts.rowid
WHERE sections_fts MATCH ?
ORDER BY
  CASE d.doc_type
    WHEN 'constitution' THEN 1
    WHEN 'act' THEN 2
  END,
  rank
LIMIT 50;
```

### Get tier statistics
```sql
SELECT
  t.*,
  COUNT(d.id) as document_count
FROM tiers t
LEFT JOIN documents d ON t.id = d.tier_id
GROUP BY t.id
ORDER BY t.priority;
```

## Next Steps

1. ✅ Design schema
2. ⏳ Implement database migration
3. ⏳ Update DatabaseService with new methods
4. ⏳ Parse sample PDFs
5. ⏳ Create import script
6. ⏳ Update UI for Acts browsing



