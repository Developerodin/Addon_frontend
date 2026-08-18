"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import type { Supplier } from "@/shared/services/supplierService";
import yarnVendorJobService, {
  type VendorJobPreviewBox,
  type VendorShipment,
} from "@/shared/services/yarnVendorJobService";
import { exportSendNoteExcel } from "../utils/yarnVendorExcel";
import BarcodeScanner from "../../yarn-storage/components/BarcodeScanner";
import BoxDetailCard from "./BoxDetailCard";
import SupplierAutocomplete from "./SupplierAutocomplete";

interface SendTabProps {
  onSent?: (shipment: VendorShipment) => void;
}

/**
 * Scan boxes, pick a yarn supplier, confirm send.
 */
const SendTab: React.FC<SendTabProps> = ({ onSent }) => {
  const [cart, setCart] = useState<VendorJobPreviewBox[]>([]);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [sendingNote, setSendingNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * Appends a send-eligible box; duplicates are ignored.
   * @param barcode Scanned value
   */
  const handleScan = async (barcode: string): Promise<void | boolean> => {
    try {
      const preview = await yarnVendorJobService.preview(barcode);
      if (preview.eligibleFor !== "send") {
        toast.error(preview.reason || "This box cannot be sent");
        return false;
      }
      const key = preview.box.barcode || preview.box.boxId;
      if (cart.some((b) => b.barcode === key || b.boxId === preview.box.boxId)) {
        toast.error("Box already in this send");
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
   * Confirms send for the current cart.
   */
  const handleConfirm = async () => {
    if (!cart.length) {
      toast.error("Scan at least one box");
      return;
    }
    if (!supplier?.id) {
      toast.error("Select a vendor");
      return;
    }
    setSubmitting(true);
    try {
      const shipment = await yarnVendorJobService.send({
        barcodes: cart.map((b) => b.barcode),
        supplierId: supplier.id || (supplier as { _id?: string })._id || "",
        sendingNote,
      });
      toast.success(`Sent ${shipment.shipmentNumber}`);
      exportSendNoteExcel(shipment);
      setCart([]);
      setSendingNote("");
      onSent?.(shipment);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Send failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <BarcodeScanner
        label="Scan box"
        placeholder="Scan box barcode"
        onScan={handleScan}
        invalidMessage="Box cannot be added to this send"
      />

      {cart.length > 0 && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {cart.map((box) => (
            <BoxDetailCard
              key={box.barcode || box.boxId}
              box={box}
              onRemove={() =>
                setCart((prev) => prev.filter((b) => b.boxId !== box.boxId))
              }
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SupplierAutocomplete selected={supplier} onSelect={setSupplier} disabled={submitting} />
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="sending-note">
            Sending note
          </label>
          <textarea
            id="sending-note"
            value={sendingNote}
            onChange={(e) => setSendingNote(e.target.value)}
            rows={3}
            className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-purple-300 focus:ring-0"
            placeholder="Optional — work to do, dyeing, etc."
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-500">{cart.length} box(es)</p>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={submitting || !cart.length || !supplier}
          className="rounded bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Confirm send"}
        </button>
      </div>
    </div>
  );
};

export default SendTab;
