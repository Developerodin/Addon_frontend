"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Seo from "@/shared/layout-components/seo/seo"
import { Toaster, toast } from "react-hot-toast"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import {
  styleCodePairsService,
  StyleCodePair,
} from "@/shared/services/styleCodePairsService"

const getPairId = (row: StyleCodePair) => (row as { id?: string }).id ?? (row as { _id?: string })._id ?? ""

const formatMoney = (value?: number) => {
  if (value === undefined || value === null) return "-"
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

const parseStatus = (v: unknown): "active" | "inactive" =>
  String(v || "").toLowerCase() === "inactive" ? "inactive" : "active"

/** Extract style codes from row: Style Code 1, Style Code 2, styleCode1, etc. */
const extractStyleCodesFromRow = (row: Record<string, unknown>): string[] => {
  const entries: { idx: number; value: string }[] = []
  for (const k of Object.keys(row)) {
    const normalized = k.replace(/_/g, " ").trim()
    const m = normalized.match(/style\s*code\s*(\d+)/i) || k.match(/styleCode(\d+)/i)
    if (m) {
      const v = String(row[k] ?? "").trim()
      if (v) entries.push({ idx: parseInt(m[1], 10), value: v })
    }
  }
  return entries.sort((a, b) => a.idx - b.idx).map((e) => e.value)
}

/** Extract BOM from row: BOM 1 Raw Material, BOM 1 Quantity, BOM 2 Raw Material, etc. */
const extractBomFromRow = (
  row: Record<string, unknown>
): Array<{ rawMaterial: string; quantity: number }> => {
  const bom: Array<{ rawMaterial: string; quantity: number }> = []
  const keys = Object.keys(row)
  const indices = new Set<number>()
  for (const k of keys) {
    const m = k.match(/bom\s*(\d+)/i)
    if (m) indices.add(parseInt(m[1], 10))
  }
  for (const i of Array.from(indices).sort((a, b) => a - b)) {
    const qtyKey = keys.find((k) => {
      const n = k.replace(/_/g, " ").toLowerCase()
      return n.includes(`bom ${i}`) && (n.includes("quantity") || n.includes("qty"))
    })
    const rawKey = keys.find((k) => {
      const n = k.replace(/_/g, " ").toLowerCase()
      if (!n.includes(`bom ${i}`) || n.includes("quantity") || n.includes("qty")) return false
      return true
    })
    const rawMaterial = rawKey ? String(row[rawKey] ?? "").trim() : ""
    const quantity = qtyKey ? Number(row[qtyKey] ?? 0) : 0
    if (rawMaterial && !Number.isNaN(quantity) && quantity >= 0) {
      bom.push({ rawMaterial, quantity })
    }
  }
  return bom
}

const StyleCodePairsPage = () => {
  const [rows, setRows] = useState<StyleCodePair[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"active" | "inactive" | "">("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isBomImporting, setIsBomImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const bomImportInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPage(1)
  }, [search, status])

  useEffect(() => {
    void fetchPairs()
  }, [page, limit, search, status])

  const fetchPairs = async () => {
    try {
      setIsLoading(true)
      const resp = await styleCodePairsService.list({
        search: search || undefined,
        status: status || undefined,
        sortBy: "pairStyleCode:asc",
        limit,
        page,
      })
      setRows(resp.results || [])
      setTotalPages(resp.totalPages || 1)
      setTotalResults(resp.totalResults || 0)
    } catch (error) {
      console.error("Failed to load style code pairs", error)
      toast.error("Failed to load style code pairs")
      setRows([])
      setTotalPages(1)
      setTotalResults(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this style code pair?")) return
    try {
      setDeletingId(id)
      await styleCodePairsService.remove(id)
      toast.success("Style code pair deleted")
      await fetchPairs()
    } catch (error) {
      console.error("Delete failed", error)
      toast.error("Failed to delete")
    } finally {
      setDeletingId(null)
    }
  }

  const getStyleCodesDisplay = (pair: StyleCodePair) => {
    const sc = pair.styleCodes || []
    return sc
      .map((s) => (typeof s === "string" ? s : s?.styleCode || s?.eanCode || s?.id))
      .filter(Boolean)
      .join(", ") || "-"
  }

  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        pairStyleCode: "PAIR001",
        eanCode: "EAN9999",
        mrp: 500,
        pack: 2,
        status: "active",
        "Style Code 1": "69bd044ab399809ef74b0e26",
        "Style Code 2": "",
        "Style Code 3": "",
        "BOM 1 Raw Material": "6841517d98f9ff407c4e9ada",
        "BOM 1 Quantity": 100,
        "BOM 2 Raw Material": "",
        "BOM 2 Quantity": "",
      },
      {
        pairStyleCode: "PAIR002",
        eanCode: "EAN8888",
        mrp: 399,
        pack: 1,
        status: "active",
        "Style Code 1": "69bd044ab399809ef74b0e26",
        "Style Code 2": "69bd044ab399809ef74b0e27",
        "Style Code 3": "",
        "BOM 1 Raw Material": "6841517d98f9ff407c4e9ada",
        "BOM 1 Quantity": 50,
        "BOM 2 Raw Material": "684a71ec9db38a0bfcaf67d1",
        "BOM 2 Quantity": 25,
      },
    ]
    const instructions = [
      { Field: "pairStyleCode", Description: "Unique pair code (required). Upserts by this." },
      { Field: "eanCode", Description: "EAN code (required)" },
      { Field: "mrp", Description: "MRP number (required)" },
      { Field: "pack", Description: "Pack number (optional)" },
      { Field: "status", Description: "active or inactive (default: active)" },
      {
        Field: "Style Code 1, 2, 3...",
        Description: "Add Style Code 1, Style Code 2, Style Code 3, etc. - as many as you need. At least one required.",
      },
      {
        Field: "BOM 1 Raw Material, BOM 1 Quantity, BOM 2...",
        Description: "Add BOM 1 Raw Material, BOM 1 Quantity, BOM 2 Raw Material, BOM 2 Quantity, etc. - as many as you need.",
      },
    ]
    const ws = XLSX.utils.json_to_sheet(templateRows)
    const wsInst = XLSX.utils.json_to_sheet(instructions)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Style Code Pairs")
    XLSX.utils.book_append_sheet(wb, wsInst, "Instructions")
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/octet-stream" })
    saveAs(blob, "style-code-pairs-template.xlsx")
    toast.success("Template downloaded")
  }

  const handleImportClick = () => importInputRef.current?.click()

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setIsImporting(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rowsJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet || {}, {
        defval: "",
      })
      if (!rowsJson.length) {
        toast.error("No rows found in file")
        return
      }
      const items = rowsJson
        .map((row) => {
          const r = row as Record<string, unknown>
          const pairStyleCode = String(
            r.pairStyleCode ?? r["Pair Style Code"] ?? ""
          ).trim()
          const eanCode = String(r.eanCode ?? r.EAN ?? r["EAN Code"] ?? "").trim()
          const mrp = Number(r.mrp ?? r.MRP ?? 0)
          const packVal = r.pack ?? r.Pack
          const pack = packVal === "" || packVal === undefined ? undefined : Number(packVal)
          const status = parseStatus(r.status ?? r.Status)
          const styleCodes = extractStyleCodesFromRow(r)
          const bom = extractBomFromRow(r)

          if (!pairStyleCode || !eanCode || Number.isNaN(mrp) || styleCodes.length === 0) {
            return null
          }
          return {
            pairStyleCode,
            eanCode,
            mrp,
            pack,
            status,
            styleCodes,
            bom: bom.length > 0 ? bom : undefined,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      if (items.length === 0) {
        toast.error("No valid rows. Need pairStyleCode, eanCode, mrp, styleCodes.")
        return
      }

      const summary = await styleCodePairsService.bulkImport({
        items,
        batchSize: Math.min(items.length, 50),
      })
      toast.success(
        `Imported: ${summary.created} created, ${summary.updated} updated. Failed: ${summary.failed}`
      )
      await fetchPairs()
    } catch (error) {
      console.error("Import failed", error)
      toast.error("Import failed")
    } finally {
      setIsImporting(false)
    }
  }

  const handleDownloadBomTemplate = () => {
    const templateRows = [
      {
        styleCodePairsId: "69bd0cb438fac44cb5f331cb",
        "BOM 1 Raw Material": "6841517d98f9ff407c4e9ada",
        "BOM 1 Quantity": 1000,
        "BOM 2 Raw Material": "684a71ec9db38a0bfcaf67d1",
        "BOM 2 Quantity": 50,
        "BOM 3 Raw Material": "",
        "BOM 3 Quantity": "",
      },
      {
        styleCodePairsId: "69bd0cb438fac44cb5f331cc",
        "BOM 1 Raw Material": "6841517d98f9ff407c4e9ada",
        "BOM 1 Quantity": 500,
        "BOM 2 Raw Material": "",
        "BOM 2 Quantity": "",
      },
    ]
    const instructions = [
      { Field: "styleCodePairsId", Description: "Style code pair ID (required)" },
      {
        Field: "BOM 1 Raw Material, BOM 1 Quantity, BOM 2...",
        Description: "Add BOM 1 Raw Material, BOM 1 Quantity, BOM 2 Raw Material, BOM 2 Quantity, etc. - as many as you need.",
      },
    ]
    const ws = XLSX.utils.json_to_sheet(templateRows)
    const wsInst = XLSX.utils.json_to_sheet(instructions)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "BOM")
    XLSX.utils.book_append_sheet(wb, wsInst, "Instructions")
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/octet-stream" })
    saveAs(blob, "style-code-pairs-bom-template.xlsx")
    toast.success("BOM template downloaded")
  }

  const handleBomImportClick = () => bomImportInputRef.current?.click()

  const handleBomImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setIsBomImporting(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rowsJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet || {}, {
        defval: "",
      })
      if (!rowsJson.length) {
        toast.error("No rows found in file")
        return
      }
      const items = rowsJson
        .map((row) => {
          const r = row as Record<string, unknown>
          const styleCodePairsId = String(
            r.styleCodePairsId ?? r["Style Code Pairs ID"] ?? r["styleCodePairsId"] ?? ""
          ).trim()
          const bom = extractBomFromRow(r)
          if (!styleCodePairsId || bom.length === 0) return null
          return { styleCodePairsId, bom }
        })
        .filter((x): x is { styleCodePairsId: string; bom: Array<{ rawMaterial: string; quantity: number }> } => x !== null)

      if (items.length === 0) {
        toast.error("No valid rows. Need styleCodePairsId and bom.")
        return
      }

      const summary = await styleCodePairsService.bulkImportBom({
        items,
        batchSize: Math.min(items.length, 50),
      })
      toast.success(
        `BOM imported: ${summary.updated} updated. Failed: ${summary.failed}`
      )
      await fetchPairs()
    } catch (error) {
      console.error("BOM import failed", error)
      toast.error("BOM import failed")
    } finally {
      setIsBomImporting(false)
    }
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Style Code Pairs" />
      <Toaster position="top-right" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 relative">
        {(isImporting || isBomImporting) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 rounded">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-200 border-t-purple-600 mb-3" />
            <p className="text-[11px] font-bold text-gray-700">
              {isBomImporting ? "Importing BOM…" : "Importing Excel…"}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Uploading and processing</p>
          </div>
        )}
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Style Code Pairs</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search pairs..."
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 font-medium"
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "" | "active" | "inactive")}
                className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300"
              >
                {[10, 20, 50, 100].map((opt) => (
                  <option key={opt} value={opt}>
                    Show {opt}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <i className="ri-download-line text-xs" />
                Template
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                disabled={isImporting || isBomImporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <i className="ri-loader-4-line text-xs animate-spin" />
                ) : (
                  <i className="ri-upload-cloud-line text-xs" />
                )}
                Import
              </button>
              <button
                type="button"
                onClick={handleDownloadBomTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <i className="ri-download-line text-xs" />
                BOM Template
              </button>
              <button
                type="button"
                onClick={handleBomImportClick}
                disabled={isImporting || isBomImporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-[11px] font-bold rounded hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isBomImporting ? (
                  <i className="ri-loader-4-line text-xs animate-spin" />
                ) : (
                  <i className="ri-upload-cloud-2-line text-xs" />
                )}
                BOM Import
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImport}
              />
              <input
                ref={bomImportInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleBomImport}
              />
              <Link
                href="/catalog/style-code-pairs/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs" />
                Add Pair
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
                Loading
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-link text-xl text-gray-200" />
              </div>
              <h3 className="text-[11px] font-bold text-gray-400 mb-1">
                No style code pairs yet
              </h3>
              <p className="text-[10px] text-gray-500">
                Add pairs to link style codes together.
              </p>
              <Link
                href="/catalog/style-code-pairs/add"
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs" />
                Add First Pair
              </Link>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Pair Style Code
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    EAN
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    MRP
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Pack
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Style Codes
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Status
                  </th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const pairId = getPairId(row)
                  return (
                  <tr
                    key={pairId}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                      {row.pairStyleCode}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-700 border border-gray-200">
                      {row.eanCode}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-700 border border-gray-200">
                      {formatMoney(row.mrp)}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      {row.pack ?? "-"}
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200 max-w-[180px] truncate">
                      {getStyleCodesDisplay(row)}
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                          row.status === "active"
                            ? "bg-green-50 text-green-700 border border-green-100"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
                            row.status === "active" ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/catalog/style-code-pairs/${pairId}/edit`}
                          className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors"
                          title="Edit"
                        >
                          <i className="ri-pencil-line text-xs" />
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === pairId}
                          onClick={() => handleDelete(pairId)}
                          className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-500 border border-red-100 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === pairId ? (
                            <i className="ri-loader-4-line text-xs animate-spin" />
                          ) : (
                            <i className="ri-delete-bin-line text-xs" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && rows.length > 0 && (
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
            <div className="text-[11px] font-medium text-[#495057] tracking-tight">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, totalResults)} of {totalResults} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <span className="text-[11px] font-medium text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StyleCodePairsPage
