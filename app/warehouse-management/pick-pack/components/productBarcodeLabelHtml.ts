import type { PickListBatchBarcodeLabel } from "@/shared/services/whmsPickListBatchService";
import {
  PRODUCT_LABEL_COLUMN_GAP_MM,
  PRODUCT_LABEL_COLUMNS,
  PRODUCT_LABEL_CUSTOMER_CARE,
  PRODUCT_LABEL_LICENSOR,
  PRODUCT_LABEL_MANUFACTURER,
  PRODUCT_LABEL_SIZE_MM,
  productLabelSheetWidthMm,
} from "./productBarcodeLabelConstants";
import {
  loadProductLabelTypography,
  productLabelDetailsCss,
  type ProductLabelTypography,
} from "./productBarcodeLabelSettings";
import {
  formatLabelRupees,
  formatManufactureMonthYear,
  formatPackToNetQuantity,
  formatSizeLine,
} from "./socksFootLength";

/**
 * Escape text for embedding in print HTML.
 * @param value - Raw string
 */
export function escLabelHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Human-readable EAN as three groups (`8 904442 944163`), no per-digit tracking.
 * QZ JavaFX letter-spacing spreads every character, so grouping is HTML only.
 * @param caption - Digits or already-grouped caption
 */
function eanCaptionHtml(caption: string): string {
  const digits = String(caption || "").replace(/\D/g, "");
  if (digits.length === 13) {
    return `${escLabelHtml(digits[0])}&nbsp;${escLabelHtml(digits.slice(1, 7))}&nbsp;${escLabelHtml(digits.slice(7))}`;
  }
  return escLabelHtml(caption);
}

/**
 * Shared sticker CSS for browser print and QZ Tray HTML.
 * A printed row is two 50×70mm labels side by side, so the other column is not blank.
 * @param pageBreak - Insert page breaks between rows (browser only)
 * @param lockPage - Fix the document to one row (QZ Tray). Browser print stays multi-page.
 * @param typography - Saved Name→USP size/boldness
 */
