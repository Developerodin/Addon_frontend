"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast, Toaster } from "react-hot-toast";
import yarnCatalogService, { BulkImportYarnCatalogRequest, YarnCatalog } from "@/shared/services/yarnCatalogService";
import supplierService from "@/shared/services/supplierService";
import * as XLSX from "xlsx";

/**
 * Parses optional yarn-catalog boolean columns from Excel (true/false, 0/1, yes/no).
 * Empty cells omit the field so bulk updates do not overwrite existing flags.
 * @param raw - Cell value from the worksheet.
 * @returns Either a definite boolean, omit (`undefined`), or a validation error message.
 */
function parseCatalogBooleanCell(
  raw: unknown
): { ok: true; value?: boolean } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true };
  if (typeof raw === "boolean") return { ok: true, value: raw };
  if (typeof raw === "number") {
    if (raw === 1) return { ok: true, value: true };
    if (raw === 0) return { ok: true, value: false };
    if (Number.isNaN(raw)) return { ok: true };
    return { ok: false, message: "must be true or false (or 0 or 1)" };
  }
  const s = `${raw}`.trim();
  if (s === "") return { ok: true };
  const lower = s.toLowerCase();
  if (lower === "true" || lower === "yes" || lower === "1" || lower === "y") {
    return { ok: true, value: true };
  }
  if (lower === "false" || lower === "no" || lower === "0" || lower === "n") {
    return { ok: true, value: false };
  }
  return { ok: false, message: "must be true or false" };
}

