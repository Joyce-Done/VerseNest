import { BIBLE_BOOKS, BibleBook, Testament, Verse } from './types';

export interface BibleBookInfo {
  name: BibleBook;
  canonicalOrder: number; // 1 to 66
  testament: Testament;
  totalChapters: number;
  abbreviation: string;
}

// Full 66 canonical Bible books metadata
export const BIBLE_BOOKS_INFO: Record<BibleBook, BibleBookInfo> = {
  // Old Testament (1-39)
  Genesis: { name: 'Genesis', canonicalOrder: 1, testament: 'Old', totalChapters: 50, abbreviation: 'Gen' },
  Exodus: { name: 'Exodus', canonicalOrder: 2, testament: 'Old', totalChapters: 40, abbreviation: 'Exod' },
  Leviticus: { name: 'Leviticus', canonicalOrder: 3, testament: 'Old', totalChapters: 27, abbreviation: 'Lev' },
  Numbers: { name: 'Numbers', canonicalOrder: 4, testament: 'Old', totalChapters: 36, abbreviation: 'Num' },
  Deuteronomy: { name: 'Deuteronomy', canonicalOrder: 5, testament: 'Old', totalChapters: 34, abbreviation: 'Deut' },
  Joshua: { name: 'Joshua', canonicalOrder: 6, testament: 'Old', totalChapters: 24, abbreviation: 'Josh' },
  Judges: { name: 'Judges', canonicalOrder: 7, testament: 'Old', totalChapters: 21, abbreviation: 'Judg' },
  Ruth: { name: 'Ruth', canonicalOrder: 8, testament: 'Old', totalChapters: 4, abbreviation: 'Ruth' },
  '1 Samuel': { name: '1 Samuel', canonicalOrder: 9, testament: 'Old', totalChapters: 31, abbreviation: '1Sam' },
  '2 Samuel': { name: '2 Samuel', canonicalOrder: 10, testament: 'Old', totalChapters: 24, abbreviation: '2Sam' },
  '1 Kings': { name: '1 Kings', canonicalOrder: 11, testament: 'Old', totalChapters: 22, abbreviation: '1Kgs' },
  '2 Kings': { name: '2 Kings', canonicalOrder: 12, testament: 'Old', totalChapters: 25, abbreviation: '2Kgs' },
  '1 Chronicles': { name: '1 Chronicles', canonicalOrder: 13, testament: 'Old', totalChapters: 29, abbreviation: '1Chr' },
  '2 Chronicles': { name: '2 Chronicles', canonicalOrder: 14, testament: 'Old', totalChapters: 36, abbreviation: '2Chr' },
  Ezra: { name: 'Ezra', canonicalOrder: 15, testament: 'Old', totalChapters: 10, abbreviation: 'Ezra' },
  Nehemiah: { name: 'Nehemiah', canonicalOrder: 16, testament: 'Old', totalChapters: 13, abbreviation: 'Neh' },
  Esther: { name: 'Esther', canonicalOrder: 17, testament: 'Old', totalChapters: 10, abbreviation: 'Esth' },
  Job: { name: 'Job', canonicalOrder: 18, testament: 'Old', totalChapters: 42, abbreviation: 'Job' },
  Psalms: { name: 'Psalms', canonicalOrder: 19, testament: 'Old', totalChapters: 150, abbreviation: 'Ps' },
  Proverbs: { name: 'Proverbs', canonicalOrder: 20, testament: 'Old', totalChapters: 31, abbreviation: 'Prov' },
  Ecclesiastes: { name: 'Ecclesiastes', canonicalOrder: 21, testament: 'Old', totalChapters: 12, abbreviation: 'Eccl' },
  'Song of Solomon': { name: 'Song of Solomon', canonicalOrder: 22, testament: 'Old', totalChapters: 8, abbreviation: 'Song' },
  Isaiah: { name: 'Isaiah', canonicalOrder: 23, testament: 'Old', totalChapters: 66, abbreviation: 'Isa' },
  Jeremiah: { name: 'Jeremiah', canonicalOrder: 24, testament: 'Old', totalChapters: 52, abbreviation: 'Jer' },
  Lamentations: { name: 'Lamentations', canonicalOrder: 25, testament: 'Old', totalChapters: 5, abbreviation: 'Lam' },
  Ezekiel: { name: 'Ezekiel', canonicalOrder: 26, testament: 'Old', totalChapters: 48, abbreviation: 'Ezek' },
  Daniel: { name: 'Daniel', canonicalOrder: 27, testament: 'Old', totalChapters: 12, abbreviation: 'Dan' },
  Hosea: { name: 'Hosea', canonicalOrder: 28, testament: 'Old', totalChapters: 14, abbreviation: 'Hos' },
  Joel: { name: 'Joel', canonicalOrder: 29, testament: 'Old', totalChapters: 3, abbreviation: 'Joel' },
  Amos: { name: 'Amos', canonicalOrder: 30, testament: 'Old', totalChapters: 9, abbreviation: 'Amos' },
  Obadiah: { name: 'Obadiah', canonicalOrder: 31, testament: 'Old', totalChapters: 1, abbreviation: 'Obad' },
  Jonah: { name: 'Jonah', canonicalOrder: 32, testament: 'Old', totalChapters: 4, abbreviation: 'Jonah' },
  Micah: { name: 'Micah', canonicalOrder: 33, testament: 'Old', totalChapters: 7, abbreviation: 'Mic' },
  Nahum: { name: 'Nahum', canonicalOrder: 34, testament: 'Old', totalChapters: 3, abbreviation: 'Nah' },
  Habakkuk: { name: 'Habakkuk', canonicalOrder: 35, testament: 'Old', totalChapters: 3, abbreviation: 'Hab' },
  Zephaniah: { name: 'Zephaniah', canonicalOrder: 36, testament: 'Old', totalChapters: 3, abbreviation: 'Zeph' },
  Haggai: { name: 'Haggai', canonicalOrder: 37, testament: 'Old', totalChapters: 2, abbreviation: 'Hag' },
  Zechariah: { name: 'Zechariah', canonicalOrder: 38, testament: 'Old', totalChapters: 14, abbreviation: 'Zech' },
  Malachi: { name: 'Malachi', canonicalOrder: 39, testament: 'Old', totalChapters: 4, abbreviation: 'Mal' },

  // New Testament (40-66)
  Matthew: { name: 'Matthew', canonicalOrder: 40, testament: 'New', totalChapters: 28, abbreviation: 'Matt' },
  Mark: { name: 'Mark', canonicalOrder: 41, testament: 'New', totalChapters: 16, abbreviation: 'Mark' },
  Luke: { name: 'Luke', canonicalOrder: 42, testament: 'New', totalChapters: 24, abbreviation: 'Luke' },
  John: { name: 'John', canonicalOrder: 43, testament: 'New', totalChapters: 21, abbreviation: 'John' },
  Acts: { name: 'Acts', canonicalOrder: 44, testament: 'New', totalChapters: 28, abbreviation: 'Acts' },
  Romans: { name: 'Romans', canonicalOrder: 45, testament: 'New', totalChapters: 16, abbreviation: 'Rom' },
  '1 Corinthians': { name: '1 Corinthians', canonicalOrder: 46, testament: 'New', totalChapters: 16, abbreviation: '1Cor' },
  '2 Corinthians': { name: '2 Corinthians', canonicalOrder: 47, testament: 'New', totalChapters: 13, abbreviation: '2Cor' },
  Galatians: { name: 'Galatians', canonicalOrder: 48, testament: 'New', totalChapters: 6, abbreviation: 'Gal' },
  Ephesians: { name: 'Ephesians', canonicalOrder: 49, testament: 'New', totalChapters: 6, abbreviation: 'Eph' },
  Philippians: { name: 'Philippians', canonicalOrder: 50, testament: 'New', totalChapters: 4, abbreviation: 'Phil' },
  Colossians: { name: 'Colossians', canonicalOrder: 51, testament: 'New', totalChapters: 4, abbreviation: 'Col' },
  '1 Thessalonians': { name: '1 Thessalonians', canonicalOrder: 52, testament: 'New', totalChapters: 5, abbreviation: '1Thess' },
  '2 Thessalonians': { name: '2 Thessalonians', canonicalOrder: 53, testament: 'New', totalChapters: 3, abbreviation: '2Thess' },
  '1 Timothy': { name: '1 Timothy', canonicalOrder: 54, testament: 'New', totalChapters: 6, abbreviation: '1Tim' },
  '2 Timothy': { name: '2 Timothy', canonicalOrder: 55, testament: 'New', totalChapters: 4, abbreviation: '2Tim' },
  Titus: { name: 'Titus', canonicalOrder: 56, testament: 'New', totalChapters: 3, abbreviation: 'Titus' },
  Philemon: { name: 'Philemon', canonicalOrder: 57, testament: 'New', totalChapters: 1, abbreviation: 'Phlm' },
  Hebrews: { name: 'Hebrews', canonicalOrder: 58, testament: 'New', totalChapters: 13, abbreviation: 'Heb' },
  James: { name: 'James', canonicalOrder: 59, testament: 'New', totalChapters: 5, abbreviation: 'Jas' },
  '1 Peter': { name: '1 Peter', canonicalOrder: 60, testament: 'New', totalChapters: 5, abbreviation: '1Pet' },
  '2 Peter': { name: '2 Peter', canonicalOrder: 61, testament: 'New', totalChapters: 3, abbreviation: '2Pet' },
  '1 John': { name: '1 John', canonicalOrder: 62, testament: 'New', totalChapters: 5, abbreviation: '1John' },
  '2 John': { name: '2 John', canonicalOrder: 63, testament: 'New', totalChapters: 1, abbreviation: '2John' },
  '3 John': { name: '3 John', canonicalOrder: 64, testament: 'New', totalChapters: 1, abbreviation: '3John' },
  Jude: { name: 'Jude', canonicalOrder: 65, testament: 'New', totalChapters: 1, abbreviation: 'Jude' },
  Revelation: { name: 'Revelation', canonicalOrder: 66, testament: 'New', totalChapters: 22, abbreviation: 'Rev' },
};

