"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import yarnVendorJobService, { type VendorShipment } from "@/shared/services/yarnVendorJobService";
import { exportReceiveNoteExcel, exportSendNoteExcel } from "../utils/yarnVendorExcel";

interface NotesTabProps {
  refreshKey?: number;
}

/**
 * Send/receive note history with Excel and void-unreceived.
 */
const NotesTab: React.FC<NotesTabProps> = ({ refreshKey = 0 }) => {
  const [shipments, setShipments] = useState<VendorShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  /**
   * Reloads shipment notes.
   */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await yarnVendorJobService.listShipments({
        status: status || undefined,
        limit: 100,
        page: 1,
      });
      setShipments(res.results || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  /**
   * Voids a send that has not been received.
   * @param shipment Open shipment
   */
  const handleVoid = async (shipment: VendorShipment) => {
    const id = shipment.id || shipment._id;
    if (!id) return;
    if (!window.confirm(`Void ${shipment.shipmentNumber}? Boxes return to unallocated.`)) return;
    try {
      await yarnVendorJobService.voidShipment(id);
      toast.success("Shipment voided");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Void failed");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] text-gray-500" htmlFor="note-status">
          Status
        </label>
        <select
          id="note-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-purple-300 focus:ring-0"
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="voided">Voided</option>
        </select>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : shipments.length === 0 ? (
        <p className="text-xs text-gray-500">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {shipments.map((s) => {
            const id = s.id || s._id || s.shipmentNumber;
            const canVoid = s.status === "open" && !(s.boxLines || []).some((l) => l.receivedAt);
            return (
              <li key={id} className="rounded border border-gray-100 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-900">
                      {s.shipmentNumber}
                      <span className="ml-2 font-normal text-gray-500">{s.status}</span>
                    </p>
                    <p className="text-[11px] text-gray-600">
                      {s.supplierSnapshot?.brandName || "—"} · {s.boxCount} boxes ·{" "}
                      {s.sentAt ? new Date(s.sentAt).toLocaleString() : ""}
                    </p>
                    {s.sendingNote ? (
                      <p className="mt-0.5 text-[11px] text-gray-500">{s.sendingNote}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => exportSendNoteExcel(s)}
                      className="rounded border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Send Excel
                    </button>
                    {(s.receives || []).map((r) => (
                      <button
                        key={r.receiveNumber}
                        type="button"
                        onClick={() => exportReceiveNoteExcel(s, r.receiveNumber)}
                        className="rounded border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Recv {r.receiveNumber}
                      </button>
                    ))}
                    {canVoid && (
                      <button
                        type="button"
                        onClick={() => void handleVoid(s)}
                        className="rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        Void
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default NotesTab;
