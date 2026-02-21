/**
 * Weight API: resolve base URL by trying localhost then LAN IP, then fetch latest weight.
 * Use whichever of localhost:7001 or 192.168.0.28:7001 responds.
 */

const WEIGHT_API_CANDIDATES = [
  'http://localhost:7001/api/weight/latest',
  'http://192.168.0.28:7001/api/weight/latest',
] as const;

const CACHE_KEY = 'weightApiUrl';

let cachedUrl: string | null = null;

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

/**
 * Resolve the weight API URL: try cached (memory/localStorage) first, then try each candidate.
 * Caches the first URL that responds (in memory and localStorage).
 */
export async function getResolvedWeightApiUrl(): Promise<string> {
  const fromStorage =
    typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
  let toTry: readonly string[] = fromStorage ? [fromStorage, ...WEIGHT_API_CANDIDATES.filter((u) => u !== fromStorage)] : [...WEIGHT_API_CANDIDATES];

  if (cachedUrl && toTry[0] === cachedUrl) {
    const ok = await probe(cachedUrl);
    if (ok) return cachedUrl;
    cachedUrl = null;
    if (typeof window !== 'undefined') localStorage.removeItem(CACHE_KEY);
    toTry = WEIGHT_API_CANDIDATES;
  }

  for (const url of toTry) {
    const ok = await probe(url);
    if (ok) {
      cachedUrl = url;
      if (typeof window !== 'undefined') localStorage.setItem(CACHE_KEY, url);
      return url;
    }
  }

  return WEIGHT_API_CANDIDATES[0];
}

/**
 * Fetch latest weight from the resolved API (localhost or 192.168.0.28, whichever responds).
 * Returns weight in kg or null on failure.
 */
export async function fetchWeightLatest(): Promise<number | null> {
  try {
    const url = await getResolvedWeightApiUrl();
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
