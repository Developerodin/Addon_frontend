import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { WarehouseClient } from '@/shared/services/whmsWarehouseClientService';

const TEMPLATE_FILENAME = 'store-orders-template.xlsx';
const BLANK_STYLE_ROWS = 20;
const STYLE_COL = 0;
const PAIR_COL = 1;
/** Bill, SAP, retek, and addon order id labels sit in the pair-type column, above the header. */
const LABEL_COL = PAIR_COL;

const SAMPLE_STORES = [
  { bill: 'EXAMPLE-3503', sap: 'EXAMPLE-53503', retek: 'EXAMPLE-53503', addon: 'ADDON-1001' },
  { bill: 'EXAMPLE-3504', sap: 'EXAMPLE-53504', retek: 'EXAMPLE-53504', addon: 'ADDON-1002' },
  { bill: 'EXAMPLE-3506', sap: 'EXAMPLE-53506', retek: 'EXAMPLE-53506', addon: 'ADDON-1003' },
] as const;

const SAMPLE_STYLE_ROWS = [
  { styleCode: 'EXAMPLE-STYLE-001', pairType: 'single', qty: [3, 5, 2] },
  { styleCode: 'EXAMPLE-STYLE-002', pairType: 'single', qty: [1, 2, 1] },
  { styleCode: 'EXAMPLE-PAIR-001', pairType: 'multi', qty: [2, 2, 1] },
] as const;

/**
 * Sort store clients by bill code so template columns follow the pickup sheet.
 * @param stores - Store clients
 */
function sortStores(stores: WarehouseClient[]): WarehouseClient[] {
  return [...stores].sort((a, b) => {
    const left = a.storeProfile?.billCode?.trim() || '';
    const right = b.storeProfile?.billCode?.trim() || '';
    return left.localeCompare(right, undefined, { numeric: true });
  });
}

/**
 * One example style row. Quantities land on the example store columns.
 * @param width - Full row width including store columns
 * @param storeCount - Number of example store columns that receive a quantity
 * @param sample - Style, pair type, and sample refill quantities
 */
function sampleStyleRow(
  width: number,
  storeCount: number,
  sample: (typeof SAMPLE_STYLE_ROWS)[number],
): unknown[] {
  const row = Array<unknown>(width).fill(null);
  row[STYLE_COL] = sample.styleCode;
  row[PAIR_COL] = sample.pairType;
  sample.qty.forEach((qty, index) => {
    if (index < storeCount) row[LABEL_COL + 1 + index] = qty;
  });
  return row;
}

/**
 * Append the 3 example store columns, then one column per real store.
 * @param row - Sheet row that already has the label cells
 * @param exampleValues - One value per example store
 * @param storeValues - One value per active store
 */
function appendStoreColumns(row: unknown[], exampleValues: readonly unknown[], storeValues: unknown[]): void {
  exampleValues.forEach((value) => row.push(value));
  storeValues.forEach((value) => row.push(value));
}

/**
 * Download the store pickup grid. The first three store columns and style rows are samples.
 * @param stores - Active store clients, placed after the sample columns
 */
export function downloadStoreOrderTemplate(stores: WarehouseClient[]): void {
  const ordered = sortStores(stores);
  const title = ordered.length ? `${ordered.length} SC STORES` : 'STORE PICKUP';
  const today = new Date();
  const sheetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const lead = () => Array<unknown>(LABEL_COL + 1).fill(null);
  const emptyStoreCells = ordered.map(() => null);

  const rowTitle = lead();
  rowTitle[STYLE_COL] = title;
  appendStoreColumns(rowTitle, [1, 2, 3], ordered.map((_, index) => SAMPLE_STORES.length + index + 1));

  const rowDate = lead();
  rowDate[STYLE_COL] = sheetDate;

  const rowBill = lead();
  rowBill[LABEL_COL] = 'BILLED CODE';
  appendStoreColumns(
    rowBill,
    SAMPLE_STORES.map((store) => store.bill),
    ordered.map((store) => store.storeProfile?.billCode?.trim() || ''),
  );

  const rowSap = lead();
  rowSap[LABEL_COL] = 'SAP CODE';
  appendStoreColumns(
    rowSap,
    SAMPLE_STORES.map((store) => store.sap),
    ordered.map((store) => store.storeProfile?.sapCode?.trim() || ''),
  );

  const rowRetek = lead();
  rowRetek[LABEL_COL] = 'RETEK CODE';
  appendStoreColumns(
    rowRetek,
    SAMPLE_STORES.map((store) => store.retek),
    ordered.map((store) => store.storeProfile?.retekCode?.trim() || ''),
  );

  const rowAddon = lead();
  rowAddon[LABEL_COL] = 'ADDON ORDER ID';
  appendStoreColumns(rowAddon, SAMPLE_STORES.map((store) => store.addon), emptyStoreCells);

  const header = Array<unknown>(LABEL_COL + 1).fill(null);
  header[STYLE_COL] = 'STE CODE NEW';
  header[PAIR_COL] = 'PAIR TYPE';
  appendStoreColumns(header, SAMPLE_STORES.map(() => 'REFILL'), ordered.map(() => 'REFILL'));

  const samples = SAMPLE_STYLE_ROWS.map((sample) => sampleStyleRow(header.length, SAMPLE_STORES.length, sample));
  const blanks = Array.from({ length: BLANK_STYLE_ROWS }, () => Array<unknown>(header.length).fill(null));
  const aoa = [rowTitle, rowDate, rowBill, rowSap, rowRetek, rowAddon, header, ...samples, ...blanks];

  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet['!cols'] = header.map((_, index) => ({ wch: index === STYLE_COL ? 20 : 16 }));
  XLSX.utils.book_append_sheet(wb, sheet, 'PICK UP SHEET');

  const instructions = [
    { Field: 'Samples', Description: 'The first 3 store columns and the first 3 style rows are examples. Replace EXAMPLE- bill, SAP, retek, addon ids, and style codes before import.' },
    { Field: 'Date', Description: 'Row 2, STE CODE NEW column. DD/MM/YYYY. Used as the order date for every store. Blank uses today.' },
    { Field: 'BILLED CODE / SAP CODE / RETEK CODE', Description: 'One column per store. Example columns show the shape. A column with no quantity is skipped.' },
    { Field: 'ADDON ORDER ID', Description: 'Optional. One id per store column. Must be unique. Leave blank if you do not have one.' },
    { Field: 'STE CODE NEW', Description: 'Style code on each item row. Pack, EAN, colour, and pattern come from the catalogue.' },
    { Field: 'PAIR TYPE', Description: 'single or multi. Blank means single. Multi uses the pair style code.' },
    { Field: 'REFILL', Description: 'Whole-number quantity for that store. Blank or 0 creates no line.' },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instructions), 'Instructions');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), TEMPLATE_FILENAME);
}
