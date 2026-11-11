import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { createVersePdf } from '../src/pdfDocument';
import { INITIAL_CHILDREN, INITIAL_VERSES } from '../src/mockData';
import { filterVersesForExport } from '../src/pdfExport';
const font = readFileSync('public/fonts/DejaVuSans.ttf');
const logo = readFileSync('public/brand/versenest-logo-print.png');
const items = filterVersesForExport(INITIAL_VERSES, INITIAL_CHILDREN, { childId: 'all', book: 'all', statuses: [] });
mkdirSync('tmp/pdfs', { recursive: true });
for (const format of ['flashcards', 'checklist', 'study_sheet'] as const) {
  for (const orientation of ['portrait', 'landscape'] as const) {
    const options = { format, orientation, items, childName: 'All profiles', clubName: 'Sparks / T&T', date: 'October 12, 2026', listenerName: 'Mrs. García' };
    const bytes = await createVersePdf(options, font, logo);
    assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), '%PDF-');
    const reopened = await PDFDocument.load(bytes);
    assert.ok(reopened.getPageCount() > 0);
    assert.match(reopened.getSubject()!,new RegExp(`template: ${format}; ${orientation}`));
    if (format === 'flashcards') assert.equal(reopened.getPageCount(), Math.ceil(items.length / 4) * 2);
    for (const page of reopened.getPages()) {
      assert.deepEqual(page.getSize(), orientation === 'portrait' ? {width:612,height:792} : {width:792,height:612});
      assert.ok(page.node.Contents(), 'Page must have actual drawing content');
    }
    writeFileSync(`tmp/pdfs/${format}-${orientation}.pdf`, bytes);
    console.log(`PASS ${format} ${orientation}: ${reopened.getPageCount()} nonempty Letter pages`);
  }
}
await assert.rejects(createVersePdf({format:'study_sheet',orientation:'portrait',items:[],childName:'',clubName:'',date:'',listenerName:''},font,logo),/at least one/);
const longItems = [{...items[0], verse:{...items[0].verse, text:'Español: Jehová es mi pastor. '.repeat(300) + 'END_OF_LONG_VERSE'}}];
const long = await createVersePdf({format:'study_sheet',orientation:'portrait',items:longItems,childName:'García',clubName:'',date:'',listenerName:''},font,logo);
writeFileSync('tmp/pdfs/long-study.pdf', long);
assert.ok((await PDFDocument.load(long)).getPageCount() > 1, 'Long verses must paginate');
await assert.rejects(createVersePdf({format:'flashcards',orientation:'portrait',items:longItems,childName:'',clubName:'',date:'',listenerName:''},font,logo),/too long/);
const modal = readFileSync('src/components/PdfExportModal.tsx','utf8');
assert.ok(!modal.includes('document.write'), 'PDF printing must not depend on webpage print visibility rules');
assert.ok(modal.includes('href={pdf.url}'), 'Open and download must target the generated PDF');
assert.ok(modal.includes("type: 'application/pdf'"));
assert.ok(modal.includes('pdf-page-preview'));
assert.ok(modal.includes('pdfServices.print(pdf.pages'));
assert.ok(!readFileSync('src/index.css','utf8').includes('visibility: hidden'));
console.log('PASS empty selection; long verse pagination; oversized flashcard feedback; independent PDF open and download regression; PDF MIME type');
