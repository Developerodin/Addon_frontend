"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Seo from "@/shared/layout-components/seo/seo";
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
  const areAllConesCaptured = useMemo(
    () =>
      cones.length > 0 &&
      cones.every(
        (cone) =>
          typeof cone.coneWeight === "number" &&
          cone.coneWeight > 0 &&
          typeof cone.tearWeight === "number" &&
          cone.tearWeight > 0
      ),
    [cones]
  );

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

  const handlePrintCones = () => {
    if (!box || cones.length === 0) {
      toast.error("No cones available to print");
      return;
    }

    if (!areAllConesCaptured) {
      toast.error("Capture cone and tear weights for all cones before printing");
      return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast.error("Please allow popups to print cone barcodes");
      return;
    }

    const barcodeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Cones - ${box.boxId}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            h2 {
              margin-bottom: 5px;
            }
            p {
              margin: 4px 0;
            }
            .barcode-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 20px;
            }
            .barcode-item {
              border: 1px solid #ddd;
              padding: 15px;
              text-align: center;
              page-break-inside: avoid;
            }
            .barcode-value {
              font-family: 'Courier New', monospace;
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
              padding: 10px;
              background: #f5f5f5;
              border: 1px dashed #ccc;
            }
            .cone-info {
              font-size: 11px;
              color: #333;
              margin-top: 5px;
            }
            @media print {
              .barcode-container {
                grid-template-columns: repeat(3, 1fr);
              }
            }
          </style>
        </head>
        <body>
          <h2>Cone Barcodes - ${box.boxId}</h2>
          <p>PO Number: ${box.poNumber} | Yarn: ${box.yarnName || "-"} | Total Cones: ${cones.length}</p>
          <div class="barcode-container">
            ${cones
              .map(
                (cone) => `
              <div class="barcode-item">
                <div class="cone-info">Cone Barcode</div>
                <div class="barcode-value">${cone.barcode}</div>
                <div class="cone-info">Weight: ${formatWeight(
                  cone.coneWeight
                )} kg</div>
                <div class="cone-info">Tear Weight: ${formatWeight(
                  cone.tearWeight
                )} kg</div>
                <div class="cone-info">Issue Status: ${formatStatus(
                  cone.issueStatus
                )}</div>
              </div>`
              )
              .join("")}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(barcodeHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      toast.success(`${cones.length} cone barcode(s) sent to printer`);
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
    <div className="main-content">
      <Seo title={`Processed Box - ${box.boxId}`} />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box mb-6">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Link
                  href="/yarn-management/purchase-management/yarn-storage"
                  className="text-gray-500 hover:text-gray-700"
                  title="Back to Yarn Storage"
                >
                  <i className="ri-arrow-left-line text-lg"></i>
                </Link>
                <h3 className="box-title text-base">
                  <i className="ri-barcode-box-line me-2"></i>
                  Processed Box Summary
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintCones}
                  className={`ti-btn ${
                    areAllConesCaptured
                      ? "ti-btn-outline-primary"
                      : "ti-btn-outline-secondary cursor-not-allowed opacity-60"
                  }`}
                  disabled={!areAllConesCaptured}
                >
                  <i className="ri-printer-line me-2"></i>
                  Print Cone Barcodes
                </button>
              </div>
            </div>
            <div className="box-body">
              {message && (
                <div className="mb-4 rounded-md bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 flex items-start gap-2">
                  <i className="ri-checkbox-circle-line text-lg"></i>
                  <span>{message}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <DetailItem label="Box ID" value={box.boxId} isMono />
                <DetailItem label="Barcode" value={box.barcode} isMono />
                <DetailItem label="PO Number" value={box.poNumber} />
                <DetailItem label="Yarn Name" value={box.yarnName || "-"} />
                <DetailItem label="Shade Code" value={box.shadeCode || "-"} />
                <DetailItem
                  label="Lot Number"
                  value={box.lotNumber || "-"}
                />
                <DetailItem
                  label="Box Weight (kg)"
                  value={
                    box.boxWeight !== undefined ? String(box.boxWeight) : "-"
                  }
                />
                <DetailItem
                  label="Number of Cones"
                  value={
                    box.numberOfCones !== undefined
                      ? String(box.numberOfCones)
                      : "-"
                  }
                />
                <DetailItem
                  label="Storage Location"
                  value={box.storageLocation || "-"}
                />
                <DetailItem
                  label="Order Quantity"
                  value={
                    box.orderQty !== undefined ? String(box.orderQty) : "-"
                  }
                />
                <DetailItem
                  label="Received Date"
                  value={formatDateTime(box.receivedDate)}
                />
                <DetailItem
                  label="Updated At"
                  value={formatDateTime(box.updatedAt)}
                />
              </div>

              {box.qcData && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <i className="ri-shield-check-line text-primary"></i>
                    QC Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <DetailItem
                      label="QC Date"
                      value={formatDateTime(box.qcData.date)}
                    />
                    <DetailItem
                      label="Inspector"
                      value={box.qcData.username}
                    />
                    {box.qcData.remarks && (
                      <DetailItem label="Remarks" value={box.qcData.remarks} />
                    )}
                  </div>
                </div>
              )}

              {box.coneData && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <i className="ri-stack-line text-primary"></i>
                    Cone Issue Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              {!areAllConesCaptured && (
                <p className="text-xs text-gray-500 text-right mt-2">
                  Capture cone and tear weights for every cone to enable printing.
                </p>
              )}
            </div>
          </div>

          <div className="box">
            <div className="box-header flex justify-between items-center">
              <h3 className="box-title flex items-center gap-2">
                <i className="ri-barcode-line text-primary"></i>
                Generated Cones ({cones.length})
              </h3>
            </div>
            <div className="box-body">
              {cones.length > 0 && (
                <div className="mb-4">
                  <label className="form-label">Scan Cone Barcode</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Scan cone barcode to activate row"
                    value={barcodeScanValue}
                    onChange={(e) => setBarcodeScanValue(e.target.value)}
                    onKeyDown={handleConeBarcodeScan}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Scan a cone barcode, update cone & tear weights, then press
                    Enter to submit.
                  </p>
                </div>
              )}
              {cones.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No cones were generated for this box.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Cone Barcode
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Cone Weight (kg)
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tear Weight (kg)
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Issue Status
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Storage Location
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Created At
                        </th>
                        <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {cones.map((cone: YarnCone) => (
                        <tr
                          key={cone._id}
                          className={`hover:bg-gray-50 ${
                            activeConeId === cone._id
                              ? "bg-blue-50 border-2 border-blue-400"
                              : ""
                          }`}
                        >
                          <td className="border border-gray-300 px-4 py-3">
                            <span className="text-sm text-gray-900 font-mono">
                              {cone.barcode}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3">
                            {activeConeId === cone._id ? (
                              <input
                                type="number"
                                step="0.001"
                                className="form-control text-sm"
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
                              <span className="text-sm text-gray-900">
                                {formatWeight(cone.coneWeight)}
                              </span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-4 py-3">
                            {activeConeId === cone._id ? (
                              <input
                                type="number"
                                step="0.001"
                                className="form-control text-sm"
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
                              <span className="text-sm text-gray-900">
                                {formatWeight(cone.tearWeight)}
                              </span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-4 py-3">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                              {formatStatus(cone.issueStatus)}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3">
                            {activeConeId === cone._id ? (
                              <input
                                type="text"
                                className="form-control text-sm"
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
                              <span className="text-sm text-gray-900">
                                {cone.coneStorageId || "-"}
                              </span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-4 py-3">
                            <span className="text-sm text-gray-900">
                              {formatDateTime(cone.createdAt)}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2 min-w-[140px]">
                              {isUpdatingConeId === cone._id ? (
                                <div className="flex items-center gap-2 text-sm text-primary whitespace-nowrap">
                                  <i className="ri-loader-4-line animate-spin"></i>
                                  <span>Saving...</span>
                                </div>
                              ) : activeConeId === cone._id ? (
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary ti-btn-sm whitespace-nowrap"
                                  onClick={() => handleUpdateCone(cone)}
                                >
                                  <i className="ri-save-line me-1"></i>
                                  Save
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-outline-primary ti-btn-sm whitespace-nowrap"
                                  onClick={() => setActiveConeId(cone._id)}
                                >
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
    <label className="text-xs font-medium text-gray-600 uppercase">
      {label}
    </label>
    <div
      className={`mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border ${
        isMono ? "font-mono" : ""
      }`}
    >
      {value}
    </div>
  </div>
);

export default ProcessedBoxPage;


