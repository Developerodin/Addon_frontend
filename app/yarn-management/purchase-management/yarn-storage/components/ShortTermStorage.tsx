"use client";
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import JsBarcode from "jsbarcode";
import yarnBoxService, { YarnBox } from "@/shared/services/yarnBoxService";
import yarnConeService, {
  GenerateConesResponse,
  ShortTermConeSummary,
} from "@/shared/services/yarnConeService";
import storageSlotService, {
  StorageSlot,
  SlotDetailsResponse,
  SlotWithContents,
  BoxInSlot,
  ConeInSlot,
} from "@/shared/services/storageSlotService";
import RackFilterPanel, {
  RackFilters,
  DEFAULT_RACK_FILTERS,
  countActiveFilters,
} from "./RackFilterPanel";
import FilteredRackGrid from "./FilteredRackGrid";
import {
  storageInputClass,
  selectChevronBgStyle,
  storageIconBtnClass,
  storageBtnSecondaryClass,
  storageBtnPrimaryClass,
  storageBtnFilterActiveClass,
  storagePaginationBarClass,
  storageCompactSelectClass,
} from "./storageUiClasses";
import { fetchRackDetailsFromYarnApis } from "../utils/rackDetailsApi";
import { QZTrayStatus } from "@/shared/components/qzTray/QZTrayStatus";
import { printRacks } from "@/shared/utils/qzTray";
import BarcodeScanner from "./BarcodeScanner";
import RackDetailsModal from "./RackDetailsModal";
import RackTransferModal from "./RackTransferModal";
import ConeTransferModal from "./ConeTransferModal";
import ZoneReportDrawer from "./ZoneReportDrawer";
import YarnSummaryDrawer from "@/app/yarn-management/yarn-issue/YarnSummaryDrawer";
import {
  ShortTermInventory,
  PackedBox,
  InternalTransferData,
  Cone,
  RackLocation,
} from "../types";

const getProcessedBoxStorageKey = (boxId: string) =>
  `processedBoxResult:${boxId}`;

/** Result of resolving a scanned box barcode on the short-term page */
interface BoxBarcodeFetchResult {
  mappedBox: PackedBox | null;
  /** When set, box is not on LT but already has cones — user can open the ST process page */
  resumeProcessBoxId?: string | null;
}

