import { BIBLE_BOOKS_INFO } from './bible';
import { emptyFamily, firstMemorizedDate, localDate, validDate, validateFamily, verseNumbers } from './familyData';
import { INITIAL_CHILDREN, INITIAL_VERSES } from './mockData';
import {
  BibleBook,
  Child,
  ChildColor,
  MAX_CHILDREN,
  Verse,
  VerseNestDatabase,
  VerseStatus,
} from './types';

export const STORAGE_KEY = 'versenest_database_v1';

/**
 * Storage adapter interface matching React Native AsyncStorage
 * This enables 1:1 code compatibility between Web and React Native Expo!
 */
export interface IStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Web LocalStorage implementation of IStorageAdapter
 */
export class WebLocalStorageAdapter implements IStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) throw new Error('Device storage is unavailable.');
      return window.localStorage.getItem(key);
    } catch (e) {
      throw new Error('VerseNest could not read this device’s saved data. Check browser storage permissions.');
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) throw new Error('Device storage is unavailable.');
      window.localStorage.setItem(key, value);
    } catch (e) {
      throw new Error('VerseNest could not save your changes. Device storage may be full or blocked.');
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.localStorage) throw new Error('Device storage is unavailable.');
      window.localStorage.removeItem(key);
    } catch (e) {
      throw new Error('VerseNest could not remove saved data. Check browser storage permissions.');
    }
  }
}

/**
 * In-memory fallback adapter for testing/mocking
 */
export class InMemoryStorageAdapter implements IStorageAdapter {
  private store: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// Default singleton adapter (Web for AI Studio preview; swap with AsyncStorage in Expo)
export const defaultStorageAdapter: IStorageAdapter = new WebLocalStorageAdapter();

/**
 * Custom error thrown when a verse reference is duplicated within a single child's profile
 */
export class DuplicateVerseError extends Error {
  public readonly existingVerse: Verse;

  constructor(message: string, existingVerse: Verse) {
    super(message);
    this.name = 'DuplicateVerseError';
    this.existingVerse = existingVerse;
    Object.setPrototypeOf(this, DuplicateVerseError.prototype);
  }
}

/**
 * Normalizes a verse range string for accurate comparison.
 * e.g., " 16 ", "16", "1- 3" -> "16", "1-3"
 */
export function normalizeVerseRange(range: string): string {
  if (!range) return '';
  return range.trim().replace(/\s+/g, '').toLowerCase();
}

/**
 * VerseNest Storage Controller
 * Handles CRUD operations, schema validation, canonical constraints, and business rules.
 */
export class VerseNestStorage {
  private adapter: IStorageAdapter;

  constructor(adapter: IStorageAdapter = defaultStorageAdapter, private options: { startEmpty?: boolean } = {}) {
    this.adapter = adapter;
  }

  /**
   * Checks if a verse reference already exists for the given child.
   * Compares book, chapter, and normalized verse_range (regardless of translation).
   */
  findDuplicateVerse(
    db: VerseNestDatabase,
    childId: string,
    book: BibleBook,
    chapter: number,
    verseRange: string,
    excludeVerseId?: string
  ): Verse | undefined {
    const targetRange = normalizeVerseRange(verseRange);
    return db.verses.find(
      (v) =>
        v.child_id === childId &&
        (!excludeVerseId || v.id !== excludeVerseId) &&
        v.book === book &&
        Number(v.chapter) === Number(chapter) &&
        normalizeVerseRange(v.verse_range) === targetRange
    );
  }

  /**
   * Load the entire VerseNest database.
   * If not found, starts empty. Sample data requires an explicit test/demo opt-in.
   * Automatically sanitizes and deduplicates any legacy duplicate references per child.
   */
  async loadDatabase(): Promise<VerseNestDatabase> {
    const raw = await this.adapter.getItem(STORAGE_KEY);
    if (!raw) {
      const initialDb: VerseNestDatabase = this.options.startEmpty !== false ? emptyFamily() : {
        version: 1, children: structuredClone(INITIAL_CHILDREN), verses: structuredClone(INITIAL_VERSES), activeChildId: INITIAL_CHILDREN[0]?.id ?? null, lastUpdated: new Date().toISOString(), events: [], recitations: [],
      };
      await this.saveDatabase(initialDb);
      return initialDb;
    }

    try {
      const parsed: VerseNestDatabase = validateFamily(JSON.parse(raw));
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.children) || !Array.isArray(parsed.verses)) {
        throw new Error('Invalid saved database');
      }

      // Duplicate prevention cleanup:
      // Ensure no child has duplicate verse references (e.g. legacy sample data or accidental duplicate saves).
      // If duplicates are found, keep the first occurrence and purge the rest.
      const seenRefs = new Set<string>();
      const sanitizedVerses: Verse[] = [];
      let hadDuplicates = false;

