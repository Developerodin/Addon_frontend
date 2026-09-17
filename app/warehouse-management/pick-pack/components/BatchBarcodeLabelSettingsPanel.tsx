"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import BatchBarcodeLabelPreview from "./BatchBarcodeLabelPreview";
import {
  LABEL_FONT_MM_STEP,
  LABEL_TYPE_GROUPS,
  clampLabelFontMm,
  createDefaultProductLabelTypography,
  getLabelTypeFieldMeta,
  isSameProductLabelTypography,
  loadProductLabelTypography,
  parseLabelBoldness,
  saveProductLabelTypography,
  type LabelBoldness,
  type LabelTypeFieldId,
  type LabelTypeStyle,
  type ProductLabelTypography,
} from "./productBarcodeLabelSettings";

export interface BatchBarcodeLabelSettingsPanelProps {
  onBack: () => void;
}

/**
 * Render one size + boldness row for a sticker field.
 */
function LabelTypeFieldRow({
  id,
  style,
  onChange,
}: {
  id: LabelTypeFieldId;
  style: LabelTypeStyle;
  onChange: (id: LabelTypeFieldId, patch: Partial<LabelTypeStyle>) => void;
}) {
  const meta = getLabelTypeFieldMeta(id);
  return (
    <tr className="border-t border-gray-100">
      <td className="px-3 py-2 font-semibold text-gray-800">{meta.label}</td>
      <td className="px-3 py-2">
        <label className="sr-only" htmlFor={`label-font-${id}`}>
          {meta.kind === "barcode" ? "Height" : "Font size"} for {meta.label}
        </label>
        <input
          id={`label-font-${id}`}
          type="number"
          min={meta.minMm}
          max={meta.maxMm}
          step={LABEL_FONT_MM_STEP}
          value={style.fontMm}
          onChange={(e) => onChange(id, { fontMm: Number(e.target.value) })}
          className="w-20 border border-gray-200 rounded px-2 py-1 text-right text-[12px] text-gray-900"
        />
      </td>
      <td className="px-3 py-2">
        {meta.kind === "barcode" ? (
          <span className="text-gray-400">—</span>
        ) : (
          <>
            <label className="sr-only" htmlFor={`label-bold-${id}`}>
              Boldness for {meta.label}
            </label>
            <select
              id={`label-bold-${id}`}
              value={style.boldness}
              onChange={(e) => onChange(id, { boldness: e.target.value as LabelBoldness })}
              className="w-full border border-gray-200 rounded px-2 py-1 text-[12px] text-gray-900"
            >
              <option value="regular">Regular</option>
              <option value="bold">Bold</option>
              <option value="extra">Extra bold</option>
            </select>
          </>
        )}
      </td>
    </tr>
  );
}

/**
 * Edit and persist all 50×70mm sticker type (barcode, legal, details) as the print default.
 */
export default function BatchBarcodeLabelSettingsPanel({
  onBack,
}: BatchBarcodeLabelSettingsPanelProps) {
  const [saved, setSaved] = useState<ProductLabelTypography>(() => loadProductLabelTypography());
  const [draft, setDraft] = useState<ProductLabelTypography>(() => loadProductLabelTypography());
  const dirty = useMemo(() => !isSameProductLabelTypography(draft, saved), [draft, saved]);

  /**
   * Patch one field on the unsaved draft.
   * @param id - Field id
   * @param patch - Partial style
   */
  const updateField = (id: LabelTypeFieldId, patch: Partial<LabelTypeStyle>) => {
    const meta = getLabelTypeFieldMeta(id);
    setDraft((prev) => ({
      ...prev,
      [id]: {
        fontMm:
          patch.fontMm != null
            ? clampLabelFontMm(patch.fontMm, meta.minMm, meta.maxMm)
            : prev[id].fontMm,
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
        Control the whole 50×70mm sticker: barcode height, EAN, legal block, and Name → USP. Preview
        is actual size. Save to use on the next print.
      </p>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] items-start">
        <div className="overflow-x-auto border border-gray-200 rounded-lg min-w-0">
          <table className="w-full min-w-[380px]">
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
              {LABEL_TYPE_GROUPS.map((group) => (
                <React.Fragment key={group.title}>
                  <tr className="bg-gray-50/80">
                    <td
                      colSpan={3}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-purple-700"
                    >
                      {group.title}
                    </td>
                  </tr>
                  {group.fieldIds.map((id) => (
                    <LabelTypeFieldRow
                      key={id}
                      id={id}
                      style={draft[id]}
                      onChange={updateField}
                    />
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="order-first sm:order-last sm:sticky sm:top-14">
          <BatchBarcodeLabelPreview typography={draft} />
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
