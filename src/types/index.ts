// Guyana Constitution Data Schema
export interface ConstitutionDocument {
  doc_id: string;
  title: string;
  sections: ConstitutionSection[];
  groups?: ArticleGroup[];
}

export interface ConstitutionSection {
  chunk_id: string;
  section_number: string;
  heading?: string;
  text: string;
  baseArticle?: string;
  chapter?: string | null;
  part?: string | null;
  is_header_only?: boolean;
}

export interface ArticleGroup {
  id: string;
  baseArticle: string;
  title: string;
  articles: string[]; // Array of chunk_ids
  articleCount: number;
  firstChunkId: string;
}

export interface ConstitutionPart {
  id: string;
  partNumber: string;
  title: string;
  description: string;
  chapters?: string[];
  titles?: string[];
}

export interface ConstitutionChapter {
  id: string;
  chapterNumber: string;
  partId: string;
  title: string;
  articleStart: number;
  articleEnd: number;
}

export interface ConstitutionTitle {
  id: string;
  titleNumber: string;
  partId: string;
  title: string;
  articleStart: number;
  articleEnd: number;
  subtitles?: string[];
  chapters?: string[];
}

export interface ConstitutionSubtitle {
  id: string;
  subtitleNumber: string;
  titleId: string;
  title: string;
  articleStart: number;
  articleEnd: number;
}

export interface ConstitutionStructure {
  parts: ConstitutionPart[];
  chapters: ConstitutionChapter[];
  titles: ConstitutionTitle[];
  subtitles: ConstitutionSubtitle[];
}

export interface Bookmark {
  id: string;
  doc_id: string;
  chunk_id: string;
  title: string;
  createdAt: number;
  note?: string;
}

export interface RecentItem {
  id: string;
  item_type: 'constitution' | 'act';
  doc_id: string;
  chunk_id: string;
  title: string;
  subtitle?: string;
  timestamp: number;
}

export interface ActReadingProgress {
  page: number;
  updatedAt: number;
}

export interface ReaderSettings {
  fontSize: number;
  isDarkMode: boolean;
}

export type RootStackParamList = {
  MainTabs: undefined;
  Reader: { chunk_id?: string; doc_id?: string };
  ArticleList: { group: ArticleGroup };
  Parts: undefined;
  PartContents: { part?: ConstitutionPart; title?: ConstitutionTitle };
  ActsTiers: undefined;
  ActsList: { tier_id: string; tier_name: string };
  ActPdfViewer: { actTitle: string; pdfFilename: string; initialPage?: number };
  Chat: undefined;
  Feedback: undefined;
  RecentItems: undefined;
};

export type TabParamList = {
  Home: undefined;
  Library: undefined;
  Search: undefined;
  Bookmarks: undefined;
  Acts: undefined;
};

// Acts & Statutes Types
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
  document_count?: number;
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
  chapter?: string | null;
  part?: string | null;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
  suggestions?: string[];
  rating?: 1 | -1 | 0; // 1: Up, -1: Down, 0: Flag
}
