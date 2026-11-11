import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PdfExportModal, pdfServices } from '../src/components/PdfExportModal';
import { VerseProgress } from '../src/components/VerseProgress';
import { INITIAL_CHILDREN, INITIAL_VERSES } from '../src/mockData';
import { LEARNING_GROUPS, learningGroup, summarizeProgress } from '../src/learningStatus';
import { VerseNestStorage, InMemoryStorageAdapter, STORAGE_KEY } from '../src/storage';
import { canSharePdf, printPdfPages } from '../src/pdfPrint';
import type { PdfDocumentOptions } from '../src/pdfDocument';
import { exportSelection } from '../src/exportSelection';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const keys = new Map<string, Function>();
Object.assign(globalThis, { document: { activeElement: {focus(){}}, body: {style:{overflow:''}}, addEventListener:(name:string,fn:Function)=>keys.set(name,fn), removeEventListener:(name:string)=>keys.delete(name) } });
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { canShare(){throw new Error('Unsupported files');} } });
let closed = 0;
const props = { isOpen:true, onClose:()=>closed++, childrenList:INITIAL_CHILDREN, verses:INITIAL_VERSES };
const pageImage = { src:'data:image/png;base64,iVBORw0KGgo=', width:612, height:792 };
let created: PdfDocumentOptions[] = [];
const originals = {...pdfServices};
pdfServices.create = async options => {created.push(options); return new Uint8Array([1,2,3]);};
pdfServices.render = async () => [pageImage, pageImage];
pdfServices.print = async () => false;
function contents(node: ReactTestInstance | string): string { return typeof node === 'string' ? node : node.children.map(child=>contents(child)).join(''); }
let view:ReactTestRenderer;
async function flush(action?:()=>void) { await act(async()=>{ action?.(); await new Promise(resolve=>setTimeout(resolve,0)); }); }
function button(label:string) { const found=view.root.findAllByType('button').find(node=>contents(node)===label); assert.ok(found, `Button ${label}`); return found; }
function text(){ return JSON.stringify(view.toJSON()); }
await flush(()=>{view=create(<PdfExportModal {...props}/>);});
assert.match(text(), /Actual PDF preview/);
assert.equal(view!.root.findByProps({className:'pdf-page-preview'}).props.alt, 'Double-sided flashcards, PDF page 1 of 2');
assert.equal(button('Previous').props.disabled,true);
await flush(()=>button('Next').props.onClick());
assert.match(view!.root.findByProps({className:'pdf-page-preview'}).props.alt,/page 2 of 2/);
assert.equal(button('Next').props.disabled,true);
await flush(()=>button('Print').props.onClick());
assert.match(text(),/print window was blocked/);
assert.ok(view!.root.findAllByType('a').some(node=>node.props.download?.endsWith('.pdf')));
assert.equal(view!.root.findAllByType('button').filter(node=>contents(node)==='Share PDF').length,0);
assert.equal(document.body.style.overflow,'hidden');
keys.get('keydown')!({key:'Escape'}); assert.equal(closed,1);
for (const format of ['Double-sided flashcards','Verse-a-thon checklist','Full-text study sheet']) {
  await flush(()=>{ const match=view.root.findAllByType('button').find(node=>contents(node).startsWith(format)); assert.ok(match); match.props.onClick(); });
  for (const orientation of ['portrait','landscape']) {
    await flush(()=>view.root.findAllByType('select')[0].props.onChange({target:{value:orientation}}));
    assert.equal(created.at(-1)?.orientation,orientation);
    assert.ok(!button('Print').props.disabled);
  }
}
await flush(()=>view.root.findAllByType('select')[1].props.onChange({target:{value:INITIAL_CHILDREN[0].id}}));
assert.ok(created.at(-1)!.items.every(item=>item.verse.child_id===INITIAL_CHILDREN[0].id));
await flush(()=>view.root.findAllByType('select')[2].props.onChange({target:{value:'John'}}));
assert.ok(created.at(-1)!.items.every(item=>item.verse.book==='John'));
await flush(()=>button('New').props.onClick());
await flush(()=>button('Practicing').props.onClick());
await flush(()=>button('Memorized').props.onClick());
assert.match(text(),/No verses match/);
assert.equal(view.root.findAllByType('a').length,0);
assert.equal(button('Print').props.disabled,true);
await flush(()=>button('Reset filters').props.onClick());
assert.ok(!button('Print').props.disabled);
// Preview failure still exposes the original PDF, and a retry recovers.
pdfServices.render=async()=>{throw new Error('Decode failed');};
await flush(()=>view.root.findAllByType('select')[0].props.onChange({target:{value:'portrait'}}));
assert.match(text(),/preview could not load/);
assert.ok(view.root.findAllByType('a').length>=2);
assert.equal(button('Print').props.disabled,true);
pdfServices.render=async()=>[pageImage];
await flush(()=>button('Try again').props.onClick());
assert.ok(!button('Print').props.disabled);
pdfServices.create=async()=>{throw new Error('Font download failed');};
await flush(()=>view.root.findAllByType('select')[0].props.onChange({target:{value:'landscape'}}));
assert.match(text(),/Font download failed/);
assert.equal(view.root.findAllByType('a').length,0);
pdfServices.create=async options=>{created.push(options);return new Uint8Array([1]);};
await flush(()=>button('Try again').props.onClick());
assert.ok(!button('Print').props.disabled);
// Out-of-order exports must never replace the current selection.
const pending:Array<(value:Uint8Array)=>void>=[];
pdfServices.create=()=>new Promise(resolve=>pending.push(resolve));
await flush(()=>view.root.findAllByType('select')[0].props.onChange({target:{value:'portrait'}}));
await flush(()=>view.root.findAllByType('select')[0].props.onChange({target:{value:'landscape'}}));
assert.equal(pending.length,2);
await flush(()=>pending[1](new Uint8Array([2])));
assert.match(view.root.findAllByType('a').find(node=>node.props.download)!.props.download,/landscape/);
await flush(()=>pending[0](new Uint8Array([1])));
assert.match(view.root.findAllByType('a').find(node=>node.props.download)!.props.download,/landscape/);
await flush(()=>view.unmount());
assert.equal(document.body.style.overflow,'');
// Exercise the collection passed by the real app, then change children inside export.
const family={version:1 as const,children:INITIAL_CHILDREN,verses:INITIAL_VERSES,activeChildId:INITIAL_CHILDREN[0].id,lastUpdated:new Date().toISOString(),events:[{id:'event',title:'Verse-a-thon',event_date:null,created_at:'2026-01-01',verse_ids:INITIAL_VERSES.map(verse=>verse.id)}],recitations:[]};
const collection=exportSelection(family,'verses');
assert.equal(collection.length,INITIAL_VERSES.length);
assert.equal(exportSelection(family,'event','event').length,INITIAL_VERSES.length);
assert.ok(exportSelection(family,'lifetime').every(verse=>['Learned','Mastered'].includes(verse.status)));
pdfServices.create=async options=>{created.push(options);return new Uint8Array([1]);};
pdfServices.render=async()=>[pageImage];
Object.assign(globalThis,{window:{matchMedia:()=>({matches:true})}});
await flush(()=>{view=create(<PdfExportModal {...props} verses={collection} initialChildId={INITIAL_CHILDREN[0].id}/>);});
assert.equal(view.root.findByType('details').props.open,false,'Phone settings must leave the preview visible');
const picker=view.root.findByProps({className:'pdf-format-picker'});
assert.equal(picker.findAllByType('button').length,3,'All three templates must be outside collapsed settings');
assert.ok(!picker.findAllByType('button').some(button=>{let parent=button.parent;while(parent){if(parent.type==='details')return true;parent=parent.parent;}return false;}));
assert.ok(view.root.findByProps({className:'pdf-page-preview'}));
for(const child of INITIAL_CHILDREN.filter(child=>collection.some(verse=>verse.child_id===child.id))){
  await flush(()=>view.root.findAllByType('select')[1].props.onChange({target:{value:child.id}}));
  assert.equal(button('Print').props.disabled,false,`Printable pages for ${child.name}`);
  assert.ok(created.at(-1)!.items.length>0);
  assert.ok(created.at(-1)!.items.every(item=>item.verse.child_id===child.id));
}
await flush(()=>view.root.findAllByType('select')[1].props.onChange({target:{value:'missing-child'}}));
assert.equal(button('Print').props.disabled,true);
await flush(()=>button('Reset filters').props.onClick());
assert.equal(view.root.findAllByType('select')[1].props.value,'all');
assert.equal(button('Print').props.disabled,false);
await flush(()=>view.unmount());
Object.assign(pdfServices, originals);
console.log('PASS phone preview visibility, complete app export collection, switching each populated child, scoped event/lifetime collections, and recovery from an empty child selection');
console.log('PASS export UI: six output/orientation choices, page navigation, child/book/status filters, empty selection, blocked print recovery, preview and font errors, retry, stale export cancellation, keyboard close, and cleanup');

