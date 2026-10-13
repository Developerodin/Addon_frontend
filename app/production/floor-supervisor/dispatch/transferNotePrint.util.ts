import type { DispatchTransferNote } from './transferNoteService';

/**
 * Escapes HTML special characters for safe template injection.
 * @param value - Raw string
 */
export function escapeTransferNoteHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Formats STN date for the print template header.
 * @param dateInput - ISO date string or Date
 */
export function formatStnPrintDate(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Brand label for a transfer note line (prefers `brand`, legacy `sapArticleNo` fallback).
 * @param line - Transfer note line
 */
export function formatTransferNoteLineBrand(line: {
  brand?: string;
  sapArticleNo?: string;
}): string {
  const brand = String(line.brand ?? line.sapArticleNo ?? '').trim();
  return brand || '—';
}

/**
 * Builds article table rows HTML for the stock transfer note template.
 * @param note - Transfer note document
 * @param escapeHtml - HTML escaper (defaults to {@link escapeTransferNoteHtml})
 */
export function buildTransferNoteRowsHtml(
  note: DispatchTransferNote,
  escapeHtml: (v: string) => string = escapeTransferNoteHtml
): string {
  const lines = note.lines ?? [];

  if (!lines.length) {
    return `
      <tr>
        <td colspan="4">No rows available for print.</td>
      </tr>`;
  }

  return lines
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.articleNumber || '—')}</td>
        <td class="text-left">${escapeHtml(formatTransferNoteLineBrand(row))}</td>
        <td class="text-left">${escapeHtml(row.articleName || '—')}</td>
        <td>${row.qtyInPairs}</td>
      </tr>`
    )
    .join('');
}

/** Optional reprint flag for a second print of an existing note. */
export interface TransferNotePrintOptions {
  reprint?: boolean;
}

/**
 * Banner shown only when reprinting a note that was already printed.
 * @param note - Original transfer note
 * @param reprint - When false, the template placeholder is cleared
 */
export function buildReprintBannerHtml(
  note: DispatchTransferNote,
  reprint = false
): string {
  if (!reprint) return '';
  const date = formatStnPrintDate(note.stnDate || new Date());
  const serial = escapeTransferNoteHtml(note.stnSerial || '');
  return `<div style="text-align:center;padding:6px 8px;font-weight:bold;font-size:12px;letter-spacing:0.2px;background:#fff3cd;border-bottom:2px solid #000;">REPRINT — originally printed on ${date} as ${serial}</div>`;
}

/**
 * Label for a print-list row that is already on an active note.
 * @param stnSerial - Original note serial
 * @param stnDate - Original note date
 */
export function formatAlreadyPrintedLabel(stnSerial: string, stnDate: string): string {
  return `Already printed on ${stnSerial} · ${formatStnPrintDate(stnDate)}`;
}

/**
 * Fetches the HTML template and fills placeholders for a transfer note.
 * @param note - Transfer note to render
 * @param options - Set `reprint` to stamp the original serial and date
 */
export async function buildTransferNoteHtml(
  note: DispatchTransferNote,
  options: TransferNotePrintOptions = {}
): Promise<string> {
  const response = await fetch(`/templates/stock-transfer-note.html?v=${Date.now()}`, {
    cache: 'no-store',
  });
  let htmlTemplate = await response.text();

  const rowsHtml = buildTransferNoteRowsHtml(note);
  const printDate = formatStnPrintDate(note.stnDate || new Date());
  const categoryLabel = escapeTransferNoteHtml(
    (note.categoryLabel || 'CORE & COLLECTION MIX').trim() || 'CORE & COLLECTION MIX'
  );

  htmlTemplate = htmlTemplate
    .replaceAll('{{STN_DATE}}', printDate)
    .replaceAll('{{STN_SERIAL}}', escapeTransferNoteHtml(note.stnSerial || ''))
    .replaceAll('{{TOTAL_BOXES}}', String(note.totalBoxes ?? 0))
    .replaceAll('{{ARTICLE_ROWS}}', rowsHtml)
    .replaceAll('{{TOTAL_QTY}}', String(note.totalQty ?? 0))
    .replaceAll('{{CATEGORY_LABEL}}', categoryLabel)
    .replaceAll('{{REPRINT_BANNER}}', buildReprintBannerHtml(note, Boolean(options.reprint)));

  return htmlTemplate;
}

/**
 * Writes HTML into a new window and opens the browser print dialog.
 * @param html - Full document markup
 */
function openTransferNotePrintWindow(html: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow popups to print the transfer note');
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

/**
 * Pulls the body markup out of a filled template so several notes can share one print job.
 * @param html - Full HTML document
 */
function extractTransferNoteBody(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1] : html;
}

/**
 * Stacks filled notes into one document. Later notes start on a new page.
 * @param documents - Filled stock-transfer-note HTML documents, new note first
 */
export function stitchTransferNoteDocuments(documents: string[]): string {
  if (!documents.length) return '';
  const pages = documents
    .map((html, index) => {
      const body = extractTransferNoteBody(html);
      const breakStyle = index === 0 ? '' : 'page-break-before:always;break-before:page;';
      return `<div style="${breakStyle}">${body}</div>`;
    })
    .join('');
  return documents[0].replace(/<body[^>]*>[\s\S]*<\/body>/i, `<body>${pages}</body>`);
}

/**
 * Opens a new window and triggers browser print for a transfer note.
 * @param note - Transfer note document
 * @param options - Pass `{ reprint: true }` to add the reprint banner
 */
export async function printDispatchTransferNote(
  note: DispatchTransferNote,
  options: TransferNotePrintOptions = {}
): Promise<void> {
  const htmlTemplate = await buildTransferNoteHtml(note, options);
  openTransferNotePrintWindow(htmlTemplate);
}

/**
 * Prints a new note first, then each selected original note with a reprint banner.
 * Uses one print window so the browser does not block the later notes.
 * @param jobs - Notes in print order
 */
export async function printDispatchTransferNoteBatch(
  jobs: Array<{ note: DispatchTransferNote; reprint?: boolean }>
): Promise<void> {
  if (!jobs.length) return;
  const documents: string[] = [];
  for (const job of jobs) {
    documents.push(await buildTransferNoteHtml(job.note, { reprint: Boolean(job.reprint) }));
  }
  openTransferNotePrintWindow(stitchTransferNoteDocuments(documents));
}
