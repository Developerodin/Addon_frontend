"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import { QZTrayLoader, QZTrayStatus, QZTrayUntrustedWarning, QZTrayRequestBlocked } from "@/shared/components/qzTray";
import vendorPurchaseOrderService, { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import vendorBoxService, { VendorBox } from "@/shared/services/vendorBoxService";
import { lotDetailsForBulkBoxes } from "../../utils/vendorPoFlow";
import { dashOr, vendorCodeFromPoLineItem } from "../../components/vendorPacklistHelpers";
import {
  getVendorBoxId,
  getVendorLotReceivedLines,
  resolveVendorBoxArticleFromPo,
} from "./vendorReceiveProcessHelpers";
import {
  exportVendorBoxesExcel,
  printAllVendorBoxLabels,
  printVendorBoxLabels,
  type VendorBoxFormRow,
} from "./vendorReceiveProcessPrintExport";
import { VendorReceiveProcessBoxTables } from "./VendorReceiveProcessBoxTables";

function readVendorName(v: VendorPurchaseOrder["vendor"]): string {
  if (!v || typeof v === "string") return typeof v === "string" ? v : "";
  return v.header?.vendorName || "";
}

type Props = { orderId: string };

export function VendorReceiveProcessView({ orderId }: Props) {
  const router = useRouter();
  const [apiPo, setApiPo] = useState<VendorPurchaseOrder | null>(null);
  const [boxes, setBoxes] = useState<VendorBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBoxes, setCreatingBoxes] = useState(false);
  const [resyncingLot, setResyncingLot] = useState<string | null>(null);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [barcodeScanValue, setBarcodeScanValue] = useState("");
  const [boxData, setBoxData] = useState<Record<string, VendorBoxFormRow>>({});
  const [rawInput, setRawInput] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printingLot, setPrintingLot] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [qz, setQz] = useState({ connected: false, printer: null as { name: string } | null });
  const barcodeRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const po = await vendorPurchaseOrderService.getById(orderId, { populate: "vendor,poItems.productId" });
      setApiPo(po);
      if (po.currentStatus === "in_transit" || po.currentStatus === "submitted_to_vendor") {
        toast.error("Record goods received from Purchase Order Received first.");
        router.replace("/vendor-po/receive");
        return;
      }
      const raw = await vendorBoxService.list({ vpoNumber: po.vpoNumber, page: 1, limit: 500 });
      const list = Array.isArray(raw) ? raw : raw.results || [];
      setBoxes(list);
      setBoxData((prev) => {
        const next = { ...prev };
        for (const b of list) {
          const id = getVendorBoxId(b);
          if (!id) continue;
          const ex = next[id];
          const lot = b.lotNumber || "";
          const art = resolveVendorBoxArticleFromPo(po, b);
          next[id] = {
            productName: ex?.productName || art.productName || b.productName || "",
            articleCode: ex?.articleCode || art.code || "",
            type: ex?.type || art.type || "",
            color: ex?.color || art.color || "",
            pattern: ex?.pattern || art.pattern || "",
            lotNumber: ex?.lotNumber || lot,
            numberOfUnits: ex?.numberOfUnits || (b.numberOfUnits != null ? String(b.numberOfUnits) : ""),
          };
        }
        return next;
      });
    } catch {
      setApiPo(null);
      setBoxes([]);
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loading && boxes.length > 0 && barcodeRef.current && !activeBoxId) {
      barcodeRef.current.focus();
    }
  }, [loading, boxes.length, activeBoxId]);

  const ensureBoxes = async () => {
    if (!apiPo) return;
    setCreatingBoxes(true);
    try {
      const lotDetails = lotDetailsForBulkBoxes(apiPo.vpoNumber, apiPo.receivedLotDetails);
      if (lotDetails.length === 0) {
        toast.error("No invoice details with box counts on this PO.");
        return;
      }
      await vendorBoxService.bulkCreate({ vpoNumber: apiPo.vpoNumber, lotDetails });
      toast.success("Boxes created");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create boxes");
    } finally {
      setCreatingBoxes(false);
    }
  };

  const resyncLot = async (lot: string) => {
    if (!apiPo || !lot) return;
    const lotBoxes = boxes.filter((b) => (b.lotNumber?.trim() || "") === lot);
    if (
      !window.confirm(
        `Re-create boxes for invoice ${lot}? This deletes ${lotBoxes.length} box(es) and recreates them split by article from the invoice. Units entered on these boxes will be cleared.`
      )
    ) {
      return;
    }
    setResyncingLot(lot);
    try {
      const res = await vendorBoxService.resyncLot(apiPo.vpoNumber, lot);
      toast.success(`Re-synced invoice ${lot}: ${res.deletedCount ?? 0} removed, ${res.createdCount ?? 0} created`);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to re-sync boxes");
    } finally {
      setResyncingLot(null);
    }
  };

  const handleBarcodeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !barcodeScanValue.trim() || !apiPo) return;
    const code = barcodeScanValue.trim();
    const found = boxes.find((b) => b.barcode === code);
    if (!found) {
      toast.error("Barcode not found");
      setBarcodeScanValue("");
      return;
    }
    const bid = getVendorBoxId(found);
    const lot = found.lotNumber?.trim() || "";
    const art = resolveVendorBoxArticleFromPo(apiPo, found);
    setBoxData((prev) => ({
      ...prev,
      [bid]: {
        ...prev[bid],
        lotNumber: prev[bid]?.lotNumber || lot,
        productName: prev[bid]?.productName || art.productName || found.productName || "",
        articleCode: prev[bid]?.articleCode || art.code || "",
        type: prev[bid]?.type || art.type || "",
        color: prev[bid]?.color || art.color || "",
        pattern: prev[bid]?.pattern || art.pattern || "",
      },
    }));
    setActiveBoxId(bid);
    setBarcodeScanValue("");
    toast.success(`Box ${found.boxId || bid} activated`);
  };

  const saveBox = async (box: VendorBox) => {
    const bid = getVendorBoxId(box);
    const d = boxData[bid];
    if (!d || !apiPo) return;
    const nu = parseFloat(d.numberOfUnits);
    if (!d.lotNumber?.trim()) {
      toast.error("Invoice number required");
      return;
    }
    if (!d.productName?.trim()) {
      toast.error("Product name required");
      return;
    }
    if (Number.isNaN(nu) || nu <= 0) {
      toast.error("Units (pcs) must be > 0");
      return;
    }
    setUpdatingId(bid);
    try {
      await vendorBoxService.update(bid, {
        lotNumber: d.lotNumber.trim(),
        productName: d.productName.trim(),
        numberOfUnits: nu,
      });
      toast.success("Box saved");
      setActiveBoxId(null);
      setBarcodeScanValue("");
      await load();
      setTimeout(() => barcodeRef.current?.focus(), 120);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePrintAll = async () => {
    if (!apiPo) return;
    setIsPrinting(true);
    try {
      await printAllVendorBoxLabels(apiPo, boxes, boxData);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Print failed");
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintLot = async (lot: string, lotBoxes: VendorBox[]) => {
    if (!apiPo) return;
    if (!lotBoxes.length) {
      toast.error("No boxes to print for this invoice");
      return;
    }
    setPrintingLot(lot);
    try {
      const scopeLabel = lot === "__unassigned__" ? "unassigned boxes" : `Invoice ${lot}`;
      await printVendorBoxLabels(apiPo, lotBoxes, boxData, { scopeLabel });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Print failed");
    } finally {
      setPrintingLot(null);
    }
  };

  const handleExportExcel = () => {
    if (!apiPo) return;
    setIsExporting(true);
    try {
      exportVendorBoxesExcel(apiPo, boxes, boxData);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content !p-[10px]">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
        </div>
      </div>
    );
  }

  if (!apiPo) {
    return (
      <div className="main-content !p-[10px]">
        <Seo title="Vendor Purchase Order Process" />
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <i className="ri-inbox-line text-xl text-gray-200" />
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">PO NOT FOUND</h3>
            <Link
              href="/vendor-po/receive"
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
            >
              <i className="ri-arrow-left-line text-xs" />
              Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const poItems = apiPo.poItems || [];
  const lotRows = apiPo.receivedLotDetails || [];
  const hasLots = lotRows.length > 0;
  const vendorName = readVendorName(apiPo.vendor);

  return (
    <div className="main-content !p-[10px]">
      <QZTrayLoader />
      <QZTrayUntrustedWarning />
      <QZTrayRequestBlocked />
      <Seo title={`Process Order - ${apiPo.vpoNumber}`} />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href="/vendor-po/receive"
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Back to received orders"
              >
                <i className="ri-arrow-left-line text-sm" />
              </Link>
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800 truncate">Process Order</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm shrink-0">
                {apiPo.vpoNumber}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                <QZTrayStatus onStatusChange={(s) => setQz({ connected: s.connected, printer: s.printer })} />
              </div>
              {boxes.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleExportExcel()}
                  disabled={isExporting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded transition-colors shadow-sm ${
                    !isExporting ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isExporting ? <i className="ri-loader-4-line animate-spin text-xs" /> : <i className="ri-file-excel-2-line text-xs" />}
                  {isExporting ? "Exporting..." : "Export to Excel"}
                </button>
              )}
              {boxes.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handlePrintAll()}
                  disabled={!qz.connected || !qz.printer || isPrinting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-[11px] font-bold rounded transition-colors shadow-sm ${
                    qz.connected && qz.printer && !isPrinting ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-400 cursor-not-allowed"
                  }`}
                  title={!qz.connected ? "Start QZ Tray" : !qz.printer ? "Select printer" : "Print all labels"}
                >
                  {isPrinting ? <i className="ri-loader-4-line animate-spin text-xs" /> : <i className="ri-printer-line text-xs" />}
                  {isPrinting ? "Printing Barcodes..." : "Print All Barcodes"}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">PO Number</p>
              <p className="text-xs font-bold text-gray-900">{apiPo.vpoNumber}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Vendor</p>
              <p className="text-xs font-bold text-gray-900">{vendorName || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Status</p>
              <p className="text-xs font-bold text-gray-900">{apiPo.currentStatus}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Total Amount</p>
              <p className="text-xs font-bold text-gray-900">₹{Number(apiPo.total || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Total Items</p>
              <p className="text-xs font-bold text-gray-900">{poItems.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Total Quantity</p>
              <p className="text-xs font-bold text-gray-900">
                {poItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 mb-0.5">Boxes</p>
              <p className="text-xs font-bold text-gray-900">{boxes.length}</p>
            </div>
          </div>

          {poItems.length > 0 && (
            <div className="mb-4 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setItemsOpen(!itemsOpen)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <span className="text-xs font-bold text-gray-800">Order lines</span>
                <i className={`ri-arrow-${itemsOpen ? "up" : "down"}-s-line text-gray-600 text-sm transition-transform`} />
              </button>
              {itemsOpen && (
                <div className="px-3 pb-3 overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50/30">
                        <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                          Product
                        </th>
                        <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                          Vendor code
                        </th>
                        <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                          Type
                        </th>
                        <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                          Color
                        </th>
                        <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                          Pattern
                        </th>
                        <th className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                          Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItems.map((it, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">{it.productName || "—"}</td>
                          <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">
                            {vendorCodeFromPoLineItem(it) || "no vendor code"}
                          </td>
                          <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">{dashOr(it.type)}</td>
                          <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">{dashOr(it.color)}</td>
                          <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200">{dashOr(it.pattern)}</td>
                          <td className="px-1.5 py-2 text-[11px] text-right text-gray-700 border border-gray-200">
                            {Number(it.quantity || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {hasLots && (
            <div className="mb-4 rounded-md border border-gray-200 overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Invoice</th>
                    <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Product</th>
                    <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Vendor code</th>
                    <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Type</th>
                    <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Color</th>
                    <th className="px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Pattern</th>
                    <th className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Received qty</th>
                    <th className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Boxes</th>
                    <th className="px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Total boxes</th>
                  </tr>
                </thead>
                <tbody>
                  {lotRows.map((l) => {
                    const lines = getVendorLotReceivedLines(apiPo, l);
                    return (
                    <tr key={l.lotNumber} className="hover:bg-gray-50/50">
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200 align-top">{l.lotNumber}</td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200 align-top">
                        {lines.length === 0 ? (
                          "—"
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {lines.map((row, i) => (
                              <span key={i}>{row.productName.trim() || "—"}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200 align-top">
                        {lines.length === 0 ? (
                          "—"
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {lines.map((row, i) => (
                              <span key={i}>{row.vendorCode || "no vendor code"}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200 align-top">
                        {lines.length === 0 ? (
                          "—"
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {lines.map((row, i) => (
                              <span key={i}>{dashOr(row.type)}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200 align-top">
                        {lines.length === 0 ? (
                          "—"
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {lines.map((row, i) => (
                              <span key={i}>{dashOr(row.color)}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-1.5 py-2 text-[11px] text-gray-700 border border-gray-200 align-top">
                        {lines.length === 0 ? (
                          "—"
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {lines.map((row, i) => (
                              <span key={i}>{dashOr(row.pattern)}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-1.5 py-2 text-[11px] text-right text-gray-700 border border-gray-200 tabular-nums align-top">
                        {lines.length === 0 ? (
                          "—"
                        ) : (
                          <div className="flex flex-col gap-0.5 items-end">
                            {lines.map((row, i) => (
                              <span key={i}>{row.quantity}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-1.5 py-2 text-[11px] text-right text-gray-700 border border-gray-200 tabular-nums align-top">
                        {lines.length === 0 ? (
                          "—"
                        ) : (
                          <div className="flex flex-col gap-0.5 items-end">
                            {lines.map((row, i) => (
                              <span key={i}>{row.boxes}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-1.5 py-2 text-[11px] text-right text-gray-700 border border-gray-200 align-top">{l.numberOfBoxes}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {boxes.length === 0 && hasLots && (
            <button
              type="button"
              className="mb-4 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              disabled={creatingBoxes}
              onClick={() => void ensureBoxes()}
            >
              {creatingBoxes ? "Creating..." : "Create boxes from invoices"}
            </button>
          )}
        </div>

        {boxes.length > 0 && (
          <VendorReceiveProcessBoxTables
            apiPo={apiPo}
            boxes={boxes}
            boxData={boxData}
            setBoxData={setBoxData}
            rawInput={rawInput}
            setRawInput={setRawInput}
            activeBoxId={activeBoxId}
            setActiveBoxId={setActiveBoxId}
            updatingId={updatingId}
            saveBox={saveBox}
            onResyncLot={resyncLot}
            resyncingLot={resyncingLot}
            onPrintLot={handlePrintLot}
            printingLot={printingLot}
            qzReady={qz.connected && !!qz.printer}
            barcodeRef={barcodeRef}
            barcodeScanValue={barcodeScanValue}
            setBarcodeScanValue={setBarcodeScanValue}
            onBarcodeKey={handleBarcodeKey}
          />
        )}
      </div>
    </div>
  );
}
