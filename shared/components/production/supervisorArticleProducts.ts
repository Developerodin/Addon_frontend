import axios from "axios";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import yarnCatalogService, { YarnCatalog } from "@/shared/services/yarnCatalogService";

export interface ArticleBomLine {
  yarnCatalogId: string;
  quantity: number;
  yarnName: string;
}

export interface ArticleProductAttachment {
  productId: string;
  needleSizeFromProduct?: string;
  knittingCode?: string;
  bom: ArticleBomLine[];
}

interface ProductBomRaw {
  yarnCatalogId?: string | { id?: string; _id?: string; yarnName?: string };
  materialId?: string | { id?: string; _id?: string };
  quantity?: number;
  yarnName?: string;
  materialName?: string;
}

interface ProductRaw {
  id?: string;
  _id?: string;
  factoryCode?: string;
  knittingCode?: string;
  attributes?: Record<string, string | number>;
  bom?: ProductBomRaw[];
}

/**
 * Reads a catalog id off a BOM ref that may be a string or a populated document.
 * @param value Raw yarnCatalogId or materialId
 * @returns Id string, or empty when missing
 */
const refId = (value: ProductBomRaw["yarnCatalogId"]): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.id || value._id || "";
};

/**
 * Loads every factory code on an order in one indexed query and normalizes BOM rows.
 * Replaces per-article `GET /products?limit=1000` plus `GET /products/:id`.
 * @param factoryCodes Article numbers on the order
 * @param yarnCatalogs Yarn names already in memory, keyed by catalog id
 * @returns Attachments keyed by lowercased factory code, plus any catalogs fetched for missing names
 */
export async function loadArticleProductDetails(
  factoryCodes: string[],
  yarnCatalogs: Record<string, Pick<YarnCatalog, "yarnName"> | YarnCatalog>
): Promise<{ byFactoryCode: Map<string, ArticleProductAttachment>; yarns: YarnCatalog[] }> {
  const unique = [...new Set(factoryCodes.map((code) => String(code || "").trim()).filter(Boolean))];
  const byFactoryCode = new Map<string, ArticleProductAttachment>();
  if (unique.length === 0) return { byFactoryCode, yarns: [] };

  const response = await axios.post(`${API_BASE_URL}/products/by-factory-codes`, {
    factoryCodes: unique,
    view: "bom",
  });
  const rows: ProductRaw[] = Array.isArray(response.data)
    ? response.data
    : response.data?.results || response.data?.data || [];

  const missingYarnIds = new Set<string>();
  const pending = rows.map((product) => {
    const factoryCode = String(product.factoryCode || "").trim();
    const productId = product.id || product._id || "";
    if (!factoryCode || !productId) return null;
    const attrs = product.attributes || {};
    const needlesRaw = attrs.Needles ?? attrs.needles;
    const lines = (product.bom || []).map((item) => {
      let yarnCatalogId = refId(item.yarnCatalogId) || refId(item.materialId);
      let yarnName =
        item.yarnName ||
        item.materialName ||
        (typeof item.yarnCatalogId === "object" ? item.yarnCatalogId?.yarnName : "") ||
        "";
      if (!yarnName && yarnCatalogId && yarnCatalogs[yarnCatalogId]?.yarnName) {
        yarnName = yarnCatalogs[yarnCatalogId].yarnName || "";
      }
      if (!yarnName && yarnCatalogId) missingYarnIds.add(yarnCatalogId);
      return {
        yarnCatalogId,
        quantity: item.quantity || 0,
        yarnName: yarnName || "",
      };
    });
    return { factoryCode, productId, needlesRaw, knittingCode: product.knittingCode, lines };
  });

  const yarns: YarnCatalog[] = [];
  await Promise.all(
    [...missingYarnIds].map(async (yarnId) => {
      try {
        const yarn = await yarnCatalogService.getYarnCatalogById(yarnId);
        if (yarn) yarns.push(yarn);
      } catch (error) {
        console.warn(`Failed to fetch yarn catalog ${yarnId}:`, error);
      }
    })
  );
  const yarnNameById = new Map(yarns.map((yarn) => [yarn.id, yarn.yarnName]));

  for (const row of pending) {
    if (!row) continue;
    const bom = row.lines.map((line) => ({
      yarnCatalogId: line.yarnCatalogId,
      quantity: line.quantity,
      yarnName: line.yarnName || yarnNameById.get(line.yarnCatalogId) || "Unknown Yarn",
    }));
    const needleSizeFromProduct =
      row.needlesRaw != null && row.needlesRaw !== "" ? String(row.needlesRaw).trim() : undefined;
    byFactoryCode.set(row.factoryCode.toLowerCase(), {
      productId: row.productId,
      needleSizeFromProduct,
      knittingCode: row.knittingCode || undefined,
      bom,
    });
  }

  return { byFactoryCode, yarns };
}
