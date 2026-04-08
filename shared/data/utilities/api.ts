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

function defaultApiBaseUrl(): string {
  // 1) Explicit override for all envs.
  const env = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");

  // 2) Local dev convenience (keeps existing behavior without hardcoding for prod).
  if (isBrowser() && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
    return "http://localhost:8000/v1";
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
