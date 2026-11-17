import type { PickListBatchBarcodeLabel } from "@/shared/services/whmsPickListBatchService";
import {
  PRODUCT_LABEL_CUSTOMER_CARE,
  PRODUCT_LABEL_LICENSOR,
  PRODUCT_LABEL_MANUFACTURER,
} from "./productBarcodeLabelConstants";
import {
  loadProductLabelLayout,
  productLabelRollPageSizeMm,
  productLabelStickerLeftMm,
  type ProductLabelLayout,
} from "./productBarcodeLabelLayoutSettings";
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
 * @param pageBreak - Insert page breaks between rows (browser only)
 * @param lockPage - Fix the document to one row (QZ Tray). Browser print stays multi-page.
 * @param typography - Saved Name→USP size/boldness
 * @param layout - Roll and column layout
 */
function productLabelCss(
  pageBreak: boolean,
  lockPage: boolean,
  typography: ProductLabelTypography,
  layout: ProductLabelLayout,
): string {
  const { widthMm: pageW, heightMm: pageH } = productLabelRollPageSizeMm(layout);
  const w = layout.stickerWidthMm;
  const h = layout.stickerHeightMm;
  const breaks = pageBreak
    ? `.sheet:not(:last-child) {
      page-break-after: always;
      break-after: page;
    }
    .sheet { page-break-inside: avoid; break-inside: avoid; }`
    : "";
  const pageLock = lockPage
    ? `height: ${pageH}mm; max-height: ${pageH}mm; overflow: hidden;`
    : "";
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${pageW}mm;
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
      width: ${pageW}mm;
      height: ${pageH}mm;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sticker {
      position: absolute;
      top: 0;
      width: ${w}mm;
      height: ${h}mm;
      padding: 0.55mm 2.1mm 1.1mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      overflow: hidden;
    }
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
 * Place one sticker fragment at its column offset on the roll.
 */
function positionStickerHtml(
  stickerHtml: string,
  layout: ProductLabelLayout,
  columnIndex: number,
): string {
  const left = productLabelStickerLeftMm(layout, columnIndex);
  const top = layout.offsetYMm;
  return stickerHtml.replace(
    '<div class="sticker">',
    `<div class="sticker" style="left:${left}mm;top:${top}mm">`,
  );
}

/**
 * Build one statutory MRP sticker.
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
 * Group sticker markup into printed rows.
 */
export function chunkProductLabelSheets(
  stickers: string[],
  layout: ProductLabelLayout = loadProductLabelLayout(),
): string[][] {
  const cols = layout.columnsPerRow;
  const sheets: string[][] = [];
  for (let i = 0; i < stickers.length; i += cols) {
    sheets.push(stickers.slice(i, i + cols));
  }
  return sheets;
}

/**
 * One printed row with stickers positioned on the roll.
 */
export function buildProductLabelSheetHtml(
  stickers: string[],
  layout: ProductLabelLayout = loadProductLabelLayout(),
): string {
  const positioned = stickers.map((html, i) => positionStickerHtml(html, layout, i));
  return `<div class="sheet">${positioned.join("")}</div>`;
}

/**
 * Full print document: one roll row per page.
 */
export function buildProductLabelPrintDocument(
  title: string,
  stickers: string[],
  typography: ProductLabelTypography = loadProductLabelTypography(),
  layout: ProductLabelLayout = loadProductLabelLayout(),
): string {
  const { widthMm, heightMm } = productLabelRollPageSizeMm(layout);
  const sheets = chunkProductLabelSheets(stickers, layout)
    .map((row) => buildProductLabelSheetHtml(row, layout))
    .join("");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escLabelHtml(title)}</title>
  <style>
    @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
    ${productLabelCss(true, false, typography, layout)}
  </style>
</head>
<body>${sheets}</body>
</html>`;
}

/**
 * One HTML document for a single printed row (QZ Tray).
 */
export function buildProductLabelSheetDocument(
  stickers: string[],
  typography: ProductLabelTypography = loadProductLabelTypography(),
  layout: ProductLabelLayout = loadProductLabelLayout(),
): string {
  const { widthMm, heightMm } = productLabelRollPageSizeMm(layout);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
    ${productLabelCss(false, true, typography, layout)}
  </style>
</head>
<body>${buildProductLabelSheetHtml(stickers, layout)}</body>
</html>`;
}