      for (const v of parsed.verses || []) {
        const key = `${v.child_id}::${v.book}::${v.chapter}::${normalizeVerseRange(v.verse_range)}`;
        if (!seenRefs.has(key)) {
          seenRefs.add(key);
          sanitizedVerses.push(v);
        } else {
          hadDuplicates = true;
        }
      }

      if (hadDuplicates) {
        parsed.verses = sanitizedVerses;
        await this.saveDatabase(parsed);
      }

      return parsed;
    } catch (err) {
      throw new Error('Your saved VerseNest data could not be opened. It has been preserved; do not reset it unless you have a backup.');
    }
  }

  /**
   * Persist the database to storage.
   */
  async saveDatabase(db: VerseNestDatabase): Promise<void> {
    const updated = {
      ...db,
      lastUpdated: new Date().toISOString(),
    };
    await this.adapter.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  /**
   * Enforces 5 Child limit (Section 5.3 & Decision 2)
   */
  async createChild(name: string, avatarColor: ChildColor): Promise<Child> {
    const db = await this.loadDatabase();

    if (db.children.length >= MAX_CHILDREN) {
      throw new Error(`Maximum limit of ${MAX_CHILDREN} child profiles reached. Cannot add another child.`);
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Child name cannot be empty.');
    }

    const newChild: Child = {
      id: `child_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      avatarColor,
      createdAt: new Date().toISOString(),
    };

    db.children.push(newChild);
    if (!db.activeChildId) {
      db.activeChildId = newChild.id;
    }

    await this.saveDatabase(db);
    return newChild;
  }

  /**
   * Rename or update child profile
   */
  async updateChild(childId: string, updates: Partial<Pick<Child, 'name' | 'avatarColor'>>): Promise<Child> {
    const db = await this.loadDatabase();
    const child = db.children.find((c) => c.id === childId);
    if (!child) {
      throw new Error(`Child with id "${childId}" not found.`);
    }

    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) throw new Error('Child name cannot be empty.');
      child.name = trimmed;
    }
    if (updates.avatarColor !== undefined) {
      child.avatarColor = updates.avatarColor;
    }

    await this.saveDatabase(db);
    return child;
  }

  /**
   * Remove a child profile and cascades deletion of all verses belonging to that child
   */
  async deleteChild(childId: string): Promise<void> {
    const db = await this.loadDatabase();
    db.children = db.children.filter((c) => c.id !== childId);
    // Cascade delete verses belonging to this child
    db.verses = db.verses.filter((v) => v.child_id !== childId);
    db.recitations = (db.recitations ?? []).filter(item => item.child_id !== childId);
    for (const event of db.events ?? []) event.verse_ids = event.verse_ids.filter(id => db.verses.some(verse => verse.id === id));

    if (db.activeChildId === childId) {
      db.activeChildId = db.children[0]?.id ?? null;
    }

    await this.saveDatabase(db);
  }

  /**
   * Create a new Verse record.
   * Stored directly inside the child's profile.
   * Enforces Duplicate Prevention Rule: book + chapter + verse_range must be unique per child.
   */
  async createVerse(params: {
    child_id: string;
    book: BibleBook;
    chapter: number;
    verse_range: string;
    text: string;
    translation: string;
    status?: VerseStatus;
    notes?: string;
    copied_from_verse_id?: string | null;
    memorized_on?: string | null;
  }): Promise<Verse> {
    const db = await this.loadDatabase();
    const childExists = db.children.some((c) => c.id === params.child_id);
    if (!childExists) {
      throw new Error(`Child profile with id "${params.child_id}" does not exist.`);
    }

    if (!BIBLE_BOOKS_INFO[params.book] || params.chapter < 1 || params.chapter > BIBLE_BOOKS_INFO[params.book].totalChapters || !verseNumbers(params.verse_range).length || !params.text.trim()) throw new Error('Enter a valid Bible reference and scripture text.');
    if (params.memorized_on && (!validDate(params.memorized_on) || params.memorized_on > localDate())) throw new Error('Choose a valid memorized date that is not in the future.');

    // Enforce uniqueness per child regardless of translation
    const existing = this.findDuplicateVerse(
      db,
      params.child_id,
      params.book,
      params.chapter,
      params.verse_range
    );

    if (existing) {
      throw new DuplicateVerseError(
        `Verse "${params.book} ${params.chapter}:${params.verse_range.trim()}" already exists in this child's profile (saved as ${existing.translation}). To make changes, edit the existing verse instead of creating a duplicate.`,
        existing
      );
    }

    const now = new Date().toISOString();
    const status: VerseStatus = params.status ?? 'New';
    const isMastered = status === 'Mastered';

    const newVerse: Verse = {
      id: `verse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      child_id: params.child_id,
      book: params.book,
      chapter: params.chapter,
      verse_range: params.verse_range.trim(),
      text: params.text.trim(),
      translation: (params.translation || 'KJV').trim(),
      date_added: now,
      status,
      date_mastered: isMastered ? now : null,
      memorized_on: params.memorized_on || (isMastered ? localDate() : null),
      status_history: [{ status, date: now }],
      copied_from_verse_id: params.copied_from_verse_id ?? null,
      notes: params.notes?.trim() || '',
    };

    db.verses.push(newVerse);
    await this.saveDatabase(db);
    return newVerse;
  }

  /**
   * Update Verse Status with automatic timestamping and date_mastered handling:
   * - Appends new status transition to status_history [{ status, date }]
   * - Auto-fills date_mastered when status becomes "Mastered"
   * - Resets date_mastered to null if status moves backward away from "Mastered"
   */
  async updateVerseStatus(verseId: string, newStatus: VerseStatus): Promise<Verse> {
    const db = await this.loadDatabase();
    const verse = db.verses.find((v) => v.id === verseId);
    if (!verse) {
      throw new Error(`Verse with id "${verseId}" not found.`);
    }

    if (verse.status === newStatus) {
      return verse; // No change
    }

    const now = new Date().toISOString();
    const firstDate = firstMemorizedDate(verse);

    // Auto-fill or reset date_mastered
    if (newStatus === 'Mastered') {
      verse.date_mastered = now;
    } else {
      verse.date_mastered = null;
    }

    // Append to status history audit trail
    verse.memorized_on = firstDate || (newStatus === 'Mastered' || newStatus === 'Learned' ? localDate() : null);
    verse.status = newStatus;
    verse.status_history.push({
      status: newStatus,
      date: now,
    });

    await this.saveDatabase(db);
    return verse;
  }

  /**
   * Generic verse update (translation, text, notes, status, reference)
   * Enforces Duplicate Prevention Rule if the reference (book, chapter, verse_range) is changed.
   */
  async updateVerse(verseId: string, updates: Partial<Omit<Verse, 'id' | 'child_id'>>): Promise<Verse> {
    const db = await this.loadDatabase();
    const verse = db.verses.find((v) => v.id === verseId);
    if (!verse) {
      throw new Error(`Verse with id "${verseId}" not found.`);
    }

    if (!BIBLE_BOOKS_INFO[updates.book ?? verse.book] || (updates.chapter ?? verse.chapter) < 1 || (updates.chapter ?? verse.chapter) > BIBLE_BOOKS_INFO[updates.book ?? verse.book].totalChapters || !verseNumbers(updates.verse_range ?? verse.verse_range).length) throw new Error('Enter a valid Bible reference.');

    // Check duplicate reference if reference fields are modified
    if (
      updates.book !== undefined ||
      updates.chapter !== undefined ||
      updates.verse_range !== undefined
    ) {
      const targetBook = updates.book ?? verse.book;
      const targetChapter = Number(updates.chapter ?? verse.chapter);
      const targetRange = updates.verse_range ?? verse.verse_range;

      const conflict = this.findDuplicateVerse(
        db,
        verse.child_id,
        targetBook,
        targetChapter,
        targetRange,
        verse.id
      );

      if (conflict) {
        throw new DuplicateVerseError(
          `Verse "${targetBook} ${targetChapter}:${targetRange.trim()}" already exists in this child's profile (${conflict.translation}).`,
          conflict
        );
      }
    }

    if (updates.status !== undefined && updates.status !== verse.status) {
      // Save status and edited text together. A second database load here would
      // be overwritten by this method's final save and lose the status change.
      const now = new Date().toISOString();
      verse.memorized_on = firstMemorizedDate(verse) || (updates.status === 'Mastered' || updates.status === 'Learned' ? localDate() : null);
      verse.status = updates.status;
      verse.date_mastered = updates.status === 'Mastered' ? now : null;
      verse.status_history.push({ status: updates.status, date: now });
    }

    if (updates.memorized_on !== undefined) {
      if (updates.memorized_on !== null && (!validDate(updates.memorized_on) || updates.memorized_on > localDate())) throw new Error('Choose a valid memorized date that is not in the future.');
      verse.memorized_on = updates.memorized_on;
    }

    // Apply remaining field updates
    if (updates.book !== undefined) verse.book = updates.book;
    if (updates.chapter !== undefined) verse.chapter = Number(updates.chapter);
    if (updates.verse_range !== undefined) verse.verse_range = updates.verse_range.trim();
    if (updates.text !== undefined) verse.text = updates.text.trim();
    if (updates.translation !== undefined) verse.translation = updates.translation.trim();
    if (updates.notes !== undefined) verse.notes = updates.notes.trim();

    await this.saveDatabase(db);
    return verse;
  }

  /**
   * Delete a verse
   */
  async deleteVerse(verseId: string): Promise<void> {
    const db = await this.loadDatabase();
    db.verses = db.verses.filter((v) => v.id !== verseId);
    for (const event of db.events ?? []) event.verse_ids = event.verse_ids.filter(id => id !== verseId);
    await this.saveDatabase(db);
  }

  /**
   * Section 5.3b: Copy verses between children
   * Creates an independent copy in the target child's profile with status reset to 'New'
   * and copied_from_verse_id set to the source verse id.
   * Duplicate references in the target child's profile are automatically skipped.
   */
  async copyVersesToChild(sourceVerseIds: string[], targetChildId: string): Promise<Verse[]> {
    const db = await this.loadDatabase();
    const targetChild = db.children.find((c) => c.id === targetChildId);
    if (!targetChild) {
      throw new Error(`Target child with id "${targetChildId}" not found.`);
    }

    const now = new Date().toISOString();
    const createdVerses: Verse[] = [];

    for (const sourceId of sourceVerseIds) {
      const sourceVerse = db.verses.find((v) => v.id === sourceId);
      if (!sourceVerse) continue;

      // Duplicate prevention rule: skip if target child already has this reference
      const existingInTarget = this.findDuplicateVerse(
        db,
        targetChildId,
        sourceVerse.book,
        sourceVerse.chapter,
        sourceVerse.verse_range
      );
      if (existingInTarget) {
        continue;
      }

      const clonedVerse: Verse = {
        id: `verse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        child_id: targetChildId,
        book: sourceVerse.book,
        chapter: sourceVerse.chapter,
        verse_range: sourceVerse.verse_range,
        text: sourceVerse.text,
        translation: sourceVerse.translation,
        date_added: now,
        status: 'New', // Start fresh in new child's pipeline
        date_mastered: null,
        status_history: [{ status: 'New', date: now }],
        copied_from_verse_id: sourceVerse.id,
        notes: sourceVerse.notes ? `${sourceVerse.notes} (Copied)` : 'Copied from sibling',
      };

      db.verses.push(clonedVerse);
      createdVerses.push(clonedVerse);
    }

    await this.saveDatabase(db);
    return createdVerses;
  }

  async createEvent(title: string, eventDate: string | null) {
    if (!title.trim() || title.trim().length > 100 || (eventDate !== null && !validDate(eventDate))) throw new Error('Enter an event name and a valid optional date.');
    const db = await this.loadDatabase();
    const event = { id: crypto.randomUUID(), title: title.trim(), event_date: eventDate, verse_ids: [] as string[], created_at: new Date().toISOString() };
    db.events = [...(db.events ?? []), event]; await this.saveDatabase(db); return event;
  }
  async setEventVerses(eventId: string, childId: string, ids: string[]) {
    const db = await this.loadDatabase(), event = db.events?.find(item => item.id === eventId);
    if (!event) throw new Error('Choose a Verse-a-thon first.');
    const validIds = ids.filter(id => db.verses.some(verse => verse.id === id && verse.child_id === childId));
    event.verse_ids = [...event.verse_ids.filter(id => !db.verses.some(verse => verse.id === id && verse.child_id === childId)), ...new Set(validIds)];
    await this.saveDatabase(db);
  }
  async recordRecitation(eventId: string, verseId: string, recitedOn: string, successful: boolean, prompts: number) {
    const db = await this.loadDatabase(), verse = db.verses.find(item => item.id === verseId);
    if (!verse || !db.events?.some(event => event.id === eventId && event.verse_ids.includes(verseId))) throw new Error('Add this verse to the selected event first.');
    if (!validDate(recitedOn) || !Number.isInteger(prompts) || prompts < 0 || prompts > 2) throw new Error('Choose a valid recitation date and zero to two prompts.');
    db.recitations = [...(db.recitations ?? []), { id: crypto.randomUUID(), event_id: eventId, verse_id: verseId, child_id: verse.child_id, recited_on: recitedOn, successful, prompts, recorded_at: new Date().toISOString() }];
    await this.saveDatabase(db);
  }

  /**
   * Reset database back to initial sample data
   */
  async resetToSampleData(): Promise<VerseNestDatabase> {
    const initialDb: VerseNestDatabase = {
      version: 1,
      children: INITIAL_CHILDREN,
      verses: INITIAL_VERSES,
      activeChildId: INITIAL_CHILDREN[0]?.id ?? null,
      lastUpdated: new Date().toISOString(),
    };
    await this.saveDatabase(initialDb);
    return initialDb;
  }
}
