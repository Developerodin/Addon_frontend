"use client";
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import {
  StorageSlot,
  BoxInSlot,
  ConeInSlot,
  SlotDetailsResponse,
  StorageHistoryResponse,
} from "@/shared/services/storageSlotService";
import storageSlotService from "@/shared/services/storageSlotService";
import { RackLocation } from "../types";
import {
  exportBoxesToExcel,
  exportConesToExcel,
} from "../utils/storageReportUtils";
import StorageReportModal from "./StorageReportModal";

interface RackDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: StorageSlot | null;
  boxes?: BoxInSlot[];
  cones?: ConeInSlot[];
  zoneType: string;
  dataType?: "boxes" | "cones";
  isLoading?: boolean;
  onTransferLTToLT?: (rack: RackLocation) => void;
  onTransferLTToST?: (rack: RackLocation) => void;
  onTransferSTToST?: (rack: RackLocation) => void;
}

const RackDetailsModal: React.FC<RackDetailsModalProps> = ({
  isOpen,
  onClose,
  slot,
  boxes = [],
  cones = [],
  zoneType,
  dataType = "boxes",
  isLoading = false,
  onTransferLTToLT,
  onTransferLTToST,
  onTransferSTToST,
}) => {
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");
  const [historyData, setHistoryData] = useState<StorageHistoryResponse | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);
  const [reportModalView, setReportModalView] = useState<"summary" | "full" | null>(null);
  const reportDropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Close report dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reportDropdownRef.current && !reportDropdownRef.current.contains(e.target as Node)) {
        setReportDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getRackLocation = (): RackLocation | null => {
    if (!slot) return null;
    return {
      id: slot._id,
      rackCode: slot.label,
      row: slot.shelfNumber,
      column: slot.floorNumber,
      shelf: slot.shelfNumber,
      barcode: slot.barcode,
      capacity: 1,
      currentBoxes: boxes?.length || cones?.length || 0,
      status: slot.isActive ? "Available" : "Maintenance",
    };
  };

  const handleDownloadExcel = () => {
    if (!slot) return;
    setReportDropdownOpen(false);
    try {
      if (dataType === "boxes") {
        exportBoxesToExcel(slot, boxes, zoneType);
      } else {
        exportConesToExcel(slot, cones, zoneType);
      }
      toast.success("Report downloaded as Excel");
    } catch (err) {
      console.error("Excel export failed:", err);
      toast.error("Failed to download Excel");
    }
  };

  const handleViewSummary = () => {
    setReportDropdownOpen(false);
    setReportModalView("summary");
  };

  const handleViewFullReport = () => {
    setReportDropdownOpen(false);
    setReportModalView("full");
  };

  // Fetch history when History tab is selected
  useEffect(() => {
    const fetchHistory = async () => {
      if (activeTab === "history" && slot?.barcode && !historyData) {
        setIsLoadingHistory(true);
        try {
          const history = await storageSlotService.getSlotHistory(slot.barcode);
          setHistoryData(history);
        } catch (error) {
          console.error("Failed to fetch rack history:", error);
          toast.error("Failed to load rack history");
        } finally {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchHistory();
  }, [activeTab, slot?.barcode, historyData]);

  // Reset history when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("details");
      setHistoryData(null);
    } else {
      // Auto-scroll to top when drawer opens
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo(0, 0);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  /**
   * Format KG values with a fixed number of decimals (avoids float noise like 0.6000000000000001).
   */
  const formatKg = (value: unknown, decimals = 4): string => {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return value.toFixed(decimals);
  };


  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div
          className="fixed inset-0 z-[51] bg-gray-500 bg-opacity-75 transition-opacity duration-300"
          onClick={onClose}
          aria-hidden
        />
        <div
          className="fixed right-0 top-0 z-[52] h-full w-full max-w-[58.5rem] bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col"
        >
          {/* Header — per UI spec: p-[10px] border-b border-gray-200, title text-sm font-bold text-gray-800 */}
          <div className="p-[10px] border-b border-gray-200 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-[3px] h-5 bg-primary rounded-full shrink-0"></div>
              <h3 className="text-sm font-bold text-gray-800 flex items-center min-w-0 truncate">
                Rack Details — <span className="text-primary ml-1 truncate">{slot?.label || "Loading..."}</span>
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1 transition-colors shrink-0"
              aria-label="Close"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 shrink-0">
            <button
              onClick={() => setActiveTab("details")}
              className={`px-4 py-2.5 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "details"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              <i className="ri-information-line me-1.5"></i>
              DETAILS
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2.5 text-[11px] font-bold border-b-2 transition-colors ${activeTab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              <i className="ri-history-line me-1.5"></i>
              HISTORY
            </button>
          </div>

          {/* Body — per UI spec: p-[10px] overflow-auto */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-[10px] bg-gray-50/30"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4 opacity-50"></div>
                <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
              </div>
            ) : slot ? (
              <div className="space-y-6">
                {activeTab === "details" ? (
                  <div className="space-y-6">
                    {/* Slot Information */}
                    <div className="bg-white border border-gray-200 rounded shadow-sm p-4">
                      <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <i className="ri-information-line text-primary"></i>
                        Slot Information
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-600 uppercase">Label</label>
                          <div className="text-[11px] font-bold text-gray-900 mt-0.5">{slot.label}</div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-600 uppercase">Barcode</label>
                          <div className="text-[11px] font-mono text-gray-600 mt-0.5 uppercase">{slot.barcode}</div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-600 uppercase">Zone Type</label>
                          <div className="text-[11px] font-semibold text-gray-700 mt-0.5">{zoneType}</div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-600 uppercase">Shelf</label>
                          <div className="text-[11px] font-semibold text-gray-700 mt-0.5">{slot.shelfNumber}</div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-600 uppercase">Floor</label>
                          <div className="text-[11px] font-semibold text-gray-700 mt-0.5">{slot.floorNumber}</div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-600 uppercase">Status</label>
                          <div className="mt-0.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase ${slot.isActive
                                ? "bg-green-50 text-green-600 border border-green-100"
                                : "bg-red-50 text-red-600 border border-red-100"
                                }`}
                            >
                              {slot.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Boxes or Cones in Slot */}
                    <div className="bg-white border border-gray-300 rounded overflow-hidden shadow-sm">
                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                        <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                          <i className={dataType === "boxes" ? "ri-inbox-line" : "ri-barcode-line"}></i>
                          {dataType === "boxes" ? `Boxes in Slot (${boxes.length})` : `Cones in Slot (${cones.length})`}
                        </h4>
                      </div>

                      <div className="overflow-x-auto">
                        {dataType === "boxes" ? (
                          boxes.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                              <i className="ri-inbox-line text-3xl mb-2 block opacity-20"></i>
                              <p className="text-[11px] font-medium">No boxes stored in this slot</p>
                            </div>
                          ) : (
                            <table className="w-full border-collapse text-[10px]">
                              <thead className="bg-gray-50/80 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Box Info</th>
                                  <th className="px-3 py-2 text-left font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">PO & Yarn</th>
                                  <th className="px-3 py-2 text-left font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Attributes</th>
                                  <th className="px-3 py-2 text-center font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Quantity</th>
                                  <th className="px-3 py-2 text-left font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">QC Status</th>
                                  <th className="px-3 py-2 text-right pr-4 font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Date</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white">
                                {boxes.map((box, idx) => (
                                  <tr key={box._id || idx} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                                    <td className="px-3 py-2.5">
                                      <div className="font-bold text-gray-900">{box.boxId}</div>
                                      <div className="text-[9px] text-gray-500 font-mono mt-0.5">{box.barcode}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <div className="font-semibold text-primary">{box.poNumber}</div>
                                      <div className="text-[11px] text-gray-700 font-medium whitespace-normal break-words" title={box.yarnName}>{box.yarnName}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <div className="text-gray-700"><span className="text-gray-500 font-bold">Lot:</span> {box.lotNumber}</div>
                                      <div className="text-gray-700 mt-0.5"><span className="text-gray-500 font-bold">Shade:</span> {box.shadeCode}</div>
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <div className="font-bold text-gray-900">
                                        {formatKg(box.boxWeight, 4)}{" "}
                                        <span className="text-[9px] font-bold text-gray-600 uppercase">kg</span>
                                      </div>
                                      <div className="text-gray-700 mt-0.5 font-medium">{box.numberOfCones} <span className="text-[9px] font-bold text-gray-600 uppercase">cones</span></div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      {box.qcData ? (
                                        <div className="space-y-1">
                                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${box.qcData.status === "qc_approved" ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                                            }`}>
                                            {box.qcData.status === "qc_approved" ? "Approved" : "Rejected"}
                                          </span>
                                          <div className="text-[8px] text-gray-600 font-medium truncate max-w-[80px]">By: {box.qcData.username}</div>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 italic">No QC Data</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-right pr-4">
                                      <div className="text-gray-600">{formatDateTime(box.receivedDate).split(',')[0]}</div>
                                      <div className="text-[9px] text-gray-600 font-medium mt-0.5">{formatDateTime(box.receivedDate).split(',')[1]}</div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        ) : (
                          cones.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                              <i className="ri-barcode-line text-3xl mb-2 block opacity-20"></i>
                              <p className="text-[11px] font-medium">No cones stored in this slot</p>
                            </div>
                          ) : (
                            <table className="w-full border-collapse text-[10px]">
                              <thead className="bg-gray-50/80 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Cone Barcode</th>
                                  <th className="px-3 py-2 text-left font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Box & PO</th>
                                  <th className="px-3 py-2 text-left font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Yarn</th>
                                  <th className="px-3 py-2 text-center font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Weight</th>
                                  <th className="px-3 py-2 text-left font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Status</th>
                                  <th className="px-3 py-2 text-right pr-4 font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Date</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white">
                                {cones.map((cone, idx) => (
                                  <tr key={cone._id || idx} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                                    <td className="px-3 py-2.5">
                                      <div className="font-mono font-bold text-gray-900 uppercase">{cone.barcode}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <div className="font-bold text-gray-900">{cone.boxId}</div>
                                      <div className="text-primary font-semibold mt-0.5">{cone.poNumber}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <div className="text-[11px] text-gray-700 font-medium whitespace-normal break-words" title={cone.yarnName}>{cone.yarnName}</div>
                                      <div className="text-gray-700 mt-1"><span className="text-[9px] uppercase text-gray-500 font-bold">Shade:</span> {cone.shadeCode}</div>
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <div className="font-bold text-gray-900">
                                        {formatKg(cone.coneWeight, 4)}{" "}
                                        <span className="text-[9px] font-bold text-gray-600 uppercase">kg</span>
                                      </div>
                                      <div className="text-[9px] text-gray-600 mt-0.5 font-medium">
                                        Tear: {formatKg(cone.tearWeight, 4)}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <div className="flex flex-col gap-1">
                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${cone.issueStatus === "issued" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-50 text-gray-400 border-gray-100"
                                          }`}>
                                          {cone.issueStatus.replace(/_/g, " ")}
                                        </span>
                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${cone.returnStatus === "returned" ? "bg-green-50 text-green-600 border-green-100" : "bg-gray-50 text-gray-400 border-gray-100"
                                          }`}>
                                          {cone.returnStatus.replace(/_/g, " ")}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right pr-4">
                                      <div className="text-gray-700 font-medium">{formatDateTime(cone.createdAt).split(',')[0]}</div>
                                      <div className="text-[9px] text-gray-600 font-medium mt-0.5">{formatDateTime(cone.createdAt).split(',')[1]}</div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* History Tab content */
                  <div className="space-y-6">
                    {isLoadingHistory ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4 opacity-50"></div>
                        <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading History</p>
                      </div>
                    ) : historyData ? (
                      <>
                        {/* Current Inventory Summary */}
                        <div className="bg-primary/5 border border-primary/10 rounded shadow-sm p-4">
                          <h4 className="text-[11px] font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                            <i className="ri-inbox-line"></i>
                            Current Inventory Summary
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <label className="text-[9px] font-bold text-gray-600 uppercase">Total Boxes</label>
                              <div className="text-[14px] font-bold text-gray-900 mt-0.5">{historyData.currentInventory.totalBoxes}</div>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-gray-600 uppercase">Total Weight</label>
                              <div className="text-[14px] font-bold text-gray-900 mt-0.5">
                                {formatKg(historyData.currentInventory.totalWeight, 4)}{" "}
                                <span className="text-[10px] font-bold text-gray-600 uppercase">kg</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-gray-600 uppercase">Yarn Types</label>
                              <div className="text-[14px] font-bold text-gray-900 mt-0.5">{historyData.currentInventory.yarns.length}</div>
                            </div>
                          </div>
                        </div>

                        {/* Transfer History Table */}
                        <div className="bg-white border border-gray-300 rounded overflow-hidden shadow-sm">
                          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
                            <h4 className="text-[11px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                              <i className="ri-history-line"></i>
                              Recent Transfer History
                            </h4>
                          </div>
                          <div className="overflow-x-auto">
                            {historyData.transferHistory.length === 0 ? (
                              <div className="text-center py-12 text-gray-500">
                                <i className="ri-history-line text-3xl mb-2 block opacity-20"></i>
                                <p className="text-[11px] font-medium">No transfer history available</p>
                              </div>
                            ) : (
                              <table className="w-full border-collapse text-[10px]">
                                <thead className="bg-gray-50/80">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-bold text-[#495057] uppercase border-b border-gray-200">Date & Time</th>
                                    <th className="px-3 py-2 text-left font-bold text-[#495057] uppercase border-b border-gray-200">Transaction</th>
                                    <th className="px-3 py-2 text-left font-bold text-[#495057] uppercase border-b border-gray-200">Yarn & Weight</th>
                                    <th className="px-3 py-2 text-left font-bold text-[#495057] uppercase border-b border-gray-200">Movement</th>
                                    <th className="px-3 py-2 text-right pr-4 font-bold text-[#495057] uppercase border-b border-gray-200">Boxes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {historyData.transferHistory.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors">
                                      <td className="px-3 py-2.5">
                                        <div className="text-gray-900">{formatDateTime(item.transactionDate).split(',')[0]}</div>
                                        <div className="text-[9px] text-gray-600 font-medium mt-0.5">{formatDateTime(item.transactionDate).split(',')[1]}</div>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${item.transactionType === "internal_transfer" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                          item.transactionType === "yarn_stocked" ? "bg-green-50 text-green-600 border-green-100" :
                                            "bg-gray-50 text-gray-500 border-gray-100"
                                          }`}>
                                          {item.transactionType === "internal_transfer" ? "Transfer" : item.transactionType === "yarn_stocked" ? "Stocked" : item.transactionType.replace(/_/g, " ")}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <div className="text-gray-900 font-medium truncate max-w-[120px]" title={item.yarnName}>{item.yarnName || "-"}</div>
                                        <div className="text-primary font-bold mt-0.5">
                                          {formatKg(item.weight, 4)}{" "}
                                          <span className="text-[9px] font-bold text-gray-600 uppercase">kg</span>
                                        </div>
                                      </td>
                                      <td className="px-3 py-2.5">
                                        {item.fromLocation && item.toLocation ? (
                                          <div className="flex items-center gap-1.5 text-[9px] font-mono">
                                            <span className="bg-gray-100 px-1 rounded text-gray-600 uppercase">{item.fromLocation}</span>
                                            <i className="ri-arrow-right-line text-gray-600"></i>
                                            <span className="bg-primary/10 px-1 rounded text-primary uppercase font-bold">{item.toLocation}</span>
                                          </div>
                                        ) : (
                                          <span className="text-[11px] font-mono text-gray-600 uppercase">-</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2.5 text-right pr-4">
                                        <div className="flex flex-col items-end gap-0.5">
                                          {item.boxIds && item.boxIds.length > 0 ? (
                                            <>
                                              <span className="font-mono text-[9px] text-gray-700">{item.boxIds[0]}</span>
                                              {item.boxIds.length > 1 && (
                                                <span className="text-[8px] bg-gray-100 px-1 rounded text-gray-600 font-medium">+{item.boxIds.length - 1} more</span>
                                              )}
                                            </>
                                          ) : "-"}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-20 text-gray-400">
                        <i className="ri-error-warning-line text-4xl mb-2 block opacity-20"></i>
                        <p className="text-[11px] font-medium tracking-widest uppercase">Failed to load history</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <i className="ri-error-warning-line text-4xl mb-2 block opacity-20"></i>
                <p className="text-[11px] font-medium tracking-widest uppercase">No rack details available</p>
              </div>
            )}
          </div>

          {/* Footer — per UI spec: flex justify-end p-[10px] border-t border-gray-200; primary bg-purple-600 */}
          <div className="p-[10px] border-t border-gray-200 bg-white flex justify-between items-center shrink-0 flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap items-center">
              {/* Report dropdown */}
              <div className="relative" ref={reportDropdownRef}>
                <button
                  type="button"
                  onClick={() => setReportDropdownOpen((o) => !o)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm"
                >
                  <i className="ri-file-list-3-line text-xs"></i>
                  Report
                  <i className={`ri-arrow-down-s-line text-xs transition-transform ${reportDropdownOpen ? "rotate-180" : ""}`}></i>
                </button>
                {reportDropdownOpen && (
                  <div className="absolute left-0 bottom-full mb-1 w-48 bg-white border border-gray-200 rounded shadow-lg py-1 z-10">
                    <button
                      onClick={handleDownloadExcel}
                      className="w-full px-3 py-2 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <i className="ri-file-excel-2-line text-green-600"></i>
                      Download Excel
                    </button>
                    <button
                      onClick={handleViewSummary}
                      className="w-full px-3 py-2 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <i className="ri-pie-chart-line text-primary"></i>
                      View Summary
                    </button>
                    <button
                      onClick={handleViewFullReport}
                      className="w-full px-3 py-2 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <i className="ri-file-text-line"></i>
                      View Full Report
                    </button>
                  </div>
                )}
              </div>
              {zoneType === "LT" && onTransferLTToLT && (
                <button
                  onClick={() => {
                    const rack = getRackLocation();
                    if (rack) {
                      onTransferLTToLT(rack);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded shadow-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!slot || !slot.isActive}
                >
                  <i className="ri-arrow-right-left-line text-xs"></i>
                  TRANSFER TO LT
                </button>
              )}
              {zoneType === "LT" && onTransferLTToST && (
                <button
                  onClick={() => {
                    const rack = getRackLocation();
                    if (rack) {
                      onTransferLTToST(rack);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!slot || !slot.isActive}
                >
                  <i className="ri-arrow-right-line text-xs"></i>
                  TRANSFER TO ST
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Report modals (Summary / Full Report) */}
      {reportModalView && (
        <StorageReportModal
          isOpen={!!reportModalView}
          onClose={() => setReportModalView(null)}
          slot={slot}
          boxes={dataType === "boxes" ? boxes : undefined}
          cones={dataType === "cones" ? cones : undefined}
          dataType={dataType}
          zoneType={zoneType}
          view={reportModalView}
        />
      )}
    </>
  );
};

export default RackDetailsModal;

