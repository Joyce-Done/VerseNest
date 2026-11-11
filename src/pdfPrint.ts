import type { PdfPageImage } from './pdfRenderer';

export function canSharePdf(file: File): boolean {
  try { return typeof navigator.share === 'function' && Boolean(navigator.canShare?.({ files: [file] })); }
  catch { return false; }
}

// A separate document avoids clipped modals, hidden ancestors, and mobile PDF plugins.
export async function printPdfPages(pages: PdfPageImage[], title = 'VerseNest printable PDF'): Promise<boolean> {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.opener = null;
  const doc = printWindow.document;
  doc.title = title;
  const style = doc.createElement('style');
  const landscape = pages[0]?.width > pages[0]?.height;
  style.textContent = `@page{size:Letter ${landscape ? 'landscape' : 'portrait'};margin:0}*{box-sizing:border-box}body{margin:0;background:#ebe7df;font:16px system-ui;color:#2e2a4a}.controls{padding:16px;text-align:center}button{padding:12px 24px;border:0;border-radius:12px;background:#8e5ac8;color:white;font:inherit;cursor:pointer}img{display:block;width:100%;height:auto;background:white;margin:16px auto;max-width:${landscape ? '11in' : '8.5in'}}@media print{body{background:white}.controls{display:none}img{margin:0;width:${landscape ? '11in' : '8.5in'};height:${landscape ? '8.5in' : '11in'};max-width:none;break-after:page;page-break-after:always}img:last-child{break-after:auto;page-break-after:auto}}`;
  (doc.head as any).append(style);
  const controls = doc.createElement('div');
  controls.className = 'controls';
  const note = doc.createElement('p');
  note.textContent = 'Letter paper · 100% scale · Turn off browser headers and footers. On iPhone, you can also save the PDF and use Share → Print.';
  const button = doc.createElement('button');
  button.textContent = 'Preparing pages…';
  button.disabled = true;
  button.onclick = () => printWindow.print();
  (controls as any).append(note, button);
  (doc.body as any).append(controls);
  try {
    await Promise.all(pages.map((page, index) => new Promise<void>((resolve, reject) => {
      const img = doc.createElement('img');
      img.alt = `PDF page ${index + 1} of ${pages.length}`;
      img.width = page.width;
      img.height = page.height;
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('A print page could not be loaded. Save the PDF and print from your PDF viewer.'));
      img.src = page.src;
      (doc.body as any).append(img);
    })));
    if (printWindow.closed) return true;
    button.disabled = false;
    button.textContent = 'Print / Save as PDF';
    printWindow.focus();
    printWindow.print();
    return true;
  } catch (error) {
    note.textContent = error instanceof Error ? error.message : 'Could not prepare printing. Save the PDF and try again.';
    throw error;
  }
}
