import type { PickListBatchBarcodeLabel } from "@/shared/services/whmsPickListBatchService";
import {
  PRODUCT_LABEL_CUSTOMER_CARE,
  PRODUCT_LABEL_LICENSOR,
  PRODUCT_LABEL_MANUFACTURER,
  PRODUCT_LABEL_SIZE_MM,
} from "./productBarcodeLabelConstants";
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
      <div class="ean">${escLabelHtml(barcodeCaption)}</div>
    </div>
    <div class="legal">
      <p><span class="h">${escLabelHtml(m.heading)}</span><br />
      <span class="b">${escLabelHtml(m.name)}</span><br />
      ${escLabelHtml(m.address)}</p>
      <p>${escLabelHtml(c.intro)}<br />
      Email: ${escLabelHtml(c.email)}<br />
      Phone: ${escLabelHtml(c.phone)}</p>
      <p><span class="h">${escLabelHtml(l.heading)}</span><br />
      <span class="b">${escLabelHtml(l.name)}</span><br />
      ${escLabelHtml(l.address)}</p>
    </div>
    <div class="details">
      <div><span class="k">Name Of Product:</span> ${productName}</div>
      <div><span class="k">Net Quantity:</span> ${netQty}</div>
      <div><span class="k">Size :</span> ${sizeLine}</div>
      <div><span class="k">Month &amp; Year of Manufacture -</span> ${escLabelHtml(mfg)}</div>
      <div><span class="k">STYLE:</span> ${styleLine}</div>
      <div><span class="k">MRP: Rs.</span>${escLabelHtml(mrp)} <span class="tax">(Inclusive Of All Taxes)</span></div>
      <div><span class="k">USP: Rs.</span> ${escLabelHtml(mrp)} per pair</div>
    </div>
  </div>`;
}

/**
 * Full print document: one 50×70mm page per sticker.
 * @param title - Document title
 * @param stickersHtml - Concatenated sticker markup
 */
export function buildProductLabelPrintDocument(title: string, stickersHtml: string): string {
  const { width, height } = PRODUCT_LABEL_SIZE_MM;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escLabelHtml(title)}</title>
  <style>
    @page { size: ${width}mm ${height}mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${width}mm;
      height: ${height}mm;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sticker {
      width: ${width}mm;
      height: ${height}mm;
      padding: 1.6mm 2.2mm 1.4mm;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .sticker:last-child { page-break-after: auto; break-after: auto; }
    .barcode {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1mm;
    }
    .barcode svg {
      width: 45mm;
      height: 14mm;
    }
    .ean {
      margin-top: 0.3mm;
      font-size: 2.1mm;
      font-weight: 700;
      letter-spacing: 0.12mm;
      line-height: 1;
    }
    .legal {
      flex: 0 0 auto;
      font-size: 1.7mm;
      line-height: 1.22;
      font-weight: 400;
    }
    .legal p { margin: 0 0 0.85mm; }
    .legal p:last-child { margin-bottom: 1.1mm; }
    .legal .h, .legal .b { font-weight: 700; }
    .details {
      flex: 1 1 auto;
      font-size: 2.05mm;
      line-height: 1.32;
      font-weight: 400;
    }
    .details div { margin: 0 0 0.15mm; }
    .details .k { font-weight: 700; }
    .tax { font-weight: 400; }
  </style>
</head>
<body>${stickersHtml}</body>
</html>`;
}
