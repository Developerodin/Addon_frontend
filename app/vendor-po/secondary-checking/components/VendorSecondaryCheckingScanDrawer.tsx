"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "react-hot-toast";
import { CRM } from "../../vendor-list/crmUiClasses";
import vendorBoxService, {
  type BoxLookupResponse,
  type ScanAcceptResponse,
  type VendorBox,
} from "@/shared/services/vendorBoxService";

export type VendorSecondaryCheckingScanDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Called after accept succeeds; may async-refresh parent list before drawer closes. */
  onAccepted: (result: ScanAcceptResponse) => void | Promise<void>;
  /** When true (default), close drawer after a successful accept. */
  closeOnAccept?: boolean;
};

type DetailRow = { label: string; value: string };

/**
 * Resolves article vendor code from box product (same as receive/process PO line code).
 * @param box - Vendor box document
 */
function getArticleVendorCodeFromBox(box: VendorBox): string {
  const product = box.productId;
  if (typeof product === "object" && product !== null) {
    const code = product.vendorCode?.trim();
    return code || "no vendor code";
  }
  return "no vendor code";
}

/**
 * Resolves vendor company name from a populated vendor box field.
 * @param box - Vendor box document
 */
function getVendorCompanyName(box: VendorBox): string {
  const vendor = box.vendor;
  if (!vendor || typeof vendor === "string") return "—";
  return vendor.header?.vendorName || "—";
}

/**
 * Resolves display value from a populated or plain vendor box field.
 * @param box - Vendor box document
 * @param key - Field key on box
 */
function boxField(box: VendorBox, key: keyof VendorBox): string {
  const raw = box[key];
  if (raw == null || raw === "") return "—";
  if (typeof raw === "object" && raw !== null && "vpoNumber" in raw) {
    return String((raw as { vpoNumber?: string }).vpoNumber || "—");
  }
  if (typeof raw === "object" && raw !== null && "name" in raw) {
    return String((raw as { name?: string }).name || "—");
  }
  if (typeof raw === "object" && raw !== null && "header" in raw) {
    const header = (raw as { header?: { vendorName?: string } }).header;
    return header?.vendorName || "—";
  }
  return String(raw);
}

/**
 * Builds detail rows for the scanned box preview panel.
 * @param lookup - Lookup response from API
 */
function buildDetailRows(lookup: BoxLookupResponse): DetailRow[] {
  const { box } = lookup;
  return [
    { label: "Box ID", value: box.boxId || "—" },
    { label: "Barcode", value: box.barcode || "—" },
    { label: "VPO", value: box.vpoNumber || boxField(box, "vendorPurchaseOrderId") },
    { label: "Vendor", value: getVendorCompanyName(box) },
    { label: "Vendor code", value: getArticleVendorCodeFromBox(box) },
    { label: "Product", value: box.productName || boxField(box, "productId") },
    { label: "Lot", value: box.lotNumber || "—" },
    { label: "Units", value: String(box.numberOfUnits ?? 0) },
    {
      label: "SC Status",
      value: lookup.alreadyAccepted ? "Already accepted" : "Pending accept",
    },
  ];
}

/**
 * Right drawer: scan/lookup box → preview details → explicit Accept.
 */
