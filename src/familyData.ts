import { BIBLE_BOOKS, VERSE_STATUSES, type Verse, type VerseNestDatabase } from './types';
export function localDate(date=new Date()):string {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function validDate(value:unknown):value is string {
  return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
}
export function firstMemorizedDate(verse:Verse):string|null {
  if(validDate(verse.memorized_on))return verse.memorized_on;
  const dates=[verse.date_mastered,...(verse.status_history??[]).filter(item=>item.status==='Mastered'||item.status==='Learned').map(item=>item.date)]
    .filter((date):date is string=>typeof date==='string' && validDate(date.slice(0,10))).map(date=>date.slice(0,10)).sort();
  return dates[0]??null;
}
export function everMemorized(verse:Verse):boolean {
  return Boolean(firstMemorizedDate(verse)) || verse.status==='Mastered'||verse.status==='Learned' || (verse.status_history??[]).some(item=>item.status==='Learned'||item.status==='Mastered');
}
export function verseNumbers(range:string):number[] {
  if(!/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(range.replace(/\s/g,'')))return [];
  const values=new Set<number>();
  for(const part of range.replace(/\s/g,'').split(',')){
    const [from,toValue]=part.split('-').map(Number),to=toValue??from;
    if(from<1 || to<from || to>1000)return [];
    for(let value=from;value<=to;value++)values.add(value);
  }
  return [...values];
}
// Count unique Bible verses, so overlapping saved passages never inflate a total.
export function countUniqueVerses(verses:Verse[]):number {
  const keys=new Set<string>();
  for(const verse of verses){const numbers=verseNumbers(verse.verse_range);if(!numbers.length)keys.add(`${verse.child_id}|${verse.book}|${verse.chapter}|${verse.verse_range}`);else for(const number of numbers)keys.add(`${verse.child_id}|${verse.book}|${verse.chapter}|${number}`);}
  return keys.size;
}
export function emptyFamily():VerseNestDatabase {return {version:1,children:[],verses:[],events:[],recitations:[],activeChildId:null,lastUpdated:new Date().toISOString()};}
export function validateFamily(input:unknown):VerseNestDatabase {
  const data=input as VerseNestDatabase;
  const fail=()=>{throw new Error('This is not a valid VerseNest family backup. Your saved records have not been replaced.');};
  if(!data || data.version!==1 || !Array.isArray(data.children)||!Array.isArray(data.verses)||data.children.length>5||data.verses.length>10000)fail();
  const children=new Set<string>();
  for(const child of data.children){if(!child||typeof child.id!=='string'||children.has(child.id)||typeof child.name!=='string'||!child.name.trim()||child.name.length>80||!['purple','blue','yellow','orange','green'].includes(child.avatarColor))fail();children.add(child.id);}
  const verses=new Set<string>();
  for(const verse of data.verses){if(!verse||typeof verse.id!=='string'||verses.has(verse.id)||!children.has(verse.child_id)||!BIBLE_BOOKS.includes(verse.book)||!Number.isInteger(verse.chapter)||verse.chapter<1||typeof verse.verse_range!=='string'||!verse.verse_range.trim()||typeof verse.text!=='string'||verse.text.length>20000||!VERSE_STATUSES.includes(verse.status)||!Array.isArray(verse.status_history)||typeof verse.translation!=='string'||(verse.memorized_on!=null&&!validDate(verse.memorized_on)))fail();verses.add(verse.id);}
  if(data.events!=null&&!Array.isArray(data.events))fail();
  for(const event of data.events??[]){if(typeof event.id!=='string'||typeof event.title!=='string'||!event.title.trim()||event.title.length>100||!Array.isArray(event.verse_ids)||event.verse_ids.some(id=>typeof id!=='string')||(event.event_date!=null&&!validDate(event.event_date)))fail();}
  if(data.recitations!=null&&!Array.isArray(data.recitations))fail();
  for(const recitation of data.recitations??[]){if(typeof recitation.id!=='string'||typeof recitation.event_id!=='string'||typeof recitation.verse_id!=='string'||!children.has(recitation.child_id)||!validDate(recitation.recited_on)||typeof recitation.successful!=='boolean'||!Number.isInteger(recitation.prompts)||recitation.prompts<0||recitation.prompts>2)fail();}
  return {...data,events:data.events??[],recitations:data.recitations??[]};
}
