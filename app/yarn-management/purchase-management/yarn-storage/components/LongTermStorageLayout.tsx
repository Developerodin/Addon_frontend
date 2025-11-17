"use client";
import React, { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import BarcodeScanner from "./BarcodeScanner";
import RackDetailsModal from "./RackDetailsModal";
import { RackLocation, PackedBox } from "../types";
import storageSlotService, {
  StorageSlot,
  SlotDetailsResponse,
  BoxInSlot,
  ConeInSlot,
} from "@/shared/services/storageSlotService";

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
  racks: propsRacks,
  boxes,
  onBoxStore,
  onRackUpdate,
  preferences,
}) => {
  const [selectedBox, setSelectedBox] = useState<PackedBox | null>(null);
  const [scanningRack, setScanningRack] = useState(false);
  const [selectedRack, setSelectedRack] = useState<RackLocation | null>(null);
  const [storageSlots, setStorageSlots] = useState<StorageSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [isRackModalOpen, setIsRackModalOpen] = useState(false);
  const [rackDetails, setRackDetails] = useState<SlotDetailsResponse | null>(null);
  const [isLoadingRackDetails, setIsLoadingRackDetails] = useState(false);

  // Fetch storage slots from API
  useEffect(() => {
    const fetchStorageSlots = async () => {
      try {
        setIsLoadingSlots(true);
        const response = await storageSlotService.getStorageSlots("LT");
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
      return propsRacks; // Fallback to props if no slots loaded
    }

    // Group slots by shelfNumber to determine rows
    const shelfGroups = new Map<number, StorageSlot[]>();
    storageSlots.forEach((slot) => {
      if (!shelfGroups.has(slot.shelfNumber)) {
        shelfGroups.set(slot.shelfNumber, []);
      }
      shelfGroups.get(slot.shelfNumber)!.push(slot);
    });

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
  }, [storageSlots, boxes, propsRacks]);

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
            Storage Layout
            {isLoadingSlots ? (
              <span className="ml-2 text-sm text-gray-500">Loading...</span>
            ) : (
              <span className="ml-2 text-sm text-gray-500">
                ({racks.length} slots)
              </span>
            )}
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
                className="inline-grid gap-2 p-4"
                style={{
                  gridTemplateColumns: `repeat(${gridDimensions.columns}, minmax(120px, 1fr))`,
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
                        if (rack) {
                          handleRackClick(rack);
                        }
                      }}
                    >
                      {rack ? (
                        <>
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            {rack.rackCode}
                          </div>
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <div>Floor: {rack.column}</div>
                            <div>Shelf: {rack.shelf}</div>
                          </div>
                          {box ? (
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
        dataType={rackDetails?.type || "boxes"}
        isLoading={isLoadingRackDetails}
      />
    </div>
  );
};

export default LongTermStorageLayout;