const legacy = ['New','Learning','Memorizing','Learned','Mastered'] as const;
const verses=legacy.map((status,index)=>({...INITIAL_VERSES[0],id:`legacy-${index}`,status}));
assert.deepEqual(summarizeProgress(verses).groups.map(group=>group.count),[1,2,2]);
assert.equal(summarizeProgress(verses).percentage,40);
assert.equal(summarizeProgress([]).percentage,0);
assert.equal(summarizeProgress([verses[4]]).percentage,100);
await flush(()=>{view=create(<VerseProgress verses={verses}/>);});
assert.equal(view.root.findAllByProps({className:'verse-progress-counter'}).length,3);
assert.match(contents(view.root),/40%/);
assert.match(view.root.findByType('svg').props['aria-label'],/1 new, 2 practicing, 2 memorized/);
await flush(()=>view.unmount());
const adapter = new InMemoryStorageAdapter();
const store = new VerseNestStorage(adapter, {startEmpty:false});
const db = await store.loadDatabase();
const first=db.verses[0];
await store.updateVerse(first.id,{status:'Mastered',text:'Edited text together with status'});
const saved=(await store.loadDatabase()).verses.find(verse=>verse.id===first.id)!;
assert.equal(saved.status,'Mastered');assert.ok(saved.date_mastered);assert.equal(saved.text,'Edited text together with status');
assert.equal(saved.status_history.at(-1)!.status,'Mastered');
await store.updateVerseStatus(first.id,'Learning');
assert.equal((await store.loadDatabase()).verses.find(verse=>verse.id===first.id)!.date_mastered,null);
const snapshot=await adapter.getItem(STORAGE_KEY);
legacy.forEach(status=>assert.ok(learningGroup(status)));
assert.equal(await adapter.getItem(STORAGE_KEY),snapshot,'Presentation must not migrate or modify stored history');
console.log('PASS three-category summaries, graph distribution, empty/complete progress, saved status plus text edits, and legacy status compatibility');

