/**
 * Resolves the YarnCatalog document _id for yarn-transaction payloads.
 * Prefer explicit catalog fields; never treat populated YarnInventory `yarn._id` as the catalog id.
 */

function normalizeId(val: unknown): string | null {
  if (val == null || val === "" || val === "N/A") return null;
  if (typeof val === "string") {
    const t = val.trim();
    return t.length ? t : null;
  }
  if (typeof val === "object" && val !== null) {
    const o = val as Record<string, unknown>;
    const id = o._id ?? o.id;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return null;
}

export type YarnCatalogSource = {
  yarnCatalogId?: unknown;
  yarn?: unknown;
  inventory?: unknown;
};

/**
 * From cone detail, transaction, or any API object that may carry
 * `yarnCatalogId`, populated `yarn` (with optional `yarnCatalogId`), or `inventory.yarnCatalogId`.
 * Legacy: `yarn` as a plain ObjectId string still resolves (unpopulated ref to catalog).
 */
export function resolveYarnCatalogId(source: YarnCatalogSource | null | undefined): string | null {
  if (!source) return null;

  const direct = normalizeId(source.yarnCatalogId);
  if (direct) return direct;

  const yarn = source.yarn;
  if (yarn && typeof yarn === "object") {
    const o = yarn as Record<string, unknown>;
    const fromNested = normalizeId(o.yarnCatalogId);
    if (fromNested) return fromNested;
  }

  const inv = source.inventory;
  if (inv && typeof inv === "object") {
    const fromInv = normalizeId((inv as Record<string, unknown>).yarnCatalogId);
    if (fromInv) return fromInv;
  }

  if (typeof yarn === "string" && yarn.trim() && yarn !== "N/A") {
    return yarn.trim();
  }

  return null;
}

/** Issued / returned yarn transaction row from list APIs. */
export function resolveYarnCatalogIdFromTransaction(tx: YarnCatalogSource | null | undefined): string | null {
  return resolveYarnCatalogId(tx);
}
