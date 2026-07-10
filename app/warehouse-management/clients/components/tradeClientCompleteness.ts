import type { WarehouseClient } from "@/shared/services/whmsWarehouseClientService";
import { TRADE_ROOT_FIELDS } from "./warehouseClientFieldConfig";

/** Required Trade fields for a complete website-linked client profile. */
export const TRADE_REQUIRED_FOR_WEB_SYNC = [
  "retailerName",
  "mobilePhone",
  "email",
  "gstin",
  "address",
  "city",
  "state",
  "zipCode",
] as const;

const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  TRADE_ROOT_FIELDS.map(({ key, label }) => [key, label]),
);

/**
 * Whether the client was auto-created from the addonweb website.
 * @param client
 */
export function isWebAutoCreatedClient(client?: WarehouseClient | null): boolean {
  const meta = client?.meta as Record<string, unknown> | undefined;
  return meta?.source === "addonweb" || meta?.autoCreated === true;
}

/**
 * List missing required Trade profile fields.
 * @param client
 */
export function getIncompleteTradeFields(client?: WarehouseClient | null): string[] {
  if (!client) return [...TRADE_REQUIRED_FOR_WEB_SYNC];
  const missing: string[] = [];
  for (const key of TRADE_REQUIRED_FOR_WEB_SYNC) {
    const val = String((client as Record<string, unknown>)[key] ?? "").trim();
    if (!val) missing.push(key);
  }
  return missing;
}

/**
 * Human-readable labels for missing Trade fields.
 * @param keys
 */
export function tradeFieldLabels(keys: string[]): string[] {
  return keys.map((k) => FIELD_LABELS[k] || k);
}

/**
 * Build client edit URL with optional return-to-order context.
 * @param clientId
 * @param fromOrderId
 */
export function clientEditHref(clientId: string, fromOrderId?: string): string {
  const base = `/warehouse-management/clients/edit/${clientId}`;
  if (!fromOrderId) return base;
  return `${base}?fromOrder=${encodeURIComponent(fromOrderId)}`;
}
