"use client";

import React, { useEffect, useState } from "react";
import JsBarcode from "jsbarcode";
import {
  PRODUCT_LABEL_CUSTOMER_CARE,
  PRODUCT_LABEL_LICENSOR,
  PRODUCT_LABEL_MANUFACTURER,
} from "./productBarcodeLabelConstants";
import {
  productLabelRollPageSizeMm,
  productLabelStickerLeftMm,
  type ProductLabelLayout,
} from "./productBarcodeLabelLayoutSettings";
import {
  boldnessFontWeight,
  type LabelTypeFieldId,
  type ProductLabelTypography,
} from "./productBarcodeLabelSettings";

const PREVIEW_EAN = "8904442944163";
const PREVIEW_EAN_CAPTION = "8 904442 944163";
const BARCODE_WIDTH_MM = 44;

export interface BatchBarcodeLabelPreviewProps {
  typography: ProductLabelTypography;
  layout: ProductLabelLayout;
}

/**
 * Stroke used by thermal extra-bold type on the on-screen sticker preview.
 * @param boldness - Field boldness
 */
function extraStroke(boldness: ProductLabelTypography[LabelTypeFieldId]["boldness"]): string {
  return boldness === "extra" ? "0.16px #000" : "0";
}

/**
 * Inline type for one sticker field (mm size + boldness).
 * @param typography - Current draft type
 * @param id - Field id
 */
function typeStyle(
  typography: ProductLabelTypography,
  id: LabelTypeFieldId,
): React.CSSProperties {
  const style = typography[id];
  return {
    fontSize: `${style.fontMm}mm`,
    fontWeight: boldnessFontWeight(style.boldness),
    WebkitTextStroke: extraStroke(style.boldness),
  };
}

/**
 * Build an EAN-13 SVG that stretches to the preview barcode box (44mm × height).
 */
function previewBarcodeSvg(): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("preserveAspectRatio", "none");
  try {
    JsBarcode(svg, PREVIEW_EAN, {
      format: "EAN13",
      displayValue: false,
      margin: 0,
      marginTop: 0,
      marginBottom: 0,
      height: 36,
      width: 1.25,
    });
  } catch (err) {
    console.warn("Preview barcode render failed", err);
    return "";
  }
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.display = "block";
  return svg.outerHTML;
}

/**
 * True-to-size 50×70mm MRP sticker so barcode height vs remaining copy is obvious.
 */
