"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  whmsWebsiteOrderSync,
  type WarehouseOrder,
} from "@/shared/services/whmsWebsiteOrderSyncService";
import {
  clientEditHref,
  tradeFieldLabels,
} from "@/app/warehouse-management/clients/components/tradeClientCompleteness";

type Props = {
  order: WarehouseOrder;
  onSynced?: () => void;
};

/**
 * Website sync status panel for addonweb-sourced Trade orders.
 */
export default function WebsiteSyncPanel({ order, onSynced }: Props) {
  const [pushing, setPushing] = useState(false);
  const meta = (order.meta || {}) as Record<string, unknown>;
  const syncErrors = Array.isArray(meta.syncErrors) ? meta.syncErrors : [];
  const clientIncomplete = Array.isArray(meta.clientIncompleteFields)
    ? (meta.clientIncompleteFields as string[])
    : [];
  const clientCreated = Boolean(meta.clientCreated);
  const clientId = String(meta.warehouseClientId || order.clientId || "").trim();
  const lastPushAt = meta.lastWebsitePushAt
    ? new Date(String(meta.lastWebsitePushAt)).toLocaleString()
    : "—";
  const lastError = String(meta.lastWebsitePushError || "").trim();
  const opencartOrderId = meta.opencartOrderId ?? "—";

  const handleRetry = async () => {
    setPushing(true);
    try {
      await whmsWebsiteOrderSync.retryPush(order.id);
      toast.success("Website sync push queued");
      onSynced?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry push failed");
    } finally {
      setPushing(false);
    }
  };

  return (
    <section
      className="border border-sky-100 rounded-lg bg-sky-50/40 p-3"
      aria-label="Website sync status"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-4 bg-sky-600 rounded-full" />
          <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
            Website Sync
          </h4>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-800">
            Web
          </span>
        </div>
        <button
          type="button"
          onClick={() => void handleRetry()}
          disabled={pushing}
          className="flex items-center gap-1 px-2.5 py-1 bg-sky-600 text-white text-[10px] font-bold rounded hover:bg-sky-700 disabled:opacity-50"
          aria-label="Retry website sync push"
        >
          {pushing ? (
            <i className="ri-loader-4-line animate-spin text-xs" aria-hidden />
          ) : (
            <i className="ri-refresh-line text-xs" aria-hidden />
          )}
          Retry push
        </button>
      </div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12 sm:col-span-6 border border-gray-200 rounded px-3 py-2 bg-white">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
            OpenCart order ID
          </div>
          <div className="text-[12px] font-medium text-gray-800">{String(opencartOrderId)}</div>
        </div>
        <div className="col-span-12 sm:col-span-6 border border-gray-200 rounded px-3 py-2 bg-white">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
            Last push
          </div>
          <div className="text-[12px] font-medium text-gray-800">{lastPushAt}</div>
        </div>

        <div className="col-span-12 border border-violet-100 rounded px-3 py-2 bg-violet-50/50">
          <div className="text-[10px] font-bold text-violet-800 uppercase tracking-wide mb-1">
            Client sync
          </div>
          <div className="text-[11px] text-gray-700 space-y-1">
            <p>
              Auto-created:{" "}
              <span className="font-semibold">{clientCreated ? "Yes" : "No (existing client)"}</span>
            </p>
            {clientIncomplete.length > 0 ? (
              <p className="text-amber-800">
                Missing: {tradeFieldLabels(clientIncomplete).join(", ")}
              </p>
            ) : (
              <p className="text-emerald-700 font-medium">Client profile complete</p>
            )}
          </div>
          {clientId && clientIncomplete.length > 0 && (
            <Link
              href={clientEditHref(clientId, order.id)}
              className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-amber-600 text-white text-[10px] font-bold rounded hover:bg-amber-700"
              aria-label="Complete client profile"
            >
              <i className="ri-user-settings-line text-xs" aria-hidden />
              Complete client profile
            </Link>
          )}
        </div>

        <div className="col-span-12 border border-gray-200 rounded px-3 py-2 bg-white">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
            Last sync error
          </div>
          <div className={`text-[12px] font-medium break-words ${lastError ? "text-red-700" : "text-gray-800"}`}>
            {lastError || "—"}
          </div>
        </div>
        {syncErrors.length > 0 && (
          <div className="col-span-12 border border-amber-200 rounded px-3 py-2 bg-amber-50">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1">
              Ingest mapping errors ({syncErrors.length})
            </div>
            <ul className="text-[11px] text-amber-900 space-y-0.5 list-disc pl-4">
              {syncErrors.slice(0, 5).map((err, idx) => {
                const row = err as { model?: string; reason?: string };
                return (
                  <li key={`sync-err-${idx}`}>
                    {row.model || "?"} — {row.reason || "error"}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
