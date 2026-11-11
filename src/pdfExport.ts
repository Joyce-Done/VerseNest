/**
 * PDF & Printable Document Generation for VerseNest
 * Supports three distinct outputs in 8.5x11 Portrait or 11x8.5 Landscape:
 * 1. Flashcards (double-sided) — one verse per card. Front: reference only large & centered.
 *    Back: full verse text. Aligned front/back page pairs for duplex print & cut.
 * 2. Verse-a-thon Tracking Checklist — AWANA-style tracking sheet with Clubber Name, Club,
 *    Date, Listener, "Total # of Verses Recited", and numbered list of references ONLY with
 *    blank spaces for listener mark-off (no verse text).
 * 3. Reference + Full Text Study Sheet — clean list/table with Reference | Full Verse Text
 *    for parent or child study and quick reference.
 */

import { BibleBook, Child, ChildColor, Verse, VerseStatus } from './types';
import { formatReference } from './bible';

export type ExportFormat = 'flashcards' | 'checklist' | 'study_sheet';
export type PageOrientation = 'portrait' | 'landscape';

export interface ExportFilters {
  childId: string | 'all';
  book: BibleBook | 'all';
  statuses: VerseStatus[];
}

export interface ExportableVerseItem {
  verse: Verse;
  childName: string;
  childColor: ChildColor;
}

/**
 * Filter verses based on selected criteria (Child, Book, Status union)
 */
export function filterVersesForExport(
  verses: Verse[],
  children: Child[],
  filters: ExportFilters
): ExportableVerseItem[] {
  const childMap = new Map<string, Child>(children.map((c) => [c.id, c]));

  return verses
    .filter((verse) => {
      // 1. Child filter
      if (filters.childId !== 'all' && verse.child_id !== filters.childId) {
        return false;
      }

      // 2. Book filter
      if (filters.book !== 'all' && verse.book !== filters.book) {
        return false;
      }

      // 3. Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(verse.status)) {
        return false;
      }

      return true;
    })
    .map((verse) => {
      const child = childMap.get(verse.child_id);
      return {
        verse,
        childName: child ? child.name : 'Unknown Child',
        childColor: child ? child.avatarColor : 'purple',
      };
    });
}

export type DuplexAlignmentMode = 'mirrored' | 'direct';

export interface CardDimensions {
  widthInches: number;
  heightInches: number;
  widthPx: number; // Exact CSS pixels at 96 DPI
  heightPx: number; // Exact CSS pixels at 96 DPI
  widthPt: number; // Exact points at 72 DPI
  heightPt: number; // Exact points at 72 DPI
  widthStyle: string;
  heightStyle: string;
}

/**
 * Mathematically fixed card dimensions for US Letter paper (8.5" x 11").
 * 4 cards per page in a 2x2 grid.
 * Front cards, back cards, and empty placeholders are guaranteed 100% identical dimensions.
 */
export const FLASHCARD_DIMENSIONS: Record<PageOrientation, CardDimensions> = {
  portrait: {
    widthInches: 3.65,
    heightInches: 4.5,
    widthPx: 350.4,
    heightPx: 432.0,
    widthPt: 262.8,
    heightPt: 324.0,
    widthStyle: '3.65in',
    heightStyle: '4.50in',
  },
  landscape: {
    widthInches: 5.0,
    heightInches: 3.8,
    widthPx: 480.0,
    heightPx: 364.8,
    widthPt: 360.0,
    heightPt: 273.6,
    widthStyle: '5.00in',
    heightStyle: '3.80in',
  },
};

/**
 * Mathematically fixed card dimensions for 8 cards per page (2 columns x 4 rows in portrait).
 * Matches the reference image grid: clean, consistent, generous whitespace, no overlap.
 */
export const FLASHCARD_DIMENSIONS_8: Record<PageOrientation, CardDimensions> = {
  portrait: {
    widthInches: 3.65,
    heightInches: 2.30,
    widthPx: 350.4,
    heightPx: 220.8,
    widthPt: 262.8,
    heightPt: 165.6,
    widthStyle: '3.65in',
    heightStyle: '2.30in',
  },
  landscape: {
    widthInches: 2.35,
    heightInches: 3.30,
    widthPx: 225.6,
    heightPx: 316.8,
    widthPt: 169.2,
    heightPt: 237.6,
    widthStyle: '2.35in',
    heightStyle: '3.30in',
  },
};

