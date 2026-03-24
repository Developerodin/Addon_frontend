"use client"
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast, Toaster } from 'react-hot-toast'
import Seo from '@/shared/layout-components/seo/seo'
import { styleCodeService, StyleCode } from '@/shared/services/styleCodeService'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

type Status = 'active' | 'inactive' | ''

interface Filters {
  search: string
  status: Status
}

const formatMoney = (value?: number) => {
  if (value === undefined || value === null) return '-'
  return value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

/** Extract BOM from row: BOM 1 Raw Material, BOM 1 Quantity, BOM 2 Raw Material, etc. */
const extractBomFromRow = (row: Record<string, unknown>): Array<{ rawMaterial: string; quantity: number }> => {
  const bom: Array<{ rawMaterial: string; quantity: number }> = []
  const keys = Object.keys(row)
  const indices = new Set<number>()
  for (const k of keys) {
    const m = k.match(/bom\s*(\d+)/i)
    if (m) indices.add(parseInt(m[1], 10))
  }
  for (const i of Array.from(indices).sort((a, b) => a - b)) {
    const qtyKey = keys.find((k) => {
      const n = k.replace(/_/g, ' ').toLowerCase()
      return n.includes(`bom ${i}`) && (n.includes('quantity') || n.includes('qty'))
    })
    const rawKey = keys.find((k) => {
      const n = k.replace(/_/g, ' ').toLowerCase()
      if (!n.includes(`bom ${i}`) || n.includes('quantity') || n.includes('qty')) return false
      return true
    })
    const rawMaterial = rawKey ? String(row[rawKey] ?? '').trim() : ''
    const quantity = qtyKey ? Number(row[qtyKey] ?? 0) : 0
    if (rawMaterial && !Number.isNaN(quantity) && quantity >= 0) {
      bom.push({ rawMaterial, quantity })
    }
  }
  return bom
}

const StyleCodesPage = () => {
  const [rows, setRows] = useState<StyleCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [filters, setFilters] = useState<Filters>({ search: '', status: '' })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  // const [isSyncing, setIsSyncing] = useState(false) // bulk-sync UI commented out
  const [isExporting, setIsExporting] = useState(false)
  const [isBomImporting, setIsBomImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  // const syncInputRef = useRef<HTMLInputElement>(null)
  const bomImportInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPage(1)
  }, [filters.search, filters.status])

  useEffect(() => {
    void fetchStyleCodes()
  }, [page, limit, filters])

  const fetchStyleCodes = async () => {
    try {
      setIsLoading(true)
      const resp = await styleCodeService.list({
        styleCode: filters.search || undefined,
        eanCode: filters.search || undefined,
        brand: filters.search || undefined,
        pack: filters.search || undefined,
        status: filters.status || undefined,
        sortBy: 'styleCode:asc',
        limit,
        page,
      })
      setRows(resp.results || [])
      setTotalPages(resp.totalPages || 1)
      setTotalResults(resp.totalResults || 0)
    } catch (error) {
      console.error('Failed to load style codes', error)
      toast.error('Failed to load style codes')
      setRows([])
      setTotalPages(1)
      setTotalResults(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirm = window.confirm('Delete this style code?')
    if (!confirm) return
    try {
      setDeletingId(id)
      await styleCodeService.remove(id)
      toast.success('Style code deleted')
      await fetchStyleCodes()
    } catch (error) {
      console.error('Delete failed', error)
      toast.error('Failed to delete style code')
    } finally {
      setDeletingId(null)
    }
  }

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return
    setPage(nextPage)
  }

  const handleLimitChange = (value: number) => {
    setLimit(value)
    setPage(1)
  }

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }))
  }

  const handleStatusChange = (value: Status) => {
    setFilters((prev) => ({ ...prev, status: value }))
  }

  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        styleCode: 'SC-001',
        eanCode: 'EAN123',
        mrp: 199,
        brand: 'Brand A',
        pack: '2-pack',
        status: 'active',
      },
      {
        styleCode: 'SC-002',
        eanCode: 'EAN456',
        mrp: 249,
        brand: 'Brand B',
        pack: '3-pack',
        status: 'inactive',
      },
    ]
    const ws = XLSX.utils.json_to_sheet(templateRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Style Codes')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    saveAs(blob, 'style-codes-template.xlsx')
    toast.success('Template downloaded')
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const exportLimit = 500
      let allRows: StyleCode[] = []
      let currentPage = 1
      let totalToFetch = 1

      do {
        const resp = await styleCodeService.list({
          sortBy: 'styleCode:asc',
          limit: exportLimit,
          page: currentPage,
        })
        const results = resp.results || []
        allRows = allRows.concat(results)
        totalToFetch = resp.totalResults ?? allRows.length
        if (results.length < exportLimit || allRows.length >= totalToFetch) break
        currentPage += 1
      } while (allRows.length < totalToFetch)

      if (allRows.length === 0) {
        toast.error('No style codes to export')
        return
      }

      const exportRows = allRows.map((row) => ({
        id: row.id,
        styleCode: row.styleCode,
        eanCode: row.eanCode,
        mrp: row.mrp ?? 0,
        brand: row.brand ?? '',
        pack: row.pack ?? '',
        status: row.status ?? 'active',
      }))
      const ws = XLSX.utils.json_to_sheet(exportRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Style Codes')
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const filename = `style-codes-export-${new Date().toISOString().slice(0, 10)}.xlsx`
      saveAs(blob, filename)
      toast.success(`Exported all ${allRows.length} style code(s)`)
    } catch (error) {
      console.error('Export failed', error)
      toast.error('Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const parseStatus = (value: any): 'active' | 'inactive' => {
    const v = String(value || '').toLowerCase()
    return v === 'inactive' ? 'inactive' : 'active'
  }

  const parseStyleCodesFromRows = (rowsJson: Record<string, any>[]) =>
    rowsJson
      .map((row) => ({
        styleCode: String(row.styleCode || row.StyleCode || row['Style Code'] || '').trim(),
        eanCode: String(row.eanCode || row.EAN || row['eanCode'] || '').trim(),
        mrp: Number(row.mrp ?? row.MRP ?? 0),
        brand: String(row.brand || row.Brand || '').trim() || undefined,
        pack: String(row.pack || row.Pack || '').trim() || undefined,
        status: parseStatus(row.status || row.Status),
      }))
      .filter((r) => r.styleCode && r.eanCode && !Number.isNaN(r.mrp))

  const readExcelFirstSheetRows = async (file: File): Promise<Record<string, any>[]> => {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    return XLSX.utils.sheet_to_json<Record<string, any>>(sheet || {}, { defval: '' })
  }

  const handleImportClick = () => importInputRef.current?.click()

  const handleDownloadBomTemplate = () => {
    const templateRows = [
      {
        styleCodeId: '69bd044ab399809ef74b0e26',
        'BOM 1 Raw Material': '6841517d98f9ff407c4e9ada',
        'BOM 1 Quantity': 1000,
        'BOM 2 Raw Material': '684a71ec9db38a0bfcaf67d1',
        'BOM 2 Quantity': 100,
        'BOM 3 Raw Material': '',
        'BOM 3 Quantity': '',
      },
      {
        styleCodeId: '69bd044ab399809ef74b0e27',
        'BOM 1 Raw Material': '6841517d98f9ff407c4e9ada',
        'BOM 1 Quantity': 500,
        'BOM 2 Raw Material': '',
        'BOM 2 Quantity': '',
      },
    ]
    const instructions = [
      { Field: 'styleCodeId', Description: 'Style code ID (required)' },
      {
        Field: 'BOM 1 Raw Material, BOM 1 Quantity, BOM 2...',
        Description: 'Add BOM 1 Raw Material, BOM 1 Quantity, BOM 2 Raw Material, BOM 2 Quantity, etc.',
      },
    ]
    const ws = XLSX.utils.json_to_sheet(templateRows)
    const wsInst = XLSX.utils.json_to_sheet(instructions)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'BOM')
    XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    saveAs(blob, 'style-codes-bom-template.xlsx')
    toast.success('BOM template downloaded')
  }

  const handleBomImportClick = () => bomImportInputRef.current?.click()

  const handleBomImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIsBomImporting(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rowsJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet || {}, { defval: '' })
      if (!rowsJson.length) {
        toast.error('No rows found in file')
        return
      }
      const items = rowsJson
        .map((row) => {
          const r = row as Record<string, unknown>
          const styleCodeId = String(r.styleCodeId ?? r['Style Code ID'] ?? r['styleCodeId'] ?? '').trim()
          const bom = extractBomFromRow(r)
          if (!styleCodeId || bom.length === 0) return null
          return { styleCodeId, bom }
        })
        .filter((x): x is { styleCodeId: string; bom: Array<{ rawMaterial: string; quantity: number }> } => x !== null)

      if (items.length === 0) {
        toast.error('No valid rows. Need styleCodeId and bom.')
        return
      }

      const summary = await styleCodeService.bulkImportBom({
        items,
        batchSize: Math.min(items.length, 50),
      })
      toast.success(`BOM imported: ${summary.updated ?? summary.created ?? 0} updated. Failed: ${summary.failed}`)
      await fetchStyleCodes()
    } catch (error) {
      console.error('BOM import failed', error)
      toast.error('BOM import failed')
    } finally {
      setIsBomImporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIsImporting(true)
    try {
      const rowsJson = await readExcelFirstSheetRows(file)
      if (!rowsJson.length) {
        toast.error('No rows found in file')
        return
      }
      const styleCodes = parseStyleCodesFromRows(rowsJson)

      if (styleCodes.length === 0) {
        toast.error('No valid style codes in file')
        return
      }

      const summary = await styleCodeService.bulkImport({
        styleCodes,
        batchSize: Math.min(styleCodes.length, 500),
      })

      toast.success(`Imported: ${summary.created} new, ${summary.updated} updated. Failed: ${summary.failed}`)
      await fetchStyleCodes()
    } catch (error) {
      console.error('Import failed', error)
      toast.error('Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  // const handleSyncClick = () => syncInputRef.current?.click()
  //
  // const handleSyncFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0]
  //   e.target.value = ''
  //   if (!file) return
  //   const confirmed = window.confirm(
  //     'Sync replaces the catalog from this file: rows are upserted, then style codes not present in successful rows are deleted. If every row fails, nothing is deleted. Continue?',
  //   )
  //   if (!confirmed) return
  //   setIsSyncing(true)
  //   try {
  //     const rowsJson = await readExcelFirstSheetRows(file)
  //     if (!rowsJson.length) {
  //       toast.error('No rows found in file')
  //       return
  //     }
  //     const styleCodes = parseStyleCodesFromRows(rowsJson)
  //     if (styleCodes.length === 0) {
  //       toast.error('No valid style codes in file')
  //       return
  //     }
  //     const summary = await styleCodeService.bulkSync({
  //       styleCodes,
  //       batchSize: Math.min(styleCodes.length, 500),
  //     })
  //     const deletedCount = summary.deleted ?? 0
  //     toast.success(
  //       `Synced: ${summary.created} new, ${summary.updated} updated. Failed: ${summary.failed}. Removed: ${deletedCount}`,
  //     )
  //     await fetchStyleCodes()
  //   } catch (error) {
  //     console.error('Sync failed', error)
  //     toast.error('Sync failed')
  //   } finally {
  //     setIsSyncing(false)
  //   }
  // }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Style Codes" />
      <Toaster position="top-right" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 relative">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Style Codes</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search style code / EAN / brand / pack..."
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 font-medium"
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </div>
              <select
                value={filters.status}
                onChange={(e) => handleStatusChange(e.target.value as Status)}
                className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300"
              >
                {[10, 20, 50, 100].map((opt) => (
                  <option key={opt} value={opt}>Show {opt}</option>
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
                onClick={handleDownloadBomTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <i className="ri-file-list-3-line text-xs" />
                BOM Template
              </button>
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isExporting ? (
                  <i className="ri-loader-4-line text-xs animate-spin" />
                ) : (
                  <i className="ri-file-excel-2-line text-xs" />
                )}
                Export All
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                disabled={isImporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <i className="ri-loader-4-line text-xs animate-spin" />
                ) : (
                  <i className="ri-upload-cloud-line text-xs" />
                )}
                Import
              </button>
              {/* Sync Excel — bulk-sync; uncomment state/ref/handlers above to re-enable
              <button
                type="button"
                onClick={handleSyncClick}
                disabled={isImporting || isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-[11px] font-bold rounded hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                title="Upsert from Excel; removes style codes not in successful rows"
              >
                {isSyncing ? (
                  <i className="ri-loader-4-line text-xs animate-spin" />
                ) : (
                  <i className="ri-refresh-line text-xs" />
                )}
                Sync Excel
              </button>
              */}
              <button
                type="button"
                onClick={handleBomImportClick}
                disabled={isBomImporting || isImporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-[11px] font-bold rounded hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isBomImporting ? (
                  <i className="ri-loader-4-line text-xs animate-spin" />
                ) : (
                  <i className="ri-stack-line text-xs" />
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
              {/* <input
                ref={syncInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleSyncFromExcel}
              /> */}
              <input
                ref={bomImportInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleBomImport}
              />
              <Link
                href="/catalog/style-codes/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs" />
                Add Style Code
              </Link>
            </div>
          </div>
        </div>

        {(isImporting || isBomImporting) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 rounded">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-200 border-t-purple-600 mb-3" />
            <p className="text-[11px] font-bold text-gray-700">
              {isBomImporting ? 'Importing BOM…' : 'Importing Excel…'}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">Uploading and processing</p>
          </div>
        )}

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-purchase-tag-line text-xl text-gray-200" />
              </div>
              <h3 className="text-[11px] font-bold text-gray-400 mb-1">No style codes found</h3>
              <p className="text-[10px] text-gray-500">Try adjusting search or filters.</p>
              <Link
                href="/catalog/style-codes/add"
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs" />
                Add First Style Code
              </Link>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Style Code</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">EAN</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">MRP</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Brand</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Pack</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{row.styleCode}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-700 border border-gray-200">{row.eanCode}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-700 border border-gray-200">{formatMoney(row.mrp)}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{row.brand || '-'}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{row.pack || '-'}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                          row.status === 'active'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${row.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/catalog/style-codes/${row.id}/edit`}
                          className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors"
                          title="Edit"
                        >
                          <i className="ri-pencil-line text-xs" />
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => handleDelete(row.id)}
                          className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-500 border border-red-100 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === row.id ? (
                            <i className="ri-loader-4-line text-xs animate-spin" />
                          ) : (
                            <i className="ri-delete-bin-line text-xs" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && rows.length > 0 && (
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
            <div className="text-[11px] font-medium text-[#495057] tracking-tight">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalResults)} of {totalResults} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <span className="text-[11px] font-medium text-gray-600">Page {page} of {totalPages}</span>
              <button
                onClick={() => handlePageChange(page + 1)}
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

export default StyleCodesPage
