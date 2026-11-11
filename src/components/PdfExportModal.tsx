import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BIBLE_BOOKS, type BibleBook, type Child, type Verse } from '../types';
import { LEARNING_GROUPS, learningGroup } from '../learningStatus';
import { filterVersesForExport, type ExportFormat, type PageOrientation } from '../pdfExport';
import type { PdfDocumentOptions } from '../pdfDocument';
import { renderPdfPages, type PdfPageImage } from '../pdfRenderer';
import { canSharePdf, printPdfPages } from '../pdfPrint';
import { X, Printer, Download, ExternalLink, FileText, Scissors, ClipboardList } from 'lucide-react';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  childrenList: Child[];
  verses: Verse[];
  initialChildId?: string;
  initialFormat?: ExportFormat;
  contextTitle?: string;
}
// Shared services also let regression tests exercise asynchronous export failures.
export const pdfServices = {
  create: async (options: PdfDocumentOptions) => (await import('../pdfDocument')).createVersePdf(options),
  render: renderPdfPages,
  print: printPdfPages,
};
const formats = [
  { value: 'flashcards', label: 'Double-sided flashcards', detail: 'References on the front, full verses on the back.', Icon: Scissors },
  { value: 'checklist', label: 'Verse-a-thon checklist', detail: 'AWANA recitation checklist for your listener.', Icon: ClipboardList },
  { value: 'study_sheet', label: 'Full-text study sheet', detail: 'Reference, scripture, and status in a study table.', Icon: FileText },
] as const;

