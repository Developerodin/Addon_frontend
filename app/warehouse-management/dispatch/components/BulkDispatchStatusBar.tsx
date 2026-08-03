"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  warehouseOrderFlowStatusLabel,
  whmsWarehouseOrders,
  type WarehouseOrder,
} from "@/shared/services/whmsWarehouseOrderService";
import { whmsDispatch } from "@/shared/services/whmsFulfilmentService";
import {
  ACTIVE_TAB_BULK_TARGETS,
  DISPATCH_MODES,
  SHIPPED_TAB_BULK_TARGETS,
  validateBulkDispatchTransition,
  type DispatchBulkTarget,
} from "../dispatchBulkStatusUtils";

type Props = {
  tab: "active" | "shipped";
  selectedOrders: WarehouseOrder[];
  onClearSelection: () => void;
  onApplied: () => void;
};

const BULK_TARGET_SELECT_ID = "bulk-dispatch-target-status";

/**
 * Bulk status change bar for the dispatch workboard — validates transitions per order
 * and disables apply when any selected order cannot move to the chosen target.
 */
export default function BulkDispatchStatusBar({ tab, selectedOrders, onClearSelection, onApplied }: Props) {
  const targets = tab === "active" ? ACTIVE_TAB_BULK_TARGETS : SHIPPED_TAB_BULK_TARGETS;
  const [targetStatus, setTargetStatus] = useState<DispatchBulkTarget>(targets[0]);
  const [busy, setBusy] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    setTargetStatus(tab === "active" ? ACTIVE_TAB_BULK_TARGETS[0] : SHIPPED_TAB_BULK_TARGETS[0]);
    setShowErrors(false);
  }, [tab]);

  const validation = useMemo(
    () => validateBulkDispatchTransition(selectedOrders, targetStatus),
    [selectedOrders, targetStatus],
  );

  const applyDisabled = busy || !validation.allEligible;
  const ineligible = validation.checks.filter((c) => !c.eligible);
  const targetLabel = warehouseOrderFlowStatusLabel(targetStatus);
  const showIssueList = showErrors || ineligible.length <= 3;

  /**
   * Applies the chosen bulk target status to all selected eligible orders.
   */
  const handleApply = async () => {
    if (!validation.allEligible) {
      setShowErrors(true);
      return;
    }

    setBusy(true);
    let success = 0;
    let failed = 0;

    for (const check of validation.checks) {
      try {
        if (DISPATCH_MODES.includes(targetStatus as (typeof DISPATCH_MODES)[number])) {
          await whmsDispatch.dispatch(check.orderId, targetStatus as (typeof DISPATCH_MODES)[number]);
        } else if (targetStatus === "delivered") {
          await whmsDispatch.setDelivered(check.orderId);
        } else {
          await whmsWarehouseOrders.transitionFlowStatus(check.orderId, targetStatus);
        }
        success += 1;
      } catch (err) {
        failed += 1;
        toast.error(
          `${check.orderNumber}: ${err instanceof Error ? err.message : "Update failed"}`,
          { duration: 5000 },
        );
      }
    }

    setBusy(false);
    if (success) {
      toast.success(
        `Updated ${success} order${success === 1 ? "" : "s"} to ${targetLabel}`,
      );
    }
    if (failed && !success) {
      toast.error(`All ${failed} update${failed === 1 ? "" : "s"} failed`);
    }
    onClearSelection();
    onApplied();
  };

  if (selectedOrders.length === 0) return null;

  return (
    <div
      className="mb-4 overflow-hidden rounded-lg border border-violet-200 bg-violet-50/60"
      role="region"
      aria-label="Bulk dispatch status update"
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md bg-violet-100 px-2.5 py-1.5 text-[12px] font-semibold text-violet-900"
            aria-live="polite"
          >
            <i className="ri-checkbox-multiple-line text-[14px]" aria-hidden="true" />
            {selectedOrders.length} selected
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
          <div className="flex min-w-[200px] flex-col gap-1">
            <label
              htmlFor={BULK_TARGET_SELECT_ID}
              className="text-[10px] font-semibold uppercase tracking-wide text-gray-600"
            >
              Move to status
            </label>
            <select
              id={BULK_TARGET_SELECT_ID}
              value={targetStatus}
              onChange={(e) => {
                setTargetStatus(e.target.value as DispatchBulkTarget);
                setShowErrors(false);
              }}
              className="form-control min-h-[34px] py-1.5 text-[12px]"
              aria-label="Target dispatch status"
            >
              {targets.map((t) => (
                <option key={t} value={t}>
                  {warehouseOrderFlowStatusLabel(t)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={applyDisabled}
              onClick={() => void handleApply()}
              className="ti-btn ti-btn-primary min-h-[34px] px-3 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              aria-disabled={applyDisabled}
              aria-describedby={ineligible.length > 0 ? "bulk-status-disabled-reason" : undefined}
            >
              {busy ? (
                <>
                  <i className="ri-loader-4-line animate-spin" aria-hidden="true" /> Updating…
                </>
              ) : (
                <>
                  <i className="ri-arrow-right-circle-line" aria-hidden="true" /> Apply status
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClearSelection}
              disabled={busy}
              className="ti-btn ti-btn-light min-h-[34px] px-3 text-[12px] font-semibold"
              aria-label="Clear selected orders"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {ineligible.length > 0 ? (
        <div
          id="bulk-status-disabled-reason"
          className="border-t border-red-200/70 bg-red-50/90 px-3 py-2.5"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <i
              className="ri-error-warning-line mt-0.5 shrink-0 text-[16px] text-red-600"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-snug text-red-800">
                {ineligible.length} order{ineligible.length === 1 ? "" : "s"} cannot move to{" "}
                {targetLabel}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-red-700">
                Apply is disabled until every selected order can transition to this status.
              </p>

              {showIssueList ? (
                <ul className="mt-2 space-y-1 border-t border-red-200/60 pt-2 text-[11px] leading-relaxed text-red-800">
                  {ineligible.map((c) => (
                    <li key={c.orderId} className="flex flex-wrap gap-x-1">
                      <span className="font-semibold">{c.orderNumber}</span>
                      <span className="text-red-700">— {c.reason}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {ineligible.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setShowErrors((v) => !v)}
                  className="mt-2 inline-flex min-h-[28px] items-center gap-1 text-[11px] font-semibold text-red-700 underline-offset-2 hover:text-red-900 hover:underline"
                  aria-expanded={showIssueList}
                >
                  {showIssueList ? (
                    <>
                      <i className="ri-arrow-up-s-line" aria-hidden="true" />
                      Hide order details
                    </>
                  ) : (
                    <>
                      <i className="ri-arrow-down-s-line" aria-hidden="true" />
                      Show all {ineligible.length} issues
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
