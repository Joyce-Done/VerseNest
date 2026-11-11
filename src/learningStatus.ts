import { STATUS_CONFIG, type Verse, type VerseStatus } from './types';

// Keep saved statuses and history intact; present one consistent three-step journey.
export const LEARNING_GROUPS = [
  { label: 'New', value: 'New', statuses: ['New'], color: '#DFAE29', background: '#FFF8E3', detail: 'Ready to begin' },
  { label: 'Practicing', value: 'Learning', statuses: ['Learning', 'Memorizing'], color: '#3485B5', background: '#EDF7FD', detail: 'Learning the verse together' },
  { label: 'Memorized', value: 'Mastered', statuses: ['Learned', 'Mastered'], color: '#8E5AC8', background: '#F5EEFC', detail: 'Ready to review and remember' },
] as const;

export function learningGroup(status: VerseStatus) {
  return LEARNING_GROUPS.find(group => (group.statuses as readonly string[]).includes(status)) ?? LEARNING_GROUPS[0];
}

export function statusPresentation(status: VerseStatus) {
  const group = learningGroup(status);
  return { ...STATUS_CONFIG[group.value], label: group.label };
}

export function summarizeProgress(verses: Verse[]) {
  const groups = LEARNING_GROUPS.map(group => ({ ...group, count: verses.filter(verse => learningGroup(verse.status).value === group.value).length }));
  return { groups, total: verses.length, percentage: verses.length ? Math.round(groups[2].count / verses.length * 100) : 0 };
}
