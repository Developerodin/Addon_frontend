/**
 * Base URLs used by all shared services.
 *
 * IMPORTANT:
 * - Keep exports stable: this file is imported widely across the app.
 * - Prefer env overrides in all environments.
 */

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** True when the page is served from a local/LAN dev host (not prod domain). */
function isLocalDevHost(hostname: string): boolean {
  return (
    /^(localhost|127\.0\.0\.1)$/.test(hostname) ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
  );
}

/**
 * Local backend URL: same host as the frontend, port 8000.
 * e.g. http://192.168.0.13:3000 → http://192.168.0.13:8000/v1
 */
function localApiBaseUrl(hostname: string): string {
  return `http://${hostname}:8000/v1`;
}

function defaultApiBaseUrl(): string {
  // 1) Explicit override for all envs.
  const env = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");

  // 2) Browser on localhost or LAN IP → hit backend on same machine/IP.
  if (isBrowser() && isLocalDevHost(window.location.hostname)) {
    return localApiBaseUrl(window.location.hostname);
  }

  // 3) Production default.
  return "https://addon-api.theodin.in/v1";
}

function defaultRServiceBaseUrl(): string {
  const env = (process.env.NEXT_PUBLIC_RSERVICE_BASE_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");
  return "https://addons.theodin.in/api/v1";
}

export const API_BASE_URL = defaultApiBaseUrl();
export const RService_BASE_URL = defaultRServiceBaseUrl();

/** Floor containers + articles: GET `${API_BASE_URL}/containers-masters/by-floor/${encodeURIComponent(floorName)}/with-articles?status=ACTIVE` (Bearer). See containersMasterService.getByFloorWithArticles. */



