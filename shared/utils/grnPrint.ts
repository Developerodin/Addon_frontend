/**
 * Client-side renderer for the Yarn GRN document.
 *
 * Takes a server-issued `YarnGrnSnapshot` (or a freshly built one for the
 * legacy in-page Print Summary flow) and renders it into the existing
 * `/templates/goods-received-note.html` HTML template by replacing the
 * known placeholder element ids.
 *
 * IMPORTANT: this util NEVER recomputes totals from a live PO. The whole
 * point of storing snapshots server-side is that reprints stay byte-stable
 * regardless of later PO edits — keep all math out of this file.
 */

export interface GrnSnapshotItem {
  yarnName?: string;
  sizeCount?: string;
  shadeCode?: string;
  quantity: number;
  rate: number;
  amount: number;
  gstRate?: number;
  unit?: string;
}

export interface GrnSnapshotLot {
  lotNumber: string;
  numberOfCones: number;
  totalWeight: number;
  numberOfBoxes: number;
  voided?: boolean;
}

export interface GrnSnapshotSupplier {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  email?: string;
  contactNumber?: string;
  gstNo?: string;
}

export interface GrnSnapshotConsignee {
  name?: string;
  address?: string;
  stateCode?: string;
  gstNo?: string;
}

export interface GrnSnapshotTotals {
  subTotal: number;
  sgst: number;
  cgst?: number;
  igst: number;
  gst: number;
  grandTotal: number;
  totalQty: number;
  taxLabel: string;
  amountInWords: string;
}

export interface GrnSnapshot {
  grnNumber: string;
  grnDate: string | Date;
  poNumber: string;
  poDate?: string | Date | null;
  vendorInvoiceNo?: string;
  vendorInvoiceDate?: string | Date | null;
  discrepancyDetails?: string;
  notes?: string;
  supplier?: GrnSnapshotSupplier;
  consignee?: GrnSnapshotConsignee;
  lots: GrnSnapshotLot[];
  items: GrnSnapshotItem[];
  totals: GrnSnapshotTotals;
  revisionNo?: number;
}

const TEMPLATE_PATH = '/templates/goods-received-note.html';

/**
 * @param value - any date-ish input
 * @returns DD-MM-YYYY or empty string when the input is unparseable
 */
const formatDate = (value?: string | Date | null): string => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/** Indian-numbering INR formatter with given fraction digits. */
const formatINR = (value: number, fractionDigits = 2): string =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

/**
 * Replace the inner content of an element identified by `id="..."` regardless
 * of whether the element is a `<div>`, `<span>` or `<td>`. The HTML template
 * uses different tags for different fields so we accept any tag name.
 */
const setById = (html: string, id: string, value: string): string => {
  const re = new RegExp(`id="${id}"[^>]*>[\\s\\S]*?<\\/(div|span|td|p)>`, 'i');
  const tagMatch = html.match(re);
  if (!tagMatch) return html;
  const closingTag = tagMatch[1];
  return html.replace(re, `id="${id}">${value}</${closingTag}>`);
};

/** Replace `<tbody id="items-body">…</tbody>` with the supplied row HTML. */
const setItemsBody = (html: string, rowsHtml: string): string =>
  html.replace(
    /<tbody id="items-body">[\s\S]*?<\/tbody>/,
    `<tbody id="items-body">${rowsHtml}</tbody>`
  );

/**
 * Build the items table rows from the snapshot. Mirrors the existing in-page
 * rendering so paper output stays the same.
 */
const buildItemsHtml = (items: GrnSnapshotItem[]): string =>
  items
    .map((item, index) => {
      const yarn = item.yarnName || 'N/A';
      const size = item.sizeCount || '';
      const shade = item.shadeCode || 'N/A';
      const desc = size ? `${yarn} - ${size}` : yarn;
      return `
          <tr>
            <td class="text-center" style="border: 1px solid #000; padding: 4px;">${index + 1}</td>
            <td class="text-center" style="border: 1px solid #000; padding: 4px;">${shade}</td>
            <td style="border: 1px solid #000; padding: 4px;">${desc}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 4px;">${formatINR(item.quantity, 2)}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 4px;">${formatINR(item.rate, 2)}</td>
            <td class="text-center" style="border: 1px solid #000; padding: 4px;">${item.unit || 'KGS'}</td>
            <td class="text-right" style="border: 1px solid #000; padding: 4px;">${formatINR(item.amount, 2)}</td>
          </tr>`;
    })
    .join('');

/**
 * Build the optional "Lots in this GRN" subtable, injected just above the
 * items table. Voided lots are visually crossed out for audit clarity.
 */
