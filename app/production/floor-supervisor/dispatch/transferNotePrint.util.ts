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

/**
 * Fetches the HTML template and fills placeholders for a transfer note.
 * @param note - Transfer note to render
 */
export async function buildTransferNoteHtml(note: DispatchTransferNote): Promise<string> {
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
    .replaceAll('{{CATEGORY_LABEL}}', categoryLabel);

  return htmlTemplate;
}

/**
 * Opens a new window and triggers browser print for a transfer note.
 * @param note - Transfer note document
 */
export async function printDispatchTransferNote(note: DispatchTransferNote): Promise<void> {
  const htmlTemplate = await buildTransferNoteHtml(note);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow popups to print the transfer note');
  }
  printWindow.document.write(htmlTemplate);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}
