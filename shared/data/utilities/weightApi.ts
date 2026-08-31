/**
 * Weight API: try LAN then localhost, cache the first working URL, then fetch latest weight.
 * Each context (cones, boxes, knitting, return) has its own path and cache key.
 *
 * When the scale PC’s LAN IP or port changes, update WEIGHT_API_LAN_BASE (single place).
 */
const WEIGHT_API_LAN_BASE = 'http://192.168.0.29:7001';

/** Default candidates for cone weight (e.g. yarn issue — /api/latest/cones). */
const WEIGHT_API_CANDIDATES = [
  `${WEIGHT_API_LAN_BASE}/api/latest/cones`,
  'http://localhost:7001/api/latest/cones',
] as const;

/** Candidates for box weight (purchase-order-received). */
const WEIGHT_API_CANDIDATES_BOXES = [
  `${WEIGHT_API_LAN_BASE}/api/latest/box`,
  'http://localhost:7001/api/latest/box',
] as const;

/** Candidates for knitting weight scale. */
const WEIGHT_API_CANDIDATES_KNITTING = [
  `${WEIGHT_API_LAN_BASE}/api/latest/knitting`,
  'http://localhost:7001/api/latest/knitting',
] as const;

/** Candidates for yarn return weight scale. */
const WEIGHT_API_CANDIDATES_RETURN = [
  `${WEIGHT_API_LAN_BASE}/api/latest/return`,
  'http://localhost:7001/api/latest/return',
] as const;

export type WeightApiContext = 'cones' | 'boxes' | 'knitting' | 'return';

const CACHE_KEY = 'weightApiUrl';
const CACHE_KEY_BOXES = 'weightApiUrlBoxes';
const CACHE_KEY_KNITTING = 'weightApiUrlKnitting';
const CACHE_KEY_RETURN = 'weightApiUrlReturn';

let cachedUrl: string | null = null;
let cachedUrlBoxes: string | null = null;
let cachedUrlKnitting: string | null = null;
let cachedUrlReturn: string | null = null;

/**
 * Try fetching from a URL; returns true if response is ok.
 */
async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

function getCandidates(context: WeightApiContext): readonly string[] {
  if (context === 'boxes') return WEIGHT_API_CANDIDATES_BOXES;
  if (context === 'knitting') return WEIGHT_API_CANDIDATES_KNITTING;
  if (context === 'return') return WEIGHT_API_CANDIDATES_RETURN;
  return WEIGHT_API_CANDIDATES;
}

function getCacheKey(context: WeightApiContext): string {
  if (context === 'boxes') return CACHE_KEY_BOXES;
  if (context === 'knitting') return CACHE_KEY_KNITTING;
  if (context === 'return') return CACHE_KEY_RETURN;
  return CACHE_KEY;
}

/** Reject cached URLs from the wrong scale (e.g. cones URL stored under knitting key). */
function urlMatchesContext(url: string, context: WeightApiContext): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    if (context === 'knitting') return path.endsWith('/knitting');
    if (context === 'boxes') return path.endsWith('/box');
    if (context === 'return') return path.endsWith('/return');
    return path.endsWith('/cones');
  } catch {
    return false;
  }
}

function getCachedUrl(context: WeightApiContext): string | null {
  if (context === 'boxes') return cachedUrlBoxes;
  if (context === 'knitting') return cachedUrlKnitting;
  if (context === 'return') return cachedUrlReturn;
  return cachedUrl;
}

function setCachedUrl(context: WeightApiContext, url: string | null): void {
  if (context === 'boxes') cachedUrlBoxes = url;
  else if (context === 'knitting') cachedUrlKnitting = url;
  else if (context === 'return') cachedUrlReturn = url;
  else cachedUrl = url;
}

/**
 * Resolve the weight API URL: try cached (memory/localStorage) first, then try each candidate.
 * Caches the first URL that responds (in memory and localStorage).
 * @param context - 'cones' | 'boxes' | 'knitting' | 'return' — each uses its own candidate URLs and cache.
 */
export async function getResolvedWeightApiUrl(context: WeightApiContext = 'cones'): Promise<string> {
  const candidates = getCandidates(context);
  const cacheKey = getCacheKey(context);
  const rawFromStorage =
    typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
  const fromStorage =
    rawFromStorage && urlMatchesContext(rawFromStorage, context)
      ? rawFromStorage
      : null;
  if (rawFromStorage && !fromStorage && typeof window !== 'undefined') {
    localStorage.removeItem(cacheKey);
  }
  let toTry: readonly string[] = fromStorage ? [fromStorage, ...candidates.filter((u) => u !== fromStorage)] : [...candidates];
  let currentCached = getCachedUrl(context);
  if (currentCached && !urlMatchesContext(currentCached, context)) {
    setCachedUrl(context, null);
    if (typeof window !== 'undefined') localStorage.removeItem(cacheKey);
    currentCached = null;
  }

  if (currentCached && toTry[0] === currentCached) {
    const ok = await probe(currentCached);
    if (ok) return currentCached;
    setCachedUrl(context, null);
    if (typeof window !== 'undefined') localStorage.removeItem(cacheKey);
    toTry = candidates;
  }

  for (const url of toTry) {
    const ok = await probe(url);
    if (ok) {
      setCachedUrl(context, url);
      if (typeof window !== 'undefined') localStorage.setItem(cacheKey, url);
      return url;
    }
  }

  return candidates[0];
}

/**
 * Fetch latest weight from the resolved API.
 * @param context - Which scale endpoint to use (see getResolvedWeightApiUrl).
 * Returns weight in kg or null on failure.
 */
export async function fetchWeightLatest(context: WeightApiContext = 'cones'): Promise<number | null> {
  try {
    const url = await getResolvedWeightApiUrl(context);
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const w = data?.weight;
    if (w !== undefined && w !== null) return parseFloat(w);
    return null;
  } catch (e) {
    console.error('Failed to fetch weight:', e);
    return null;
  }
}
