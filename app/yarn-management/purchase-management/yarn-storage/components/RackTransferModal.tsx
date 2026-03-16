"use client";
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import BarcodeScanner from "./BarcodeScanner";
import yarnBoxService, { YarnBox } from "@/shared/services/yarnBoxService";
import { RackLocation } from "../types";
import { BoxInSlot } from "@/shared/services/storageSlotService";
import { fetchRackDetailsFromYarnApis } from "../utils/rackDetailsApi";

export type TransferType = "LT_TO_LT" | "ST_TO_ST" | "LT_TO_ST";

interface RackTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferType: TransferType;
  sourceRack?: RackLocation | null;
  availableRacks: RackLocation[];
  onTransferComplete?: (sourceRackBarcode?: string, destinationRackBarcode?: string) => void;
  initialBoxId?: string; // Optional: pre-select a box when opening the modal
}

const RackTransferModal: React.FC<RackTransferModalProps> = ({
  isOpen,
  onClose,
  transferType,
  sourceRack,
  availableRacks,
  onTransferComplete,
  initialBoxId,
}) => {
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>([]);
  const [scannedBox, setScannedBox] = useState<YarnBox | null>(null);
  const [isLoadingBox, setIsLoadingBox] = useState(false);
  const [selectedDestinationRack, setSelectedDestinationRack] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [destinationRacks, setDestinationRacks] = useState<RackLocation[]>([]);
  const [rackBoxes, setRackBoxes] = useState<BoxInSlot[]>([]);
  const [isLoadingRackBoxes, setIsLoadingRackBoxes] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedBoxIds([]);
      setScannedBox(null);
      setSelectedDestinationRack("");
    }
  }, [isOpen]);

  // Auto-select initial box when modal opens
  useEffect(() => {
    if (isOpen && initialBoxId) {
      setSelectedBoxIds([initialBoxId]);
      // Try to fetch box details by barcode first
      yarnBoxService.getYarnBoxByBarcode(initialBoxId).then((box) => {
        setScannedBox(box);
      }).catch(() => {
        // If barcode lookup fails, try by boxId
        if (initialBoxId.startsWith("BOX-")) {
          yarnBoxService.getYarnBoxById(initialBoxId).then((box) => {
            setScannedBox(box);
          }).catch(() => {
            console.warn("Could not fetch box details for", initialBoxId);
          });
        }
      });
    }
  }, [isOpen, initialBoxId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter destination racks based on transfer type
  useEffect(() => {
    if (!isOpen) return;

    let filteredRacks: RackLocation[] = [];

    switch (transferType) {
      case "LT_TO_LT":
        filteredRacks = availableRacks.filter(
          (rack) => rack.barcode.startsWith("LT-") && rack.id !== sourceRack?.id
        );
        break;
      case "ST_TO_ST":
        filteredRacks = availableRacks.filter(
          (rack) => rack.barcode.startsWith("ST-") && rack.id !== sourceRack?.id
        );
        break;
      case "LT_TO_ST":
        filteredRacks = availableRacks.filter(
          (rack) => rack.barcode.startsWith("ST-")
        );
        break;
    }

    setDestinationRacks(filteredRacks);
  }, [isOpen, transferType, availableRacks, sourceRack]);

  // Load boxes from source rack when source rack changes
  useEffect(() => {
    const loadRackBoxes = async () => {
      if (!sourceRack?.barcode || !isOpen) {
        setRackBoxes([]);
        return;
      }

      setIsLoadingRackBoxes(true);
      try {
        const zoneType = transferType === "ST_TO_ST" ? "ST" : "LT";
        const details = await fetchRackDetailsFromYarnApis(
          sourceRack.barcode,
          zoneType,
          null
        );
        if (details.type === "boxes") {
          setRackBoxes(details.data as BoxInSlot[]);
        } else {
          setRackBoxes([]);
        }
      } catch (error) {
        console.error("Failed to load rack boxes:", error);
        toast.error("Failed to load boxes from source rack");
        setRackBoxes([]);
      } finally {
        setIsLoadingRackBoxes(false);
      }
    };

    loadRackBoxes();
  }, [sourceRack, isOpen]);

  const handleBoxScan = async (barcode: string) => {
    const trimmedBarcode = barcode.trim();
    if (!trimmedBarcode) {
      toast.error("Please enter a barcode");
      return;
    }

    setIsLoadingBox(true);
    try {
      const box = await yarnBoxService.getYarnBoxByBarcode(trimmedBarcode);

      // Validate box is in the source rack
      if (sourceRack && box.storageLocation !== sourceRack.barcode) {
        toast.error(
          `Box is not in source rack ${sourceRack.rackCode}. Current location: ${box.storageLocation || "Unknown"}`
        );
        setScannedBox(null);
        return;
      }

      // Validate box is stored and QC approved (fallback: storedStatus+storageLocation for legacy boxes without qcData)
      const qcApproved =
        box.qcData?.status === "qc_approved" ||
        (box.storedStatus === true && !!box.storageLocation);
      if (!box.storedStatus || !qcApproved) {
        toast.error("Box must be stored and QC approved");
        setScannedBox(null);
        return;
      }

      // Validate storage location matches transfer type.
      // Slot barcodes can be "B7-02-S0029-F01" or "LT-"/"ST-" prefixed. If box is in sourceRack (barcode match), that's sufficient.
      const currentLocation = box.storageLocation || "";
      const inSourceRack = sourceRack && sourceRack.barcode === currentLocation;
      if (transferType === "LT_TO_LT" || transferType === "LT_TO_ST") {
        if (!inSourceRack && !currentLocation.startsWith("LT-")) {
          toast.error("Box must be in long-term storage for this transfer");
          setScannedBox(null);
          return;
        }
      } else if (transferType === "ST_TO_ST") {
        if (!inSourceRack && !currentLocation.startsWith("ST-")) {
          toast.error("Box must be in short-term storage for ST→ST transfer");
          setScannedBox(null);
          return;
        }
      }

      setScannedBox(box);
      if (!selectedBoxIds.includes(box.boxId)) {
        setSelectedBoxIds([...selectedBoxIds, box.boxId]);
      }
      toast.success(`Box ${box.boxId} scanned successfully`);
    } catch (error) {
      console.error("Failed to fetch box:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to fetch box details"
      );
      setScannedBox(null);
    } finally {
      setIsLoadingBox(false);
    }
  };

  const handleRemoveBox = (boxId: string) => {
    setSelectedBoxIds(selectedBoxIds.filter((id) => id !== boxId));
    if (scannedBox?.boxId === boxId) {
      setScannedBox(null);
    }
  };

  const handleTransfer = async () => {
    if (selectedBoxIds.length === 0) {
      toast.error("Please select at least one box to transfer");
      return;
    }

    if (!selectedDestinationRack) {
      toast.error("Please select a destination rack");
      return;
    }

    const destinationRack = destinationRacks.find(
      (r) => r.id === selectedDestinationRack
    );
    if (!destinationRack) {
      toast.error("Invalid destination rack");
      return;
    }

    setIsTransferring(true);
    try {
      const response = await yarnBoxService.transferBoxes({
        boxIds: selectedBoxIds,
        toStorageLocation: destinationRack.barcode,
        transferDate: new Date().toISOString(),
      });

      toast.success(
        response.message || `Successfully transferred ${response.boxesTransferred} box(es)`
      );

      // Get source and destination rack barcodes before resetting
      const sourceRackBarcode = sourceRack?.barcode;
      const destRackBarcode = destinationRack.barcode;

      // Reset state
      setSelectedBoxIds([]);
      setScannedBox(null);
      setSelectedDestinationRack("");
      
      // Call transfer complete with affected rack barcodes
      onTransferComplete?.(sourceRackBarcode, destRackBarcode);
      onClose();
    } catch (error) {
      console.error("Transfer failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to transfer boxes"
      );
    } finally {
      setIsTransferring(false);
    }
  };

  const transferTypeLabel = useMemo(() => {
    switch (transferType) {
      case "LT_TO_LT":
        return "Long-Term to Long-Term";
      case "ST_TO_ST":
        return "Short-Term to Short-Term";
      case "LT_TO_ST":
        return "Long-Term to Short-Term";
    }
  }, [transferType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="box-header border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="box-title text-lg font-semibold">
              Internal Transfer - {transferTypeLabel}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isTransferring}
            >
              <i className="ri-close-line text-2xl"></i>
            </button>
          </div>
        </div>

        <div className="box-body px-6 py-4 overflow-y-auto flex-1 space-y-6">
          {/* Source Rack Info */}
          {sourceRack && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Source Rack</h4>
              <div className="text-sm text-blue-700">
                <div>
                  <span className="font-medium">Rack Code:</span> {sourceRack.rackCode}
                </div>
                <div>
                  <span className="font-medium">Barcode:</span> {sourceRack.barcode}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {sourceRack.status}
                </div>
              </div>
            </div>
          )}

          {/* Box Selection */}
          <div>
            <h4 className="font-semibold mb-3">Select Boxes to Transfer</h4>
            <BarcodeScanner
              onScan={handleBoxScan}
              label="Scan Box Barcode"
              placeholder="Scan box barcode to add to transfer"
              disabled={isLoadingBox || isTransferring}
            />
            {isLoadingBox && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <i className="ri-loader-4-line animate-spin"></i>
                <span>Loading box details...</span>
              </div>
            )}

            {/* Selected Boxes */}
            {selectedBoxIds.length > 0 && (
              <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h5 className="font-medium text-sm">
                    Selected Boxes ({selectedBoxIds.length})
                  </h5>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {selectedBoxIds.map((boxId) => (
                      <div
                        key={boxId}
                        className="px-4 py-2 flex justify-between items-center hover:bg-gray-50"
                      >
                        <span className="text-sm font-mono">{boxId}</span>
                        <button
                          onClick={() => handleRemoveBox(boxId)}
                          className="text-red-500 hover:text-red-700"
                          disabled={isTransferring}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Rack Boxes List (if source rack provided) */}
            {sourceRack && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-sm">
                    Boxes in {sourceRack.rackCode}
                  </h5>
                  {isLoadingRackBoxes && (
                    <i className="ri-loader-4-line animate-spin text-gray-500"></i>
                  )}
                </div>
                {rackBoxes.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <div className="divide-y divide-gray-200">
                        {rackBoxes.map((box) => (
                          <div
                            key={box.boxId}
                            className="px-4 py-2 flex justify-between items-center hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              if (!selectedBoxIds.includes(box.boxId)) {
                                setSelectedBoxIds([...selectedBoxIds, box.boxId]);
                                toast.success(`Box ${box.boxId} added`);
                              }
                            }}
                          >
                            <div className="flex-1">
                              <div className="text-sm font-mono">{box.boxId}</div>
                              <div className="text-xs text-gray-500">
                                {box.yarnName || "-"} | {box.boxWeight || 0} kg
                              </div>
                            </div>
                            {selectedBoxIds.includes(box.boxId) ? (
                              <i className="ri-checkbox-circle-fill text-green-500"></i>
                            ) : (
                              <i className="ri-checkbox-blank-circle-line text-gray-400"></i>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : !isLoadingRackBoxes ? (
                  <p className="text-sm text-gray-500">No boxes in this rack</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Destination Rack Selection */}
          <div>
            <label className="form-label text-sm font-medium text-gray-700 mb-2 block">
              Destination Rack <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <BarcodeScanner
                onScan={(barcode) => {
                  const trimmedBarcode = barcode.trim();
                  const rack = destinationRacks.find((r) => r.barcode === trimmedBarcode);
                  if (rack) {
                    setSelectedDestinationRack(rack.id);
                    toast.success(`Destination rack ${rack.rackCode} selected`);
                  } else {
                    toast.error("Rack not found or not available for this transfer type");
                  }
                }}
                label="Scan Destination Rack Barcode"
                placeholder="Scan destination rack barcode"
                disabled={isTransferring || destinationRacks.length === 0}
              />
              <div className="text-center text-xs text-gray-500">OR</div>
              <select
                value={selectedDestinationRack}
                onChange={(e) => setSelectedDestinationRack(e.target.value)}
                className="form-control"
                disabled={isTransferring || destinationRacks.length === 0}
              >
                <option value="">Select destination rack from list</option>
                {destinationRacks.map((rack) => (
                  <option key={rack.id} value={rack.id}>
                    {rack.rackCode} ({rack.barcode}) - {rack.status}
                  </option>
                ))}
              </select>
            </div>
            {destinationRacks.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No available destination racks for this transfer type
              </p>
            )}
          </div>
        </div>

        <div className="box-footer border-t border-gray-200 px-6 py-4 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="ti-btn ti-btn-light"
            disabled={isTransferring}
          >
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            className="ti-btn ti-btn-primary"
            disabled={
              isTransferring ||
              selectedBoxIds.length === 0 ||
              !selectedDestinationRack
            }
          >
            {isTransferring ? (
              <>
                <i className="ri-loader-4-line animate-spin me-1"></i>
                Transferring...
              </>
            ) : (
              <>
                <i className="ri-arrow-right-left-line me-1"></i>
                Transfer {selectedBoxIds.length} Box(es)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RackTransferModal;
