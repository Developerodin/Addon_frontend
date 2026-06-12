"use client";

import React, { useEffect, useMemo, useState } from "react";
import NumericInput from "@/shared/utils/numericInput";
import BrandTransferItemsInput from "@/shared/components/production/BrandTransferItemsInput";
import {
  productionService,
  type M2EntryRow,
  type ProductionArticleDetail,
  type TransferItem,
} from "@/shared/services/productionService";
import {
  articleRequiresM2MergeBrand,
  buildBrandOptionsFromRows,
  collapseLinesByBrand,
  formatBrandLine,
  toBrandOnlyTransferItems,
  validateBrandTransferItems,
  type BrandTransferLine,
} from "@/shared/utils/brandTransfer.util";
import {
  CANONICAL_FLOOR_TO_KEY,
  getApplicableFloorKeysFromProcesses,
  type LinkingType,
} from "@/shared/utils/productionUtils";

export type M2ResolveAction = "merge" | "m3" | "m4";

export interface M2ResolveDrawerProps {
  entry: M2EntryRow;
  action: M2ResolveAction;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (quantity: number, remarks: string, transferItems?: TransferItem[]) => Promise<void>;
}

const ACTION_LABELS: Record<M2ResolveAction, { title: string; hint: string; btn: string }> = {
  merge: {
    title: "Merge M2 → M1 (cascade)",
    hint: "Adds qty to M1 on source floor and all downstream floors through Dispatch.",
    btn: "Confirm merge",
  },
  m3: {
    title: "Transfer M2 → M3",
    hint: "Moves qty from M2 to M3 on the source QC floor only.",
    btn: "Transfer to M3",
  },
  m4: {
    title: "Transfer M2 → M4",
    hint: "Moves qty from M2 to M4 on the source QC floor only.",
    btn: "Transfer to M4",
  },
};

const KEY_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(CANONICAL_FLOOR_TO_KEY).map(([label, key]) => [key, label])
);

/**
 * Build cascade floor labels from article processes (mirrors backend getCascadeFloorsForM2Merge).
 */
function buildM2MergeCascadeFloors(
  processes: { name: string }[],
  linkingType: LinkingType | undefined,
  sourceFloor: string
): string[] {
  const floorKeys = getApplicableFloorKeysFromProcesses(processes, linkingType);
  const floorOrder = floorKeys.map((key) => KEY_TO_LABEL[key]).filter(Boolean);
  const sourceIdx = floorOrder.indexOf(sourceFloor);
  if (sourceIdx === -1) return [];
  const dispatchIdx = floorOrder.indexOf("Dispatch");
  const endIdx = dispatchIdx === -1 ? floorOrder.length - 1 : dispatchIdx;
  return floorOrder.slice(sourceIdx, endIdx + 1);
}

/**
 * Drawer to resolve an open M2 entry (merge cascade or transfer to M3/M4).
 */