export function getFlashcardDimensions(
  orientation: PageOrientation = 'portrait',
  cardsPerPage: number = 4
): CardDimensions {
  if (cardsPerPage === 8) {
    return FLASHCARD_DIMENSIONS_8[orientation];
  }
  return FLASHCARD_DIMENSIONS[orientation];
}

/**
 * Dynamically scales font size and line height for verse text on the back card
 * so that full verse text fits cleanly within the fixed card boundary
 * without ever growing or expanding the card height.
 */
export function getBackVerseTypography(
  text: string,
  notes?: string,
  orientation: PageOrientation = 'portrait',
  cardsPerPage: number = 4
): {
  fontSizeStyle: string;
  lineHeightStyle: string;
} {
  const totalChars = text.length + (notes ? notes.length + 8 : 0);

  if (cardsPerPage === 8) {
    if (orientation === 'landscape') {
      if (totalChars > 220) return { fontSizeStyle: '9px', lineHeightStyle: '12px' };
      if (totalChars > 140) return { fontSizeStyle: '10px', lineHeightStyle: '13.5px' };
      if (totalChars > 80) return { fontSizeStyle: '11px', lineHeightStyle: '15px' };
      return { fontSizeStyle: '12px', lineHeightStyle: '17px' };
    }
    // Portrait 2.3in card height
    if (totalChars > 240) return { fontSizeStyle: '9.5px', lineHeightStyle: '12.5px' };
    if (totalChars > 170) return { fontSizeStyle: '10.5px', lineHeightStyle: '14px' };
    if (totalChars > 110) return { fontSizeStyle: '11.5px', lineHeightStyle: '16px' };
    if (totalChars > 60) return { fontSizeStyle: '13px', lineHeightStyle: '18px' };
    return { fontSizeStyle: '14.5px', lineHeightStyle: '20px' };
  }

  // Original Simple 4-Card Format (US Letter 2x2 grid)
  // Guaranteed identical fixed card dimensions:
  // Portrait: 3.65in x 4.50in (350.4px x 432px)
  // Landscape: 5.00in x 3.80in (480px x 364.8px)
  if (orientation === 'landscape') {
    if (totalChars > 360) return { fontSizeStyle: '10px', lineHeightStyle: '14px' };
    if (totalChars > 260) return { fontSizeStyle: '11px', lineHeightStyle: '15px' };
    if (totalChars > 180) return { fontSizeStyle: '12.5px', lineHeightStyle: '17px' };
    if (totalChars > 100) return { fontSizeStyle: '14px', lineHeightStyle: '19px' };
    if (totalChars > 50) return { fontSizeStyle: '16px', lineHeightStyle: '22px' };
    return { fontSizeStyle: '18px', lineHeightStyle: '25px' };
  }

  // Portrait 4-card: 4.50in tall (432px)
  // Auto-shrink font size so verses of any length remain fully inside card boundary
  if (totalChars > 450) return { fontSizeStyle: '10.5px', lineHeightStyle: '14.5px' };
  if (totalChars > 340) return { fontSizeStyle: '12px', lineHeightStyle: '16.5px' };
  if (totalChars > 240) return { fontSizeStyle: '13.5px', lineHeightStyle: '19px' };
  if (totalChars > 150) return { fontSizeStyle: '15px', lineHeightStyle: '21px' };
  if (totalChars > 80) return { fontSizeStyle: '17px', lineHeightStyle: '24px' };
  if (totalChars > 40) return { fontSizeStyle: '19px', lineHeightStyle: '27px' };
  return { fontSizeStyle: '22px', lineHeightStyle: '30px' };
}

/**
 * Dynamically scales the reference heading on the front card so references
 * (e.g. "Genesis 1:1", "John 3:16", "Ephesians 4:32", "1 Thessalonians 5:16-18")
 * always fit fully inside the card boundary with zero clipping or overflow.
 */
