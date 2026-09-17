import type { PickListBatchBarcodeLabel } from "@/shared/services/whmsPickListBatchService";
import {
  PRODUCT_LABEL_CUSTOMER_CARE,
  PRODUCT_LABEL_LICENSOR,
  PRODUCT_LABEL_MANUFACTURER,
  PRODUCT_LABEL_SIZE_MM,
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
 * Shared 50×70mm sticker CSS for browser print and QZ Tray HTML.
 * @param pageBreak - Insert page breaks between stickers (browser only)
 * @param typography - Saved Name→USP size/boldness
 */
function productLabelCss(pageBreak: boolean, typography: ProductLabelTypography): string {
  const breaks = pageBreak
    ? `.sticker { page-break-after: always; break-after: page; }
    .sticker:last-child { page-break-after: auto; break-after: auto; }`
    : "";
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${PRODUCT_LABEL_SIZE_MM.width}mm;
      height: ${PRODUCT_LABEL_SIZE_MM.height}mm;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sticker {
      width: ${PRODUCT_LABEL_SIZE_MM.width}mm;
      height: ${PRODUCT_LABEL_SIZE_MM.height}mm;
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
    .barcode svg,
    .barcode img {
      width: 44mm;
      height: 9mm;
      display: block;
      object-fit: fill;
      object-position: top center;
    }
    .ean {
      margin-top: 0.28mm;
      font-size: 2.35mm;
      font-weight: bold;
      letter-spacing: 0;
      word-spacing: 0.35mm;
      line-height: 1;
    }
    .legal {
      flex: 0 0 auto;
      font-size: 1.98mm;
      line-height: 1.24;
      font-weight: normal;
    }
    .legal p { margin: 0 0 0.62mm; }
    .legal p:last-child { margin-bottom: 0.78mm; }
    .legal b { font-weight: bold; }
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
 * Full print document: one 50×70mm page per sticker.
 * @param title - Document title
 * @param stickersHtml - Concatenated sticker markup
 * @param typography - Saved Name→USP type (defaults to last saved)
 */
export function buildProductLabelPrintDocument(
  title: string,
  stickersHtml: string,
  typography: ProductLabelTypography = loadProductLabelTypography(),
): string {
  const { width, height } = PRODUCT_LABEL_SIZE_MM;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escLabelHtml(title)}</title>
  <style>
    @page { size: ${width}mm ${height}mm; margin: 0; }
    ${productLabelCss(true, typography)}
  </style>
</head>
<body>${stickersHtml}</body>
</html>`;
}

/**
 * One 50×70mm HTML document for a single sticker (QZ Tray pixel print).
 * Same CSS as the browser document, without multi-page breaks.
 * @param stickerHtml - Markup from `buildProductStickerHtml`
 * @param typography - Saved Name→USP type (defaults to last saved)
 */
export function buildSingleProductLabelDocument(
  stickerHtml: string,
  typography: ProductLabelTypography = loadProductLabelTypography(),
): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${productLabelCss(false, typography)}</style>
</head>
<body>${stickerHtml}</body>
</html>`;
}
