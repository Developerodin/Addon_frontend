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

/** localStorage key read by the header "API target" switch (localhost / 127.0.0.1 only). */
export const API_TARGET_STORAGE_KEY = "addon-api-target";
export type ApiTarget = "ec2-copy" | "factory-docker";

/** Only plain localhost / 127.0.0.1. LAN IPs (factory tablets) and prod hosts never see the switch. */
export function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Browser-only. Returns the stored API target, defaulting to the EC2 copy on port 8000. */
export function readApiTarget(): ApiTarget {
  try {
    return window.localStorage.getItem(API_TARGET_STORAGE_KEY) === "factory-docker"
      ? "factory-docker"
      : "ec2-copy";
  } catch {
    return "ec2-copy";
  }
}

function defaultApiBaseUrl(): string {
  // 1) Explicit override for all envs.
  const env = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");

  // 2) Browser on localhost or LAN IP → hit backend on same machine/IP.
  //    On localhost / 127.0.0.1 only, the header switch can point at the local factory Docker backend (8001).
  if (isBrowser() && isLocalDevHost(window.location.hostname)) {
    const host = window.location.hostname;
    if (isLoopbackHost(host) && readApiTarget() === "factory-docker") {
      return `http://${host}:8001/v1`;
    }
    // When served over HTTPS (Nginx reverse proxy), backend is at /v1 on the same origin.
    if (window.location.protocol === "https:") {
      return `${window.location.origin}/v1`;
    }
    return localApiBaseUrl(host);
  }

  // 3) Production default.
  return "addon-api.addonops.com/v1";
}

function defaultRServiceBaseUrl(): string {
  const env = (process.env.NEXT_PUBLIC_RSERVICE_BASE_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");
  return "addon-api.addonops.com/api/v1";
}

export const API_BASE_URL = defaultApiBaseUrl();
export const RService_BASE_URL = defaultRServiceBaseUrl();

/** Floor containers + articles: GET `${API_BASE_URL}/containers-masters/by-floor/${encodeURIComponent(floorName)}/with-articles?status=ACTIVE` (Bearer). See containersMasterService.getByFloorWithArticles. */



