"use client";
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import BarcodeScanner from "./BarcodeScanner";
import yarnConeService, { YarnCone } from "@/shared/services/yarnConeService";
import storageSlotService from "@/shared/services/storageSlotService";
import { RackLocation } from "../types";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";

interface ConeTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableRacks: RackLocation[];
  onTransferComplete?: (sourceRackBarcode?: string, destinationRackBarcode?: string) => void;
}

const getAccessToken = (): string | null => {
  if (typeof document === "undefined") return null;
  try {
    const tokenFromCookie = Cookies.get("accessToken");
    if (tokenFromCookie) return tokenFromCookie;
    const tokenFromStorage = localStorage.getItem("token");
    if (tokenFromStorage) return tokenFromStorage;
    return null;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
};

const ConeTransferModal: React.FC<ConeTransferModalProps> = ({
  isOpen,
  onClose,
  availableRacks,
  onTransferComplete,
}) => {
  const [selectedCone, setSelectedCone] = useState<YarnCone | null>(null);
  const [isLoadingCone, setIsLoadingCone] = useState(false);
  const [selectedDestinationRack, setSelectedDestinationRack] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [destinationRacks, setDestinationRacks] = useState<RackLocation[]>([]);
  const [sourceRackInfo, setSourceRackInfo] = useState<{ barcode: string; label: string } | null>(null);

  // Filter destination racks - only ST racks
  useEffect(() => {
    if (!isOpen) return;

    const filteredRacks = availableRacks.filter(
      (rack) => rack.barcode.startsWith("ST-")
    );

    setDestinationRacks(filteredRacks);
  }, [isOpen, availableRacks]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCone(null);
      setSelectedDestinationRack("");
      setSourceRackInfo(null);
    }
  }, [isOpen]);

  const handleConeScan = async (barcode: string) => {
    const trimmedBarcode = barcode.trim();
    if (!trimmedBarcode) {
      toast.error("Please enter a cone barcode");
      return;
    }

    setIsLoadingCone(true);
    try {
      // Fetch cone by barcode
      const token = getAccessToken();
      const response = await fetch(
        `${API_BASE_URL}/yarn-management/yarn-cones/barcode/${trimmedBarcode}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch cone details");
      }

      const cone = await response.json();

      // Validate cone is in short-term storage
      if (!cone.coneStorageId || !cone.coneStorageId.startsWith("ST-")) {
        toast.error("Cone must be in short-term storage to transfer");
        setSelectedCone(null);
        return;
      }

      // Get source rack info
      try {
        const slotDetails = await storageSlotService.getSlotDetailsByBarcode(cone.coneStorageId);
        setSourceRackInfo({
          barcode: cone.coneStorageId,
          label: slotDetails.storageSlot?.label || cone.coneStorageId,
        });
      } catch (error) {
        console.error("Failed to fetch source rack info:", error);
        setSourceRackInfo({
          barcode: cone.coneStorageId,
          label: cone.coneStorageId,
        });
      }

      setSelectedCone(cone);
      toast.success(`Cone ${cone.barcode} found`);
    } catch (error) {
      console.error("Failed to fetch cone:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to fetch cone details"
      );
      setSelectedCone(null);
      setSourceRackInfo(null);
    } finally {
      setIsLoadingCone(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedCone) {
      toast.error("Please scan a cone first");
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

    // Don't allow transfer to same location
    if (selectedCone.coneStorageId === destinationRack.barcode) {
      toast.error("Cone is already in this location");
      return;
    }

    setIsTransferring(true);
    try {
      const coneId = selectedCone._id || selectedCone.id;
      if (!coneId) {
        throw new Error("Cone ID not found");
      }

      // Update cone storage location
      await yarnConeService.updateYarnCone(coneId, {
        coneStorageId: destinationRack.barcode,
      });

      toast.success(
        `Successfully transferred cone ${selectedCone.barcode} to ${destinationRack.rackCode}`
      );

      // Get source rack barcode before resetting
      const sourceRackBarcode = selectedCone.coneStorageId;
      const destRackBarcode = destinationRack.barcode;

      // Reset state
      setSelectedCone(null);
      setSelectedDestinationRack("");
      setSourceRackInfo(null);
      
      // Call transfer complete with affected rack barcodes
      onTransferComplete?.(sourceRackBarcode, destRackBarcode);
      onClose();
    } catch (error) {
      console.error("Transfer failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to transfer cone"
      );
    } finally {
      setIsTransferring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="box-header border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="box-title text-lg font-semibold">
              Transfer Cone (ST→ST)
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
          {/* Cone Scanning */}
          <div>
            <h4 className="font-semibold mb-3">Scan Cone Barcode</h4>
            <BarcodeScanner
              onScan={handleConeScan}
              label="Cone Barcode"
              placeholder="Scan or enter cone barcode"
              disabled={isLoadingCone || isTransferring}
            />
            {isLoadingCone && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                <i className="ri-loader-4-line animate-spin"></i>
                <span>Loading cone details...</span>
              </div>
            )}
          </div>

          {/* Selected Cone Details */}
          {selectedCone && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Cone Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm text-blue-700">
                <div>
                  <span className="font-medium">Barcode:</span>{" "}
                  <span className="font-mono">{selectedCone.barcode}</span>
                </div>
                <div>
                  <span className="font-medium">PO Number:</span>{" "}
                  {selectedCone.poNumber || "-"}
                </div>
                <div>
                  <span className="font-medium">Yarn Name:</span>{" "}
                  {selectedCone.yarnName || "-"}
                </div>
                <div>
                  <span className="font-medium">Weight:</span>{" "}
                  {selectedCone.coneWeight || 0} kg
                </div>
                {sourceRackInfo && (
                  <div className="col-span-2">
                    <span className="font-medium">Current Location:</span>{" "}
                    {sourceRackInfo.label} ({sourceRackInfo.barcode})
                  </div>
                )}
              </div>
            </div>
          )}

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
                    toast.error("Rack not found or not available for ST→ST transfer");
                  }
                }}
                label="Scan Destination Rack Barcode"
                placeholder="Scan destination rack barcode"
                disabled={isTransferring || destinationRacks.length === 0 || !selectedCone}
              />
              <div className="text-center text-xs text-gray-500">OR</div>
              <select
                value={selectedDestinationRack}
                onChange={(e) => setSelectedDestinationRack(e.target.value)}
                className="form-control"
                disabled={isTransferring || destinationRacks.length === 0 || !selectedCone}
              >
                <option value="">Select destination rack from list</option>
                {destinationRacks
                  .filter((rack) => rack.barcode !== selectedCone?.coneStorageId)
                  .map((rack) => (
                    <option key={rack.id} value={rack.id}>
                      {rack.rackCode} ({rack.barcode}) - {rack.status}
                    </option>
                  ))}
              </select>
            </div>
            {destinationRacks.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No available destination racks for ST→ST transfer
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
              isTransferring || !selectedCone || !selectedDestinationRack
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
                Transfer Cone
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConeTransferModal;
