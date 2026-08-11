/**
 * Client-side renderer for Vendor PO GRN documents.
 * Uses the stored snapshot only — never recomputes from live VPO/flow data.
 */

import { ADDON_COMPANY } from '@/shared/constants/addonCompany';
import type { VendorGrn } from '@/shared/services/vendorGrnService';

const TEMPLATE_PATH = '/templates/vendor-goods-received-note.html';

/**
 * Formats a date as DD-MM-YYYY.
 * @param value - date-ish input
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

/** Escapes HTML special characters for safe template injection. */
const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Replace inner content of an element by id regardless of tag type.
 * @param html - template HTML
 * @param id - element id
 * @param value - replacement inner HTML/text
 */
const setById = (html: string, id: string, value: string): string => {
  const re = new RegExp(`id="${id}"[^>]*>[\\s\\S]*?<\\/(div|span|td|p)>`, 'i');
  const tagMatch = html.match(re);
  if (!tagMatch) return html;
  const closingTag = tagMatch[1];
  return html.replace(re, `id="${id}">${value}</${closingTag}>`);
};

/**
 * Builds vendor address block from snapshot vendor fields.
 * @param vendor - vendor snapshot on GRN
 */
const formatVendorAddress = (vendor: VendorGrn['vendor']): string => {
  const location = [vendor?.city, vendor?.state, vendor?.pincode].filter(Boolean).join(', ');
  const parts = [vendor?.address, location].filter(Boolean);
  return parts.map((p) => escapeHtml(p)).join('<br>') || '—';
};

/**
 * Builds line-item rows for the GRN items table.
 * @param grn - vendor GRN snapshot
 */
const buildLineItemsHtml = (grn: VendorGrn): string => {
  let sr = 0;
  const rows: string[] = [];
  (grn.lots || []).forEach((lot) => {
    (lot.items || []).forEach((item) => {
      sr += 1;
      rows.push(`
        <tr>
          <td class="text-center">${sr}</td>
          <td>${escapeHtml(lot.lotNumber)}</td>
          <td>${escapeHtml(item.productName || '—')}</td>
          <td>${escapeHtml(item.vendorCode || '—')}</td>
          <td class="text-right">${escapeHtml(item.expectedQty ?? 0)}</td>
          <td class="text-right">${escapeHtml(item.verifiedQty ?? 0)}</td>
          <td class="text-right">${escapeHtml(item.m1 ?? 0)}</td>
          <td class="text-right">${escapeHtml(item.m2 ?? 0)}</td>
          <td class="text-right">${escapeHtml(item.m3 ?? 0)}</td>
          <td class="text-right">${escapeHtml(item.m4 ?? 0)}</td>
          <td class="text-right">${escapeHtml(item.varianceQty ?? 0)}</td>
        </tr>`);
    });
  });
  return rows.join('');
};

/**
 * Renders a vendor GRN snapshot into printable HTML.
 * @param grn - server-issued vendor GRN snapshot
 */
export const renderVendorGrnHtml = async (grn: VendorGrn): Promise<string> => {
  const response = await fetch(TEMPLATE_PATH);
  if (!response.ok) throw new Error('Failed to load vendor GRN template');
  let html = await response.text();

  const vendor = grn.vendor || {};
  const totals = grn.totals || {
    expected: 0,
    verified: 0,
    variance: 0,
    m1: 0,
    m2: 0,
    m3: 0,
    m4: 0,
  };

  html = setById(html, 'consignee-name', ADDON_COMPANY.name);
  html = setById(html, 'consignee-address', ADDON_COMPANY.address);
  html = setById(html, 'consignee-head-office', ADDON_COMPANY.headOffice);
  html = setById(html, 'consignee-contact', ADDON_COMPANY.contactNumber);
  html = setById(html, 'consignee-gst', ADDON_COMPANY.gstNo);
  html = setById(html, 'consignee-state-code', ADDON_COMPANY.stateCode);
  html = setById(html, 'consignee-email', ADDON_COMPANY.email);
  html = setById(html, 'signatory-company-name', ADDON_COMPANY.name);

  html = setById(html, 'vendor-name', escapeHtml(vendor.vendorName || '—'));
  html = html.replace(
    /id="vendor-address"[^>]*>[\s\S]*?<\/div>/i,
    `id="vendor-address">${formatVendorAddress(vendor)}</div>`
  );
  html = setById(html, 'vendor-code', escapeHtml(vendor.vendorCode || '—'));
  html = setById(html, 'vendor-gst', escapeHtml(vendor.gstin || '—'));

  html = setById(html, 'vpo-number', escapeHtml(grn.vpoNumber || '—'));
  html = setById(html, 'vpo-date', formatDate(grn.vpoDate) || '—');
  html = setById(html, 'grn-number', escapeHtml(grn.grnNumber));
  html = setById(html, 'grn-date', formatDate(grn.grnDate));

  if (grn.revisionNo && grn.revisionNo > 0) {
    html = html.replace(
      /<div class="header-title" id="page-title">[\s\S]*?<\/div>/,
      `<div class="header-title" id="page-title">VENDOR GOODS RECEIPT NOTE — REVISION ${grn.revisionNo}</div>`
    );
  }

  html = html.replace(
    /<tbody id="line-items">[\s\S]*?<\/tbody>/,
    `<tbody id="line-items">${buildLineItemsHtml(grn)}</tbody>`
  );

  html = setById(html, 'total-expected', escapeHtml(totals.expected ?? 0));
  html = setById(html, 'total-verified', escapeHtml(totals.verified ?? 0));
  html = setById(html, 'total-m1', escapeHtml(totals.m1 ?? 0));
  html = setById(html, 'total-m2', escapeHtml(totals.m2 ?? 0));
  html = setById(html, 'total-m3', escapeHtml(totals.m3 ?? 0));
  html = setById(html, 'total-m4', escapeHtml(totals.m4 ?? 0));
  html = setById(html, 'total-variance', escapeHtml(totals.variance ?? 0));

  const discrepancy = (grn.discrepancyDetails || '').trim();
  if (discrepancy) {
    html = html.replace(
      /id="discrepancy-block" style="display: none;[^"]*"/,
      'id="discrepancy-block" style="display: block; margin-bottom: 6px;"'
    );
    html = setById(html, 'discrepancy-details', escapeHtml(discrepancy));
  }

  html = setById(html, 'notes', escapeHtml(grn.notes?.trim() || '—'));

  return html;
};

/**
 * Opens a new browser tab with the vendor GRN form and triggers print.
 * @param grn - server-issued vendor GRN snapshot
 */
export const printVendorGrnDocument = async (grn: VendorGrn): Promise<void> => {
  const html = await renderVendorGrnHtml(grn);
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
 * Downloads the rendered vendor GRN HTML as a standalone file.
 * @param grn - server-issued vendor GRN snapshot
 */
export const downloadVendorGrnHtml = async (grn: VendorGrn): Promise<void> => {
  const html = await renderVendorGrnHtml(grn);
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
