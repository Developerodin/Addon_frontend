"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import JsBarcode from "jsbarcode";
import yarnBoxService, { YarnBox } from "@/shared/services/yarnBoxService";
import yarnConeService from "@/shared/services/yarnConeService";
import storageSlotService, {
  StorageSlot,
  SlotDetailsResponse,
  BoxInSlot,
  ConeInSlot,
} from "@/shared/services/storageSlotService";
import { QZTrayStatus } from "@/shared/components/qzTray/QZTrayStatus";
import { printRacks } from "@/shared/utils/qzTray";
import BarcodeScanner from "./BarcodeScanner";
import RackDetailsModal from "./RackDetailsModal";
import {
  ShortTermInventory,
  PackedBox,
  InternalTransferData,
  Cone,
  RackLocation,
} from "../types";

const getProcessedBoxStorageKey = (boxId: string) =>
  `processedBoxResult:${boxId}`;

interface ShortTermStorageProps {
  inventory: ShortTermInventory[];
  boxes: PackedBox[];
  onInternalTransfer: (transferData: any) => void;
  preferences: {
    gridColumns: number;
    gridRows: number;
    showEmptySlots: boolean;
  };
}

const ShortTermStorage: React.FC<ShortTermStorageProps> = ({
  inventory: _inventory,
  boxes,
  onInternalTransfer,
  preferences,
}) => {
  const [selectedBox, setSelectedBox] = useState<PackedBox | null>(null);
  const [isLoadingBox, setIsLoadingBox] = useState(false);
  const [scannedBoxDetails, setScannedBoxDetails] = useState<YarnBox | null>(
    null
  );
  const [isProcessingBox, setIsProcessingBox] = useState(false);
  const [storageSlots, setStorageSlots] = useState<StorageSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [isRackModalOpen, setIsRackModalOpen] = useState(false);
  const [rackDetails, setRackDetails] = useState<SlotDetailsResponse | null>(null);
  const [isLoadingRackDetails, setIsLoadingRackDetails] = useState(false);
  const [showPrintBarcodeModal, setShowPrintBarcodeModal] = useState(false);
  const [selectedRacksForPrint, setSelectedRacksForPrint] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);

  const router = useRouter();

  // Fetch storage slots from API for ST zone
  useEffect(() => {
    const fetchStorageSlots = async () => {
      try {
        setIsLoadingSlots(true);
        const response = await storageSlotService.getStorageSlots("ST");
        setStorageSlots(response.results || []);
      } catch (error) {
        console.error("Failed to fetch storage slots:", error);
        toast.error("Failed to load storage slots");
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchStorageSlots();
  }, []);

  // Map storage slots to RackLocation format
  const racks = useMemo(() => {
    if (storageSlots.length === 0) {
      return [];
    }

    // Convert to RackLocation format
    const mappedRacks: RackLocation[] = storageSlots.map((slot) => {
      // Find if any box is stored in this slot
      const storedBox = boxes.find(
        (box) => box.rackLocation?.id === slot._id
      );

      // Determine status
      let status: RackLocation["status"] = "Available";
      if (storedBox) {
        status = "Occupied";
      } else if (!slot.isActive) {
        status = "Maintenance";
      }

      // Use shelfNumber as row and floorNumber as column
      return {
        id: slot._id,
        rackCode: slot.label,
        row: slot.shelfNumber,
        column: slot.floorNumber,
        shelf: slot.shelfNumber,
        barcode: slot.barcode,
        capacity: 1, // Each slot can hold one box
        currentBoxes: storedBox ? 1 : 0,
        status,
      };
    });

    return mappedRacks;
  }, [storageSlots, boxes]);

  // Calculate grid dimensions
  const gridDimensions = useMemo(() => {
    if (storageSlots.length > 0) {
      const maxShelf = Math.max(...storageSlots.map((s) => s.shelfNumber), 0);
      const maxFloor = Math.max(...storageSlots.map((s) => s.floorNumber), 0);
      return {
        rows: Math.max(maxShelf, preferences.gridRows),
        columns: Math.max(maxFloor, preferences.gridColumns),
      };
    }
    return {
      rows: preferences.gridRows,
      columns: preferences.gridColumns,
    };
  }, [storageSlots, preferences]);

  // Organize racks into grid based on shelfNumber (row) and floorNumber (column)
  const rackGrid = useMemo(() => {
    if (isLoadingSlots) {
      return [];
    }

    const grid: (RackLocation | null)[][] = [];
    for (let row = 0; row < gridDimensions.rows; row++) {
      grid[row] = [];
      for (let col = 0; col < gridDimensions.columns; col++) {
        const rack = racks.find(
          (r) => r.row === row + 1 && r.column === col + 1
        );
        grid[row][col] = rack || null;
      }
    }
    return grid;
  }, [racks, gridDimensions, isLoadingSlots]);

  const getRackStatusColor = (rack: RackLocation | null) => {
    if (!rack) return "bg-gray-100 border-gray-200";
    switch (rack.status) {
      case "Available":
        return "bg-green-50 border-green-200 hover:bg-green-100";
      case "Occupied":
        return "bg-blue-50 border-blue-300 hover:bg-blue-100";
      case "Reserved":
        return "bg-yellow-50 border-yellow-300 hover:bg-yellow-100";
      case "Maintenance":
        return "bg-red-50 border-red-300";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getRackBox = (rack: RackLocation) => {
    return boxes.find((b) => b.rackLocation?.id === rack.id);
  };

  const handleRackClick = async (rack: RackLocation) => {
    try {
      setIsLoadingRackDetails(true);
      setIsRackModalOpen(true);
      const details = await storageSlotService.getSlotDetailsByBarcode(rack.barcode);
      setRackDetails(details);
    } catch (error) {
      console.error("Failed to fetch rack details:", error);
      toast.error("Failed to load rack details");
      setIsRackModalOpen(false);
    } finally {
      setIsLoadingRackDetails(false);
    }
  };

  // Helper function to generate barcode SVG
  const generateBarcodeSVG = (barcodeValue: string): string => {
    try {
      const tempDiv = document.createElement('div');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tempDiv.appendChild(svg);

      JsBarcode(svg, barcodeValue, {
        format: "CODE128",
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        background: "transparent"
      });

      const svgHTML = svg.outerHTML;
      tempDiv.remove();

      return svgHTML;
    } catch (error) {
      console.error('Error generating barcode:', error);
      return `<div style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; padding: 10px;">${barcodeValue}</div>`;
    }
  };

  // Handle print selected racks barcode
  const handlePrintSelectedRacks = async () => {
    if (selectedRacksForPrint.length === 0) {
      toast.error("Please select at least one rack");
      return;
    }

    const selectedRacks = racks.filter((r) => selectedRacksForPrint.includes(r.id) && r.barcode);
    if (selectedRacks.length === 0) {
      toast.error("No valid racks selected");
      return;
    }

    setIsPrinting(true);
    const toastId = toast.loading(`Printing ${selectedRacks.length} rack barcode(s)...`);

    try {
      const result = await printRacks(selectedRacks.map(r => ({
        rackCode: r.rackCode,
        barcode: r.barcode!,
        shelf: r.shelf,
        floor: r.column,
        zone: 'ST'
      })));

      if (result.success) {
        toast.success(`Successfully printed ${result.printed} rack barcode(s)`, { id: toastId });
      } else {
        toast.error(result.error || "Failed to print rack barcodes", { id: toastId });
      }
    } catch (error: any) {
      toast.error(error.message || "Printing error", { id: toastId });
    } finally {
      setIsPrinting(false);
    }
  };

  // Handle print all racks barcode
  const handlePrintAllRacks = async () => {
    const racksToPrint = racks.filter((rack) => rack.barcode);
    if (racksToPrint.length === 0) {
      toast.error("No racks available to print");
      return;
    }

    setIsPrinting(true);
    const toastId = toast.loading(`Printing all ${racksToPrint.length} rack barcodes...`);

    try {
      const result = await printRacks(racksToPrint.map(r => ({
        rackCode: r.rackCode,
        barcode: r.barcode!,
        shelf: r.shelf,
        floor: r.column,
        zone: 'ST'
      })));

      if (result.success) {
        toast.success(`Successfully printed all ${result.printed} rack barcodes`, { id: toastId });
      } else {
        toast.error(result.error || "Failed to print barcodes", { id: toastId });
      }
    } catch (error: any) {
      toast.error(error.message || "Printing error", { id: toastId });
    } finally {
      setIsPrinting(false);
    }
  };

  const mapYarnBoxToPackedBox = useCallback((box: YarnBox): PackedBox => {
    const qcApproved = box.qcData?.status === "qc_approved";

    return {
      id: box._id || box.id || box.boxId || box.barcode,
      boxBarcode: box.barcode,
      yarnId: box._id || box.id || box.boxId || box.barcode,
      yarnName: box.yarnName || "",
      batchNumber: box.lotNumber || "",
      weight: box.boxWeight ?? 0,
      numberOfCones: box.numberOfCones ?? 0,
      qcApproved,
      qcApprovedDate: box.qcData?.date,
      rackLocation: undefined,
      storedDate: box.receivedDate,
      status: qcApproved ? "Stored" : "QC_Pending",
    };
  }, []);

  const fetchBoxByBarcode = useCallback(
    async (barcode: string): Promise<PackedBox | null> => {
      const trimmedBarcode = barcode.trim();

      if (!trimmedBarcode) {
        toast.error("Please enter a barcode to scan");
        return null;
      }

      setIsLoadingBox(true);
      try {
        console.log(
          "ShortTermStorage - fetching box by barcode:",
          trimmedBarcode
        );
        const boxDetails = await yarnBoxService.getYarnBoxByBarcode(
          trimmedBarcode
        );

        setScannedBoxDetails(boxDetails);
        const mappedBox = mapYarnBoxToPackedBox(boxDetails);

        if (mappedBox.status !== "Stored") {
          setSelectedBox(null);
          toast.error(
            "Box must be QC approved and stored in long-term storage before transfer"
          );
          return null;
        }

        setSelectedBox(mappedBox);
        toast.success(`Box ${boxDetails.boxId || trimmedBarcode} fetched`);
        return mappedBox;
      } catch (error) {
        console.error("Failed to fetch box details:", error);
        setScannedBoxDetails(null);
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch box details"
        );
        return null;
      } finally {
        setIsLoadingBox(false);
      }
    },
    [mapYarnBoxToPackedBox]
  );

  const handleTransferClick = () => {
    void handleProcessBox();
  };

  const handleBoxScan = useCallback(
    async (barcode: string) => {
      const mappedBox = await fetchBoxByBarcode(barcode);
      return mappedBox;
    },
    [fetchBoxByBarcode]
  );

  const handleProcessBox = useCallback(async () => {
    if (!scannedBoxDetails) {
      toast.error("Scan a box before processing");
      return;
    }

    const identifier =
      scannedBoxDetails.boxId ||
      scannedBoxDetails.barcode ||
      scannedBoxDetails._id ||
      scannedBoxDetails.id;

    if (!identifier) {
      toast.error("Unable to determine box identifier");
      return;
    }

    setIsProcessingBox(true);
    try {
      const response = await yarnConeService.generateConesByBox(identifier);

      let updatedBox: PackedBox | null = null;

      if (response.box) {
        setScannedBoxDetails(response.box);
        const mappedBox = mapYarnBoxToPackedBox(response.box);
        updatedBox = mappedBox.status === "Stored" ? mappedBox : null;
        setSelectedBox(updatedBox);
      }

      const transferSource = updatedBox ?? selectedBox;

      if (transferSource) {
        const cones: Cone[] = (response.cones || []).map((cone) => ({
          id: cone._id,
          coneBarcode: cone.barcode,
          boxId: cone.boxId || transferSource.id,
          boxBarcode: transferSource.boxBarcode,
          yarnId: transferSource.yarnId,
          yarnName: transferSource.yarnName,
          weight:
            cone.coneWeight ??
            (transferSource.numberOfCones > 0
              ? transferSource.weight / transferSource.numberOfCones
              : 0),
          status: "Transferred",
          transferredDate: new Date().toISOString(),
        }));

        const transferData: InternalTransferData = {
          boxBarcode: transferSource.boxBarcode,
          boxId: transferSource.id,
          yarnId: transferSource.yarnId,
          yarnName: transferSource.yarnName,
          numberOfCones: cones.length || transferSource.numberOfCones,
          totalWeight: transferSource.weight,
          cones,
        };

        onInternalTransfer(transferData);
      }

      const targetBoxId = response.box?.boxId || identifier;

      if (typeof window !== "undefined" && targetBoxId) {
        try {
          const storageKey = getProcessedBoxStorageKey(targetBoxId);
          sessionStorage.setItem(storageKey, JSON.stringify(response));
        } catch (storageError) {
          console.error("Failed to cache processed box details:", storageError);
        }
      }

      toast.success(response.message || "Cones generated successfully");
      router.push(
        `/yarn-management/purchase-management/yarn-storage/process/${encodeURIComponent(
          targetBoxId
        )}`
      );
    } catch (error) {
      console.error("Failed to process box:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process box"
      );
    } finally {
      setIsProcessingBox(false);
    }
  }, [
    mapYarnBoxToPackedBox,
    scannedBoxDetails,
    router,
    selectedBox,
    onInternalTransfer,
  ]);

  const handleScannerScan = useCallback(
    async (barcode: string) => {
      const mappedBox = await handleBoxScan(barcode);
      return mappedBox ? true : false;
    },
    [handleBoxScan]
  );

  return (
    <div className="space-y-6">
      {/* Header with Transfer Button */}
      <div className="flex justify-between items-center mb-0 px-1">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Short-Term Storage</h2>
          <p className="text-gray-600">Yarn inventory for knitting operations</p>
        </div>
        <QZTrayStatus />
      </div>

      <div className="box !bg-transparent border-0 shadow-none">
        <div className="box-header flex justify-between items-center">
          <div>
            <h2 className="box-title text-xl font-semibold">
              Short-Term Storage
            </h2>
            <p className="text-gray-600 mt-1">
              Yarn inventory for knitting operations
            </p>
          </div>
          {/* <button
            onClick={handleTransferClick}
            className="ti-btn ti-btn-primary"
            disabled={!scannedBoxDetails || isProcessingBox}
          >
            <i className="ri-arrow-right-left-line me-1"></i>
            Process Box
          </button> */}
        </div>
      </div>

      {/* Box Scanner */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">
            <i className="ri-barcode-line me-2"></i>
            Scan Box Barcode
          </h3>
        </div>
        <div className="box-body space-y-3">
          <BarcodeScanner
            onScan={handleScannerScan}
            label="Scan Box Barcode"
            placeholder="Scan box barcode from long-term storage"
            disabled={isLoadingBox || isProcessingBox}
          />
          {isLoadingBox && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <i className="ri-loader-4-line animate-spin"></i>
              <span>Fetching box details...</span>
            </div>
          )}
        </div>
      </div>

      {/* Scanned Box Details */}
      {scannedBoxDetails && (
        <div className="box">
          <div className="box-header flex justify-between items-center">
            <h3 className="box-title">
              <i className="ri-information-line me-2"></i>
              Box Details
            </h3>
            <button
              type="button"
              onClick={() => {
                setScannedBoxDetails(null);
                setSelectedBox(null);
              }}
              className="text-gray-400 hover:text-gray-600 transition"
              title="Clear box details"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
          <div className="box-body space-y-6">
            {isLoadingBox && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <i className="ri-loader-4-line animate-spin"></i>
                <span>Fetching latest details...</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase">
                  Box ID
                </label>
                <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                  {scannedBoxDetails.boxId}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase">
                  Barcode
                </label>
                <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                  {scannedBoxDetails.barcode}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase">
                  PO Number
                </label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  {scannedBoxDetails.poNumber}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase">
                  Yarn Name
                </label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  {scannedBoxDetails.yarnName || "-"}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase">
                  Shade Code
                </label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  {scannedBoxDetails.shadeCode || "-"}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase">
                  Order Qty
                </label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  {scannedBoxDetails.orderQty || 0}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase">
                  Box Weight (kg)
                </label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  {scannedBoxDetails.boxWeight ?? "-"}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase">
                  Number of Cones
                </label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                  {scannedBoxDetails.numberOfCones ?? "-"}
                </div>
              </div>
              {scannedBoxDetails.receivedDate && (
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">
                    Received Date
                  </label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {new Date(scannedBoxDetails.receivedDate).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* {scannedBoxDetails.qcData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <i className="ri-checkbox-circle-line text-blue-600"></i>
                  <h4 className="text-sm font-semibold text-blue-900">
                    QC Status
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-blue-700 uppercase">
                      Status
                    </label>
                    <div className="mt-1">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          scannedBoxDetails.qcData.status === "qc_approved"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {scannedBoxDetails.qcData.status === "qc_approved"
                          ? "QC Approved"
                          : "QC Rejected"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-blue-700 uppercase">
                      QC Date
                    </label>
                    <div className="mt-1 text-sm text-blue-900">
                      {new Date(scannedBoxDetails.qcData.date).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-blue-700 uppercase">
                      Inspector
                    </label>
                    <div className="mt-1 text-sm text-blue-900">
                      {scannedBoxDetails.qcData.username}
                    </div>
                  </div>
                  {scannedBoxDetails.qcData.remarks && (
                    <div className="col-span-full">
                      <label className="text-xs font-medium text-blue-700 uppercase">
                        Remarks
                      </label>
                      <div className="mt-1 text-sm text-blue-900 bg-white p-2 rounded border border-blue-200">
                        {scannedBoxDetails.qcData.remarks}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )} */}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleProcessBox}
                className="ti-btn ti-btn-primary"
                disabled={!scannedBoxDetails || isProcessingBox}
              >
                {isProcessingBox ? (
                  <>
                    <i className="ri-loader-4-line animate-spin me-2"></i>
                    Transferring
                  </>
                ) : (
                  <>
                    <i className="ri-barcode-box-line me-2"></i>
                    Internal Transfer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2D Grid Layout */}
      <div className="box">
        <div className="box-header flex justify-between items-center">
          <h3 className="box-title">
            Storage Layout
            {isLoadingSlots ? (
              <span className="ml-2 text-sm text-gray-500">Loading...</span>
            ) : (
              <span className="ml-2 text-sm text-gray-500">
                ({racks.length} slots)
              </span>
            )}
          </h3>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-50 border border-blue-300 rounded"></div>
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded"></div>
                <span>Reserved</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
                <span>Maintenance</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPrintBarcodeModal(true)}
              className="ti-btn ti-btn-primary text-xs px-3 py-1.5 ml-2"
              title="Print rack barcodes"
            >
              <i className="ri-printer-line me-1"></i>
              Print Barcode
            </button>
          </div>
        </div>
        <div className="box-body">
          {isLoadingSlots ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Loading storage slots...</p>
              </div>
            </div>
          ) : rackGrid.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <i className="ri-inbox-line text-4xl mb-4 block"></i>
              <p>No storage slots found</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <div
                className="grid gap-4 p-6 w-full"
                style={{
                  gridTemplateColumns: `repeat(${gridDimensions.columns}, minmax(160px, 1fr))`,
                }}
              >
                {rackGrid.map((row, rowIndex) =>
                  row.map((rack, colIndex) => {
                    if (!rack && !preferences.showEmptySlots) return null;

                    const box = rack ? getRackBox(rack) : null;

                    return (
                      <div
                        key={rack ? rack.id : `empty-${rowIndex}-${colIndex}`}
                        className={`
                        relative border-2 rounded-xl p-4 min-h-[140px] transition-all cursor-pointer
                        ${getRackStatusColor(rack)}
                        ${rack ? "hover:shadow-lg hover:scale-[1.02]" : ""}
                        flex flex-col justify-between
                      `}
                        onClick={() => {
                          if (rack) {
                            handleRackClick(rack);
                          }
                        }}
                      >
                        {rack ? (
                          <>
                            <div className="text-sm font-bold text-gray-800 mb-2">
                              {rack.rackCode}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-1">
                                <i className="ri-building-line text-xs"></i>
                                <span>Floor: {rack.column}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <i className="ri-stack-line text-xs"></i>
                                <span>Shelf: {rack.shelf}</span>
                              </div>
                            </div>
                            {/* {box ? (
                            <div className="text-xs text-gray-600 space-y-0.5 mt-1">
                              <div className="truncate font-medium">{box.boxBarcode}</div>
                              <div className="text-gray-500">
                                {box.numberOfCones} cones
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 mt-2">
                              Empty
                            </div>
                          )}
                          {rack.status === "Occupied" && (
                            <div className="absolute top-1 right-1">
                              <i className="ri-checkbox-circle-fill text-blue-500 text-sm"></i>
                            </div>
                          )} */}
                          </>
                        ) : (
                          <div className="text-sm text-gray-400 text-center flex items-center justify-center h-full">
                            No Rack
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rack Details Modal */}
      <RackDetailsModal
        isOpen={isRackModalOpen}
        onClose={() => {
          setIsRackModalOpen(false);
          setRackDetails(null);
        }}
        slot={rackDetails?.storageSlot || null}
        boxes={
          rackDetails?.type === "boxes"
            ? (rackDetails.data as BoxInSlot[])
            : undefined
        }
        cones={
          rackDetails?.type === "cones"
            ? (rackDetails.data as ConeInSlot[])
            : undefined
        }
        zoneType={rackDetails?.zoneType || ""}
        dataType={rackDetails?.type || "cones"}
        isLoading={isLoadingRackDetails}
      />

      {/* Print Barcode Modal */}
      {showPrintBarcodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowPrintBarcodeModal(false);
            setSelectedRacksForPrint([]);
          }
        }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="box-header border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <h3 className="box-title text-lg font-semibold">
                Print Rack Barcode
              </h3>
            </div>
            <div className="box-body px-6 py-4 overflow-y-auto flex-1">
              <div className="mb-4 flex justify-between items-center">
                <label className="form-label text-sm font-medium text-gray-700">
                  Select Racks <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allRackIds = racks.filter((r) => r.barcode).map((r) => r.id);
                      setSelectedRacksForPrint(allRackIds);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRacksForPrint([])}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 max-h-[400px] overflow-y-auto bg-gray-50">
                <div className="space-y-2">
                  {racks
                    .filter((rack) => rack.barcode)
                    .map((rack) => (
                      <label
                        key={rack.id}
                        className="flex items-center p-2 rounded hover:bg-white cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRacksForPrint.includes(rack.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRacksForPrint([...selectedRacksForPrint, rack.id]);
                            } else {
                              setSelectedRacksForPrint(selectedRacksForPrint.filter((id) => id !== rack.id));
                            }
                          }}
                          className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="ml-3 text-sm text-gray-700">
                          <span className="font-medium">{rack.rackCode}</span>
                          <span className="text-gray-500 ml-2">(Floor: {rack.column}, Shelf: {rack.shelf})</span>
                        </span>
                      </label>
                    ))}
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Selected: {selectedRacksForPrint.length} of {racks.filter((r) => r.barcode).length} racks
              </div>
            </div>
            <div className="box-footer border-t border-gray-200 px-6 py-4 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setShowPrintBarcodeModal(false);
                  setSelectedRacksForPrint([]);
                }}
                className="ti-btn ti-btn-light"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handlePrintAllRacks();
                  setShowPrintBarcodeModal(false);
                  setSelectedRacksForPrint([]);
                }}
                className="ti-btn ti-btn-primary"
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <i className="ri-loader-4-line animate-spin me-1"></i>
                ) : (
                  <i className="ri-printer-line me-1"></i>
                )}
                Print All Racks
              </button>
              <button
                onClick={async () => {
                  await handlePrintSelectedRacks();
                  setShowPrintBarcodeModal(false);
                  setSelectedRacksForPrint([]);
                }}
                className="ti-btn ti-btn-primary"
                disabled={selectedRacksForPrint.length === 0 || isPrinting}
              >
                {isPrinting ? (
                  <i className="ri-loader-4-line animate-spin me-1"></i>
                ) : (
                  <i className="ri-printer-line me-1"></i>
                )}
                Print Selected ({selectedRacksForPrint.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortTermStorage;

