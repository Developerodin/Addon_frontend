"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import BatchBarcodeLabelPreview from "./BatchBarcodeLabelPreview";
import {
  centerProductLabelOnRoll,
  createDefaultProductLabelLayout,
  formatProductLabelLayoutSummary,
  isSameProductLabelLayout,
  loadProductLabelLayout,
  normalizeProductLabelLayout,
  productLabelContentWidthMm,
  saveProductLabelLayout,
  type ProductLabelColumnsPerRow,
  type ProductLabelLayout,
  type ProductLabelOrientation,
} from "./productBarcodeLabelLayoutSettings";
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

function LayoutNumberField({
  id,
  label,
  value,
  min,
  max,
  step = 0.5,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-[12px] text-gray-900"
      />
    </div>
  );
}

export default function BatchBarcodeLabelSettingsPanel({
  onBack,
}: BatchBarcodeLabelSettingsPanelProps) {
  const [savedType, setSavedType] = useState<ProductLabelTypography>(() => loadProductLabelTypography());
  const [draftType, setDraftType] = useState<ProductLabelTypography>(() => loadProductLabelTypography());
  const [savedLayout, setSavedLayout] = useState<ProductLabelLayout>(() => loadProductLabelLayout());
  const [draftLayout, setDraftLayout] = useState<ProductLabelLayout>(() => loadProductLabelLayout());

  const draftLayoutNormalized = useMemo(
    () => normalizeProductLabelLayout(draftLayout),
    [draftLayout],
  );

  const dirtyType = useMemo(
    () => !isSameProductLabelTypography(draftType, savedType),
    [draftType, savedType],
  );
  const dirtyLayout = useMemo(
    () => !isSameProductLabelLayout(draftLayoutNormalized, savedLayout),
    [draftLayoutNormalized, savedLayout],
  );
  const dirty = dirtyType || dirtyLayout;

  const updateField = (id: LabelTypeFieldId, patch: Partial<LabelTypeStyle>) => {
    const meta = getLabelTypeFieldMeta(id);
    setDraftType((prev) => ({
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

  const patchLayout = (patch: Partial<ProductLabelLayout>) => {
    setDraftLayout((prev) => normalizeProductLabelLayout({ ...prev, ...patch }));
  };

  const handleSave = () => {
    try {
      const nextType = saveProductLabelTypography(draftType);
      const nextLayout = saveProductLabelLayout(draftLayoutNormalized);
      setSavedType(nextType);
      setDraftType(nextType);
      setSavedLayout(nextLayout);
      setDraftLayout(nextLayout);
      toast.success(`Saved — ${formatProductLabelLayoutSummary(nextLayout)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    }
  };

  const handleReset = () => {
    setDraftType(createDefaultProductLabelTypography());
    setDraftLayout(createDefaultProductLabelLayout());
  };

  const contentW = productLabelContentWidthMm(draftLayoutNormalized);

  return (
    <div className="px-4 py-4 space-y-4 text-[12px] text-gray-600">
      <p className="text-[11px] text-gray-500">
        Set roll size (e.g. 110×70 mm), single or double across, orientation, offsets, and font
        sizes. Preview matches the saved layout. Save to apply on the next print.
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] items-start">
        <div className="space-y-4 min-w-0">
          <section className="border border-purple-100 rounded-lg p-3 bg-purple-50/40 space-y-3">
            <h3 className="text-[11px] font-bold uppercase text-purple-800">Roll &amp; layout</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <LayoutNumberField
                id="roll-width"
                label="Roll width (mm)"
                value={draftLayoutNormalized.rollWidthMm}
                min={40}
                max={200}
                onChange={(rollWidthMm) => patchLayout({ rollWidthMm })}
              />
              <LayoutNumberField
                id="roll-height"
                label="Row height / pitch (mm)"
                value={draftLayoutNormalized.rollHeightMm}
                min={40}
                max={200}
                onChange={(rollHeightMm) => patchLayout({ rollHeightMm })}
              />
              <LayoutNumberField
                id="col-gap"
                label="Gap between labels (mm)"
                value={draftLayoutNormalized.columnGapMm}
                min={0}
                max={10}
                step={0.5}
                onChange={(columnGapMm) => patchLayout({ columnGapMm })}
              />
              <LayoutNumberField
                id="sticker-w"
                label="Sticker width (mm)"
                value={draftLayoutNormalized.stickerWidthMm}
                min={30}
                max={80}
                onChange={(stickerWidthMm) => patchLayout({ stickerWidthMm })}
              />
              <LayoutNumberField
                id="sticker-h"
                label="Sticker height (mm)"
                value={draftLayoutNormalized.stickerHeightMm}
                min={40}
                max={120}
                onChange={(stickerHeightMm) => patchLayout({ stickerHeightMm })}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                  Labels per row
                </span>
                <div className="flex gap-1">
                  {([1, 2] as ProductLabelColumnsPerRow[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => patchLayout({ columnsPerRow: n })}
                      className={`flex-1 px-2 py-1.5 text-[11px] font-bold rounded border ${
                        draftLayoutNormalized.columnsPerRow === n
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {n === 1 ? "Single" : "Double"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="layout-orient" className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                  Orientation
                </label>
                <select
                  id="layout-orient"
                  value={draftLayoutNormalized.orientation}
                  onChange={(e) =>
                    patchLayout({ orientation: e.target.value as ProductLabelOrientation })
                  }
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-[12px]"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <LayoutNumberField
                id="offset-x"
                label="Offset X (mm)"
                value={draftLayoutNormalized.offsetXMm}
                min={0}
                max={50}
                step={0.5}
                onChange={(offsetXMm) => patchLayout({ offsetXMm })}
              />
              <LayoutNumberField
                id="offset-y"
                label="Offset Y (mm)"
                value={draftLayoutNormalized.offsetYMm}
                min={0}
                max={20}
                step={0.5}
                onChange={(offsetYMm) => patchLayout({ offsetYMm })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
              <span>
                Content width: <strong>{contentW} mm</strong> on{" "}
                <strong>{draftLayoutNormalized.rollWidthMm} mm</strong> roll
              </span>
              <button
                type="button"
                onClick={() => setDraftLayout(centerProductLabelOnRoll(draftLayoutNormalized))}
                className="px-2 py-1 text-[10px] font-bold border border-gray-200 rounded bg-white hover:bg-gray-50"
              >
                Center on roll
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] gap-3 items-end pt-1 border-t border-purple-100">
              <LayoutNumberField
                id="row-gap-adjust"
                label="Row gap adjust (mm)"
                value={draftLayoutNormalized.rowGapAdjustMm}
                min={-40}
                max={40}
                step={0.5}
                onChange={(rowGapAdjustMm) => patchLayout({ rowGapAdjustMm })}
              />
              <p className="text-[11px] text-gray-600 leading-snug">
                This is the blank space between printed rows. Leave at <strong>0</strong> and print
                4 labels: two stickers, then the next two, with no empty row between them. If a
                blank row remains, try <strong>-2</strong>, then <strong>-5</strong>, and Save.
                Positive values add space.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftLayoutNormalized.qzOneJobPerPage}
                  onChange={(e) => patchLayout({ qzOneJobPerPage: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-[11px]">
                  Separate print job per row — leave off. On often feeds one blank row after every pair.
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftLayoutNormalized.qzPixelPerfect}
                  onChange={(e) => patchLayout({ qzPixelPerfect: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-[11px]">
                  Fixed size, no scaling — leave off. On can spill each row onto a second blank label.
                </span>
              </label>
            </div>
          </section>

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
                        style={draftType[id]}
                        onChange={updateField}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="order-first lg:order-last lg:sticky lg:top-14">
          <BatchBarcodeLabelPreview typography={draftType} layout={draftLayoutNormalized} />
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