"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import FormulaDrawer from "@/shared/components/production/FormulaDrawer";
import {
  listMachineOrderAssignments,
  type MachineOrderAssignment,
} from "@/shared/services/machineOrderAssignmentService";
import { machinesService, type Machine } from "@/shared/services/machinesService";
import {
  NEEDLE_WISE_COLUMN_FORMULAS,
  NEEDLE_WISE_IDENTITY,
  NEEDLE_WISE_IDENTITY_EXAMPLE,
  type NeedleWiseColumnKey,
} from "../utils/needleWiseFormulas";
import {
  buildNeedleWiseRows,
  DEFAULT_DAILY_RATE_PER_MACHINE,
  type NeedleRemark,
  type NeedleWiseReport,
} from "../utils/needleWiseProduction";
import { printNeedleWiseTable } from "../utils/needleWisePrint";

/** Upper bound on rows pulled from the paginated list endpoints. */
const FETCH_LIMIT = 1000;

const DAILY_RATE_STORAGE_KEY = "knitting.needleWise.dailyRate";

const EMPTY_REPORT: NeedleWiseReport = {
  rows: [],
  totals: { needleCount: 0, inactiveMachines: 0, activeMachines: 0, pendingQty: 0, daysRequired: null },
};

const REMARK_TONE_CLASSES: Record<NeedleRemark["tone"], string> = {
  danger: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  neutral: "bg-gray-100 text-gray-600 border-gray-200",
};

const HEADER_BASE_CLASS =
  "px-2 py-2 text-[10px] font-bold text-gray-700 uppercase tracking-wider border-b border-r last:border-r-0 border-gray-300 whitespace-nowrap";

export interface NeedleWiseProductionTabProps {
  /** When this changes, data is refetched (e.g. after an update in the parent). */
  refreshTrigger?: number;
}

interface ColumnHeaderProps {
  label: string;
  columnKey: NeedleWiseColumnKey;
  align?: "left" | "right";
  onOpenFormula: (key: NeedleWiseColumnKey) => void;
}

/** Table header cell with an info button that opens the column's formula drawer. */
function ColumnHeader({ label, columnKey, align = "left", onOpenFormula }: ColumnHeaderProps) {
  return (
    <th scope="col" className={`${HEADER_BASE_CLASS} ${align === "right" ? "text-right" : "text-left"}`}>
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        <button
          type="button"
          className="p-0.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label={`How ${label} is calculated`}
          title={`How ${label} is calculated`}
          onClick={() => onOpenFormula(columnKey)}
        >
          <i className="ri-information-line text-xs" aria-hidden="true" />
        </button>
      </span>
    </th>
  );
}

