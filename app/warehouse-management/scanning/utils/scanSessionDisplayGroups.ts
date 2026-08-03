import type { ScanSessionItem } from "@/shared/services/whmsFulfilmentService";

/** Multi-pair group keyed by pair style code. */
export interface MultiPairScanGroup {
  pairStyleCode: string;
  children: ScanSessionItem[];
}

export interface ScanDisplayGroups {
  single: ScanSessionItem[];
  multi: MultiPairScanGroup[];
}

/**
 * Returns true when a scan item is a multi-pair child (pair sku differs from child style).
 */
export function isMultiPairScanItem(item: ScanSessionItem): boolean {
  if (item.itemKind === "multiPair") return true;
  if (item.itemKind === "singlePair") return false;
  const sku = String(item.skuCode || item.styleCode || "").trim();
  const style = String(item.styleCode || "").trim();
  return Boolean(sku && style && sku !== style);
}

/**
 * Resolves the pair style code for a multi-pair scan item.
 */
export function resolvePairStyleCode(item: ScanSessionItem): string {
  if (item.pairStyleCode) return item.pairStyleCode;
  return String(item.skuCode || "").trim();
}

/**
 * Splits scan session items into single-pair rows and multi-pair groups.
 */
export function buildScanDisplayGroups(items: ScanSessionItem[]): ScanDisplayGroups {
  const single: ScanSessionItem[] = [];
  const multiMap = new Map<string, MultiPairScanGroup>();

  for (const item of items) {
    if (isMultiPairScanItem(item)) {
      const pairStyleCode = resolvePairStyleCode(item);
      if (!multiMap.has(pairStyleCode)) {
        multiMap.set(pairStyleCode, { pairStyleCode, children: [] });
      }
      multiMap.get(pairStyleCode)!.children.push(item);
      continue;
    }
    single.push(item);
  }

  single.sort((a, b) => a.styleCode.localeCompare(b.styleCode));

  const multi = [...multiMap.values()].sort((a, b) =>
    a.pairStyleCode.localeCompare(b.pairStyleCode),
  );
  for (const group of multi) {
    group.children.sort((a, b) => a.styleCode.localeCompare(b.styleCode));
  }

  return { single, multi };
}
