"use client";
import React from "react";
import {
  BoxInSlot,
  ConeInSlot,
  StorageSlot,
} from "@/shared/services/storageSlotService";
import {
  SlotReportSummary,
  computeBoxSummary,
  computeConeSummary,
} from "../utils/storageReportUtils";
import {
  formatWeightKgCell,
  resolveBoxGrossWeightKg,
  resolveBoxNetWeightKg,
  resolveConeNetWeightKg,
} from "../utils/boxWeightDisplay";

type ReportView = "summary" | "full";

interface StorageReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: StorageSlot | null;
  boxes?: BoxInSlot[];
  cones?: ConeInSlot[];
  dataType: "boxes" | "cones";
  zoneType: string;
  view: ReportView;
}

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const StorageReportModal: React.FC<StorageReportModalProps> = ({
  isOpen,
  onClose,
  slot,
  boxes = [],
  cones = [],
  dataType,
  zoneType,
  view,
}) => {
  if (!isOpen) return null;

  const summary: SlotReportSummary =
    dataType === "boxes" ? computeBoxSummary(boxes) : computeConeSummary(cones);

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[61]">
        <div
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h3 className="text-sm font-bold text-gray-800">
              {view === "summary" ? "Report Summary" : "Full Report"} — {slot?.label}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1"
              aria-label="Close"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {view === "summary" ? (
              <>
                <div className="bg-primary/5 border border-primary/10 rounded p-4">
                  <h4 className="text-[11px] font-bold text-primary uppercase tracking-widest mb-3">
                    Overall Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[9px] font-bold text-gray-600 uppercase">
                        Total {dataType === "boxes" ? "Boxes" : "Cones"}
                      </label>
                      <div className="text-lg font-bold text-gray-900 mt-0.5">
                        {summary.totalItems}
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-600 uppercase">
                        Total Weight
                      </label>
                      <div className="text-lg font-bold text-gray-900 mt-0.5">
                        {summary.totalWeight.toFixed(2)}{" "}
                        <span className="text-xs font-bold text-gray-600">kg</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-600 uppercase">
                        Yarn Types
                      </label>
                      <div className="text-lg font-bold text-gray-900 mt-0.5">
                        {summary.yarnTypesCount}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded overflow-hidden">
                  <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-widest px-4 py-3 border-b bg-gray-50">
                    Yarn Breakdown
                  </h4>
                  <table className="w-full text-[10px]">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">
                          Yarn Name
                        </th>
                        <th className="px-3 py-2 text-right font-bold text-gray-600 uppercase">
                          Count
                        </th>
                        <th className="px-3 py-2 text-right font-bold text-gray-600 uppercase">
                          Weight (kg)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.yarnBreakdown.map((y, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                        >
                          <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[200px]" title={y.yarnName}>
                            {y.yarnName}
                          </td>
                          <td className="px-3 py-2 text-right font-bold">{y.count}</td>
                          <td className="px-3 py-2 text-right font-bold">
                            {y.weight.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-[10px] text-gray-600">
                  Rack: {slot?.label} | Zone: {zoneType} |{" "}
                  {dataType === "boxes"
                    ? `${boxes.length} boxes`
                    : `${cones.length} cones`}
                </div>
                {dataType === "boxes" ? (
                  <div className="overflow-x-auto border border-gray-200 rounded">
                    <table className="w-full text-[10px]">
                      <thead className="bg-gray-50/80 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">
                            Box ID
                          </th>
                          <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">
                            PO & Yarn
                          </th>
                          <th className="px-3 py-2 text-right font-bold text-gray-600 uppercase">
                            Gross (kg)
                          </th>
                          <th className="px-3 py-2 text-right font-bold text-gray-600 uppercase">
                            Net (kg)
                          </th>
                          <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">
                            Cones
                          </th>
                          <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {boxes.map((b, i) => (
                          <tr
                            key={b._id || i}
                            className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 font-mono">{b.boxId}</td>
                            <td className="px-3 py-2">
                              <div className="font-semibold text-primary">{b.poNumber}</div>
                              <div className="text-gray-700 truncate max-w-[150px]" title={b.yarnName}>
                                {b.yarnName}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums">
                              {formatWeightKgCell(resolveBoxGrossWeightKg(b), 2)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums">
                              {formatWeightKgCell(resolveBoxNetWeightKg(b), 2)}
                            </td>
                            <td className="px-3 py-2">{b.numberOfCones}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {formatDateTime(b.receivedDate).split(",")[0]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded">
                    <table className="w-full text-[10px]">
                      <thead className="bg-gray-50/80 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">
                            Barcode
                          </th>
                          <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">
                            Box & PO
                          </th>
                          <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">
                            Yarn
                          </th>
                          <th className="px-3 py-2 text-right font-bold text-gray-600 uppercase">
                            Gross (kg)
                          </th>
                          <th className="px-3 py-2 text-right font-bold text-gray-600 uppercase">
                            Net (kg)
                          </th>
                          <th className="px-3 py-2 text-left font-bold text-gray-600 uppercase">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cones.map((c, i) => (
                          <tr
                            key={c._id || i}
                            className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 font-mono">{c.barcode}</td>
                            <td className="px-3 py-2">
                              <div className="font-bold">{c.boxId}</div>
                              <div className="text-primary text-[9px]">{c.poNumber}</div>
                            </td>
                            <td className="px-3 py-2 text-gray-700 truncate max-w-[120px]" title={c.yarnName}>
                              {c.yarnName}
                            </td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums">
                              {formatWeightKgCell(c.coneWeight, 2)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums">
                              {formatWeightKgCell(resolveConeNetWeightKg(c), 2)}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {formatDateTime(c.createdAt).split(",")[0]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-200 shrink-0">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageReportModal;
