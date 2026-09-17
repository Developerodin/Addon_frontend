export const PRODUCT_LABEL_TYPE_STORAGE_KEY = "addon.whms.productLabelTypography.v1";

export const LABEL_FONT_MM_MIN = 1.2;
export const LABEL_FONT_MM_MAX = 3.6;
export const LABEL_FONT_MM_STEP = 0.05;

export const LABEL_TYPE_FIELD_IDS = [
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

export interface LabelTypeStyle {
  fontMm: number;
  boldness: LabelBoldness;
}

export type ProductLabelTypography = Record<LabelTypeFieldId, LabelTypeStyle>;

export const LABEL_TYPE_FIELD_META: {
  id: LabelTypeFieldId;
  label: string;
  cssClass: string;
}[] = [
  { id: "name", label: "Name Of Product", cssClass: "line-name" },
  { id: "net", label: "Net Quantity", cssClass: "line-net" },
  { id: "size", label: "Size", cssClass: "line-size" },
  { id: "mfg", label: "Month & Year of Manufacture", cssClass: "line-mfg" },
  { id: "style", label: "STYLE", cssClass: "line-style" },
  { id: "mrp", label: "MRP", cssClass: "line-mrp" },
  { id: "usp", label: "USP", cssClass: "line-usp" },
];

const BOLDNESS_VALUES: LabelBoldness[] = ["regular", "bold", "extra"];

/**
 * Factory defaults matching the current 50×70mm print CSS.
 */
export function createDefaultProductLabelTypography(): ProductLabelTypography {
  const detail: LabelTypeStyle = { fontMm: 2.4, boldness: "bold" };
  return {
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
 * Clamp a font size to the allowed millimetre range.
 * @param value - Raw millimetre input
 */
export function clampLabelFontMm(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 2.4;
  const clamped = Math.min(LABEL_FONT_MM_MAX, Math.max(LABEL_FONT_MM_MIN, n));
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
    next[id] = {
      fontMm: clampLabelFontMm(Number(row.fontMm)),
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
 * Per-line details CSS injected into the 50×70mm print stylesheet.
 * @param typography - Saved or default type settings
 */
export function productLabelDetailsCss(typography: ProductLabelTypography): string {
  const rules = LABEL_TYPE_FIELD_META.map(({ id, cssClass }) => {
    const style = typography[id];
    return `.details .${cssClass} { font-size: ${style.fontMm}mm; line-height: 1.18; ${boldnessCss(style.boldness)} }`;
  });
  return rules.join("\n    ");
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
