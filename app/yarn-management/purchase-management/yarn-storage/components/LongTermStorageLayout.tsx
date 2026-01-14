"use client";
import React, { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import JsBarcode from "jsbarcode";
import BarcodeScanner from "./BarcodeScanner";
import RackDetailsModal from "./RackDetailsModal";
import { RackLocation, PackedBox } from "../types";
import storageSlotService, {
  StorageSlot,
  SlotDetailsResponse,
  BoxInSlot,
  ConeInSlot,
} from "@/shared/services/storageSlotService";
import yarnBoxService, { YarnBox } from "@/shared/services/yarnBoxService";

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
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [storageRackCode, setStorageRackCode] = useState("");
  const [isAllocating, setIsAllocating] = useState(false);
  const [isLoadingBox, setIsLoadingBox] = useState(false);
  const [showPrintBarcodeModal, setShowPrintBarcodeModal] = useState(false);
  const [selectedRacksForPrint, setSelectedRacksForPrint] = useState<string[]>([]);

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

  // Map YarnBox to PackedBox format
  const mapYarnBoxToPackedBox = (box: YarnBox): PackedBox => {
    const qcApproved = box.qcData?.status === "qc_approved";
    const isStored = box.storedStatus === true;

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
      status: isStored ? "Stored" : qcApproved ? "QC_Approved" : "QC_Pending",
    };
  };

  const handleBoxScan = async (barcode: string) => {
    const trimmedBarcode = barcode.trim();

    if (!trimmedBarcode) {
      toast.error("Please enter a barcode");
      return;
    }

    setIsLoadingBox(true);
    try {
      console.log("Fetching box by barcode:", trimmedBarcode);
      // Fetch box from API by barcode
      const boxDetails = await yarnBoxService.getYarnBoxByBarcode(trimmedBarcode);
      console.log("Box details received:", boxDetails);

      // Map YarnBox to PackedBox
      const mappedBox = mapYarnBoxToPackedBox(boxDetails);

      // Validate box
      if (!mappedBox.qcApproved) {
        toast.error("Box is not QC approved");
        return;
      }

      if (mappedBox.status === "Stored") {
        toast.error("Box is already stored");
        return;
      }

      // Open modal with box details
      setSelectedBox(mappedBox);
      setStorageRackCode("");
      setShowAllocateModal(true);
      toast.success(`Box ${boxDetails.boxId || trimmedBarcode} selected. Please enter location barcode.`);
    } catch (error) {
      console.error("Failed to fetch box details:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to fetch box details. Please check the barcode and try again."
      );
    } finally {
      setIsLoadingBox(false);
    }
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
  };

  // Handle allocate confirmation from modal
  const handleAllocateConfirm = async () => {
    if (!selectedBox || !storageRackCode.trim()) {
      toast.error("Please enter a storage rack code");
      return;
    }

    setIsAllocating(true);
    try {
      // Find rack by barcode
      const rack = racks.find((r) => r.barcode === storageRackCode.trim());
      if (!rack) {
        toast.error("Rack not found with the provided barcode");
        return;
      }

      if (rack.status === "Occupied" || rack.status === "Maintenance") {
        toast.error(`Rack ${rack.rackCode} is ${rack.status.toLowerCase()}`);
        return;
      }

      // Get the box ID - try to find the actual YarnBox to get _id
      const boxId = selectedBox.id;

      // Call API to update box storage location
      try {
        await yarnBoxService.updateYarnBox(boxId, {
          storageLocation: storageRackCode.trim(),
          storedStatus: true,
        });
      } catch (apiError) {
        // If API call fails, still proceed with local state update
        console.warn("Failed to update box via API, updating local state only:", apiError);
      }

      // Update local state via callback
      handleStoreBox(selectedBox.id, rack.id);

      // Close modal and reset state
      setShowAllocateModal(false);
      setStorageRackCode("");
      setSelectedBox(null);
    } catch (error) {
      console.error("Failed to allocate box:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to allocate box to storage"
      );
    } finally {
      setIsAllocating(false);
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    if (!isAllocating) {
      setShowAllocateModal(false);
      setStorageRackCode("");
      setSelectedBox(null);
    }
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
  const handlePrintSelectedRacks = () => {
    if (selectedRacksForPrint.length === 0) {
      toast.error("Please select at least one rack");
      return;
    }

    const selectedRacks = racks.filter((r) => selectedRacksForPrint.includes(r.id) && r.barcode);
    if (selectedRacks.length === 0) {
      toast.error("No valid racks selected");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print barcodes');
      return;
    }

    const rackBarcodes = selectedRacks.map((rack) => {
      const barcodeSVG = generateBarcodeSVG(rack.barcode!);
      return `
        <div class="barcode-item">
          <div class="rack-info">
            <div class="rack-label">${rack.rackCode}</div>
          </div>
          <div class="barcode-section">
            <div class="barcode-label">Barcode</div>
            <div class="barcode-value">
              ${barcodeSVG}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const barcodeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Selected Rack Barcodes</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .header-info {
              background: #e9ecef;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 5px;
            }
            .barcode-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 25px;
              margin-top: 20px;
            }
            .barcode-item {
              border: 2px solid #ddd;
              padding: 20px;
              text-align: center;
              page-break-inside: avoid;
              background: #fff;
              border-radius: 8px;
            }
            .rack-info {
              margin-bottom: 15px;
            }
            .rack-label {
              font-size: 16px;
              font-weight: bold;
              color: #333;
              margin-bottom: 8px;
            }
            .rack-details {
              font-size: 12px;
              color: #666;
              margin-bottom: 3px;
            }
            .barcode-section {
              margin: 15px 0;
            }
            .barcode-label {
              font-size: 11px;
              color: #666;
              margin-bottom: 8px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .barcode-value {
              margin: 10px 0;
              padding: 15px;
              background: #f5f5f5;
              border: 1px dashed #ccc;
              display: flex;
              justify-content: center;
              align-items: center;
              border-radius: 4px;
            }
            .barcode-value svg {
              max-width: 100%;
              height: auto;
            }
            @media print {
              .barcode-container {
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
              }
              .barcode-item {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h2 style="margin: 0 0 10px 0;">Selected Rack Barcodes - Long Term Storage</h2>
            <p style="margin: 0;">Total Selected: ${selectedRacks.length}</p>
          </div>
          <div class="barcode-container">
            ${rackBarcodes}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(barcodeHTML);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      toast.success(`${selectedRacks.length} rack barcode(s) printed successfully`);
    }, 250);
  };

  // Handle print all racks barcode
  const handlePrintAllRacks = () => {
    if (racks.length === 0) {
      toast.error("No racks available to print");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print barcodes');
      return;
    }

    const rackBarcodes = racks
      .filter((rack) => rack.barcode)
      .map((rack) => {
        const barcodeSVG = generateBarcodeSVG(rack.barcode!);
        return `
          <div class="barcode-item">
            <div class="rack-info">
              <div class="rack-label">${rack.rackCode}</div>
              <div class="rack-details">Floor: ${rack.column} | Shelf: ${rack.shelf}</div>
              <div class="rack-details">Status: ${rack.status}</div>
            </div>
            <div class="barcode-section">
              <div class="barcode-label">Barcode</div>
              <div class="barcode-value">
                ${barcodeSVG}
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const barcodeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print All Rack Barcodes</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .header-info {
              background: #e9ecef;
              padding: 15px;
              margin-bottom: 20px;
              border-radius: 5px;
            }
            .barcode-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 25px;
              margin-top: 20px;
            }
            .barcode-item {
              border: 2px solid #ddd;
              padding: 20px;
              text-align: center;
              page-break-inside: avoid;
              background: #fff;
              border-radius: 8px;
            }
            .rack-info {
              margin-bottom: 15px;
            }
            .rack-label {
              font-size: 16px;
              font-weight: bold;
              color: #333;
              margin-bottom: 8px;
            }
            .rack-details {
              font-size: 12px;
              color: #666;
              margin-bottom: 3px;
            }
            .barcode-section {
              margin: 15px 0;
            }
            .barcode-label {
              font-size: 11px;
              color: #666;
              margin-bottom: 8px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .barcode-value {
              margin: 10px 0;
              padding: 15px;
              background: #f5f5f5;
              border: 1px dashed #ccc;
              display: flex;
              justify-content: center;
              align-items: center;
              border-radius: 4px;
            }
            .barcode-value svg {
              max-width: 100%;
              height: auto;
            }
            @media print {
              .barcode-container {
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
              }
              .barcode-item {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h2 style="margin: 0 0 10px 0;">Rack Barcodes - Long Term Storage</h2>
            <p style="margin: 0;">Total Racks: ${racks.length}</p>
          </div>
          <div class="barcode-container">
            ${rackBarcodes}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(barcodeHTML);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      toast.success(`${racks.length} rack barcode(s) printed successfully`);
    }, 250);
  };

  return (
    <div className="space-y-6">
      {/* Scanning Section */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Store QC-Approved Box</h3>
        </div>
        <div className="box-body space-y-4">
          {isLoadingBox ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary me-2"></div>
              <span className="text-sm text-gray-600">Loading box details...</span>
            </div>
          ) : (
            <BarcodeScanner
              onScan={handleBoxScan}
              label="Scan Box Barcode"
              placeholder="Scan QC-approved box barcode"
              disabled={isLoadingBox}
            />
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
        dataType={rackDetails?.type || "boxes"}
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
                onClick={() => {
                  handlePrintAllRacks();
                  setShowPrintBarcodeModal(false);
                  setSelectedRacksForPrint([]);
                }}
                className="ti-btn ti-btn-primary"
              >
                <i className="ri-printer-line me-1"></i>
                Print All Racks
              </button>
              <button
                onClick={() => {
                  handlePrintSelectedRacks();
                  setShowPrintBarcodeModal(false);
                  setSelectedRacksForPrint([]);
                }}
                className="ti-btn ti-btn-primary"
                disabled={selectedRacksForPrint.length === 0}
              >
                <i className="ri-printer-line me-1"></i>
                Print Selected ({selectedRacksForPrint.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Box Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="box-header border-b border-gray-200 px-6 py-4">
              <h3 className="box-title text-lg font-semibold">
                Allocate Box to Storage
              </h3>
            </div>
            <div className="box-body px-6 py-4">
              <div className="mb-4">
                <label className="form-label text-sm font-medium text-gray-700 mb-2 block">
                  Storage Rack Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter storage rack barcode"
                  value={storageRackCode}
                  onChange={(e) => setStorageRackCode(e.target.value)}
                  disabled={isAllocating}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isAllocating) {
                      handleAllocateConfirm();
                    }
                  }}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the barcode of the storage rack location
                </p>
              </div>
            </div>
            <div className="box-footer border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
              <button
                onClick={handleModalClose}
                className="ti-btn ti-btn-light"
                disabled={isAllocating}
              >
                Cancel
              </button>
              <button
                onClick={handleAllocateConfirm}
                className="ti-btn ti-btn-primary"
                disabled={isAllocating || !storageRackCode.trim()}
              >
                {isAllocating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2 inline-block"></div>
                    Allocating...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line me-1"></i>
                    Confirm
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

export default LongTermStorageLayout;

