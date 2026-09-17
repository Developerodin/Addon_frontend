"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  LABEL_FONT_MM_MAX,
  LABEL_FONT_MM_MIN,
  LABEL_FONT_MM_STEP,
  LABEL_TYPE_FIELD_META,
  boldnessFontWeight,
  clampLabelFontMm,
  createDefaultProductLabelTypography,
  isSameProductLabelTypography,
  loadProductLabelTypography,
  parseLabelBoldness,
  saveProductLabelTypography,
  type LabelBoldness,
  type LabelTypeFieldId,
  type LabelTypeStyle,
  type ProductLabelTypography,
} from "./productBarcodeLabelSettings";

const PREVIEW_COPY: Record<LabelTypeFieldId, string> = {
  name: "Name Of Product: Socks(Ankle Length)",
  net: "Net Quantity: 01 Pair (2N)",
  size: "Size: Foot Length non-stretch: 30cm / stretch: 42 cm",
  mfg: "Month & Year of Manufacture - 09/2026",
  style: "STYLE: PEC1SALFQ00021 White",
  mrp: "MRP: Rs.129.00 (Inclusive Of All Taxes)",
  usp: "USP: Rs. 129.00 per pair",
};

export interface BatchBarcodeLabelSettingsPanelProps {
  onBack: () => void;
}

/**
 * Edit and persist 50×70mm details type (size + boldness) as the print default.
 */
export default function BatchBarcodeLabelSettingsPanel({
  onBack,
}: BatchBarcodeLabelSettingsPanelProps) {
  const [saved, setSaved] = useState<ProductLabelTypography>(() => loadProductLabelTypography());
  const [draft, setDraft] = useState<ProductLabelTypography>(() => loadProductLabelTypography());
  const dirty = useMemo(() => !isSameProductLabelTypography(draft, saved), [draft, saved]);

  /**
   * Patch one field on the unsaved draft.
   * @param id - Details line id
   * @param patch - Partial style
   */
  const updateField = (id: LabelTypeFieldId, patch: Partial<LabelTypeStyle>) => {
    setDraft((prev) => ({
      ...prev,
      [id]: {
        fontMm: patch.fontMm != null ? clampLabelFontMm(patch.fontMm) : prev[id].fontMm,
        boldness: patch.boldness != null ? parseLabelBoldness(patch.boldness) : prev[id].boldness,
      },
    }));
  };

  /**
   * Write the draft to localStorage so the next print uses it.
   */
  const handleSave = () => {
    try {
      const next = saveProductLabelTypography(draft);
      setSaved(next);
      setDraft(next);
      toast.success("Label type saved — next print uses these sizes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save label type");
    }
  };

  /**
   * Restore factory sizes in the form (Save to persist).
   */
  const handleReset = () => {
    setDraft(createDefaultProductLabelTypography());
  };

  return (
    <div className="px-4 py-4 space-y-4 text-[12px] text-gray-600">
      <p className="text-[11px] text-gray-500">
        Defaults for Name → USP on the 50×70mm sticker. Size can stay smaller so the long foot-length
        line fits. Save to use on the next print.
      </p>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full min-w-[420px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-500">
                Label
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-500">
                Size (mm)
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-500">
                Boldness
              </th>
            </tr>
          </thead>
          <tbody>
            {LABEL_TYPE_FIELD_META.map((field) => {
              const style = draft[field.id];
              return (
                <tr key={field.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-semibold text-gray-800">{field.label}</td>
                  <td className="px-3 py-2">
                    <label className="sr-only" htmlFor={`label-font-${field.id}`}>
                      Font size for {field.label}
                    </label>
                    <input
                      id={`label-font-${field.id}`}
                      type="number"
                      min={LABEL_FONT_MM_MIN}
                      max={LABEL_FONT_MM_MAX}
                      step={LABEL_FONT_MM_STEP}
                      value={style.fontMm}
                      onChange={(e) => updateField(field.id, { fontMm: Number(e.target.value) })}
                      className="w-20 border border-gray-200 rounded px-2 py-1 text-right text-[12px] text-gray-900"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="sr-only" htmlFor={`label-bold-${field.id}`}>
                      Boldness for {field.label}
                    </label>
                    <select
                      id={`label-bold-${field.id}`}
                      value={style.boldness}
                      onChange={(e) =>
                        updateField(field.id, { boldness: e.target.value as LabelBoldness })
                      }
                      className="w-full border border-gray-200 rounded px-2 py-1 text-[12px] text-gray-900"
                    >
                      <option value="regular">Regular</option>
                      <option value="bold">Bold</option>
                      <option value="extra">Extra bold</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase text-gray-500 mb-1.5">Preview</p>
        <div
          className="bg-white border border-gray-200 rounded-lg p-3 w-[50mm] max-w-full"
          aria-label="Sticker details preview"
        >
          {LABEL_TYPE_FIELD_META.map((field) => {
            const style = draft[field.id];
            return (
              <p
                key={field.id}
                className="m-0 text-black font-[Arial,Helvetica,sans-serif] leading-[1.18]"
                style={{
                  fontSize: `${style.fontMm}mm`,
                  fontWeight: boldnessFontWeight(style.boldness),
                  WebkitTextStroke: style.boldness === "extra" ? "0.16px #000" : "0",
                }}
              >
                {PREVIEW_COPY[field.id]}
              </p>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 text-[11px] font-bold text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 text-[11px] font-bold text-gray-700 border border-gray-200 rounded hover:bg-gray-50"
        >
          Reset defaults
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty}
          className="px-3 py-1.5 text-[11px] font-bold text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
