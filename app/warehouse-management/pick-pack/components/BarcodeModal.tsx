"use client";

import React, { useMemo, useState } from "react";
import type { BarcodeGenerateRequest, BarcodeGenerateResult, BarcodeLabelType } from "../types";

const LABELS: Array<{ type: BarcodeLabelType; label: string; hint: string }> = [
  { type: "item", label: "Item Label", hint: "Per SKU item label (generated at pack stage only)" },
  { type: "carton", label: "Carton Label", hint: "Carton barcode label (multiple cartons supported)" },
  { type: "order", label: "Order Label", hint: "Order pack label / shipping label" },
];

export default function BarcodeModal({
  isOpen,
  onClose,
  defaultQty = 1,
  onGenerate,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultQty?: number;
  onGenerate: (req: BarcodeGenerateRequest) => Promise<BarcodeGenerateResult[]> | BarcodeGenerateResult[];
}) {
  const [selected, setSelected] = useState<Record<BarcodeLabelType, boolean>>({
    item: true,
    carton: true,
    order: true,
  });
  const [qty, setQty] = useState(defaultQty);
  const [preview, setPreview] = useState<BarcodeGenerateResult[] | null>(null);
  const selectedTypes = useMemo(
    () => (Object.keys(selected) as BarcodeLabelType[]).filter((t) => selected[t]),
    [selected]
  );

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const q = Math.max(1, Math.min(999, qty || 1));
    const types = selectedTypes;
    const res = await onGenerate({ types, quantity: q });
    setPreview(res);
  };

  const canGenerate = selectedTypes.length > 0 && qty >= 1;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Generate Barcode Labels</h3>
                <p className="text-[12px] text-gray-500 mt-1">
                  Barcodes are generated at the <b>pack stage</b> only.
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="box">
                  <div className="box-header">
                    <h3 className="box-title">Label Types</h3>
                  </div>
                  <div className="box-body space-y-2">
                    {LABELS.map((t) => (
                      <label key={t.type} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected[t.type]}
                          onChange={(e) => setSelected((p) => ({ ...p, [t.type]: e.target.checked }))}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-[12px] font-bold text-gray-800">{t.label}</div>
                          <div className="text-[11px] text-gray-500">{t.hint}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="box">
                  <div className="box-header">
                    <h3 className="box-title">Quantity</h3>
                  </div>
                  <div className="box-body">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={qty}
                      onChange={(e) => setQty(parseInt(e.target.value || "1", 10))}
                      className="ti-form-input !h-11"
                    />
                    <div className="text-[11px] text-gray-500 mt-2">This is labels per selected type.</div>
                  </div>
                </div>
              </div>

              <div className="box">
                <div className="box-header">
                  <h3 className="box-title">Preview</h3>
                </div>
                <div className="box-body">
                  {preview ? (
                    <div className="space-y-2">
                      {preview.map((p, idx) => (
                        <div key={`${p.type}-${idx}`} className="border border-gray-100 rounded p-3 bg-gray-50">
                          <div className="text-[10px] font-bold text-gray-500 uppercase">{p.type} label</div>
                          <div className="font-mono text-[12px] text-gray-900 mt-1 whitespace-pre-wrap">
                            {p.previewText}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-2">Qty: {p.quantity}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[12px] text-gray-600">
                      Click <b>Generate</b> to see a barcode preview.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={onClose} className="ti-btn ti-btn-light px-4 py-2.5">
                Close
              </button>
              <button
                onClick={handleGenerate}
                className="ti-btn ti-btn-primary px-4 py-2.5"
                disabled={!canGenerate}
              >
                <i className="ri-barcode-line me-1"></i>
                Generate
              </button>
              <button
                onClick={() => alert("Print placeholder (no backend)")}
                className="ti-btn ti-btn-success px-4 py-2.5"
                disabled={!preview}
              >
                <i className="ri-printer-line me-1"></i>
                Print
              </button>
              <button
                onClick={() => alert("Download PDF placeholder (no backend)")}
                className="ti-btn ti-btn-secondary px-4 py-2.5"
                disabled={!preview}
              >
                <i className="ri-download-2-line me-1"></i>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

