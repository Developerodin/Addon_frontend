"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StyleCodeSelectModal } from "@/app/catalog/style-codes/components/StyleCodeSelectModal";
import type {
  CreateWarehouseOrderBody,
  UpdateWarehouseOrderBody,
  WarehouseClientType,
  WarehouseOrder,
  WarehouseOrderStatus,
  WarehouseOrderStyleCodeMultiPairRow,
  WarehouseOrderStyleCodeSinglePairRow,
  CatalogueAttrsEntry,
} from "@/shared/services/whmsWarehouseOrderService";
import {
  WAREHOUSE_ORDER_STATUSES,
  WAREHOUSE_ORDER_STATUS_LABELS,
  normalizeWarehouseOrderStatus,
  whmsWarehouseOrders,
} from "@/shared/services/whmsWarehouseOrderService";
import { styleCodeService } from "@/shared/services/styleCodeService";
import StyleCodePairSelectModal from "./StyleCodePairSelectModal";
import WarehouseOrderClientPicker from "./WarehouseOrderClientPicker";
import {
  mapStyleCodePairToMultiRow,
  mapStyleCodeToSingleRow,
  fetchArticleAttrsForStyleCode,
  hydrateSingleRowsFromCatalog,
} from "./warehouseOrderCatalogMaps";
import { validateWarehouseOrderBeforeSubmit } from "./warehouseOrderSubmitValidation";
import {
  diagnoseMultiPairRow,
  diagnoseSinglePairRow,
  type WarehouseOrderRowDiagnostics,
} from "./warehouseOrderRowValidation";
import WarehouseOrderRowIssuePanel, {
  warehouseOrderFieldClass,
} from "./WarehouseOrderRowIssuePanel";

const inputClass =
  "w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-[11px] font-medium text-gray-800 focus:ring-0 focus:border-purple-300 placeholder:text-gray-400";
const labelClass = "block text-[11px] font-bold text-[#495057] mb-1";
const selectClass = `${inputClass} appearance-none cursor-pointer pr-8`;

type SubmitBody = CreateWarehouseOrderBody | UpdateWarehouseOrderBody;

type Props = {
  mode: "create" | "edit";
  initialOrder?: WarehouseOrder | null;
  onSubmit: (body: SubmitBody) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
};

type FormState = {
  clientType: WarehouseClientType;
  clientId: string;
  addonOrderId: string;
  date: string;
  status: WarehouseOrderStatus;
  single: WarehouseOrderStyleCodeSinglePairRow[];
  multi: WarehouseOrderStyleCodeMultiPairRow[];
};

function toIsoDateInput(v?: string): string {
  if (!v) return "";
  try {
    return String(v).slice(0, 10);
  } catch {
    return "";
  }
}

function fromOrder(o?: WarehouseOrder | null): FormState {
  return {
    clientType: (o?.clientType ?? "Store") as WarehouseClientType,
    clientId: o?.clientId ?? "",
    addonOrderId: (o?.addonOrderId ?? "").trim(),
    date: toIsoDateInput(o?.date),
    status: normalizeWarehouseOrderStatus(o?.status),
    single:
      o?.styleCodeSinglePair?.map((r) => ({
        styleCodeId: r.styleCodeId ?? "",
        styleCode: r.styleCode ?? "",
        pack: r.pack ?? "",
        colour: r.colour ?? "",
        type: r.type ?? "",
        pattern: r.pattern ?? "",
        eanCode: r.eanCode ?? "",
        quantity: Number(r.quantity) || 0,
      })) ?? [],
    multi:
      o?.styleCodeMultiPair?.map((r) => ({
        styleCodeMultiPairId: r.styleCodeMultiPairId ?? "",
        styleCode: r.styleCode ?? "",
        pack: r.pack ?? "",
        colour: r.colour ?? "",
        type: r.type ?? "",
        pattern: r.pattern ?? "",
        eanCode: r.eanCode ?? "",
        quantity: Number(r.quantity) || 0,
      })) ?? [],
  };
}

const emptySingle = (): WarehouseOrderStyleCodeSinglePairRow => ({
  styleCodeId: "",
  styleCode: "",
  pack: "",
  colour: "",
  type: "",
  pattern: "",
  eanCode: "",
  quantity: 0,
});

const emptyMulti = (): WarehouseOrderStyleCodeMultiPairRow => ({
  styleCodeMultiPairId: "",
  styleCode: "",
  pack: "",
  colour: "",
  type: "",
  pattern: "",
  eanCode: "",
  quantity: 0,
});

function pruneRows<T extends { quantity: number }>(rows: T[]): T[] {
  return rows
    .map((r) => ({ ...r }))
    .filter((r) => {
      // keep if any field besides quantity has content OR quantity > 0
      const anyText = Object.entries(r as Record<string, unknown>).some(([k, v]) => {
        if (k === "quantity") return false;
        return typeof v === "string" ? v.trim().length > 0 : Boolean(v);
      });
      return anyText || (Number(r.quantity) || 0) > 0;
    });
}

