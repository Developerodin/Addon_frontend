/**
 * Weight API: resolve base URL by trying localhost then LAN IP, then fetch latest weight.
 * Supports separate URL candidates for cones (scale) vs boxes (scale).
 */

/** Default candidates for cone weight (yarn-storage process). */
const WEIGHT_API_CANDIDATES = [
  'http://192.168.0.39:7001/api/latest/cones',
  'http://localhost:7001/api/latest/cones',
] as const;

/** Candidates for box weight (purchase-order-received process). */
const WEIGHT_API_CANDIDATES_BOXES = [
  'http://192.168.0.39:7001/api/latest/box',
  'http://localhost:7001/api/latest/box',
] as const;

/** Candidates for knitting weight scale. */
const WEIGHT_API_CANDIDATES_KNITTING = [
  'http://192.168.0.39:7001/api/latest/knitting',
  'http://localhost:7001/api/latest/knitting',
] as const;

export type WeightApiContext = 'cones' | 'boxes' | 'knitting';

const CACHE_KEY = 'weightApiUrl';
const CACHE_KEY_BOXES = 'weightApiUrlBoxes';
const CACHE_KEY_KNITTING = 'weightApiUrlKnitting';

let cachedUrl: string | null = null;
let cachedUrlBoxes: string | null = null;
let cachedUrlKnitting: string | null = null;

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
  return WEIGHT_API_CANDIDATES;
}

function getCacheKey(context: WeightApiContext): string {
  if (context === 'boxes') return CACHE_KEY_BOXES;
  if (context === 'knitting') return CACHE_KEY_KNITTING;
  return CACHE_KEY;
}

function getCachedUrl(context: WeightApiContext): string | null {
  if (context === 'boxes') return cachedUrlBoxes;
  if (context === 'knitting') return cachedUrlKnitting;
  return cachedUrl;
}

function setCachedUrl(context: WeightApiContext, url: string | null): void {
  if (context === 'boxes') cachedUrlBoxes = url;
  else if (context === 'knitting') cachedUrlKnitting = url;
  else cachedUrl = url;
}

/**
 * Resolve the weight API URL: try cached (memory/localStorage) first, then try each candidate.
 * Caches the first URL that responds (in memory and localStorage).
 * @param context - 'cones' for cone weight (default), 'boxes' for box weight (uses 192.168.0.3).
 */
export async function getResolvedWeightApiUrl(context: WeightApiContext = 'cones'): Promise<string> {
  const candidates = getCandidates(context);
  const cacheKey = getCacheKey(context);
  const fromStorage =
    typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
  let toTry: readonly string[] = fromStorage ? [fromStorage, ...candidates.filter((u) => u !== fromStorage)] : [...candidates];
  const currentCached = getCachedUrl(context);

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
 * @param context - 'cones' for cone scale (localhost/192.168.0.10), 'boxes' for box scale (192.168.0.3).
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