const buildLotsBlock = (lots: GrnSnapshotLot[]): string => {
  if (!lots || lots.length === 0) return '';
  const rows = lots
    .map(
      (l, i) => `
            <tr${l.voided ? ' style="text-decoration: line-through; color: #888;"' : ''}>
              <td class="text-center" style="border: 1px solid #000; padding: 3px; width: 30px;">${i + 1}</td>
              <td style="border: 1px solid #000; padding: 3px;">${l.lotNumber}${l.voided ? ' (voided)' : ''}</td>
              <td class="text-right" style="border: 1px solid #000; padding: 3px;">${formatINR(l.numberOfCones, 0)}</td>
              <td class="text-right" style="border: 1px solid #000; padding: 3px;">${formatINR(l.totalWeight, 2)}</td>
              <td class="text-right" style="border: 1px solid #000; padding: 3px;">${formatINR(l.numberOfBoxes, 0)}</td>
            </tr>`
    )
    .join('');
  return `
      <table id="lots-table" style="margin-top: 4px;">
        <thead>
          <tr>
            <th style="background-color:#f8f9fa;">SR</th>
            <th style="background-color:#f8f9fa;">LOT NO</th>
            <th style="background-color:#f8f9fa;">CONES</th>
            <th style="background-color:#f8f9fa;">WEIGHT (kg)</th>
            <th style="background-color:#f8f9fa;">BOXES</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
};

/**
 * Pour a snapshot into the GRN HTML template. Pure string transform — no DOM,
 * no I/O. Caller decides whether to open a print window or save the string.
 */
const renderGrnHtml = async (grn: GrnSnapshot): Promise<string> => {
  const response = await fetch(TEMPLATE_PATH);
  if (!response.ok) throw new Error('Failed to load GRN template');
  let html = await response.text();

  const supplier = grn.supplier || {};
  const consignee = grn.consignee || {};

  const supplierLocation = [supplier.city, supplier.state].filter(Boolean).join(', ');
  const supplierAddressBlock = `${supplier.address || 'N/A'}${supplierLocation ? `<br>${supplierLocation}` : ''}`;

  html = setById(html, 'supplier-name', supplier.name || 'N/A');
  html = html.replace(
    /id="supplier-address"[^>]*>[\s\S]*?<\/div>/i,
    `id="supplier-address">${supplierAddressBlock}</div>`
  );
  html = setById(html, 'supplier-email', supplier.email || 'N/A');
  html = setById(html, 'supplier-mob', supplier.contactNumber || 'N/A');
  html = setById(html, 'supplier-gst', supplier.gstNo || 'N/A');

  html = setById(html, 'consignee-state-code', consignee.stateCode || '27');
  html = setById(html, 'consignee-gst', consignee.gstNo || '27AAACA8827A1ZZ');

  html = setById(html, 'po-no', grn.poNumber || 'N/A');
  html = setById(html, 'po-date', formatDate(grn.poDate) || 'N/A');

  html = setById(html, 'vendor-invoice-no', grn.vendorInvoiceNo || '');
  html = setById(html, 'vendor-invoice-date', formatDate(grn.vendorInvoiceDate));

  html = setById(html, 'grn-no', grn.grnNumber);
  html = setById(html, 'grn-date', formatDate(grn.grnDate));

  // Inject lots subtable just before the items table.
  const lotsBlock = buildLotsBlock(grn.lots || []);
  if (lotsBlock) {
    html = html.replace(
      /<table class="items-table">/,
      `${lotsBlock}\n        <table class="items-table">`
    );
  }

  html = setItemsBody(html, buildItemsHtml(grn.items || []));
  html = setById(html, 'total-qty', formatINR(grn.totals?.totalQty ?? 0, 4));
  html = setById(html, 'total-amount', formatINR(grn.totals?.subTotal ?? 0, 2));

  html = setById(html, 'tax-rate-label', grn.totals?.taxLabel || '');
  html = setById(html, 'taxable-value', formatINR(grn.totals?.subTotal ?? 0, 2));
  html = setById(html, 'sgst-amount', formatINR(grn.totals?.sgst ?? 0, 2));
  html = setById(html, 'igst-amount', formatINR(grn.totals?.igst ?? 0, 2));
  html = setById(html, 'grand-total', formatINR(grn.totals?.grandTotal ?? 0, 2));

  html = setById(html, 'total-in-words', grn.totals?.amountInWords || '');
  html = setById(html, 'narration', grn.notes || 'N/A');

  html = setById(html, 'discrepancy-details', grn.discrepancyDetails || '');

  // Header revision badge so superseded prints are obviously not the latest.
  if (grn.revisionNo && grn.revisionNo > 0) {
    html = html.replace(
      /<div class="header-title" id="page-title">[\s\S]*?<\/div>/,
      `<div class="header-title" id="page-title">GOODS RECEIPT NOTE — REVISION ${grn.revisionNo}</div>`
    );
  }

  return html;
};

/**
 * Open a new browser tab pre-loaded with the GRN HTML and trigger the native
 * print dialog. Users can use "Save as PDF" from the browser print dialog
 * to obtain a PDF copy without us bundling a heavy PDF library.
 *
 * @param grn - server-issued snapshot (or freshly built equivalent)
 * @throws when the popup is blocked or the template cannot be loaded
 */
export const printGrnDocument = async (grn: GrnSnapshot): Promise<void> => {
  const html = await renderGrnHtml(grn);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Popup blocked. Allow popups to print the GRN.');
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 500);
  };
};

/**
 * Download the rendered GRN HTML as a standalone .html file. Useful when the
 * user wants a portable archive copy that is self-contained (CSS inlined in
 * the template) and can be re-opened later for printing.
 *
 * For a real PDF, the user can choose "Save as PDF" from the print dialog
 * opened by `printGrnDocument`. We deliberately avoid bundling a PDF lib
 * here to keep the route bundle small.
 *
 * @param grn - server-issued snapshot
 */
export const downloadGrnHtml = async (grn: GrnSnapshot): Promise<void> => {
  const html = await renderGrnHtml(grn);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${grn.grnNumber}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Convenience wrapper — alias of {@link printGrnDocument} that reads better at
 * call sites where the user clicked an explicit "Download PDF" button. The
 * print dialog exposes "Save as PDF" cross-browser, so functionally identical.
 */
export const downloadGrnPdf = printGrnDocument;
