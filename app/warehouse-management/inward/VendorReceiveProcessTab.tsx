"use client";

import React, { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import { containersMasterService } from "@/shared/services/containersMasterService";

/**
 * WHMS inward: complete vendor dispatch handoff by scanning the staged bag and posting an empty container accept
 * (`POST …/containers-masters/barcode/:barcode/accept`), per `VENDOR_DISPATCH_TO_WAREHOUSE_FRONTEND.md` step 3.
 */
export default function VendorReceiveProcessTab() {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    const b = barcode.trim();
    if (!b) {
      toast.error("Enter or scan the warehouse bag barcode.");
      return;
    }
    setLoading(true);
    try {
      await containersMasterService.acceptByBarcode(b);
      try {
        await containersMasterService.clearActiveByBarcode(b);
      } catch {
        /* best-effort */
      }
      toast.success("Handoff accepted. Inward lines should update per server rules.");
      setBarcode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Accept failed");
    } finally {
      setLoading(false);
    }
  }, [barcode]);

  return (
    <div className="p-[10px] space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-bold text-gray-900">Vendor bag — complete inward</h2>
        <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
          After dispatch stages stock with <strong>PATCH …/transfer</strong> (dispatch → warehouse), the bag&apos;s{" "}
          <code className="text-[10px] bg-gray-100 px-1 rounded">activeFloor</code> is warehouse inward. Scan that same
          barcode here and confirm — the server runs empty-body <strong>POST …/accept</strong> for this path.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="whms-vendor-bag-accept-bc" className="block text-[11px] font-medium text-gray-700">
          Container barcode
        </label>
        <input
          id="whms-vendor-bag-accept-bc"
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          disabled={loading}
          placeholder="Scan staged bag"
          className="w-full max-w-md border border-gray-300 rounded px-2 py-1.5 text-[11px] font-medium bg-white"
          autoComplete="off"
          aria-label="Staged vendor warehouse container barcode"
        />
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={loading || !barcode.trim()}
        className="px-4 py-2 text-[11px] font-bold rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {loading ? "Accepting…" : "POST accept (empty body)"}
      </button>
    </div>
  );
}
