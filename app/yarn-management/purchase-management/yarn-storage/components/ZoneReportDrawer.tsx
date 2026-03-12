"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import storageSlotService, {
  BoxInSlot,
  ConeInSlot,
} from "@/shared/services/storageSlotService";

interface ZoneReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  zoneType: "LT" | "ST";
  zoneLabel: string;
}

/** Box with rack info for report */
interface BoxWithRack extends BoxInSlot {
  rackCode?: string;
  rackBarcode?: string;
}

/** Cone with rack info for report */
interface ConeWithRack extends ConeInSlot {
  rackCode?: string;
  rackBarcode?: string;
}

const ZoneReportDrawer: React.FC<ZoneReportDrawerProps> = ({
  isOpen,
  onClose,
  zoneType,
  zoneLabel,
}) => {
  const [boxes, setBoxes] = useState<BoxWithRack[]>([]);
  const [cones, setCones] = useState<ConeWithRack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"menu" | "summary" | "full">("menu");

  useEffect(() => {
    if (!isOpen) {
      setViewMode("menu");
      return;
    }
    const fetchReportData = async () => {
      setIsLoading(true);
      setBoxes([]);
      setCones([]);
      try {
        // GET /storage/slots/with-contents?zone=LT - single API, all slots with boxes & cones
        const res = await storageSlotService.getSlotsWithContents({ zone: zoneType });
        const slots = res.results || [];

        const allBoxes: BoxWithRack[] = [];
        const allCones: ConeWithRack[] = [];

        for (const slot of slots) {
          const boxesInSlot = slot.boxes || [];
          for (const b of boxesInSlot) {
            allBoxes.push({
              ...b,
              rackCode: slot.label,
              rackBarcode: slot.barcode,
            });
          }
          const conesInSlot = slot.cones || [];
          for (const c of conesInSlot) {
            allCones.push({
              ...c,
              rackCode: slot.label,
              rackBarcode: slot.barcode,
            });
          }
        }

        setBoxes(allBoxes);
        setCones(allCones);
      } catch (err) {
        console.error("Failed to fetch report data:", err);
        toast.error("Failed to load report data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReportData();
  }, [isOpen, zoneType]);

  const totalWeight =
    boxes.reduce((sum, b) => sum + (b.boxWeight ?? 0), 0) +
    cones.reduce((sum, c) => sum + (c.coneWeight ?? 0), 0);
  const yarnTypes = new Set([
    ...boxes.map((b) => b.yarnName || "Unknown"),
    ...cones.map((c) => c.yarnName || "Unknown"),
  ]).size;

  const handleDownloadExcel = () => {
    const hasData = boxes.length > 0 || cones.length > 0;
    if (!hasData) {
      toast.error("No data to export");
      return;
    }
    try {
      const wb = XLSX.utils.book_new();

      if (boxes.length > 0) {
        const boxRows = boxes.map((b) => ({
          "Box ID": b.boxId,
          Barcode: b.barcode,
          "PO Number": b.poNumber,
          "Yarn Name": b.yarnName ?? "-",
          "Lot Number": b.lotNumber ?? "-",
          "Shade Code": b.shadeCode ?? "-",
          "Box Weight (kg)": b.boxWeight ?? 0,
          "Number of Cones": b.numberOfCones ?? 0,
          "Rack Code": b.rackCode ?? b.storageLocation ?? "-",
          "Rack Barcode": b.rackBarcode ?? "-",
          "Received Date": b.receivedDate ? new Date(b.receivedDate).toLocaleDateString() : "-",
        }));
        const wsBox = XLSX.utils.json_to_sheet(boxRows);
        XLSX.utils.book_append_sheet(wb, wsBox, "Boxes");
      }

      if (cones.length > 0) {
        const coneRows = cones.map((c) => ({
          "Cone Barcode": c.barcode,
          "Box ID": c.boxId,
          "PO Number": c.poNumber,
          "Yarn Name": c.yarnName ?? "-",
          "Shade Code": c.shadeCode ?? "-",
          "Cone Weight (kg)": c.coneWeight ?? 0,
          "Rack Code": c.rackCode ?? c.coneStorageId ?? "-",
          "Rack Barcode": c.rackBarcode ?? "-",
        }));
        const wsCone = XLSX.utils.json_to_sheet(coneRows);
        XLSX.utils.book_append_sheet(wb, wsCone, "Cones");
      }

      const fileName = `${zoneLabel.replace(/\s+/g, "_")}_report_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Report downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to download Excel");
    }
  };

  if (!isOpen) return null;

  const totalItems = boxes.length + cones.length;
  const hasData = totalItems > 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-in-right">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold text-gray-800">
            Report — {zoneLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent mb-4" />
              <p className="text-sm text-gray-600">Loading slots with contents...</p>
            </div>
          ) : viewMode === "menu" ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={!hasData}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <i className="ri-file-excel-2-line text-2xl text-green-600" />
                <div>
                  <div className="font-semibold text-gray-900">Download Excel</div>
                  <div className="text-xs text-gray-500">
                    Export boxes & cones with rack, weight, PO
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("summary")}
                disabled={!hasData}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <i className="ri-pie-chart-line text-2xl text-purple-600" />
                <div>
                  <div className="font-semibold text-gray-900">View Summary</div>
                  <div className="text-xs text-gray-500">
                    Total boxes, weight, yarn types
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("full")}
                disabled={!hasData}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <i className="ri-file-text-line text-2xl text-gray-600" />
                <div>
                  <div className="font-semibold text-gray-900">View Full Report</div>
                  <div className="text-xs text-gray-500">
                    All boxes & cones with rack, weight, PO
                  </div>
                </div>
              </button>
              {!hasData && !isLoading && (
                <p className="text-xs text-gray-500 mt-2">
                  No boxes or cones found in this zone.
                </p>
              )}
            </div>
          ) : viewMode === "summary" ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setViewMode("menu")}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <i className="ri-arrow-left-line" /> Back
              </button>
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">
                  Zone Summary
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      Total Boxes
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{boxes.length}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      Total Cones
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{cones.length}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      Total Weight (kg)
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {totalWeight.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      Yarn Types
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{yarnTypes}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      Zone
                    </div>
                    <div className="text-lg font-bold text-purple-600">{zoneType}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setViewMode("menu")}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <i className="ri-arrow-left-line" /> Back
              </button>
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[60vh] overflow-y-auto">
                {boxes.length > 0 && (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">
                          Box ID
                        </th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">
                          PO
                        </th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">
                          Yarn
                        </th>
                        <th className="px-3 py-2 text-right font-bold text-gray-600">
                          Weight
                        </th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">
                          Rack
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {boxes.map((b) => (
                        <tr
                          key={b._id ?? b.boxId ?? b.barcode}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-3 py-2 font-mono">{b.boxId}</td>
                          <td className="px-3 py-2 text-primary font-medium">{b.poNumber}</td>
                          <td className="px-3 py-2 truncate max-w-[120px]" title={b.yarnName}>
                            {b.yarnName ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-bold">{b.boxWeight ?? 0} kg</td>
                          <td className="px-3 py-2 font-mono">{b.rackCode ?? b.storageLocation ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {cones.length > 0 && (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">
                          Cone Barcode
                        </th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">
                          PO
                        </th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">
                          Yarn
                        </th>
                        <th className="px-3 py-2 text-right font-bold text-gray-600">
                          Weight
                        </th>
                        <th className="px-3 py-2 text-left font-bold text-gray-600">
                          Rack
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cones.map((c) => (
                        <tr
                          key={c._id ?? c.barcode}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-3 py-2 font-mono">{c.barcode}</td>
                          <td className="px-3 py-2 text-primary font-medium">{c.poNumber}</td>
                          <td className="px-3 py-2 truncate max-w-[120px]" title={c.yarnName}>
                            {c.yarnName ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-bold">{c.coneWeight ?? 0} kg</td>
                          <td className="px-3 py-2 font-mono">{c.rackCode ?? c.coneStorageId ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ZoneReportDrawer;
