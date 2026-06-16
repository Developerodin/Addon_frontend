"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  collectVendorProductionFlowIdsFromContainer,
  containersMasterService,
  type ContainerMaster,
  type VendorReceiveAcceptPayload,
} from "@/shared/services/containersMasterService";
import vendorProductionFlowService, {
  type VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import { getStyleCodesByVendorCode, type StyleCodeByVendorRow } from "@/shared/services/productService";
import { resolveVendorCodeForStyleLookup } from "../branding/brandingFloorUtils";
import { allowedStyleCodeIdsFromInbound } from "../final-checking/finalCheckingInboundAggregates";
import {
  buildBrandSelectOptions,
  styleOptionId,
  toVendorTransferItems,
  type TransferredStyleRowDraft,
} from "../utils/transferredStyleRows";

const MONGO_ID_RE = /^[a-f0-9]{24}$/i;

type Props = {
  container: ContainerMaster;
  onScanAnother: () => void;
  onAccepted: () => void | Promise<void>;
};

/**
 * Dispatch-floor accept: POST …/accept with `vendorReceive` (total qty and/or style lines), mirroring Final QC patterns.
 */
export function VendorDispatchReceivePanel({
  container,
  onScanAnother,
  onAccepted,
}: Props) {
  const flowIds = useMemo(() => collectVendorProductionFlowIdsFromContainer(container), [container]);
  const [selectedFlowId, setSelectedFlowId] = useState(() =>
    flowIds.length > 1 ? "" : flowIds[0] ?? "",
  );
  const [manualFlowId, setManualFlowId] = useState("");
  const [useStyleLines, setUseStyleLines] = useState(false);
  const [qtyInput, setQtyInput] = useState(
    () => String(Math.max(0, Math.floor(Number(container.quantity ?? 0))) || ""),
  );
  const [rows, setRows] = useState<TransferredStyleRowDraft[]>([
    { styleCodeId: "", brand: "", transferred: 0 },
  ]);
  const [flow, setFlow] = useState<VendorProductionFlow | null>(null);
  const [styleOptions, setStyleOptions] = useState<StyleCodeByVendorRow[]>([]);
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);

  useEffect(() => {
    setSelectedFlowId(flowIds.length > 1 ? "" : flowIds[0] ?? "");
    setManualFlowId("");
    setQtyInput(String(Math.max(0, Math.floor(Number(container.quantity ?? 0))) || ""));
  }, [container.barcode, flowIds.join("|")]);

  const effectiveFlowId = useMemo(() => {
    if (flowIds.length === 1) return flowIds[0];
    if (flowIds.length > 1) return selectedFlowId.trim();
    return manualFlowId.trim();
  }, [flowIds, selectedFlowId, manualFlowId]);

  const loadFlowAndStyles = useCallback(async () => {
    const id = effectiveFlowId;
    if (!id || !MONGO_ID_RE.test(id)) {
      setFlow(null);
      setStyleOptions([]);
      return;
    }
    setLoadingFlow(true);
    try {
      const f = await vendorProductionFlowService.getById(id);
      setFlow(f);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load batch";
      toast.error(msg);
      setFlow(null);
      setStyleOptions([]);
    } finally {
      setLoadingFlow(false);
    }
  }, [effectiveFlowId]);

  useEffect(() => {
    void loadFlowAndStyles();
  }, [loadFlowAndStyles]);

  const loadStyles = useCallback(async () => {
    if (!flow) return;
    setLoadingStyles(true);
    try {
      const vc = await resolveVendorCodeForStyleLookup(flow);
      if (!vc) {
        toast.error("Could not resolve vendor code for style lookup.");
        setStyleOptions([]);
        return;
      }
      const res = await getStyleCodesByVendorCode(vc);
      setStyleOptions(res.styleCodes ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load styles";
      toast.error(msg);
      setStyleOptions([]);
    } finally {
      setLoadingStyles(false);
    }
  }, [flow]);

  useEffect(() => {
    if (flow) void loadStyles();
  }, [flow?.id, loadStyles]);

  useEffect(() => {
    if (!styleOptions.length) return;
    setRows((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        const sid = r.styleCodeId.trim();
        if (!sid || r.brand.trim()) return r;
        const opt = styleOptions.find((o) => styleOptionId(o) === sid);
        if (!opt) return r;
        const b = (opt.brand ?? "").trim();
        if (b === r.brand) return r;
        changed = true;
        return { ...r, brand: b };
      });
      return changed ? next : prev;
    });
  }, [styleOptions]);

  const allowedStyleCodeIds = useMemo(
    () => allowedStyleCodeIdsFromInbound(flow?.floorQuantities?.finalChecking?.receivedData ?? []),
    [flow?.floorQuantities?.finalChecking?.receivedData],
  );

  const filteredStyleOptions = useMemo(() => {
    if (!allowedStyleCodeIds.size) return styleOptions;
    return styleOptions.filter((s) => {
      const sid = styleOptionId(s);
      return sid && allowedStyleCodeIds.has(sid);
    });
  }, [styleOptions, allowedStyleCodeIds]);

  const brandSelectOptions = useMemo(
    () =>
      buildBrandSelectOptions(
        styleOptions,
        allowedStyleCodeIds.size ? allowedStyleCodeIds : undefined,
      ),
    [styleOptions, allowedStyleCodeIds],
  );

  const updateRow = (index: number, patch: Partial<TransferredStyleRowDraft>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        ...patch,
        transferred: Math.max(0, Number((patch.transferred ?? next[index].transferred) || 0)),
      };
      return next;
    });
  };

  const onStyleSelect = (index: number, styleId: string) => {
    if (!styleId) {
      updateRow(index, { styleCodeId: "", brand: "" });
      return;
    }
    const list = filteredStyleOptions.length ? filteredStyleOptions : styleOptions;
    const opt = list.find((o) => styleOptionId(o) === styleId);
    updateRow(index, {
      styleCodeId: styleId,
      brand: (opt?.brand ?? "").trim(),
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, { styleCodeId: "", brand: "", transferred: 0 }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  /**
   * Builds `vendorProductionFlow` hint for the accept body: omit when exactly one flow on the container.
   */
  const buildFlowKey = (): { vendorProductionFlow?: string; error?: string } => {
    if (flowIds.length === 1) return {};
    if (flowIds.length > 1) {
      const id = selectedFlowId.trim();
      if (!id) return { error: "Select which vendor batch this bag belongs to." };
      if (!MONGO_ID_RE.test(id)) return { error: "Invalid batch id." };
      return { vendorProductionFlow: id };
    }
    const id = manualFlowId.trim();
    if (!MONGO_ID_RE.test(id)) {
      return { error: "Enter vendor production flow id (24-character id) — none was found on the container." };
    }
    return { vendorProductionFlow: id };
  };

  const accept = async () => {
    if (!container.barcode?.trim()) return;
    const flowKey = buildFlowKey();
    if (flowKey.error) {
      toast.error(flowKey.error);
      return;
    }

    let vendorReceive: VendorReceiveAcceptPayload = { ...flowKey };

    if (useStyleLines) {
      const list = filteredStyleOptions.length ? filteredStyleOptions : styleOptions;
      const rawItems = toVendorTransferItems(rows, list);
      const transferItems = rawItems
        .filter((t) => (Number(t.transferred) || 0) > 0)
        .map((t) => ({
          transferred: Math.max(0, Number(t.transferred) || 0),
          styleCode: String(t.styleCode ?? "").trim(),
          brand: String(t.brand ?? "").trim(),
        }));
      if (!transferItems.length) {
        toast.error("Add at least one style line with quantity > 0.");
        return;
      }
      if (transferItems.some((t) => !t.styleCode || !t.brand)) {
        toast.error("Each style line needs a style and brand.");
        return;
      }
      vendorReceive = { ...vendorReceive, transferItems };
    } else {
      const n = Math.max(0, Math.floor(Number(qtyInput) || 0));
      if (n < 1) {
        toast.error("Enter a received quantity (≥ 1) or switch to style lines.");
        return;
      }
      vendorReceive = { ...vendorReceive, quantity: n };
    }

    setAcceptLoading(true);
    try {
      await containersMasterService.acceptByBarcode(container.barcode.trim(), { vendorReceive });
      try {
        await containersMasterService.clearActiveByBarcode(container.barcode.trim());
      } catch {
        /* best-effort */
      }
      toast.success("Accepted on Dispatch. WHMS inward lines still require promote + count there.");
      await onAccepted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setAcceptLoading(false);
    }
  };

  const styleListBusy = loadingFlow || loadingStyles;

  return (
    <div className="space-y-3 border-t border-gray-200 pt-3 mt-1">
      <p className="text-[10px] text-gray-600 leading-snug">
        Enter total qty <strong>or</strong> style breakdown (not both). Warehouse inward rows appear only after WHMS{" "}
        <span className="font-mono text-[9px]">promote-vendor-dispatch</span>, not from this accept.
      </p>

      {flowIds.length > 1 ? (
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-[#495057]">Vendor batch for this bag</label>
          <select
            value={selectedFlowId}
            onChange={(e) => setSelectedFlowId(e.target.value)}
            disabled={acceptLoading}
            className="w-full border border-gray-200 rounded pl-2 pr-2 py-1.5 text-[11px] font-medium focus:ring-0 focus:border-purple-300"
          >
            <option value="">Select batch…</option>
            {flowIds.map((id) => (
              <option key={id} value={id}>
                {id.slice(-8)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {flowIds.length === 0 ? (
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-[#495057]">
            Vendor production flow id <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={manualFlowId}
            onChange={(e) => setManualFlowId(e.target.value)}
            placeholder="24-character id"
            disabled={acceptLoading}
            className="w-full border border-gray-200 rounded pl-3 pr-3 py-1.5 text-[11px] font-mono focus:ring-0 focus:border-purple-300"
            autoComplete="off"
          />
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-[11px] font-medium text-gray-800 cursor-pointer">
        <input
          type="checkbox"
          checked={useStyleLines}
          onChange={(e) => setUseStyleLines(e.target.checked)}
          disabled={acceptLoading || styleListBusy}
          className="rounded border-gray-300"
        />
        Brand lines (like Final QC)
      </label>

      {!useStyleLines ? (
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-[#495057]">Received quantity</label>
          <input
            type="number"
            min={1}
            step={1}
            value={qtyInput}
            onChange={(e) => setQtyInput(e.target.value)}
            disabled={acceptLoading}
            className="w-full border border-gray-200 rounded pl-3 pr-3 py-1.5 text-[11px] font-medium focus:ring-0 focus:border-purple-300"
          />
        </div>
      ) : (
        <div className="space-y-2">
          {allowedStyleCodeIds.size > 0 && brandSelectOptions.length === 0 && !styleListBusy ? (
            <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded p-2">
              Inbound style ids do not match catalog — try refreshing or pick from full list below.
            </p>
          ) : null}
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-2 border border-gray-100 rounded-lg p-2 bg-gray-50/80 sm:grid-cols-[1fr_minmax(0,88px)_auto]"
            >
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Brand</label>
                <select
                  value={row.styleCodeId}
                  onChange={(e) => onStyleSelect(index, e.target.value)}
                  disabled={acceptLoading || styleListBusy}
                  className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] font-medium focus:ring-0 focus:border-purple-300"
                  aria-label="Select brand"
                >
                  <option value="">Select brand…</option>
                  {brandSelectOptions.map((opt) => (
                    <option key={opt.styleCodeId} value={opt.styleCodeId}>
                      {opt.brand}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Qty</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={row.transferred || ""}
                  onChange={(e) => updateRow(index, { transferred: Math.max(0, Number(e.target.value) || 0) })}
                  disabled={acceptLoading || styleListBusy}
                  className="w-full border border-gray-200 rounded px-2 py-1 text-[11px] font-medium text-right tabular-nums"
                />
              </div>
              <div className="flex items-end justify-end gap-1">
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={acceptLoading || rows.length <= 1}
                  className="px-2 py-1 text-[10px] font-bold rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addRow}
            disabled={acceptLoading || styleListBusy}
            className="text-[10px] font-bold text-purple-700 hover:text-purple-900"
          >
            + Add line
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={acceptLoading || loadingFlow}
        onClick={() => void accept()}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {acceptLoading ? "Accepting…" : "Accept on Dispatch"}
      </button>
      <button
        type="button"
        onClick={onScanAnother}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 w-full"
        disabled={acceptLoading}
      >
        Scan another
      </button>
    </div>
  );
}
