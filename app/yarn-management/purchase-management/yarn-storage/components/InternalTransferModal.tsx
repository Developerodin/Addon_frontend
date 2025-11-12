"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import BarcodeScanner from "./BarcodeScanner";
import BarcodePrintView from "./BarcodePrintView";
import { PackedBox, Cone, InternalTransferData } from "../types";

interface InternalTransferModalProps {
  selectedBox: PackedBox | null;
  boxes: PackedBox[];
  onBoxScan: (barcode: string) => void;
  onTransfer: (data: InternalTransferData) => void;
  onClose: () => void;
}

const InternalTransferModal: React.FC<InternalTransferModalProps> = ({
  selectedBox: initialBox,
  boxes,
  onBoxScan,
  onTransfer,
  onClose,
}) => {
  const [selectedBox, setSelectedBox] = useState<PackedBox | null>(initialBox);
  const [cones, setCones] = useState<Cone[]>([]);
  const [showBarcodePrint, setShowBarcodePrint] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (initialBox) {
      setSelectedBox(initialBox);
      generateCones(initialBox);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBox]);

  const handleBoxScan = (barcode: string) => {
    const box = boxes.find((b) => b.boxBarcode === barcode);
    if (!box) {
      toast.error("Box not found");
      return;
    }

    if (box.status !== "Stored") {
      toast.error("Box must be stored in long-term storage first");
      return;
    }

    setSelectedBox(box);
    generateCones(box);
  };

  const generateCones = (box: PackedBox) => {
    if (!box || box.numberOfCones <= 0) {
      toast.error("Invalid box or no cones in box");
      return;
    }

    const generatedCones: Cone[] = [];
    const weightPerCone = box.weight / box.numberOfCones;

    for (let i = 1; i <= box.numberOfCones; i++) {
      generatedCones.push({
        id: `cone-${box.id}-${i}`,
        coneBarcode: `CONE-${box.boxBarcode}-${i}-${Date.now()}`,
        boxId: box.id,
        boxBarcode: box.boxBarcode,
        yarnId: box.yarnId,
        yarnName: box.yarnName,
        weight: weightPerCone,
        status: "In_Box",
      });
    }

    setCones(generatedCones);
    toast.success(`Generated ${generatedCones.length} cone barcodes`);
  };

  const handleProcessTransfer = () => {
    if (!selectedBox || cones.length === 0) {
      toast.error("Please scan a box first");
      return;
    }

    setIsProcessing(true);

    // Simulate processing
    setTimeout(() => {
      const transferData: InternalTransferData = {
        boxBarcode: selectedBox.boxBarcode,
        boxId: selectedBox.id,
        yarnId: selectedBox.yarnId,
        yarnName: selectedBox.yarnName,
        numberOfCones: cones.length,
        totalWeight: selectedBox.weight,
        cones: cones.map((cone) => ({
          ...cone,
          status: "Transferred",
          transferredDate: new Date().toISOString(),
        })),
      };

      setIsProcessing(false);
      setShowBarcodePrint(true);
      onTransfer(transferData);
    }, 1000);
  };

  const handlePrintComplete = () => {
    setShowBarcodePrint(false);
    onClose();
  };

  if (showBarcodePrint) {
    return (
      <BarcodePrintView
        cones={cones}
        box={selectedBox!}
        onPrintComplete={handlePrintComplete}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Internal Transfer</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Box Scanning */}
          {!selectedBox ? (
            <div>
              <BarcodeScanner
                onScan={handleBoxScan}
                label="Scan Box Barcode"
                placeholder="Scan box barcode from long-term storage"
              />
            </div>
          ) : (
            <>
              {/* Box Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Box: {selectedBox.boxBarcode}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                      <div>
                        <span className="font-medium">Yarn:</span>{" "}
                        {selectedBox.yarnName}
                      </div>
                      <div>
                        <span className="font-medium">Batch:</span>{" "}
                        {selectedBox.batchNumber}
                      </div>
                      <div>
                        <span className="font-medium">Weight:</span>{" "}
                        {selectedBox.weight} kg
                      </div>
                      <div>
                        <span className="font-medium">Cones:</span>{" "}
                        {selectedBox.numberOfCones}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBox(null);
                      setCones([]);
                    }}
                    className="ti-btn ti-btn-light ti-btn-sm"
                  >
                    <i className="ri-close-line me-1"></i>
                    Change Box
                  </button>
                </div>
              </div>

              {/* Generated Cones */}
              {cones.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold">
                      Generated Cones ({cones.length})
                    </h4>
                    <button
                      onClick={() => generateCones(selectedBox)}
                      className="ti-btn ti-btn-light ti-btn-sm"
                    >
                      <i className="ri-refresh-line me-1"></i>
                      Regenerate
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Cone #
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Barcode
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Weight (kg)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {cones.map((cone, index) => (
                            <tr key={cone.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {index + 1}
                              </td>
                              <td className="px-4 py-2 text-sm font-mono text-gray-700">
                                {cone.coneBarcode}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {cone.weight.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="ti-btn ti-btn-light"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessTransfer}
                  disabled={isProcessing || cones.length === 0}
                  className="ti-btn ti-btn-primary"
                >
                  {isProcessing ? (
                    <>
                      <i className="ri-loader-4-line animate-spin me-1"></i>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="ri-printer-line me-1"></i>
                      Generate & Print Barcodes
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternalTransferModal;

