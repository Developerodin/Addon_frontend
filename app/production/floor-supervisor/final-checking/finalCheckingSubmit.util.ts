import type { Article, ArticleProcess } from "@/shared/services/productionService";
import type { BrandTransferLine } from "@/shared/utils/brandTransfer.util";
import {
  articleHasFloorInProcess,
  formatProcessFlowLabel,
  type LinkingType,
} from "@/shared/utils/productionUtils";

/** Fetch product processes for articles missing them on the floor-order payload. */
export async function ensureArticlesHaveProcesses(
  articles: Article[],
  fetchProcesses: (articleId: string) => Promise<ArticleProcess[] | null>
): Promise<Article[]> {
  const enriched = await Promise.all(
    articles.map(async (article) => {
      if (article.processes?.length) return article;
      const articleId = article._id ?? article.id;
      if (!articleId) return article;
      const processes = await fetchProcesses(articleId);
      if (!processes?.length) return article;
      return { ...article, processes };
    })
  );
  return enriched;
}

/** Snapshot of a successful article update for compensation / revert. */
export type FinalCheckingSubmitSnapshot = {
  articleId: string;
  transferItems: BrandTransferLine[];
  m1Quantity: number;
  m2Quantity: number;
  m3Quantity: number;
  m4Quantity: number;
};

type UpdateDataEntry = {
  remarks: string;
  m1Quantity: number;
  m2Quantity: number;
  m3Quantity: number;
  m4Quantity: number;
  repairStatus: "Not Required" | "In Review" | "Repaired" | "Rejected";
  repairRemarks: string;
  transferItems: Array<{ transferred: number; styleCode?: string; brand?: string }>;
};

type TransferM2M3M4Entry = { m2: number; m3: number; m4: number };

/**
 * Resolve which articles are in scope for submit (drawer filter or explicit list).
 */
export function resolveArticlesToSubmit(
  orderArticles: Article[],
  selectedArticleId: string | null,
  explicit?: Article[]
): Article[] {
  if (explicit?.length) return explicit;
  if (selectedArticleId) {
    return orderArticles.filter((a) => (a.id ?? a._id) === selectedArticleId);
  }
  return orderArticles;
}

/**
 * Returns an error message when an article with pending changes is not on Final Checking process flow.
 */
export function validateFinalCheckingProcessFlow(
  articles: Article[],
  updateData: Record<string, UpdateDataEntry | undefined>,
  transferM2M3M4: Record<string, TransferM2M3M4Entry | undefined>,
  getTransferTotal: (items: Array<{ transferred?: number }>) => number
): string | null {
  for (const article of articles) {
    const articleId = article.id ?? article._id;
    if (!articleId) continue;
    const update = updateData[articleId];
    if (!update) continue;

    const transferTotal = getTransferTotal(update.transferItems ?? []);
    const transfer = transferM2M3M4[articleId];
    const m1QcDelta = transferTotal > 0 ? transferTotal : (update.m1Quantity ?? 0);
    const m2Delta = transfer?.m2 ?? 0;
    const m3Delta = transfer?.m3 ?? 0;
    const m4Delta = transfer?.m4 ?? 0;
    const hasQtyChange = m1QcDelta > 0 || m2Delta > 0 || m3Delta > 0 || m4Delta > 0;
    const hasTransfer = transferTotal > 0;
    const hasOtherChange =
      update.remarks !== (article.remarks || "") ||
      update.repairStatus !== (article.repairStatus || "Not Required") ||
      update.repairRemarks !== (article.repairRemarks || "");

    if (!hasQtyChange && !hasTransfer && !hasOtherChange) continue;

    const linkingType = article.linkingType as LinkingType | undefined;
    if (!articleHasFloorInProcess(article.processes, "Final Checking", linkingType)) {
      const flow = formatProcessFlowLabel(article.processes, linkingType);
      const flowHint =
        flow === "unknown"
          ? "Could not load product process — refresh and retry, or check product setup for this factory code"
          : flow;
      return `${article.articleNumber ?? articleId}: Final Checking is not in this product's process flow. Expected flow: ${flowHint}`;
    }
  }
  return null;
}
