import { productionService } from "@/shared/services/productionService";
import type { ArticleProcess } from "@/shared/services/productionService";
import { PRODUCTION_FLOORS } from "@/shared/services/teamMasterService";

export type FloorType = 'Knitting' | 'Linking' | 'Checking' | 'Washing' | 'Boarding' | 'Silicon' | 'Secondary Checking' | 'Final Checking' | 'Branding' | 'Re-Boarding' | 'Warehouse' | 'Dispatch';
export type LinkingType = 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';

/** camelCase keys used in article.floorQuantities */
export const CANONICAL_FLOOR_TO_KEY: Record<string, string> = {
  Knitting: 'knitting',
  Linking: 'linking',
  Checking: 'checking',
  Washing: 'washing',
  Boarding: 'boarding',
  Silicon: 'silicon',
  'Secondary Checking': 'secondaryChecking',
  Branding: 'branding',
  'Re-Boarding': 'reBoarding',
  'Final Checking': 'finalChecking',
  Warehouse: 'warehouse',
  Dispatch: 'dispatch',
};

const QUALITY_FLOOR_KEYS = new Set(['checking', 'secondaryChecking', 'finalChecking', 'dispatch']);

/** Normalize floor name for comparison (lowercase, no spaces) */
const normalizeFloorName = (f: string) => (f ?? "").trim().replace(/\s+/g, "").toLowerCase();

/** Process name may be "Linking (hand/auto)" – match if floor name is prefix or exact */
function processMatchesFloor(processName: string, floorName: string): boolean {
  const pNorm = normalizeFloorName(processName);
  const fNorm = normalizeFloorName(floorName);
  return pNorm === fNorm || pNorm.startsWith(fNorm) || fNorm.startsWith(pNorm);
}

/**
 * Map process name (e.g. "Linking (hand/auto)") to PRODUCTION_FLOORS value (e.g. "Linking").
 * Used by getNextFloorFromProcesses - must be defined before it.
 */
export function mapProcessNameToFloor(processName: string): string {
  const nextNorm = normalizeFloorName(processName);
  const exact = PRODUCTION_FLOORS.find((f) => normalizeFloorName(f) === nextNorm);
  if (exact) return exact;
  const prefixMatch = PRODUCTION_FLOORS.find((f) => nextNorm.startsWith(normalizeFloorName(f)));
  if (prefixMatch) return prefixMatch;
  // Process name variations that map to canonical floors
  if (nextNorm.includes("dispatch") && nextNorm.includes("ready")) return "Dispatch";
  if (nextNorm.includes("reboard") || nextNorm.includes("re-board")) return "Re-Boarding";
  if (nextNorm.includes("secondary") && nextNorm.includes("check")) return "Secondary Checking";
  if (nextNorm.includes("final") && nextNorm.includes("check")) return "Final Checking";
  return processName;
}

/**
 * Check if a process maps to a target floor. Uses mapProcessNameToFloor which handles
 * "Linking (hand/auto)" → "Linking", "Secondary Check" → "Secondary Checking", etc.
 */
function processMapsToFloor(processName: string, targetFloor: string): boolean {
  const mapped = mapProcessNameToFloor(processName);
  return normalizeFloorName(mapped) === normalizeFloorName(targetFloor);
}

/**
 * Find current floor index. Prefer longest (most specific) match so "Secondary Checking"
 * matches itself, not "Checking" (since "secondarychecking" contains "checking").
 */
function findCurrentFloorIndex(canonicalOrder: readonly string[], currentFloor: string): number {
  const matches = canonicalOrder
    .map((f, idx) => ({ f, idx }))
    .filter(({ f }) => processMatchesFloor(f, currentFloor));
  if (!matches.length) return -1;
  // Prefer exact match, then longest floor name (most specific)
  const exact = matches.find(({ f }) => normalizeFloorName(f) === normalizeFloorName(currentFloor));
  if (exact) return exact.idx;
  return matches.reduce((best, m) =>
    m.f.length > best.f.length ? m : best
  ).idx;
}

/**
 * Get next floor from article processes. Uses canonical floor order (PRODUCTION_FLOORS)
 * so that flow is correct even when API sortOrder is wrong (e.g. Branding → Final Checking
 * before Ready to Dispatch, or Boarding skipping Secondary Checking). Returns the process
 * name for the next floor that exists in the article's processes, or null if current is last.
 * @param skipLinking - when true, skip Linking floor (for Auto Linking articles leaving Knitting)
 */
export function getNextFloorFromProcesses(
  processes: ArticleProcess[],
  currentFloor: string,
  skipLinking = false
): string | null {
  if (!processes?.length) return null;
  const canonicalOrder = [...PRODUCTION_FLOORS];
  const currentIdx = findCurrentFloorIndex(canonicalOrder, currentFloor);
  if (currentIdx === -1 || currentIdx >= canonicalOrder.length - 1) return null;
  // Find first process that maps to a floor after current in canonical order
  for (let i = currentIdx + 1; i < canonicalOrder.length; i++) {
    const targetFloor = canonicalOrder[i];
    if (skipLinking && normalizeFloorName(targetFloor) === normalizeFloorName("Linking")) continue;
    const matching = processes.find((p) => processMapsToFloor(p.name, targetFloor));
    if (matching) return matching.name;
  }
  return null;
}

