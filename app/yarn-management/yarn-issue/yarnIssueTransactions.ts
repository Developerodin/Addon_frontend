import { API_BASE_URL } from "@/shared/data/utilities/api";
import type { IssuedQtyTransaction } from "./yarnIssueIssuedQty";

/**
 * Flatten GET yarn-issued-by-order payload (yarn buckets or a raw tx array).
 */
export function flattenIssuedByOrderPayload(data: unknown): IssuedQtyTransaction[] {
  if (!Array.isArray(data)) return [];
  const out: IssuedQtyTransaction[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (Array.isArray(rec.transactions)) {
      for (const tx of rec.transactions) {
        if (tx && typeof tx === "object") out.push(tx as IssuedQtyTransaction);
      }
    } else if (typeof rec.transactionType === "string") {
      out.push(item as IssuedQtyTransaction);
    }
  }
  return out;
}

/**
 * Fetch yarn_issued rows for one order number (grouped-by-yarn API).
 */
export async function fetchYarnIssuedByOrder(
  orderNumber: string,
  token: string | null
): Promise<IssuedQtyTransaction[]> {
  const response = await fetch(
    `${API_BASE_URL}/yarn-management/yarn-transactions/yarn-issued-by-order/${encodeURIComponent(orderNumber)}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch yarn transactions");
  }
  const data = await response.json();
  return flattenIssuedByOrderPayload(data).filter((t) => t.transactionType === "yarn_issued");
}
