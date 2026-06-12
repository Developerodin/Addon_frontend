"use client";

import React, { useEffect, useMemo, useState } from "react";
import { productionService } from "@/shared/services/productionService";
import { formatProductionQty } from "@/shared/utils/halfStepQuantity";

const MERGE_CASCADE_ACTION = "M2 Merged to M1 Cascade";

export interface QcM2MergeHistoryPanelProps {
  articleId: string | null | undefined;
  floorLabel: "Checking" | "Secondary Checking" | "Final Checking";
  compact?: boolean;
}

interface MergeHistoryRow {
  id: string;
  timestamp: string;
  quantity: number;
  floor: string;
  remarks: string;
  previousValue?: string | null;
  newValue?: string | null;
  userId?: string;
  source: "article" | "m2";
}

/**
 * Read-only panel showing M2→M1 merge history for a QC floor article.
 */
export default function QcM2MergeHistoryPanel({
  articleId,
  floorLabel,
  compact = false,
}: QcM2MergeHistoryPanelProps) {
  const [rows, setRows] = useState<MergeHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!articleId) {
      setRows([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [articleLogsRes, m2LogsRes] = await Promise.all([
          productionService.getArticleLogs(articleId, { limit: 100 }),
          productionService.getM2Logs({
            articleId,
            type: "MERGE_TO_M1",
            sourceFloor: floorLabel,
            limit: 50,
          }),
        ]);

        if (cancelled) return;

        const articleRows: MergeHistoryRow[] = (articleLogsRes.data?.results ?? [])
          .filter(
            (log: { action?: string; fromFloor?: string }) =>
              log.action === MERGE_CASCADE_ACTION && log.fromFloor === floorLabel
          )
          .map((log: Record<string, unknown>, index: number) => ({
            id: String(log._id ?? log.id ?? `article-${index}`),
            timestamp: String(log.timestamp ?? log.createdAt ?? ""),
            quantity: Number(log.quantity ?? 0),
            floor: String(log.fromFloor ?? floorLabel),
            remarks: String(log.remarks ?? ""),
            previousValue: (log.previousValue as string) ?? null,
            newValue: (log.newValue as string) ?? null,
            userId: String(log.userId ?? "System"),
            source: "article" as const,
          }));

        const m2Rows: MergeHistoryRow[] = (m2LogsRes.data?.results ?? []).map(
          (log, index) => ({
            id: String(log.id ?? `m2-${index}`),
            timestamp: String(log.timestamp ?? ""),
            quantity: Number(log.quantity ?? 0),
            floor: String(log.sourceFloor ?? floorLabel),
            remarks: String(log.remarks ?? ""),
            previousValue: null,
            newValue: null,
            userId: String(log.userEmail ?? log.userName ?? log.userId ?? "System"),
            source: "m2" as const,
          })
        );

        const merged = [...articleRows, ...m2Rows].sort((a, b) => {
          const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return tb - ta;
        });

        setRows(merged);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [articleId, floorLabel]);

  const uniqueRows = useMemo(() => {
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = `${row.timestamp}-${row.quantity}-${row.remarks.slice(0, 40)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rows]);

  if (!articleId) {
    return (
      <p className="text-[10px] text-gray-500 px-3 py-2" aria-live="polite">
        Select an article to view M2 merge history.
      </p>
    );
  }

  return (
    <section
      className={`rounded-md border-2 border-yellow-300 overflow-hidden ${compact ? "mb-3" : "mb-4"}`}
      aria-label="M2 to M1 merge history"
    >
      <div className="px-3 py-1.5 bg-yellow-100 border-b-2 border-yellow-300 text-[11px] font-bold text-yellow-900">
        M2 → M1 merge history ({floorLabel})
      </div>
      <div className={`p-2 ${compact ? "max-h-36" : "max-h-48"} overflow-y-auto`}>
        {loading ? (
          <p className="text-[10px] text-gray-500 py-2">Loading merge history…</p>
        ) : uniqueRows.length === 0 ? (
          <p className="text-[10px] text-gray-500 py-2">No M2→M1 merges recorded for this article on {floorLabel}.</p>
        ) : (
          <ul className="space-y-2">
            {uniqueRows.map((row) => (
              <li
                key={row.id}
                className="border border-yellow-200 rounded bg-yellow-50/40 p-2 text-[10px]"
              >
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <span className="inline-flex px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-900 font-bold">
                    +{formatProductionQty(row.quantity)} merged to M1
                  </span>
                  <time className="text-gray-500">
                    {row.timestamp ? new Date(row.timestamp).toLocaleString() : "—"}
                  </time>
                </div>
                {row.previousValue && row.newValue ? (
                  <p className="text-gray-800 font-medium">
                    Before: {row.previousValue} → After: {row.newValue}
                  </p>
                ) : null}
                {row.remarks ? (
                  <p className="text-gray-600 mt-0.5 truncate" title={row.remarks}>
                    {row.remarks}
                  </p>
                ) : null}
                <p className="text-gray-400 mt-0.5">By: {row.userId}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export { MERGE_CASCADE_ACTION };
