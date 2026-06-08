"use client";

import React, { useEffect, useState } from "react";
import {
  fetchYarnQcLotHistoryForPo,
  type YarnQcLotHistoryRecord,
} from "../../yarnQcHistoryService";
import {
  formatLotStatus,
  formatQcStatus,
  lotStatusColor,
  qcStatusColor,
} from "../../yarnQcHistoryDisplay";

export interface YarnQcLotHistorySectionProps {
  orderId: string;
  poNumber: string;
}

/**
 * Per-lot QC history: inspector, date, remarks, and attachment links for one PO.
 */
export function YarnQcLotHistorySection({ orderId, poNumber }: YarnQcLotHistorySectionProps) {
  const [records, setRecords] = useState<YarnQcLotHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchYarnQcLotHistoryForPo(orderId, poNumber)
      .then((data) => {
        if (!cancelled) setRecords(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRecords([]);
          setError(err instanceof Error ? err.message : "Failed to load QC history");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, poNumber]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 border-t border-gray-100 p-[10px] text-[11px] text-gray-500">
        <i className="ri-loader-4-line animate-spin" aria-hidden />
        Loading QC history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-t border-gray-100 p-[10px]" role="alert">
        <p className="text-[11px] font-bold text-red-700">Could not load QC history</p>
        <p className="text-[11px] text-red-600">{error}</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="border-t border-gray-100 p-[10px] text-center">
        <i className="ri-history-line mb-2 text-3xl text-gray-300" aria-hidden />
        <p className="text-[11px] text-gray-500">No QC records found for this PO yet.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 p-[10px]">
      <h3 className="mb-3 text-xs font-bold text-gray-800">
        QC History ({records.length} lot{records.length !== 1 ? "s" : ""})
      </h3>
      <ul className="space-y-3">
        {records.map((lot) => (
          <li key={lot.lotNumber} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-gray-900">Lot {lot.lotNumber}</span>
              <span
                className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${lotStatusColor(lot.lotStatus)}`}
              >
                {formatLotStatus(lot.lotStatus)}
              </span>
              <span
                className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${qcStatusColor(lot.qcStatus)}`}
              >
                {formatQcStatus(lot.qcStatus)}
              </span>
              <span className="text-[10px] text-gray-400">{lot.boxCount} box(es)</span>
            </div>

            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wide text-gray-400">QC by</dt>
                <dd className="text-[11px] font-medium text-gray-800">{lot.qcBy}</dd>
              </div>
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wide text-gray-400">QC date</dt>
                <dd className="text-[11px] font-medium text-gray-800">
                  {lot.qcDate ? new Date(lot.qcDate).toLocaleString("en-IN") : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Remarks</dt>
                <dd className="whitespace-pre-wrap text-[11px] text-gray-700">{lot.remarks}</dd>
              </div>
            </dl>

            {lot.media.length > 0 && (
              <div className="mt-3 border-t border-gray-200 pt-2">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-gray-400">
                  Attachments
                </p>
                <ul className="flex flex-wrap gap-2">
                  {lot.media.map((item) => (
                    <li key={`${lot.lotNumber}-${item.key}`}>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-purple-700 hover:bg-purple-50"
                      >
                        <i
                          className={item.type === "video" ? "ri-video-line" : "ri-image-line"}
                          aria-hidden
                        />
                        {item.key}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
