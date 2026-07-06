import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import type { StyleCodePair } from "@/shared/services/styleCodePairsService"

/** Resolve Mongo id from a style code pair row. */
export const getPairId = (row: StyleCodePair) =>
  (row as { id?: string }).id ?? (row as { _id?: string })._id ?? ""

/** Resolve display style code string from populated or id reference. */
const getStyleCodeValue = (entry: StyleCodePair["styleCodes"] extends (infer T)[] | undefined ? T : never) => {
  if (typeof entry === "string") return entry
  if (!entry || typeof entry !== "object") return ""
  return entry.styleCode || entry.id || (entry as { _id?: string })._id || ""
}

/** Resolve raw material id from populated BOM entry. */
const getRawMaterialId = (entry: NonNullable<StyleCodePair["bom"]>[number]) => {
  const raw = entry.rawMaterial
  if (typeof raw === "string") return raw
  if (!raw || typeof raw !== "object") return ""
  return raw.id || (raw as { _id?: string })._id || ""
}

/**
 * Convert style code pairs into import-compatible Excel rows.
 * @param pairs - Pairs to export
 * @returns Spreadsheet row objects
 */
export const buildStyleCodePairsExportRows = (pairs: StyleCodePair[]): Record<string, string | number>[] => {
  const maxStyleCodes = pairs.reduce(
    (max, pair) => Math.max(max, pair.styleCodes?.length ?? 0),
    0,
  )
  const maxBomItems = pairs.reduce((max, pair) => Math.max(max, pair.bom?.length ?? 0), 0)

  return pairs.map((pair) => {
    const row: Record<string, string | number> = {
      styleCodePairsId: getPairId(pair),
      pairStyleCode: pair.pairStyleCode,
      eanCode: pair.eanCode,
      mrp: pair.mrp ?? 0,
      pack: pair.pack ?? "",
      status: pair.status ?? "active",
    }

    for (let i = 0; i < maxStyleCodes; i += 1) {
      const entry = pair.styleCodes?.[i]
      row[`Style Code ${i + 1}`] = entry ? getStyleCodeValue(entry) : ""
    }

    for (let i = 0; i < maxBomItems; i += 1) {
      const entry = pair.bom?.[i]
      row[`BOM ${i + 1} Raw Material`] = entry ? getRawMaterialId(entry) : ""
      row[`BOM ${i + 1} Quantity`] = entry?.quantity ?? ""
    }

    return row
  })
}

/**
 * Build BOM-only export rows (matches BOM import template).
 * @param pairs - Pairs to export
 * @returns BOM sheet row objects
 */
export const buildStyleCodePairsBomExportRows = (pairs: StyleCodePair[]): Record<string, string | number>[] => {
  const maxBomItems = pairs.reduce((max, pair) => Math.max(max, pair.bom?.length ?? 0), 0)

  return pairs
    .filter((pair) => (pair.bom?.length ?? 0) > 0)
    .map((pair) => {
      const row: Record<string, string | number> = {
        styleCodePairsId: getPairId(pair),
        pairStyleCode: pair.pairStyleCode,
      }

      for (let i = 0; i < maxBomItems; i += 1) {
        const entry = pair.bom?.[i]
        row[`BOM ${i + 1} Raw Material`] = entry ? getRawMaterialId(entry) : ""
        row[`BOM ${i + 1} Quantity`] = entry?.quantity ?? ""
      }

      return row
    })
}

/**
 * Download style code pairs as an Excel workbook (pairs + BOM sheets).
 * @param pairs - Pairs to export
 * @param filenamePrefix - Optional filename prefix
 */
export const downloadStyleCodePairsWorkbook = (
  pairs: StyleCodePair[],
  filenamePrefix = "style-code-pairs-export",
) => {
  const pairRows = buildStyleCodePairsExportRows(pairs)
  const bomRows = buildStyleCodePairsBomExportRows(pairs)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pairRows), "Style Code Pairs")

  if (bomRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bomRows), "BOM")
  }

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([wbout], { type: "application/octet-stream" })
  const dateStamp = new Date().toISOString().slice(0, 10)
  saveAs(blob, `${filenamePrefix}-${dateStamp}.xlsx`)
}
