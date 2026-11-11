import assert from 'node:assert/strict';
import {VerseNestStorage,InMemoryStorageAdapter,STORAGE_KEY} from '../src/storage';
import {countUniqueVerses,emptyFamily,everMemorized,firstMemorizedDate,validateFamily} from '../src/familyData';
import {FamilyCloudStorage} from '../src/cloudStorage';
const adapter=new InMemoryStorageAdapter(),store=new VerseNestStorage(adapter,{startEmpty:true});
assert.equal((await store.loadDatabase()).children.length,0,'Fresh families must not be filled with demo children');
const child=await store.createChild('Genesis','purple'),sibling=await store.createChild('Elijah','blue');
const verse=await store.createVerse({child_id:child.id,book:'John',chapter:3,verse_range:'16-18',text:'Saved scripture',translation:'KJV',status:'Mastered',memorized_on:'2020-05-04'});
await store.updateVerseStatus(verse.id,'Learning');
let db=await store.loadDatabase();let saved=db.verses[0];
assert.equal(firstMemorizedDate(saved),'2020-05-04');assert.ok(everMemorized(saved));assert.equal(saved.date_mastered,null);assert.equal(countUniqueVerses([saved]),3);
const overlap=await store.createVerse({child_id:child.id,book:'John',chapter:3,verse_range:'17',text:'An overlapping saved verse',translation:'KJV',status:'Mastered'});
assert.equal(countUniqueVerses([saved,overlap]),3,'Overlapping passages count once');
const event=await store.createEvent('Verse-a-thon 2026','2026-12-01');await store.setEventVerses(event.id,child.id,[verse.id]);
await store.recordRecitation(event.id,verse.id,'2026-10-18',true,1);
await store.recordRecitation(event.id,verse.id,'2026-10-18',false,0);
const next=await store.createEvent('Verse-a-thon 2027','2027-12-01');
db=await store.loadDatabase();assert.equal(db.events?.[0].verse_ids[0],verse.id);assert.equal(db.events?.[1].verse_ids.length,0);assert.equal(db.recitations?.length,2);assert.equal(db.recitations?.at(-1)?.successful,false);assert.equal(firstMemorizedDate(db.verses[0]),'2020-05-04');
const copies=await store.copyVersesToChild([verse.id],sibling.id);assert.equal(copies[0].status,'New');assert.ok(!everMemorized(copies[0]),'Sibling copies must not inherit memory accomplishments');
await store.updateChild(child.id,{name:'Genesis R.'});assert.equal((await store.loadDatabase()).children[0].name,'Genesis R.');
const backup=JSON.stringify(await store.loadDatabase());assert.deepEqual(validateFamily(JSON.parse(backup)).events?.map(e=>e.title),['Verse-a-thon 2026','Verse-a-thon 2027']);
assert.throws(()=>validateFamily({version:99}),/valid VerseNest/);
await assert.rejects(store.createVerse({child_id:child.id,book:'John',chapter:99,verse_range:'1',text:'Invalid',translation:'KJV'}),/valid Bible/);
// Legacy mastered dates survive moving back to practice even without an audit trail.
const legacy=await store.loadDatabase();legacy.verses[0].memorized_on=null;legacy.verses[0].status='Mastered';legacy.verses[0].status_history=[];legacy.verses[0].date_mastered='2018-02-03T12:00:00Z';await store.saveDatabase(legacy);await store.updateVerseStatus(verse.id,'New');assert.equal(firstMemorizedDate((await store.loadDatabase()).verses[0]),'2018-02-03');
console.log('PASS family setup, historical memory dates, permanent lifetime history during review, unique verse counts, event seasons, dated recitations, sibling independence, rename, backup validation, and legacy dates');

class Local {data=new Map<string,string>();getItem(key:string){return this.data.get(key)??null;}setItem(key:string,value:string){this.data.set(key,value);}removeItem(key:string){this.data.delete(key);}}
let revision=0,remote:any=null,online=true;const snapshots:any[]=[];
const send:typeof fetch=async(_url,init)=>{
 if(!online)throw new Error('offline');
 if(init?.method==='PUT'){const input=JSON.parse(init.body as string);if(input.revision!==revision)return Response.json({}, {status:409});snapshots.push(remote);remote=input.data;revision++;return Response.json({revision,updatedAt:new Date().toISOString()});}
 return Response.json({data:remote,revision,updatedAt:new Date().toISOString()});
};
const firstLocal=new Local(),firstCloud=new FamilyCloudStorage(firstLocal as any,send);await firstCloud.getItem(STORAGE_KEY);await firstCloud.setItem(STORAGE_KEY,backup);assert.equal(firstCloud.state.status,'synced');
const otherLocal=new Local(),otherCloud=new FamilyCloudStorage(otherLocal as any,send);assert.equal(JSON.parse((await otherCloud.getItem(STORAGE_KEY))!).children[0].name,'Genesis R.','Another device must load account records');
online=false;const changed=JSON.parse(backup);changed.children[0].name='Offline edit';await firstCloud.setItem(STORAGE_KEY,JSON.stringify(changed));assert.equal(firstCloud.state.status,'pending');assert.equal(JSON.parse(firstLocal.getItem(STORAGE_KEY)!).children[0].name,'Offline edit');
online=true;await firstCloud.sync();assert.equal(firstCloud.state.status,'synced');assert.equal(remote.children[0].name,'Offline edit');
// A stale second device cannot overwrite the newer family copy.
const stale=JSON.parse(backup);stale.children[0].name='Other device edit';await otherCloud.setItem(STORAGE_KEY,JSON.stringify(stale));assert.equal(otherCloud.state.status,'conflict');assert.equal(remote.children[0].name,'Offline edit');assert.equal(JSON.parse(otherLocal.getItem(STORAGE_KEY)!).children[0].name,'Other device edit');
await otherCloud.resolve('account');assert.equal(JSON.parse(otherLocal.getItem(STORAGE_KEY)!).children[0].name,'Offline edit');assert.ok(otherLocal.getItem('versenest_local_safety_copy_v1'));
const legacyLocal=new Local();legacyLocal.setItem(STORAGE_KEY,JSON.stringify(stale));const migrated=new FamilyCloudStorage(legacyLocal as any,send);await migrated.getItem(STORAGE_KEY);assert.equal(migrated.state.status,'conflict','Legacy data and account data must never silently overwrite each other');
assert.ok(snapshots.length>=2);
console.log('PASS private account persistence adapter: migration, second device loading, offline writes, reconnect sync, stale-write conflict protection, and preserved safety copies');
