export const PRODUCT_LABEL_TYPE_STORAGE_KEY = "addon.whms.productLabelTypography.v1";

export const LABEL_FONT_MM_MIN = 1.2;
export const LABEL_FONT_MM_MAX = 4;
export const LABEL_FONT_MM_STEP = 0.05;
export const LABEL_BARCODE_MM_MIN = 5;
export const LABEL_BARCODE_MM_MAX = 16;

export const LABEL_TYPE_FIELD_IDS = [
  "barcode",
  "ean",
  "legalHeading",
  "legal",
  "name",
  "net",
  "size",
  "mfg",
  "style",
  "mrp",
  "usp",
] as const;

export type LabelTypeFieldId = (typeof LABEL_TYPE_FIELD_IDS)[number];
export type LabelBoldness = "regular" | "bold" | "extra";
export type LabelFieldKind = "text" | "barcode";

export interface LabelTypeStyle {
  fontMm: number;
  boldness: LabelBoldness;
}

export type ProductLabelTypography = Record<LabelTypeFieldId, LabelTypeStyle>;

export interface LabelTypeFieldMeta {
  id: LabelTypeFieldId;
  label: string;
  kind: LabelFieldKind;
  minMm: number;
  maxMm: number;
}

export const LABEL_TYPE_FIELD_META: LabelTypeFieldMeta[] = [
  { id: "barcode", label: "Barcode height", kind: "barcode", minMm: LABEL_BARCODE_MM_MIN, maxMm: LABEL_BARCODE_MM_MAX },
  { id: "ean", label: "EAN number", kind: "text", minMm: LABEL_FONT_MM_MIN, maxMm: LABEL_FONT_MM_MAX },
  { id: "legalHeading", label: "Legal headings", kind: "text", minMm: LABEL_FONT_MM_MIN, maxMm: LABEL_FONT_MM_MAX },
  { id: "legal", label: "Legal body", kind: "text", minMm: LABEL_FONT_MM_MIN, maxMm: LABEL_FONT_MM_MAX },
  { id: "name", label: "Name Of Product", kind: "text", minMm: LABEL_FONT_MM_MIN, maxMm: LABEL_FONT_MM_MAX },
  { id: "net", label: "Net Quantity", kind: "text", minMm: LABEL_FONT_MM_MIN, maxMm: LABEL_FONT_MM_MAX },
  { id: "size", label: "Size", kind: "text", minMm: LABEL_FONT_MM_MIN, maxMm: LABEL_FONT_MM_MAX },
  { id: "mfg", label: "Month & Year of Manufacture", kind: "text", minMm: LABEL_FONT_MM_MIN, maxMm: LABEL_FONT_MM_MAX },
  { id: "style", label: "STYLE", kind: "text", minMm: LABEL_FONT_MM_MIN, maxMm: LABEL_FONT_MM_MAX },
  { id: "mrp", label: "MRP", kind: "text", minMm: LABEL_FONT_MM_MIN, maxMm: LABEL_FONT_MM_MAX },
  { id: "usp", label: "USP", kind: "text", minMm: LABEL_FONT_MM_MIN, maxMm: LABEL_FONT_MM_MAX },
];

export const LABEL_TYPE_GROUPS: { title: string; fieldIds: LabelTypeFieldId[] }[] = [
  { title: "Barcode", fieldIds: ["barcode", "ean"] },
  { title: "Legal", fieldIds: ["legalHeading", "legal"] },
  { title: "Product details", fieldIds: ["name", "net", "size", "mfg", "style", "mrp", "usp"] },
];

const BOLDNESS_VALUES: LabelBoldness[] = ["regular", "bold", "extra"];

/**
 * Look up field metadata by id.
 * @param id - Typography field id
 */
export function getLabelTypeFieldMeta(id: LabelTypeFieldId): LabelTypeFieldMeta {
  const meta = LABEL_TYPE_FIELD_META.find((field) => field.id === id);
  if (!meta) {
    return LABEL_TYPE_FIELD_META[4];
  }
  return meta;
}

/**
 * Factory defaults matching the current 50×70mm print CSS.
 */
export function createDefaultProductLabelTypography(): ProductLabelTypography {
  const detail: LabelTypeStyle = { fontMm: 2.4, boldness: "bold" };
  return {
    barcode: { fontMm: 9, boldness: "bold" },
    ean: { fontMm: 2.35, boldness: "bold" },
    legalHeading: { fontMm: 1.98, boldness: "bold" },
    legal: { fontMm: 1.98, boldness: "regular" },
    name: { ...detail },
    net: { ...detail },
    size: { fontMm: 2.06, boldness: "bold" },
    mfg: { ...detail },
    style: { ...detail },
    mrp: { ...detail },
    usp: { ...detail },
  };
}

/**
 * Clamp a millimetre value to a field's allowed range.
 * @param value - Raw millimetre input
 * @param minMm - Inclusive minimum
 * @param maxMm - Inclusive maximum
 */