/**
 * Returns canonical order index (1..66)
 */
export function getCanonicalOrder(book: BibleBook): number {
  return BIBLE_BOOKS_INFO[book]?.canonicalOrder ?? 999;
}

/**
 * Parses numeric starting verse number from verse range string (e.g. "16", "1-3", "16b-17")
 */
export function parseVerseStart(verseRange: string): number {
  const match = verseRange.trim().match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Canonical sorting comparator for Verse items:
 * 1. Book canonical order (Genesis -> Revelation)
 * 2. Chapter ascending
 * 3. Verse start number ascending
 */
export function compareVersesCanonically(a: Verse, b: Verse): number {
  const bookDiff = getCanonicalOrder(a.book) - getCanonicalOrder(b.book);
  if (bookDiff !== 0) return bookDiff;

  const chapterDiff = a.chapter - b.chapter;
  if (chapterDiff !== 0) return chapterDiff;

  return parseVerseStart(a.verse_range) - parseVerseStart(b.verse_range);
}

/**
 * Canonical sorting comparator for Book names
 */
export function compareBooksCanonically(a: BibleBook, b: BibleBook): number {
  return getCanonicalOrder(a) - getCanonicalOrder(b);
}

/**
 * Formats a clean reference string e.g. "John 3:16"
 */
export function formatReference(verse: Pick<Verse, 'book' | 'chapter' | 'verse_range'>): string {
  return `${verse.book} ${verse.chapter}:${verse.verse_range}`;
}

/**
 * Type guard for BibleBook
 */
export function isBibleBook(val: unknown): val is BibleBook {
  return typeof val === 'string' && (BIBLE_BOOKS as readonly string[]).includes(val);
}
