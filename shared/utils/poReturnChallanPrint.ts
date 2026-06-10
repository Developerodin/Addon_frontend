/**
 * Client-side renderer for PO Return Challan documents.
 * Uses stored snapshot only — never recomputes from live PO/cone data.
 */

export interface ChallanSnapshotLine {
  lineType?: 'cone' | 'box';
  barcode?: string;
  lotNumber?: string;
  yarnCatalogId?: string;
  yarnName?: string;
  hsnCode?: string;
  boxId?: string;
  coneWeight?: number;
  tearWeight?: number;
  netWeight?: number;
}

export interface ChallanSnapshotSupplier {
  supplierId?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gstNo?: string;
  contactNumber?: string;
  contactPersonName?: string;
  email?: string;
  stateCode?: string;
}

export interface ChallanSnapshotConsignee {
  supplierId?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gstNo?: string;
  contactNumber?: string;
  contactPersonName?: string;
  email?: string;
  stateCode?: string;
}

const ADDON_HOLDINGS = 'ADDON HOLDINGS';

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
 * Swaps supplier/consignee for legacy snapshots where vendor was stored as supplier
 * and consignee was ADDON HOLDINGS.
 */
export const normalizeChallanParties = (
  challan: ChallanSnapshot
): { supplier: ChallanSnapshotSupplier; consignee: ChallanSnapshotConsignee } => {
  const supplier = challan.supplier || {};
  const consignee = challan.consignee || {};
  const consigneeIsAddon =
    (consignee.name || '').trim().toUpperCase() === ADDON_HOLDINGS;
  const supplierIsNotAddon =
    (supplier.name || '').trim().toUpperCase() !== ADDON_HOLDINGS;

  if (consigneeIsAddon && supplierIsNotAddon) {
    return {
      supplier: {
        name: consignee.name,
        address: consignee.address,
        gstNo: consignee.gstNo,
        contactNumber: consignee.contactNumber,
      },
      consignee: {
        supplierId: supplier.supplierId,
        name: supplier.name,
        address: supplier.address,
        city: supplier.city,
        state: supplier.state,
        pincode: supplier.pincode,
        country: supplier.country,
        gstNo: supplier.gstNo,
        contactNumber: supplier.contactNumber,
        contactPersonName: supplier.contactPersonName,
        email: supplier.email,
        stateCode: supplier.stateCode,
      },
    };
  }

  return { supplier, consignee };
};

export interface ChallanSnapshotTransport {
  vehicleNo?: string;
  driverName?: string;
  dispatchDate?: string | Date | null;
  transportNotes?: string;
}

export interface ChallanSnapshotTotals {
  boxCount?: number;
  coneCount?: number;
  totalNetWeight?: number;
  totalGrossWeight?: number;
}

export interface ChallanSnapshot {
  challanNumber: string;
  challanDate: string | Date;
  poNumber: string;
  poDate?: string | Date | null;
  supplier?: ChallanSnapshotSupplier;
  consignee?: ChallanSnapshotConsignee;
  lines: ChallanSnapshotLine[];
  totals?: ChallanSnapshotTotals;
  cancellationIntent?: string;
  remark?: string;
  transport?: ChallanSnapshotTransport;
  createdBy?: { username?: string; email?: string };
}

const TEMPLATE_PATH = '/templates/po-return-challan.html';

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
 * Formats a number with fixed decimals.
 */
const formatKg = (value?: number, digits = 3): string =>
  Number(value ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

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
 * Builds cone line rows for the challan table.
 */
const buildLinesHtml = (lines: ChallanSnapshotLine[]): string =>
  (lines || [])
    .map(
      (line, i) => `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${line.lineType === 'box' ? `BOX ${line.barcode || line.boxId || ''}` : line.barcode || ''}</td>
        <td>${line.lotNumber || ''}</td>
        <td>${line.yarnName || ''}</td>
        <td class="text-center">${line.hsnCode || '—'}</td>
        <td>${line.boxId || ''}</td>
        <td class="text-right">${formatKg(line.coneWeight)}</td>
        <td class="text-right">${formatKg(line.tearWeight)}</td>
        <td class="text-right">${formatKg(line.netWeight)}</td>
      </tr>`
    )
    .join('');

/**
 * Renders challan snapshot into printable HTML.
 */
export const renderChallanHtml = async (challan: ChallanSnapshot): Promise<string> => {
  const response = await fetch(TEMPLATE_PATH);
  if (!response.ok) throw new Error('Failed to load PO return challan template');
  let html = await response.text();

  const { supplier, consignee } = normalizeChallanParties(challan);
  const transport = challan.transport || {};
  const totals = challan.totals || {};

  const supplierAddress = formatPartyAddress(supplier);
  const consigneeAddress = formatPartyAddress(consignee);

  html = setById(html, 'challan-no', challan.challanNumber || '');
  html = setById(html, 'challan-date', formatDate(challan.challanDate));
  html = setById(html, 'po-no', challan.poNumber || '');
  html = setById(html, 'po-date', formatDate(challan.poDate) || '—');
  html = setById(html, 'supplier-name', supplier.name || '—');
  html = setById(html, 'supplier-address', supplierAddress || '—');
  html = setById(html, 'supplier-gst', supplier.gstNo || '—');
  html = setById(html, 'supplier-mob', supplier.contactNumber || '—');
  html = setById(html, 'consignee-name', consignee.name || '—');
  html = setById(html, 'consignee-address', consigneeAddress || '—');
  html = setById(html, 'consignee-gst', consignee.gstNo || '—');
  html = setById(html, 'consignee-mob', consignee.contactNumber || '—');
  html = setById(html, 'cancellation-intent', challan.cancellationIntent || 'partial');
  html = setById(html, 'total-cones', String(totals.coneCount ?? challan.lines?.filter((l) => l.lineType !== 'box').length ?? 0));
  html = setById(
    html,
    'total-boxes',
    String(totals.boxCount ?? challan.lines?.filter((l) => l.lineType === 'box').length ?? 0)
  );
  html = setById(html, 'total-net', formatKg(totals.totalNetWeight));
  html = setById(html, 'total-gross', formatKg(totals.totalGrossWeight));
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

  return html;
};

/**
 * Opens browser print dialog for a challan snapshot.
 */
export const printChallanDocument = async (challan: ChallanSnapshot): Promise<void> => {
  const html = await renderChallanHtml(challan);
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
 * Downloads rendered challan HTML as a file.
 */
export const downloadChallanHtml = async (challan: ChallanSnapshot): Promise<void> => {
  const html = await renderChallanHtml(challan);
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
