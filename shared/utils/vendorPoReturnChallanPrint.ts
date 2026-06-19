/**
 * Client-side renderer for Vendor PO Return Challan documents.
 * Uses stored snapshot only — never recomputes from live VPO/box data.
 */

export interface VendorPoReturnChallanSnapshotLine {
  lineType?: 'box' | 'm4' | 'article';
  barcode?: string;
  lotNumber?: string;
  productName?: string;
  vendorCode?: string;
  boxId?: string;
  numberOfUnits?: number;
  m4Quantity?: number;
  articleQuantity?: number;
  vendorProductionFlowId?: string;
}

export interface VendorPoReturnChallanSnapshotBoxItem {
  productName?: string;
  vendorCode?: string;
  quantity?: number;
}

export interface VendorPoReturnChallanSnapshotBox {
  boxNumber?: number;
  boxWeight?: number;
  items?: VendorPoReturnChallanSnapshotBoxItem[];
}

export interface VendorPoReturnChallanSnapshotParty {
  vendorId?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  contactNumber?: string;
  email?: string;
  vendorCode?: string;
}

export interface VendorPoReturnChallanSnapshotTransport {
  vehicleNo?: string;
  driverName?: string;
  dispatchDate?: string | Date | null;
  transportNotes?: string;
}

export interface VendorPoReturnChallanSnapshotTotals {
  boxCount?: number;
  totalUnits?: number;
  m4UnitCount?: number;
  articleQtyCount?: number;
}

export interface VendorPoReturnChallanSnapshot {
  challanNumber: string;
  challanDate: string | Date;
  vpoNumber: string;
  vpoDate?: string | Date | null;
  consignor?: VendorPoReturnChallanSnapshotParty;
  vendor?: VendorPoReturnChallanSnapshotParty;
  lines: VendorPoReturnChallanSnapshotLine[];
  /** Box packing for article-wise returns (serial / weight / packed articles + qty). */
  returnBoxes?: VendorPoReturnChallanSnapshotBox[];
  totals?: VendorPoReturnChallanSnapshotTotals;
  cancellationIntent?: string;
  remark?: string;
  transport?: VendorPoReturnChallanSnapshotTransport;
  createdBy?: { username?: string; email?: string };
}

const TEMPLATE_PATH = '/templates/vendor-po-return-challan.html';

/**
 * Formats a date as DD-MM-YYYY.
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

/**
 * Builds a multi-line address string from party fields.
 */