// Exercise the real isolated print document with a small DOM adapter.
let prints=0, opened=false, failImage=false;
const appended:any[]=[];
const doc:any={title:'',head:{append(node:any){appended.push(node);}},body:{append(node:any){appended.push(node);}},createElement(tag:string){
  const element:any={tag,children:[],append(...nodes:any[]){this.children.push(...nodes);}};
  if(tag==='img')Object.defineProperty(element,'src',{set(value){this.value=value;queueMicrotask(()=>failImage?this.onerror():this.onload());}});
  return element;
}};
Object.assign(globalThis,{window:{open(){opened=true;return {document:doc,opener:{},closed:false,focus(){},print(){prints++;assert.equal(appended.filter(node=>node.tag==='img').length,2);}};}}});
assert.equal(await printPdfPages([pageImage,pageImage]),true);
assert.ok(opened);assert.equal(prints,1);
const style=appended.find(node=>node.tag==='style').textContent;
assert.match(style,/@page\{size:Letter portrait;margin:0/);assert.match(style,/img:last-child\{break-after:auto/);
const control=appended.find(node=>node.className==='controls');
assert.equal(control.children[1].disabled,false);
control.children[1].onclick();assert.equal(prints,2);
(window as any).open=()=>null;
assert.equal(await printPdfPages([pageImage]),false);
(window as any).open=()=>({document:doc,opener:null,closed:false,focus(){},print(){throw new Error('Must wait for images');}});
failImage=true;
await assert.rejects(printPdfPages([pageImage]),/could not be loaded/);
assert.equal(canSharePdf(new File(['pdf'],'test.pdf')),false);
console.log('PASS isolated print flow: exact Letter page sizing, all images loaded before printing, manual reprint, popup blocking, image failure, and unsupported sharing');
