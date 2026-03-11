import { productionService } from "@/shared/services/productionService";
import type { ArticleProcess } from "@/shared/services/productionService";
import { PRODUCTION_FLOORS } from "@/shared/services/teamMasterService";

export type FloorType = 'Knitting' | 'Linking' | 'Checking' | 'Washing' | 'Boarding' | 'Final Checking' | 'Branding' | 'Warehouse';

/** Normalize floor name for comparison (lowercase, no spaces) */
const normalizeFloorName = (f: string) => (f ?? "").trim().replace(/\s+/g, "").toLowerCase();

/** Process name may be "Linking (hand/auto)" – match if floor name is prefix or exact */
function processMatchesFloor(processName: string, floorName: string): boolean {
  const pNorm = normalizeFloorName(processName);
  const fNorm = normalizeFloorName(floorName);
  return pNorm === fNorm || pNorm.startsWith(fNorm) || fNorm.startsWith(pNorm);
}

/**
 * Get next floor from article processes. Processes are ordered by sortOrder.
 * Returns the process name immediately after currentFloor, or null if current is last.
 * Handles process names like "Linking (hand/auto)" matching floor "Linking".
 */
export function getNextFloorFromProcesses(
  processes: ArticleProcess[],
  currentFloor: string
): string | null {
  if (!processes?.length) return null;
  const sorted = [...processes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const idx = sorted.findIndex((p) => processMatchesFloor(p.name, currentFloor));
  if (idx === -1 || idx >= sorted.length - 1) return null;
  const next = sorted[idx + 1];
  return next?.name ?? null;
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
 * Map process name (e.g. "Linking (hand/auto)") to PRODUCTION_FLOORS value (e.g. "Linking").
 */
function mapProcessNameToFloor(processName: string): string {
  const nextNorm = normalizeFloorName(processName);
  const exact = PRODUCTION_FLOORS.find((f) => normalizeFloorName(f) === nextNorm);
  if (exact) return exact;
  const prefixMatch = PRODUCTION_FLOORS.find((f) => nextNorm.startsWith(normalizeFloorName(f)));
  return prefixMatch ?? processName;
}

/**
 * Resolve next floor: use process-based next if available, else fallback.
 * Matches result against PRODUCTION_FLOORS for consistency.
 */
export function resolveNextFloorFromProcesses(
  processes: ArticleProcess[] | null | undefined,
  currentFloor: string,
  fallback: string
): string {
  const next = processes ? getNextFloorFromProcesses(processes, currentFloor) : null;
  if (!next) return fallback;
  return mapProcessNameToFloor(next);
}
export type LinkingType = 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';

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