/** MongoDB ObjectId is 24 hex chars. Use this for API calls that require _id. */
export function getArticleMongoId(
  articleId: string,
  articles: Array<{ _id?: string; id?: string; articleNumber?: string }> | undefined
): string | null {
  if (!articleId || !articles?.length) return null;
  const article = articles.find(
    (a) => a._id === articleId || a.id === articleId || a.articleNumber === articleId
  );
  const mongoId = article?._id ?? article?.id ?? articleId;
  if (!mongoId) return null;
  // Prefer _id; accept if it looks like MongoDB ObjectId (24 hex)
  if (/^[a-fA-F0-9]{24}$/.test(String(mongoId))) return String(mongoId);
  return null;
}

/**
 * Resolve next floor: use process-based next if available, else fallback.
 * Matches result against PRODUCTION_FLOORS for consistency.
 * @param linkingType - when 'Auto Linking' and currentFloor is Knitting, skips Linking (auto articles go to next floor)
 */
export function resolveNextFloorFromProcesses(
  processes: ArticleProcess[] | null | undefined,
  currentFloor: string,
  fallback: string,
  linkingType?: LinkingType
): string {
  const skipLinking =
    linkingType === "Auto Linking" &&
    normalizeFloorName(currentFloor) === normalizeFloorName("Knitting");
  const next = processes ? getNextFloorFromProcesses(processes, currentFloor, skipLinking) : null;
  if (!next) return fallback;
  return mapProcessNameToFloor(next);
}

/**
 * Get the next floor in the production flow based on current floor and linking type
 */
export const getNextFloor = (currentFloor: FloorType, linkingType: LinkingType): FloorType | null => {
  const floorOrder = productionService.getFloorOrderByLinkingType(linkingType);
  const currentIndex = floorOrder.indexOf(currentFloor);
  
  if (currentIndex === -1 || currentIndex === floorOrder.length - 1) {
    return null; // No next floor
  }
  
  return floorOrder[currentIndex + 1] as FloorType;
};

/**
 * Get the previous floor in the production flow based on current floor and linking type
 */
export const getPreviousFloor = (currentFloor: FloorType, linkingType: LinkingType): FloorType | null => {
  const floorOrder = productionService.getFloorOrderByLinkingType(linkingType);
  const currentIndex = floorOrder.indexOf(currentFloor);
  
  if (currentIndex <= 0) {
    return null; // No previous floor
  }
  
  return floorOrder[currentIndex - 1] as FloorType;
};

/**
 * Check if a floor should be skipped based on linking type
 */
export const shouldSkipFloor = (floor: FloorType, linkingType: LinkingType): boolean => {
  if (linkingType === 'Auto Linking' && floor === 'Linking') {
    return true;
  }
  return false;
};

/**
 * Get all floors in the production flow for a given linking type
 */
export const getFloorOrder = (linkingType: LinkingType): FloorType[] => {
  return productionService.getFloorOrderByLinkingType(linkingType) as FloorType[];
};

/**
 * Validate if a transfer is allowed from current floor to next floor
 */
export const isTransferAllowed = (currentFloor: FloorType, nextFloor: FloorType, linkingType: LinkingType): boolean => {
  const floorOrder = getFloorOrder(linkingType);
  const currentIndex = floorOrder.indexOf(currentFloor);
  const nextIndex = floorOrder.indexOf(nextFloor);
  
  return nextIndex === currentIndex + 1;
};

/**
 * Get floor display name with proper formatting
 */
export const getFloorDisplayName = (floor: FloorType): string => {
  const displayNames: Record<FloorType, string> = {
    'Knitting': 'Knitting',
    'Linking': 'Linking',
    'Checking': 'Checking',
    'Washing': 'Washing',
    'Boarding': 'Boarding',
    'Final Checking': 'Final Checking',
    'Branding': 'Branding',
    'Re-Boarding': 'Re-Boarding',
    'Warehouse': 'Warehouse',
    'Dispatch': 'Dispatch',
  };
  
  return displayNames[floor] || floor;
};

/**
 * Get floor color for UI display
 */
export const getFloorColor = (floor: FloorType): string => {
  const colors: Record<FloorType, string> = {
    'Knitting': 'bg-blue-100 text-blue-800',
    'Linking': 'bg-purple-100 text-purple-800',
    'Checking': 'bg-yellow-100 text-yellow-800',
    'Washing': 'bg-cyan-100 text-cyan-800',
    'Boarding': 'bg-green-100 text-green-800',
    'Final Checking': 'bg-orange-100 text-orange-800',
    'Branding': 'bg-pink-100 text-pink-800',
    'Re-Boarding': 'bg-emerald-100 text-emerald-800',
    'Warehouse': 'bg-gray-100 text-gray-800',
    'Dispatch': 'bg-teal-100 text-teal-800',
  };
  
  return colors[floor] || 'bg-gray-100 text-gray-800';
};

