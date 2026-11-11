/**
 * VerseNest — Phase 1 Data Models & Schemas
 * Based on PRD Section 7 (Data Model) & Section 9 (Branding)
 */

// Canonical 66 Books of the Bible in standard canonical order
export const BIBLE_BOOKS = [
  // Old Testament (39 books)
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  // New Testament (27 books)
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation'
] as const;

export type BibleBook = typeof BIBLE_BOOKS[number];

export type Testament = 'Old' | 'New';

// Section 5.2: 5-stage learning pipeline
export type VerseStatus = 'New' | 'Learning' | 'Memorizing' | 'Learned' | 'Mastered';

export const VERSE_STATUSES: readonly VerseStatus[] = [
  'New',
  'Learning',
  'Memorizing',
  'Learned',
  'Mastered'
] as const;

export interface StatusHistoryEntry {
  status: VerseStatus;
  date: string; // ISO 8601 string
}

// Section 9.3: 5 Child profile avatar color accents
export type ChildColor = 'yellow' | 'blue' | 'orange' | 'purple' | 'green';

export const CHILD_COLOR_SEQUENCE: readonly ChildColor[] = [
  'purple',
  'blue',
  'yellow',
  'orange',
  'green',
] as const;

export interface Child {
  id: string;
  name: string;
  avatarColor: ChildColor;
  createdAt: string; // ISO 8601 string
}

// Section 7: Verse Schema
export interface Verse {
  id: string;
  child_id: string; // The one profile this verse belongs to
  book: BibleBook; // Enum in canonical Bible order
  chapter: number;
  verse_range: string; // e.g. "16", "1-3", "16-17"
  text: string;
  translation: string; // e.g. "NIV", "ESV", "KJV", "NLT"
  date_added: string; // ISO 8601 string
  status: VerseStatus;
  date_mastered: string | null; // Nullable, auto-filled when status becomes "Mastered"
  status_history: StatusHistoryEntry[]; // Audit log of status transitions
  copied_from_verse_id: string | null; // Nullable, reference if copied from sibling
  memorized_on?: string | null; // First memorized date, retained during later review
  notes?: string; // Optional notes (e.g. "AWANA Book 2, Section 4")
}

// Enforced limit: Section 5.3 & PRD Decision 2 — 5 Child profiles max
export const MAX_CHILDREN = 5;

// Status styling & metadata configuration
export const STATUS_CONFIG: Record<
  VerseStatus,
  {
    label: string;
    description: string;
    hex: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    pillBg: string;
  }
> = {
  New: {
    label: 'New',
    description: 'Just added, not yet started',
    hex: '#FFE8A3',
    bgClass: 'bg-[#FFE8A3]/30',
    textClass: 'text-[#8A6700]',
    borderClass: 'border-[#FFD768]',
    pillBg: 'bg-[#FFE8A3]',
  },
  Learning: {
    label: 'Learning',
    description: 'Actively being worked on',
    hex: '#4DA8DA',
    bgClass: 'bg-[#4DA8DA]/20',
    textClass: 'text-[#1E6796]',
    borderClass: 'border-[#4DA8DA]',
    pillBg: 'bg-[#4DA8DA]',
  },
  Memorizing: {
    label: 'Memorizing',
    description: 'Can say most of it, still needs prompting',
    hex: '#FF8C42',
    bgClass: 'bg-[#FF8C42]/20',
    textClass: 'text-[#B84E0B]',
    borderClass: 'border-[#FF8C42]',
    pillBg: 'bg-[#FF8C42]',
  },
  Learned: {
    label: 'Learned',
    description: 'Can recite fully with occasional help',
    hex: '#2FB6A6',
    bgClass: 'bg-[#2FB6A6]/20',
    textClass: 'text-[#0E7A6E]',
    borderClass: 'border-[#2FB6A6]',
    pillBg: 'bg-[#2FB6A6]',
  },
  Mastered: {
    label: 'Mastered',
    description: 'Recites confidently from memory, no help',
    hex: '#8E5AC8',
    bgClass: 'bg-[#8E5AC8]/20',
    textClass: 'text-[#5C2796]',
    borderClass: 'border-[#8E5AC8]',
    pillBg: 'bg-[#8E5AC8]',
  },
};

export const CHILD_COLOR_CONFIG: Record<
  ChildColor,
  {
    name: string;
    hex: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    badgeClass: string;
  }
> = {
  yellow: {
    name: 'Sunshine Yellow',
    hex: '#FFC93C',
    bgClass: 'bg-[#FFC93C]',
    borderClass: 'border-[#FFC93C]',
    textClass: 'text-[#7A5400]',
    badgeClass: 'bg-[#FFF2B2] text-[#7A5400]',
  },
  blue: {
    name: 'Sky Blue',
    hex: '#4DA8DA',
    bgClass: 'bg-[#4DA8DA]',
    borderClass: 'border-[#4DA8DA]',
    textClass: 'text-[#1A5C80]',
    badgeClass: 'bg-[#E1F3FD] text-[#1A5C80]',
  },
  orange: {
    name: 'Tangerine Orange',
    hex: '#FF8C42',
    bgClass: 'bg-[#FF8C42]',
    borderClass: 'border-[#FF8C42]',
    textClass: 'text-[#943800]',
    badgeClass: 'bg-[#FFE6D6] text-[#943800]',
  },
  purple: {
    name: 'Playful Purple',
    hex: '#8E5AC8',
    bgClass: 'bg-[#8E5AC8]',
    borderClass: 'border-[#8E5AC8]',
    textClass: 'text-[#4F1A88]',
    badgeClass: 'bg-[#F2E8FD] text-[#4F1A88]',
  },
  green: {
    name: 'Grass Green',
    hex: '#5FBF6A',
    bgClass: 'bg-[#5FBF6A]',
    borderClass: 'border-[#5FBF6A]',
    textClass: 'text-[#1B5E20]',
    badgeClass: 'bg-[#E8F8EA] text-[#1B5E20]',
  },
};

export interface VerseNestDatabase {
  version: number;
  children: Child[];
  verses: Verse[];
  activeChildId: string | null;
  lastUpdated: string;
  events?: VerseAThonEvent[];
  recitations?: RecitationRecord[];
}

export interface VerseAThonEvent {
  id: string;
  title: string;
  event_date: string | null;
  created_at: string;
  verse_ids: string[];
}
export interface RecitationRecord {
  id: string;
  event_id: string;
  verse_id: string;
  child_id: string;
  recited_on: string;
  successful: boolean;
  prompts: number;
  recorded_at: string;
}