function productLabelCss(
  pageBreak: boolean,
  lockPage: boolean,
  typography: ProductLabelTypography,
): string {
  const { width, height } = PRODUCT_LABEL_SIZE_MM;
  const sheetWidth = productLabelSheetWidthMm();
  const secondColumnLeft = width + PRODUCT_LABEL_COLUMN_GAP_MM;
  const breaks = pageBreak
  ? `.sheet:not(:last-child) {
      page-break-after: always;
      break-after: page;
    }
    .sheet { page-break-inside: avoid; break-inside: avoid; }`
    : "";
  const pageLock = lockPage
    ? `height: ${height}mm; overflow: hidden;`
    : "";
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html {
      width: ${sheetWidth}mm;
      margin: 0 !important;
      padding: 0 !important;
    }
    body {
      width: ${sheetWidth}mm;
      ${pageLock}
      margin: 0 !important;
      padding: 0 !important;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      position: relative;
      width: ${sheetWidth}mm;
      height: ${height}mm;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sticker {
      position: absolute;
      top: 0;
      width: ${width}mm;
      height: ${height}mm;
      padding: 0.55mm 2.1mm 1.1mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      overflow: hidden;
    }
    .sticker:nth-child(1) { left: 0; }
    .sticker:nth-child(2) { left: ${secondColumnLeft}mm; }
    ${breaks}
    .barcode {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0 0 0.7mm;
    }
    .details {
      flex: 0 0 auto;
    }
    .details div { margin: 0 0 0.06mm; }
    ${productLabelDetailsCss(typography)}
  `;
}

/**
 * Build one 50×70mm statutory MRP sticker.
 * @param label - Catalogue-enriched barcode payload
 * @param barcodeSvg - JsBarcode SVG markup (bars only)
 * @param barcodeCaption - Centered human-readable code
 */
export function buildProductStickerHtml(
  label: PickListBatchBarcodeLabel,
  barcodeSvg: string,
  barcodeCaption = "",
): string {
  const productName = escLabelHtml(label.productName || "—");
  const netQty = escLabelHtml(
    label.netQuantity || formatPackToNetQuantity(label.pack, label.pairCount),
  );
  const sizeLine = escLabelHtml(formatSizeLine(label.footLength, label.size));
  const mfg = formatManufactureMonthYear();
  const colour = String(label.shade || label.colour || "").trim();
  const styleLine = escLabelHtml([label.styleCode, colour].filter(Boolean).join(" "));
  const mrp = formatLabelRupees(label.mrp);
  const m = PRODUCT_LABEL_MANUFACTURER;
  const c = PRODUCT_LABEL_CUSTOMER_CARE;
  const l = PRODUCT_LABEL_LICENSOR;

  return `<div class="sticker">
    <div class="barcode">
      ${barcodeSvg}
      <div class="ean">${eanCaptionHtml(barcodeCaption)}</div>
    </div>
    <div class="legal">
      <p><b>${escLabelHtml(m.heading)}</b><br />
      <b>${escLabelHtml(m.name)}</b><br />
      ${escLabelHtml(m.address)}</p>
      <p>${escLabelHtml(c.intro)}<br />
      Email: ${escLabelHtml(c.email)}<br />
      Phone: ${escLabelHtml(c.phone)}</p>
      <p>${escLabelHtml(l.heading)}<br />
      <b>${escLabelHtml(l.name)}</b><br />
      ${escLabelHtml(l.address)}</p>
    </div>
    <div class="details">
      <div class="line-name">Name Of Product: ${productName}</div>
      <div class="line-net">Net Quantity: ${netQty}</div>
      <div class="line-size">Size: ${sizeLine}</div>
      <div class="line-mfg">Month &amp; Year of Manufacture -&nbsp;${escLabelHtml(mfg)}</div>
      <div class="line-style">STYLE: ${styleLine}</div>
      <div class="line-mrp">MRP: Rs.${escLabelHtml(mrp)}&nbsp;(Inclusive Of All Taxes)</div>
      <div class="line-usp">USP: Rs.&nbsp;${escLabelHtml(mrp)}&nbsp;per pair</div>
    </div>
  </div>`;
}

/**
 * Group sticker markup into printed rows. Each row holds one label per column.
 * @param stickers - One fragment per physical sticker, in print order
 */
export function chunkProductLabelSheets(stickers: string[]): string[][] {
  const sheets: string[][] = [];
  for (let i = 0; i < stickers.length; i += PRODUCT_LABEL_COLUMNS) {
    sheets.push(stickers.slice(i, i + PRODUCT_LABEL_COLUMNS));
  }
  return sheets;
}

/**
 * One printed row: stickers side by side, left column first.
 * @param stickers - One or two sticker fragments
 */
export function buildProductLabelSheetHtml(stickers: string[]): string {
  return `<div class="sheet">${stickers.join("")}</div>`;
}

/**
 * Full print document: one row per page, both columns filled before the next row.
 * @param title - Document title
 * @param stickers - One fragment per physical sticker
 * @param typography - Saved Name→USP type (defaults to last saved)
 */
export function buildProductLabelPrintDocument(
  title: string,
  stickers: string[],
  typography: ProductLabelTypography = loadProductLabelTypography(),
): string {
  const sheetWidth = productLabelSheetWidthMm();
  const { height } = PRODUCT_LABEL_SIZE_MM;
  const sheets = chunkProductLabelSheets(stickers).map(buildProductLabelSheetHtml).join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escLabelHtml(title)}</title>
  <style>
    @page { size: ${sheetWidth}mm ${height}mm; margin: 0; }
    ${productLabelCss(true, false, typography)}
  </style>
</head>
<body>${sheets}</body>
</html>`;
}

/**
 * One HTML document for a single printed row (QZ Tray pixel print).
 * Same CSS as the browser document, without a page break.
 * @param stickers - One or two sticker fragments for this row
 * @param typography - Saved Name→USP type (defaults to last saved)
 */
export function buildProductLabelSheetDocument(
  stickers: string[],
  typography: ProductLabelTypography = loadProductLabelTypography(),
): string {
  const sheetWidth = productLabelSheetWidthMm();
  const { height } = PRODUCT_LABEL_SIZE_MM;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${sheetWidth}mm ${height}mm; margin: 0; }
    ${productLabelCss(false, true, typography)}
  </style>
</head>
<body>${buildProductLabelSheetHtml(stickers)}</body>
</html>`;
}
