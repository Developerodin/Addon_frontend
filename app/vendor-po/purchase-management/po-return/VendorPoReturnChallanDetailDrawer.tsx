"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import vendorPoReturnChallanService, {
  VendorPoReturnChallan,
  type VendorPoReturnChallanBox,
} from "@/shared/services/vendorPoReturnChallanService";
import {
  downloadVendorPoReturnChallanHtml,
  printVendorPoReturnChallan,
} from "@/shared/utils/vendorPoReturnChallanPrint";

type Tab = "overview" | "lines" | "boxes" | "transport";

type PackItem = {
  vendorProductionFlowId?: string | null;
  productName: string;
  vendorCode: string;
  quantity: number;
};
type PackBox = { boxNumber: number; boxWeight: number; items: PackItem[] };

/** Articles available to pack come from article-wise / legacy-M4 return lines (not scanned boxes). */
type ArticleOption = {
  key: string;
  vendorProductionFlowId?: string | null;
  productName: string;
  vendorCode: string;
  qty: number;
};

type VendorPoReturnChallanDetailDrawerProps = {
  challan: VendorPoReturnChallan | null;
  onClose: () => void;
  onUpdated?: (updated: VendorPoReturnChallan) => void;
};

const fmtDate = (value?: string | Date | null): string => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Detail drawer for a single vendor PO return challan snapshot.
 */
