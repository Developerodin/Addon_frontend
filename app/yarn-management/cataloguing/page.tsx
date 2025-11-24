"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast, Toaster } from "react-hot-toast";
import yarnCatalogService, { BulkImportYarnCatalogRequest, YarnCatalog } from "@/shared/services/yarnCatalogService";
import * as XLSX from "xlsx";

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

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Yarn Cataloguing.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Yarn Cataloguing" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Yarn Cataloguing</h1>
                <p className="text-gray-600 mt-1">Manage yarn specifications and catalog</p>
              </div>
              <div className="box-tools flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  className="ti-btn ti-btn-secondary"
                  onClick={handleDownloadTemplate}
                >
                  <i className="ri-download-line me-2"></i>
                  Download Template
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-success"
                  onClick={handleImportClick}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <i className="ri-file-excel-2-line me-2"></i>
                      Import
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-info"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <i className="ri-download-2-line me-2"></i>
                      Export
                    </>
                  )}
                </button>
                <Link 
                  href="/yarn-management/cataloguing/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-1"></i>
                  Add Yarn
                </Link>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="box">
            <div className="box-body">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <div className="flex items-center">
                  <label className="mr-2 text-sm text-gray-600">Rows per page:</label>
                  <select
                    className="form-select w-auto text-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="relative w-full max-w-xs">
                  <input
                    type="text"
                    className="form-control py-3 pr-10"
                    placeholder="Search by yarn name..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Yarn Specifications Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Yarn Catalogs ({totalResults})</h3>
            </div>
            <div className="box-body">
              {importProgress !== null && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-200"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 text-right">Importing... {importProgress}%</div>
                </div>
              )}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : yarns.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-book-open-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Yarn Catalogs</h3>
                  <p className="text-gray-500 mb-4">Start by adding your first yarn catalog.</p>
                  <Link 
                    href="/yarn-management/cataloguing/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Add First Yarn
                  </Link>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Yarn Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subtype
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Count Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Blend
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Color
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            GST
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Min Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {yarns.map((yarn) => (
                          <tr key={yarn.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {yarn.yarnName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.yarnType?.name || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.yarnSubtype?.subtype ? String(yarn.yarnSubtype.subtype) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.countSize?.name || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.blend?.name || (yarn.blend as any)?.brandName || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.colorFamily?.name || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.gst ? `${yarn.gst}%` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.minQuantity !== undefined && yarn.minQuantity !== null ? yarn.minQuantity : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`badge ${yarn.status === 'active' ? 'bg-success' : yarn.status === 'inactive' ? 'bg-warning' : 'bg-danger'}`}>
                                {yarn.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <Link
                                  href={`/yarn-management/cataloguing/edit/${yarn.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                  title="Edit"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button
                                  onClick={() => handleDeleteYarn(yarn.id)}
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  title="Delete"
                                  disabled={isDeleting && deleteId === yarn.id}
                                >
                                  {isDeleting && deleteId === yarn.id ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                  ) : (
                                    <i className="ri-delete-bin-line"></i>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
                    </div>
                    <nav aria-label="Page navigation">
                      <ul className="flex flex-wrap items-center">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </button>
                        </li>
                        {getPagination(currentPage, totalPages).map((page, idx) =>
                          page === '...'
                            ? <li key={"ellipsis-" + idx} className="page-item"><span className="px-3">...</span></li>
                            : <li key={page} className="page-item">
                                <button
                                  className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                    currentPage === page 
                                    ? 'bg-primary text-white hover:bg-primary-dark' 
                                    : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                  }`}
                                  onClick={() => setCurrentPage(Number(page))}
                                >
                                  {page}
                                </button>
                              </li>
                        )}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CataloguingPage;