export default function WarehouseOrderForm({
  mode,
  initialOrder,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: Props) {
  const initial = useMemo(() => fromOrder(initialOrder), [initialOrder]);
  const [s, setS] = useState<FormState>(initial);
  const [styleCodeModalIdx, setStyleCodeModalIdx] = useState<number | null>(null);
  const [pairModalIdx, setPairModalIdx] = useState<number | null>(null);
  const [singleCatalogueById, setSingleCatalogueById] = useState<
    Record<string, CatalogueAttrsEntry>
  >({});

  useEffect(() => {
    setS(initial);
  }, [initial]);

  /** On edit load, backfill colour/pattern from catalogue when order doc has blanks. */
  useEffect(() => {
    if (mode !== "edit" || !initialOrder?.id) return;
    let cancelled = false;

    const needsSingleHydrate = initial.single.some(
      (r) => r.styleCodeId && (!r.colour?.trim() || !r.pattern?.trim()),
    );
    if (!needsSingleHydrate) return;

    void (async () => {
      const single = await hydrateSingleRowsFromCatalog(initial.single);
      if (cancelled) return;
      setS((prev) => ({
        ...prev,
        single,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, initialOrder?.id, initial.single, initial.multi]);

  /** Load catalogue diagnostics (product link, stock) for single-pair styleCodeIds. */
  useEffect(() => {
    const ids = [...new Set(s.single.map((r) => r.styleCodeId).filter(Boolean))];
    if (!ids.length) {
      setSingleCatalogueById({});
      return;
    }

    let cancelled = false;
    void whmsWarehouseOrders.getCatalogueAttrs(ids).then((attrs) => {
      if (!cancelled) setSingleCatalogueById(attrs);
    });

    return () => {
      cancelled = true;
    };
  }, [s.single]);

  const singleRowDiagnostics = useMemo(
    () =>
      s.single.map((row) =>
        diagnoseSinglePairRow(row, row.styleCodeId ? singleCatalogueById[row.styleCodeId] : undefined),
      ),
    [s.single, singleCatalogueById],
  );

  const multiRowDiagnostics = useMemo(
    () => s.multi.map((row) => diagnoseMultiPairRow(row)),
    [s.multi],
  );

  const rowHasError = (diagnostics: WarehouseOrderRowDiagnostics) =>
    diagnostics.issues.some((i) => i.severity === "error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const single = pruneRows(s.single);
    const multi = pruneRows(s.multi).map((row) => ({
      ...row,
      colour: "",
      type: "",
      pattern: "",
    }));

    if (!validateWarehouseOrderBeforeSubmit(mode, s.clientId, single, multi)) return;

    if (mode === "create") {
      const body: CreateWarehouseOrderBody = {
        clientType: s.clientType,
        clientId: s.clientId.trim(),
        ...(s.addonOrderId.trim() ? { addonOrderId: s.addonOrderId.trim() } : {}),
        ...(s.date ? { date: `${s.date}T00:00:00.000Z` } : {}),
        ...(s.status ? { status: s.status } : {}),
        ...(single.length ? { styleCodeSinglePair: single } : {}),
        ...(multi.length ? { styleCodeMultiPair: multi } : {}),
      };
      await onSubmit(body);
      return;
    }

    const body: UpdateWarehouseOrderBody = {
      addonOrderId: s.addonOrderId.trim(),
      ...(s.date ? { date: `${s.date}T00:00:00.000Z` } : {}),
      ...(s.status ? { status: s.status } : {}),
      ...(single.length ? { styleCodeSinglePair: single } : { styleCodeSinglePair: [] }),
      ...(multi.length ? { styleCodeMultiPair: multi } : { styleCodeMultiPair: [] }),
    };
    await onSubmit(body);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <WarehouseOrderClientPicker
        clientType={s.clientType}
        onClientTypeChange={(t) => setS((p) => ({ ...p, clientType: t, clientId: "" }))}
        clientId={s.clientId}
        onClientIdChange={(id, client) =>
          setS((p) => ({
            ...p,
            clientId: id,
            ...(client ? { clientType: client.type } : {}),
          }))
        }
        disabled={mode === "edit"}
        clientNameFallback={initialOrder?.clientName}
      />

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 sm:col-span-4">
          <label className={labelClass}>Date</label>
          <input
            type="date"
            className={inputClass}
            value={s.date}
            onChange={(e) => setS((p) => ({ ...p, date: e.target.value }))}
          />
        </div>

        <div className="col-span-12 sm:col-span-4">
          <label className={labelClass}>Status</label>
          <div className="relative">
            <select
              className={selectClass}
              value={s.status}
              onChange={(e) =>
                setS((p) => ({ ...p, status: e.target.value as WarehouseOrderStatus }))
              }
            >
              {WAREHOUSE_ORDER_STATUSES.map((v) => (
                <option key={v} value={v}>
                  {WAREHOUSE_ORDER_STATUS_LABELS[v]}
                </option>
              ))}
            </select>
            <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
          </div>
        </div>

        <div className="col-span-12 sm:col-span-4">
          <label className={labelClass}>Addon order ID</label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. external / customer ref"
            value={s.addonOrderId}
            onChange={(e) => setS((p) => ({ ...p, addonOrderId: e.target.value }))}
            autoComplete="off"
          />
          <p className="mt-1 text-[10px] text-gray-500 font-medium">
            Optional reference (e.g. Addon order number).
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-4 bg-purple-600 rounded-full" />
            <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
              StyleCode single pair
            </h3>
            <span className="text-[10px] font-bold text-gray-500">{s.single.length}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/catalog/style-codes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-purple-600 hover:text-purple-800"
            >
              Catalog <i className="ri-external-link-line text-xs" />
            </Link>
            <button
              type="button"
              onClick={() => setS((p) => ({ ...p, single: [...p.single, emptySingle()] }))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
            >
              <i className="ri-add-line text-xs" /> Add row
            </button>
          </div>
        </div>

        {s.single.map((r, idx) => {
          const diagnostics = singleRowDiagnostics[idx];
          const hasRowError = rowHasError(diagnostics);
          return (
          <div
            key={`single-${idx}`}
            className={`border rounded p-3 bg-white ${
              hasRowError ? "border-red-300 ring-1 ring-red-100" : "border-gray-200"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-gray-700">Row {idx + 1}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStyleCodeModalIdx(idx)}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded hover:bg-purple-100"
                >
                  <i className="ri-search-line text-xs" /> Pick style code
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setS((p) => ({ ...p, single: p.single.filter((_, i) => i !== idx) }))
                  }
                  className="text-[11px] font-bold text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-2">
              {!r.styleCodeId && r.styleCode?.trim() ? (
                <p className="col-span-12 text-[10px] text-red-700 font-medium">
                  Style code text is present but not linked — use{" "}
                  <span className="font-bold">Pick style code</span>.
                </p>
              ) : !r.styleCodeId ? (
                <p className="col-span-12 text-[10px] text-amber-700 font-medium">
                  Use <span className="font-bold">Pick style code</span> — the catalog link fills this row (ids are stored automatically).
                </p>
              ) : null}
              {(
                [
                  ["styleCode", "Style code"],
                  ["eanCode", "EAN code"],
                  ["pack", "Pack"],
                  ["colour", "Colour"],
                  ["type", "Type"],
                  ["pattern", "Pattern"],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="col-span-12 sm:col-span-4">
                  <label className={labelClass}>{label}</label>
                  <input
                    className={`${inputClass} ${warehouseOrderFieldClass(k, diagnostics)} ${k === "styleCode" ? "cursor-pointer" : ""} ${k === "eanCode" ? "bg-gray-50 text-gray-700" : ""}`}
                    value={(r as Record<string, string | number>)[k] ?? ""}
                    aria-invalid={diagnostics?.invalidFields.has(k) ? true : undefined}
                    aria-describedby={
                      diagnostics?.invalidFields.has(k) ? `single-row-${idx}-${k}-issue` : undefined
                    }
                    onClick={
                      k === "styleCode" ? () => setStyleCodeModalIdx(idx) : undefined
                    }
                    onChange={
                      k === "styleCode" || k === "eanCode"
                        ? undefined
                        : (e) =>
                            setS((p) => ({
                              ...p,
                              single: p.single.map((row, i) =>
                                i === idx ? { ...row, [k]: e.target.value } : row,
                              ),
                            }))
                    }
                    readOnly={k === "styleCode" || k === "eanCode"}
                    placeholder={
                      k === "styleCode"
                        ? "Click to browse style codes..."
                        : k === "eanCode"
                          ? "Auto-filled from style code"
                          : undefined
                    }
                  />
                </div>
              ))}
              <div className="col-span-12 sm:col-span-4">
                <label className={labelClass}>Quantity*</label>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={String(r.quantity ?? 0)}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      single: p.single.map((row, i) =>
                        i === idx
                          ? { ...row, quantity: Number(e.target.value || 0) }
                          : row,
                      ),
                    }))
                  }
                  required
                />
              </div>
              <WarehouseOrderRowIssuePanel diagnostics={diagnostics} />
            </div>
          </div>
        );
        })}
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-4 bg-purple-600 rounded-full" />
            <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
              StyleCode multi pair
            </h3>
            <span className="text-[10px] font-bold text-gray-500">{s.multi.length}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/catalog/style-code-pairs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-purple-600 hover:text-purple-800"
            >
              Catalog <i className="ri-external-link-line text-xs" />
            </Link>
            <button
              type="button"
              onClick={() => setS((p) => ({ ...p, multi: [...p.multi, emptyMulti()] }))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
            >
              <i className="ri-add-line text-xs" /> Add row
            </button>
          </div>
        </div>

        {s.multi.map((r, idx) => {
          const diagnostics = multiRowDiagnostics[idx];
          const hasRowError = rowHasError(diagnostics);
          return (
          <div
            key={`multi-${idx}`}
            className={`border rounded p-3 bg-white ${
              hasRowError ? "border-red-300 ring-1 ring-red-100" : "border-gray-200"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-gray-700">Row {idx + 1}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPairModalIdx(idx)}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded hover:bg-purple-100"
                >
                  <i className="ri-search-line text-xs" /> Pick pair
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setS((p) => ({ ...p, multi: p.multi.filter((_, i) => i !== idx) }))
                  }
                  className="text-[11px] font-bold text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-2">
              {!r.styleCodeMultiPairId ? (
                <p className="col-span-12 text-[10px] text-amber-700 font-medium">
                  Use <span className="font-bold">Pick pair</span> — ids are stored automatically.
                </p>
              ) : (
                <p className="col-span-12 text-[10px] text-gray-500 font-medium">
                  Colour, type and pattern are per child style code — see Pick &amp; Pack after save.
                </p>
              )}
              {(
                [
                  ["styleCode", "Pair style code"],
                  ["eanCode", "EAN code"],
                  ["pack", "Pack"],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="col-span-12 sm:col-span-4">
                  <label className={labelClass}>{label}</label>
                  <input
                    className={`${inputClass} ${warehouseOrderFieldClass(k, diagnostics)} ${k === "eanCode" ? "bg-gray-50 text-gray-700" : ""}`}
                    value={(r as Record<string, string | number>)[k] ?? ""}
                    aria-invalid={diagnostics?.invalidFields.has(k) ? true : undefined}
                    readOnly={k === "styleCode" || k === "eanCode"}
                    placeholder={k === "eanCode" ? "Auto-filled from pair" : undefined}
                    onChange={
                      k === "styleCode" || k === "eanCode"
                        ? undefined
                        : (e) =>
                            setS((p) => ({
                              ...p,
                              multi: p.multi.map((row, i) =>
                                i === idx ? { ...row, [k]: e.target.value } : row,
                              ),
                            }))
                    }
                  />
                </div>
              ))}
              <div className="col-span-12 sm:col-span-4">
                <label className={labelClass}>Quantity*</label>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={String(r.quantity ?? 0)}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      multi: p.multi.map((row, i) =>
                        i === idx
                          ? { ...row, quantity: Number(e.target.value || 0) }
                          : row,
                      ),
                    }))
                  }
                  required
                />
              </div>
              <WarehouseOrderRowIssuePanel diagnostics={diagnostics} />
            </div>
          </div>
        );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <i className="ri-loader-4-line text-xs animate-spin" />
          ) : (
            <i className="ri-save-line text-xs" />
          )}
          {mode === "create" ? "Create order" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
        >
          <i className="ri-close-line text-xs" /> Cancel
        </button>
      </div>

      <StyleCodeSelectModal
        open={styleCodeModalIdx !== null}
        onClose={() => setStyleCodeModalIdx(null)}
        onSelect={async (sc) => {
          const idx = styleCodeModalIdx;
          if (idx === null) return;
          let fullSc = sc;
          try {
            fullSc = await styleCodeService.get(sc.id);
          } catch {
            /* use partial sc */
          }

          setS((p) => ({
            ...p,
            single: p.single.map((row, i) =>
              i === idx ? mapStyleCodeToSingleRow(fullSc, row.quantity) : row,
            ),
          }));
          setStyleCodeModalIdx(null);

          fetchArticleAttrsForStyleCode(fullSc.id, fullSc.styleCode).then(
            (attrs) => {
              if (!attrs.colour && !attrs.pattern) return;
              setS((p) => ({
                ...p,
                single: p.single.map((row, i) =>
                  i === idx
                    ? {
                        ...row,
                        colour: attrs.colour || row.colour,
                        pattern: attrs.pattern || row.pattern,
                      }
                    : row,
                ),
              }));
            },
          );
        }}
      />

      <StyleCodePairSelectModal
        open={pairModalIdx !== null}
        onClose={() => setPairModalIdx(null)}
        onSelect={(pair) => {
          const idx = pairModalIdx;
          if (idx === null) return;
          setS((p) => ({
            ...p,
            multi: p.multi.map((row, i) =>
              i === idx ? mapStyleCodePairToMultiRow(pair, row.quantity) : row,
            ),
          }));
          setPairModalIdx(null);
        }}
      />
    </form>
  );
}

