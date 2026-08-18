"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import yarnVendorJobService, {
  type VendorJobPreviewBox,
  type VendorReceiveResult,
} from "@/shared/services/yarnVendorJobService";
import { exportReceiveNoteExcel } from "../utils/yarnVendorExcel";
import BarcodeScanner from "../../yarn-storage/components/BarcodeScanner";
import BoxDetailCard from "./BoxDetailCard";

interface ReceiveTabProps {
  onReceived?: () => void;
}

/**
 * Scan returning boxes, scan an LT rack, confirm receive.
 */
const ReceiveTab: React.FC<ReceiveTabProps> = ({ onReceived }) => {
  const [cart, setCart] = useState<VendorJobPreviewBox[]>([]);
  const [rack, setRack] = useState("");
  const [receivingNote, setReceivingNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const lockedVendorId = cart[0]?.vendorSupplierId || "";
  const lockedVendorName = cart[0]?.vendorName || "";

  /**
   * Adds a box that is currently at the same vendor as the session.
   * @param barcode Scanned box
   */
  const handleBoxScan = async (barcode: string): Promise<void | boolean> => {
    try {
      const preview = await yarnVendorJobService.preview(barcode);
      if (preview.eligibleFor !== "receive") {
        toast.error(preview.reason || "This box is not at a vendor");
        return false;
      }
      if (cart.some((b) => b.boxId === preview.box.boxId || b.barcode === preview.box.barcode)) {
        toast.error("Box already in this receive");
        return false;
      }
      if (lockedVendorId && preview.box.vendorSupplierId && preview.box.vendorSupplierId !== lockedVendorId) {
        toast.error("All boxes in one receipt must be the same vendor");
        return false;
      }
      setCart((prev) => [...prev, preview.box]);
      toast.success(`${preview.box.boxId} added`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scan failed");
      return false;
    }
  };

  /**
   * Sets destination rack from a scan.
   * @param barcode Slot barcode
   */
  const handleRackScan = async (barcode: string): Promise<void | boolean> => {
    const trimmed = barcode.trim();
    if (!trimmed) return false;
    setRack(trimmed);
    toast.success(`Rack ${trimmed}`);
    return true;
  };

  /**
   * Confirms receive onto the scanned rack.
   */
  const handleConfirm = async () => {
    if (!cart.length) {
      toast.error("Scan at least one box");
      return;
    }
    if (!rack.trim()) {
      toast.error("Scan a long-term rack");
      return;
    }
    setSubmitting(true);
    try {
      const result: VendorReceiveResult = await yarnVendorJobService.receive({
        barcodes: cart.map((b) => b.barcode),
        toStorageLocation: rack.trim(),
        receivingNote,
      });
      toast.success(`Received ${result.receiveNumber} → ${result.toStorageLocation}`);
      (result.shipments || []).forEach((shipment) => {
        exportReceiveNoteExcel(shipment, result.receiveNumber);
      });
      setCart([]);
      setRack("");
      setReceivingNote("");
      onReceived?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Receive failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BarcodeScanner
          label="Scan returning box"
          placeholder="Scan box barcode"
          onScan={handleBoxScan}
          invalidMessage="Box cannot be added to this receive"
        />
        <BarcodeScanner
          label="Scan destination LT rack"
          placeholder="Scan rack barcode"
          onScan={handleRackScan}
          invalidMessage="Invalid rack"
        />
      </div>

      {lockedVendorName && (
        <p className="text-[11px] text-purple-700">
          Vendor locked: <span className="font-semibold">{lockedVendorName}</span>
        </p>
      )}
      {rack && (
        <p className="text-[11px] text-gray-700">
          Rack: <span className="font-semibold">{rack}</span>
        </p>
      )}

      {cart.length > 0 && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {cart.map((box) => (
            <BoxDetailCard
              key={box.barcode || box.boxId}
              box={box}
              onRemove={() => setCart((prev) => prev.filter((b) => b.boxId !== box.boxId))}
            />
          ))}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="receiving-note">
          Receiving note
        </label>
        <textarea
          id="receiving-note"
          value={receivingNote}
          onChange={(e) => setReceivingNote(e.target.value)}
          rows={3}
          className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-purple-300 focus:ring-0"
          placeholder="Optional"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-500">{cart.length} box(es)</p>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={submitting || !cart.length || !rack.trim()}
          className="rounded bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Receiving…" : "Confirm receive"}
        </button>
      </div>
    </div>
  );
};

export default ReceiveTab;
