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
      router.push("/yarn-management/purchase-management/yarn-storage");
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
      router.push("/yarn-management/purchase-management/yarn-storage");
      return;
    } finally {
      setIsLoading(false);
    }
  }, [buildConeInputs, router, storageKey]);

  const box = result?.box;
  const message = result?.message;
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

  const handlePrintCones = async () => {
    if (!box || cones.length === 0) {
      toast.error("No cones available to print");
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast.error("Please allow popups to print cone QR codes");
      return;
    }

    // Generate QR code SVGs for all cones
    const qrCodePromises = cones.map((cone) => generateQRCodeSVG(cone.barcode));
    const qrCodeSVGs = await Promise.all(qrCodePromises);

    const qrCodeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Cone QR Codes - ${box.boxId}</title>
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
            .qr-code-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 25px;
              margin-top: 20px;
            }
            .qr-code-item {
              border: 2px solid #ddd;
              padding: 20px;
              text-align: center;
              page-break-inside: avoid;
              min-height: 400px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #fff;
              border-radius: 8px;
            }
            .cone-header-info {
              margin-bottom: 12px;
            }
            .qr-code-label {
              font-size: 11px;
              color: #666;
              margin-bottom: 5px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .qr-code-section {
              margin-top: auto;
              padding-top: 15px;
              border-top: 1px solid #e0e0e0;
            }
            .qr-code-value {
              font-family: 'Courier New', monospace;
              margin: 10px 0;
              padding: 15px;
              background: #f5f5f5;
              border: 1px dashed #ccc;
              display: flex;
              justify-content: center;
              align-items: center;
              border-radius: 4px;
            }
            .qr-code-value svg {
              max-width: 100%;
              height: auto;
            }
            .cone-details-section {
              margin: 20px 0;
              padding: 15px 0;
              text-align: left;
              flex: 1;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
              font-size: 12px;
            }
            .detail-row:last-child {
              margin-bottom: 0;
            }
            .detail-label {
              font-weight: 600;
              color: #555;
              min-width: 100px;
            }
            .detail-value {
              color: #333;
              font-weight: 500;
              text-align: right;
              flex: 1;
              word-break: break-word;
            }
            .cone-info {
              font-size: 13px;
              color: #333;
            }
            @media print {
              .qr-code-container {
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
              }
              .qr-code-item {
                min-height: 420px;
                padding: 18px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <h2 style="margin: 0 0 10px 0;">Cone QR Codes - ${box.boxId}</h2>
            <p style="margin: 0;">PO Number: ${box.poNumber} | Yarn: ${box.yarnName || "-"} | Total Cones: ${cones.length}</p>
          </div>
          <div class="qr-code-container">
            ${cones
              .map((cone, index) => {
                const qrCodeSVG = qrCodeSVGs[index];
                return `
                <div class="qr-code-item">
                  <div class="cone-header-info">
                    <div class="qr-code-label">Cone Barcode</div>
                    <div class="cone-info" style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">${cone.barcode}</div>
                  </div>
                  <div class="cone-details-section">
                    <div class="detail-row">
                      <span class="detail-label">Yarn Name:</span>
                      <span class="detail-value">${box.yarnName || "-"}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">PO Number:</span>
                      <span class="detail-value">${box.poNumber || "-"}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Shade Code:</span>
                      <span class="detail-value">${box.shadeCode || "-"}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Lot Number:</span>
                      <span class="detail-value">${box.lotNumber || "-"}</span>
                    </div>
                  </div>
                  <div class="qr-code-section">
                    <div class="qr-code-label">QR Code</div>
                    <div class="qr-code-value">
                      ${qrCodeSVG}
                    </div>
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(qrCodeHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      toast.success(`${cones.length} cone QR code(s) printed successfully`);
    }, 250);
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
            href="/yarn-management/purchase-management/yarn-storage"
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
      <Seo title={`Processed Box - ${box.boxId}`} />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Link
                href="/yarn-management/purchase-management/yarn-storage"
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
            {cones.length > 0 && (
              <button
                type="button"
                onClick={handlePrintCones}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-printer-line text-xs"></i>
                Print Cone QR Codes
              </button>
            )}
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
            <DetailItem label="PO Number" value={box.poNumber} />
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
            <DetailItem
              label="Order Quantity"
              value={box.orderQty !== undefined ? String(box.orderQty) : "-"}
            />
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
                        className={`hover:bg-gray-50/50 transition-colors ${
                          activeConeId === cone._id
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
                              type="number"
                              step="0.001"
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
                                  handleUpdateCone(cone);
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
                              type="number"
                              step="0.001"
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
                                  handleUpdateCone(cone);
                                }
                              }}
                              placeholder="0.0000"
                            />
                          ) : (
                            <span className="text-xs text-gray-900">
                              {formatWeight(cone.tearWeight)}
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
      className={`mt-0.5 text-xs text-gray-900 bg-gray-50 p-1.5 rounded border border-gray-200 ${
        isMono ? "font-mono" : ""
      }`}
    >
      {value}
    </div>
  </div>
);

export default ProcessedBoxPage;


