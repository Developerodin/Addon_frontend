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
} from "@/shared/services/whmsWarehouseOrderService";
import {
  WAREHOUSE_ORDER_STATUSES,
  WAREHOUSE_ORDER_STATUS_LABELS,
  normalizeWarehouseOrderStatus,
} from "@/shared/services/whmsWarehouseOrderService";
import { styleCodeService } from "@/shared/services/styleCodeService";
import StyleCodePairSelectModal from "./StyleCodePairSelectModal";
import WarehouseOrderClientPicker from "./WarehouseOrderClientPicker";
import {
  mapStyleCodePairToMultiRow,
  mapStyleCodeToSingleRow,
} from "./warehouseOrderCatalogMaps";
import { validateWarehouseOrderBeforeSubmit } from "./warehouseOrderSubmitValidation";

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
  quantity: 0,
});

const emptyMulti = (): WarehouseOrderStyleCodeMultiPairRow => ({
  styleCodeMultiPairId: "",
  styleCode: "",
  pack: "",
  colour: "",
  type: "",
  pattern: "",
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

  useEffect(() => {
    setS(initial);
  }, [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const single = pruneRows(s.single);
    const multi = pruneRows(s.multi);

    if (!validateWarehouseOrderBeforeSubmit(mode, s.clientId, single, multi)) return;

    if (mode === "create") {
      const body: CreateWarehouseOrderBody = {
        clientType: s.clientType,
        clientId: s.clientId.trim(),
        ...(s.date ? { date: `${s.date}T00:00:00.000Z` } : {}),
        ...(s.status ? { status: s.status } : {}),
        ...(single.length ? { styleCodeSinglePair: single } : {}),
        ...(multi.length ? { styleCodeMultiPair: multi } : {}),
      };
      await onSubmit(body);
      return;
    }

    const body: UpdateWarehouseOrderBody = {
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

        {s.single.map((r, idx) => (
          <div key={`single-${idx}`} className="border border-gray-200 rounded p-3 bg-white">
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
              {!r.styleCodeId ? (
                <p className="col-span-12 text-[10px] text-amber-700 font-medium">
                  Use <span className="font-bold">Pick style code</span> — the catalog link fills this row (ids are stored automatically).
                </p>
              ) : null}
              {(
                [
                  ["styleCode", "Style code"],
                  ["pack", "Pack"],
                  ["colour", "Colour"],
                  ["type", "Type"],
                  ["pattern", "Pattern"],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="col-span-12 sm:col-span-4">
                  <label className={labelClass}>{label}</label>
                  <input
                    className={`${inputClass} ${k === "styleCode" ? "cursor-pointer" : ""}`}
                    value={(r as Record<string, string | number>)[k] ?? ""}
                    onClick={
                      k === "styleCode" ? () => setStyleCodeModalIdx(idx) : undefined
                    }
                    onChange={
                      k === "styleCode"
                        ? undefined
                        : (e) =>
                            setS((p) => ({
                              ...p,
                              single: p.single.map((row, i) =>
                                i === idx ? { ...row, [k]: e.target.value } : row,
                              ),
                            }))
                    }
                    readOnly={k === "styleCode"}
                    placeholder={k === "styleCode" ? "Click to browse style codes..." : undefined}
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
            </div>
          </div>
        ))}
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

        {s.multi.map((r, idx) => (
          <div key={`multi-${idx}`} className="border border-gray-200 rounded p-3 bg-white">
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
              ) : null}
              {(
                [
                  ["styleCode", "Pair style code"],
                  ["pack", "Pack"],
                  ["colour", "Colour"],
                  ["type", "Type"],
                  ["pattern", "Pattern"],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="col-span-12 sm:col-span-4">
                  <label className={labelClass}>{label}</label>
                  <input
                    className={inputClass}
                    value={(r as Record<string, string | number>)[k] ?? ""}
                    onChange={(e) =>
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
            </div>
          </div>
        ))}
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
          try {
            const full = await styleCodeService.get(sc.id);
            setS((p) => ({
              ...p,
              single: p.single.map((row, i) =>
                i === idx ? mapStyleCodeToSingleRow(full, row.quantity) : row,
              ),
            }));
          } catch {
            setS((p) => ({
              ...p,
              single: p.single.map((row, i) =>
                i === idx ? mapStyleCodeToSingleRow(sc, row.quantity) : row,
              ),
            }));
          }
          setStyleCodeModalIdx(null);
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