function SingleStickerPreview({
  typography,
  layout,
  barcodeSvg,
  columnIndex,
}: {
  typography: ProductLabelTypography;
  layout: ProductLabelLayout;
  barcodeSvg: string;
  columnIndex: number;
}) {
  const width = layout.stickerWidthMm;
  const height = layout.stickerHeightMm;
  const m = PRODUCT_LABEL_MANUFACTURER;
  const c = PRODUCT_LABEL_CUSTOMER_CARE;
  const l = PRODUCT_LABEL_LICENSOR;
  const headingStyle = typeStyle(typography, "legalHeading");
  const legalStyle = { ...typeStyle(typography, "legal"), lineHeight: 1.24 };
  const eanStyle = { ...typeStyle(typography, "ean"), lineHeight: 1, wordSpacing: "0.35mm" };

  return (
    <div
      className="box-border bg-white border border-gray-400 overflow-hidden text-black font-[Arial,Helvetica,sans-serif] absolute"
      style={{
        left: `${productLabelStickerLeftMm(layout, columnIndex)}mm`,
        top: `${layout.offsetYMm}mm`,
        width: `${width}mm`,
        height: `${height}mm`,
        minWidth: `${width}mm`,
        minHeight: `${height}mm`,
        padding: "0.55mm 2.1mm 1.1mm",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
      }}
    >
      <div className="flex flex-col items-center shrink-0" style={{ marginBottom: "0.7mm" }}>
        {barcodeSvg ? (
          <div
            className="overflow-hidden [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
            style={{ width: `${BARCODE_WIDTH_MM}mm`, height: `${typography.barcode.fontMm}mm` }}
            dangerouslySetInnerHTML={{ __html: barcodeSvg }}
            aria-hidden
          />
        ) : (
          <div
            className="bg-black"
            style={{ width: `${BARCODE_WIDTH_MM}mm`, height: `${typography.barcode.fontMm}mm` }}
            aria-hidden
          />
        )}
        <p className="m-0 text-center" style={{ ...eanStyle, marginTop: "0.28mm" }}>
          {PREVIEW_EAN_CAPTION}
        </p>
      </div>

      <div className="shrink-0" style={legalStyle}>
        <p className="m-0" style={{ marginBottom: "0.62mm" }}>
          <b style={headingStyle}>{m.heading}</b>
          <br />
          <b style={headingStyle}>{m.name}</b>
          <br />
          {m.address}
        </p>
        <p className="m-0" style={{ marginBottom: "0.62mm" }}>
          {c.intro}
          <br />
          Email: {c.email}
          <br />
          Phone: {c.phone}
        </p>
        <p className="m-0" style={{ marginBottom: "0.78mm" }}>
          {l.heading}
          <br />
          <b style={headingStyle}>{l.name}</b>
          <br />
          {l.address}
        </p>
      </div>

      <div className="shrink-0">
        <p className="m-0" style={{ ...typeStyle(typography, "name"), lineHeight: 1.18, marginBottom: "0.06mm" }}>
          Name Of Product: Socks(Ankle Length)
        </p>
        <p className="m-0" style={{ ...typeStyle(typography, "net"), lineHeight: 1.18, marginBottom: "0.06mm" }}>
          Net Quantity: 01 Pair (2N)
        </p>
        <p className="m-0" style={{ ...typeStyle(typography, "size"), lineHeight: 1.18, marginBottom: "0.06mm" }}>
          Size: Foot Length non-stretch: 30cm / stretch: 42 cm
        </p>
        <p className="m-0" style={{ ...typeStyle(typography, "mfg"), lineHeight: 1.18, marginBottom: "0.06mm" }}>
          Month & Year of Manufacture - 09/2026
        </p>
        <p className="m-0" style={{ ...typeStyle(typography, "style"), lineHeight: 1.18, marginBottom: "0.06mm" }}>
          STYLE: PEC1SALFQ00021 White
        </p>
        <p className="m-0" style={{ ...typeStyle(typography, "mrp"), lineHeight: 1.18, marginBottom: "0.06mm" }}>
          MRP: Rs.129.00 (Inclusive Of All Taxes)
        </p>
        <p className="m-0" style={{ ...typeStyle(typography, "usp"), lineHeight: 1.18 }}>
          USP: Rs. 129.00 per pair
        </p>
      </div>
    </div>
  );
}

export default function BatchBarcodeLabelPreview({ typography, layout }: BatchBarcodeLabelPreviewProps) {
  const [barcodeSvg, setBarcodeSvg] = useState("");
  const roll = productLabelRollPageSizeMm(layout);

  useEffect(() => {
    setBarcodeSvg(previewBarcodeSvg());
  }, []);

  const cols = layout.columnsPerRow;

  return (
    <div className="shrink-0">
      <p className="text-[10px] font-bold uppercase text-gray-500 mb-1.5">
        Roll row · {roll.widthMm}×{roll.heightMm} mm
        {layout.orientation === "landscape" ? " · landscape" : ""}
      </p>
      <p className="text-center text-[10px] text-gray-400 mb-0.5" style={{ width: `${roll.widthMm}mm` }}>
        {roll.widthMm} mm roll width
      </p>
      <div className="flex items-stretch gap-1.5">
        <div
          className="relative box-border bg-gray-100 border border-dashed border-gray-400 shrink-0"
          style={{
            width: `${roll.widthMm}mm`,
            height: `${roll.heightMm}mm`,
            minWidth: `${roll.widthMm}mm`,
            minHeight: `${roll.heightMm}mm`,
          }}
          aria-label="Roll row preview"
        >
          {Array.from({ length: cols }, (_, i) => (
            <SingleStickerPreview
              key={i}
              typography={typography}
              layout={layout}
              barcodeSvg={barcodeSvg}
              columnIndex={i}
            />
          ))}
        </div>
        <span
          className="flex items-center justify-center text-[10px] text-gray-400"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {roll.heightMm} mm
        </span>
      </div>
      <p className="mt-1.5 text-[10px] text-gray-500" style={{ maxWidth: `${roll.widthMm}mm` }}>
        Sticker {layout.stickerWidthMm}×{layout.stickerHeightMm} mm
        {cols === 2 ? " · two across" : " · single"}.
        Barcode {typography.barcode.fontMm} mm × {BARCODE_WIDTH_MM} mm.
      </p>
    </div>
  );
}
