export interface SocksFootLength {
  nonStretch: string;
  stretch: string;
}

const UK_SIZE_CHART: Record<string, [number, number]> = {
  "5": [25, 37],
  "6": [26, 38],
  "7": [27, 39],
  "8": [28, 40],
  "9": [29, 41],
  "10": [30, 42],
  "11": [31, 43],
  "12": [32, 44],
};

const FREE_SIZE_KEYS = new Set(["free size", "freesize", "free-size", "fs", "os", "one size", "onesize"]);

/**
 * Map pack/size to the statutory socks foot-length line (non-stretch / stretch).
 * Defaults to 25cm / 37 cm (free size / UK 5) when unknown.
 * @param size - Warehouse pack/size string (UK size, cm, or free size)
 */
export function resolveSocksFootLength(size?: string): SocksFootLength {
  const raw = String(size || "").trim().toLowerCase();
  if (!raw || FREE_SIZE_KEYS.has(raw)) {
    return { nonStretch: "25cm", stretch: "37 cm" };
  }

  if (UK_SIZE_CHART[raw]) {
    const [nonStretch, stretch] = UK_SIZE_CHART[raw];
    return { nonStretch: `${nonStretch}cm`, stretch: `${stretch} cm` };
  }

  const ukMatch = raw.match(/(?:uk\s*)?(\d{1,2})\s*(?:uk)?$/i);
  if (ukMatch && UK_SIZE_CHART[ukMatch[1]]) {
    const [nonStretch, stretch] = UK_SIZE_CHART[ukMatch[1]];
    return { nonStretch: `${nonStretch}cm`, stretch: `${stretch} cm` };
  }

  const cmMatch = raw.match(/(\d+(?:\.\d+)?)\s*cm/);
  if (cmMatch) {
    const n = Number(cmMatch[1]);
    return { nonStretch: `${n}cm`, stretch: `${n + 12} cm` };
  }

  const cmOnly = raw.match(/^(\d{2})$/);
  if (cmOnly) {
    const n = Number(cmOnly[1]);
    if (n >= 20 && n <= 40) {
      return { nonStretch: `${n}cm`, stretch: `${n + 12} cm` };
    }
  }

  return { nonStretch: "25cm", stretch: "37 cm" };
}

/**
 * Format net quantity for a pair-count (Legal Metrology 2N = two pieces).
 * @param pairCount - Number of pairs in the pack
 */
export function formatNetQuantity(pairCount?: number): string {
  const pairs = Number.isFinite(Number(pairCount)) ? Math.max(1, Math.floor(Number(pairCount))) : 1;
  return `${String(pairs).padStart(2, "0")} Pair (${pairs * 2}N)`;
}

/**
 * Format MRP/USP rupees with two decimals.
 * @param mrp - Catalogue MRP
 */
export function formatLabelRupees(mrp?: number): string {
  const n = Number(mrp);
  if (!Number.isFinite(n) || n < 0) return "0.00";
  return n.toFixed(2);
}

/**
 * Month & year of manufacture as MM/YYYY (print date when production date is unknown).
 * @param date - Date to format
 */
export function formatManufactureMonthYear(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${month}/${date.getFullYear()}`;
}

/**
 * Format pack text (e.g. "2-pack", "1 Pair") into Legal Metrology net quantity.
 * @param pack - Product pack attribute
 * @param pairCount - Fallback pair count
 */
export function formatPackToNetQuantity(pack?: string, pairCount?: number): string {
  const raw = String(pack || "").trim();
  if (raw && /pair/i.test(raw) && /\d+\s*N/i.test(raw)) return raw;

  const packMatch = raw.match(/(\d+)\s*-?\s*packs?/i);
  if (packMatch) return formatNetQuantity(Number(packMatch[1]));

  const pairMatch = raw.match(/(\d+)\s*pairs?/i);
  if (pairMatch) return formatNetQuantity(Number(pairMatch[1]));

  return formatNetQuantity(pairCount);
}

/**
 * Statutory size line from catalogue foot-length, else pack/size chart.
 * @param footLength - Product "foot length" attribute
 * @param size - Warehouse size/pack fallback
 */
export function formatSizeLine(footLength?: string, size?: string): string {
  const raw = String(footLength || "").trim();
  if (raw) {
    if (/non-stretch/i.test(raw)) {
      return /foot\s*length/i.test(raw) ? raw : `Foot Length ${raw}`;
    }
    if (raw.includes("/")) {
      const [left, right] = raw.split("/").map((part) => part.trim());
      const nonStretch = /cm/i.test(left) ? left.replace(/\s+/g, "") : `${left}cm`;
      const stretch = /cm/i.test(right) ? right : `${right} cm`;
      return `Foot Length non-stretch: ${nonStretch} / stretch: ${stretch}`;
    }
    const cm = raw.match(/(\d+(?:\.\d+)?)/);
    if (cm) {
      const n = Number(cm[1]);
      return `Foot Length non-stretch: ${n}cm / stretch: ${n + 12} cm`;
    }
    return `Foot Length ${raw}`;
  }
  const foot = resolveSocksFootLength(size);
  return `Foot Length non-stretch: ${foot.nonStretch} / stretch: ${foot.stretch}`;
}
