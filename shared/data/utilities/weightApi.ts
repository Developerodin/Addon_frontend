/**
 * Weight API: resolve base URL by trying localhost then LAN IP, then fetch latest weight.
 * Supports separate URL candidates for cones (scale) vs boxes (scale).
 */

/** Default candidates for cone weight (yarn-storage process). */
const WEIGHT_API_CANDIDATES = [
  'http://localhost:7001/api/weight/latest',
  'http://192.168.0.10:7001/api/weight/latest',
] as const;

/** Candidates for box weight (purchase-order-received process). */
const WEIGHT_API_CANDIDATES_BOXES = [
  'http://192.168.0.105:7001/api/weight/latest',
  'http://localhost:7001/api/weight/latest',
] as const;

export type WeightApiContext = 'cones' | 'boxes';

const CACHE_KEY = 'weightApiUrl';
const CACHE_KEY_BOXES = 'weightApiUrlBoxes';

let cachedUrl: string | null = null;
let cachedUrlBoxes: string | null = null;

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
  return context === 'boxes' ? WEIGHT_API_CANDIDATES_BOXES : WEIGHT_API_CANDIDATES;
}

function getCacheKey(context: WeightApiContext): string {
  return context === 'boxes' ? CACHE_KEY_BOXES : CACHE_KEY;
}

function getCachedUrl(context: WeightApiContext): string | null {
  return context === 'boxes' ? cachedUrlBoxes : cachedUrl;
}

function setCachedUrl(context: WeightApiContext, url: string | null): void {
  if (context === 'boxes') cachedUrlBoxes = url;
  else cachedUrl = url;
}

/**
 * Resolve the weight API URL: try cached (memory/localStorage) first, then try each candidate.
 * Caches the first URL that responds (in memory and localStorage).
 * @param context - 'cones' for cone weight (default), 'boxes' for box weight (uses 192.168.0.105).
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
 * @param context - 'cones' for cone scale (localhost/192.168.0.10), 'boxes' for box scale (192.168.0.105).
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
