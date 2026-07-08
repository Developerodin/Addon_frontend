/**
 * User-facing message for pick-list PATCH failures (inventory / stock).
 * @param raw - API error message
 * @param styleCode - Style code on the pick line
 */
export function formatPickSaveErrorMessage(raw: string, styleCode?: string): string {
  const code = (styleCode ?? "").trim() || "this style code";
  const msg = String(raw || "").trim();

  if (/no inventory row found/i.test(msg)) {
    return `No warehouse stock for "${code}". Add inventory in WHMS → Stock before picking.`;
  }
  if (/transaction numbers|replica set|mongos/i.test(msg)) {
    return "Pick save failed: database does not support transactions on this host. Restart the API after deploy, or use a MongoDB replica set.";
  }
  if (/insufficient stock/i.test(msg)) {
    return msg.replace(/styleCode "/g, '"').replace(/"/g, '"');
  }
  return msg || "Failed to save pickup quantity";
}
