"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Seo from "@/shared/layout-components/seo/seo";
import QRCode from "qrcode";
import yarnConeService, {
  GenerateConesResponse,
  YarnCone,
} from "@/shared/services/yarnConeService";
import yarnPurchaseOrderService from "@/shared/services/yarnPurchaseOrderService";
import yarnBoxService from "@/shared/services/yarnBoxService";
import { QZTrayLoader, QZTrayStatus, QZTrayUntrustedWarning, QZTrayRequestBlocked } from "@/shared/components/qzTray";
import { printCones } from "@/shared/utils/qzTray";

// Load Google Font for preview
const LatoFontHeader = () => (
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet" />
);


const getProcessedBoxStorageKey = (boxId: string) =>
  `processedBoxResult:${boxId}`;

interface ProcessedBoxPageProps {
  params: {
    boxId: string;
  };
}

const formatDateTime = (value?: string) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const formatStatus = (value?: string) =>
  value ? value.replace(/_/g, " ") : "Not available";

const formatWeight = (value?: number) =>
  typeof value === "number" ? value.toFixed(4) : "-";

const ProcessedBoxPage: React.FC<ProcessedBoxPageProps> = ({ params }) => {
  const router = useRouter();
  const [result, setResult] = useState<GenerateConesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cones, setCones] = useState<YarnCone[]>([]);
  const [coneInputs, setConeInputs] = useState<
    Record<string, { coneWeight: string; tearWeight: string; coneStorageId: string }>
  >({});
  const [activeConeId, setActiveConeId] = useState<string | null>(null);
  const [barcodeScanValue, setBarcodeScanValue] = useState("");
  const [isUpdatingConeId, setIsUpdatingConeId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isFetchingWeight, setIsFetchingWeight] = useState(false);

  // Cone selection state
  const [selectedCones, setSelectedCones] = useState<Set<string>>(new Set());
  const [showPrintSelectionModal, setShowPrintSelectionModal] = useState(false);

  // Enriched box details (supplier/PO from yarn-boxes API when not in generate-cones response)
  const [boxEnrichment, setBoxEnrichment] = useState<{
    supplierName?: string;
    poNumber?: string;
  } | null>(null);

  // Print settings modal state
  const [showPrintSettingsModal, setShowPrintSettingsModal] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    paperSize: '4x6' as '4x6' | '6x4' | '50mm * 25mm' | '70mm * 50mm' | '50mm * 70mm',
    paperWidth: 812,
    paperHeight: 1218,
    labelsPerPage: 4,
    columnsPerRow: 2,
    firstLabelTopMargin: 0,
    showCutLines: true,
    qrCodeSize: 5,
    titleFontSize: 25,
    detailsFontSize: 18,
    boxIdFontSize: 25,
    yarnFontSize: 25,
    supplierFontSize: 20,
    barcodeHeight: 100,
    barcodeWidth: 2,
    shadeLotFontSize: 18,
    orientation: 'horizontal' as 'horizontal' | 'vertical',
  });

  const boxIdParam = useMemo(() => decodeURIComponent(params.boxId), [params]);
  const storageKey = useMemo(
    () => getProcessedBoxStorageKey(boxIdParam),
    [boxIdParam]
  );

  const buildConeInputs = useCallback((conesList: YarnCone[]) => {
    const formatted: Record<
      string,
      { coneWeight: string; tearWeight: string; coneStorageId: string }
    > = {};

    const formatInitialValue = (value?: number) =>
      typeof value === "number" && value > 0 ? value.toString() : "";

    conesList.forEach((cone) => {
      formatted[cone._id] = {
        coneWeight: formatInitialValue(cone.coneWeight),
        tearWeight: formatInitialValue(cone.tearWeight),
        coneStorageId: cone.coneStorageId || "",
      };
    });

    return formatted;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    const stored = sessionStorage.getItem(storageKey);

    if (!stored) {
      setIsLoading(false);
      toast.error(
        "Processed box details not available. Please process the box again."
      );
      router.push("/yarn-management/purchase-management/yarn-storage?tab=short-term");
      return;
    }

    try {
      const parsed = JSON.parse(stored) as GenerateConesResponse;
      setResult(parsed);

      const parsedCones = parsed.cones ?? [];
      setCones(parsedCones);
      setConeInputs(buildConeInputs(parsedCones));
    } catch (error) {
      console.error("Failed to parse processed box details:", error);
      toast.error("Failed to load processed box details");
      router.push("/yarn-management/purchase-management/yarn-storage?tab=short-term");
      return;
    } finally {
      setIsLoading(false);
    }
  }, [buildConeInputs, router, storageKey]);

  // Enrich box with supplier/PO from yarn-boxes API when not present (e.g. generate-cones API omits them)
  useEffect(() => {
    const box = result?.box;
    if (!box) return;
    const hasSupplier =
      (box.supplierName ?? box.supplier?.brandName ?? box.supplier?.name)?.trim();
    if (hasSupplier && box.poNumber?.trim()) return; // already have both

    const barcode = box.barcode?.trim();
    const boxId = boxIdParam?.trim();
    if (!barcode && !boxId) return;

    let cancelled = false;
    const fetchEnrichment = async () => {
      try {
        const apiBox = barcode
          ? await yarnBoxService.getYarnBoxByBarcode(barcode)
          : await yarnBoxService.getYarnBoxById(boxId!);
        if (cancelled) return;
        const supplierName =
          apiBox.supplier?.brandName ??
          (apiBox as { supplierName?: string; purchaseOrder?: { supplierName?: string } })
            .supplierName ??
          (apiBox as { purchaseOrder?: { supplierName?: string } }).purchaseOrder
            ?.supplierName ??
          "";
        setBoxEnrichment({
          supplierName: supplierName || undefined,
          poNumber: apiBox.poNumber || undefined,
        });
      } catch (err) {
        if (!cancelled) console.error("Failed to enrich box details:", err);
      }
    };
    void fetchEnrichment();
    return () => {
      cancelled = true;
    };
  }, [result?.box, boxIdParam]);

  // Auto-fill tear weight from PO tearweight API when poNumber + yarn name available
  useEffect(() => {
    const box = result?.box;
    const poNumber = box?.poNumber?.trim();
    if (!poNumber || !cones.length) return;

    const toFetch = cones.filter(
      (c) => c.yarnName?.trim() && !(coneInputs[c._id]?.tearWeight?.trim())
    );
    if (!toFetch.length) return;

    let cancelled = false;
    Promise.all(
      toFetch.map(async (cone) => {
        const res = await yarnPurchaseOrderService.getTearWeight(
          poNumber,
          cone.yarnName ?? ""
        );
        return { coneId: cone._id, tearweight: res };
      })
    )
      .then((results) => {
        if (cancelled) return;
        setConeInputs((prev) => {
          const next = { ...prev };
          results.forEach(({ coneId, tearweight }) => {
            if (tearweight != null && Number.isFinite(tearweight)) {
              if (!next[coneId])
                next[coneId] = {
                  coneWeight: "",
                  tearWeight: "",
                  coneStorageId: "",
                };
              next[coneId] = {
                ...next[coneId],
                tearWeight: String(tearweight),
              };
            }
          });
          return next;
        });
      })
      .catch((err) => {
        if (!cancelled) console.error("Tear weight auto-fill failed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [result?.box?.poNumber, cones, coneInputs]);

  // Fetch latest weight from API
  const fetchLatestWeight = async (): Promise<number | null> => {
    try {
      setIsFetchingWeight(true);
      // Get weight API URL from localStorage or use default
      const weightApiUrl = typeof window !== 'undefined'
        ? localStorage.getItem('weightApiUrl') || 'http://localhost:7001/api/weight/latest'
        : 'http://localhost:7001/api/weight/latest';

      const response = await fetch(weightApiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Extract weight from response: {"weight":0.65,"weightUnit":"kg",...}
      const weight = data.weight;

      if (weight !== undefined && weight !== null) {
        return parseFloat(weight);
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch weight:', error);
      // Don't show error toast, just log it - weight fetching is optional
      return null;
    } finally {
      setIsFetchingWeight(false);
    }
  };

  // Fetch weight automatically when a cone row is activated
  useEffect(() => {
    const autoFillWeight = async () => {
      if (!activeConeId) return;

      const weight = await fetchLatestWeight();
      if (weight !== null && weight > 0) {
        // Find the cone to get its current data
        const cone = cones.find(c => c._id === activeConeId);

        if (cone) {
          // Update coneInputs with fetched weight, ensuring all fields exist
          setConeInputs(prev => ({
            ...prev,
            [activeConeId]: {
              coneWeight: weight.toString(),
              tearWeight: prev[activeConeId]?.tearWeight || '',
              coneStorageId: prev[activeConeId]?.coneStorageId || ''
            }
          }));

          // Auto-focus Storage Location after weight is fetched (tear weight is pre-filled)
          setTimeout(() => {
            const storageInput = document.querySelector(`input[data-cone-storage="${activeConeId}"]`) as HTMLInputElement;
            if (storageInput) {
              storageInput.focus();
              storageInput.select();
            }
          }, 300);
        }
      }
    };

    autoFillWeight();
  }, [activeConeId, cones]);

  // Focus weight input when a cone is activated
  useEffect(() => {
    if (activeConeId) {
      // Use multiple attempts to ensure DOM is updated and input is available
      const focusWeightInput = () => {
        const weightInput = document.querySelector(`input[data-cone-weight="${activeConeId}"]`) as HTMLInputElement;
        if (weightInput) {
          weightInput.focus();
          weightInput.select(); // Select the text if any
          return true;
        }
        return false;
      };

      // Try immediately
      if (!focusWeightInput()) {
        // Try after a short delay
        setTimeout(() => {
          if (!focusWeightInput()) {
            // Try one more time after a longer delay
            setTimeout(() => {
              focusWeightInput();
            }, 200);
          }
        }, 100);
      }
    }
  }, [activeConeId]);

  const box = result?.box;
  const message = result?.message;
  const effectiveSupplier =
    box?.supplierName ??
    box?.supplier?.brandName ??
    box?.supplier?.name ??
    boxEnrichment?.supplierName;
  const effectivePoNumber = box?.poNumber ?? boxEnrichment?.poNumber;

  const handleConeBarcodeScan = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;

    const scannedValue = barcodeScanValue.trim();

    if (!scannedValue) {
      toast.error("Please scan a cone barcode");
      return;
    }

    const foundCone = cones.find(
      (cone) =>
        cone.barcode.toLowerCase() === scannedValue.toLowerCase() ||
        cone._id.toLowerCase() === scannedValue.toLowerCase()
    );

    if (!foundCone) {
      toast.error("Cone barcode not found");
      setBarcodeScanValue("");
      return;
    }

    setActiveConeId(foundCone._id);
    setBarcodeScanValue("");
    toast.success(`Cone ${foundCone.barcode} activated`);
  };

  const handleConeInputChange = (
    coneId: string,
    field: "coneWeight" | "tearWeight" | "coneStorageId",
    value: string
  ) => {
    setConeInputs((prev) => ({
      ...prev,
      [coneId]: {
        ...(prev[coneId] ?? { coneWeight: "", tearWeight: "", coneStorageId: "" }),
        [field]: value,
      },
    }));
  };

  const handleUpdateCone = async (cone: YarnCone) => {
    const coneId = cone._id;
    const inputs = coneInputs[coneId];

    if (!inputs) {
      toast.error("Cone inputs not found");
      return;
    }

    const coneWeight = parseFloat(inputs.coneWeight);
    const tearWeight = parseFloat(inputs.tearWeight);
    const coneStorageId = inputs.coneStorageId.trim();

    if (!Number.isFinite(coneWeight) || coneWeight <= 0) {
      toast.error("Enter valid cone weight");
      return;
    }

    if (!Number.isFinite(tearWeight) || tearWeight <= 0) {
      toast.error("Enter valid tear weight");
      return;
    }

    setIsUpdatingConeId(coneId);

    try {
      const updatedCone = await yarnConeService.updateYarnCone(coneId, {
        coneWeight,
        tearWeight,
        coneStorageId: coneStorageId || undefined,
      });

      setCones((prev) =>
        prev.map((c) =>
          c._id === coneId ? { ...c, coneWeight, tearWeight, coneStorageId } : c
        )
      );

      setActiveConeId(null);
      toast.success("Cone weights updated");

      setConeInputs((prev) => ({
        ...prev,
        [coneId]: {
          coneWeight: updatedCone.coneWeight.toString(),
          tearWeight: updatedCone.tearWeight.toString(),
          coneStorageId: updatedCone.coneStorageId || "",
        },
      }));

      // Return focus to Scan Cone Barcode for next cone
      setTimeout(() => {
        (document.querySelector("input[data-scan-cone-barcode]") as HTMLInputElement)?.focus();
      }, 0);
    } catch (error) {
      console.error("Failed to update cone weights:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update cone weights"
      );
    } finally {
      setIsUpdatingConeId(null);
    }
  };

  // Helper function to generate QR code SVG
  const generateQRCodeSVG = async (qrValue: string): Promise<string> => {
    try {
      // Generate QR code as SVG string
      const svgString = await QRCode.toString(qrValue, {
        type: 'svg',
        width: 80,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      return svgString;
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback to text if QR code generation fails
      return `<div style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; padding: 10px;">${qrValue}</div>`;
    }
  };

  const handlePaperSizeChange = (size: '4x6' | '6x4' | '50mm * 25mm' | '70mm * 50mm' | '50mm * 70mm') => {
    if (size === '4x6') {
      setPrintSettings({
        ...printSettings,
        paperSize: '4x6',
        paperWidth: 812,
        paperHeight: 1218,
        labelsPerPage: 4,
        columnsPerRow: 2,
      });
    } else if (size === '6x4') {
      setPrintSettings({
        ...printSettings,
        paperSize: '6x4',
        paperWidth: 1218,
        paperHeight: 812,
        labelsPerPage: 4,
        columnsPerRow: 2,
      });
    } else if (size === '70mm * 50mm') {
      setPrintSettings({
        ...printSettings,
        paperSize: '70mm * 50mm',
        paperWidth: 558,
        paperHeight: 398,
        labelsPerPage: 1,
        columnsPerRow: 1,
        qrCodeSize: 5,
        titleFontSize: 25,
        detailsFontSize: 18,
      });
    } else if (size === '50mm * 70mm') {
      setPrintSettings({
        ...printSettings,
        paperSize: '50mm * 70mm',
        paperWidth: 398,
        paperHeight: 558,
        labelsPerPage: 1,
        columnsPerRow: 1,
        qrCodeSize: 5,
        titleFontSize: 25,
        detailsFontSize: 18,
        boxIdFontSize: 25,
        yarnFontSize: 25,
        supplierFontSize: 20,
        shadeLotFontSize: 18,
        firstLabelTopMargin: 20,
        orientation: 'vertical'
      });
    } else if (size === '50mm * 25mm') {
      setPrintSettings({
        ...printSettings,
        paperSize: '50mm * 25mm',
        paperWidth: 406,  // 2 inches (50.8mm) landscape
        paperHeight: 203, // 1 inch (25.4mm) landscape
        labelsPerPage: 1,
        columnsPerRow: 1,
        qrCodeSize: 4,
        titleFontSize: 25,
        detailsFontSize: 16,
        firstLabelTopMargin: 20,
      });
    }
  };

  const handlePrintCones = async () => {
    if (!box || cones.length === 0) {
      toast.error("No cones available to print");
      return;
    }

    // Show selection modal first
    setShowPrintSelectionModal(true);
  };

  const handlePrintAll = () => {
    setShowPrintSelectionModal(false);
    setShowPrintSettingsModal(true);
  };

  const handlePrintSelected = () => {
    if (selectedCones.size === 0) {
      toast.error("Please select at least one cone to print");
      return;
    }
    setShowPrintSelectionModal(false);
    setShowPrintSettingsModal(true);
  };

  const toggleConeSelection = (coneId: string) => {
    const newSelected = new Set(selectedCones);
    if (newSelected.has(coneId)) {
      newSelected.delete(coneId);
    } else {
      newSelected.add(coneId);
    }
    setSelectedCones(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedCones.size === cones.length) {
      setSelectedCones(new Set());
    } else {
      setSelectedCones(new Set(cones.map(c => c._id)));
    }
  };

  const executePrintWithSettings = async () => {
    setShowPrintSettingsModal(false);

    if (!box || cones.length === 0) {
      toast.error("No cones available to print");
      return;
    }

    // Determine which cones to print
    const conesToPrint = selectedCones.size > 0
      ? cones.filter(cone => selectedCones.has(cone._id))
      : cones;

    if (conesToPrint.length === 0) {
      toast.error("No cones selected to print");
      return;
    }

    setIsPrinting(true);
    const rowsPerPage = Math.ceil(printSettings.labelsPerPage / printSettings.columnsPerRow);
    const labelsPerSheet = rowsPerPage * printSettings.columnsPerRow;
    const pageCount = Math.ceil(conesToPrint.length / labelsPerSheet);
    const layoutInfo = `${rowsPerPage} rows × ${printSettings.columnsPerRow} column(s)`;
    const toastId = toast.loading(`Printing ${conesToPrint.length} cone(s) on ${pageCount} page(s) (${layoutInfo})...`);

    try {
      const result = await printCones(
        conesToPrint.map(cone => ({
          barcode: cone.barcode,
          yarnName: box.yarnName,
          boxId: box.boxId,
          supplierName: effectiveSupplier ?? undefined,
          poNumber: effectivePoNumber ?? box.poNumber,
          lotNumber: box.lotNumber,
          shadeCode: box.shadeCode,
          weight: cone.coneWeight
        })),
        { customSettings: printSettings }
      );

      if (result.success) {
        toast.success(`Successfully printed ${result.printed} cone QR code(s)`, { id: toastId });
        // Clear selection after successful print
        setSelectedCones(new Set());
      } else {
        toast.error(result.error || "Failed to print cone barcodes", { id: toastId });
      }
    } catch (error: any) {
      toast.error(error.message || "Printing error", { id: toastId });
    } finally {
      setIsPrinting(false);
    }
  };

  const executeBrowserPrint = async () => {
    // Determine which cones to print
    const conesToPrint = selectedCones.size > 0
      ? cones.filter(cone => selectedCones.has(cone._id))
      : cones;

    if (conesToPrint.length === 0) {
      toast.error("No cones available to print");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups for this site.");
      return;
    }

    const isSmall = printSettings.paperSize === '50mm * 25mm';
    const isMedium = printSettings.paperSize === '70mm * 50mm';
    const isPortraitSmall = printSettings.paperSize === '50mm * 70mm';

    let paperW = 101.6;
    let paperH = 152.4;

    if (isSmall) { paperW = 50; paperH = 25; }
    else if (isMedium) { paperW = 70; paperH = 50; }
    else if (isPortraitSmall) { paperW = 50; paperH = 70; }
    else if (printSettings.paperSize === '6x4') { paperW = 152.4; paperH = 101.6; }
    const labelW = paperW / printSettings.columnsPerRow;
    const labelH = paperH / (printSettings.labelsPerPage / printSettings.columnsPerRow);

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Browser Print - Cone Labels</title>
          <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: ${paperW}mm ${paperH}mm;
              margin: 0;
            }
            body { margin: 0; padding: 0; font-family: 'Lato', sans-serif; -webkit-print-color-adjust: exact; }
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
              border: 0.1mm dotted #eee; /* Light guide for screen */
            }
            @media print {
              .label { border: none; }
            }
            .data { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; padding-right: 1mm; padding-left: 2.5mm; }
            .qr { width: 28%; display: flex; align-items: center; justify-content: center; }
            .title { font-weight: normal; font-size: ${isSmall ? '10.5pt' : (isMedium || isPortraitSmall) ? '11pt' : '10pt'}; line-height: 1.1; margin-bottom: 0.5mm; word-break: break-all; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
            .text { font-size: ${isSmall ? '10.5pt' : (isMedium || isPortraitSmall) ? '9pt' : '8pt'}; line-height: 1.2; margin: 0; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
            .text.short { -webkit-line-clamp: 1; }
            canvas { width: 90% !important; height: auto !important; }
          </style>
        </head>
        <body>
    `;

    const labelsPerPage = printSettings.labelsPerPage;
    for (let i = 0; i < conesToPrint.length; i += labelsPerPage) {
      html += `<div class="page">`;
      for (let j = 0; j < labelsPerPage && (i + j) < conesToPrint.length; j++) {
        const cone = conesToPrint[i + j];
        html += `
          <div class="label">
            <div class="data">
              <div class="title">${box?.yarnName || 'Yarn'}</div>
              <p class="text">Supplier: ${effectiveSupplier || '-'}</p>
              <p class="text short">PO: ${effectivePoNumber || '-'}</p>
              <p class="text short">L: ${box?.lotNumber || '-'}</p>
              <p class="text">S: ${box?.shadeCode || '-'}</p>
            </div>
            <div class="qr"><canvas id="qr-${cone._id}"></canvas></div>
          </div>
        `;
      }
      html += `</div>`;
    }

    html += `
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
        <script>
          const cones = ${JSON.stringify(conesToPrint.map(c => ({ id: c._id, barcode: c.barcode })))};
          window.onload = function() {
            let loaded = 0;
            cones.forEach(cone => {
              const canvas = document.getElementById('qr-' + cone.id);
              if (canvas) {
                QRCode.toCanvas(canvas, cone.barcode, { 
                  margin: 0, 
                  width: 120,
                  color: { dark: '#000000', light: '#ffffff' }
                }, function(err) {
                  loaded++;
                  if (loaded === cones.length) {
                    setTimeout(() => { window.print(); window.close(); }, 500);
                  }
                });
              } else {
                loaded++;
              }
            });
            if (cones.length === 0) { window.print(); window.close(); }
          };
        </script>
      </body></html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading processed box details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!box || !result) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-error-warning-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Processed box data not found
          </h3>
          <Link
            href="/yarn-management/purchase-management/yarn-storage?tab=short-term"
            className="ti-btn ti-btn-primary"
          >
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Storage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <LatoFontHeader />
      <Seo title={`Processed Box - ${box.boxId}`} />
      <QZTrayLoader />
      <QZTrayUntrustedWarning />
      <QZTrayRequestBlocked />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Link
                href="/yarn-management/purchase-management/yarn-storage?tab=short-term"
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Back to Yarn Storage"
              >
                <i className="ri-arrow-left-line text-sm"></i>
              </Link>
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Processed Box Summary</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {box.boxId}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <QZTrayStatus />
              {cones.length > 0 && (
                <button
                  type="button"
                  onClick={handlePrintCones}
                  disabled={isPrinting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                >
                  {isPrinting ? (
                    <i className="ri-loader-4-line animate-spin text-xs"></i>
                  ) : (
                    <i className="ri-printer-line text-xs"></i>
                  )}
                  Print Cone QR Codes
                </button>
              )}
            </div>
          </div>

          {message && (
            <div className="mb-4 rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700 flex items-start gap-2">
              <i className="ri-checkbox-circle-line text-sm"></i>
              <span>{message}</span>
            </div>
          )}

          {/* Box Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <DetailItem label="Box ID" value={box.boxId} isMono />
            <DetailItem label="Barcode" value={box.barcode} isMono />
            <DetailItem label="PO Number" value={effectivePoNumber || "-"} />
            {effectiveSupplier ? (
              <DetailItem label="Supplier" value={effectiveSupplier} />
            ) : null}
            <DetailItem label="Yarn Name" value={box.yarnName || "-"} />
            <DetailItem label="Shade Code" value={box.shadeCode || "-"} />
            <DetailItem label="Lot Number" value={box.lotNumber || "-"} />
            <DetailItem
              label="Box Weight (kg)"
              value={box.boxWeight !== undefined ? String(box.boxWeight) : "-"}
            />
            <DetailItem
              label="Number of Cones"
              value={box.numberOfCones !== undefined ? String(box.numberOfCones) : "-"}
            />
            <DetailItem label="Storage Location" value={box.storageLocation || "-"} />
            <DetailItem label="Received Date" value={formatDateTime(box.receivedDate)} />
            <DetailItem label="Updated At" value={formatDateTime(box.updatedAt)} />
          </div>

          {box.qcData && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                <i className="ri-shield-check-line text-purple-600 text-xs"></i>
                QC Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <DetailItem
                  label="QC Status"
                  value={
                    box.qcData.status === "qc_approved"
                      ? "QC Approved"
                      : box.qcData.status === "qc_rejected"
                        ? "QC Rejected"
                        : "Pending"
                  }
                />
                <DetailItem label="QC Date" value={formatDateTime(box.qcData.date)} />
                <DetailItem label="Inspector" value={box.qcData.username} />
                {box.qcData.remarks && (
                  <DetailItem label="Remarks" value={box.qcData.remarks} />
                )}
              </div>
            </div>
          )}

          {box.coneData && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <h4 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                <i className="ri-stack-line text-purple-600 text-xs"></i>
                Cone Issue Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <DetailItem
                  label="Cones Issued"
                  value={box.coneData.conesIssued ? "Yes" : "No"}
                />
                <DetailItem
                  label="Issue Date"
                  value={formatDateTime(box.coneData.coneIssueDate)}
                />
                <DetailItem
                  label="Issued By"
                  value={
                    box.coneData.coneIssueBy?.username ||
                    box.coneData.coneIssueBy?.user ||
                    "-"
                  }
                />
                <DetailItem
                  label="Number of Cones"
                  value={String(box.coneData.numberOfCones)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cones Table Section */}
        <div className="border-t border-gray-100">
          <div className="p-[10px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <i className="ri-barcode-line text-purple-600 text-xs"></i>
                Generated Cones ({cones.length})
              </h3>
            </div>

            {cones.length > 0 && (
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Scan Cone Barcode</label>
                <input
                  type="text"
                  data-scan-cone-barcode
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                  placeholder="Scan cone barcode to activate row"
                  value={barcodeScanValue}
                  onChange={(e) => setBarcodeScanValue(e.target.value)}
                  onKeyDown={handleConeBarcodeScan}
                  autoFocus
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Scan a cone barcode, update cone & tear weights, then press Enter to submit.
                </p>
              </div>
            )}

            {/* Weighing Process Indicator */}
            {activeConeId && (() => {
              const activeCone = cones.find(c => c._id === activeConeId);
              if (!activeCone) return null;

              const activeConeData = coneInputs[activeConeId] || {};
              const hasWeight = activeConeData.coneWeight && parseFloat(activeConeData.coneWeight) > 0;

              // Show indicator only when weight hasn't been entered yet
              if (!hasWeight) {
                return (
                  <div className="mb-3 animate-pulse">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-2 rounded-r-lg shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0">
                          <i className="ri-scales-3-line text-lg text-blue-600"></i>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xs font-semibold text-blue-900 mb-0.5">
                            Place the cone on the weighing scale
                          </h4>
                          <p className="text-[10px] text-blue-700">
                            Cone Barcode: <span className="font-mono font-semibold">{activeCone.barcode}</span> - Waiting for weight...
                          </p>
                        </div>
                        {isFetchingWeight && (
                          <div className="flex-shrink-0">
                            <i className="ri-loader-4-line animate-spin text-blue-600 text-sm"></i>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {cones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <i className="ri-inbox-line text-xl text-gray-200"></i>
                </div>
                <h3 className="text-xs font-bold text-gray-400 mb-1">NO CONES FOUND</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Cone Barcode</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Cone Weight (kg)</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Tear Weight (kg)</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Issue Status</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Storage Location</th>
                      <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Created At</th>
                      <th className="px-1.5 py-2 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cones.map((cone: YarnCone) => (
                      <tr
                        key={cone._id}
                        className={`hover:bg-gray-50/50 transition-colors ${activeConeId === cone._id
                          ? "bg-blue-50 border-2 border-blue-400"
                          : ""
                          }`}
                      >
                        <td className="px-1.5 py-2 border border-gray-200">
                          <span className="text-xs text-gray-900 font-mono">
                            {cone.barcode}
                          </span>
                        </td>
                        <td className="px-1.5 py-2 border border-gray-200">
                          {activeConeId === cone._id ? (
                            <input
                              type="text"
                              data-cone-weight={cone._id}
                              className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                              value={coneInputs[cone._id]?.coneWeight || ""}
                              onChange={(e) =>
                                handleConeInputChange(
                                  cone._id,
                                  "coneWeight",
                                  e.target.value
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  const storageInput = document.querySelector(`input[data-cone-storage="${cone._id}"]`) as HTMLInputElement;
                                  if (storageInput) {
                                    storageInput.focus();
                                    storageInput.select();
                                  }
                                }
                              }}
                              placeholder="0.0000"
                            />
                          ) : (
                            <span className="text-xs text-gray-900">
                              {formatWeight(cone.coneWeight)}
                            </span>
                          )}
                        </td>
                        <td className="px-1.5 py-2 border border-gray-200">
                          {activeConeId === cone._id ? (
                            <input
                              type="text"
                              data-cone-tear-weight={cone._id}
                              className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                              value={coneInputs[cone._id]?.tearWeight || ""}
                              onChange={(e) =>
                                handleConeInputChange(
                                  cone._id,
                                  "tearWeight",
                                  e.target.value
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  const storageInput = document.querySelector(`input[data-cone-storage="${cone._id}"]`) as HTMLInputElement;
                                  if (storageInput) {
                                    storageInput.focus();
                                    storageInput.select();
                                  }
                                }
                              }}
                              placeholder="0.0000"
                            />
                          ) : (
                            <span className="text-xs text-gray-900">
                              {formatWeight(
                                (() => {
                                  const twStr = coneInputs[cone._id]?.tearWeight?.trim();
                                  if (twStr !== undefined && twStr !== "") {
                                    const n = parseFloat(twStr);
                                    if (Number.isFinite(n)) return n;
                                  }
                                  return cone.tearWeight;
                                })()
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-1.5 py-2 border border-gray-200">
                          <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-100 text-blue-800 capitalize">
                            {formatStatus(cone.issueStatus)}
                          </span>
                        </td>
                        <td className="px-1.5 py-2 border border-gray-200">
                          {activeConeId === cone._id ? (
                            <input
                              type="text"
                              data-cone-storage={cone._id}
                              className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                              value={coneInputs[cone._id]?.coneStorageId || ""}
                              onChange={(e) =>
                                handleConeInputChange(
                                  cone._id,
                                  "coneStorageId",
                                  e.target.value
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  handleUpdateCone(cone);
                                }
                              }}
                              placeholder="Enter storage ID"
                            />
                          ) : (
                            <span className="text-xs text-gray-900">
                              {cone.coneStorageId || "-"}
                            </span>
                          )}
                        </td>
                        <td className="px-1.5 py-2 border border-gray-200">
                          <span className="text-xs text-gray-900">
                            {formatDateTime(cone.createdAt)}
                          </span>
                        </td>
                        <td className="px-1.5 py-2 text-right pr-[10px] border border-gray-200">
                          <div className="flex items-center justify-end gap-1">
                            {isUpdatingConeId === cone._id ? (
                              <div className="flex items-center gap-1.5 text-xs text-purple-600 whitespace-nowrap">
                                <i className="ri-loader-4-line animate-spin text-xs"></i>
                                <span className="text-[10px]">Saving...</span>
                              </div>
                            ) : activeConeId === cone._id ? (
                              <button
                                type="button"
                                className="flex items-center gap-1 px-2 py-1 bg-purple-600 text-white text-[10px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
                                onClick={() => handleUpdateCone(cone)}
                              >
                                <i className="ri-save-line text-xs"></i>
                                Save
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="flex items-center gap-1 px-2 py-1 bg-white text-purple-600 border border-purple-200 text-[10px] font-bold rounded hover:bg-purple-50 transition-colors shadow-sm"
                                onClick={() => setActiveConeId(cone._id)}
                              >
                                <i className="ri-pencil-line text-xs"></i>
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Print Selection Modal */}
        {showPrintSelectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Select Cones to Print</h3>
                <button
                  onClick={() => setShowPrintSelectionModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>

              <div className="p-6">
                {/* Select All Checkbox */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCones.size === cones.length && cones.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Select All ({cones.length} cones)
                    </span>
                  </label>
                </div>

                {/* Cones List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {cones.map((cone) => (
                    <div
                      key={cone._id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${selectedCones.has(cone._id)
                        ? 'bg-purple-50 border-purple-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      onClick={() => toggleConeSelection(cone._id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCones.has(cone._id)}
                        onChange={() => toggleConeSelection(cone._id)}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {cone.barcode}
                          </span>
                          <span className="text-xs text-gray-500">
                            Weight: {formatWeight(cone.coneWeight)}
                          </span>
                        </div>
                        {cone.coneStorageId && (
                          <span className="text-xs text-gray-500">
                            Storage: {cone.coneStorageId}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedCones.size > 0 && (
                  <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="text-sm font-medium text-purple-900">
                      {selectedCones.size} cone(s) selected
                    </span>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowPrintSelectionModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrintAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  <i className="ri-printer-line mr-2"></i>
                  Print All ({cones.length})
                </button>
                <button
                  onClick={handlePrintSelected}
                  disabled={selectedCones.size === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-printer-line mr-2"></i>
                  Print Selected ({selectedCones.size})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Print Settings Modal */}
        {showPrintSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Print Settings - Cone QR Labels</h3>
                <button
                  onClick={() => setShowPrintSettingsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Label Preview */}
                <div className="p-4 bg-gray-100 rounded-lg flex flex-col items-center">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 self-start">Live Preview (Approximate)</h4>

                  {printSettings.paperSize === '50mm * 25mm' ? (
                    /* 50x25mm Side-by-Side Preview */
                    <div className="bg-white border border-gray-400 shadow-sm flex overflow-hidden" style={{ width: '250px', height: '125px', fontFamily: "'Lato', sans-serif" }}>
                      <div className="flex-1 py-2 pr-2 pl-4 flex flex-col justify-center gap-0.5 overflow-hidden">
                        <div className="text-[11px] font-normal leading-tight border-b border-gray-100 pb-0.5 uppercase line-clamp-2">
                          {box.yarnName || 'Yarn Name'}
                        </div>
                        <div className="text-[11px] text-gray-700 line-clamp-2">Supplier: {effectiveSupplier || '-'}</div>
                        <div className="text-[11px] text-gray-700 truncate">PO: {effectivePoNumber || '-'}</div>
                        <div className="text-[11px] text-gray-700 truncate">L: {box.lotNumber || '-'}</div>
                        <div className="text-[11px] text-gray-700 line-clamp-2">S: {box.shadeCode || '-'}</div>
                      </div>
                      <div className="w-[28%] bg-white border-l border-gray-50 flex items-center justify-center p-2">
                        <div className="aspect-square w-full border-2 border-black flex items-center justify-center relative">
                          <div className="w-full h-full p-1 flex flex-wrap gap-0.5">
                            {[...Array(9)].map((_, i) => (
                              <div key={i} className={`w-[25%] h-[25%] ${i % 3 === 0 ? 'bg-black' : 'bg-gray-200'}`}></div>
                            ))}
                          </div>
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold bg-white/80">QR</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Standard Vertical Preview */
                    <div className="bg-white border border-gray-400 shadow-sm flex flex-col items-center overflow-hidden"
                      style={{
                        width: printSettings.paperSize === '6x4' ? '250px' : '180px',
                        height: printSettings.paperSize === '6x4' ? '180px' : '250px',
                        fontFamily: "'Lato', sans-serif"
                      }}>
                      <div className="w-full p-3 flex flex-col gap-1 text-center">
                        <div className="text-[11px] font-bold leading-tight border-b border-gray-200 pb-1 uppercase break-words">{box.yarnName || 'Yarn Name'}</div>
                        <div className="text-[9px] text-gray-600 truncate">{effectiveSupplier || '-'}</div>
                        <div className="text-[9px]">PO: {effectivePoNumber || '-'}</div>
                        <div className="text-[9px]">Lot: {box.lotNumber || '-'} | Shade: {box.shadeCode || '-'}</div>
                      </div>
                      <div className="flex-1 flex items-center justify-center p-4">
                        <div className="w-16 h-16 border-2 border-black flex items-center justify-center relative">
                          <div className="w-full h-full p-1 flex flex-wrap gap-1">
                            {[...Array(16)].map((_, i) => (
                              <div key={i} className={`w-[20%] h-[20%] ${i % 3 === 0 ? 'bg-black' : 'bg-gray-100'}`}></div>
                            ))}
                          </div>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold bg-white/80">QR</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-500 mt-2 italic">Actual print layout will be optimized for thermal printing.</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Paper Settings</h4>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Paper Size</label>
                      <div className="flex flex-wrap gap-2.5">
                        {['4x6', '6x4', '70mm * 50mm', '50mm * 70mm', '50mm * 25mm'].map((size) => (
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
                    {(printSettings.paperSize === '70mm * 50mm' || printSettings.paperSize === '50mm * 25mm') && (
                      <div className="p-2 bg-amber-50 border border-amber-100 rounded flex gap-2">
                        <i className="ri-error-warning-fill text-amber-500 text-sm"></i>
                        <p className="text-[10px] text-amber-800 leading-tight">
                          <strong>Driver Config Required:</strong> Ensure your printer's "Page Setup" matches <strong>{printSettings.paperSize}</strong> exactly.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Top Margin (dots)</label>
                      <input
                        type="number"
                        value={printSettings.firstLabelTopMargin}
                        onChange={(e) => setPrintSettings({ ...printSettings, firstLabelTopMargin: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Layout Settings */}
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
                        <option value={1}>1 Column</option>
                        <option value={2}>2 Columns</option>
                        <option value={3}>3 Columns</option>
                        <option value={4}>4 Columns</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Orientation</label>
                      <select
                        value={printSettings.orientation}
                        onChange={(e) => setPrintSettings({ ...printSettings, orientation: e.target.value as any })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                      >
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical (Rotated)</option>
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

                {/* QR Code & Font Settings */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Font & Barcode Settings</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Box ID Font Size</label>
                      <input
                        type="number"
                        value={printSettings.boxIdFontSize}
                        onChange={(e) => setPrintSettings({ ...printSettings, boxIdFontSize: parseInt(e.target.value) || 25 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Yarn Font Size</label>
                      <input
                        type="number"
                        value={printSettings.yarnFontSize}
                        onChange={(e) => setPrintSettings({ ...printSettings, yarnFontSize: parseInt(e.target.value) || 25 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Sup. Font Size</label>
                      <input
                        type="number"
                        value={printSettings.supplierFontSize}
                        onChange={(e) => setPrintSettings({ ...printSettings, supplierFontSize: parseInt(e.target.value) || 20 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">Lot/Shade Font Size</label>
                      <input
                        type="number"
                        value={printSettings.detailsFontSize}
                        onChange={(e) => setPrintSettings({ ...printSettings, detailsFontSize: parseInt(e.target.value) || 18 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">BC Width</label>
                      <input
                        type="number"
                        value={printSettings.barcodeWidth}
                        onChange={(e) => setPrintSettings({ ...printSettings, barcodeWidth: parseInt(e.target.value) || 2 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                        min="1" max="4"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">BC Height</label>
                      <input
                        type="number"
                        value={printSettings.barcodeHeight}
                        onChange={(e) => setPrintSettings({ ...printSettings, barcodeHeight: parseInt(e.target.value) || 100 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">QR Size</label>
                      <input
                        type="number"
                        value={printSettings.qrCodeSize}
                        onChange={(e) => setPrintSettings({ ...printSettings, qrCodeSize: parseInt(e.target.value) || 5 })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                        min="3" max="10"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPrintSettings({
                        paperSize: '4x6',
                        paperWidth: 812,
                        paperHeight: 1218,
                        labelsPerPage: 4,
                        columnsPerRow: 2,
                        firstLabelTopMargin: 0,
                        showCutLines: true,
                        qrCodeSize: 5,
                        titleFontSize: 25,
                        detailsFontSize: 18,
                        boxIdFontSize: 25,
                        yarnFontSize: 25,
                        supplierFontSize: 20,
                        barcodeHeight: 100,
                        barcodeWidth: 2,
                        orientation: 'horizontal',
                        shadeLotFontSize: 18
                      })}
                      className="px-3 py-1.5 text-[10px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded transition-colors uppercase border border-gray-200"
                    >
                      Reset
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await printCones(
                            [{
                              barcode: 'TEST-12345678',
                              yarnName: 'TEST YARN 30s COTTON',
                              boxId: box.boxId || 'B-TEST-001',
                              supplierName: 'TEST SUPPLIER PVT LTD',
                              poNumber: 'PO-TEST-001',
                              lotNumber: 'LOT-999',
                              shadeCode: 'TEST-RED',
                              weight: 1.234
                            }],
                            { customSettings: printSettings }
                          );
                          toast.success("Test label sent to printer");
                        } catch (err: any) {
                          toast.error(err.message || "Test print failed");
                        }
                      }}
                      className="px-3 py-1.5 text-[10px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded transition-colors uppercase border border-purple-200"
                    >
                      Test Print
                    </button>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-3 z-10">
                <button
                  onClick={executeBrowserPrint}
                  className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded transition-colors mr-auto"
                >
                  <i className="ri-window-line mr-1.5"></i>
                  Test Browser
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
                  Print
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

  );
};

interface DetailItemProps {
  label: string;
  value: string;
  isMono?: boolean;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value, isMono }) => (
  <div>
    <label className="text-[10px] font-medium text-gray-600 mb-0.5 block uppercase">
      {label}
    </label>
    <div
      className={`mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200 ${isMono ? "font-mono" : ""
        }`}
      style={!isMono ? { fontFamily: "'Lato', sans-serif" } : {}}
    >
      {value}
    </div>
  </div>
);

export default ProcessedBoxPage;


