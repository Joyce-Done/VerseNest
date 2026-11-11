import { firstMemorizedDate } from './familyData';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { buildFlashcardPagePairs, getFlashcardDimensions, type ExportableVerseItem, type ExportFormat, type PageOrientation } from './pdfExport';
import { formatReference } from './bible';
import { learningGroup } from './learningStatus';

export interface PdfDocumentOptions {
  format: ExportFormat;
  orientation: PageOrientation;
  items: ExportableVerseItem[];
  childName: string;
  clubName: string;
  date: string;
  listenerName: string;
  collectionTitle?: string;
}
let fontDownload: Promise<Uint8Array> | undefined;
let logoDownload: Promise<Uint8Array> | undefined;
async function binary(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('A printable asset could not load. Reopen VerseNest online and try again.');
  return new Uint8Array(await response.arrayBuffer());
}
function loadFont() {
  return fontDownload ??= binary('/fonts/DejaVuSans.ttf').then(bytes => {
    if (bytes.length < 4 || !((bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0) || String.fromCharCode(...bytes.slice(0, 4)) === 'OTTO')) {
      throw new Error('The PDF font could not load. Reopen VerseNest online, then try again.');
    }
    return bytes;
  }).catch(error => { fontDownload = undefined; throw error; });
}
function loadLogo() {
  return logoDownload ??= binary('/brand/versenest-logo-print.png').catch(error => { logoDownload = undefined; throw error; });
}
function wrap(value: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of value.replace(/\r/g, '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const character of word) {
        if (line && font.widthOfTextAtSize(line + character, size) > width) { lines.push(line); line = ''; }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}
const ink = rgb(.17,.12,.29), purple = rgb(.36,.15,.59), pink = rgb(.91,.08,.49), cyan = rgb(0,.66,.76), gold = rgb(1,.76,.16);
const lineColor = rgb(.83,.79,.89), pale = rgb(.97,.95,.99);

export async function createVersePdf(options: PdfDocumentOptions, suppliedFont?: Uint8Array, suppliedLogo?: Uint8Array): Promise<Uint8Array> {
  if (!options.items.length) throw new Error('Choose at least one verse to export.');
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(suppliedFont ?? await loadFont(), { subset: true });
  const logo = await doc.embedPng(suppliedLogo ?? await loadLogo());
  const [width, height] = options.orientation === 'portrait' ? [612,792] : [792,612];
  doc.setTitle(`VerseNest - ${options.format.replaceAll('_',' ')}`);
  doc.setCreator('VerseNest');
  doc.setSubject(`VerseNest template: ${options.format}; ${options.orientation}; ${options.items.length} verses`);
  const text = (page: PDFPage, value: string, x: number, y: number, size = 10, color = ink) => page.drawText(value, { x,y,size,font,color });
  function fitText(page: PDFPage, value: string, x: number, y: number, maxWidth: number, size = 9) {
    while (font.widthOfTextAtSize(value,size) > maxWidth && size > 5) size -= .25;
    // Wrap unusually long names instead of letting them escape the page.
    for (const [index,line] of wrap(value,font,size,maxWidth).entries()) text(page,line,x,y-index*size*1.3,size);
  }
  function footer(page: PDFPage, label: string, y = 20) { fitText(page,`VerseNest | ${label}`,36,y,width-72,8); }
  function fitted(page: PDFPage, value: string, x: number, y: number, w: number, h: number, initial: number, centered = false) {
    let size = initial, lines = wrap(value,font,size,w);
    while (lines.length*size*1.4 > h && size > 7) { size -= .5; lines = wrap(value,font,size,w); }
    if (lines.length*size*1.4 > h) throw new Error('A verse is too long for a flashcard. Choose the study sheet to include its full text.');
    let baseline = centered ? y+(h+lines.length*size*1.4)/2-size : y+h-size;
    for (const line of lines) { text(page,line,centered ? x+(w-font.widthOfTextAtSize(line,size))/2 : x,baseline,size); baseline -= size*1.4; }
  }
  function header(page: PDFPage, heading: string) {
    page.drawImage(logo,{x:36,y:height-94,width:70,height:70});
    text(page,heading,120,height-48,options.orientation === 'portrait' ? 15 : 18,purple);
    fitText(page,`${options.collectionTitle ? options.collectionTitle+' | ' : ''}${options.childName || 'All children'} | ${options.items.length} passages | ${options.date}`,120,height-67,width-156,9);
    const segment=(width-72)/3;
    [gold,pink,cyan].forEach((color,index)=>page.drawRectangle({x:36+segment*index,y:height-105,width:segment,height:3,color}));
  }
  if (options.format === 'flashcards') {
    const { widthPt:cw,heightPt:ch } = getFlashcardDimensions(options.orientation,4);
    const gx=options.orientation === 'portrait' ? 25.2 : 28.8, gy=options.orientation === 'portrait' ? 18 : 21.6;
    const left=(width-2*cw-gx)/2, bottom=(height-2*ch-gy)/2;
    for (const pair of buildFlashcardPagePairs(options.items,4,'mirrored')) {
      for (const side of ['front','back'] as const) {
        const page=doc.addPage([width,height]);
        const items=side === 'front' ? pair.frontItems : pair.backItems;
        items.forEach((item,index)=>{
          const x=left+index%2*(cw+gx),y=bottom+(1-Math.floor(index/2))*(ch+gy);
          page.drawRectangle({x,y,width:cw,height:ch,borderWidth:.65,borderColor:lineColor});
          if (!item) return;
          const reference=formatReference(item.verse);
          const accent=index%2 === 0 ? cyan : pink;
          page.drawRectangle({x:x+.5,y:y+ch-3,width:cw-1,height:2.5,color:accent});
          if (side === 'front') {
            page.drawImage(logo,{x:x+(cw-48)/2,y:y+ch-64,width:48,height:48});
            fitted(page,reference,x+18,y+42,cw-36,ch-124,25,true);
            text(page,'SCRIPTURE MEMORY',x+(cw-font.widthOfTextAtSize('SCRIPTURE MEMORY',8))/2,y+20,8,purple);
          } else {
            fitted(page,`${reference} (${item.verse.translation})`,x+16,y+ch-51,cw-32,30,12);
            page.drawLine({start:{x:x+16,y:y+ch-58},end:{x:x+cw-16,y:y+ch-58},thickness:.5,color:lineColor});
            fitted(page,item.verse.text+(item.verse.notes ? `\n\nNote: ${item.verse.notes}` : ''),x+16,y+33,cw-32,ch-104,14);
            fitted(page,`${item.childName} | VerseNest`,x+16,y+8,cw-32,14,8);
          }
        });
        footer(page,`${side === 'front' ? 'Fronts' : 'Backs'} | Pair ${pair.pairIndex} | Print 100%, flip on ${options.orientation === 'portrait' ? 'long' : 'short'} edge`,height/2-3);
      }
    }
  } else {
    const margin=36,contentWidth=width-72;
    let page:PDFPage,y:number;
    const checklist=options.format === 'checklist';
    const heading=checklist ? 'Verse-a-thon Tracking Checklist' : 'Scripture Memory Study Sheet';
    const columns=checklist ? [28,50,contentWidth*.42,60,contentWidth-138-contentWidth*.42] : [options.orientation === 'portrait' ? 126 : 156,contentWidth-(options.orientation === 'portrait' ? 126 : 156)-78,78];
    const labels=checklist ? ['#','Recited','Reference','Prompts','Listener notes'] : ['Reference','Full Verse Text','Status'];
    function tableHead() {
      page.drawRectangle({x:margin,y:y-25,width:contentWidth,height:25,color:pale,borderColor:lineColor,borderWidth:.5});
      let x=margin;
      labels.forEach((label,index)=>{text(page,label,x+7,y-16,9,purple);x+=columns[index];});
      y-=25;
    }
    function newPage(withTable=true) {
      page=doc.addPage([width,height]); header(page,heading);
      footer(page,`Page ${doc.getPageCount()} | ${checklist ? 'Recite and celebrate' : 'Practice together'}`);
      y=height-126;
      if (withTable) tableHead();
    }
    function row(cells:string[][],rows:number,index:number,check=false) {
      const h=rows*14+16;
      page.drawRectangle({x:margin,y:y-h,width:contentWidth,height:h,color:index%2 ? pale : rgb(1,1,1),borderColor:lineColor,borderWidth:.5});
      let x=margin;
      cells.forEach((lines,column)=>{
        if(column>0)page.drawLine({start:{x,y},end:{x,y:y-h},thickness:.4,color:lineColor});
        lines.forEach((line,number)=>text(page,line,x+7,y-15-number*14,column===cells.length-1 && !check ? 8 : 9));
        if(check && column===1)page.drawRectangle({x:x+(columns[column]-10)/2,y:y-h/2-5,width:10,height:10,borderColor:purple,borderWidth:.6});
        if(check && column===4)page.drawLine({start:{x:x+7,y:y-h+12},end:{x:x+columns[column]-7,y:y-h+12},thickness:.4,color:lineColor});
        x+=columns[column];
      });
      y-=h;
    }
    if(checklist) {
      newPage(false);
      const fieldWidth=(contentWidth-18)/2;
      [["Clubber",options.childName],["Club",options.clubName],["Date",options.date],["Listener",options.listenerName]].forEach(([label,value],index)=>{
        const x=margin+(index%2)*(fieldWidth+18),top=y-Math.floor(index/2)*37;
        text(page,`${label}:`,x,top,8,purple);
        fitText(page,value || '________________________',x+48,top,fieldWidth-48,9);
      });
      y-=82;
      text(page,`Total verses recited: ______ / ${options.items.length}`,margin,y,9);y-=18;
      text(page,'Mark each recited verse and record up to two prompts.',margin,y,8);y-=16;
      tableHead();
      options.items.forEach((item,index)=>{
        const reference=wrap(`${formatReference(item.verse)} (${item.verse.translation})\n${item.childName}`,font,9,columns[2]-14);
        const count=Math.max(2,reference.length);
        if(y-(count*14+16)<70)newPage();
        row([[String(index+1)],[],reference,['0 / 1 / 2'],[]],count,index,true);
      });
      if(y<70)newPage(false);
      y-=24;
      text(page,'Listener signature: ______________________   Completed: ______________',margin,y,9);
    } else {
      newPage();
      options.items.forEach((item,index)=>{
        const reference=wrap(`${index+1}. ${formatReference(item.verse)}\n${item.verse.translation} | ${item.childName}${firstMemorizedDate(item.verse) ? `\nFirst recorded: ${firstMemorizedDate(item.verse)}` : ''}`,font,9,columns[0]-14);
        const body=wrap(item.verse.text+(item.verse.notes ? `\nNote: ${item.verse.notes}` : ''),font,9,columns[1]-14);
        const count=Math.max(reference.length,body.length);
        let cursor=0;
        while(cursor<count) {
          const minRows=Math.max(2,Math.min(count-cursor,4));
          if(y-(minRows*14+16)<46)newPage();
          const available=Math.max(1,Math.floor((y-46-16)/14));
          const take=Math.min(count-cursor,available);
          const ref=reference.slice(cursor,cursor+take);
          if(cursor>0 && !ref.length)ref.push(`${formatReference(item.verse)}`,'(continued)');
          row([ref,body.slice(cursor,cursor+take),[learningGroup(item.verse.status).label]],Math.max(take,ref.length),index);
          cursor+=take;
        }
      });
    }
  }
  return doc.save();
}