/** Reads the saved daily rate, falling back to the default. */
function readStoredDailyRate(): number {
  if (typeof window === "undefined") return DEFAULT_DAILY_RATE_PER_MACHINE;
  const stored = Number(window.localStorage.getItem(DAILY_RATE_STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : DEFAULT_DAILY_RATE_PER_MACHINE;
}

/** Ensures every machine has a usable `id`, since the API may return `_id`. */
function normalizeMachines(results: Machine[]): Machine[] {
  return results
    .map((machine) => ({
      ...machine,
      id: String(machine.id ?? (machine as { _id?: string })._id ?? ""),
    }))
    .filter((machine) => machine.id);
}

/** Formats a numeric cell, showing a dash for values that cannot be computed. */
function formatNumber(value: number | null): string {
  return value === null ? "-" : value.toLocaleString();
}

/**
 * Needle-wise view of knitting capacity: machines and pending quantity grouped
 * by needle size, with the days needed to clear each needle's queue.
 */
export default function NeedleWiseProductionTab({ refreshTrigger }: NeedleWiseProductionTabProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [assignments, setAssignments] = useState<MachineOrderAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyRate, setDailyRate] = useState(DEFAULT_DAILY_RATE_PER_MACHINE);
  const [rateInput, setRateInput] = useState(String(DEFAULT_DAILY_RATE_PER_MACHINE));
  const [formulaColumn, setFormulaColumn] = useState<NeedleWiseColumnKey | null>(null);

  useEffect(() => {
    const stored = readStoredDailyRate();
    setDailyRate(stored);
    setRateInput(String(stored));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [machinesRes, assignmentsRes] = await Promise.all([
        machinesService.getMachines(1, FETCH_LIMIT, ""),
        listMachineOrderAssignments({ page: 1, limit: FETCH_LIMIT }),
      ]);
      setMachines(normalizeMachines(machinesRes.results ?? []));
      setAssignments(assignmentsRes.results ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load needle wise planning data");
      setMachines([]);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const report = useMemo(
    () => (machines.length === 0 ? EMPTY_REPORT : buildNeedleWiseRows(machines, assignments, dailyRate)),
    [machines, assignments, dailyRate],
  );

  /** Commits the daily rate input, ignoring blank or non-positive values. */
  const handleRateCommit = useCallback(() => {
    const parsed = Number(rateInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRateInput(String(dailyRate));
      toast.error("Daily rate must be greater than 0");
      return;
    }
    setDailyRate(parsed);
    setRateInput(String(parsed));
    try {
      window.localStorage.setItem(DAILY_RATE_STORAGE_KEY, String(parsed));
    } catch (e) {
      console.warn("Could not save the daily rate preference", e);
    }
  }, [rateInput, dailyRate]);

  const handlePrint = useCallback(() => {
    try {
      printNeedleWiseTable(report.rows, report.totals, dailyRate);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to print");
    }
  }, [report, dailyRate]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
        <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
      </div>
    );
  }

  return (
    <div className="p-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-[12px] font-bold text-gray-800">Needle Wise Production Planning</h3>

        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="needle-wise-daily-rate"
            className="text-[11px] font-medium text-gray-600 whitespace-nowrap"
          >
            Daily rate / machine
          </label>
          <input
            id="needle-wise-daily-rate"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
            onBlur={handleRateCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            aria-describedby="needle-wise-daily-rate-hint"
            className="w-20 px-2 py-1.5 border border-gray-300 rounded text-[11px] font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <span id="needle-wise-daily-rate-hint" className="sr-only">
            Pieces one machine is expected to knit per day. Used to calculate the number of days column.
          </span>

          <button
            type="button"
            onClick={handlePrint}
            disabled={report.rows.length === 0}
            aria-label="Print needle wise production planning"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="ri-printer-line text-xs" aria-hidden="true" />
            Print
          </button>
          <button
            type="button"
            onClick={fetchData}
            aria-label="Refresh needle wise production planning"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[11px] font-bold rounded hover:bg-gray-50"
          >
            <i className="ri-refresh-line text-xs" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full border-collapse min-w-full">
          <caption className="sr-only">
            Knitting machines and pending quantity grouped by needle size, with days required to clear each
            queue at {dailyRate} pieces per machine per day.
          </caption>
          <thead>
            <tr className="bg-gray-100">
              <ColumnHeader label="Machine Needle" columnKey="needle" onOpenFormula={setFormulaColumn} />
              <ColumnHeader
                label="Inactive Machine"
                columnKey="inactiveMachines"
                align="right"
                onOpenFormula={setFormulaColumn}
              />
              <ColumnHeader
                label="Active Machine"
                columnKey="activeMachines"
                align="right"
                onOpenFormula={setFormulaColumn}
              />
              <ColumnHeader
                label="Knitting Pending QTY"
                columnKey="pendingQty"
                align="right"
                onOpenFormula={setFormulaColumn}
              />
              <ColumnHeader
                label="No of days"
                columnKey="daysRequired"
                align="right"
                onOpenFormula={setFormulaColumn}
              />
              <ColumnHeader label="Remark" columnKey="remark" onOpenFormula={setFormulaColumn} />
            </tr>
          </thead>

          <tbody>
            {report.rows.map((row, idx) => (
              <tr key={row.needle} className={idx % 2 === 1 ? "bg-gray-50/50" : ""}>
                <th
                  scope="row"
                  className="px-2 py-2 text-left text-[11px] font-bold text-gray-800 border-b border-r border-gray-300 whitespace-nowrap"
                >
                  {row.needle}
                </th>
                <td className="px-2 py-2 text-right text-[11px] text-gray-800 border-b border-r border-gray-300 whitespace-nowrap">
                  {row.inactiveMachines.toLocaleString()}
                </td>
                <td className="px-2 py-2 text-right text-[11px] text-gray-800 border-b border-r border-gray-300 whitespace-nowrap">
                  {row.activeMachines.toLocaleString()}
                </td>
                <td className="px-2 py-2 text-right text-[11px] font-medium text-gray-800 border-b border-r border-gray-300 whitespace-nowrap">
                  {row.pendingQty.toLocaleString()}
                </td>
                <td className="px-2 py-2 text-right text-[11px] font-bold text-gray-900 border-b border-r border-gray-300 whitespace-nowrap">
                  {formatNumber(row.daysRequired)}
                </td>
                <td className="px-2 py-2 text-[11px] text-gray-800 border-b border-gray-300">
                  <span className="flex flex-wrap gap-1">
                    {row.remarks.map((remark) => (
                      <span
                        key={remark.text}
                        className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap ${REMARK_TONE_CLASSES[remark.tone]}`}
                      >
                        {remark.text}
                      </span>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>

          {report.rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <th scope="row" className="px-2 py-2 text-left text-[11px] text-gray-800 border-r border-gray-300 whitespace-nowrap">
                  Total ({report.totals.needleCount} needles)
                </th>
                <td className="px-2 py-2 text-right text-[11px] text-gray-800 border-r border-gray-300">
                  {report.totals.inactiveMachines.toLocaleString()}
                </td>
                <td className="px-2 py-2 text-right text-[11px] text-gray-800 border-r border-gray-300">
                  {report.totals.activeMachines.toLocaleString()}
                </td>
                <td className="px-2 py-2 text-right text-[11px] text-gray-800 border-r border-gray-300">
                  {report.totals.pendingQty.toLocaleString()}
                </td>
                <td className="px-2 py-2 text-right text-[11px] text-gray-900 border-r border-gray-300">
                  {formatNumber(report.totals.daysRequired)}
                </td>
                <td className="px-2 py-2 text-[11px] text-gray-500 font-medium">
                  {report.totals.inactiveMachines + report.totals.activeMachines} machines total
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {report.rows.length === 0 && (
        <p className="py-8 text-center text-[11px] text-gray-500">
          No needle sizes configured. Add needle sizes to machines in the catalog to see this report.
        </p>
      )}

      <FormulaDrawer
        info={formulaColumn ? NEEDLE_WISE_COLUMN_FORMULAS[formulaColumn] : null}
        onClose={() => setFormulaColumn(null)}
        titleId="needle-wise-formula-title"
        identity={{ formula: NEEDLE_WISE_IDENTITY, example: NEEDLE_WISE_IDENTITY_EXAMPLE }}
      />
    </div>
  );
}
