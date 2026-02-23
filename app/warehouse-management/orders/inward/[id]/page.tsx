"use client";

import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { InwardItem } from "../types";

// Mock detail for receiving entry
const MOCK_ITEMS: InwardItem[] = [
  { sku: "SKU-001", name: "Product A", orderedQty: 100, receivedQty: 0, acceptedQty: 0, rejectedQty: 0 },
  { sku: "SKU-002", name: "Product B", orderedQty: 50, receivedQty: 0, acceptedQty: 0, rejectedQty: 0 },
];

export default function InwardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";

  const [items, setItems] = useState<InwardItem[]>(isNew ? MOCK_ITEMS : [...MOCK_ITEMS]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleQtyChange = (index: number, field: "receivedQty" | "acceptedQty" | "rejectedQty", value: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: API call to save inward receiving
      await new Promise((r) => setTimeout(r, 500));
      toast.success(isNew ? "Inward created" : "Inward updated");
      router.push("/warehouse-management/orders/inward");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const grnNumber = isNew ? "New GRN" : `GRN-${id}`;

  return (
    <>
      <Seo title={isNew ? "New Inward" : "Inward Receiving"} />
      <div className="box">
        <div className="box-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/warehouse-management/orders/inward"
              className="ti-btn ti-btn-secondary"
            >
              <i className="ri-arrow-left-line me-1"></i>
              Back to Inward
            </Link>
            <h3 className="box-title">{grnNumber}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="ti-btn ti-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="ti-btn ti-btn-primary-full"
            >
              {saving ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full me-2"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="ri-save-line me-2"></i>
                  Save
                </>
              )}
            </button>
          </div>
        </div>
        <div className="box-body space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">GRN Number</label>
              <input
                type="text"
                className="form-control"
                value={grnNumber}
                readOnly
                disabled
              />
            </div>
            {!isNew && (
              <div>
                <label className="form-label">Reference</label>
                <input type="text" className="form-control" placeholder="PO / DN ref" readOnly disabled />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-medium">Receive items</h4>
              <span className="text-sm text-gray-600">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Ordered</th>
                    <th>Received</th>
                    <th>Accepted</th>
                    <th>Rejected</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const variance = item.receivedQty - item.orderedQty;
                    return (
                      <tr key={item.sku} className={variance !== 0 ? "bg-yellow-50" : ""}>
                        <td className="font-medium">{item.sku}</td>
                        <td>{item.name}</td>
                        <td className="font-semibold">{item.orderedQty}</td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm w-24 text-center"
                            min={0}
                            value={item.receivedQty}
                            onChange={(e) =>
                              handleQtyChange(index, "receivedQty", parseInt(e.target.value, 10) || 0)
                            }
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm w-24 text-center"
                            min={0}
                            max={item.receivedQty}
                            value={item.acceptedQty}
                            onChange={(e) =>
                              handleQtyChange(index, "acceptedQty", parseInt(e.target.value, 10) || 0)
                            }
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm w-24 text-center"
                            min={0}
                            max={item.receivedQty}
                            value={item.rejectedQty}
                            onChange={(e) =>
                              handleQtyChange(index, "rejectedQty", parseInt(e.target.value, 10) || 0)
                            }
                            placeholder="0"
                          />
                        </td>
                        <td>
                          {variance !== 0 && (
                            <span className="text-xs text-warning">
                              <i className="ri-alert-line me-1"></i>
                              {variance > 0 ? "+" : ""}{variance}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Receiving notes..."
            />
          </div>
        </div>
      </div>
    </>
  );
}
