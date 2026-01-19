"use client";
import React, { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import JsBarcode from "jsbarcode";
import BarcodeScanner from "./BarcodeScanner";
import RackDetailsModal from "./RackDetailsModal";
import RackTransferModal from "./RackTransferModal";
import { RackLocation, PackedBox } from "../types";
import storageSlotService, {
  StorageSlot,
  SlotDetailsResponse,
  BoxInSlot,
  ConeInSlot,
} from "@/shared/services/storageSlotService";
import yarnBoxService, { YarnBox } from "@/shared/services/yarnBoxService";
import { QZTrayStatus } from "@/shared/components/qzTray/QZTrayStatus";
import { printRacks } from "@/shared/utils/qzTray";

interface LongTermStorageLayoutProps {
  racks: RackLocation[];
  boxes: PackedBox[];
  onBoxStore: (boxId: string, rackId: string) => void;
  onRackUpdate: (rack: RackLocation) => void;
  onRefresh?: () => void; // Optional callback to refresh data from parent
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
  onRefresh,
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
  const [rackSlotDetails, setRackSlotDetails] = useState<Map<string, SlotDetailsResponse>>(new Map());
  const [loadingSlotDetails, setLoadingSlotDetails] = useState<Set<string>>(new Set());
  const [isPrinting, setIsPrinting] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceRack, setTransferSourceRack] = useState<RackLocation | null>(null);
  const [transferType, setTransferType] = useState<"LT_TO_LT" | "LT_TO_ST">("LT_TO_LT");
  const [transferBoxId, setTransferBoxId] = useState<string | undefined>(undefined);

  // Fetch storage slots from API
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

  useEffect(() => {
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

  // Fetch slot details for all racks (including available ones that might have data)
  useEffect(() => {
    const fetchAllRackDetails = async () => {
      if (racks.length === 0 || isLoadingSlots) return;

      // Fetch details for all racks with barcodes (not just occupied ones)
      const racksWithBarcodes = racks.filter((rack) => rack.barcode);

      for (const rack of racksWithBarcodes) {
        // Skip if already loading or already fetched
        if (loadingSlotDetails.has(rack.id) || rackSlotDetails.has(rack.id)) {
          continue;
        }

        try {
          setLoadingSlotDetails((prev) => new Set(prev).add(rack.id));
          const details = await storageSlotService.getSlotDetailsByBarcode(rack.barcode);
          setRackSlotDetails((prev) => {
            const newMap = new Map(prev);
            newMap.set(rack.id, details);
            return newMap;
          });
        } catch (error) {
          console.error(`Failed to fetch details for rack ${rack.rackCode}:`, error);
        } finally {
          setLoadingSlotDetails((prev) => {
            const newSet = new Set(prev);
            newSet.delete(rack.id);
            return newSet;
          });
        }
      }
    };

    fetchAllRackDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [racks.length, isLoadingSlots]);

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

      // Check if box is already stored
      if (mappedBox.status === "Stored" && boxDetails.storageLocation) {
        // Box is already stored - open transfer modal
        const currentStorageLocation = boxDetails.storageLocation;
        
        // Find the source rack from the storage location
        const sourceRack = racks.find((r) => r.barcode === currentStorageLocation);
        
        if (sourceRack) {
          // Determine transfer type based on storage location
          if (currentStorageLocation.startsWith("LT-")) {
            // Box is in long-term storage - can transfer LT→LT or LT→ST
            setTransferSourceRack(sourceRack);
            setTransferType("LT_TO_LT"); // Default to LT→LT, user can change
            setTransferBoxId(boxDetails.boxId); // Store box ID to pre-select in modal
            setShowTransferModal(true);
            toast.success(`Box ${boxDetails.boxId || trimmedBarcode} found. Select destination rack for transfer.`);
          } else if (currentStorageLocation.startsWith("ST-")) {
            // Box is in short-term storage - should use ShortTermStorage component
            toast.error("Box is in short-term storage. Please use Short-Term Storage tab for transfers.");
          } else {
            toast.error("Box storage location is invalid");
          }
        } else {
          toast.error(`Source rack not found for location: ${currentStorageLocation}`);
        }
        return;
      }

      // Box is not stored yet - open allocate modal
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

      // Refresh only the affected rack after storing new box
      try {
        // Refresh only the rack details where box was stored (no need to refresh all slots)
        const details = await storageSlotService.getSlotDetailsByBarcode(storageRackCode.trim());
        setRackSlotDetails((prev) => {
          const newMap = new Map(prev);
          newMap.set(rack.id, details);
          return newMap;
        });
        // Call parent refresh callback if provided
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        console.error("Failed to refresh data after storing box:", error);
      }

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

      // Use cached details if available, otherwise fetch
      let details = rackSlotDetails.get(rack.id);
      if (!details) {
        details = await storageSlotService.getSlotDetailsByBarcode(rack.barcode);
        // Cache the details
        setRackSlotDetails((prev) => {
          const newMap = new Map(prev);
          newMap.set(rack.id, details!);
          return newMap;
        });
      }

      setRackDetails(details);
    } catch (error) {
      console.error("Failed to fetch rack details:", error);
      toast.error("Failed to load rack details");
      setIsRackModalOpen(false);
    } finally {
      setIsLoadingRackDetails(false);
    }
  };

  const handleOpenTransferModal = (rack: RackLocation, type: "LT_TO_LT" | "LT_TO_ST") => {
    setTransferSourceRack(rack);
    setTransferType(type);
    setShowTransferModal(true);
  };

  const handleTransferComplete = async (sourceRackBarcode?: string, destinationRackBarcode?: string) => {
    // Refresh only affected racks after transfer
    try {
      const racksToRefresh: string[] = [];
      
      // Add source rack if provided
      if (sourceRackBarcode) {
        racksToRefresh.push(sourceRackBarcode);
      }
      
      // Add destination rack if provided
      if (destinationRackBarcode) {
        racksToRefresh.push(destinationRackBarcode);
      }
      
      // If transferSourceRack exists, add it too
      if (transferSourceRack?.barcode && !racksToRefresh.includes(transferSourceRack.barcode)) {
        racksToRefresh.push(transferSourceRack.barcode);
      }

      // Refresh only the affected racks
      if (racksToRefresh.length > 0) {
        const refreshPromises = racksToRefresh.map(async (rackBarcode) => {
          try {
            const details = await storageSlotService.getSlotDetailsByBarcode(rackBarcode);
            // Find the rack ID
            const rack = racks.find((r) => r.barcode === rackBarcode);
            if (rack) {
              setRackSlotDetails((prev) => {
                const newMap = new Map(prev);
                newMap.set(rack.id, details);
                return newMap;
              });
              
              // If rack details modal is open for this rack, update it
              if (isRackModalOpen && rackDetails?.storageSlot?.barcode === rackBarcode) {
                setRackDetails(details);
              }
            }
          } catch (error) {
            console.error(`Failed to refresh details for rack ${rackBarcode}:`, error);
          }
        });
        await Promise.all(refreshPromises);
      } else {
        // Fallback: refresh all racks if no specific racks provided
        const racksWithBarcodes = racks.filter((rack) => rack.barcode);
        const refreshPromises = racksWithBarcodes.map(async (rack) => {
          try {
            const details = await storageSlotService.getSlotDetailsByBarcode(rack.barcode);
            setRackSlotDetails((prev) => {
              const newMap = new Map(prev);
              newMap.set(rack.id, details);
              return newMap;
            });
          } catch (error) {
            console.error(`Failed to refresh details for rack ${rack.rackCode}:`, error);
          }
        });
        await Promise.all(refreshPromises);
      }
      
      // Call parent refresh callback if provided
      if (onRefresh) {
        onRefresh();
      }
      
      toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh data:", error);
      toast.error("Failed to refresh some data");
    }
  };

  // Get slot boxes for a rack (from API)
  const getRackSlotBoxes = (rack: RackLocation): BoxInSlot[] => {
    const details = rackSlotDetails.get(rack.id);
    if (details && details.type === "boxes") {
      return details.data as BoxInSlot[];
    }
    return [];
  };

  // Get boxes for a rack (from props - available immediately)
  const getRackBoxes = (rack: RackLocation): PackedBox[] => {
    return boxes.filter((b) => b.rackLocation?.id === rack.id);
  };

  // Get display data for rack - prefer slot details if available, otherwise use boxes prop
  const getRackDisplayData = (rack: RackLocation) => {
    const slotBoxes = getRackSlotBoxes(rack);
    const propBoxes = getRackBoxes(rack);

    // If we have slot details, use those (they have PO number)
    if (slotBoxes.length > 0) {
      const totalBoxes = slotBoxes.length;
      const totalWeight = slotBoxes.reduce((sum, box) => sum + (box.boxWeight || 0), 0);
      const totalCones = slotBoxes.reduce((sum, box) => sum + (box.numberOfCones || 0), 0);

      return {
        boxes: slotBoxes.map(box => ({
          poNumber: box.poNumber || "-",
          yarnName: box.yarnName || "-",
          lotNumber: box.lotNumber || "-",
        })),
        totalBoxes,
        totalWeight,
        totalCones,
        isLoading: false,
      };
    }

    // Otherwise use boxes from props
    if (propBoxes.length > 0) {
      const totalBoxes = propBoxes.length;
      const totalWeight = propBoxes.reduce((sum, box) => sum + (box.weight || 0), 0);
      const totalCones = propBoxes.reduce((sum, box) => sum + (box.numberOfCones || 0), 0);

      return {
        boxes: propBoxes.map(box => ({
          poNumber: "-", // PackedBox doesn't have poNumber
          yarnName: box.yarnName || "-",
          lotNumber: box.batchNumber || "-",
        })),
        totalBoxes,
        totalWeight,
        totalCones,
        isLoading: loadingSlotDetails.has(rack.id),
      };
    }

    return {
      boxes: [],
      totalBoxes: 0,
      totalWeight: 0,
      totalCones: 0,
      isLoading: loadingSlotDetails.has(rack.id),
    };
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
        zone: 'LT'
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
        zone: 'LT'
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

  return (
    <div className="space-y-6">
      {/* Scanning Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">Long-Term Storage</h2>
        <QZTrayStatus />
      </div>

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
                        relative border-2 rounded-xl p-3 min-h-[200px] transition-all cursor-pointer
                        ${getRackStatusColor(rack)}
                        ${rack ? "hover:shadow-lg hover:scale-[1.02]" : ""}
                        flex flex-col
                      `}
                        onClick={() => {
                          if (rack) {
                            handleRackClick(rack);
                          }
                        }}
                      >
                        {rack ? (
                          <>
                            {/* Top Row: Barcode on left, Summary on right */}
                            <div className="flex justify-between items-start mb-2 gap-2">
                              {/* Barcode / Rack Code */}
                              <div className="flex-1">
                                <div className="text-xs font-bold text-gray-800 mb-1">
                                  {rack.rackCode}
                                </div>
                                {rack.barcode && (
                                  <div className="text-[10px] text-gray-500 font-mono">
                                    {rack.barcode}
                                  </div>
                                )}
                              </div>

                              {/* Summary Box - Show if there's data, regardless of status */}
                              {(() => {
                                const displayData = getRackDisplayData(rack);
                                if (displayData.isLoading && displayData.totalBoxes === 0) {
                                  return (
                                    <div className="flex items-center justify-center w-20">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                    </div>
                                  );
                                }
                                if (displayData.totalBoxes > 0) {
                                  const isOccupied = rack.status === "Occupied";
                                  const bgColor = isOccupied ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200";
                                  const titleColor = isOccupied ? "text-blue-900" : "text-green-900";
                                  const contentColor = isOccupied ? "text-blue-800" : "text-green-800";
                                  return (
                                    <div className={`${bgColor} border rounded p-1.5 min-w-[70px]`}>
                                      <div className={`text-[9px] font-semibold ${titleColor} mb-0.5`}>Summary</div>
                                      <div className={`grid grid-cols-2 gap-0.5 text-[9px] ${contentColor}`}>
                                        <div className="text-center">
                                          <div className="font-medium">{displayData.totalBoxes}</div>
                                          <div className="text-[8px]">Boxes</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-medium">{displayData.totalWeight.toFixed(0)}</div>
                                          <div className="text-[8px]">Kg</div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>

                            {/* Table below - Show if there's data, regardless of status */}
                            {(() => {
                              const displayData = getRackDisplayData(rack);

                              if (displayData.isLoading && displayData.totalBoxes === 0) {
                                return (
                                  <div className="flex items-center justify-center py-2">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                  </div>
                                );
                              }

                              if (displayData.boxes.length > 0) {
                                return (
                                  <div className="overflow-x-auto max-h-[100px] mt-1">
                                    <table className="w-full text-[10px]">
                                      <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                          <th className="px-1 py-0.5 text-left font-semibold text-gray-700 border-b text-[9px]">PO</th>
                                          <th className="px-1 py-0.5 text-left font-semibold text-gray-700 border-b text-[9px]">Yarn</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white">
                                        {displayData.boxes.slice(0, 3).map((box, idx) => (
                                          <tr key={idx} className="border-b border-gray-100">
                                            <td className="px-1 py-0.5 text-gray-700 truncate max-w-[60px]" title={box.poNumber}>
                                              {box.poNumber}
                                            </td>
                                            <td className="px-1 py-0.5 text-gray-700 truncate max-w-[80px]" title={box.yarnName}>
                                              {box.yarnName}
                                            </td>
                                          </tr>
                                        ))}
                                        {displayData.boxes.length > 3 && (
                                          <tr>
                                            <td colSpan={2} className="px-1 py-0.5 text-[9px] text-gray-500 text-center">
                                              +{displayData.boxes.length - 3} more
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              }

                              return null;
                            })()}

                            {/* Show status only if there's no data */}
                            {(() => {
                              const displayData = getRackDisplayData(rack);
                              if (displayData.totalBoxes === 0 && !displayData.isLoading) {
                                return (
                                  <div className="text-xs text-gray-400 text-center py-4">
                                    {rack.status === "Available" ? "Available" : rack.status}
                                  </div>
                                );
                              }
                              return null;
                            })()}
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
        onTransferLTToLT={(rack) => handleOpenTransferModal(rack, "LT_TO_LT")}
        onTransferLTToST={(rack) => handleOpenTransferModal(rack, "LT_TO_ST")}
      />

      {/* Transfer Modal */}
      <RackTransferModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setTransferSourceRack(null);
          setTransferBoxId(undefined);
        }}
        transferType={transferType}
        sourceRack={transferSourceRack}
        availableRacks={racks}
        onTransferComplete={handleTransferComplete}
        initialBoxId={transferBoxId}
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