export function clampLabelFontMm(
  value: number,
  minMm = LABEL_FONT_MM_MIN,
  maxMm = LABEL_FONT_MM_MAX,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return minMm;
  const clamped = Math.min(maxMm, Math.max(minMm, n));
  return Number((Math.round(clamped / LABEL_FONT_MM_STEP) * LABEL_FONT_MM_STEP).toFixed(2));
}

/**
 * Normalise a stored or drafted boldness value.
 * @param value - Unknown input
 */
export function parseLabelBoldness(value: unknown): LabelBoldness {
  return BOLDNESS_VALUES.includes(value as LabelBoldness) ? (value as LabelBoldness) : "bold";
}

/**
 * Merge partial stored typography onto factory defaults.
 * @param raw - Parsed JSON from localStorage
 */
export function normalizeProductLabelTypography(raw: unknown): ProductLabelTypography {
  const next = createDefaultProductLabelTypography();
  if (!raw || typeof raw !== "object") return next;
  const source = raw as Partial<Record<LabelTypeFieldId, Partial<LabelTypeStyle>>>;
  for (const id of LABEL_TYPE_FIELD_IDS) {
    const row = source[id];
    if (!row || typeof row !== "object") continue;
    const meta = getLabelTypeFieldMeta(id);
    next[id] = {
      fontMm: clampLabelFontMm(Number(row.fontMm), meta.minMm, meta.maxMm),
      boldness: parseLabelBoldness(row.boldness),
    };
  }
  return next;
}

/**
 * Load saved label type from localStorage, or factory defaults.
 */
export function loadProductLabelTypography(): ProductLabelTypography {
  if (typeof window === "undefined") return createDefaultProductLabelTypography();
  try {
    const raw = window.localStorage.getItem(PRODUCT_LABEL_TYPE_STORAGE_KEY);
    if (!raw) return createDefaultProductLabelTypography();
    return normalizeProductLabelTypography(JSON.parse(raw));
  } catch (err) {
    console.warn("Failed to load product label typography", err);
    return createDefaultProductLabelTypography();
  }
}

/**
 * Persist label type as the print default.
 * @param value - Typography to save
 */
export function saveProductLabelTypography(value: ProductLabelTypography): ProductLabelTypography {
  const normalized = normalizeProductLabelTypography(value);
  if (typeof window === "undefined") return normalized;
  try {
    window.localStorage.setItem(PRODUCT_LABEL_TYPE_STORAGE_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.warn("Failed to save product label typography", err);
    throw err;
  }
  return normalized;
}

/**
 * CSS font-weight + stroke for a boldness preset (thermal extra-bold needs stroke).
 * @param boldness - Regular / bold / extra
 */
export function boldnessCss(boldness: LabelBoldness): string {
  if (boldness === "regular") return "font-weight: 400; -webkit-text-stroke: 0;";
  if (boldness === "extra") return "font-weight: 800; -webkit-text-stroke: 0.16px #000;";
  return "font-weight: 700; -webkit-text-stroke: 0;";
}

/**
 * Numeric font-weight for on-screen preview.
 * @param boldness - Regular / bold / extra
 */
export function boldnessFontWeight(boldness: LabelBoldness): number {
  if (boldness === "regular") return 400;
  if (boldness === "extra") return 800;
  return 700;
}

/**
 * Print CSS for barcode, EAN, legal, and Name→USP lines.
 * @param typography - Saved or default type settings
 */
export function productLabelDetailsCss(typography: ProductLabelTypography): string {
  const barcodeH = typography.barcode.fontMm;
  const ean = typography.ean;
  const legal = typography.legal;
  const heading = typography.legalHeading;
  const details = LABEL_TYPE_FIELD_META.filter((field) =>
    ["name", "net", "size", "mfg", "style", "mrp", "usp"].includes(field.id),
  ).map((field) => {
    const style = typography[field.id];
    return `.details .line-${field.id} { font-size: ${style.fontMm}mm; line-height: 1.18; ${boldnessCss(style.boldness)} }`;
  });
  return [
    `.barcode svg, .barcode img { width: 44mm; height: ${barcodeH}mm; display: block; object-fit: fill; object-position: top center; }`,
    `.ean { margin-top: 0.28mm; font-size: ${ean.fontMm}mm; line-height: 1; letter-spacing: 0; word-spacing: 0.35mm; ${boldnessCss(ean.boldness)} }`,
    `.legal { flex: 0 0 auto; font-size: ${legal.fontMm}mm; line-height: 1.24; ${boldnessCss(legal.boldness)} }`,
    `.legal p { margin: 0 0 0.62mm; }`,
    `.legal p:last-child { margin-bottom: 0.78mm; }`,
    `.legal b { font-size: ${heading.fontMm}mm; ${boldnessCss(heading.boldness)} }`,
    ...details,
  ].join("\n    ");
}

/**
 * True when two typography snapshots match.
 * @param a - Left
 * @param b - Right
 */
export function isSameProductLabelTypography(
  a: ProductLabelTypography,
  b: ProductLabelTypography,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
