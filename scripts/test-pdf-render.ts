import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { renderPdfPages, withPreviewTimeout } from '../src/pdfRenderer';
let timedOut=false;
await assert.rejects(withPreviewTimeout(new Promise(()=>{}),()=>{timedOut=true;},10),/took too long/);
assert.equal(timedOut,true);
assert.equal(await withPreviewTimeout(Promise.resolve('ready'),()=>{throw new Error('Unexpected timeout');},10),'ready');
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
Object.assign(globalThis, { document: { createElement: (tag: string) => { assert.equal(tag, 'canvas'); return createCanvas(1, 1); } } });
mkdirSync('tmp/pdfs/rendered', { recursive: true });
for (const format of ['flashcards', 'checklist', 'study_sheet']) {
  for (const orientation of ['portrait', 'landscape']) {
    const bytes = new Uint8Array(readFileSync(`tmp/pdfs/${format}-${orientation}.pdf`));
    const images = await renderPdfPages(bytes, 1.5);
    const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
    let text = '';
    for (let number = 1; number <= doc.numPages; number++) {
      const page = await doc.getPage(number);
      const content = await page.getTextContent();
      const bounds = page.getViewport({scale:1});
      for (const item of content.items) {
        if (!('str' in item)) continue;
        text += item.str + ' ';
        assert.ok(item.transform[4] >= 0 && item.transform[4] + item.width <= bounds.width + 1, `Text overflow: ${item.str}`);
        assert.ok(item.transform[5] >= 0 && item.transform[5] <= bounds.height, `Vertical overflow: ${item.str}`);
      }
    }
    text=text.replace(/\s+/g," ");
    assert.equal(images.length, doc.numPages);
    assert.match(text, /VerseNest/);
    assert.match(text, /John 3:16/);
    if (format !== 'checklist') assert.match(text, /For God so loved the world/);
    if (format === 'study_sheet') {
      assert.match(text,/Reference Full Verse Text Status/);
      assert.ok(!/Status: (Mastered|Learned|Learning|Memorizing)/.test(text));
    }
    if(format === 'checklist') { assert.match(text,/# Recited Reference Prompts Listener notes/); assert.ok(!/For God so loved the world/.test(text)); }
    // Every template's first page must contain the actual logo image.
    const operators=await (await doc.getPage(1)).getOperatorList();
    assert.ok(operators.fnArray.includes(pdfjs.OPS.paintImageXObject),'Template must embed the VerseNest logo');
    images.forEach((image, index) => {
      assert.equal(image.width, orientation === 'portrait' ? 612 : 792);
      assert.equal(image.height, orientation === 'portrait' ? 792 : 612);
      const png = Buffer.from(image.src.split(',')[1], 'base64');
      assert.ok(png.length > 5000);
      writeFileSync(`tmp/pdfs/rendered/${format}-${orientation}-${index+1}.png`, png);
    });
    await doc.destroy();
    console.log(`PASS actual PDF.js renderer: ${format} ${orientation}, ${images.length} pages, text and bounds`);
  }
}
const longDoc=await pdfjs.getDocument({data:new Uint8Array(readFileSync('tmp/pdfs/long-study.pdf'))}).promise;
let longText='';
for(let index=1;index<=longDoc.numPages;index++){
  const content=await(await longDoc.getPage(index)).getTextContent();
  for(const item of content.items){if('str' in item){longText+=item.str+' ';assert.ok(!item.str.trim() || item.str.startsWith('VerseNest |') || item.transform[5]>=40,`Long verse content must stay above the footer: ${item.str} at ${item.transform[5]}`);}}
}
assert.match(longText,/END_OF_LONG_VERSE/,'Long study table must preserve its final words');
await longDoc.destroy();
console.log('PASS long study-table pagination retains all text without clipping into the footer');
delete (globalThis as any).document;
