"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import storageSlotService from "@/shared/services/storageSlotService";
import yarnConeService, { YarnCone } from "@/shared/services/yarnConeService";
import ZoneReportFullView from "./ZoneReportFullView";
import { BoxWithRack, ConeWithRack } from "./zoneReportSearch";
import {
  resolveBoxGrossWeightKg,
  resolveBoxNetWeightKg,
  resolveConeNetWeightKg,
} from "../utils/boxWeightDisplay";

interface ZoneReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  zoneType: "LT" | "ST";
  zoneLabel: string;
}

interface ZoneSummary {
  totalBoxes: number;
  totalCones: number;
  totalWeight: number;
  yarnTypes: number;
}

const ZoneReportDrawer: React.FC<ZoneReportDrawerProps> = ({
  isOpen,
  onClose,
  zoneType,
  zoneLabel,
}) => {
  const [boxes, setBoxes] = useState<BoxWithRack[]>([]);
  const [cones, setCones] = useState<ConeWithRack[]>([]);
  const [summary, setSummary] = useState<ZoneSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingIssued, setIsDownloadingIssued] = useState(false);
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
      setSummary(null);
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
        
        // Use summary from API if available
        if (res.summary) {
          setSummary(res.summary);
        }
      } catch (err) {
        console.error("Failed to fetch report data:", err);
        toast.error("Failed to load report data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReportData();
  }, [isOpen, zoneType]);

  const isLongTerm = zoneType === "LT";

  const yarnTypes =
    summary?.yarnTypes ??
    new Set(
      isLongTerm
        ? boxes.map((b) => b.yarnName || "Unknown")
        : cones.map((c) => c.yarnName || "Unknown")
    ).size;

  const totalBoxGrossWeight = boxes.reduce(
    (sum, b) => sum + (resolveBoxGrossWeightKg(b) ?? 0),
    0
  );
  const totalBoxNetWeight = boxes.reduce(
    (sum, b) => sum + (resolveBoxNetWeightKg(b) ?? 0),
    0
  );
  const totalConeGrossWeight = cones.reduce(
    (sum, c) => sum + (c.coneWeight ?? 0),
    0
  );
  const totalConeNetWeight = cones.reduce(
    (sum, c) => sum + (resolveConeNetWeightKg(c) ?? 0),
    0
  );

  /**
   * Builds Excel row objects for issued cone export.
   */
  const buildIssuedConeExcelRows = (issuedCones: YarnCone[]) =>
    issuedCones.map((c) => {
      const gross = c.coneWeight ?? 0;
      const tear = c.tearWeight ?? 0;
      return {
        "Cone Barcode": c.barcode,
        "Box ID": c.boxId,
        "PO Number": c.poNumber,
        "Yarn Name": c.yarnName ?? "-",
        "Shade Code": c.shadeCode ?? "-",
        "Issue Status": c.issueStatus ?? "-",
        "Return Status": c.returnStatus ?? "-",
        "Cone Gross Weight (kg)": gross,
        "Cone Tear Weight (kg)": tear,
        "Cone Net Weight (kg)": gross - tear,
        "Issue Weight (kg)": c.issueWeight ?? "-",
        "Issue Date": c.issueDate
          ? new Date(c.issueDate).toLocaleString()
          : "-",
        "Issued By": c.issuedBy?.username ?? "-",
        "Last Storage Location": c.coneStorageId ?? "-",
        "Order ID": c.orderId ?? "-",
        "Article ID": c.articleId ?? "-",
      };
    });

  const handleDownloadIssuedConesExcel = async () => {
    setIsDownloadingIssued(true);
    try {
      const issuedCones = await yarnConeService.getIssuedCones();
      if (issuedCones.length === 0) {
        toast.error("No issued cones to export");
        return;
      }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(buildIssuedConeExcelRows(issuedCones));
      XLSX.utils.book_append_sheet(wb, ws, "Issued Cones");
      const fileName = `${zoneLabel.replace(/\s+/g, "_")}_issued_cones_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Exported ${issuedCones.length} issued cone(s)`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to download issued cones Excel");
    } finally {
      setIsDownloadingIssued(false);
    }
  };

  const handleDownloadExcel = () => {
    const hasData = isLongTerm ? boxes.length > 0 : boxes.length > 0 || cones.length > 0;
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
          "Gross Weight (kg)": resolveBoxGrossWeightKg(b) ?? "",
          "Net Weight (kg)": resolveBoxNetWeightKg(b) ?? "",
          "Number of Cones": b.numberOfCones ?? 0,
          "Rack Code": b.rackCode ?? b.storageLocation ?? "-",
          "Rack Barcode": b.rackBarcode ?? "-",
          "Received Date": b.receivedDate ? new Date(b.receivedDate).toLocaleDateString() : "-",
        }));
        const wsBox = XLSX.utils.json_to_sheet(boxRows);
        XLSX.utils.book_append_sheet(wb, wsBox, "Boxes");
      }

      if (cones.length > 0) {
        const coneRows = cones.map((c) => {
          // coneWeight in API/DB is gross; net = gross - tear
          const gross = c.coneWeight ?? 0;
          const tear = c.tearWeight ?? 0;
          return {
            "Cone Barcode": c.barcode,
            "Box ID": c.boxId,
            "PO Number": c.poNumber,
            "Yarn Name": c.yarnName ?? "-",
            "Shade Code": c.shadeCode ?? "-",
            "Issue Status": c.issueStatus ?? "-",
            "Return Status": c.returnStatus ?? "-",
            "Cone Gross Weight (kg)": gross,
            "Cone Tear Weight (kg)": tear,
            "Cone Net Weight (kg)": gross - tear,
            "Rack Code": c.rackCode ?? c.coneStorageId ?? "-",
            "Rack Barcode": c.rackBarcode ?? "-",
          };
        });
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

  const hasData = isLongTerm
    ? (summary?.totalBoxes ?? boxes.length) > 0
    : boxes.length > 0 || cones.length > 0;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zone-report-drawer-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4">
          <h3 id="zone-report-drawer-title" className="text-base font-bold text-gray-800">
            Report — {zoneLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close report drawer"
          >
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col p-4 ${
            viewMode === "full" ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
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
                    {isLongTerm
                      ? "Export boxes with rack, weight, PO"
                      : "Export boxes & cones with rack, weight, PO, status"}
                  </div>
                </div>
              </button>
              {!isLongTerm && (
                <button
                  type="button"
                  onClick={handleDownloadIssuedConesExcel}
                  disabled={isDownloadingIssued}
                  className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  aria-label="Download issued cones Excel"
                >
                  {isDownloadingIssued ? (
                    <div
                      className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
                      aria-hidden
                    />
                  ) : (
                    <i className="ri-file-excel-2-line text-2xl text-blue-600" aria-hidden />
                  )}
                  <div>
                    <div className="font-semibold text-gray-900">
                      Download Issued Cones Excel
                    </div>
                    <div className="text-xs text-gray-500">
                      Export cones issued to production with weight, PO, issue date
                    </div>
                  </div>
                </button>
              )}
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
                    {isLongTerm
                      ? "Totals, box gross and net weight, yarn types"
                      : "Totals, cone gross and net weight, yarn types"}
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
                    {isLongTerm
                      ? "All boxes with rack, weight, PO"
                      : "All boxes & cones with rack, weight, PO, status"}
                  </div>
                </div>
              </button>
              {!hasData && !isLoading && (
                <p className="text-xs text-gray-500 mt-2">
                  {isLongTerm
                    ? "No boxes found in this zone."
                    : "No boxes or cones found in this zone."}
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
                  {isLongTerm ? (
                    <>
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Total Boxes
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {summary?.totalBoxes ?? boxes.length}
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
                          Total box gross (kg)
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {(summary?.totalWeight ?? totalBoxGrossWeight).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Total box net (kg)
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {totalBoxNetWeight.toFixed(2)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Total Cones
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {summary?.totalCones ?? cones.length}
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
                          Total cone gross (kg)
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {totalConeGrossWeight.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">
                          Total cone net (kg)
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {(summary?.totalWeight ?? totalConeNetWeight).toFixed(2)}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <div className="text-xs font-medium text-gray-500 uppercase">
                      Zone
                    </div>
                    <div className="text-lg font-bold text-purple-600">{zoneType}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ZoneReportFullView
              isLongTerm={isLongTerm}
              boxes={boxes}
              cones={cones}
              onBack={() => setViewMode("menu")}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default ZoneReportDrawer;