export function PdfExportModal({ isOpen, onClose, childrenList, verses, initialChildId = 'all', initialFormat = 'flashcards', contextTitle }: PdfExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>(initialFormat);
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [childId, setChildId] = useState(initialChildId);
  const [book, setBook] = useState<BibleBook | 'all'>('all');
  const [statuses, setStatuses] = useState<string[]>(LEARNING_GROUPS.map(group => group.value));
  const [name, setName] = useState('');
  const [club, setClub] = useState('Sparks / T&T');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-US'));
  const [listener, setListener] = useState('');
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(() => typeof window === 'undefined' || !window.matchMedia || !window.matchMedia('(max-width: 639px)').matches);
  const [prepared, setPrepared] = useState<{ key: string; url: string; file: File; pages: PdfPageImage[] } | null>(null);
  const [error, setError] = useState('');
  const [previewError, setPreviewError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => { if (isOpen) setChildId(initialChildId); }, [isOpen, initialChildId]);
  useEffect(() => {
    if (!isOpen) return;
    const before = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !dialog.current) return;
      const controls = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, [tabindex="0"]'));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); before?.focus?.(); };
  }, [isOpen, onClose]);
  const items = useMemo(() => filterVersesForExport(verses, childrenList, { childId, book, statuses: [] })
    .filter(item => statuses.includes(learningGroup(item.verse.status).value)), [verses, childrenList, childId, book, statuses]);
  const childName = name.trim() || childrenList.find(child => child.id === childId)?.name || '';
  const key = JSON.stringify([isOpen, format, orientation, items, childName, club, date, listener, retry, contextTitle]);
  const pdf = prepared?.key === key ? prepared : null;
  useEffect(() => {
    let cancelled = false;
    let url: string | undefined;
    setPrepared(null); setError(''); setPreviewError(''); setPage(0);
    if (isOpen && items.length) {
      (async () => {
        try {
          const bytes = await pdfServices.create({ format, orientation, items, childName, clubName: club, date, listenerName: listener, collectionTitle: contextTitle });
          if (cancelled) return;
          const file = new File([new Uint8Array(bytes)], `VerseNest-${format}-${orientation}.pdf`, { type: 'application/pdf' });
          url = URL.createObjectURL(file);
          const result = { key, url, file, pages: [] as PdfPageImage[] };
          setPrepared(result);
          try {
            const pages = await pdfServices.render(bytes);
            if (!cancelled) setPrepared({ ...result, pages });
          } catch (cause) {
            if (!cancelled) setPreviewError(`The preview could not load. ${cause instanceof Error ? cause.message : 'Preview or save the PDF below to view and print it.'}`);
          }
        } catch (cause) {
          if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not create the PDF. Please try again.');
        }
      })();
    }
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [key]);
  if (!isOpen) return null;
  const print = async () => {
    if (!pdf?.pages.length) return;
    try {
      const opened = await pdfServices.print(pdf.pages, pdf.file.name);
      if (!opened) setError('The print window was blocked. Allow pop-ups for VerseNest, or open/save the PDF and print from your PDF viewer.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Printing could not start. Open or save the PDF to print.'); }
  };
  const share = async () => {
    if (!pdf) return;
    try { await navigator.share({ files: [pdf.file], title: 'VerseNest printable PDF' }); }
    catch (cause) { if (!(cause instanceof Error && cause.name === 'AbortError')) setError('Sharing could not start. Use Preview PDF or Save PDF.'); }
  };
  return (
    <div className="pdf-overlay">
      <div className="pdf-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-title" tabIndex={-1} ref={dialog}>
        <header className="pdf-header">
          <div><h3 id="pdf-title"><Printer size={21} />PDF & printable export</h3><p>{contextTitle || 'Print scripture for practice, review, and verse-a-thon day.'}</p></div>
          <button type="button" className="pdf-icon-button" onClick={onClose} aria-label="Close export modal"><X /></button>
        </header>
        <div className="pdf-format-picker">
          <div className="pdf-formats" aria-label="Export format">{formats.map(({ value, label, detail, Icon }) => (
            <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)} className={format === value ? 'selected' : ''}><Icon size={19} /><span><strong>{label}</strong><small>{detail}</small></span></button>
          ))}</div>
        </div>
        <details className="pdf-settings" open={settingsOpen} onToggle={event => setSettingsOpen(event.currentTarget.open)}>
          <summary className="pdf-settings-summary"><span><strong>{formats.find(item => item.value === format)?.label}</strong><small>{childName || 'All children'} · {items.length} passage{items.length === 1 ? '' : 's'} · {orientation}</small></span><span>{settingsOpen ? 'Hide settings' : 'Change settings'}</span></summary>
          <div className="pdf-settings-content">
          <div className="pdf-fields">
            <label>Page orientation<select value={orientation} onChange={event => setOrientation(event.target.value as PageOrientation)}><option value="portrait">Letter · Portrait (8.5 × 11)</option><option value="landscape">Letter · Landscape (11 × 8.5)</option></select></label>
            <label>Child profile<select value={childId} onChange={event => setChildId(event.target.value)}><option value="all">All children ({verses.length})</option>{childrenList.map(child => {const count=verses.filter(verse=>verse.child_id===child.id).length;return <option key={child.id} value={child.id} disabled={!count}>{child.name} ({count})</option>;})}</select></label>
            <label>Bible book<select value={book} onChange={event => setBook(event.target.value as BibleBook | 'all')}><option value="all">All Bible books</option>{BIBLE_BOOKS.map(value => <option key={value}>{value}</option>)}</select></label>
          </div>
          {format === 'checklist' && <div className="pdf-fields pdf-checklist-fields">
            <label>Clubber's name<input value={name} placeholder={childName || 'Leave blank for handwriting'} onChange={event => setName(event.target.value)} /></label>
            <label>Club<input value={club} onChange={event => setClub(event.target.value)} /></label>
            <label>Date<input value={date} onChange={event => setDate(event.target.value)} /></label>
            <label>Listener's name<input value={listener} onChange={event => setListener(event.target.value)} /></label>
          </div>}
          <div className="pdf-status-filters" aria-label="Learning status filters"><strong>Status</strong>{LEARNING_GROUPS.map(group => <button key={group.value} type="button" aria-pressed={statuses.includes(group.value)} onClick={() => setStatuses(previous => previous.includes(group.value) ? previous.filter(value => value !== group.value) : [...previous, group.value])}>{group.label}</button>)}<button type="button" onClick={() => setStatuses(LEARNING_GROUPS.map(group => group.value))}>Select all</button></div>
          </div>
        </details>
        <main className="pdf-preview-area" aria-busy={Boolean(items.length && !pdf?.pages.length && !error && !previewError)}>
          {items.length === 0 ? <div className="pdf-empty"><FileText /><h4>No verses match these filters</h4><p>{verses.length ? 'Show all saved passages in this collection to restore the preview.' : 'This collection has no saved verses yet. Add a verse before printing.'}</p>{verses.length > 0 && <button type="button" onClick={() => { setChildId('all'); setBook('all'); setStatuses(LEARNING_GROUPS.map(group => group.value)); }}>Reset filters</button>}</div> : <>
            <div className="pdf-preview-caption"><strong>{formats.find(item => item.value === format)?.label} · {items.length} verse{items.length === 1 ? '' : 's'}</strong><span>{pdf?.pages.length ? `Actual PDF preview · ${pdf.pages.length} pages · ${orientation}` : 'Preparing your printable PDF'}</span></div>
            {error && <p className="pdf-error" role="alert">{error}</p>}
            {previewError && <p className="pdf-error" role="alert">{previewError}</p>}
            {(error || previewError) && <button type="button" className="pdf-action" onClick={() => setRetry(value => value + 1)}>Try again</button>}
            {pdf?.pages.length ? <>
              <nav className="pdf-page-nav" aria-label="PDF pages"><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button><span role="status">Page {page + 1} of {pdf.pages.length}</span><button type="button" disabled={page >= pdf.pages.length - 1} onClick={() => setPage(value => value + 1)}>Next</button></nav>
              <img className="pdf-page-preview" src={pdf.pages[page].src} width={pdf.pages[page].width} height={pdf.pages[page].height} alt={`${formats.find(item => item.value === format)?.label}, PDF page ${page + 1} of ${pdf.pages.length}`} />
            </> : !error && !previewError && <p role="status" className="pdf-loading">{pdf ? 'Rendering PDF preview…' : 'Creating PDF…'}</p>}
          </>}
        </main>
        <footer className="pdf-footer">
          <div className="pdf-print-help"><p>iPhone: Share PDF → Print. Letter paper · 100% scale.</p>{format === 'flashcards' && <p>Double-sided: flip on the <strong>{orientation === 'portrait' ? 'long' : 'short'} edge</strong>.</p>}</div>
          <div className="pdf-actions">
            <button id="print-pdf-export-button" type="button" className="pdf-action primary" disabled={!pdf?.pages.length} onClick={print}><Printer size={16} />Print</button>
            {pdf && <><a className="pdf-action" href={pdf.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />Preview PDF</a><a className="pdf-action" href={pdf.url} download={pdf.file.name}><Download size={16} />Save PDF</a>{canSharePdf(pdf.file) && <button type="button" className="pdf-action" onClick={share}>Share PDF</button>}</>}
          </div>
        </footer>
      </div>
      {/* Browser Share > Print and Ctrl/Cmd+P use the same rendered PDF pages. */}
      <div className="pdf-native-pages" aria-hidden="true">
        <style>{`@media print { @page { size: Letter ${orientation}; margin: 0; } .pdf-native-page { width: ${orientation === 'portrait' ? '8.5in' : '11in'}; height: ${orientation === 'portrait' ? '11in' : '8.5in'}; } }`}</style>
        {pdf?.pages.length ? pdf.pages.map((image, index) => <img key={index} className="pdf-native-page" src={image.src} width={image.width} height={image.height} alt="" />) : <p>The printable document is not ready. Return to VerseNest and wait for the PDF preview before printing.</p>}
      </div>
    </div>
  );
}
