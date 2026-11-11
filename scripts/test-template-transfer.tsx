import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { createCanvas } from '@napi-rs/canvas';
import { createVersePdf } from '../src/pdfDocument';
import { PdfExportModal, pdfServices } from '../src/components/PdfExportModal';
import { INITIAL_CHILDREN, INITIAL_VERSES } from '../src/mockData';
import type { PdfPageImage } from '../src/pdfRenderer';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT:true, document:{activeElement:{focus(){}},body:{style:{overflow:''}},addEventListener(){},removeEventListener(){},createElement:(tag:string)=>{assert.equal(tag,'canvas');return createCanvas(1,1);}} });
Object.defineProperty(globalThis,'navigator',{configurable:true,writable:true,value:{}});
const font=readFileSync('public/fonts/DejaVuSans.ttf'),logo=readFileSync('public/brand/versenest-logo-print.png');
const hash=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
let generated:Uint8Array,renderInput:Uint8Array,images:PdfPageImage[]=[],printed:PdfPageImage[]=[],printTitle='';
let generationCount=0;
const originals={...pdfServices};
pdfServices.create=async options=>{generationCount++;generated=await createVersePdf(options,font,logo);return generated;};
pdfServices.render=async bytes=>{renderInput=bytes.slice();try {images=await originals.render(bytes,1);return images;} catch(error) { console.error(error);throw error; }};
pdfServices.print=async(pages,title)=>{printed=pages;printTitle=title!;return true;};
let view:ReactTestRenderer;
const text=(node:any):string=>typeof node==='string'?node:(node.children??[]).map(text).join('');
async function change(action:()=>void){await act(async()=>{action();});}
async function ready(){
  for(let i=0;i<200;i++){
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});
    const button=view.root.findByProps({id:'print-pdf-export-button'});
    if(!button.props.disabled)return;
  }
  throw new Error('PDF preview did not become ready: '+view.root.findAllByProps({role:'alert'}).map(text).join(' | '));
}
await change(()=>{view=create(<PdfExportModal isOpen onClose={()=>{}} childrenList={INITIAL_CHILDREN} verses={INITIAL_VERSES} initialChildId={INITIAL_CHILDREN[0].id}/>);});
await ready();
for(const format of ['flashcards','checklist','study_sheet']){
  const label={flashcards:'Double-sided flashcards',checklist:'Verse-a-thon checklist',study_sheet:'Full-text study sheet'}[format]!;
  await change(()=>view.root.findAllByType('button').find(button=>text(button).startsWith(label))!.props.onClick());
  for(const orientation of ['portrait','landscape']){
    await change(()=>view.root.findAllByType('select')[0].props.onChange({target:{value:orientation}}));
    await ready();
    const preview=view.root.findAllByType('a').find(link=>text(link)==='Preview PDF')!;
    const saved=view.root.findAllByType('a').find(link=>link.props.download)!;
    assert.equal(preview.props.href,saved.props.href,'Preview and Save must reference the same PDF');
    const fileBytes=new Uint8Array(await(await fetch(saved.props.href)).arrayBuffer());
    assert.equal(hash(fileBytes),hash(generated),'Save must preserve the exact generated document');
    assert.equal(hash(renderInput),hash(generated),'Preview must render the exact saved PDF');
    const count=generationCount;
    const img=view.root.findByProps({className:'pdf-page-preview'});
    assert.equal(img.props.src,images[0].src,'Onscreen preview uses the rendered PDF page');
    const nativePages=view.root.findAllByProps({className:'pdf-native-page'});
    assert.deepEqual(nativePages.map(page=>page.props.src),images.map(page=>page.src),'Browser Print must use the identical PDF pages too');
    await change(()=>view.root.findByProps({id:'print-pdf-export-button'}).props.onClick());
    assert.strictEqual(printed,images,'Print must use the identical rendered page array, with no alternate template');
    assert.equal(generationCount,count,'Printing must not regenerate or change the selected template');
    assert.match(printTitle,new RegExp(`${format}-${orientation}`));
    assert.match(saved.props.download,new RegExp(`${format}-${orientation}`));
    assert.ok(images.every(image=>image.width===(orientation==='portrait'?612:792)&&image.height===(orientation==='portrait'?792:612)));
    console.log(`PASS exact template transfer: ${format} ${orientation}, ${images.length} pages, Preview/Save byte hash and Print page identity`);
  }
}
await change(()=>view.unmount());
Object.assign(pdfServices,originals);