export default function M2ResolveDrawer({
  entry,
  action,
  isSubmitting = false,
  onClose,
  onSubmit,
}: M2ResolveDrawerProps) {
  const maxQty = entry.remainingQuantity ?? entry.quantity;
  const [quantity, setQuantity] = useState(maxQty > 0 ? maxQty : 0);
  const [remarks, setRemarks] = useState("");
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [article, setArticle] = useState<ProductionArticleDetail | null>(null);
  const [processNames, setProcessNames] = useState<string[]>([]);
  const [linkingType, setLinkingType] = useState<LinkingType | undefined>();
  const [isLoadingBrandContext, setIsLoadingBrandContext] = useState(false);
  const labels = ACTION_LABELS[action];

  useEffect(() => {
    if (action !== "merge") return;
    let cancelled = false;

    const loadBrandContext = async () => {
      setIsLoadingBrandContext(true);
      try {
        const [articleRes, processesRes] = await Promise.all([
          productionService.getArticle(entry.articleId),
          productionService.getArticleProcesses(entry.articleId),
        ]);
        if (cancelled) return;
        if (articleRes.success && articleRes.data) {
          setArticle(articleRes.data);
          const lt = (articleRes.data as { linkingType?: LinkingType }).linkingType;
          if (lt) setLinkingType(lt);
        }
        if (processesRes.success && processesRes.data?.processes) {
          setProcessNames(processesRes.data.processes.map((p) => p.name));
        }
      } catch (err) {
        console.error("Failed to load brand context for M2 merge", err);
      } finally {
        if (!cancelled) setIsLoadingBrandContext(false);
      }
    };

    void loadBrandContext();
    return () => {
      cancelled = true;
    };
  }, [action, entry.articleId]);

  const cascadeFloors = useMemo(
    () => buildM2MergeCascadeFloors(processNames.map((n) => ({ name: n })), linkingType, entry.sourceFloor ?? ""),
    [processNames, linkingType, entry.sourceFloor]
  );

  const brandRequired = useMemo(
    () => action === "merge" && articleRequiresM2MergeBrand(article, cascadeFloors, processNames),
    [action, article, cascadeFloors, processNames]
  );

  const { options: brandOptions, brandMaxQuantities } = useMemo(() => {
    const fc = article?.floorQuantities?.finalChecking;
    const receivedData = (fc?.receivedData as BrandTransferLine[]) ?? [];
    const transferredData = (fc?.transferredData as BrandTransferLine[]) ?? [];
    return buildBrandOptionsFromRows(receivedData, transferredData);
  }, [article]);

  const receivedBrandText = useMemo(() => {
    const fc = article?.floorQuantities?.finalChecking;
    const receivedData = (fc?.receivedData as BrandTransferLine[]) ?? [];
    const collapsed = collapseLinesByBrand(receivedData);
    if (collapsed.length === 0) return "—";
    return collapsed.map(formatBrandLine).join("; ");
  }, [article]);

  const brandValidation = useMemo(
    () => validateBrandTransferItems(transferItems, quantity, brandMaxQuantities),
    [transferItems, quantity, brandMaxQuantities]
  );

  const brandSplitValid =
    !brandRequired ||
    (brandValidation.valid && brandValidation.total === quantity && quantity > 0);

  const handleSubmit = async () => {
    if (quantity <= 0 || quantity > maxQty) return;
    if (!remarks.trim()) return;
    if (brandRequired && !brandSplitValid) return;
    const items = brandRequired ? toBrandOnlyTransferItems(transferItems) : undefined;
    await onSubmit(quantity, remarks.trim(), items);
  };

  const canSubmit =
    !isSubmitting &&
    quantity > 0 &&
    quantity <= maxQty &&
    remarks.trim().length > 0 &&
    brandSplitValid &&
    !isLoadingBrandContext;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true" />
      <aside
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l-2 border-yellow-300"
        role="dialog"
        aria-labelledby="m2-resolve-title"
        aria-modal="true"
      >
        <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-yellow-50">
          <h2 id="m2-resolve-title" className="text-sm font-bold text-yellow-900">
            {labels.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-lg leading-none"
            aria-label="Close resolve drawer"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-[11px] text-gray-700 space-y-1">
            <p><span className="font-semibold">Entry:</span> {entry.entryId}</p>
            <p><span className="font-semibold">Order:</span> {entry.orderNumber}</p>
            <p><span className="font-semibold">Article:</span> {entry.articleNumber}</p>
            <p><span className="font-semibold">Source floor:</span> {entry.sourceFloor}</p>
            <p>
              <span className="font-semibold">Remaining:</span>{" "}
              <span className="text-yellow-800 font-bold">{maxQty}</span>
            </p>
            <p className="text-[10px] text-yellow-800 mt-2">{labels.hint}</p>
          </div>

          <div>
            <label htmlFor="m2-resolve-qty" className="block text-[11px] font-bold text-gray-800 mb-1">
              Quantity
            </label>
            <NumericInput
              id="m2-resolve-qty"
              className="w-full py-2 px-3 text-sm border-2 border-yellow-200 rounded"
              value={quantity}
              min={0}
              max={maxQty}
              onChange={setQuantity}
              allowDecimals
              aria-label="Resolve quantity"
            />
          </div>

          {action === "merge" && brandRequired && (
            <div className="rounded border-2 border-green-200 bg-green-50/40 p-3 space-y-2">
              <p className="text-[11px] font-bold text-green-900">Allocate merged qty by brand</p>
              <p className="text-[10px] text-green-800">
                Merged M2 becomes M1 already transferred — assign which brand this repaired qty belongs to.
              </p>
              <p className="text-[10px] text-gray-600">
                <span className="font-semibold">Received breakdown:</span> {receivedBrandText}
              </p>
              {isLoadingBrandContext ? (
                <p className="text-[10px] text-gray-500">Loading brand options…</p>
              ) : (
                <BrandTransferItemsInput
                  value={transferItems}
                  onChange={setTransferItems}
                  maxTotal={quantity}
                  brandOptions={brandOptions}
                  brandMaxQuantities={brandMaxQuantities}
                  placeholder="Enter brand split for merge qty"
                />
              )}
              {transferItems.length > 0 && brandValidation.total !== quantity && (
                <p className="text-[10px] text-red-600 font-medium">
                  Brand total ({brandValidation.total}) must equal merge quantity ({quantity})
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="m2-resolve-remarks" className="block text-[11px] font-bold text-gray-800 mb-1">
              Remarks <span className="text-yellow-700">*</span>
            </label>
            <textarea
              id="m2-resolve-remarks"
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full py-2 px-3 text-sm border-2 border-gray-300 rounded resize-y min-h-[80px]"
              placeholder="Repair completed offline / reason for transfer"
              aria-required="true"
            />
          </div>
        </div>

        <footer className="p-4 border-t border-gray-200 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-sm font-bold border-2 border-gray-300 rounded text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className="flex-1 py-2 text-sm font-bold bg-yellow-500 text-yellow-950 rounded border-2 border-yellow-600 disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : labels.btn}
          </button>
        </footer>
      </aside>
    </>
  );
}