interface ShortTermStorageProps {
  inventory: ShortTermInventory[];
  boxes: PackedBox[];
  onInternalTransfer: (transferData: any) => void;
  onRefresh?: () => void; // Optional callback to refresh data from parent
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
  onRefresh,
  preferences,
}) => {
  /**
   * Format weights safely with fixed decimals (avoids JS float noise like 0.6000000000000001).
   */
  const formatKg = useCallback((value: unknown, decimals = 4): string => {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return value.toFixed(decimals);
  }, []);
  const [selectedBox, setSelectedBox] = useState<PackedBox | null>(null);
  const [isLoadingBox, setIsLoadingBox] = useState(false);
  const [scannedBoxDetails, setScannedBoxDetails] = useState<YarnBox | null>(
    null
  );
  const [existingShortTermCones, setExistingShortTermCones] = useState<
    ShortTermConeSummary[]
  >([]);
  const [isProcessingBox, setIsProcessingBox] = useState(false);
  const [storageSlots, setStorageSlots] = useState<StorageSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [isRackModalOpen, setIsRackModalOpen] = useState(false);
  const [rackDetails, setRackDetails] = useState<SlotDetailsResponse | null>(null);
  const [isLoadingRackDetails, setIsLoadingRackDetails] = useState(false);
  const [showPrintBarcodeModal, setShowPrintBarcodeModal] = useState(false);
  const [selectedRacksForPrint, setSelectedRacksForPrint] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceRack, setTransferSourceRack] = useState<RackLocation | null>(null);
  const [showConeTransferModal, setShowConeTransferModal] = useState(false);
  const [showInternalTransferModal, setShowInternalTransferModal] = useState(false);
  const [rackSlotDetails, setRackSlotDetails] = useState<Map<string, SlotDetailsResponse>>(new Map());
  const [loadingSlotDetails, setLoadingSlotDetails] = useState<Set<string>>(new Set());
  const [showReportDrawer, setShowReportDrawer] = useState(false);
  /** Open on enter (tab mount) so ST users see yarn-issue demand like an alert; closes with backdrop or X. */
  const [showTransferRequiredDrawer, setShowTransferRequiredDrawer] = useState(true);
  /** Box id for which we show “open process page” after scan (already internal-transfer / has cones) */
  const [resumeProcessBoxId, setResumeProcessBoxId] = useState<string | null>(
    null
  );
  /** Modal: enter box barcode to jump to yarn ST process page (requires existing cones) */
  const [showOpenProcessByBarcodeModal, setShowOpenProcessByBarcodeModal] =
    useState(false);
  const [openProcessBarcodeInput, setOpenProcessBarcodeInput] = useState("");
  const [openProcessModalError, setOpenProcessModalError] = useState("");
  const [isOpenProcessModalSubmitting, setIsOpenProcessModalSubmitting] =
    useState(false);

  // Search by rack code or barcode (current-page filter + global API lookup, 5s debounce)
  const [rackSearchQuery, setRackSearchQuery] = useState("");
  const [searchResultRack, setSearchResultRack] = useState<RackLocation | null>(null);
  const [isSearchingByBarcode, setIsSearchingByBarcode] = useState(false);

  // Print settings modal state
  const [showPrintSettingsModal, setShowPrintSettingsModal] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    paperSize: '4x6' as '4x6' | '6x4' | '1.96x2.75' | '50mm * 25mm' | '50mm * 70mm',
    paperWidth: 812,
    paperHeight: 1218,
    labelsPerPage: 4,
    columnsPerRow: 2,
    firstLabelTopMargin: 0,
    showCutLines: true,
    zoneFontSize: 30,
    rackCodeFontSize: 80,
    detailsFontSize: 40,
    barcodeHeight: 80,
    barcodeWidth: 2,
    orientation: 'horizontal' as 'horizontal' | 'vertical',
  });
  const [racksReadyToPrint, setRacksReadyToPrint] = useState<Array<{
    rackCode: string;
    barcode: string;
    shelf?: number | string;
    floor?: number | string;
    zone?: string;
  }>>([]);

  const router = useRouter();

  // Fetch storage slots from API for ST zone
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

  useEffect(() => {
    fetchStorageSlots();
  }, []);

  // Short-term storage: fixed 3-column layout (no longer 4)
  const SHORT_TERM_COLUMNS = 3;

  // Map storage slots to RackLocation format
  const racks = useMemo(() => {
    if (storageSlots.length === 0) {
      return [];
    }

    // Convert to RackLocation format
    // Filter out slots that are beyond the configured column count (e.g. Floor 4 when we only have 3)
    const mappedRacks: RackLocation[] = storageSlots
      .filter((slot) => slot.floorNumber <= SHORT_TERM_COLUMNS)
      .map((slot) => {
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
      return {
        rows: Math.max(maxShelf, preferences.gridRows),
        columns: SHORT_TERM_COLUMNS,
      };
    }
    return {
      rows: preferences.gridRows,
      columns: SHORT_TERM_COLUMNS,
    };
  }, [storageSlots, preferences]);

  // Rack details are fetched only on click (handleRackClick), not on load, to avoid N API calls per box.

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

  const racksFilteredBySearch = useMemo(() => {
    const q = rackSearchQuery.trim().toLowerCase();
    if (!q || !racks) return [];
    return (racks ?? []).filter(
      (r) =>
        (r.rackCode && r.rackCode.toLowerCase().includes(q)) ||
        (r.barcode && r.barcode.toLowerCase().includes(q))
    );
  }, [racks, rackSearchQuery]);

  // Global search: fetch slot by barcode/label (5s debounce)
  useEffect(() => {
    const q = rackSearchQuery.trim();
    if (!q) {
      setSearchResultRack(null);
      setIsSearchingByBarcode(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingByBarcode(true);
      setSearchResultRack(null);
      try {
        const details = await fetchRackDetailsFromYarnApis(q, "ST", null);
        const slot = details.storageSlot;
        const data = details.type === "boxes" ? (details.data as BoxInSlot[]) : (details.data as ConeInSlot[]);
        const rack: RackLocation = {
          id: slot._id,
          rackCode: slot.label,
          row: slot.shelfNumber,
          column: slot.floorNumber,
          shelf: slot.shelfNumber,
          barcode: slot.barcode,
          capacity: 1,
          currentBoxes: Array.isArray(data) ? data.length : 0,
          status: Array.isArray(data) && data.length > 0 ? "Occupied" : slot.isActive ? "Available" : "Maintenance",
        };
        setSearchResultRack(rack);
        setRackSlotDetails((prev) => new Map(prev).set(slot._id, details));
      } catch {
        setSearchResultRack(null);
      } finally {
        setIsSearchingByBarcode(false);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [rackSearchQuery]);

  const displayRacksForSearch = useMemo(() => {
    if (!rackSearchQuery.trim()) return [];
    if (searchResultRack) return [searchResultRack];
    return racksFilteredBySearch;
  }, [rackSearchQuery, searchResultRack, racksFilteredBySearch]);

  const ST_SECTIONS = ["B7-01"];
  const PAGE_SIZE_OPTIONS = [52, 100, 200, 500];

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<RackFilters>(DEFAULT_RACK_FILTERS);
  const [slotsWithContents, setSlotsWithContents] = useState<
    SlotWithContents[] | null
  >(null);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [contentsError, setContentsError] = useState<string | null>(null);
  const [filterPage, setFilterPage] = useState(1);
  const [filterLimit, setFilterLimit] = useState(52);

  const activeFilterCount = countActiveFilters(filters);
  const filtersActive = activeFilterCount > 0;

  /**
   * Lazy-fetch full ST zone (slots + boxes + cones) when any filter is active.
   */
  useEffect(() => {
    if (!filtersActive) return;
    if (slotsWithContents !== null) return;
    let cancelled = false;
    setIsLoadingContents(true);
    setContentsError(null);
    storageSlotService
      .getSlotsWithContents({ zone: "ST" })
      .then((res) => {
        if (cancelled) return;
        setSlotsWithContents(res.results || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setContentsError(
          err instanceof Error ? err.message : "Failed to load rack contents"
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingContents(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filtersActive, slotsWithContents]);

  const filteredSlots = useMemo<SlotWithContents[] | null>(() => {
    if (!filtersActive) return null;
    if (!slotsWithContents) return [];

    const yarnQ = filters.yarnName.trim().toLowerCase();

    return slotsWithContents.filter((slot) => {
      if (
        filters.sectionCode !== "all" &&
        (slot.sectionCode || "") !== filters.sectionCode
      ) {
        return false;
      }

      const boxes = slot.boxes || [];
      const cones = slot.cones || [];
      const hasContent = boxes.length > 0 || cones.length > 0;

      if (filters.occupancy === "empty" && hasContent) return false;
      if (filters.occupancy === "occupied" && !hasContent) return false;

      if (yarnQ) {
        const boxHit = boxes.some((b) =>
          (b.yarnName || "").toLowerCase().includes(yarnQ)
        );
        const coneHit = cones.some((c) =>
          (c.yarnName || "").toLowerCase().includes(yarnQ)
        );
        if (!boxHit && !coneHit) return false;
      }

      return true;
    });
  }, [filtersActive, slotsWithContents, filters]);

  const filterMatchCount = filteredSlots?.length ?? 0;
  const filterTotalPages = Math.max(
    1,
    Math.ceil(filterMatchCount / filterLimit) || 1
  );
  const displayFilterPage = Math.min(filterPage, filterTotalPages);

  const paginatedFilteredSlots = useMemo(() => {
    if (!filtersActive || !filteredSlots) return [];
    const start = (displayFilterPage - 1) * filterLimit;
    return filteredSlots.slice(start, start + filterLimit);
  }, [filtersActive, filteredSlots, displayFilterPage, filterLimit]);

  useEffect(() => {
    if (!filtersActive) return;
    setFilterPage(1);
  }, [
    filters.yarnName,
    filters.occupancy,
    filters.sectionCode,
  ]);

  const handleClearFilters = () => {
    setFilters(DEFAULT_RACK_FILTERS);
    setFilterPage(1);
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

  // Get slot boxes for a rack (from API) - handles both boxes and cones
  const getRackSlotBoxes = (rack: RackLocation): BoxInSlot[] => {
    const details = rackSlotDetails.get(rack.id);
    if (!details) return [];

    if (details.type === "boxes") {
      return details.data as BoxInSlot[];
    }

    // If it's cones, convert to box-like format for display
    if (details.type === "cones") {
      const cones = details.data as ConeInSlot[];
      // Group cones by boxId and yarnName to create box-like entries
      const boxMap = new Map<string, {
        boxId: string;
        poNumber: string;
        yarnName: string;
        lotNumber: string;
        boxWeight: number;
        numberOfCones: number;
      }>();

      cones.forEach((cone) => {
        const key = `${cone.boxId}-${cone.yarnName}`;
        if (!boxMap.has(key)) {
          boxMap.set(key, {
            boxId: cone.boxId,
            poNumber: cone.poNumber || "-",
            yarnName: cone.yarnName || "-",
            lotNumber: "-",
            boxWeight: 0,
            numberOfCones: 0,
          });
        }
        const box = boxMap.get(key)!;
        box.boxWeight += cone.coneWeight || 0;
        box.numberOfCones += 1;
      });

      // Convert to BoxInSlot-like format
      return Array.from(boxMap.values()).map((box) => ({
        _id: box.boxId,
        boxId: box.boxId,
        poNumber: box.poNumber,
        barcode: box.boxId,
        yarnName: box.yarnName,
        lotNumber: box.lotNumber,
        boxWeight: box.boxWeight,
        numberOfCones: box.numberOfCones,
        tearweight: 0,
        storedStatus: true,
        storageLocation: rack.barcode,
        orderDate: "",
        orderQty: 0,
        receivedDate: "",
        createdAt: "",
        updatedAt: "",
        shadeCode: "",
      } as BoxInSlot));
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
    const details = rackSlotDetails.get(rack.id);

    // If we have slot details (boxes or cones), use those
    if (details && (details.type === "boxes" || details.type === "cones")) {
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

      // If details exist but no boxes/cones yet, show loading
      return {
        boxes: [],
        totalBoxes: 0,
        totalWeight: 0,
        totalCones: 0,
        isLoading: loadingSlotDetails.has(rack.id),
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

  const handleRackClick = async (rack: RackLocation) => {
    try {
      setIsLoadingRackDetails(true);
      setIsRackModalOpen(true);
      let details = rackSlotDetails.get(rack.id);
      if (!details) {
        const slot = storageSlots.find((s) => s._id === rack.id);
        details = await fetchRackDetailsFromYarnApis(
          rack.barcode ?? rack.rackCode,
          "ST",
          slot ?? null
        );
        setRackSlotDetails((prev) => new Map(prev).set(rack.id, details!));
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

  const handleOpenTransferModal = (rack: RackLocation) => {
    setTransferSourceRack(rack);
    setShowTransferModal(true);
  };

  const handleTransferComplete = async (sourceRackBarcode?: string, destinationRackBarcode?: string) => {
    // Refresh only affected racks after transfer
    try {
      const racksToRefresh: string[] = [];

      // Add source and destination racks if provided
      if (sourceRackBarcode) {
        racksToRefresh.push(sourceRackBarcode);
      }
      if (destinationRackBarcode) {
        racksToRefresh.push(destinationRackBarcode);
      }

      // Refresh only the affected racks
      if (racksToRefresh.length > 0) {
        const refreshPromises = racksToRefresh.map(async (rackBarcode) => {
          try {
            const rack = racks.find((r) => r.barcode === rackBarcode);
            const slot = rack ? storageSlots.find((s) => s._id === rack.id) : null;
            const details = await fetchRackDetailsFromYarnApis(
              rackBarcode,
              "ST",
              slot ?? null
            );
            if (rack) {
              setRackSlotDetails((prev) => {
                const newMap = new Map(prev);
                newMap.set(rack.id, details);
                return newMap;
              });
            }
          } catch (error) {
            console.error(`Failed to refresh details for rack ${rackBarcode}:`, error);
          }
        });
        await Promise.all(refreshPromises);
      } else {
        const racksWithBarcodes = racks.filter((rack) => rack.barcode);
        const refreshPromises = racksWithBarcodes.map(async (rack) => {
          try {
            const slot = storageSlots.find((s) => s._id === rack.id);
            const details = await fetchRackDetailsFromYarnApis(
              rack.barcode ?? rack.rackCode,
              "ST",
              slot ?? null
            );
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

      toast.success("Transfer completed and data refreshed successfully");
    } catch (error) {
      console.error("Failed to refresh data:", error);
      toast.error("Transfer completed but failed to refresh some data");
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

  const handlePaperSizeChange = (size: '4x6' | '6x4' | '1.96x2.75' | '70mm * 50mm' | '50mm * 25mm' | '50mm * 70mm') => {
    if (size === '4x6') {
      setPrintSettings({
        ...printSettings,
        paperSize: '4x6',
        paperWidth: 812,
        paperHeight: 1218,
        orientation: 'horizontal',
      });
    } else if (size === '6x4') {
      setPrintSettings({
        ...printSettings,
        paperSize: '6x4',
        paperWidth: 1218,
        paperHeight: 812,
        orientation: 'horizontal',
      });
    } else if (size === '1.96x2.75' || size === '50mm * 70mm') {
      setPrintSettings({
        ...printSettings,
        paperSize: size,
        paperWidth: 398,  // 1.96 inches × 203 DPI
        paperHeight: 558, // 2.75 inches × 203 DPI
        labelsPerPage: 1,
        columnsPerRow: 1,
        orientation: 'vertical',
        firstLabelTopMargin: 20,
        rackCodeFontSize: 40,
        barcodeHeight: 100,
        detailsFontSize: 40,
        barcodeWidth: 3,
      });
    } else if (size === '50mm * 25mm') {
      setPrintSettings({
        ...printSettings,
        paperSize: '50mm * 25mm',
        paperWidth: 406,  // 2 inches
        paperHeight: 203, // 1 inch
        labelsPerPage: 1,
        columnsPerRow: 1,
        rackCodeFontSize: 40,
        detailsFontSize: 20,
        barcodeHeight: 40,
        barcodeWidth: 2,
        orientation: 'horizontal',
      });
    }
  };

  const executeBrowserPrint = async () => {
    if (racksReadyToPrint.length === 0) {
      toast.error("No racks available to print");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups for this site.");
      return;
    }

    const isSmall = printSettings.paperSize === '50mm * 25mm';
    const isVertical = printSettings.orientation === 'vertical';

    let paperW = 101.6;
    let paperH = 152.4;

    if (isSmall) { paperW = 50; paperH = 25; }

    else if (printSettings.paperSize === '6x4') { paperW = 152.4; paperH = 101.6; }
    else if (printSettings.paperSize === '1.96x2.75' || printSettings.paperSize === '50mm * 70mm') { paperW = 50; paperH = 70; }

    const labelW = paperW / printSettings.columnsPerRow;
    const labelH = paperH / (printSettings.labelsPerPage / printSettings.columnsPerRow);

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Browser Print - Rack Labels</title>
          <style>
            @page { size: ${paperW}mm ${paperH}mm; margin: 0; }
            body { margin: 0; padding: 0; font-family: sans-serif; -webkit-print-color-adjust: exact; }
            .page {
              width: ${paperW}mm;
              height: ${paperH}mm;
              position: relative;
              page-break-after: always;
              overflow: hidden;
            }
            .label {
              width: ${labelW}mm;
              height: ${labelH}mm;
              float: left;
              box-sizing: border-box;
              padding: 1.5mm;
              display: flex;
              justify-content: center;
              align-items: center;
              border: 0.1mm dotted #eee;
              overflow: hidden;
            }
            @media print { .label { border: none; } }
            .content {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              width: 100%;
              height: 100%;
              ${isVertical ? `
                transform: rotate(-90deg);
                width: ${labelH}mm;
                height: ${labelW}mm;
              ` : ''}
            }
            .zone { font-size: ${isSmall ? '8pt' : '12pt'}; color: #666; margin-bottom: 1mm; white-space: nowrap; }
            .code { font-weight: bold; font-size: ${isSmall ? '16pt' : '26pt'}; margin-bottom: 1mm; line-height: 1; }
            .details { font-size: ${isSmall ? '10pt' : '18pt'}; margin-bottom: 2mm; white-space: nowrap; font-weight: 500; }
            .barcode { width: 100%; max-height: 45%; display: flex; justify-content: center; align-items: center; }
            svg { width: 90%; height: auto; max-height: 100%; }
          </style>
        </head>
        <body>
    `;

    const labelsPerPage = printSettings.labelsPerPage;
    for (let i = 0; i < racksReadyToPrint.length; i += labelsPerPage) {
      html += `<div class="page">`;
      for (let j = 0; j < labelsPerPage && (i + j) < racksReadyToPrint.length; j++) {
        const rack = racksReadyToPrint[i + j];

        html += `
          <div class="label">
            <div class="content">
              <div class="code">${rack.rackCode}</div>
              <div class="details">Shelf: ${rack.shelf || '-'} | Floor: ${rack.floor || '-'}</div>
              <div class="barcode"><svg id="bc-${i + j}"></svg></div>
            </div>
          </div>
        `;
      }
      html += `</div>`;
    }

    html += `
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          window.onload = function() {
            const racks = ${JSON.stringify(racksReadyToPrint)};
            racks.forEach((rack, idx) => {
              const el = document.getElementById('bc-' + idx);
              if (el) {
                JsBarcode(el, rack.barcode, {
                  format: "CODE128",
                  width: 2,
                  height: ${isSmall ? 40 : 60},
                  displayValue: true,
                  fontSize: ${isSmall ? 10 : 14},
                  margin: 0
                });
              }
            });
            setTimeout(() => { window.print(); window.close(); }, 500);
          };
        </script>
      </body></html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
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

    // Prepare racks for printing and show settings modal
    setRacksReadyToPrint(selectedRacks.map(r => ({
      rackCode: r.rackCode,
      barcode: r.barcode!,
      shelf: r.shelf,
      floor: r.column,
      zone: 'ST'
    })));
    setShowPrintBarcodeModal(false);
    setShowPrintSettingsModal(true);
  };

  // Export rack data to Excel (Code of Shelf, Shelf Number, Floor) - same as long-term
  const handleDownloadRackExcel = () => {
    if (racks.length === 0) {
      toast.error("No rack data to export");
      return;
    }
    try {
      const rows = racks.map((r) => ({
        "Code of Shelf": r.rackCode,
        "Shelf Number": r.shelf ?? r.row,
        Floor: r.column,
        Barcode: r.barcode || "",
        Status: r.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rack Data");
      XLSX.writeFile(
        wb,
        `short_term_storage_racks_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      toast.success("Rack data downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to download Excel");
    }
  };

  // Handle print all racks barcode
  const handlePrintAllRacks = () => {
    const racksToPrint = racks.filter((rack) => rack.barcode);
    if (racksToPrint.length === 0) {
      toast.error("No racks available to print");
      return;
    }

    // Prepare racks for printing and show settings modal
    setRacksReadyToPrint(racksToPrint.map(r => ({
      rackCode: r.rackCode,
      barcode: r.barcode!,
      shelf: r.shelf,
      floor: r.column,
      zone: 'ST'
    })));
    setShowPrintBarcodeModal(false);
    setShowPrintSettingsModal(true);
  };

  // Execute print with settings
  const executePrintWithSettings = async () => {
    setShowPrintSettingsModal(false);

    if (racksReadyToPrint.length === 0) {
      toast.error("No racks selected to print");
      return;
    }

    setIsPrinting(true);
    const rowsPerPage = Math.ceil(printSettings.labelsPerPage / printSettings.columnsPerRow);
    const labelsPerSheet = rowsPerPage * printSettings.columnsPerRow;
    const pageCount = Math.ceil(racksReadyToPrint.length / labelsPerSheet);
    const layoutInfo = `${rowsPerPage} rows × ${printSettings.columnsPerRow} column(s)`;
    const toastId = toast.loading(`Printing ${racksReadyToPrint.length} rack(s) on ${pageCount} page(s) (${layoutInfo})...`);

    try {
      const result = await printRacks(racksReadyToPrint, { customSettings: printSettings });

      if (result.success) {
        toast.success(`Successfully printed ${result.printed} rack barcode(s)`, { id: toastId });
        setSelectedRacksForPrint([]);
        setRacksReadyToPrint([]);
      } else {
        toast.error(result.error || "Failed to print rack barcodes", { id: toastId });
      }
    } catch (error: any) {
      toast.error(error.message || "Printing error", { id: toastId });
    } finally {
      setIsPrinting(false);
    }
  };

  const mapYarnBoxToPackedBox = useCallback((box: YarnBox): PackedBox => {
    const qcApproved =
      box.qcData?.status === "qc_approved" ||
      (box.storedStatus === true && !!box.storageLocation); // Fallback: stored boxes without qcData (legacy/missing populate)
    const apiBox = box as YarnBox & { purchaseOrder?: { supplierName?: string } };
    const supplierName =
      box.supplier?.brandName ??
      box.supplierName ??
      apiBox.purchaseOrder?.supplierName ??
      "";

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
      poNumber: box.poNumber,
      supplierName: supplierName || undefined,
    };
  }, []);

  const fetchBoxByBarcode = useCallback(
    async (barcode: string): Promise<BoxBarcodeFetchResult> => {
      const trimmedBarcode = barcode.trim();

      if (!trimmedBarcode) {
        toast.error("Please enter a barcode to scan");
        setResumeProcessBoxId(null);
        return { mappedBox: null };
      }

      setIsLoadingBox(true);
      setResumeProcessBoxId(null);
      try {
        console.log(
          "ShortTermStorage - fetching box by barcode:",
          trimmedBarcode
        );
        const boxDetails = await yarnBoxService.getYarnBoxByBarcode(
          trimmedBarcode,
          { includeInactive: true }
        );

        // Internal transfer should ONLY allow boxes that are currently on long-term storage.
        // Long-term storage identifiers in backend are either legacy "LT-*" or rack barcodes like "B7-02-* .. B7-05-*".
        const storageLoc = String(boxDetails.storageLocation || "").trim();
        const isLongTermLocation = /^(LT-|B7-0[2-5]-)/i.test(storageLoc);
        const isStored = boxDetails.storedStatus === true;

        if (!storageLoc || !isLongTermLocation || !isStored) {
          setScannedBoxDetails(null);
          setSelectedBox(null);
          setExistingShortTermCones([]);

          const idForCones = String(boxDetails.boxId || "").trim();
          let hasYarnConesForBox = false;
          if (idForCones) {
            try {
              const allBoxCones =
                await yarnConeService.getYarnConesByBoxId(idForCones);
              hasYarnConesForBox = allBoxCones.length > 0;
            } catch (coneLookupErr) {
              console.error(
                "Failed to check existing yarn cones for box:",
                coneLookupErr
              );
              toast.error(
                coneLookupErr instanceof Error
                  ? coneLookupErr.message
                  : "Could not verify existing cones for this box"
              );
              return { mappedBox: null };
            }
          }

          if (hasYarnConesForBox && idForCones) {
            setResumeProcessBoxId(idForCones);
            toast(
              "This box is already in short-term / internal transfer. Use Open process page to continue.",
              { duration: 5000 }
            );
            return { mappedBox: null, resumeProcessBoxId: idForCones };
          }

          toast.error(
            "This box is not on long-term storage. Store it in long-term storage first, then do internal transfer."
          );
          return { mappedBox: null };
        }

        setScannedBoxDetails(boxDetails);
        const mappedBox = mapYarnBoxToPackedBox(boxDetails);

        if (mappedBox.status !== "Stored") {
          setSelectedBox(null);
          setExistingShortTermCones([]);
          toast.error(
            "Box must be QC approved and stored in long-term storage before transfer"
          );
          return { mappedBox: null };
        }

        // Show which cones (if any) are already in short-term storage for this box.
        try {
          const stCones = await yarnConeService.getShortTermConesByBoxId(
            boxDetails.boxId
          );
          setExistingShortTermCones(stCones);
          if (stCones.length > 0) {
            toast(
              `Warning: ${stCones.length} cone(s) already exist in short-term storage for this box`
            );
          }
        } catch (coneErr) {
          console.error("Failed to fetch existing ST cones for box:", coneErr);
          setExistingShortTermCones([]);
        }

        setSelectedBox(mappedBox);
        setShowInternalTransferModal(true);
        toast.success(`Box ${boxDetails.boxId || trimmedBarcode} fetched`);
        return { mappedBox };
      } catch (error) {
        console.error("Failed to fetch box details:", error);
        setScannedBoxDetails(null);
        setExistingShortTermCones([]);
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch box details"
        );
        return { mappedBox: null };
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
    async (barcode: string): Promise<BoxBarcodeFetchResult> => {
      return fetchBoxByBarcode(barcode);
    },
    [fetchBoxByBarcode]
  );

  /**
   * Builds session payload and navigates to the ST process route.
   * When the box already has cones, uses generate-by-box; otherwise seeds session with the box only (empty cones list).
   * @param knownBox Optional box from a prior barcode lookup to avoid an extra GET when there are no cones.
   * @returns true when navigation was triggered
   */
  const navigateToStoredBoxProcessPage = useCallback(
    async (
      boxId: string,
      options?: { knownBox?: YarnBox }
    ): Promise<boolean> => {
      const id = boxId.trim();
      if (!id) {
        toast.error("Box ID is required");
        return false;
      }

      try {
        let conesCheck: Awaited<
          ReturnType<typeof yarnConeService.getYarnConesByBoxId>
        > = [];
        try {
          conesCheck = await yarnConeService.getYarnConesByBoxId(id);
        } catch (coneErr) {
          console.error("Failed to list cones for process page:", coneErr);
          toast.error(
            coneErr instanceof Error
              ? coneErr.message
              : "Could not verify cones for this box"
          );
          return false;
        }

        let response: GenerateConesResponse;
        if (conesCheck.length > 0) {
          response = await yarnConeService.generateConesByBox(id);
        } else {
          const boxPayload =
            options?.knownBox ?? (await yarnBoxService.getYarnBoxById(id));
          response = {
            message:
              "This box has no yarn cones yet. Run internal transfer from long-term storage to generate cones; this page will list them once they exist.",
            box: boxPayload,
            cones: [],
          };
        }

        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem(
              getProcessedBoxStorageKey(id),
              JSON.stringify(response)
            );
          } catch (storageError) {
            console.error("Failed to cache processed box details:", storageError);
            toast.error("Could not save session data for process page");
            return false;
          }
        }
        router.push(
          `/yarn-management/purchase-management/yarn-storage/process/${encodeURIComponent(
            id
          )}`
        );
        return true;
      } catch (error) {
        console.error("Failed to open process page for box:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not load process page data"
        );
        return false;
      }
    },
    [router]
  );

  const closeOpenProcessByBarcodeModal = useCallback(() => {
    setShowOpenProcessByBarcodeModal(false);
    setOpenProcessBarcodeInput("");
    setOpenProcessModalError("");
  }, []);

  /**
   * From the “open by barcode” modal: resolve box by barcode, then open the ST process page (with or without cones).
   */
  const handleSubmitOpenProcessByBarcode = useCallback(async () => {
    const raw = openProcessBarcodeInput.trim();
    setOpenProcessModalError("");
    if (!raw) {
      setOpenProcessModalError("Enter the box barcode");
      return;
    }

    setIsOpenProcessModalSubmitting(true);
    try {
      const boxDetails = await yarnBoxService.getYarnBoxByBarcode(raw, {
        includeInactive: true,
      });
      const boxId = String(boxDetails.boxId || "").trim();
      if (!boxId) {
        setOpenProcessModalError("Could not read box ID from this record");
        return;
      }

      const ok = await navigateToStoredBoxProcessPage(boxId, {
        knownBox: boxDetails,
      });
      if (ok) {
        closeOpenProcessByBarcodeModal();
      }
    } catch (err) {
      console.error("Open process modal: box lookup failed:", err);
      setOpenProcessModalError(
        err instanceof Error
          ? err.message
          : "Box not found or invalid barcode"
      );
    } finally {
      setIsOpenProcessModalSubmitting(false);
    }
  }, [
    openProcessBarcodeInput,
    navigateToStoredBoxProcessPage,
    closeOpenProcessByBarcodeModal,
  ]);

  /**
   * Opens ST process page for the box shown in the post-scan resume banner.
   */
  const handleOpenResumeProcessPage = useCallback(async () => {
    const boxId = resumeProcessBoxId?.trim();
    if (!boxId) {
      toast.error("No box selected for process page");
      return;
    }

    setIsLoadingBox(true);
    try {
      await navigateToStoredBoxProcessPage(boxId);
    } finally {
      setIsLoadingBox(false);
    }
  }, [resumeProcessBoxId, navigateToStoredBoxProcessPage]);

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
    let didNavigate = false;
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
      // Keep modal open and button in "Transferring" state until process page has rendered
      didNavigate = true;
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
      if (!didNavigate) {
        setIsProcessingBox(false);
      }
    }
  }, [
    mapYarnBoxToPackedBox,
    scannedBoxDetails,
    router,
    selectedBox,
    onInternalTransfer,
  ]);

  // When Internal Transfer modal is open, Enter key triggers the Internal Transfer button
  useEffect(() => {
    if (!showInternalTransferModal || !scannedBoxDetails || isProcessingBox) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleProcessBox();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showInternalTransferModal, scannedBoxDetails, isProcessingBox, handleProcessBox]);

  const handleScannerScan = useCallback(
    async (barcode: string) => {
      const { mappedBox, resumeProcessBoxId: resumeId } =
        await handleBoxScan(barcode);
      if (resumeId) return true;
      return Boolean(mappedBox);
    },
    [handleBoxScan]
  );

  return (
    <div className="space-y-6">
      {/* Header with Transfer Button */}
      <div className="flex justify-end items-center mb-0 px-1 gap-2">
        {/* <div>
          <h2 className="text-xl font-bold text-gray-800">Short-Term Storage</h2>
          <p className="text-gray-600">Yarn inventory for knitting operations</p>
        </div> */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => setShowTransferRequiredDrawer(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-amber-300 bg-amber-50 text-[11px] font-bold text-amber-950 rounded hover:bg-amber-100 transition-colors shadow-sm"
            title="Yarn still required for knitting (yarn issue queue). Compare with ST stock to prioritize LT→ST or receipts."
            aria-label="Open transfer required summary for yarn issue demand"
          >
            <i className="ri-alarm-warning-line" aria-hidden />
            Transfer required
          </button>
          <button
            onClick={() => setShowConeTransferModal(true)}
            className="ti-btn ti-btn-primary"
            title="Transfer cone between ST locations"
          >
            <i className="ri-arrow-right-left-line me-1"></i>
            Transfer Cone
          </button>
          <QZTrayStatus />
        </div>
      </div>

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
            invalidMessage="This box is not on long-term storage. Store it in long-term storage first, then do internal transfer."
            disabled={isLoadingBox || isProcessingBox}
          />
          {resumeProcessBoxId ? (
            <div
              className="flex flex-wrap items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-950"
              role="status"
              aria-live="polite"
            >
              <i
                className="ri-stack-line text-xl text-amber-700 shrink-0"
                aria-hidden
              />
              <p className="text-sm flex-1 min-w-[200px] m-0">
                Box{" "}
                <span className="font-mono font-medium">{resumeProcessBoxId}</span>{" "}
                already has internal-transfer cones. Open the process page to
                weigh, assign racks, or print labels.
              </p>
              <button
                type="button"
                onClick={() => void handleOpenResumeProcessPage()}
                disabled={isLoadingBox || isProcessingBox}
                className="ti-btn ti-btn-primary inline-flex items-center gap-1.5 shrink-0"
                aria-label={`Open short-term process page for box ${resumeProcessBoxId}`}
              >
                <i className="ri-external-link-line text-base" aria-hidden />
                Open process page
              </button>
              <button
                type="button"
                onClick={() => setResumeProcessBoxId(null)}
                className="ti-btn ti-btn-light text-sm shrink-0"
                aria-label="Dismiss resume hint"
              >
                Dismiss
              </button>
            </div>
          ) : null}
          {isLoadingBox && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <i className="ri-loader-4-line animate-spin"></i>
              <span>Fetching box details...</span>
            </div>
          )}
        </div>
      </div>

      {/* Internal Transfer Modal - shown when user scans box barcode */}
      {showInternalTransferModal && scannedBoxDetails && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowInternalTransferModal(false);
              setScannedBoxDetails(null);
              setSelectedBox(null);
              setExistingShortTermCones([]);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="box-header border-b border-gray-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
              <h3 className="box-title text-lg font-semibold">
                <i className="ri-barcode-box-line me-2"></i>
                Internal Transfer - Box Details
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowInternalTransferModal(false);
                  setScannedBoxDetails(null);
                  setSelectedBox(null);
                  setExistingShortTermCones([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition p-1"
                title="Close"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="box-body px-6 py-4 overflow-y-auto flex-1 space-y-4">
              {isLoadingBox && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <i className="ri-loader-4-line animate-spin"></i>
                  <span>Fetching latest details...</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Box ID</label>
                  <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                    {scannedBoxDetails.boxId}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Barcode</label>
                  <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                    {scannedBoxDetails.barcode}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">PO Number</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {scannedBoxDetails.poNumber}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Yarn Name</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {scannedBoxDetails.yarnName || "-"}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Shade Code</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {scannedBoxDetails.shadeCode || "-"}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Box Weight (kg)</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {scannedBoxDetails.boxWeight ?? "-"}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 uppercase">Number of Cones</label>
                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {scannedBoxDetails.numberOfCones ?? "-"}
                  </div>
                </div>
                {scannedBoxDetails.receivedDate && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase">Received Date</label>
                    <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                      {new Date(scannedBoxDetails.receivedDate).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Existing ST cones from this box (debug / safety) */}
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800">
                    Short-term cones from this box
                  </div>
                  <div className="text-xs text-gray-600">
                    {existingShortTermCones.length} found
                  </div>
                </div>
                {existingShortTermCones.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-600">
                    No cones currently found in short-term storage for this box.
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-white sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Cone Barcode
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            ST Storage
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Wt (kg)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {existingShortTermCones.map((c) => (
                          <tr key={c._id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm font-mono text-gray-800">
                              {c.barcode}
                            </td>
                            <td className="px-4 py-2 text-sm font-mono text-gray-700">
                              {c.coneStorageId || "-"}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {formatKg(c.coneWeight, 4)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowInternalTransferModal(false);
                    setScannedBoxDetails(null);
                    setSelectedBox(null);
                    setExistingShortTermCones([]);
                  }}
                  className="ti-btn ti-btn-light"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessBox}
                  className="ti-btn bg-black text-white hover:bg-gray-800 border-0"
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
        </div>
      )}

      {/* 2D Grid Layout */}
      <div className="box">
        <div className="box-header flex flex-col gap-0 border-b border-gray-100 bg-white px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <label
                htmlFor="st-storage-rack-search"
                className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Search rack
              </label>
              <div className="flex min-w-0 max-w-xl flex-1 items-center gap-2">
                <input
                  id="st-storage-rack-search"
                  type="text"
                  value={rackSearchQuery}
                  onChange={(e) => setRackSearchQuery(e.target.value)}
                  placeholder="Rack code or barcode"
                  className={`${storageInputClass} min-w-0 flex-1`}
                  aria-label="Search rack by code or barcode"
                />
                {rackSearchQuery.trim() ? (
                  <button
                    type="button"
                    onClick={() => setRackSearchQuery("")}
                    className={storageIconBtnClass}
                    title="Clear search"
                    aria-label="Clear rack search"
                  >
                    <i className="ri-close-line text-base" aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                type="button"
                onClick={() => setShowFilterPanel((v) => !v)}
                className={
                  filtersActive
                    ? `${storageBtnFilterActiveClass} relative`
                    : `${storageBtnSecondaryClass} relative`
                }
                title="Filter racks by yarn, occupancy, and section"
                aria-expanded={showFilterPanel}
              >
                <i className="ri-filter-3-line text-sm" aria-hidden />
                Filters
                {activeFilterCount > 0 ? (
                  <span
                    className={`ml-0.5 inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      filtersActive
                        ? "bg-white text-purple-700"
                        : "bg-purple-600 text-white"
                    }`}
                  >
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenProcessModalError("");
                  setOpenProcessBarcodeInput("");
                  setShowOpenProcessByBarcodeModal(true);
                }}
                className={storageBtnSecondaryClass}
                title="Open short-term box process page by barcode"
              >
                <i className="ri-external-link-line text-sm text-purple-600" aria-hidden />
                Open process page
              </button>
              <button
                type="button"
                onClick={handleDownloadRackExcel}
                className={storageBtnSecondaryClass}
                title="Download rack data as Excel"
              >
                <i className="ri-file-excel-2-line text-sm text-green-600" aria-hidden />
                Download Excel
              </button>
              <button
                type="button"
                onClick={() => setShowReportDrawer(true)}
                className={storageBtnSecondaryClass}
                title="Open zone report"
              >
                <i className="ri-file-list-3-line text-sm text-purple-600" aria-hidden />
                Report
              </button>
              <button
                type="button"
                onClick={() => setShowPrintBarcodeModal(true)}
                className={storageBtnPrimaryClass}
                title="Print rack barcodes"
              >
                <i className="ri-printer-line text-sm" aria-hidden />
                Print Barcode
              </button>
            </div>
          </div>

          <RackFilterPanel
            open={showFilterPanel}
            filters={filters}
            sections={ST_SECTIONS}
            isLoading={isLoadingContents}
            filteredCount={filtersActive ? filteredSlots?.length : undefined}
            totalCount={slotsWithContents?.length}
            onChange={setFilters}
            onClear={handleClearFilters}
            onClose={() => setShowFilterPanel(false)}
          />
        </div>
        <div className="box-body">
          {filtersActive &&
          slotsWithContents !== null &&
          !isLoadingContents &&
          filterMatchCount > 0 ? (
            <div className={storagePaginationBarClass}>
              <span className="text-sm text-gray-700">
                Showing {(displayFilterPage - 1) * filterLimit + 1}–
                {Math.min(displayFilterPage * filterLimit, filterMatchCount)} of{" "}
                {filterMatchCount.toLocaleString()} matching racks
                {slotsWithContents?.length != null ? (
                  <span className="text-gray-500">
                    {" "}
                    (zone {slotsWithContents.length.toLocaleString()} total)
                  </span>
                ) : null}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="st-filter-page-size" className="text-xs font-medium text-gray-600">
                    Per page
                  </label>
                  <select
                    id="st-filter-page-size"
                    value={filterLimit}
                    onChange={(e) => {
                      setFilterLimit(Number(e.target.value));
                      setFilterPage(1);
                    }}
                    className={storageCompactSelectClass}
                    style={selectChevronBgStyle}
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterPage((p) => Math.max(1, p - 1))}
                    disabled={displayFilterPage <= 1}
                    className={`${storageBtnSecondaryClass} px-2 disabled:pointer-events-none disabled:opacity-40`}
                    aria-label="Previous page of filtered racks"
                  >
                    <i className="ri-arrow-left-s-line text-base" aria-hidden />
                  </button>
                  <span className="min-w-[6.5rem] text-center text-sm text-gray-700">
                    {displayFilterPage} / {filterTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFilterPage((p) => Math.min(filterTotalPages, p + 1))
                    }
                    disabled={displayFilterPage >= filterTotalPages}
                    className={`${storageBtnSecondaryClass} px-2 disabled:pointer-events-none disabled:opacity-40`}
                    aria-label="Next page of filtered racks"
                  >
                    <i className="ri-arrow-right-s-line text-base" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {filtersActive ? (
            <FilteredRackGrid
              zone="ST"
              isLoading={isLoadingContents && !slotsWithContents}
              error={contentsError}
              slots={paginatedFilteredSlots}
              yarnQuery={filters.yarnName}
              onSlotClick={(slot) => {
                const nBoxes = slot.boxes?.length ?? 0;
                const nCones = slot.cones?.length ?? 0;
                const useCones = nCones > 0 && nBoxes === 0;
                const rack: RackLocation = {
                  id: slot._id,
                  rackCode: slot.label,
                  row: slot.shelfNumber,
                  column: slot.floorNumber,
                  shelf: slot.shelfNumber,
                  sectionCode: slot.sectionCode,
                  barcode: slot.barcode,
                  capacity: 1,
                  currentBoxes: slot.boxCount ?? nBoxes,
                  status:
                    nBoxes + nCones > 0 ? "Occupied" : "Available",
                };
                setRackSlotDetails((prev) => {
                  if (prev.has(slot._id)) return prev;
                  if (nBoxes > 0 && nCones > 0) return prev;
                  const next = new Map(prev);
                  const storageSlot: StorageSlot = {
                    _id: slot._id,
                    label: slot.label,
                    barcode: slot.barcode,
                    floorNumber: slot.floorNumber,
                    shelfNumber: slot.shelfNumber,
                    sectionCode: slot.sectionCode,
                    zoneCode: slot.zoneCode,
                    isActive: true,
                    createdAt: "",
                    updatedAt: "",
                  };
                  next.set(slot._id, {
                    storageSlot,
                    zoneType: slot.zoneType || "Short-Term Storage",
                    type: useCones ? "cones" : "boxes",
                    count: useCones ? nCones : nBoxes,
                    data: useCones
                      ? (slot.cones ?? [])
                      : (slot.boxes ?? []),
                  });
                  return next;
                });
                void handleRackClick(rack);
              }}
            />
          ) : isLoadingSlots ? (
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
          ) : rackSearchQuery.trim() && !isSearchingByBarcode && displayRacksForSearch.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <i className="ri-search-line text-4xl mb-4 block"></i>
              <p>No rack found for &quot;{rackSearchQuery.trim()}&quot;</p>
              <p className="text-xs mt-1">Check the code/barcode or clear search to see all racks</p>
            </div>
          ) : rackSearchQuery.trim() && (isSearchingByBarcode || displayRacksForSearch.length > 0) ? (
            <div className="overflow-auto">
              {isSearchingByBarcode && displayRacksForSearch.length === 0 ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent" />
                  <span className="ml-3 text-sm text-gray-600">Searching for rack...</span>
                </div>
              ) : (
              <div
                className="grid gap-4 p-6 w-full"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
              >
                {displayRacksForSearch.map((rack) => {
                  const displayData = getRackDisplayData(rack);
                  const isEmpty = displayData.totalBoxes === 0 && !displayData.isLoading;
                  return (
                  <div
                    key={rack.id}
                    className={`relative border-2 rounded-xl p-2 min-h-[72px] transition-all cursor-pointer ${getRackStatusColor(rack)} hover:shadow-lg hover:scale-[1.02] flex flex-col`}
                    onClick={() => handleRackClick(rack)}
                  >
                    {isEmpty ? (
                      <div className="flex items-center justify-center flex-1 min-h-[56px] text-xs font-bold text-gray-800 text-center" title={rack.barcode || rack.rackCode}>
                        {rack.rackCode}
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-800 truncate" title={rack.barcode || rack.rackCode}>{rack.rackCode}</div>
                          </div>
                          {displayData.isLoading && displayData.totalBoxes === 0 ? (
                            <div className="flex items-center justify-center w-20">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                            </div>
                          ) : displayData.totalBoxes > 0 ? (
                            (() => {
                              const isOccupied = rack.status === "Occupied";
                              const bgColor = isOccupied ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200";
                              const titleColor = isOccupied ? "text-blue-900" : "text-green-900";
                              const contentColor = isOccupied ? "text-blue-800" : "text-green-800";
                              return (
                                <div className={`${bgColor} border rounded p-1.5 min-w-[70px]`}>
                                  <div className={`text-[9px] font-semibold ${titleColor} mb-0.5`}>Summary</div>
                                  <div className={`grid grid-cols-2 gap-0.5 text-[9px] ${contentColor}`}>
                                    <div className="text-center">
                                      <div className="font-medium">{displayData.totalCones}</div>
                                      <div className="text-[8px]">Cones</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-medium">{displayData.totalWeight.toFixed(0)}</div>
                                      <div className="text-[8px]">Kg</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
                          ) : null}
                        </div>
                        {displayData.isLoading && displayData.totalBoxes === 0 ? (
                          <div className="flex items-center justify-center py-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                          </div>
                        ) : displayData.boxes.length > 0 ? (
                          <div className="overflow-x-auto max-h-[72px] mt-0.5">
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
                                    <td className="px-1 py-0.5 text-gray-700 truncate max-w-[60px]" title={box.poNumber}>{box.poNumber}</td>
                                    <td className="px-1 py-0.5 text-gray-700 truncate max-w-[80px]" title={box.yarnName}>{box.yarnName}</td>
                                  </tr>
                                ))}
                                {displayData.boxes.length > 3 && (
                                  <tr>
                                    <td colSpan={2} className="px-1 py-0.5 text-[9px] text-gray-500 text-center">+{displayData.boxes.length - 3} more</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                  );
                })}
              </div>
              )}
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
                        relative border-2 rounded-xl p-2 min-h-[72px] transition-all cursor-pointer
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
                          (() => {
                            const displayData = getRackDisplayData(rack);
                            const isEmpty = displayData.totalBoxes === 0 && !displayData.isLoading;
                            if (isEmpty) {
                              return (
                                <div className="flex items-center justify-center flex-1 min-h-[56px] text-xs font-bold text-gray-800 text-center" title={rack.barcode || rack.rackCode}>
                                  {rack.rackCode}
                                </div>
                              );
                            }
                            return (
                          <>
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-gray-800 truncate" title={rack.barcode || rack.rackCode}>
                                  {rack.rackCode}
                                </div>
                              </div>
                              {displayData.isLoading && displayData.totalBoxes === 0 ? (
                                <div className="flex items-center justify-center w-20">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                </div>
                              ) : displayData.totalBoxes > 0 ? (
                                (() => {
                                  const isOccupied = rack.status === "Occupied";
                                  const bgColor = isOccupied ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200";
                                  const titleColor = isOccupied ? "text-blue-900" : "text-green-900";
                                  const contentColor = isOccupied ? "text-blue-800" : "text-green-800";
                                  return (
                                    <div className={`${bgColor} border rounded p-1.5 min-w-[70px]`}>
                                      <div className={`text-[9px] font-semibold ${titleColor} mb-0.5`}>Summary</div>
                                      <div className={`grid grid-cols-2 gap-0.5 text-[9px] ${contentColor}`}>
                                        <div className="text-center">
                                          <div className="font-medium">{displayData.totalCones}</div>
                                          <div className="text-[8px]">Cones</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-medium">{displayData.totalWeight.toFixed(0)}</div>
                                          <div className="text-[8px]">Kg</div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : null}
                            </div>
                            {displayData.isLoading && displayData.totalBoxes === 0 ? (
                              <div className="flex items-center justify-center py-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                              </div>
                            ) : displayData.boxes.length > 0 ? (
                              <div className="overflow-x-auto max-h-[72px] mt-0.5">
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
                            ) : null}
                          </>
                            );
                          })()
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
        onTransferSTToST={(rack) => handleOpenTransferModal(rack)}
      />

      {/* Transfer Modal */}
      <RackTransferModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setTransferSourceRack(null);
        }}
        transferType="ST_TO_ST"
        sourceRack={transferSourceRack}
        availableRacks={racks}
        onTransferComplete={handleTransferComplete}
      />

      {/* Cone Transfer Modal */}
      <ConeTransferModal
        isOpen={showConeTransferModal}
        onClose={() => {
          setShowConeTransferModal(false);
        }}
        availableRacks={racks}
        onTransferComplete={handleTransferComplete}
      />

      {/* Open ST process page by box barcode (near grid / Download Excel) */}
      {showOpenProcessByBarcodeModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isOpenProcessModalSubmitting) {
              closeOpenProcessByBarcodeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="open-process-by-barcode-title"
            className="w-full max-w-md rounded-lg bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 px-5 py-4 flex items-start justify-between gap-3">
              <div>
                <h3
                  id="open-process-by-barcode-title"
                  className="text-lg font-semibold text-gray-900 m-0"
                >
                  Open box process page
                </h3>
                <p className="text-sm text-gray-600 mt-1 mb-0">
                  Use the box barcode, box Mongo ID on the label, or any cone
                  barcode from that box — even after transfer to short-term.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isOpenProcessModalSubmitting) {
                    closeOpenProcessByBarcodeModal();
                  }
                }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close dialog"
              >
                <i className="ri-close-line text-xl" aria-hidden />
              </button>
            </div>
            <form
              className="px-5 py-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmitOpenProcessByBarcode();
              }}
            >
              <div>
                <label
                  htmlFor="open-process-barcode-input"
                  className="form-label text-sm font-medium text-gray-700"
                >
                  Box barcode
                </label>
                <input
                  id="open-process-barcode-input"
                  type="text"
                  className="form-control mt-1"
                  value={openProcessBarcodeInput}
                  onChange={(e) => {
                    setOpenProcessBarcodeInput(e.target.value);
                    if (openProcessModalError) setOpenProcessModalError("");
                  }}
                  placeholder="Scan or paste box barcode"
                  autoComplete="off"
                  disabled={isOpenProcessModalSubmitting}
                  aria-invalid={Boolean(openProcessModalError)}
                  aria-describedby={
                    openProcessModalError
                      ? "open-process-barcode-error"
                      : undefined
                  }
                />
                {openProcessModalError ? (
                  <p
                    id="open-process-barcode-error"
                    role="alert"
                    className="mt-2 text-sm text-red-600"
                  >
                    {openProcessModalError}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!isOpenProcessModalSubmitting) {
                      closeOpenProcessByBarcodeModal();
                    }
                  }}
                  className="ti-btn ti-btn-light"
                  disabled={isOpenProcessModalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ti-btn ti-btn-primary inline-flex items-center gap-1.5"
                  disabled={isOpenProcessModalSubmitting}
                  aria-busy={isOpenProcessModalSubmitting}
                >
                  {isOpenProcessModalSubmitting ? (
                    <>
                      <i
                        className="ri-loader-4-line animate-spin"
                        aria-hidden
                      />
                      Opening…
                    </>
                  ) : (
                    <>
                      <i className="ri-external-link-line" aria-hidden />
                      Open process page
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Report drawer */}
      <ZoneReportDrawer
        isOpen={showReportDrawer}
        onClose={() => setShowReportDrawer(false)}
        zoneType="ST"
        zoneLabel="Short-Term Storage"
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
                onClick={() => handlePrintAllRacks()}
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
                onClick={() => handlePrintSelectedRacks()}
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

      {/* Print Settings Modal */}
      {showPrintSettingsModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Print Settings - Rack Barcodes</h3>
              <button
                onClick={() => setShowPrintSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Paper & Orientation</h4>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Paper Size</label>
                    <div className="flex flex-wrap gap-2.5">
                      {['4x6', '6x4', '1.96x2.75', '50mm * 70mm', '50mm * 25mm'].map((size) => (
                        <label key={size} className="flex items-center cursor-pointer bg-gray-50 px-2 py-1 rounded border border-gray-200 hover:border-purple-300 transition-colors">
                          <input
                            type="radio"
                            name="paperSize"
                            value={size}
                            checked={printSettings.paperSize === size}
                            onChange={() => handlePaperSizeChange(size as any)}
                            className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="ml-1.5 text-xs text-gray-700 capitalize">{size === '4x6' ? '4" × 6"' : size === '6x4' ? '6" × 4"' : size}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Print Orientation</label>
                    <div className="flex gap-2.5">
                      {['horizontal', 'vertical'].map((orient) => (
                        <label key={orient} className="flex items-center cursor-pointer bg-gray-50 px-3 py-1.5 rounded border border-gray-200 hover:border-purple-300 transition-colors capitalize">
                          <input
                            type="radio"
                            name="orientation"
                            value={orient}
                            checked={printSettings.orientation === orient}
                            onChange={() => setPrintSettings({ ...printSettings, orientation: orient as any })}
                            className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="ml-2 text-xs font-medium text-gray-700">{orient}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Top Margin (dots)</label>
                    <input
                      type="number"
                      value={printSettings.firstLabelTopMargin}
                      onChange={(e) => setPrintSettings({ ...printSettings, firstLabelTopMargin: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Layout Settings</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Columns</label>
                    <select
                      value={printSettings.columnsPerRow}
                      onChange={(e) => setPrintSettings({ ...printSettings, columnsPerRow: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                    >
                      {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Column{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Labels Per Page</label>
                    <select
                      value={printSettings.labelsPerPage}
                      onChange={(e) => setPrintSettings({ ...printSettings, labelsPerPage: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                    >
                      {[1, 2, 3, 4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n} Label{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSettings.showCutLines}
                    onChange={(e) => setPrintSettings({ ...printSettings, showCutLines: e.target.checked })}
                    className="w-3.5 h-3.5 text-purple-600 focus:ring-purple-500 rounded"
                  />
                  <span className="ml-2 text-[11px] text-gray-600">Show cut lines</span>
                </label>
              </div>

              <div className="space-y-3 pt-3 border-t border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Font & Barcode Sizes</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Zone Size</label>
                    <input
                      type="number"
                      value={printSettings.zoneFontSize}
                      onChange={(e) => setPrintSettings({ ...printSettings, zoneFontSize: parseInt(e.target.value) || 30 })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Rack Code Size</label>
                    <input
                      type="number"
                      value={printSettings.rackCodeFontSize}
                      onChange={(e) => setPrintSettings({ ...printSettings, rackCodeFontSize: parseInt(e.target.value) || 80 })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Detail Size</label>
                    <input
                      type="number"
                      value={printSettings.detailsFontSize}
                      onChange={(e) => setPrintSettings({ ...printSettings, detailsFontSize: parseInt(e.target.value) || 40 })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Barcode HT</label>
                    <input
                      type="number"
                      value={printSettings.barcodeHeight}
                      onChange={(e) => setPrintSettings({ ...printSettings, barcodeHeight: parseInt(e.target.value) || 80 })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Barcode WD</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="5"
                      value={printSettings.barcodeWidth}
                      onChange={(e) => setPrintSettings({ ...printSettings, barcodeWidth: parseInt(e.target.value) || 2 })}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setPrintSettings({
                      paperSize: '4x6',
                      paperWidth: 812,
                      paperHeight: 1218,
                      labelsPerPage: 4,
                      columnsPerRow: 2,
                      firstLabelTopMargin: 0,
                      showCutLines: true,
                      zoneFontSize: 30,
                      rackCodeFontSize: 80,
                      detailsFontSize: 40,
                      barcodeHeight: 80,
                      barcodeWidth: 2,
                      orientation: 'horizontal',
                    })}
                    className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    <i className="ri-restart-line mr-1.5"></i>
                    Reset Defaults
                  </button>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-3 z-10">
                <button
                  onClick={executeBrowserPrint}
                  className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded transition-colors mr-auto"
                >
                  <i className="ri-window-line mr-1.5"></i>
                  Test Print (Browser)
                </button>
                <button
                  onClick={() => setShowPrintSettingsModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executePrintWithSettings}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                >
                  <i className="ri-printer-line mr-1.5"></i>
                  Print Rack Barcodes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <YarnSummaryDrawer
        open={showTransferRequiredDrawer}
        onClose={() => setShowTransferRequiredDrawer(false)}
        variant="shortTerm"
      />
    </div>
  );
};

export default ShortTermStorage;

