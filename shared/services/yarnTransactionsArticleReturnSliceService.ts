import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";

function getAuthHeaders(): HeadersInit {
  const token =
    (typeof document !== "undefined" && (Cookies.get("accessToken") || localStorage.getItem("token"))) || null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Cone row from GET .../article-return-slice (backend-merged issuance vs returns). */
export interface ArticleReturnSliceCone {
  id: string;
  barcode?: string;
  yarnName?: string;
  status: "Awaiting" | "Returned";
  articleId?: string;
  articleNumber?: string;
}

/** Payload from GET .../yarn-transactions/article-return-slice. */
export interface ArticleReturnSliceResponse {
  orderId: string;
  productionOrder: string;
  floor: string;
  knittingCompletedAt: string | null;
  knittingSupervisor: string;
  articleId: string;
  articleNumber: string;
  yarnNames: string;
  status: "None" | "Awaiting" | "Partial" | "Returned";
  pendingConeCount: number;
  returnedConeCount: number;
  cones: ArticleReturnSliceCone[];
}

export type FetchArticleReturnSliceParams = {
  orderId: string;
  articleId?: string;
  articleNumber?: string;
};

/** Backend only accepts a real Mongo ObjectId for `article_id`; assignment APIs sometimes put article *codes* in id fields. */
const MONGO_OBJECT_ID = /^[a-f0-9]{24}$/i;

function looksLikeMongoObjectId(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  return MONGO_OBJECT_ID.test(value.trim());
}

/**
 * Single read: issuance + return streams for one production order + article, with merged cones and counts.
 * GET /yarn-management/yarn-transactions/article-return-slice
 */
export async function fetchArticleReturnSlice(
  params: FetchArticleReturnSliceParams
): Promise<ArticleReturnSliceResponse> {
  const { orderId, articleId, articleNumber } = params;
  const aid = articleId?.trim();
  const anum = articleNumber?.trim();

  const idParam = aid && looksLikeMongoObjectId(aid) ? aid : undefined;
  const codeLikeId = aid && !looksLikeMongoObjectId(aid) ? aid : undefined;
  const numberParam = anum || codeLikeId;

  if (!idParam && !numberParam) {
    throw new Error("article_id or article_number is required for article-return-slice");
  }

  const search = new URLSearchParams({ order_id: orderId });
  if (idParam) search.set("article_id", idParam);
  if (numberParam) search.set("article_number", numberParam);

  const res = await fetch(
    `${API_BASE_URL}/yarn-management/yarn-transactions/article-return-slice?${search.toString()}`,
    { method: "GET", headers: getAuthHeaders() }
  );
  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message?: string }).message)
        : `article-return-slice failed (${res.status})`;
    throw new Error(msg);
  }
  return data as ArticleReturnSliceResponse;
}