export function getFrontReferenceTypography(
  reference: string,
  orientation: PageOrientation = 'portrait',
  cardsPerPage: number = 4
): {
  fontSizeStyle: string;
  lineHeightStyle: string;
} {
  const len = reference.trim().length;

  if (cardsPerPage === 8) {
    if (orientation === 'landscape') {
      if (len > 24) return { fontSizeStyle: '11px', lineHeightStyle: '14px' };
      if (len > 18) return { fontSizeStyle: '12px', lineHeightStyle: '15px' };
      if (len > 13) return { fontSizeStyle: '13.5px', lineHeightStyle: '17px' };
      if (len > 8) return { fontSizeStyle: '15px', lineHeightStyle: '19px' };
      return { fontSizeStyle: '16.5px', lineHeightStyle: '21px' };
    }
    if (len > 25) return { fontSizeStyle: '12.5px', lineHeightStyle: '16px' };
    if (len > 20) return { fontSizeStyle: '14px', lineHeightStyle: '18px' };
    if (len > 15) return { fontSizeStyle: '15.5px', lineHeightStyle: '20px' };
    if (len > 11) return { fontSizeStyle: '17.5px', lineHeightStyle: '22px' };
    if (len > 8) return { fontSizeStyle: '19px', lineHeightStyle: '24px' };
    return { fontSizeStyle: '21px', lineHeightStyle: '26px' };
  }

  // Original Simple 4-Card Format
  // Plain white card, bold centered reference text, auto-shrink for clean fit
  if (orientation === 'landscape') {
    if (len > 28) return { fontSizeStyle: '17px', lineHeightStyle: '22px' };
    if (len > 20) return { fontSizeStyle: '20px', lineHeightStyle: '26px' };
    if (len > 14) return { fontSizeStyle: '23px', lineHeightStyle: '29px' };
    if (len > 9) return { fontSizeStyle: '26px', lineHeightStyle: '32px' };
    return { fontSizeStyle: '30px', lineHeightStyle: '36px' };
  }

  // Portrait 4-card (3.65in x 4.50in)
  if (len > 26) return { fontSizeStyle: '17px', lineHeightStyle: '22px' };
  if (len > 19) return { fontSizeStyle: '19px', lineHeightStyle: '25px' };
  if (len >= 13) return { fontSizeStyle: '22px', lineHeightStyle: '28px' };
  if (len > 9) return { fontSizeStyle: '25px', lineHeightStyle: '32px' };
  return { fontSizeStyle: '28px', lineHeightStyle: '36px' };
}

/**
 * Flashcard layout page pair:
 * Page 1: Fronts (Reference only for blind recitation)
 * Page 2: Backs (Full scripture text, horizontally mirrored for duplex cutouts)
 */
export interface FlashcardPagePair {
  pairIndex: number;
  frontItems: (ExportableVerseItem | null)[];
  backItems: (ExportableVerseItem | null)[];
  duplexMode: DuplexAlignmentMode;
}

/**
 * Groups exportable verses into aligned front/back page pairs for printing.
 * Cards per sheet:
 * - 8 cards per page: 2 columns x 4 rows (exact 3.65" x 2.30" per card)
 * - 4 cards per page: 2 columns x 2 rows (exact 3.65" x 4.50" per card)
 *
 * For duplex printing with mirrored columns:
 * Row 0: Front [0, 1] <-> Back [1, 0]
 * Row 1: Front [2, 3] <-> Back [3, 2]
 * Row 2: Front [4, 5] <-> Back [5, 4] (if 8 cards)
 * Row 3: Front [6, 7] <-> Back [7, 6] (if 8 cards)
 *
 * This ensures that when flipped on the long edge, the back of card 0 is on the back of card 0,
 * and empty placeholders line up identically.
 */
export function buildFlashcardPagePairs(
  items: ExportableVerseItem[],
  cardsPerPage: number = 4,
  duplexMode: DuplexAlignmentMode = 'mirrored'
): FlashcardPagePair[] {
  const pairs: FlashcardPagePair[] = [];
  const totalItems = items.length;

  for (let i = 0; i < totalItems; i += cardsPerPage) {
    const chunk = items.slice(i, i + cardsPerPage);
    // Pad chunk to cardsPerPage for consistent layout alignment
    const frontItems: (ExportableVerseItem | null)[] = [];
    for (let c = 0; c < cardsPerPage; c++) {
      frontItems.push(chunk[c] ?? null);
    }

    let backItems: (ExportableVerseItem | null)[];
    if (duplexMode === 'direct') {
      backItems = [...frontItems];
    } else {
      // 2-column duplex horizontal mirror row by row
      backItems = [];
      for (let r = 0; r < cardsPerPage; r += 2) {
        backItems.push(frontItems[r + 1] ?? null);
        backItems.push(frontItems[r] ?? null);
      }
    }

    pairs.push({
      pairIndex: Math.floor(i / cardsPerPage) + 1,
      frontItems,
      backItems,
      duplexMode,
    });
  }

  return pairs;
}
