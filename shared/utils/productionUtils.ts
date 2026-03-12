import { productionService } from "@/shared/services/productionService";
import type { ArticleProcess } from "@/shared/services/productionService";
import { PRODUCTION_FLOORS } from "@/shared/services/teamMasterService";

export type FloorType = 'Knitting' | 'Linking' | 'Checking' | 'Washing' | 'Boarding' | 'Final Checking' | 'Branding' | 'Warehouse';
export type LinkingType = 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';

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
function mapProcessNameToFloor(processName: string): string {
  const nextNorm = normalizeFloorName(processName);
  const exact = PRODUCTION_FLOORS.find((f) => normalizeFloorName(f) === nextNorm);
  if (exact) return exact;
  const prefixMatch = PRODUCTION_FLOORS.find((f) => nextNorm.startsWith(normalizeFloorName(f)));
  if (prefixMatch) return prefixMatch;
  // Process name variations that map to canonical floors
  if (nextNorm.includes("dispatch") && nextNorm.includes("ready")) return "Dispatch";
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
    'Warehouse': 'Warehouse'
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
    'Warehouse': 'bg-gray-100 text-gray-800'
  };
  
  return colors[floor] || 'bg-gray-100 text-gray-800';
};