export function VendorPoReturnChallanDetailDrawer({
  challan,
  onClose,
  onUpdated,
}: VendorPoReturnChallanDetailDrawerProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [current, setCurrent] = useState<VendorPoReturnChallan | null>(challan);
  const [transportDraft, setTransportDraft] = useState({
    vehicleNo: "",
    driverName: "",
    dispatchDate: "",
    transportNotes: "",
  });
  const [savingTransport, setSavingTransport] = useState(false);
  const [boxes, setBoxes] = useState<PackBox[]>([]);
  const [boxCountInput, setBoxCountInput] = useState("");
  const [savingBoxes, setSavingBoxes] = useState(false);

  useEffect(() => {
    setTab("overview");
    setCurrent(challan);
    setTransportDraft({
      vehicleNo: challan?.transport?.vehicleNo || "",
      driverName: challan?.transport?.driverName || "",
      dispatchDate: challan?.transport?.dispatchDate
        ? String(challan.transport.dispatchDate).slice(0, 10)
        : "",
      transportNotes: challan?.transport?.transportNotes || "",
    });
    const initialBoxes: PackBox[] = (challan?.returnBoxes || []).map((b, i) => ({
      boxNumber: b.boxNumber || i + 1,
      boxWeight: Number(b.boxWeight) || 0,
      items: (b.items || []).map((it) => ({
        vendorProductionFlowId: it.vendorProductionFlowId ?? null,
        productName: it.productName || "",
        vendorCode: it.vendorCode || "",
        quantity: Number(it.quantity) || 0,
      })),
    }));
    setBoxes(initialBoxes);
    setBoxCountInput(initialBoxes.length ? String(initialBoxes.length) : "");
  }, [challan?.id, challan]);

  if (!challan || !current) return null;

  const vendor = current.vendor || {};
  const consignor = current.consignor || {};

  const articleOptions: ArticleOption[] = (current.lines || [])
    .filter((l) => l.lineType === "article" || l.lineType === "m4")
    .map((l, i) => ({
      key: l.vendorProductionFlowId || `${l.productName || "art"}-${i}`,
      vendorProductionFlowId: l.vendorProductionFlowId,
      productName: l.productName || "—",
      vendorCode: l.vendorCode || "",
      qty: l.lineType === "article" ? l.articleQuantity ?? 0 : l.m4Quantity ?? 0,
    }));
  const isArticleWiseReturn = articleOptions.length > 0;
  const hasScannedBoxes = (current.lines || []).some((l) => l.lineType === "box");

  const applyBoxCount = () => {
    const n = Math.max(0, Math.min(200, Math.round(Number(boxCountInput) || 0)));
    setBoxes((prev) => {
      const next: PackBox[] = [];
      for (let i = 0; i < n; i += 1) {
        next.push(
          prev[i] ?? { boxNumber: i + 1, boxWeight: 0, items: [] },
        );
        next[i] = { ...next[i], boxNumber: i + 1 };
      }
      return next;
    });
  };

  const updateBox = (idx: number, patch: Partial<PackBox>) =>
    setBoxes((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));

  const addBoxItem = (boxIdx: number) =>
    setBoxes((prev) =>
      prev.map((b, i) =>
        i === boxIdx
          ? { ...b, items: [...b.items, { vendorProductionFlowId: null, productName: "", vendorCode: "", quantity: 0 }] }
          : b,
      ),
    );

  const updateBoxItem = (boxIdx: number, itemIdx: number, patch: Partial<PackItem>) =>
    setBoxes((prev) =>
      prev.map((b, i) =>
        i === boxIdx
          ? { ...b, items: b.items.map((it, j) => (j === itemIdx ? { ...it, ...patch } : it)) }
          : b,
      ),
    );

  const removeBoxItem = (boxIdx: number, itemIdx: number) =>
    setBoxes((prev) =>
      prev.map((b, i) =>
        i === boxIdx ? { ...b, items: b.items.filter((_, j) => j !== itemIdx) } : b,
      ),
    );

  const onSelectArticleForItem = (boxIdx: number, itemIdx: number, key: string) => {
    const opt = articleOptions.find((o) => o.key === key);
    updateBoxItem(boxIdx, itemIdx, {
      vendorProductionFlowId: opt?.vendorProductionFlowId ?? null,
      productName: opt?.productName ?? "",
      vendorCode: opt?.vendorCode ?? "",
    });
  };

  const handleSaveBoxes = async () => {
    setSavingBoxes(true);
    try {
      const payload: VendorPoReturnChallanBox[] = boxes.map((b, i) => ({
        boxNumber: i + 1,
        boxWeight: Number(b.boxWeight) || 0,
        items: b.items
          .filter((it) => (Number(it.quantity) || 0) > 0)
          .map((it) => ({
            vendorProductionFlowId: it.vendorProductionFlowId ?? null,
            productName: it.productName,
            vendorCode: it.vendorCode,
            quantity: Math.round(Number(it.quantity) || 0),
          })),
      }));
      const updated = await vendorPoReturnChallanService.patchChallanBoxes(current.id, payload);
      setCurrent(updated);
      onUpdated?.(updated);
      toast.success("Box packing saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save boxes");
    } finally {
      setSavingBoxes(false);
    }
  };

  const packedTotalQty = boxes.reduce(
    (s, b) => s + b.items.reduce((bs, it) => bs + (Number(it.quantity) || 0), 0),
    0,
  );

  const handleSaveTransport = async () => {
    setSavingTransport(true);
    try {
      const updated = await vendorPoReturnChallanService.patchChallanTransport(current.id, {
        vehicleNo: transportDraft.vehicleNo,
        driverName: transportDraft.driverName,
        dispatchDate: transportDraft.dispatchDate || undefined,
        transportNotes: transportDraft.transportNotes,
      });
      setCurrent(updated);
      onUpdated?.(updated);
      toast.success("Transport details updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update transport");
    } finally {
      setSavingTransport(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex justify-end bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-label={`Challan ${current.challanNumber}`}
    >
      <div className="w-full max-w-lg bg-white h-full shadow-xl flex flex-col">
        <div className="px-4 py-3 border-b flex justify-between items-start">
          <div>
            <h2 className="text-sm font-bold font-mono">{current.challanNumber}</h2>
            <p className="text-[10px] text-gray-500">VPO {current.vpoNumber}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-2 border-b" role="tablist">
          {(["overview", "lines", "boxes", "transport"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1.5 capitalize ${
                tab === t ? "border-b-2 border-purple-600 text-purple-800 font-semibold" : "text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-xs space-y-3">
          {tab === "overview" && (
            <>
              <p>
                <span className="text-gray-500">Date:</span> {fmtDate(current.challanDate)}
              </p>
              <p>
                <span className="text-gray-500">Consignor:</span> {consignor.name || "ADDON HOLDINGS PRIVATE LIMITED"}
              </p>
              <p>
                <span className="text-gray-500">Vendor:</span> {vendor.name || "—"}
                {vendor.vendorCode ? (
                  <span className="text-gray-500"> · Code: {vendor.vendorCode}</span>
                ) : null}
              </p>
              <p>
                <span className="text-gray-500">Intent:</span> {current.cancellationIntent || "partial"}
              </p>
              <p>
                <span className="text-gray-500">Remark:</span> {current.remark || "—"}
              </p>
              <p>
                Boxes: {current.totals?.boxCount ?? 0} · Article qty:{" "}
                {current.totals?.articleQtyCount ?? 0} · M4 (legacy): {current.totals?.m4UnitCount ?? 0} · Total
                units: {current.totals?.totalUnits ?? 0}
              </p>
            </>
          )}

          {tab === "lines" && (
            <table className="min-w-full text-[11px]" aria-label="Challan lines">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase">
                  <th className="px-1 py-1 text-left">Type</th>
                  <th className="px-1 py-1 text-left">Ref</th>
                  <th className="px-1 py-1 text-left">Product</th>
                  <th className="px-1 py-1 text-left">Vendor Code</th>
                  <th className="px-1 py-1 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {(current.lines || []).map((line, i) => (
                  <tr key={`${line.lineType}-${i}`} className="border-t">
                    <td className="px-1 py-1">{line.lineType?.toUpperCase()}</td>
                    <td className="px-1 py-1 font-mono">{line.barcode || line.boxId || "M4"}</td>
                    <td className="px-1 py-1">{line.productName || "—"}</td>
                    <td className="px-1 py-1">{line.vendorCode || "—"}</td>
                    <td className="px-1 py-1 text-right">
                      {line.lineType === "article"
                        ? line.articleQuantity
                        : line.lineType === "m4"
                          ? line.m4Quantity
                          : line.numberOfUnits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "boxes" && (
            <div className="space-y-3">
              {!isArticleWiseReturn ? (
                <div className="rounded border border-gray-200 bg-gray-50 p-3 text-[11px] text-gray-600">
                  {hasScannedBoxes
                    ? "This return was made box-wise — boxes were physically scanned, so box packing is already captured on the return lines."
                    : "No article-wise return lines on this challan; box packing applies to article-wise returns."}
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-gray-600">
                    Article-wise return — define the boxes used to ship the goods back. Set the number of
                    boxes, then for each box add the article(s) it contains with their quantity and the box
                    weight. The return transfer note (challan) is built from this packing.
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="block">
                      <span className="text-[10px] font-bold text-gray-600">Total boxes</span>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={boxCountInput}
                        onChange={(e) => setBoxCountInput(e.target.value)}
                        className="w-24 border rounded px-2 py-1 mt-0.5"
                        aria-label="Total boxes"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={applyBoxCount}
                      className="px-3 py-1.5 bg-gray-900 text-white rounded text-xs font-semibold"
                    >
                      Set boxes
                    </button>
                    <span className="text-[10px] text-gray-500">
                      Packed: <strong>{packedTotalQty}</strong> unit(s) across{" "}
                      <strong>{boxes.length}</strong> box(es)
                    </span>
                  </div>

                  {boxes.length === 0 ? (
                    <p className="text-[11px] text-gray-400">Set a box count to begin packing.</p>
                  ) : (
                    <div className="space-y-3">
                      {boxes.map((box, bi) => (
                        <div key={bi} className="rounded-md border border-gray-200 p-2.5 space-y-2 bg-white">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-gray-800">Box {bi + 1}</span>
                            <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-600">
                              Weight (KG)
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={box.boxWeight || 0}
                                onChange={(e) => updateBox(bi, { boxWeight: Number(e.target.value) })}
                                className="w-20 border rounded px-2 py-1"
                                aria-label={`Box ${bi + 1} weight`}
                              />
                            </label>
                          </div>

                          <table className="min-w-full text-[11px]">
                            <thead>
                              <tr className="bg-gray-50 text-[10px] uppercase text-gray-600">
                                <th className="px-1 py-1 text-left">Article</th>
                                <th className="px-1 py-1 text-left">Vendor Code</th>
                                <th className="px-1 py-1 text-right">Qty</th>
                                <th className="px-1 py-1" />
                              </tr>
                            </thead>
                            <tbody>
                              {box.items.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-1 py-2 text-center text-gray-400">
                                    No articles in this box yet.
                                  </td>
                                </tr>
                              ) : (
                                box.items.map((it, ii) => {
                                  const selectedKey =
                                    articleOptions.find(
                                      (o) =>
                                        (it.vendorProductionFlowId &&
                                          o.vendorProductionFlowId === it.vendorProductionFlowId) ||
                                        (o.productName === it.productName && o.vendorCode === it.vendorCode),
                                    )?.key ?? "";
                                  return (
                                    <tr key={ii} className="border-t">
                                      <td className="px-1 py-1">
                                        <select
                                          value={selectedKey}
                                          onChange={(e) => onSelectArticleForItem(bi, ii, e.target.value)}
                                          className="w-full border rounded px-1 py-1"
                                          aria-label="Article in box"
                                        >
                                          <option value="">Select article…</option>
                                          {articleOptions.map((o) => (
                                            <option key={o.key} value={o.key}>
                                              {o.productName} (avail {o.qty})
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-1 py-1 text-gray-600">{it.vendorCode || "—"}</td>
                                      <td className="px-1 py-1 text-right">
                                        <input
                                          type="number"
                                          min={0}
                                          value={it.quantity || 0}
                                          onChange={(e) =>
                                            updateBoxItem(bi, ii, { quantity: Number(e.target.value) })
                                          }
                                          className="w-16 border rounded px-1 py-0.5 text-right"
                                          aria-label="Quantity"
                                        />
                                      </td>
                                      <td className="px-1 py-1 text-right">
                                        <button
                                          type="button"
                                          onClick={() => removeBoxItem(bi, ii)}
                                          className="text-red-600 underline text-[10px]"
                                        >
                                          Remove
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                          <button
                            type="button"
                            onClick={() => addBoxItem(bi)}
                            className="text-[10px] font-semibold text-purple-700 underline"
                          >
                            + Add article
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={savingBoxes}
                    onClick={() => void handleSaveBoxes()}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-semibold disabled:opacity-50"
                  >
                    {savingBoxes ? "Saving…" : "Save box packing"}
                  </button>
                </>
              )}
            </div>
          )}

          {tab === "transport" && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-[10px] font-bold text-gray-600">Vehicle no</span>
                <input
                  type="text"
                  value={transportDraft.vehicleNo}
                  onChange={(e) => setTransportDraft((d) => ({ ...d, vehicleNo: e.target.value }))}
                  className="w-full border rounded px-2 py-1 mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-gray-600">Driver</span>
                <input
                  type="text"
                  value={transportDraft.driverName}
                  onChange={(e) => setTransportDraft((d) => ({ ...d, driverName: e.target.value }))}
                  className="w-full border rounded px-2 py-1 mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-gray-600">Dispatch date</span>
                <input
                  type="date"
                  value={transportDraft.dispatchDate}
                  onChange={(e) => setTransportDraft((d) => ({ ...d, dispatchDate: e.target.value }))}
                  className="w-full border rounded px-2 py-1 mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-gray-600">Notes</span>
                <textarea
                  value={transportDraft.transportNotes}
                  onChange={(e) => setTransportDraft((d) => ({ ...d, transportNotes: e.target.value }))}
                  rows={2}
                  className="w-full border rounded px-2 py-1 mt-0.5"
                />
              </label>
              <button
                type="button"
                disabled={savingTransport}
                onClick={() => void handleSaveTransport()}
                className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-semibold disabled:opacity-50"
              >
                Save transport
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <button
            type="button"
            onClick={() => void printVendorPoReturnChallan(current)}
            className="flex-1 py-2 bg-gray-900 text-white rounded text-xs font-semibold"
          >
            Print
          </button>
          <button
            type="button"
            onClick={() => void downloadVendorPoReturnChallanHtml(current)}
            className="flex-1 py-2 border rounded text-xs font-semibold"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
