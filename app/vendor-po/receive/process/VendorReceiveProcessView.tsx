"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import { QZTrayLoader, QZTrayStatus, QZTrayUntrustedWarning, QZTrayRequestBlocked } from "@/shared/components/qzTray";
import { fetchWeightLatest } from "@/shared/data/utilities/weightApi";
import vendorPurchaseOrderService, { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import vendorBoxService, { VendorBox } from "@/shared/services/vendorBoxService";
import { lotDetailsForBulkBoxes } from "../../utils/vendorPoFlow";
import { getVendorBoxId, getVendorLotReceivedLines, getVendorPoItemOptionsForLot } from "./vendorReceiveProcessHelpers";
import {
  exportVendorBoxesExcel,
  printAllVendorBoxLabels,
  type VendorBoxFormRow,
} from "./vendorReceiveProcessPrintExport";
import { VendorReceiveProcessBoxTables } from "./VendorReceiveProcessBoxTables";
import { CRM } from "../../vendor-list/crmUiClasses";

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
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [barcodeScanValue, setBarcodeScanValue] = useState("");
  const [boxData, setBoxData] = useState<Record<string, VendorBoxFormRow>>({});
  const [rawInput, setRawInput] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFetchingWeight, setIsFetchingWeight] = useState(false);
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
          const opts = lot ? getVendorPoItemOptionsForLot(po, lot) : [];
          const def = opts[0];
          next[id] = {
            productName: ex?.productName || b.productName || def?.productName || "",
            articleCode: ex?.articleCode || def?.code || "",
            lotNumber: ex?.lotNumber || lot,
            grossWeight: ex?.grossWeight || (b.grossWeight != null ? String(b.grossWeight) : ""),
            boxWeight: ex?.boxWeight || (b.boxWeight != null ? String(b.boxWeight) : ""),
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

  const fetchLatestWeight = useCallback(async (): Promise<number | null> => {
    try {
      setIsFetchingWeight(true);
      return await fetchWeightLatest("boxes");
    } catch {
      return null;
    } finally {
      setIsFetchingWeight(false);
    }
  }, []);

  useEffect(() => {
    if (!activeBoxId || !apiPo) return;
    void (async () => {
      const w = await fetchLatestWeight();
      if (w != null && w > 0) {
        setBoxData((prev) => ({
          ...prev,
          [activeBoxId]: { ...prev[activeBoxId], grossWeight: String(w) },
        }));
        setTimeout(() => {
          const el = document.querySelector(`input[data-vb-w="${activeBoxId}"]`) as HTMLInputElement | null;
          el?.focus();
          el?.select();
        }, 200);
      }
    })();
  }, [activeBoxId, apiPo, fetchLatestWeight]);

  const ensureBoxes = async () => {
    if (!apiPo) return;
    setCreatingBoxes(true);
    try {
      const lotDetails = lotDetailsForBulkBoxes(apiPo.vpoNumber, apiPo.receivedLotDetails);
      if (lotDetails.length === 0) {
        toast.error("No lot details with box counts on this PO.");
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
    const opts = lot ? getVendorPoItemOptionsForLot(apiPo, lot) : [];
    const first = opts[0];
    setBoxData((prev) => ({
      ...prev,
      [bid]: {
        ...prev[bid],
        lotNumber: prev[bid]?.lotNumber || lot,
        productName: prev[bid]?.productName || first?.productName || found.productName || "",
        articleCode: prev[bid]?.articleCode || first?.code || "",
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
    const gw = parseFloat(d.grossWeight);
    const bw = parseFloat(d.boxWeight);
    const nu = parseFloat(d.numberOfUnits);
    if (!d.lotNumber?.trim()) {
      toast.error("Lot number required");
      return;
    }
    if (!d.productName?.trim()) {
      toast.error("Product name required");
      return;
    }
    if (Number.isNaN(bw) || bw <= 0) {
      toast.error("Net weight must be > 0");
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
        grossWeight: Number.isNaN(gw) ? undefined : gw,
        boxWeight: bw,
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
      <div className={CRM.mainContent}>
        <div className={CRM.loadingWrap}>
          <div className={CRM.spinner} />
          <p className={CRM.loadingLabel}>Loading</p>
        </div>
      </div>
    );
  }

  if (!apiPo) {
    return (
      <div className={CRM.mainContent}>
        <Seo title="Vendor PO Process" />
        <div className={`${CRM.card} ${CRM.emptyWrap}`}>
          <p className={`${CRM.emptySub} mb-4`}>PO not found.</p>
          <Link href="/vendor-po/receive" className={CRM.btnPrimary}>
            Back
          </Link>
        </div>
      </div>
    );
  }

  const poItems = apiPo.poItems || [];
  const lotRows = apiPo.receivedLotDetails || [];
  const hasLots = lotRows.length > 0;
  const vendorName = readVendorName(apiPo.vendor);

  return (
    <div className={CRM.mainContent}>
      <QZTrayLoader />
      <QZTrayUntrustedWarning />
      <QZTrayRequestBlocked />
      <Seo title={`Process — ${apiPo.vpoNumber}`} />

      <div className={CRM.card}>
        <div className={CRM.cardBody}>
          <div className={CRM.titleRow}>
            <div className={`${CRM.titleWithAccent} min-w-0`}>
              <Link href="/vendor-po/receive" className={`${CRM.linkAccent} inline-flex p-1 rounded hover:bg-gray-100`} title="Back">
                <i className="ri-arrow-left-line text-sm" />
              </Link>
              <div className={CRM.titleAccent} />
              <h1 className={`${CRM.pageTitle} truncate`}>Process receipt</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">{apiPo.vpoNumber}</span>
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
                  className={CRM.btnSuccess}
                >
                  {isExporting ? <i className="ri-loader-4-line animate-spin text-xs" /> : <i className="ri-file-excel-2-line text-xs" />}
                  Export Excel
                </button>
              )}
              {boxes.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handlePrintAll()}
                  disabled={!qz.connected || !qz.printer || isPrinting}
                  className={CRM.btnPrimary}
                  title={!qz.connected ? "Start QZ Tray" : !qz.printer ? "Select printer" : "Print all labels"}
                >
                  {isPrinting ? <i className="ri-loader-4-line animate-spin text-xs" /> : <i className="ri-printer-line text-xs" />}
                  Print all barcodes
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
            <div>
              <p className="text-[10px] uppercase text-gray-500">Vendor</p>
              <p className="font-bold text-[#323251]">{vendorName || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500">Status</p>
              <p className="font-bold text-[#323251]">{apiPo.currentStatus}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500">Total</p>
              <p className="font-bold text-[#323251]">₹{Number(apiPo.total || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500">Boxes</p>
              <p className="font-bold text-[#323251]">{boxes.length}</p>
            </div>
          </div>

          {poItems.length > 0 && (
            <div className="mb-4 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setItemsOpen(!itemsOpen)}
                className={`${CRM.btnSecondary} w-full justify-between`}
              >
                <span className="text-xs font-bold text-gray-800">Order lines</span>
                <i className={`ri-arrow-${itemsOpen ? "up" : "down"}-s-line`} />
              </button>
              {itemsOpen && (
                <div className="px-3 pb-3 overflow-x-auto">
                  <table className={CRM.table}>
                    <thead>
                      <tr className={CRM.theadTr}>
                        <th className={CRM.th}>Product</th>
                        <th className={CRM.thRight}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItems.map((it, i) => (
                        <tr key={i} className={CRM.tbodyTr}>
                          <td className={CRM.td}>{it.productName || "—"}</td>
                          <td className={`${CRM.td} text-right`}>{Number(it.quantity || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {hasLots && (
            <div className={`${CRM.tableWrap} mb-4 rounded-md border border-gray-200`}>
              <table className={CRM.table}>
                <thead>
                  <tr className={CRM.theadTr}>
                    <th className={CRM.th}>Lot</th>
                    <th className={CRM.th}>Product</th>
                    <th className={CRM.thRight}>Received qty</th>
                    <th className={CRM.thRight}>Boxes (expected)</th>
                  </tr>
                </thead>
                <tbody>
                  {lotRows.map((l) => {
                    const lines = getVendorLotReceivedLines(apiPo, l);
                    return (
                    <tr key={l.lotNumber} className={CRM.tbodyTr}>
                      <td className={CRM.td}>{l.lotNumber}</td>
                      <td className={CRM.td}>
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
                      <td className={`${CRM.td} text-right tabular-nums`}>
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
                      <td className={`${CRM.td} text-right`}>{l.numberOfBoxes}</td>
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
              className={`${CRM.btnPrimary} mb-4`}
              disabled={creatingBoxes}
              onClick={() => void ensureBoxes()}
            >
              {creatingBoxes ? "Creating…" : "Create boxes from lots"}
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
            barcodeRef={barcodeRef}
            barcodeScanValue={barcodeScanValue}
            setBarcodeScanValue={setBarcodeScanValue}
            onBarcodeKey={handleBarcodeKey}
            isFetchingWeight={isFetchingWeight}
          />
        )}
      </div>
    </div>
  );
}
