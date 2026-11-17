export const PRODUCT_LABEL_LAYOUT_STORAGE_KEY = "addon.whms.productLabelLayout.v1";

export type ProductLabelOrientation = "portrait" | "landscape";
export type ProductLabelColumnsPerRow = 1 | 2;

export interface ProductLabelLayout {
  /** One die-cut sticker */
  stickerWidthMm: number;
  stickerHeightMm: number;
  /** 1 = single column, 2 = two across */
  columnsPerRow: ProductLabelColumnsPerRow;
  columnGapMm: number;
  /** Page size sent to printer / @page (e.g. 110×70 roll row) */
  rollWidthMm: number;
  rollHeightMm: number;
  offsetXMm: number;
  offsetYMm: number;
  orientation: ProductLabelOrientation;
  /**
   * Added to the row feed sent to the printer.
   * Negative closes a blank gap between rows; positive adds space. 0 = none.
   */
  rowGapAdjustMm: number;
  qzOneJobPerPage: boolean;
  qzPixelPerfect: boolean;
}

const STICKER_W_MIN = 30;
const STICKER_W_MAX = 80;
const STICKER_H_MIN = 40;
const STICKER_H_MAX = 120;
const ROLL_MIN = 40;
const ROLL_MAX = 200;
const GAP_MAX = 10;

/**
 * Factory layout: 50×70 stickers, 2-up, 110×70 roll row (common warehouse stock).
 */
export function createDefaultProductLabelLayout(): ProductLabelLayout {
  const stickerWidthMm = 50;
  const stickerHeightMm = 70;
  const columnsPerRow = 2 as const;
  const columnGapMm = 2;
  const rollWidthMm = 110;
  const rollHeightMm = 70;
  const contentW =
    stickerWidthMm * columnsPerRow + columnGapMm * (columnsPerRow - 1);
  const offsetXMm = Math.max(0, (rollWidthMm - contentW) / 2);
  return {
    stickerWidthMm,
    stickerHeightMm,
    columnsPerRow,
    columnGapMm,
    rollWidthMm,
    rollHeightMm,
    offsetXMm: Number(offsetXMm.toFixed(2)),
    offsetYMm: 0,
    orientation: "portrait",
    rowGapAdjustMm: 0,
    qzOneJobPerPage: false,
    qzPixelPerfect: false,
  };
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * Width of sticker content only (not full roll).
 */
export function productLabelContentWidthMm(layout: ProductLabelLayout): number {
  const cols = layout.columnsPerRow;
  return (
    layout.stickerWidthMm * cols + layout.columnGapMm * Math.max(0, cols - 1)
  );
}

/**
 * @page and QZ job size from roll + orientation.
 */
export function productLabelRollPageSizeMm(layout: ProductLabelLayout): {
  widthMm: number;
  heightMm: number;
} {
  const adjust = Number(layout.rowGapAdjustMm) || 0;
  if (layout.orientation === "landscape") {
    return {
      widthMm: clamp(layout.rollHeightMm + adjust, 20, ROLL_MAX),
      heightMm: layout.rollWidthMm,
    };
  }
  return {
    widthMm: layout.rollWidthMm,
    heightMm: clamp(layout.rollHeightMm + adjust, 20, ROLL_MAX),
  };
}

/**
 * Horizontal position of a sticker column on the roll (0 = left column).
 */
export function productLabelStickerLeftMm(
  layout: ProductLabelLayout,
  columnIndex: number,
): number {
  const col = Math.max(0, Math.min(columnIndex, layout.columnsPerRow - 1));
  return (
    layout.offsetXMm +
    col * (layout.stickerWidthMm + layout.columnGapMm)
  );
}

/**
 * Center sticker block on the roll (updates offset X only).
 */
export function centerProductLabelOnRoll(
  layout: ProductLabelLayout,
): ProductLabelLayout {
  const contentW = productLabelContentWidthMm(layout);
  const offsetXMm = Math.max(0, (layout.rollWidthMm - contentW) / 2);
  return { ...layout, offsetXMm: Number(offsetXMm.toFixed(2)) };
}

/**
 * Merge stored JSON onto defaults with clamped numbers.
 */
export function normalizeProductLabelLayout(raw: unknown): ProductLabelLayout {
  const next = createDefaultProductLabelLayout();
  if (!raw || typeof raw !== "object") return next;
  const s = raw as Partial<ProductLabelLayout>;
  next.stickerWidthMm = clamp(Number(s.stickerWidthMm), STICKER_W_MIN, STICKER_W_MAX);
  next.stickerHeightMm = clamp(Number(s.stickerHeightMm), STICKER_H_MIN, STICKER_H_MAX);
  next.columnsPerRow = s.columnsPerRow === 1 ? 1 : 2;
  next.columnGapMm = clamp(Number(s.columnGapMm), 0, GAP_MAX);
  next.rollWidthMm = clamp(Number(s.rollWidthMm), ROLL_MIN, ROLL_MAX);
  next.rollHeightMm = clamp(Number(s.rollHeightMm), ROLL_MIN, ROLL_MAX);
  next.offsetXMm = clamp(Number(s.offsetXMm), 0, ROLL_MAX);
  next.offsetYMm = clamp(Number(s.offsetYMm), 0, ROLL_MAX);
  next.orientation = s.orientation === "landscape" ? "landscape" : "portrait";
  next.rowGapAdjustMm = clamp(Number(s.rowGapAdjustMm), -40, 40);
  // Saves from before row-gap existed turned both QZ flags on and that
  // inserted a blank label row between every printed pair.
  if (s.rowGapAdjustMm == null) {
    next.qzOneJobPerPage = false;
    next.qzPixelPerfect = false;
    next.rowGapAdjustMm = 0;
  } else {
    next.qzOneJobPerPage = s.qzOneJobPerPage === true;
    next.qzPixelPerfect = s.qzPixelPerfect === true;
  }
  return next;
}

export function loadProductLabelLayout(): ProductLabelLayout {
  if (typeof window === "undefined") return createDefaultProductLabelLayout();
  try {
    const raw = window.localStorage.getItem(PRODUCT_LABEL_LAYOUT_STORAGE_KEY);
    if (!raw) return createDefaultProductLabelLayout();
    return normalizeProductLabelLayout(JSON.parse(raw));
  } catch (err) {
    console.warn("Failed to load product label layout", err);
    return createDefaultProductLabelLayout();
  }
}

export function saveProductLabelLayout(value: ProductLabelLayout): ProductLabelLayout {
  const normalized = normalizeProductLabelLayout(value);
  if (typeof window === "undefined") return normalized;
  window.localStorage.setItem(PRODUCT_LABEL_LAYOUT_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function isSameProductLabelLayout(
  a: ProductLabelLayout,
  b: ProductLabelLayout,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function formatProductLabelLayoutSummary(layout: ProductLabelLayout): string {
  const { widthMm, heightMm } = productLabelRollPageSizeMm(layout);
  const side =
    layout.columnsPerRow === 2 ? "double (2 across)" : "single";
  return `${widthMm}×${heightMm} mm roll · ${side} · sticker ${layout.stickerWidthMm}×${layout.stickerHeightMm} mm`;
}