const CataloguingPage = () => {
  const { hasSubPermission } = useNavigation();
  const [yarns, setYarns] = useState<YarnCatalog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPermission = hasSubPermission('/yarn-management', 'Cataloguing');

  useEffect(() => {
    if (hasPermission) {
      const timeoutId = setTimeout(() => {
        fetchYarnCatalogs();
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [currentPage, itemsPerPage, searchTerm, hasPermission]);

  const fetchYarnCatalogs = async () => {
    setIsLoading(true);
    try {
      const response = await yarnCatalogService.getYarnCatalogs({
        page: currentPage,
        limit: itemsPerPage,
        yarnName: searchTerm.trim() || undefined,
      });
      setYarns(response.results || []);
      setTotalPages(response.totalPages || 1);
      setTotalResults(response.totalResults || 0);
    } catch (error) {
      console.error('Error fetching yarn catalogs:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch yarn catalogs');
      setYarns([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteYarn = async (yarnId: string) => {
    if (!window.confirm('Are you sure you want to delete this yarn catalog?')) return;
    
    setIsDeleting(true);
    setDeleteId(yarnId);
    try {
      await yarnCatalogService.deleteYarnCatalog(yarnId);
      toast.success('Yarn catalog deleted successfully');
      await fetchYarnCatalogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete yarn catalog');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  function getPagination(currentPage: number, totalPages: number) {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push('...');
      for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  const handleDownloadTemplate = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const sheetData = [
        {
          ID: "",
          "Yarn Type ID": "65f1a2b3c4d5e6f7g8h9i0a1",
          "Yarn Subtype ID": "65f1a2b3c4d5e6f7g8h9i0b2",
          "Count Size ID": "65f1a2b3c4d5e6f7g8h9i0c3",
          "Blend ID": "65f1a2b3c4d5e6f7g8h9i0d4",
          "Color Family ID": "65f1a2b3c4d5e6f7g8h9i0e5",
          "Pantone Shade": "PMS 186 C",
          "Pantone Name": "Bright Red",
          Season: "SS24",
          GST: 12,
          Remark: "Sample remark",
          "HSN Code": "5509",
          "Min Quantity": 100,
          Linking: true,
          Sampling: false,
          Status: "active",
        },
        {
          ID: "",
          "Yarn Type ID": "65f1a2b3c4d5e6f7g8h9i0f6",
          "Yarn Subtype ID": "",
          "Count Size ID": "65f1a2b3c4d5e6f7g8h9i0g7",
          "Blend ID": "65f1a2b3c4d5e6f7g8h9i0h8",
          "Color Family ID": "",
          "Pantone Shade": "",
          "Pantone Name": "",
          Season: "",
          GST: 5,
          Remark: "",
          "HSN Code": "",
          "Min Quantity": "",
          Linking: false,
          Sampling: false,
          Status: "inactive",
        },
      ];
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      worksheet["!cols"] = [
        { wch: 20 },
        { wch: 26 },
        { wch: 28 },
        { wch: 26 },
        { wch: 24 },
        { wch: 28 },
        { wch: 18 },
        { wch: 22 },
        { wch: 14 },
        { wch: 10 },
        { wch: 24 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, "YarnCatalogs");
      XLSX.writeFile(workbook, "yarn-catalog-template.xlsx");
      toast.success("Template downloaded successfully");
    } catch (error) {
      console.error("Error downloading yarn catalog template:", error);
      toast.error("Failed to download template");
    }
  };

  const handleImportClick = () => {
    if (isImporting) return;
    fileInputRef.current?.click();
  };

  type CatalogImportRow = {
    ID?: string;
    "Yarn Name"?: string;
    "Yarn Type ID"?: string;
    "Yarn Subtype ID"?: string;
    "Count Size ID"?: string;
    "Blend ID"?: string;
    "Color Family ID"?: string;
    "Pantone Shade"?: string;
    "Pantone Name"?: string;
    Season?: string;
    GST?: string | number;
    Remark?: string;
    "HSN Code"?: string;
    "Min Quantity"?: string | number;
    Linking?: string | number | boolean;
    Sampling?: string | number | boolean;
    Status?: string;
    "Batch Size"?: string | number;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);

    const reader = new FileReader();

    reader.onload = async (loadEvent) => {
      try {
        const data = loadEvent.target?.result;
        if (!data) {
          throw new Error("Unable to read file");
        }

        const workbook = XLSX.read(data, { type: "binary" });
        if (workbook.SheetNames.length === 0) {
          throw new Error("Import file is empty");
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<CatalogImportRow>(worksheet, { defval: "" });

        console.log("[IMPORT DEBUG] File parsed successfully");
        console.log("[IMPORT DEBUG] Sheet name:", sheetName);
        console.log("[IMPORT DEBUG] Total rows parsed:", rows.length);
        if (rows.length > 0) {
          console.log("[IMPORT DEBUG] First row sample:", rows[0]);
          console.log("[IMPORT DEBUG] Available columns:", Object.keys(rows[0] || {}));
        }

        if (rows.length === 0) {
          throw new Error("Import file is empty");
        }

        const errors: string[] = [];
        const catalogs: BulkImportYarnCatalogRequest["yarnCatalogs"] = [];
        let resolvedBatchSize: number | undefined;
        let emptyRowCount = 0;
        let skippedRowCount = 0;
        let processedRowCount = 0;

        const isRowEmpty = (row: CatalogImportRow) =>
          Object.values(row).every((value) => `${value ?? ""}`.trim().length === 0);

        rows.forEach((row, index) => {
          const rowNumber = index + 2;
          console.log(`[IMPORT DEBUG] Processing row ${rowNumber}:`, row);
          
          if (isRowEmpty(row)) {
            console.log(`[IMPORT DEBUG] Row ${rowNumber} is empty, skipping`);
            emptyRowCount++;
            return;
          }

          let rowHasError = false;
          const registerError = (message: string) => {
            rowHasError = true;
            errors.push(message);
          };
          const updateRowProgress = () => {
            if (rows.length > 0) {
              setImportProgress(Math.min(80, Math.round(((index + 1) / rows.length) * 75)));
            }
          };

          const rawBatchSize = row["Batch Size"];
          if (rawBatchSize !== undefined && rawBatchSize !== null && `${rawBatchSize}`.trim() !== "") {
            const parsedBatch = Number(`${rawBatchSize}`.trim());
            if (Number.isNaN(parsedBatch) || parsedBatch < 1 || parsedBatch > 100) {
              registerError(`Row ${rowNumber}: Batch Size must be a number between 1 and 100`);
            } else if (resolvedBatchSize === undefined) {
              resolvedBatchSize = parsedBatch;
            } else if (resolvedBatchSize !== parsedBatch) {
              registerError(`Row ${rowNumber}: Batch Size must match previously defined value (${resolvedBatchSize})`);
            }
          }

          const id = row.ID?.toString().trim();
          const yarnName = row["Yarn Name"]?.toString().trim();
          const yarnTypeId = row["Yarn Type ID"]?.toString().trim();
          const yarnSubtypeId = row["Yarn Subtype ID"]?.toString().trim();
          const countSizeId = row["Count Size ID"]?.toString().trim();
          const blendId = row["Blend ID"]?.toString().trim();
          const colorFamilyId = row["Color Family ID"]?.toString().trim();
          const pantoneShade = row["Pantone Shade"]?.toString().trim();
          const pantoneName = row["Pantone Name"]?.toString().trim();
          const season = row.Season?.toString().trim();
          const remark = row.Remark?.toString().trim();
          const hsnCode = row["HSN Code"]?.toString().trim();
          const minQuantityRaw = row["Min Quantity"];
          const statusRaw = row.Status?.toString().trim().toLowerCase();

          console.log(`[IMPORT DEBUG] Row ${rowNumber} parsed values:`, {
            id,
            yarnName,
            yarnTypeId,
            yarnSubtypeId,
            countSizeId,
            blendId,
            colorFamilyId,
            pantoneShade,
            pantoneName,
            season,
            remark,
            hsnCode,
            minQuantityRaw,
            statusRaw,
            linking: row.Linking,
            sampling: row.Sampling,
          });

          if (!yarnTypeId) {
            console.log(`[IMPORT DEBUG] Row ${rowNumber}: Missing Yarn Type ID`);
            registerError(`Row ${rowNumber}: Yarn Type ID is required`);
          }
          if (!countSizeId) {
            console.log(`[IMPORT DEBUG] Row ${rowNumber}: Missing Count Size ID`);
            registerError(`Row ${rowNumber}: Count Size ID is required`);
          }
          if (!blendId) {
            console.log(`[IMPORT DEBUG] Row ${rowNumber}: Missing Blend ID`);
            registerError(`Row ${rowNumber}: Blend ID is required`);
          }
          // Note: Yarn Name is optional - backend will auto-generate it if not provided

          let gstValue: number | undefined;
          const gstRaw = row.GST;
          if (gstRaw !== undefined && gstRaw !== null && `${gstRaw}`.trim() !== "") {
            const parsedGst = Number(`${gstRaw}`.trim());
            if (Number.isNaN(parsedGst) || parsedGst < 0 || parsedGst > 100) {
              registerError(`Row ${rowNumber}: GST must be a number between 0 and 100`);
            } else {
              gstValue = parsedGst;
            }
          }

          let minQuantityValue: number | undefined;
          if (minQuantityRaw !== undefined && minQuantityRaw !== null && `${minQuantityRaw}`.trim() !== "") {
            const parsedMinQuantity = Number(`${minQuantityRaw}`.trim());
            if (Number.isNaN(parsedMinQuantity) || parsedMinQuantity < 0) {
              registerError(`Row ${rowNumber}: Min Quantity must be a number greater than or equal to 0`);
            } else {
              minQuantityValue = parsedMinQuantity;
            }
          }

          let linkingValue: boolean | undefined;
          const linkingParsed = parseCatalogBooleanCell(row.Linking);
          if (!linkingParsed.ok) {
            registerError(`Row ${rowNumber}: Linking ${linkingParsed.message}`);
          } else if (linkingParsed.value !== undefined) {
            linkingValue = linkingParsed.value;
          }

          let samplingValue: boolean | undefined;
          const samplingParsed = parseCatalogBooleanCell(row.Sampling);
          if (!samplingParsed.ok) {
            registerError(`Row ${rowNumber}: Sampling ${samplingParsed.message}`);
          } else if (samplingParsed.value !== undefined) {
            samplingValue = samplingParsed.value;
          }

          if (rowHasError) {
            console.log(`[IMPORT DEBUG] Row ${rowNumber} has validation errors, skipping`);
            skippedRowCount++;
            updateRowProgress();
            return;
          }

          const status: "active" | "inactive" | "suspended" =
            statusRaw === "inactive" ? "inactive" : statusRaw === "suspended" ? "suspended" : "active";

          const catalogEntry: BulkImportYarnCatalogRequest["yarnCatalogs"][number] = {
            yarnType: yarnTypeId!,
            countSize: countSizeId!,
            blend: blendId!,
            status,
            ...(id ? { id } : {}),
            ...(yarnName ? { yarnName } : {}),
            ...(yarnSubtypeId ? { yarnSubtype: yarnSubtypeId } : {}),
            ...(colorFamilyId ? { colorFamily: colorFamilyId } : {}),
            ...(pantoneShade ? { pantonShade: pantoneShade } : {}),
            ...(pantoneName ? { pantonName: pantoneName } : {}),
            ...(season ? { season } : {}),
            ...(gstValue !== undefined ? { gst: gstValue } : {}),
            ...(remark ? { remark } : {}),
            ...(hsnCode ? { hsnCode } : {}),
            ...(minQuantityValue !== undefined ? { minQuantity: minQuantityValue } : {}),
            ...(linkingValue !== undefined ? { linking: linkingValue } : {}),
            ...(samplingValue !== undefined ? { sampling: samplingValue } : {}),
          };

          console.log(`[IMPORT DEBUG] Row ${rowNumber} validation passed, adding to catalogs:`, catalogEntry);
          catalogs.push(catalogEntry);
          processedRowCount++;
          updateRowProgress();
        });

        console.log("[IMPORT DEBUG] Row processing summary:", {
          totalRows: rows.length,
          emptyRows: emptyRowCount,
          skippedRows: skippedRowCount,
          processedRows: processedRowCount,
          catalogsCreated: catalogs.length,
          totalErrors: errors.length,
        });

        if (errors.length > 0) {
          console.log("[IMPORT DEBUG] All validation errors:", errors);
        }

        if (catalogs.length === 0) {
          console.error("[IMPORT DEBUG] No valid catalogs created. Details:", {
            totalRows: rows.length,
            emptyRows: emptyRowCount,
            skippedRows: skippedRowCount,
            errors: errors.slice(0, 10), // First 10 errors
          });
          throw new Error("No valid yarn catalog rows found in the import file");
        }

        if (catalogs.length > 1000) {
          throw new Error("A maximum of 1000 yarn catalogs can be imported at once");
        }

        if (errors.length > 0) {
          throw new Error(errors.join(" | "));
        }

        const payload: BulkImportYarnCatalogRequest = {
          yarnCatalogs: catalogs,
          ...(resolvedBatchSize ? { batchSize: resolvedBatchSize } : {}),
        };

        setImportProgress(90);
        await yarnCatalogService.bulkImportYarnCatalogs(payload);

        setImportProgress(100);
        await fetchYarnCatalogs();
        toast.success("Yarn catalogs imported successfully");
      } catch (error) {
        console.error("[IMPORT DEBUG] Error processing yarn catalog import file:", error);
        if (error instanceof Error) {
          console.error("[IMPORT DEBUG] Error message:", error.message);
          console.error("[IMPORT DEBUG] Error stack:", error.stack);
        }
        toast.error(error instanceof Error ? error.message : "Failed to process import file");
      } finally {
        setImportProgress(null);
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read import file");
      setImportProgress(null);
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await yarnCatalogService.getYarnCatalogs({
        page: 1,
        limit: 10000,
        yarnName: searchTerm.trim() || undefined,
      });
      const exportSource = response.results || [];

      if (exportSource.length === 0) {
        toast.error("No yarn catalogs available for export");
        return;
      }

      const sheetData = exportSource.map((catalog) => ({
        ID: catalog.id,
        "Yarn Name": catalog.yarnName || "",
        "Yarn Type ID": catalog.yarnType?.id || "",
        "Yarn Type Name": catalog.yarnType?.name || "",
        "Yarn Subtype ID": catalog.yarnSubtype?.id || "",
        "Yarn Subtype Name":
          (catalog.yarnSubtype && ("subtype" in catalog.yarnSubtype ? (catalog.yarnSubtype as { subtype?: string }).subtype : catalog.yarnSubtype?.name)) ||
          "",
        "Count Size ID": catalog.countSize?.id || "",
        "Count Size Name": catalog.countSize?.name || "",
        "Blend ID": catalog.blend?.id || "",
        "Blend Name": catalog.blend?.name || (catalog.blend as { brandName?: string })?.brandName || "",
        "Color Family ID": catalog.colorFamily?.id || "",
        "Color Family Name": catalog.colorFamily?.name || "",
        "Pantone Shade": catalog.pantonShade || "",
        "Pantone Name": catalog.pantonName || "",
        Season: catalog.season || "",
        GST: catalog.gst ?? "",
        Remark: catalog.remark || "",
        "HSN Code": catalog.hsnCode || "",
        "Min Quantity": catalog.minQuantity ?? "",
        Linking: catalog.linking === true,
        Sampling: catalog.sampling === true,
        Status: catalog.status || "",
        "Created At": catalog.createdAt ? new Date(catalog.createdAt).toLocaleString() : "",
        "Updated At": catalog.updatedAt ? new Date(catalog.updatedAt).toLocaleString() : "",
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      worksheet["!cols"] = [
        { wch: 20 },
        { wch: 30 },
        { wch: 26 },
        { wch: 28 },
        { wch: 26 },
        { wch: 28 },
        { wch: 26 },
        { wch: 24 },
        { wch: 28 },
        { wch: 24 },
        { wch: 28 },
        { wch: 18 },
        { wch: 22 },
        { wch: 14 },
        { wch: 10 },
        { wch: 24 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 10 },
        { wch: 24 },
        { wch: 24 },
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, "YarnCatalogs");
      XLSX.writeFile(workbook, "yarn-catalogs.xlsx");
      toast.success("Yarn catalogs exported successfully");
    } catch (error) {
      console.error("Error exporting yarn catalogs:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export yarn catalogs");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    try {
      setIsExportingAll(true);
      const response = await yarnCatalogService.getYarnCatalogs({
        page: 1,
        limit: 10000,
      });
      const exportSource = response.results || [];

      if (exportSource.length === 0) {
        toast.error("No yarn catalogs available for export");
        return;
      }

      const sheetData = exportSource.map((catalog) => ({
        ID: catalog.id,
        "Yarn Name": catalog.yarnName || "",
        "Yarn Type ID": catalog.yarnType?.id || "",
        "Yarn Type Name": catalog.yarnType?.name || "",
        "Yarn Subtype ID": catalog.yarnSubtype?.id || "",
        "Yarn Subtype Name":
          (catalog.yarnSubtype && ("subtype" in catalog.yarnSubtype ? (catalog.yarnSubtype as { subtype?: string }).subtype : catalog.yarnSubtype?.name)) ||
          "",
        "Count Size ID": catalog.countSize?.id || "",
        "Count Size Name": catalog.countSize?.name || "",
        "Blend ID": catalog.blend?.id || "",
        "Blend Name": catalog.blend?.name || (catalog.blend as { brandName?: string })?.brandName || "",
        "Color Family ID": catalog.colorFamily?.id || "",
        "Color Family Name": catalog.colorFamily?.name || "",
        "Pantone Shade": catalog.pantonShade || "",
        "Pantone Name": catalog.pantonName || "",
        Season: catalog.season || "",
        GST: catalog.gst ?? "",
        Remark: catalog.remark || "",
        "HSN Code": catalog.hsnCode || "",
        "Min Quantity": catalog.minQuantity ?? "",
        Linking: catalog.linking === true,
        Sampling: catalog.sampling === true,
        Status: catalog.status || "",
        "Created At": catalog.createdAt ? new Date(catalog.createdAt).toLocaleString() : "",
        "Updated At": catalog.updatedAt ? new Date(catalog.updatedAt).toLocaleString() : "",
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      worksheet["!cols"] = [
        { wch: 20 },
        { wch: 30 },
        { wch: 26 },
        { wch: 28 },
        { wch: 26 },
        { wch: 28 },
        { wch: 26 },
        { wch: 24 },
        { wch: 28 },
        { wch: 24 },
        { wch: 28 },
        { wch: 18 },
        { wch: 22 },
        { wch: 14 },
        { wch: 10 },
        { wch: 24 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 10 },
        { wch: 24 },
        { wch: 24 },
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, "YarnCatalogs");
      XLSX.writeFile(workbook, "all-yarn-catalogs.xlsx");
      toast.success("All yarn catalogs exported successfully");
    } catch (error) {
      console.error("Error exporting all yarn catalogs:", error);
      toast.error(error instanceof Error ? error.message : "Failed to export all yarn catalogs");
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleSyncCatalogWithSupplier = async () => {
    setIsSyncing(true);
    try {
      await supplierService.syncYarnCatalog();
      toast.success("Yarn catalog synced with supplier successfully");
      await fetchYarnCatalogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync catalog with supplier");
    } finally {
      setIsSyncing(false);
    }
  };

  if (!hasPermission) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 rounded p-6 text-center">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-4xl"></i>
          </div>
          <h3 className="text-sm font-bold text-gray-800 mb-2">Access Restricted</h3>
          <p className="text-[12px] text-gray-500 mb-4">You don&apos;t have permission to access Yarn Cataloguing.</p>
          <Link href="/yarn-management" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
            <i className="ri-arrow-left-line text-xs"></i> Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title="Yarn Cataloguing" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Yarn Cataloguing</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 transition-all font-medium"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              </div>
              <div className="relative group">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
                >
                  <option value={10}>Show 10</option>
                  <option value={50}>Show 50</option>
                  <option value={100}>Show 100</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
              <button type="button" onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm">
                <i className="ri-file-download-line text-xs"></i> Template
              </button>
              <button type="button" onClick={handleImportClick} disabled={isImporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm">
                {isImporting ? <i className="ri-loader-4-line text-xs animate-spin"></i> : <i className="ri-upload-2-line text-xs"></i>} Import
              </button>
              {importProgress !== null && (
                <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden flex items-center">
                  <div className="bg-primary h-full transition-all duration-200" style={{ width: `${importProgress}%` }}></div>
                  <span className="ml-1.5 text-[10px] text-gray-600 font-medium">{importProgress}%</span>
                </div>
              )}
              <button type="button" onClick={handleExport} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                {isExporting ? <i className="ri-loader-4-line text-xs animate-spin"></i> : <i className="ri-download-2-line text-xs"></i>} Export
              </button>
              {/* <button type="button" onClick={handleExportAll} disabled={isExportingAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded hover:bg-indigo-700 transition-colors shadow-sm">
                {isExportingAll ? <i className="ri-loader-4-line text-xs animate-spin"></i> : <i className="ri-download-cloud-2-line text-xs"></i>} Export All
              </button> */}
              <button type="button" onClick={handleSyncCatalogWithSupplier} disabled={isSyncing} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white text-[11px] font-bold rounded hover:bg-sky-700 transition-colors shadow-sm" title="Sync catalog with supplier">
                {isSyncing ? <i className="ri-loader-4-line text-xs animate-spin"></i> : <i className="ri-refresh-line text-xs"></i>} Sync catalog with supplier
              </button>
              <Link href="/yarn-management/cataloguing/add" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-add-line text-xs"></i> Add Yarn
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
            </div>
          ) : yarns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-book-open-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              <Link href="/yarn-management/cataloguing/add" className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-add-line text-xs"></i> Add First Yarn
              </Link>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Yarn Name</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Type</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Subtype</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Count Size</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Blend</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Color Family</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Pantone Name</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Season</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">GST</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Min Qty</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {yarns.map((yarn) => (
                  <tr key={yarn.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{yarn.yarnName}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{yarn.yarnType?.name || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{yarn.yarnSubtype?.subtype ? String(yarn.yarnSubtype.subtype) : '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{yarn.countSize?.name || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{yarn.blend?.name || (yarn.blend as { brandName?: string })?.brandName || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{yarn.colorFamily?.name || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{yarn.pantonName || '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{yarn.season?.trim() ? yarn.season : '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{yarn.gst != null ? `${yarn.gst}%` : '—'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{yarn.minQuantity != null ? yarn.minQuantity : '—'}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${yarn.status === 'active' ? 'bg-green-100 text-green-800' : yarn.status === 'inactive' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                        {yarn.status}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Link href={`/yarn-management/cataloguing/edit/${yarn.id}`} className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors" title="Edit">
                          <i className="ri-pencil-line text-xs"></i>
                        </Link>
                        {/* <button onClick={() => handleDeleteYarn(yarn.id)} className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors" title="Delete" disabled={isDeleting && deleteId === yarn.id}>
                          {isDeleting && deleteId === yarn.id ? <i className="ri-loader-4-line text-xs animate-spin"></i> : <i className="ri-delete-bin-line text-xs"></i>}
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && (
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
            <div className="text-[11px] font-medium text-[#495057] tracking-tight">
              Showing <span>{totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)}</span> of <span>{totalResults}</span> entries <span className="ml-1 opacity-50">→</span>
            </div>
            <div className="flex items-center">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Prev</button>
              <div className="flex items-center gap-1 mx-2">
                {getPagination(currentPage, totalPages).map((page, idx) =>
                  page === '...' ? <span key={`ellipsis-${idx}`} className="text-gray-300 text-[10px]">...</span> : (
                    <button key={page} onClick={() => setCurrentPage(Number(page))} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${currentPage === page ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>{page}</button>
                  )
                )}
              </div>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CataloguingPage;
