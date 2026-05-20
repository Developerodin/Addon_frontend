"use client";
import React from "react";
import { TrackerTimelineEvent } from "@/shared/services/yarnTrackerService";

interface TrackerTimelineProps {
  events: TrackerTimelineEvent[];
  emptyMessage?: string;
}

/** Human-readable labels for timeline detail keys (hide raw Mongo ids). */
const DETAIL_LABELS: Record<string, string> = {
  productionOrder: "Production order",
  articleCode: "Article",
  orderStatus: "Order status",
  currentFloor: "Current floor",
  articleStatus: "Article status",
  plannedQty: "Planned qty",
  issueStatus: "Issue status",
  issueWeight: "Issue weight (kg)",
  returnWeight: "Return weight (kg)",
  returnStatus: "Return status",
  remainingWeight: "Remaining weight (kg)",
  coneWeight: "Cone weight (kg)",
  tearWeight: "Tear weight (kg)",
  netWeight: "Net weight (kg)",
  fromStorageLocation: "From location",
  toStorageLocation: "To location",
  issuedByEmail: "Issued by",
  coneStorageId: "Storage rack",
};

const HIDDEN_DETAIL_KEYS = new Set(["orderId", "articleId", "orderno", "articleNumber"]);

/**
 * @param {string} key
 */
function detailLabel(key: string): string {
  if (DETAIL_LABELS[key]) return DETAIL_LABELS[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/**
 * Vertical timeline for box/cone tracker events.
 */
const TrackerTimeline: React.FC<TrackerTimelineProps> = ({
  events,
  emptyMessage = "No history events yet.",
}) => {
  if (!events.length) {
    return <p className="text-sm text-gray-500 py-4">{emptyMessage}</p>;
  }

  return (
    <ol className="relative border-s border-gray-200 ms-3 space-y-4" aria-label="History timeline">
      {events.map((ev) => (
        <li key={ev.id} className="ms-4">
          <span
            className="absolute -start-1.5 mt-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-purple-600 ring-4 ring-white"
            aria-hidden
          />
          <time className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            {ev.at ? new Date(ev.at).toLocaleString() : "—"}
          </time>
          <h4 className="text-sm font-semibold text-gray-900 mt-0.5">{ev.title}</h4>
          {ev.details && Object.keys(ev.details).length > 0 ? (
            <dl className="mt-1 text-xs text-gray-600 grid grid-cols-1 gap-0.5">
              {Object.entries(ev.details)
                .filter(
                  ([key, v]) =>
                    !HIDDEN_DETAIL_KEYS.has(key) && v != null && v !== ""
                )
                .map(([key, value]) => (
                  <div key={key} className="flex gap-2 flex-wrap">
                    <dt className="font-medium text-gray-500 shrink-0">
                      {detailLabel(key)}:
                    </dt>
                    <dd className="text-gray-800 break-all">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </dd>
                  </div>
                ))}
            </dl>
          ) : null}
        </li>
      ))}
    </ol>
  );
};

export default TrackerTimeline;