export function VendorSecondaryCheckingScanDrawer({
  open,
  onClose,
  onAccepted,
  closeOnAccept = true,
}: VendorSecondaryCheckingScanDrawerProps) {
  const [barcode, setBarcode] = useState("");
  const [lookup, setLookup] = useState<BoxLookupResponse | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setBarcode("");
    setLookup(null);
    setLookingUp(false);
    setAccepting(false);
  }, []);

  const handleClose = useCallback(() => {
    if (lookingUp || accepting) return;
    resetForm();
    onClose();
  }, [accepting, lookingUp, onClose, resetForm]);

  useEffect(() => {
    if (open) {
      resetForm();
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open, resetForm]);

  const handleLookup = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setLookingUp(true);
    setLookup(null);
    try {
      const result = await vendorBoxService.lookupForSecondaryChecking(trimmed);
      setLookup(result);
      if (result.alreadyAccepted) {
        toast.error("This box has already been accepted on secondary checking");
      } else if (!result.canAccept) {
        toast.error("Box has no units to accept");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Box not found");
    } finally {
      setLookingUp(false);
      inputRef.current?.focus();
    }
  }, []);

  const handleAccept = useCallback(async () => {
    const trimmed = barcode.trim();
    if (!trimmed || !lookup?.canAccept) return;

    setAccepting(true);
    try {
      const result = await vendorBoxService.scanAccept(trimmed);
      const vpoNumber = result.vpoNumber || result.box.vpoNumber || "—";
      const productName = result.productName || result.box.productName || "—";
      const groupingLabel = result.isNewOrder
        ? "New order started"
        : result.isNewArticle
          ? "New article in order"
          : "Added to existing order";

      toast.success(
        `${vpoNumber} · ${productName} · ${result.acceptedUnits} units — ${groupingLabel}`,
      );
      try {
        await onAccepted(result);
      } catch (refreshErr: unknown) {
        toast.error(
          refreshErr instanceof Error
            ? refreshErr.message
            : "Box accepted but list refresh failed",
        );
      }
      resetForm();
      if (closeOnAccept) {
        onClose();
      } else {
        inputRef.current?.focus();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to accept box");
    } finally {
      setAccepting(false);
    }
  }, [barcode, closeOnAccept, lookup?.canAccept, onAccepted, onClose, resetForm]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleLookup(barcode);
    }
  };

  if (!open) return null;

  const detailRows = lookup ? buildDetailRows(lookup) : null;

  return (
    <>
      <div
        className={CRM.drawerBackdrop}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className={CRM.drawerShellSm}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-sc-scan-title"
      >
        <div className={CRM.drawerHeaderBar}>
          <h2 id="vendor-sc-scan-title" className={CRM.drawerTitle}>
            Scan Box
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className={CRM.drawerCloseBtn}
            aria-label="Close scan drawer"
            disabled={lookingUp || accepting}
          >
            <i className="ri-close-line text-lg" aria-hidden="true" />
          </button>
        </div>

        <div className={CRM.drawerBodyScroll}>
          <p className={CRM.drawerHint}>
            Scan or type a box barcode to load details, then click Accept to
            register it on secondary checking.
          </p>

          <div className="mb-4">
            <label
              htmlFor="vendor-sc-scan-input"
              className="block text-[11px] font-bold text-gray-700 mb-1.5"
            >
              Barcode / Box ID
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <i
                  className="ri-barcode-line absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 text-sm"
                  aria-hidden="true"
                />
                <input
                  id="vendor-sc-scan-input"
                  ref={inputRef}
                  type="text"
                  className="w-full bg-white border-2 border-purple-300 pl-9 pr-3 py-2 text-[12px] font-semibold rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 focus:outline-none"
                  placeholder="Scan barcode..."
                  value={barcode}
                  onChange={(e) => {
                    setBarcode(e.target.value);
                    setLookup(null);
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={lookingUp || accepting}
                  aria-label="Scan box barcode"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleLookup(barcode)}
                disabled={lookingUp || accepting || !barcode.trim()}
                className="px-3 py-2 bg-white border-2 border-purple-300 text-purple-700 text-[11px] font-bold rounded-lg hover:bg-purple-50 disabled:opacity-50"
                aria-label="Look up box"
              >
                {lookingUp ? "…" : "Find"}
              </button>
            </div>
          </div>

          {lookup && detailRows && (
            <section
              className={CRM.drawerSection}
              aria-live="polite"
              aria-label="Box details"
            >
              <div className={CRM.drawerSectionHead}>Box details</div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 text-[11px]">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th
                        scope="col"
                        className="px-3 py-2 text-left font-bold text-[#495057] uppercase tracking-wide border border-gray-200 w-[38%]"
                      >
                        Field
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left font-bold text-[#495057] uppercase tracking-wide border border-gray-200"
                      >
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((row) => (
                      <tr key={row.label} className="hover:bg-gray-50/50">
                        <th
                          scope="row"
                          className="px-3 py-2 font-bold text-gray-500 border border-gray-200 align-top"
                        >
                          {row.label}
                        </th>
                        <td className="px-3 py-2 font-semibold text-gray-900 border border-gray-200 break-all">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {lookup.alreadyAccepted && (
                <div className="mx-3 mb-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                  Already accepted — scan a different box.
                </div>
              )}
            </section>
          )}
        </div>

        <div className={CRM.drawerFooterBar}>
          <button
            type="button"
            onClick={handleClose}
            className={CRM.btnDrawerCancel}
            disabled={lookingUp || accepting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleAccept()}
            disabled={!lookup?.canAccept || accepting || lookingUp}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-[11px] font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Accept box on secondary checking"
          >
            {accepting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                Accepting…
              </>
            ) : (
              <>
                <i className="ri-check-double-line text-xs" aria-hidden="true" />
                Accept Box
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
