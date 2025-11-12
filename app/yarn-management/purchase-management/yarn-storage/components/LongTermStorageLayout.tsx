"use client";
import React, { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import BarcodeScanner from "./BarcodeScanner";
import { RackLocation, PackedBox } from "../types";

interface LongTermStorageLayoutProps {
  racks: RackLocation[];
  boxes: PackedBox[];
  onBoxStore: (boxId: string, rackId: string) => void;
  onRackUpdate: (rack: RackLocation) => void;
  preferences: {
    gridColumns: number;
    gridRows: number;
    showEmptySlots: boolean;
  };
}

const LongTermStorageLayout: React.FC<LongTermStorageLayoutProps> = ({
  racks,
  boxes,
  onBoxStore,
  onRackUpdate,
  preferences,
}) => {
  const [selectedBox, setSelectedBox] = useState<PackedBox | null>(null);
  const [scanningRack, setScanningRack] = useState(false);
  const [selectedRack, setSelectedRack] = useState<RackLocation | null>(null);

  // Organize racks into grid
  const rackGrid = useMemo(() => {
    const grid: (RackLocation | null)[][] = [];
    for (let row = 0; row < preferences.gridRows; row++) {
      grid[row] = [];
      for (let col = 0; col < preferences.gridColumns; col++) {
        const rack = racks.find(
          (r) => r.row === row + 1 && r.column === col + 1
        );
        grid[row][col] = rack || null;
      }
    }
    return grid;
  }, [racks, preferences]);

  const handleBoxScan = (barcode: string) => {
    const box = boxes.find((b) => b.boxBarcode === barcode);
    if (!box) {
      toast.error("Box not found");
      return;
    }

    if (!box.qcApproved) {
      toast.error("Box is not QC approved");
      return;
    }

    if (box.status === "Stored") {
      toast.error("Box is already stored");
      return;
    }

    setSelectedBox(box);
    setScanningRack(true);
    toast.success(`Box ${box.boxBarcode} selected. Please scan rack barcode.`);
  };

  const handleRackScan = (barcode: string) => {
    const rack = racks.find((r) => r.barcode === barcode);
    if (!rack) {
      toast.error("Rack not found");
      return;
    }

    if (rack.status === "Occupied" || rack.status === "Maintenance") {
      toast.error(`Rack ${rack.rackCode} is ${rack.status.toLowerCase()}`);
      return;
    }

    if (!selectedBox) {
      toast.error("Please select a box first");
      return;
    }

    setSelectedRack(rack);
    handleStoreBox(selectedBox.id, rack.id);
  };

  const handleStoreBox = (boxId: string, rackId: string) => {
    const box = boxes.find((b) => b.id === boxId);
    const rack = racks.find((r) => r.id === rackId);

    if (!box || !rack) {
      toast.error("Invalid box or rack");
      return;
    }

    // Update rack status
    const updatedRack: RackLocation = {
      ...rack,
      status: "Occupied",
      currentBoxes: rack.currentBoxes + 1,
    };

    onRackUpdate(updatedRack);
    onBoxStore(boxId, rackId);

    toast.success(
      `Box ${box.boxBarcode} stored at ${rack.rackCode}. Weight and cones added to inventory.`
    );

    // Reset state
    setSelectedBox(null);
    setSelectedRack(null);
    setScanningRack(false);
  };

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

  return (
    <div className="space-y-6">
      {/* Scanning Section */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Store QC-Approved Box</h3>
        </div>
        <div className="box-body space-y-4">
          {!selectedBox ? (
            <BarcodeScanner
              onScan={handleBoxScan}
              label="Scan Box Barcode"
              placeholder="Scan QC-approved box barcode"
            />
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-blue-900">
                      Selected Box: {selectedBox.boxBarcode}
                    </h4>
                    <div className="mt-2 space-y-1 text-sm text-blue-700">
                      <p>
                        <span className="font-medium">Yarn:</span>{" "}
                        {selectedBox.yarnName}
                      </p>
                      <p>
                        <span className="font-medium">Weight:</span>{" "}
                        {selectedBox.weight} kg
                      </p>
                      <p>
                        <span className="font-medium">Cones:</span>{" "}
                        {selectedBox.numberOfCones}
                      </p>
                      <p>
                        <span className="font-medium">Batch:</span>{" "}
                        {selectedBox.batchNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedBox(null);
                      setScanningRack(false);
                    }}
                    className="ti-btn ti-btn-light ti-btn-sm"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                </div>
              </div>

              {scanningRack && (
                <BarcodeScanner
                  onScan={handleRackScan}
                  label="Scan Rack Barcode"
                  placeholder="Scan rack barcode to assign location"
                />
              )}

              {selectedRack && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-green-900">
                        Selected Rack: {selectedRack.rackCode}
                      </h4>
                      <p className="text-sm text-green-700 mt-1">
                        Row: {selectedRack.row}, Column: {selectedRack.column}
                        {selectedRack.shelf && `, Shelf: ${selectedRack.shelf}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleStoreBox(selectedBox.id, selectedRack.id)}
                      className="ti-btn ti-btn-primary"
                    >
                      <i className="ri-save-line me-1"></i>
                      Confirm Storage
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2D Grid Layout */}
      <div className="box">
        <div className="box-header flex justify-between items-center">
          <h3 className="box-title">
            Storage Layout ({preferences.gridRows} x {preferences.gridColumns})
          </h3>
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
        </div>
        <div className="box-body">
          <div className="overflow-auto">
            <div
              className="inline-grid gap-2 p-4"
              style={{
                gridTemplateColumns: `repeat(${preferences.gridColumns}, minmax(120px, 1fr))`,
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
                        relative border-2 rounded-lg p-3 min-h-[100px] transition-all cursor-pointer
                        ${getRackStatusColor(rack)}
                        ${rack ? "hover:shadow-md" : ""}
                      `}
                      onClick={() => {
                        if (rack && box) {
                          toast.info(
                            `Rack ${rack.rackCode}: Box ${box.boxBarcode}`
                          );
                        }
                      }}
                    >
                      {rack ? (
                        <>
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            {rack.rackCode}
                          </div>
                          {box ? (
                            <div className="text-xs text-gray-600 space-y-0.5">
                              <div className="truncate">{box.boxBarcode}</div>
                              <div className="text-gray-500">
                                {box.numberOfCones} cones
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 mt-2">
                              Empty
                            </div>
                          )}
                          {rack.status === "Occupied" && (
                            <div className="absolute top-1 right-1">
                              <i className="ri-checkbox-circle-fill text-blue-500 text-sm"></i>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-gray-400 text-center mt-4">
                          No Rack
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LongTermStorageLayout;

