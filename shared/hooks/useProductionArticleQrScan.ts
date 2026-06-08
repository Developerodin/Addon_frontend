"use client";

import { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import type { ProductionOrder } from "@/shared/services/productionService";
import { productionService } from "@/shared/services/productionService";
import { parseProductionArticleQr } from "@/shared/utils/productionArticleQr";
import {
  resolveProductionArticleQrScan,
  type ArticleQrScanFeedback,
} from "@/shared/utils/productionArticleQrScanFlow";
import type { ProductionArticleFloorKey } from "@/shared/utils/productionArticleQr";

const FLOOR_ORDER_LOOKUP_LIMIT = 2000;

export interface UseProductionArticleQrScanOptions {
  /** API path floor name, e.g. `Linking`, `Final Checking`. */
  floorApiName: string;
  floorKey: ProductionArticleFloorKey;
  floorLabel: string;
  /** Filter orders for article-view lookup (usually received > 0). */
  filterOrdersForLookup: (orders: ProductionOrder[]) => ProductionOrder[];
  /** Updates the wide floor order catalog (not the orders-tab page slice). */
  setFloorOrderCatalog: React.Dispatch<React.SetStateAction<ProductionOrder[]>>;
  setShowAllArticles: (show: boolean) => void;
  /** Called when scan finds article (e.g. set activeArticleId, highlight row). */
  onArticleFound?: (articleId: string) => void;
  /** Switch UI to article tab after successful scan. */
  goToArticleView?: () => void;
}

/**
 * Shared QR label scan state + handler for production floor supervisor pages.
 */
export function useProductionArticleQrScan({
  floorApiName,
  floorKey,
  floorLabel,
  filterOrdersForLookup,
  setFloorOrderCatalog,
  setShowAllArticles,
  onArticleFound,
  goToArticleView,
}: UseProductionArticleQrScanOptions) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<ArticleQrScanFeedback | null>(null);
  const [qrPinnedArticleOrders, setQrPinnedArticleOrders] = useState<ProductionOrder[] | null>(
    null
  );

  const clearQrPin = useCallback(() => {
    setQrPinnedArticleOrders(null);
  }, []);

  /**
   * Patches articles inside the QR-pinned catalog slice (when scan filter is active).
   */
  const patchQrPinnedArticles = useCallback(
    (patch: (articles: ProductionOrder["articles"]) => ProductionOrder["articles"]) => {
      setQrPinnedArticleOrders((prev) =>
        prev
          ? prev.map((order) => ({
              ...order,
              articles: patch(order.articles),
            }))
          : prev
      );
    },
    []
  );

  const openDrawer = useCallback(() => {
    setFeedback(null);
    setShowDrawer(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setShowDrawer(false);
    setFeedback(null);
  }, []);

  const handleScan = useCallback(
    async (raw: string): Promise<ArticleQrScanFeedback> => {
      setLoading(true);
      setFeedback({ type: "info", message: `Loading ${floorLabel} orders…` });
      try {
        const response = await productionService.getFloorOrders(
          floorApiName,
          { page: 1, limit: FLOOR_ORDER_LOOKUP_LIMIT },
          { cache: "no-store" }
        );

        if (!response.success) {
          const message =
            response.error?.message ??
            `Could not load ${floorLabel} orders. Check API connection and try again.`;
          setFeedback({ type: "error", message });
          toast.error(message, { duration: 6000 });
          return { type: "error", message };
        }

        const allOrders = response.data.results ?? [];
        if (allOrders.length === 0) {
          const message = `No orders returned for ${floorLabel}. The article may not be on this floor yet.`;
          setFeedback({ type: "error", message });
          toast.error(message, { duration: 6000 });
          return { type: "error", message };
        }

        setFloorOrderCatalog(allOrders);
        const lookupOrders = filterOrdersForLookup(allOrders);
        const resolved = resolveProductionArticleQrScan(
          raw,
          allOrders,
          lookupOrders,
          floorKey,
          floorLabel
        );

        setFeedback(resolved.feedback);

        if (resolved.status !== "found") {
          toast.error(resolved.feedback.message, { duration: 6000 });
          return resolved.feedback;
        }

        setQrPinnedArticleOrders(resolved.singleArticleOrders);
        setShowAllArticles(true);
        goToArticleView?.();
        const articleId = String(resolved.article._id ?? resolved.article.id);
        onArticleFound?.(articleId);
        toast.success(resolved.feedback.message, { duration: 4000 });
        window.setTimeout(() => setShowDrawer(false), 500);
        return resolved.feedback;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to look up article from QR scan.";
        const fb: ArticleQrScanFeedback = { type: "error", message };
        setFeedback(fb);
        toast.error(message, { duration: 6000 });
        return fb;
      } finally {
        setLoading(false);
      }
    },
    [
      floorApiName,
      floorKey,
      floorLabel,
      filterOrdersForLookup,
      setFloorOrderCatalog,
      setShowAllArticles,
      onArticleFound,
      goToArticleView,
    ]
  );

  /**
   * If raw value is a PA| QR, run full scan flow; otherwise return false.
   */
  const tryScanFromContainerInput = useCallback(
    async (raw: string): Promise<boolean> => {
      if (!parseProductionArticleQr(raw.trim())) return false;
      await handleScan(raw);
      return true;
    },
    [handleScan]
  );

  return {
    showDrawer,
    loading,
    feedback,
    qrPinnedArticleOrders,
    openDrawer,
    closeDrawer,
    handleScan,
    clearQrPin,
    patchQrPinnedArticles,
    tryScanFromContainerInput,
    floorLabel,
  };
}