/**
 * Resolve applicable floor keys for an article from its product processes.
 * Auto Linking articles skip the Linking floor even if present on the product.
 */
export function getApplicableFloorKeysFromProcesses(
  processes: ArticleProcess[] | null | undefined,
  linkingType?: LinkingType
): string[] {
  if (!processes?.length) return [];

  const floorKeys = new Set<string>();
  for (const process of processes) {
    const canonicalFloor = mapProcessNameToFloor(process.name);
    const floorKey = CANONICAL_FLOOR_TO_KEY[canonicalFloor];
    if (floorKey) floorKeys.add(floorKey);
  }

  if (linkingType === 'Auto Linking') {
    floorKeys.delete('linking');
  }

  return PRODUCTION_FLOORS
    .map((floor) => CANONICAL_FLOOR_TO_KEY[floor])
    .filter((key): key is string => Boolean(key && floorKeys.has(key)));
}

/**
 * Whether a canonical floor (e.g. "Final Checking") appears in the article product process.
 */
export function articleHasFloorInProcess(
  processes: ArticleProcess[] | null | undefined,
  floor: string,
  linkingType?: LinkingType
): boolean {
  const floorKey = CANONICAL_FLOOR_TO_KEY[floor];
  if (!floorKey) return false;
  return getApplicableFloorKeysFromProcesses(processes, linkingType).includes(floorKey);
}

/**
 * Human-readable process flow label for error messages.
 */
export function formatProcessFlowLabel(
  processes: ArticleProcess[] | null | undefined,
  linkingType?: LinkingType
): string {
  const keys = getApplicableFloorKeysFromProcesses(processes, linkingType);
  if (keys.length === 0) return "unknown";
  return keys
    .map((key) => PRODUCTION_FLOORS.find((f) => CANONICAL_FLOOR_TO_KEY[f] === key) ?? key)
    .join(" → ");
}

/** Whether floorQuantities row has any recorded movement. */
export function floorHasActivity(data?: {
  received?: number;
  completed?: number;
  transferred?: number;
  remaining?: number;
}): boolean {
  if (!data) return false;
  return (
    (data.received ?? 0) > 0 ||
    (data.completed ?? 0) > 0 ||
    (data.transferred ?? 0) > 0 ||
    (data.remaining ?? 0) > 0
  );
}

/** Sort floor keys in canonical production order. */
export function sortFloorKeys(keys: string[]): string[] {
  const order = PRODUCTION_FLOORS.map((floor) => CANONICAL_FLOOR_TO_KEY[floor]);
  return [...keys].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

/**
 * Floors to show for admin progress tracking.
 * Prefer full product process route; fall back to floorQuantities when processes are unavailable.
 */
export function resolveArticleDisplayFloorKeys(
  floorQuantities: Record<string, unknown> | undefined,
  processes: ArticleProcess[] | null | undefined,
  linkingType?: LinkingType
): string[] {
  const knownFloorKeys = new Set(Object.values(CANONICAL_FLOOR_TO_KEY));
  const processFloors = getApplicableFloorKeysFromProcesses(processes, linkingType);

  if (processFloors.length > 0) {
    const keys = new Set(processFloors);
    if (floorQuantities) {
      for (const [key, data] of Object.entries(floorQuantities)) {
        if (knownFloorKeys.has(key) && floorHasActivity(data as Parameters<typeof floorHasActivity>[0])) {
          keys.add(key);
        }
      }
    }
    return sortFloorKeys([...keys]);
  }

  if (floorQuantities && Object.keys(floorQuantities).length > 0) {
    const activeKeys = Object.entries(floorQuantities)
      .filter(([key, data]) => knownFloorKeys.has(key) && floorHasActivity(data as Parameters<typeof floorHasActivity>[0]))
      .map(([key]) => key);
    if (activeKeys.length > 0) return sortFloorKeys(activeKeys);
    return sortFloorKeys(Object.keys(floorQuantities).filter((key) => knownFloorKeys.has(key)));
  }

  let fallback = PRODUCTION_FLOORS.map((floor) => CANONICAL_FLOOR_TO_KEY[floor]).filter(Boolean);
  if (linkingType === 'Auto Linking') {
    fallback = fallback.filter((key) => key !== 'linking');
  }
  return fallback;
}

/** Whether a floor key tracks M1–M4 quality buckets. */
export function floorKeyHasQualityMetrics(floorKey: string): boolean {
  return QUALITY_FLOOR_KEYS.has(floorKey);
}

/** Human-readable label for a floorQuantities key. */
export function getFloorKeyDisplayName(floorKey: string): string {
  const entry = Object.entries(CANONICAL_FLOOR_TO_KEY).find(([, key]) => key === floorKey);
  return entry?.[0] ?? floorKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

/**
 * Builds a process route label using the same canonical floor order as the order view drawer.
 */
export function getArticleProcessRouteLabel(
  floorQuantities: Record<string, unknown> | undefined,
  processes: ArticleProcess[] | null | undefined,
  linkingType?: LinkingType
): string {
  return resolveArticleDisplayFloorKeys(floorQuantities, processes, linkingType)
    .map(getFloorKeyDisplayName)
    .join(" → ");
}
