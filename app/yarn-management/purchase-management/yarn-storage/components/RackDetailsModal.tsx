"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  StorageSlot,
  BoxInSlot,
  ConeInSlot,
  SlotDetailsResponse,
  StorageHistoryResponse,
  TransferHistoryItem,
} from "@/shared/services/storageSlotService";
import storageSlotService from "@/shared/services/storageSlotService";
import { RackLocation } from "../types";

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

  const executeBrowserPrint = () => {
    if (!slot) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups for this site.");
      return;
    }

    const paperW = 70; // mm
    const paperH = 50; // mm

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Browser Print - Rack Label</title>
          <style>
            @page { size: ${paperW}mm ${paperH}mm; margin: 0; }
            body { margin: 0; padding: 0; font-family: sans-serif; -webkit-print-color-adjust: exact; }
            .label {
              width: ${paperW}mm;
              height: ${paperH}mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              box-sizing: border-box;
              padding: 2mm;
            }
            .zone { font-size: 8pt; color: #666; margin-bottom: 1mm; text-transform: uppercase; }
            .code { font-weight: bold; font-size: 18pt; margin-bottom: 1mm; }
            .details { font-size: 8pt; margin-bottom: 2mm; }
            .barcode { width: 90%; }
            svg { width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="code">${slot.label}</div>
            <div class="details">Shelf: ${slot.shelfNumber} | Floor: ${slot.floorNumber}</div>
            <div class="barcode"><svg id="barcode"></svg></div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            window.onload = function() {
              JsBarcode("#barcode", "${slot.barcode}", {
                format: "CODE128",
                width: 2,
                height: 60,
                displayValue: true,
                fontSize: 14
              });
              setTimeout(() => { window.print(); window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-primary text-white px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center">
              <i className="ri-stack-line me-2"></i>
              Rack Details - {slot?.label || "Loading..."}
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex">
              <button
                onClick={() => setActiveTab("details")}
                className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === "details"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                <i className="ri-information-line me-2"></i>
                Details
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === "history"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                <i className="ri-history-line me-2"></i>
                History
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading rack details...</p>
                </div>
              </div>
            ) : slot ? (
              <>
                {activeTab === "details" ? (
                  <div className="space-y-6">
                    {/* Slot Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <i className="ri-information-line text-primary"></i>
                        Slot Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600 uppercase">
                            Label
                          </label>
                          <div className="mt-1 text-sm text-gray-900 font-mono bg-white p-2 rounded border">
                            {slot.label}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 uppercase">
                            Barcode
                          </label>
                          <div className="mt-1 text-sm text-gray-900 font-mono bg-white p-2 rounded border">
                            {slot.barcode}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 uppercase">
                            Zone Type
                          </label>
                          <div className="mt-1 text-sm text-gray-900 bg-white p-2 rounded border">
                            {zoneType}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 uppercase">
                            Shelf Number
                          </label>
                          <div className="mt-1 text-sm text-gray-900 bg-white p-2 rounded border">
                            {slot.shelfNumber}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 uppercase">
                            Floor Number
                          </label>
                          <div className="mt-1 text-sm text-gray-900 bg-white p-2 rounded border">
                            {slot.floorNumber}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 uppercase">
                            Status
                          </label>
                          <div className="mt-1">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${slot.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                                }`}
                            >
                              {slot.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Boxes or Cones in Slot */}
                    <div>
                      {dataType === "boxes" ? (
                        <>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <i className="ri-inbox-line text-primary"></i>
                            Boxes in Slot ({boxes.length})
                          </h4>
                          {boxes.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                              <i className="ri-inbox-line text-4xl mb-2 block"></i>
                              <p>No boxes stored in this slot</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {boxes.map((box) => (
                                <div
                                  key={box._id}
                                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Box ID
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                                        {box.boxId}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Barcode
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                                        {box.barcode}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        PO Number
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {box.poNumber}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Yarn Name
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {box.yarnName}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Shade Code
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {box.shadeCode}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Lot Number
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {box.lotNumber}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Box Weight (kg)
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {box.boxWeight}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Number of Cones
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {box.numberOfCones}
                                      </div>
                                    </div>
                                    {box.qcData && (
                                      <>
                                        <div>
                                          <label className="text-xs font-medium text-gray-600 uppercase">
                                            QC Status
                                          </label>
                                          <div className="mt-1">
                                            <span
                                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${box.qcData.status === "qc_approved"
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                                }`}
                                            >
                                              {box.qcData.status === "qc_approved"
                                                ? "QC Approved"
                                                : "QC Rejected"}
                                            </span>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-gray-600 uppercase">
                                            QC Date
                                          </label>
                                          <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                            {formatDateTime(box.qcData.date)}
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-gray-600 uppercase">
                                            Inspector
                                          </label>
                                          <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                            {box.qcData.username}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                    {box.coneData && (
                                      <>
                                        <div>
                                          <label className="text-xs font-medium text-gray-600 uppercase">
                                            Cones Issued
                                          </label>
                                          <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                            {box.coneData.conesIssued ? "Yes" : "No"}
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-gray-600 uppercase">
                                            Issue Date
                                          </label>
                                          <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                            {formatDateTime(box.coneData.coneIssueDate)}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Received Date
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {formatDateTime(box.receivedDate)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <i className="ri-barcode-line text-primary"></i>
                            Cones in Slot ({cones.length})
                          </h4>
                          {cones.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                              <i className="ri-barcode-line text-4xl mb-2 block"></i>
                              <p>No cones stored in this slot</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {cones.map((cone) => (
                                <div
                                  key={cone._id}
                                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Cone Barcode
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                                        {cone.barcode}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Box ID
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                                        {cone.boxId}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        PO Number
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {cone.poNumber}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Yarn Name
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {cone.yarnName}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Shade Code
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {cone.shadeCode}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Cone Weight (kg)
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {cone.coneWeight}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Tear Weight (kg)
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {cone.tearWeight}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Issue Status
                                      </label>
                                      <div className="mt-1">
                                        <span
                                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cone.issueStatus === "issued"
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-gray-100 text-gray-800"
                                            }`}
                                        >
                                          {cone.issueStatus.replace(/_/g, " ")}
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Return Status
                                      </label>
                                      <div className="mt-1">
                                        <span
                                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cone.returnStatus === "returned"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                            }`}
                                        >
                                          {cone.returnStatus.replace(/_/g, " ")}
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Issue Weight (kg)
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {cone.issueWeight}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Return Weight (kg)
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {cone.returnWeight}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Storage ID
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                                        {cone.coneStorageId}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Created At
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {formatDateTime(cone.createdAt)}
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-medium text-gray-600 uppercase">
                                        Updated At
                                      </label>
                                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                        {formatDateTime(cone.updatedAt)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  /* History Tab */
                  <div className="space-y-6">
                    {isLoadingHistory ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                          <p className="text-gray-600">Loading history...</p>
                        </div>
                      </div>
                    ) : historyData ? (
                      <>
                        {/* Current Inventory Summary */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            <i className="ri-inbox-line text-primary"></i>
                            Current Inventory
                          </h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-blue-700 font-medium">Total Boxes:</span>{" "}
                              <span className="text-blue-900 font-semibold">{historyData.currentInventory.totalBoxes}</span>
                            </div>
                            <div>
                              <span className="text-blue-700 font-medium">Total Weight:</span>{" "}
                              <span className="text-blue-900 font-semibold">{historyData.currentInventory.totalWeight.toFixed(2)} kg</span>
                            </div>
                            <div>
                              <span className="text-blue-700 font-medium">Yarn Types:</span>{" "}
                              <span className="text-blue-900 font-semibold">{historyData.currentInventory.yarns.length}</span>
                            </div>
                          </div>
                        </div>

                        {/* Transfer History */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <i className="ri-history-line text-primary"></i>
                            Transfer History ({historyData.transferHistory.length} transactions)
                          </h4>
                          {historyData.transferHistory.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                              <i className="ri-history-line text-4xl mb-2 block"></i>
                              <p>No transfer history available</p>
                            </div>
                          ) : (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                        Date & Time
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                        Type
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                        Yarn Name
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                        Weight (kg)
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                        Box IDs
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                        From → To
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {historyData.transferHistory.map((item, index) => (
                                      <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                          {formatDateTime(item.transactionDate)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          <span
                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.transactionType === "internal_transfer"
                                              ? "bg-blue-100 text-blue-800"
                                              : item.transactionType === "yarn_stocked"
                                                ? "bg-green-100 text-green-800"
                                                : "bg-gray-100 text-gray-800"
                                              }`}
                                          >
                                            {item.transactionType === "internal_transfer"
                                              ? "Transfer"
                                              : item.transactionType === "yarn_stocked"
                                                ? "Stocked"
                                                : item.transactionType.replace(/_/g, " ")}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={item.yarnName}>
                                          {item.yarnName || "-"}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                          {item.weight.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                          {item.boxIds && item.boxIds.length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                              {item.boxIds.slice(0, 2).map((boxId, idx) => (
                                                <span key={idx} className="font-mono text-xs">
                                                  {boxId}
                                                </span>
                                              ))}
                                              {item.boxIds.length > 2 && (
                                                <span className="text-xs text-gray-500">
                                                  +{item.boxIds.length - 2} more
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-gray-400">-</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                          {item.fromLocation && item.toLocation ? (
                                            <div className="flex items-center gap-1">
                                              <span className="font-mono text-xs">{item.fromLocation}</span>
                                              <i className="ri-arrow-right-line text-gray-400"></i>
                                              <span className="font-mono text-xs">{item.toLocation}</span>
                                            </div>
                                          ) : item.fromLocation ? (
                                            <span className="font-mono text-xs">From: {item.fromLocation}</span>
                                          ) : item.toLocation ? (
                                            <span className="font-mono text-xs">To: {item.toLocation}</span>
                                          ) : (
                                            <span className="text-gray-400">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <i className="ri-error-warning-line text-4xl mb-4 block"></i>
                        <p>Failed to load history</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <i className="ri-error-warning-line text-4xl mb-4 block"></i>
                <p>No rack details available</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
            <div className="flex gap-2">
              {zoneType === "LT" && onTransferLTToLT && (
                <button
                  onClick={() => {
                    const rack = getRackLocation();
                    if (rack) {
                      onTransferLTToLT(rack);
                      onClose();
                    }
                  }}
                  className="ti-btn ti-btn-primary ti-btn-sm"
                  disabled={!slot || !slot.isActive}
                >
                  <i className="ri-arrow-right-left-line me-1"></i>
                  Transfer to LT
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
                  className="ti-btn ti-btn-primary ti-btn-sm"
                  disabled={!slot || !slot.isActive}
                >
                  <i className="ri-arrow-right-line me-1"></i>
                  Transfer to ST
                </button>
              )}
              {zoneType === "ST" && onTransferSTToST && (
                <button
                  onClick={() => {
                    const rack = getRackLocation();
                    if (rack) {
                      onTransferSTToST(rack);
                      onClose();
                    }
                  }}
                  className="ti-btn ti-btn-primary ti-btn-sm"
                  disabled={!slot || !slot.isActive}
                >
                  <i className="ri-arrow-right-left-line me-1"></i>
                  Transfer to ST
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={executeBrowserPrint}
                className="ti-btn ti-btn-purple-soft ti-btn-sm"
                disabled={!slot}
              >
                <i className="ri-window-line me-1"></i>
                Test Print (Browser)
              </button>
              <button onClick={onClose} className="ti-btn ti-btn-light">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RackDetailsModal;

