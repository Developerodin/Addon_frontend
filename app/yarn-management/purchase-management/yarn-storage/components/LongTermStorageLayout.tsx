"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import JsBarcode from "jsbarcode";
import BarcodeScanner from "./BarcodeScanner";
import AllocateBoxDrawer from "./AllocateBoxDrawer";
// import BulkAllocateExcelImport from "./BulkAllocateExcelImport";
import RackDetailsModal from "./RackDetailsModal";
import RackTransferModal from "./RackTransferModal";
import ZoneReportDrawer from "./ZoneReportDrawer";
import { RackLocation, PackedBox } from "../types";
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
  /** Full rack data for selected (so Print Selected works across paginated pages) */
  const [selectedRacksDataForPrint, setSelectedRacksDataForPrint] = useState<Array<{
    id: string;
    rackCode: string;
    barcode: string;
    shelf?: number | string;
    floor?: number;
    zone?: string;
  }>>([]);
  const [rackSlotDetails, setRackSlotDetails] = useState<Map<string, SlotDetailsResponse>>(new Map());
  const [loadingSlotDetails, setLoadingSlotDetails] = useState<Set<string>>(new Set());
  const [isPrinting, setIsPrinting] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceRack, setTransferSourceRack] = useState<RackLocation | null>(null);
  const [transferType, setTransferType] = useState<"LT_TO_LT" | "LT_TO_ST">("LT_TO_LT");
  const [transferBoxId, setTransferBoxId] = useState<string | undefined>(undefined);
  const rackCodeInputRef = useRef<HTMLInputElement>(null);
  /** API document id for the box being allocated (for PATCH). Set when allocate drawer opens, cleared on close. */
  const selectedBoxApiIdRef = useRef<string | null>(null);
  const [alreadyStoredBoxInfo, setAlreadyStoredBoxInfo] = useState<{
    boxId: string;
    storageLocation: string;
  } | null>(null);

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

  // Add Racks drawer (right-side)
  const [showAddRacksDrawer, setShowAddRacksDrawer] = useState(false);
  const [showReportDrawer, setShowReportDrawer] = useState(false);
  const [addRacksForm, setAddRacksForm] = useState({
    storageType: "longterm" as "longterm" | "shortterm",
    sectionCode: "B7-02",
    numberOfRacksToAdd: 12,
  });
  const [isAddingRacks, setIsAddingRacks] = useState(false);

  // Pagination for storage layout (default 52 per page)
  const [storagePage, setStoragePage] = useState(1);
  const [storageLimit, setStorageLimit] = useState(52);
  const [storageTotalPages, setStorageTotalPages] = useState(1);
  const [storageTotalResults, setStorageTotalResults] = useState(0);

  // Search by rack code or barcode: current-page filter + global API lookup by barcode/label
  const [rackSearchQuery, setRackSearchQuery] = useState("");
  const [searchResultRack, setSearchResultRack] = useState<RackLocation | null>(null);
  const [isSearchingByBarcode, setIsSearchingByBarcode] = useState(false);

  // Advanced filters (yarn name / occupancy / section / QC status). Backed by /slots/with-contents.
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<RackFilters>(DEFAULT_RACK_FILTERS);
  const [slotsWithContents, setSlotsWithContents] = useState<
    SlotWithContents[] | null
  >(null);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [contentsError, setContentsError] = useState<string | null>(null);
  /** Client-side pagination over filtered racks (full zone is in memory; UI shows one page at a time). */
  const [filterPage, setFilterPage] = useState(1);
  const [filterLimit, setFilterLimit] = useState(52);

  const activeFilterCount = countActiveFilters(filters);
  const filtersActive = activeFilterCount > 0;

  const PAGE_SIZE_OPTIONS = [52, 100, 200, 500];

  // Global search: fetch slot by barcode/label so we find the rack even if it's on another page
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
        const details = await fetchRackDetailsFromYarnApis(q, "LT", null);
        const slot = details.storageSlot;
        const data = details.type === "boxes" ? (details.data as BoxInSlot[]) : [];
        const rack: RackLocation = {
          id: slot._id,
          rackCode: slot.label,
          row: slot.shelfNumber,
          column: slot.floorNumber,
          shelf: slot.shelfNumber,
          sectionCode: slot.sectionCode,
          barcode: slot.barcode,
          capacity: 1,
          currentBoxes: data.length,
          status: slot.isActive ? "Available" : "Maintenance",
        };
        setSearchResultRack(rack);
        setRackSlotDetails((prev) => new Map(prev).set(slot._id, details));
      } catch {
        setSearchResultRack(null);
      } finally {
        setIsSearchingByBarcode(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [rackSearchQuery]);

  // Fetch storage slots from API with pagination
  const fetchStorageSlots = async (page: number = storagePage, limit: number = storageLimit) => {
    try {
      setIsLoadingSlots(true);
      const response = await storageSlotService.getStorageSlots("LT", page, limit);
      setStorageSlots(response.results || []);
      setStorageTotalPages(response.totalPages ?? 1);
      setStorageTotalResults(response.totalResults ?? response.results?.length ?? 0);
    } catch (error) {
      console.error("Failed to fetch storage slots:", error);
      toast.error("Failed to load storage slots");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchStorageSlots(storagePage, storageLimit);
  }, [storagePage, storageLimit]);

  /**
   * Lazy-fetch the full LT zone (slots + contents) the first time the user activates a filter.
   * Re-fetched when the filter panel is reopened to pick up any new boxes.
   */
  useEffect(() => {
    if (!filtersActive) return;
    if (slotsWithContents !== null) return;
    let cancelled = false;
    setIsLoadingContents(true);
    setContentsError(null);
    storageSlotService
      .getSlotsWithContents({ zone: "LT" })
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

  /**
   * Compute slots that match the active filters. Returns null when filters are inactive
   * so callers can fall back to the paginated grid.
   */
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

      if (filters.occupancy === "empty" && boxes.length > 0) return false;
      if (filters.occupancy === "occupied" && boxes.length === 0) return false;

      if (yarnQ) {
        const hit = boxes.some((b) =>
          (b.yarnName || "").toLowerCase().includes(yarnQ)
        );
        if (!hit) return false;
      }

      if (filters.occupancy !== "empty" && filters.qcStatus !== "all") {
        if (boxes.length === 0) return false;
        if (filters.qcStatus === "approved") {
          if (!boxes.some((b) => b.qcData?.status === "qc_approved")) return false;
        } else if (filters.qcStatus === "pending") {
          if (!boxes.some((b) => b.qcData?.status !== "qc_approved")) return false;
        }
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

  /** Reset to first page when filter criteria change (not when only filterLimit changes). */
  useEffect(() => {
    if (!filtersActive) return;
    setFilterPage(1);
  }, [
    filters.yarnName,
    filters.occupancy,
    filters.sectionCode,
    filters.qcStatus,
  ]);

  const handleClearFilters = () => {
    setFilters(DEFAULT_RACK_FILTERS);
    setFilterPage(1);
  };

  const handleAddRacksSubmit = async () => {
    const num = addRacksForm.numberOfRacksToAdd;
    if (num < 1 || num > 50) {
      toast.error("Number of racks must be between 1 and 50");
      return;
    }
    setIsAddingRacks(true);
    try {
      await storageSlotService.addRacks({
        storageType: addRacksForm.storageType,
        sectionCode: addRacksForm.sectionCode,
        numberOfRacksToAdd: num,
      });
      toast.success("Racks Added Successfully");
      setShowAddRacksDrawer(false);
      fetchStorageSlots(storagePage, storageLimit);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add racks");
    } finally {
      setIsAddingRacks(false);
    }
  };

  const LT_SECTIONS = ["B7-02", "B7-03", "B7-04", "B7-05"];
  const ST_SECTIONS = ["B7-01"];

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

      // Use shelfNumber as row and floorNumber as column; sectionCode for multi-section grid
      return {
        id: slot._id,
        rackCode: slot.label,
        row: slot.shelfNumber,
        column: slot.floorNumber,
        shelf: slot.shelfNumber,
        sectionCode: slot.sectionCode,
        barcode: slot.barcode,
        capacity: 1, // Each slot can hold one box
        currentBoxes: storedBox ? 1 : 0,
        status,
      };
    });

    return mappedRacks;
  }, [storageSlots, boxes, propsRacks]);

  const racksFilteredBySearch = useMemo(() => {
    const q = rackSearchQuery.trim().toLowerCase();
    if (!q || !racks) return [];
    return (racks ?? []).filter(
      (r) =>
        (r.rackCode && r.rackCode.toLowerCase().includes(q)) ||
        (r.barcode && r.barcode.toLowerCase().includes(q))
    );
  }, [racks, rackSearchQuery]);

  // Racks to show when searching: prefer API result (global), else current-page matches
  const displayRacksForSearch = useMemo(() => {
    if (!rackSearchQuery.trim()) return [];
    if (searchResultRack) return [searchResultRack];
    return racksFilteredBySearch;
  }, [rackSearchQuery, searchResultRack, racksFilteredBySearch]);

  // Row index -> (sectionCode, shelfNumber). Only include (section, shelf) that exist on
  // this page so we don't get empty "No Rack" rows (e.g. page 2 has shelves 51-100, not 1-100).
  const rowToSectionShelf = useMemo(() => {
    if (storageSlots.length === 0) return [];
    const seen = new Set<string>();
    const out: { sectionCode: string; shelfNumber: number }[] = [];
    storageSlots.forEach((s) => {
      const section = s.sectionCode ?? "";
      const key = `${section}\t${s.shelfNumber}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ sectionCode: section, shelfNumber: s.shelfNumber });
      }
    });
    out.sort((a, b) => {
      const c = (a.sectionCode ?? "").localeCompare(b.sectionCode ?? "");
      return c !== 0 ? c : a.shelfNumber - b.shelfNumber;
    });
    return out;
  }, [storageSlots]);

  // Grid dimensions: one row per (section, shelf), columns = floors. Use only current page
  // data so we don't create extra empty "No Rack" rows (e.g. from preferences.gridRows).
  const gridDimensions = useMemo(() => {
    if (storageSlots.length > 0 && rowToSectionShelf.length > 0) {
      const maxFloor = Math.max(...storageSlots.map((s) => s.floorNumber), 0);
      return {
        rows: rowToSectionShelf.length,
        columns: maxFloor,
      };
    }
    if (storageSlots.length > 0) {
      const maxShelf = Math.max(...storageSlots.map((s) => s.shelfNumber), 0);
      const maxFloor = Math.max(...storageSlots.map((s) => s.floorNumber), 0);
      return {
        rows: maxShelf,
        columns: maxFloor,
      };
    }
    return {
      rows: preferences.gridRows,
      columns: preferences.gridColumns,
    };
  }, [storageSlots, preferences.gridRows, preferences.gridColumns, rowToSectionShelf]);

  // Organize racks into grid: row = (section, shelf), col = floor (so all 192 slots show).
  // When loading (e.g. page change), keep previous grid to avoid flash of "No storage slots found".
  const rackGrid = useMemo(() => {
    const grid: (RackLocation | null)[][] = [];
    for (let row = 0; row < gridDimensions.rows; row++) {
      grid[row] = [];
      const sectionShelf = rowToSectionShelf[row];
      for (let col = 0; col < gridDimensions.columns; col++) {
        const floor = col + 1;
        const rack = sectionShelf
          ? racks.find(
            (r) =>
              (r.sectionCode ?? "") === (sectionShelf.sectionCode ?? "") &&
              r.row === sectionShelf.shelfNumber &&
              r.column === floor
          )
          : null;
        grid[row][col] = rack ?? null;
      }
    }
    return grid;
  }, [racks, gridDimensions, rowToSectionShelf]);

  // Rack details are fetched only on click (handleRackClick / open modal), not on load, to avoid N API calls per box.

  // Map YarnBox to PackedBox format
  const mapYarnBoxToPackedBox = (box: YarnBox): PackedBox => {
    const qcApproved =
      box.qcData?.status === "qc_approved" ||
      (box.storedStatus === true && !!box.storageLocation); // Fallback: stored boxes without qcData (legacy/missing populate)
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

    // Clear previous already stored box info
    setAlreadyStoredBoxInfo(null);

    setIsLoadingBox(true);
    try {
      console.log("Fetching box by barcode:", trimmedBarcode);
      // Fetch box from API by barcode
      const boxDetails = await yarnBoxService.getYarnBoxByBarcode(trimmedBarcode, {
        includeInactive: true,
      });
      console.log("Box details received:", boxDetails);

      // Map YarnBox to PackedBox
      const mappedBox = mapYarnBoxToPackedBox(boxDetails);

      // Validate box
      if (!mappedBox.qcApproved) {
        toast.error("Box is not QC approved");
        setIsLoadingBox(false);
        return;
      }

      // Check if box is already stored
      if (mappedBox.status === "Stored" && boxDetails.storageLocation) {
        // Box is already stored - show info message and open transfer modal
        const currentStorageLocation = boxDetails.storageLocation;

        // Set already stored box info to display message
        setAlreadyStoredBoxInfo({
          boxId: boxDetails.boxId || trimmedBarcode,
          storageLocation: currentStorageLocation,
        });

        // Find the source rack from the storage location
        const sourceRack = racks.find((r) => r.barcode === currentStorageLocation);

        if (sourceRack) {
          // sourceRack found = box is in our LT racks (barcode matched). Open transfer modal.
          // Note: storageLocation can be "B7-02-S0029-F01" or "LT-..." - we match by rack barcode, not prefix.
          if (currentStorageLocation.startsWith("ST-")) {
            toast.error("Box is in short-term storage. Please use Short-Term Storage tab for transfers.");
          } else {
            setTransferSourceRack(sourceRack);
            setTransferType("LT_TO_LT");
            setTransferBoxId(boxDetails.boxId);
            setShowTransferModal(true);
            toast.success(`Box ${boxDetails.boxId || trimmedBarcode} found. Select destination rack for transfer.`);
          }
        } else {
          // Rack not found but box is stored - still show the info message
          toast(`Box is already stored at ${currentStorageLocation}`);
        }
        setIsLoadingBox(false);
        return;
      }

      // Box is not stored yet - open allocate modal (store API id for PATCH)
      selectedBoxApiIdRef.current = boxDetails._id ?? boxDetails.id ?? null;
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

    if (rack.status === "Maintenance") {
      toast.error(`Rack ${rack.rackCode} is not available (maintenance)`);
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

    // Refocus barcode scanner input after successful storage
    focusBarcodeScanner();
  };

  // Handle allocate confirmation from modal (rackCodeOverride = value from drawer when Enter/Confirm, avoids stale state)
  const handleAllocateConfirm = async (rackCodeOrEvent?: any) => {
    // If called via onClick, rackCodeOrEvent is the MouseEvent. Ignore it and use state.
    // Handle both string override and state-based rack code.
    const effectiveRackCode = (typeof rackCodeOrEvent === "string" ? rackCodeOrEvent : storageRackCode || "").trim();

    if (!selectedBox || !effectiveRackCode) {
      toast.error("Please enter a storage rack code");
      return;
    }

    const rackCodeUpper = effectiveRackCode.toUpperCase();
    setIsAllocating(true);
    try {
      // 1. Try to find rack in current page's racks
      let rack = racks.find(
        (r) =>
          r.barcode?.toUpperCase() === rackCodeUpper ||
          r.rackCode?.toUpperCase() === rackCodeUpper
      );

      // 2. Fallback: Fetch from yarn APIs if not found on current page
      if (!rack) {
        try {
          console.log("[LongTermStorage] Rack not found on current page, fetching from yarn APIs:", rackCodeUpper);
          const details = await fetchRackDetailsFromYarnApis(rackCodeUpper, "LT", null);
          const slot = details.storageSlot;
          const data = details.type === "boxes" ? (details.data as BoxInSlot[]) : [];
          rack = {
            id: slot._id,
            rackCode: slot.label,
            row: slot.shelfNumber,
            column: slot.floorNumber,
            shelf: slot.shelfNumber,
            sectionCode: slot.sectionCode,
            barcode: slot.barcode,
            capacity: 1,
            currentBoxes: data.length,
            status: slot.isActive ? "Available" : "Maintenance",
          };
          setRackSlotDetails((prev) => new Map(prev).set(slot._id, details));
        } catch (apiErr) {
          console.error("[LongTermStorage] Failed to find rack via API:", apiErr);
          toast.error("Rack not found with the provided barcode");
          return;
        }
      }

      if (!rack) {
        toast.error("Rack not found with the provided barcode");
        return;
      }

      if (rack.status === "Maintenance") {
        toast.error(`Rack ${rack.rackCode} is not available (maintenance)`);
        return;
      }

      const boxId = selectedBoxApiIdRef.current ?? selectedBox.id;
      try {
        await yarnBoxService.updateYarnBox(boxId, {
          storageLocation: rackCodeUpper,
          storedStatus: true,
        });
      } catch (apiError) {
        console.warn("Failed to update box via API, updating local state only:", apiError);
      }

      handleStoreBox(selectedBox.id, rack.id);

      try {
        const slot = storageSlots.find((s) => s._id === rack.id);
        const details = await fetchRackDetailsFromYarnApis(
          rack.barcode ?? rack.rackCode,
          "LT",
          slot ?? null
        );
        setRackSlotDetails((prev) => {
          const newMap = new Map(prev);
          newMap.set(rack.id, details);
          return newMap;
        });
        if (onRefresh) onRefresh();
      } catch (error) {
        console.error("Failed to refresh data after storing box:", error);
      }

      toast.success(`Box stored on this rack (${rackCodeUpper})`, { duration: 4000 });
      setShowAllocateModal(false);
      setStorageRackCode("");
      setSelectedBox(null);
      selectedBoxApiIdRef.current = null;
      focusBarcodeScanner();
    } catch (error) {
      console.error("Failed to allocate box:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to allocate box to storage"
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
      selectedBoxApiIdRef.current = null;
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

  // Helper function to refocus barcode scanner input
  const focusBarcodeScanner = () => {
    setTimeout(() => {
      const barcodeInput = document.querySelector('input[placeholder*="Scan"], input[placeholder*="barcode"], input[placeholder*="Barcode"]') as HTMLInputElement;
      if (barcodeInput && !barcodeInput.disabled) {
        barcodeInput.focus();
        barcodeInput.select();
      }
    }, 200);
  };

  const handleRackClick = async (rack: RackLocation) => {
    try {
      setIsLoadingRackDetails(true);
      setIsRackModalOpen(true);

      // Use cached details if available, otherwise fetch from yarn-boxes/yarn-cones APIs
      let details = rackSlotDetails.get(rack.id);
      if (!details) {
        const slot = storageSlots.find((s) => s._id === rack.id);
        details = await fetchRackDetailsFromYarnApis(
          rack.barcode ?? rack.rackCode,
          "LT",
          slot ?? null
        );
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
            const rack = racks.find((r) => r.barcode === rackBarcode);
            const slot = rack ? storageSlots.find((s) => s._id === rack.id) : null;
            const details = await fetchRackDetailsFromYarnApis(
              rackBarcode,
              "LT",
              slot ?? null
            );
            if (rack) {
              setRackSlotDetails((prev) => {
                const newMap = new Map(prev);
                newMap.set(rack.id, details);
                return newMap;
              });

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
        const         refreshPromises = racksWithBarcodes.map(async (rack) => {
          try {
            const slot = storageSlots.find((s) => s._id === rack.id);
            const details = await fetchRackDetailsFromYarnApis(
              rack.barcode ?? rack.rackCode,
              "LT",
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

      // Clear already stored box info and refocus scanner after successful transfer
      setAlreadyStoredBoxInfo(null);
      focusBarcodeScanner();

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

    // Determine sizes in mm
    let paperW = 101.6; // 4"
    let paperH = 152.4; // 6"

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

  // Handle print selected racks barcode (uses selectedRacksDataForPrint so selection works across pages)
  const handlePrintSelectedRacks = () => {
    if (selectedRacksDataForPrint.length === 0) {
      toast.error("Please select at least one rack");
      return;
    }

    setRacksReadyToPrint(selectedRacksDataForPrint.map((r) => ({
      rackCode: r.rackCode,
      barcode: r.barcode,
      shelf: r.shelf,
      floor: r.floor,
      zone: r.zone ?? "LT",
    })));
    setShowPrintBarcodeModal(false);
    setShowPrintSettingsModal(true);
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
      zone: 'LT'
    })));
    setShowPrintBarcodeModal(false);
    setShowPrintSettingsModal(true);
  };

  // Export rack data to Excel (Code of Shelf, Shelf Number, Floor)
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
        `long_term_storage_racks_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      toast.success("Rack data downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to download Excel");
    }
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
        setSelectedRacksDataForPrint([]);
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

  return (
    <div className="space-y-6">
      {/* Scanning Section */}
      <div className="flex justify-end items-center mb-4">
        {/* <h2 className="text-lg font-bold text-gray-800">Long-Term Storage</h2> */}
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
            <>
              <BarcodeScanner
                onScan={handleBoxScan}
                label="Scan Box Barcode"
                placeholder="Scan QC-approved box barcode"
                disabled={isLoadingBox || showAllocateModal}
              />
              {alreadyStoredBoxInfo && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <i className="ri-information-line text-blue-600 text-lg mt-0.5"></i>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Box Already Stored
                      </p>
                      <p className="text-xs text-blue-700">
                        Box <span className="font-semibold">{alreadyStoredBoxInfo.boxId}</span> is already stored at rack location:{" "}
                        <span className="font-semibold font-mono">{alreadyStoredBoxInfo.storageLocation}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAlreadyStoredBoxInfo(null)}
                      className="text-blue-400 hover:text-blue-600 transition-colors"
                      title="Dismiss"
                    >
                      <i className="ri-close-line text-lg"></i>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bulk Allocate via Excel (boxbarcode + rackcode) — hidden for now
      <BulkAllocateExcelImport onComplete={onRefresh} /> */}

      {/* 2D Grid Layout */}
      <div className="box">
        <div className="box-header flex flex-col gap-0 border-b border-gray-100 bg-white px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <label
                htmlFor="lt-storage-rack-search"
                className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Search rack
              </label>
              <div className="flex min-w-0 max-w-xl flex-1 items-center gap-2">
                <input
                  id="lt-storage-rack-search"
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
                title="Filter racks by yarn, empty status, section, QC"
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
                onClick={() => setShowAddRacksDrawer(true)}
                className={storageBtnSecondaryClass}
                title="Add racks to a section"
              >
                <i className="ri-add-line text-sm" aria-hidden />
                Add Racks
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
            sections={LT_SECTIONS}
            isLoading={isLoadingContents}
            filteredCount={filtersActive ? filteredSlots?.length : undefined}
            totalCount={slotsWithContents?.length}
            onChange={setFilters}
            onClear={handleClearFilters}
            onClose={() => setShowFilterPanel(false)}
          />
        </div>
        <div className="box-body relative">
          {/* Pagination sits above the grid so it does not float in the header */}
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
                  <label htmlFor="lt-filter-page-size" className="text-xs font-medium text-gray-600">
                    Per page
                  </label>
                  <select
                    id="lt-filter-page-size"
                    value={filterLimit}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFilterLimit(val);
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
          ) : !filtersActive && !isLoadingSlots && storageTotalResults > 0 ? (
            <div className={storagePaginationBarClass}>
              <span className="text-sm text-gray-700">
                Showing {(storagePage - 1) * storageLimit + 1}–
                {Math.min(storagePage * storageLimit, storageTotalResults)} of{" "}
                {storageTotalResults} slots
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="lt-storage-page-size" className="text-xs font-medium text-gray-600">
                    Per page
                  </label>
                  <select
                    id="lt-storage-page-size"
                    value={storageLimit}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setStorageLimit(val);
                      setStoragePage(1);
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
                    onClick={() => setStoragePage((p) => Math.max(1, p - 1))}
                    disabled={storagePage <= 1}
                    className={`${storageBtnSecondaryClass} px-2 disabled:pointer-events-none disabled:opacity-40`}
                    aria-label="Previous page"
                  >
                    <i className="ri-arrow-left-s-line text-base" aria-hidden />
                  </button>
                  <span className="min-w-[6.5rem] text-center text-sm text-gray-700">
                    {storagePage} / {storageTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setStoragePage((p) => Math.min(storageTotalPages, p + 1))
                    }
                    disabled={storagePage >= storageTotalPages}
                    className={`${storageBtnSecondaryClass} px-2 disabled:pointer-events-none disabled:opacity-40`}
                    aria-label="Next page"
                  >
                    <i className="ri-arrow-right-s-line text-base" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {isLoadingSlots && rackGrid.length === 0 ? (
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
          ) : filtersActive ? (
            <FilteredRackGrid
              isLoading={isLoadingContents && !slotsWithContents}
              error={contentsError}
              slots={paginatedFilteredSlots}
              yarnQuery={filters.yarnName}
              onSlotClick={(slot) => {
                const rack: RackLocation = {
                  id: slot._id,
                  rackCode: slot.label,
                  row: slot.shelfNumber,
                  column: slot.floorNumber,
                  shelf: slot.shelfNumber,
                  sectionCode: slot.sectionCode,
                  barcode: slot.barcode,
                  capacity: 1,
                  currentBoxes: slot.boxCount || (slot.boxes?.length ?? 0),
                  status: (slot.boxCount || 0) > 0 ? "Occupied" : "Available",
                };
                // Prefill cache so modal opens instantly without refetch
                setRackSlotDetails((prev) => {
                  if (prev.has(slot._id)) return prev;
                  const next = new Map(prev);
                  next.set(slot._id, {
                    storageSlot: {
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
                    },
                    zoneType: slot.zoneType || "Long-Term Storage",
                    type: "boxes",
                    count: slot.boxes?.length ?? 0,
                    data: slot.boxes ?? [],
                  });
                  return next;
                });
                handleRackClick(rack);
              }}
            />
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
                  style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  }}
                >
                  {displayRacksForSearch.map((rack) => (
                    <div
                      key={rack.id}
                      className={`
                      relative border-2 rounded-xl p-2 min-h-[72px] transition-all cursor-pointer
                      ${getRackStatusColor(rack)}
                      hover:shadow-lg hover:scale-[1.02] flex flex-col
                    `}
                      onClick={() => handleRackClick(rack)}
                    >
                      <div className="flex items-center justify-center flex-1 min-h-[56px] text-xs font-bold text-gray-800 text-center" title={rack.barcode || rack.rackCode}>
                        {rack.rackCode}
                      </div>
                    </div>
                  ))}
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
                          <div className="flex items-center justify-center flex-1 min-h-[56px] text-xs font-bold text-gray-800 text-center" title={rack.barcode || rack.rackCode}>
                            {rack.rackCode}
                          </div>
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
              {isLoadingSlots && rackGrid.length > 0 && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex items-center justify-center z-10 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent" />
                    <p className="text-sm font-medium text-gray-600">Loading page...</p>
                  </div>
                </div>
              )}
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
          setAlreadyStoredBoxInfo(null); // Clear already stored box info when modal closes
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
            setSelectedRacksDataForPrint([]);
          }
        }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="box-header border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <h3 className="box-title text-lg font-semibold">
                Print Rack Barcode
              </h3>
            </div>
            <div className="box-body px-6 py-4 overflow-y-auto flex-1">
              <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
                <label className="form-label text-sm font-medium text-gray-700">
                  Select Racks <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 items-center flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const withBarcode = racks.filter((r) => r.barcode);
                      setSelectedRacksForPrint((prev) => {
                        const set = new Set(prev);
                        withBarcode.forEach((r) => set.add(r.id));
                        return Array.from(set);
                      });
                      setSelectedRacksDataForPrint((prev) => {
                        const ids = new Set(prev.map((x) => x.id));
                        const add = withBarcode.filter((r) => !ids.has(r.id)).map((r) => ({
                          id: r.id,
                          rackCode: r.rackCode,
                          barcode: r.barcode!,
                          shelf: r.shelf,
                          floor: r.column,
                          zone: "LT",
                        }));
                        return [...prev, ...add];
                      });
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Select All (this page)
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRacksForPrint([]);
                      setSelectedRacksDataForPrint([]);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              {/* Pagination in modal */}
              {!isLoadingSlots && storageTotalResults > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-3 py-2 border border-gray-200 rounded-lg px-3 bg-gray-50">
                  <span className="text-xs text-gray-600">
                    Racks {(storagePage - 1) * storageLimit + 1}–{Math.min(storagePage * storageLimit, storageTotalResults)} of {storageTotalResults}
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Per page:</label>
                    <select
                      value={storageLimit}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setStorageLimit(val);
                        setStoragePage(1);
                      }}
                      className="text-xs border border-gray-300 rounded pl-2 pr-8 py-1 bg-white appearance-none bg-[length:10px_10px] bg-[right_0.35rem_center] bg-no-repeat"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")" }}
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setStoragePage((p) => Math.max(1, p - 1))}
                      disabled={storagePage <= 1}
                      className="ti-btn ti-btn-light text-xs px-2 py-1 disabled:opacity-50"
                    >
                      <i className="ri-arrow-left-s-line"></i>
                    </button>
                    <span className="text-xs text-gray-600 px-2">
                      Page {storagePage} of {storageTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStoragePage((p) => Math.min(storageTotalPages, p + 1))}
                      disabled={storagePage >= storageTotalPages}
                      className="ti-btn ti-btn-light text-xs px-2 py-1 disabled:opacity-50"
                    >
                      <i className="ri-arrow-right-s-line"></i>
                    </button>
                  </div>
                </div>
              )}
              <div className="border border-gray-200 rounded-lg p-4 max-h-[400px] overflow-y-auto bg-gray-50">
                {isLoadingSlots ? (
                  <div className="flex justify-center py-8 text-gray-500 text-sm">Loading racks...</div>
                ) : (
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
                                setSelectedRacksDataForPrint((prev) => [...prev, {
                                  id: rack.id,
                                  rackCode: rack.rackCode,
                                  barcode: rack.barcode!,
                                  shelf: rack.shelf,
                                  floor: rack.column,
                                  zone: "LT",
                                }]);
                              } else {
                                setSelectedRacksForPrint(selectedRacksForPrint.filter((id) => id !== rack.id));
                                setSelectedRacksDataForPrint((prev) => prev.filter((r) => r.id !== rack.id));
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
                )}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Selected: {selectedRacksDataForPrint.length} rack(s) total
                {racks.filter((r) => r.barcode).length > 0 && (
                  <span className="text-gray-500 ml-1">({racks.filter((r) => r.barcode).length} on this page)</span>
                )}
              </div>
            </div>
            <div className="box-footer border-t border-gray-200 px-6 py-4 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setShowPrintBarcodeModal(false);
                  setSelectedRacksForPrint([]);
                  setSelectedRacksDataForPrint([]);
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
                  setSelectedRacksDataForPrint([]);
                }}
                className="ti-btn ti-btn-primary"
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <i className="ri-loader-4-line animate-spin me-1"></i>
                ) : (
                  <i className="ri-printer-line me-1"></i>
                )}
                Print All (this page)
              </button>
              <button
                onClick={async () => {
                  await handlePrintSelectedRacks();
                  setShowPrintBarcodeModal(false);
                  setSelectedRacksForPrint([]);
                  setSelectedRacksDataForPrint([]);
                }}
                className="ti-btn ti-btn-primary"
                disabled={selectedRacksDataForPrint.length === 0 || isPrinting}
              >
                {isPrinting ? (
                  <i className="ri-loader-4-line animate-spin me-1"></i>
                ) : (
                  <i className="ri-printer-line me-1"></i>
                )}
                Print Selected ({selectedRacksDataForPrint.length})
              </button>
            </div>
          </div>
        </div>
      )}

      <AllocateBoxDrawer
        isOpen={showAllocateModal}
        onClose={handleModalClose}
        rackCode={storageRackCode}
        onRackCodeChange={(v) => setStorageRackCode(v)}
        onConfirm={handleAllocateConfirm}
        isAllocating={isAllocating}
        inputRef={rackCodeInputRef}
        uppercaseInput
      />

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
                          <span className="ml-1.5 text-xs text-gray-700">{size === '4x6' ? '4" × 6"' : size === '6x4' ? '6" × 4"' : size}</span>
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
      )}

      {/* Report drawer (right-side) */}
      <ZoneReportDrawer
        isOpen={showReportDrawer}
        onClose={() => setShowReportDrawer(false)}
        zoneType="LT"
        zoneLabel="Long-Term Storage"
      />

      {/* Add Racks drawer (right-side) */}
      {showAddRacksDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddRacksDrawer(false)}
            aria-hidden
          />
          <div
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right overflow-hidden"
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-gray-800">Add Racks</h3>
              <button
                type="button"
                onClick={() => setShowAddRacksDrawer(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage type</label>
                <select
                  value={addRacksForm.storageType}
                  onChange={(e) => {
                    const v = e.target.value as "longterm" | "shortterm";
                    setAddRacksForm((prev) => ({
                      ...prev,
                      storageType: v,
                      sectionCode: v === "shortterm" ? "B7-01" : "B7-02",
                    }));
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="longterm">Long-term (LT)</option>
                  <option value="shortterm">Short-term (ST)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  value={addRacksForm.sectionCode}
                  onChange={(e) => setAddRacksForm((prev) => ({ ...prev, sectionCode: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                >
                  {(addRacksForm.storageType === "shortterm" ? ST_SECTIONS : LT_SECTIONS).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of racks to add (1–50)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={addRacksForm.numberOfRacksToAdd}
                  onChange={(e) => setAddRacksForm((prev) => ({
                    ...prev,
                    numberOfRacksToAdd: Math.min(50, Math.max(1, Number(e.target.value) || 1)),
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 shrink-0">
              <button
                type="button"
                onClick={handleAddRacksSubmit}
                disabled={isAddingRacks}
                className="w-full ti-btn ti-btn-primary py-2 flex items-center justify-center gap-2"
              >
                {isAddingRacks ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Adding…
                  </>
                ) : (
                  <>
                    <i className="ri-add-line" />
                    Add
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LongTermStorageLayout;

