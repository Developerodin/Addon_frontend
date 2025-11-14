"use client";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import yarnBoxService, { YarnBox } from "@/shared/services/yarnBoxService";
import yarnConeService from "@/shared/services/yarnConeService";
import BarcodeScanner from "./BarcodeScanner";
import {
  ShortTermInventory,
  PackedBox,
  InternalTransferData,
  Cone,
} from "../types";

const getProcessedBoxStorageKey = (boxId: string) =>
  `processedBoxResult:${boxId}`;

interface ShortTermStorageProps {
  inventory: ShortTermInventory[];
  boxes: PackedBox[];
  onInternalTransfer: (transferData: any) => void;
}

const ShortTermStorage: React.FC<ShortTermStorageProps> = ({
  inventory: _inventory,
  boxes: _boxes,
  onInternalTransfer,
}) => {
  const [selectedBox, setSelectedBox] = useState<PackedBox | null>(null);
  const [isLoadingBox, setIsLoadingBox] = useState(false);
  const [scannedBoxDetails, setScannedBoxDetails] = useState<YarnBox | null>(
    null
  );
  const [isProcessingBox, setIsProcessingBox] = useState(false);

  const router = useRouter();

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
    </div>
  );
};

export default ShortTermStorage;

