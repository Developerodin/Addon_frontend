"use client";

import React from "react";
import { formatFileSize, getFileIcon } from "@/shared/services/fileUploadService";
import type { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import { getPoLineItemId, vendorCodeFromPoLineItem, type PacklistRow } from "./vendorPacklistHelpers";

export interface VendorPacklistShipmentRowProps {
  entryIndex: number;
  entry: PacklistRow;
  po: VendorPurchaseOrder;
  canRemove: boolean;
  isSubmitting: boolean;
  uploading: boolean;
  onRemove: () => void;
  onFieldChange: (patch: Partial<PacklistRow>) => void;
  onPoItemToggle: (lineId: string, checked: boolean) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: (fileKey: string) => void;
}

/** One packlist entry: fields, PO line checkboxes, notes, file uploads. */
export function VendorPacklistShipmentRow({
  entryIndex,
  entry,
  po,
  canRemove,
  isSubmitting,
  uploading,
  onRemove,
  onFieldChange,
  onPoItemToggle,
  onFileChange,
  onFileRemove,
}: VendorPacklistShipmentRowProps) {
  return (
    <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-800">Packlist entry {entryIndex + 1}</h4>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-800 text-[10px] font-medium"
            disabled={isSubmitting}
          >
            <i className="ri-delete-bin-line me-1" />
            Remove
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Packing number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={entry.packingNumber || ""}
              onChange={(e) => onFieldChange({ packingNumber: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-0 focus:border-purple-400"
              placeholder="LR / packing ref"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Courier name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={entry.courierName || ""}
              onChange={(e) => onFieldChange({ courierName: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-0 focus:border-purple-400"
              placeholder="Transporter"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Courier number</label>
            <input
              type="text"
              value={entry.courierNumber || ""}
              onChange={(e) => onFieldChange({ courierNumber: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-0 focus:border-purple-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Vehicle number</label>
            <input
              type="text"
              value={entry.vehicleNumber || ""}
              onChange={(e) => onFieldChange({ vehicleNumber: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-0 focus:border-purple-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Challan number</label>
            <input
              type="text"
              value={entry.challanNumber || ""}
              onChange={(e) => onFieldChange({ challanNumber: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-0 focus:border-purple-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Dispatch date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={entry.dispatchDate?.slice(0, 10) || ""}
              onChange={(e) => onFieldChange({ dispatchDate: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-0 focus:border-purple-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Estimated delivery <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={entry.estimatedDeliveryDate?.slice(0, 10) || ""}
              min={entry.dispatchDate?.slice(0, 10)}
              onChange={(e) => onFieldChange({ estimatedDeliveryDate: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-0 focus:border-purple-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Number of boxes <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={entry.numberOfBoxes || ""}
              onChange={(e) =>
                onFieldChange({
                  numberOfBoxes: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)),
                })
              }
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-0 focus:border-purple-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Total units <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={entry.totalUnits || ""}
              onChange={(e) =>
                onFieldChange({
                  totalUnits: e.target.value === "" ? 0 : parseFloat(e.target.value),
                })
              }
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-0 focus:border-purple-400"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-gray-600 mb-1 block">
            PO lines in this shipment <span className="text-red-500">*</span>
            {entry.poItems && entry.poItems.length > 0 && (
              <span className="text-[10px] text-gray-600 ms-2">({entry.poItems.length} selected)</span>
            )}
          </div>
          <div className="border border-gray-300 rounded-lg max-h-56 overflow-y-auto bg-white">
            {po.poItems && po.poItems.length > 0 ? (
              <table className="min-w-full text-xs border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="w-10 px-2 py-1.5 text-center border-b border-gray-200">Sel</th>
                    <th className="px-2 py-1.5 text-left border-b border-gray-200">Product</th>
                    <th className="px-2 py-1.5 text-left border-b border-gray-200">Vendor code</th>
                    <th className="px-2 py-1.5 text-left border-b border-gray-200">Type</th>
                    <th className="px-2 py-1.5 text-left border-b border-gray-200">Color</th>
                    <th className="px-2 py-1.5 text-left border-b border-gray-200">Pattern</th>
                    <th className="w-20 px-2 py-1.5 text-right border-b border-gray-200">Qty</th>
                    <th className="w-20 px-2 py-1.5 text-right border-b border-gray-200">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {po.poItems.map((item, itemIdx) => {
                    const lineId = getPoLineItemId(item);
                    if (!lineId) return null;
                    const pid = item.productId;
                    const name =
                      item.productName || (typeof pid === "object" ? pid?.name || "" : "") || "Line";
                    const typeLabel = item.type?.trim() || "—";
                    const colorLabel = item.color?.trim() || "—";
                    const patternLabel = item.pattern?.trim() || "—";
                    const vendorCodeLabel = vendorCodeFromPoLineItem(item) || "—";
                    const selected = (entry.poItems || []).some((id) => String(id) === String(lineId));
                    const inputId = `vpo-pack-line-${entryIndex}-${itemIdx}-${lineId.replace(/[^a-zA-Z0-9]/g, "-")}`;
                    return (
                      <tr
                        key={lineId}
                        className={selected ? "bg-blue-50" : "hover:bg-gray-50"}
                      >
                        <td className="px-2 py-1.5 text-center border-b border-gray-100 align-top">
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              e.stopPropagation();
                              onPoItemToggle(lineId, e.target.checked);
                            }}
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-2 focus:ring-purple-400 border-gray-300 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-2 py-1.5 border-b border-gray-100 align-top font-medium text-gray-900">
                          <label htmlFor={inputId} className="cursor-pointer block">
                            {name}
                          </label>
                        </td>
                        <td className="px-2 py-1.5 border-b border-gray-100 align-top text-gray-700">
                          <label htmlFor={inputId} className="cursor-pointer block">
                            {vendorCodeLabel}
                          </label>
                        </td>
                        <td className="px-2 py-1.5 border-b border-gray-100 align-top text-gray-700">
                          <label htmlFor={inputId} className="cursor-pointer block">
                            {typeLabel}
                          </label>
                        </td>
                        <td className="px-2 py-1.5 border-b border-gray-100 align-top text-gray-700">
                          <label htmlFor={inputId} className="cursor-pointer block">
                            {colorLabel}
                          </label>
                        </td>
                        <td className="px-2 py-1.5 border-b border-gray-100 align-top text-gray-700">
                          <label htmlFor={inputId} className="cursor-pointer block">
                            {patternLabel}
                          </label>
                        </td>
                        <td className="px-2 py-1.5 text-right border-b border-gray-100 align-top tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-2 py-1.5 text-right border-b border-gray-100 align-top tabular-nums">
                          {item.rate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-500 text-center py-3">No PO lines</p>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
          <textarea
            value={entry.notes || ""}
            onChange={(e) => onFieldChange({ notes: e.target.value })}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-0 focus:border-purple-400"
            rows={2}
            placeholder="Optional notes"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Files
            {entry.files && entry.files.length > 0 && (
              <span className="text-[10px] text-gray-500 ms-2">({entry.files.length} uploaded)</span>
            )}
          </label>
          <input
            type="file"
            multiple
            onChange={onFileChange}
            className="hidden"
            id={`vpo-packlist-file-${entryIndex}`}
            disabled={isSubmitting || uploading}
          />
          <label
            htmlFor={`vpo-packlist-file-${entryIndex}`}
            className={`flex items-center justify-center gap-2 px-3 py-2 text-xs border border-dashed border-gray-400 rounded cursor-pointer hover:bg-gray-50 ${
              isSubmitting || uploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <i className="ri-upload-cloud-2-line text-sm" />
            <span className="font-medium">{uploading ? "Uploading…" : "Upload files"}</span>
          </label>
          {entry.files && entry.files.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {entry.files.map((file) => (
                <div
                  key={file.key}
                  className="flex items-center justify-between p-2 bg-white border border-gray-300 rounded text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{getFileIcon(file.mimeType)}</span>
                    <span className="truncate font-medium">{file.originalName}</span>
                    <span className="text-gray-500 shrink-0">{formatFileSize(file.size)}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => window.open(file.url, "_blank")}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="View"
                    >
                      <i className="ri-eye-line text-sm" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onFileRemove(file.key)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Remove"
                      disabled={isSubmitting}
                    >
                      <i className="ri-delete-bin-line text-sm" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
