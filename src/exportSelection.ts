import type { VerseNestDatabase } from './types';
import { everMemorized, firstMemorizedDate } from './familyData';

// Keep the complete collection available when the export's child selector changes.
export function exportSelection(db: VerseNestDatabase, view: 'verses'|'event'|'lifetime', eventId?: string, year='all') {
  if (view==='event') {
    const event=db.events?.find(item=>item.id===eventId);
    return db.verses.filter(verse=>event?.verse_ids.includes(verse.id));
  }
  if (view==='lifetime') return db.verses.filter(verse=>everMemorized(verse)&&(year==='all'||(firstMemorizedDate(verse)?.slice(0,4)??'undated')===year));
  return db.verses;
}
