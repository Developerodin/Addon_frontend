"use client";

import React, { useState, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import vendorBoxService, {
  type ScanAcceptResponse,
} from "@/shared/services/vendorBoxService";

type Props = {
  onAccepted: (result: ScanAcceptResponse) => void;
};

/**
 * Barcode scan input for accepting vendor boxes on the secondary checking floor.
 * Keyboard-wedge scanners fire characters + Enter — this handles both.
 */
export function VendorSecondaryCheckingScanAccept({ onAccepted }: Props) {
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    boxId: string;
    units: number;
    productName: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleScan = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      setScanning(true);
      setLastResult(null);
      try {
        const result = await vendorBoxService.scanAccept(trimmed);
        toast.success(
          `Box accepted: ${result.box.boxId} — ${result.acceptedUnits} units`,
        );
        setLastResult({
          boxId: result.box.boxId || "",
          units: result.acceptedUnits,
          productName: result.box.productName || "",
        });
        setBarcode("");
        onAccepted(result);
      } catch (err: any) {
        toast.error(err.message || "Failed to accept box");
      } finally {
        setScanning(false);
        inputRef.current?.focus();
      }
    },
    [onAccepted],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan(barcode);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white">
          <i className="ri-barcode-line text-base" />
        </div>
        <div>
          <h3 className="text-[12px] font-bold text-gray-900">
            Scan Box to Accept
          </h3>
          <p className="text-[10px] text-gray-500 font-medium">
            Scan or type the box barcode to accept it on Secondary Checking
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <i className="ri-barcode-line absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 text-sm" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-white border-2 border-purple-300 pl-9 pr-3 py-2 text-[12px] font-semibold rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 focus:outline-none placeholder:text-gray-400 transition-all"
            placeholder="Scan barcode or type box ID..."
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={scanning}
            autoFocus
            aria-label="Scan box barcode"
          />
        </div>
        <button
          type="button"
          onClick={() => handleScan(barcode)}
          disabled={scanning || !barcode.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-[11px] font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          aria-label="Accept scanned box"
        >
          {scanning ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
              Accepting…
            </>
          ) : (
            <>
              <i className="ri-check-double-line text-xs" />
              Accept
            </>
          )}
        </button>
      </div>

      {lastResult && (
        <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <i className="ri-checkbox-circle-fill text-green-600 text-sm" />
          <span className="text-[11px] font-bold text-green-800">
            Last accepted:
          </span>
          <span className="text-[11px] font-semibold text-green-700">
            {lastResult.boxId}
          </span>
          <span className="text-[10px] text-green-600">
            — {lastResult.units} units
            {lastResult.productName && ` · ${lastResult.productName}`}
          </span>
        </div>
      )}
    </div>
  );
}