const formatPartyAddress = (party: {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): string => {
  const location = [party.city, party.state, party.pincode].filter(Boolean).join(', ');
  const parts = [party.address, location].filter(Boolean);
  return parts.join('<br>') || '';
};

/**
 * Builds line rows for the challan table.
 */
const buildLinesHtml = (lines: VendorPoReturnChallanSnapshotLine[]): string =>
  (lines || [])
    .map((line, i) => {
      const typeLabel =
        line.lineType === 'box' ? 'BOX' : line.lineType === 'article' ? 'ARTICLE' : 'M4';
      const ref =
        line.lineType === 'article'
          ? 'Verified qty'
          : line.lineType === 'm4'
            ? 'M4 QTY'
            : line.barcode || line.boxId || '';
      const qty =
        line.lineType === 'article'
          ? String(line.articleQuantity ?? 0)
          : line.lineType === 'm4'
            ? String(line.m4Quantity ?? 0)
            : String(line.numberOfUnits ?? 0);
      return `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${typeLabel}</td>
        <td>${ref}</td>
        <td>${line.lotNumber || ''}</td>
        <td>${line.productName || ''}</td>
        <td>${line.vendorCode || '—'}</td>
        <td class="text-right">${qty}</td>
      </tr>`;
    })
    .join('');

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Builds the box-packing section (article-wise returns): per box, the packed articles, qty and box weight.
 */
const buildBoxesHtml = (boxes: VendorPoReturnChallanSnapshotBox[]): string => {
  if (!boxes || !boxes.length) return '';
  const rows = boxes
    .map((box, bi) => {
      const items = box.items && box.items.length ? box.items : [{}];
      return items
        .map((it, ii) => {
          const boxCell =
            ii === 0
              ? `<td class="text-center" rowspan="${items.length}"><strong>Box ${escapeHtml(
                  box.boxNumber ?? bi + 1
                )}</strong></td>`
              : '';
          const weightCell =
            ii === 0
              ? `<td class="text-right" rowspan="${items.length}">${escapeHtml(box.boxWeight ?? 0)}</td>`
              : '';
          return `<tr>
            ${boxCell}
            <td>${escapeHtml(it.productName || '—')}</td>
            <td>${escapeHtml(it.vendorCode || '—')}</td>
            <td class="text-right">${escapeHtml(it.quantity ?? 0)}</td>
            ${weightCell}
          </tr>`;
        })
        .join('');
    })
    .join('');
  return `
    <div style="margin-top:16px">
      <h3 style="font-size:12px;margin:0 0 6px">Box Packing Details</h3>
      <table style="width:100%;border-collapse:collapse;font-size:11px" border="1" cellpadding="4">
        <thead>
          <tr>
            <th class="text-center">Box No</th>
            <th>Article</th>
            <th>Vendor Code</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Box Weight (KG)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
};

/**
 * Replaces inner HTML of an element by id.
 */
const setById = (html: string, id: string, value: string): string => {
  const re = new RegExp(`id="${id}"[^>]*>[\\s\\S]*?<\\/(div|span|td|p)>`, 'i');
  const tagMatch = html.match(re);
  if (!tagMatch) return html;
  const closingTag = tagMatch[1];
  return html.replace(re, `id="${id}">${value}</${closingTag}>`);
};

/**
 * Renders vendor return challan snapshot into printable HTML.
 */
export const renderVendorPoReturnChallanHtml = async (
  challan: VendorPoReturnChallanSnapshot
): Promise<string> => {
  const response = await fetch(TEMPLATE_PATH);
  if (!response.ok) throw new Error('Failed to load vendor PO return challan template');
  let html = await response.text();

  const consignor = challan.consignor || {};
  const vendor = challan.vendor || {};
  const transport = challan.transport || {};
  const totals = challan.totals || {};

  html = setById(html, 'challan-no', challan.challanNumber || '');
  html = setById(html, 'challan-date', formatDate(challan.challanDate));
  html = setById(html, 'vpo-no', challan.vpoNumber || '');
  html = setById(html, 'vpo-date', formatDate(challan.vpoDate) || '—');
  html = setById(html, 'consignor-name', consignor.name || 'ADDON HOLDINGS PRIVATE LIMITED');
  html = setById(html, 'consignor-address', formatPartyAddress(consignor) || '—');
  html = setById(html, 'consignor-gst', consignor.gstin || '27AAACA8827A1ZZ');
  html = setById(html, 'consignor-mob', consignor.contactNumber || '—');
  html = setById(html, 'vendor-name', vendor.name || '—');
  html = setById(html, 'vendor-address', formatPartyAddress(vendor) || '—');
  html = setById(html, 'vendor-gst', vendor.gstin || '—');
  html = setById(html, 'vendor-mob', vendor.contactNumber || '—');
  html = setById(html, 'cancellation-intent', challan.cancellationIntent || 'partial');
  html = setById(html, 'total-boxes', String(totals.boxCount ?? 0));
  html = setById(html, 'total-units', String(totals.totalUnits ?? 0));
  html = setById(html, 'total-m4', String(totals.m4UnitCount ?? 0));
  html = setById(html, 'total-article-qty', String(totals.articleQtyCount ?? 0));
  html = setById(html, 'remark', challan.remark || '—');
  html = setById(html, 'vehicle-no', transport.vehicleNo || '');
  html = setById(html, 'driver-name', transport.driverName || '');
  html = setById(html, 'dispatch-date', formatDate(transport.dispatchDate));
  html = setById(html, 'transport-notes', transport.transportNotes || '');
  html = setById(html, 'prepared-by', challan.createdBy?.username || challan.createdBy?.email || '');

  html = html.replace(
    /<tbody id="lines-body">[\s\S]*?<\/tbody>/,
    `<tbody id="lines-body">${buildLinesHtml(challan.lines)}</tbody>`
  );

  /** Append the box-packing breakdown (article-wise returns) so the printed challan shows box/weight/qty. */
  const boxesHtml = buildBoxesHtml(challan.returnBoxes || []);
  if (boxesHtml) {
    html = /<\/body>/i.test(html)
      ? html.replace(/<\/body>/i, `${boxesHtml}</body>`)
      : html + boxesHtml;
  }

  return html;
};

/**
 * Opens browser print dialog for a vendor return challan.
 */
export const printVendorPoReturnChallan = async (challan: VendorPoReturnChallanSnapshot): Promise<void> => {
  const html = await renderVendorPoReturnChallanHtml(challan);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Popup blocked. Allow popups to print the challan.');
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 500);
  };
};

/**
 * Downloads rendered vendor return challan HTML as a file.
 */
export const downloadVendorPoReturnChallanHtml = async (
  challan: VendorPoReturnChallanSnapshot
): Promise<void> => {
  const html = await renderVendorPoReturnChallanHtml(challan);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${challan.challanNumber}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
