"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

const formatDate = (value?: string) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatMoney = (value?: number) => {
  if (value === undefined || value === null) return '-'
  return value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const StyleCodesPage = () => {
  const router = useRouter()
  const [rows, setRows] = useState<StyleCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [filters, setFilters] = useState<Filters>({ search: '', status: '' })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const visibleCount = useMemo(() => rows.length, [rows])

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

  const parseStatus = (value: any): 'active' | 'inactive' => {
    const v = String(value || '').toLowerCase()
    return v === 'inactive' ? 'inactive' : 'active'
  }

  const handleImportClick = () => importInputRef.current?.click()

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rowsJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet || {}, { defval: '' })
      if (!rowsJson.length) {
        toast.error('No rows found in file')
        return
      }
      const styleCodes = rowsJson.map((row) => ({
        styleCode: String(row.styleCode || row.StyleCode || row['Style Code'] || '').trim(),
        eanCode: String(row.eanCode || row.EAN || row['eanCode'] || '').trim(),
        mrp: Number(row.mrp ?? row.MRP ?? 0),
        brand: String(row.brand || row.Brand || '').trim() || undefined,
        pack: String(row.pack || row.Pack || '').trim() || undefined,
        status: parseStatus(row.status || row.Status),
      })).filter((r) => r.styleCode && r.eanCode && !Number.isNaN(r.mrp))

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
    }
  }

  return (
    <div className="main-content">
      <Seo title="Style Codes" />
      <Toaster position="top-right" />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
            <h1 className="text-xl font-semibold text-gray-900">Style Codes</h1>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {visibleCount} shown
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Manage standalone style codes. Use search or status to narrow results.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search style code / EAN / brand / pack..."
              className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-sm rounded focus:ring-0 focus:border-purple-300 w-72"
            />
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          </div>
          <select
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value as Status)}
            className="bg-white border border-gray-200 text-sm rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50"
          >
            <i className="ri-download-line"></i>
            Template
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50"
          >
            <i className="ri-upload-cloud-line"></i>
            Import
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
          <Link
            href="/catalog/style-codes/add"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 shadow-sm"
          >
            <i className="ri-add-line"></i>
            Add Style Code
          </Link>
        </div>
      </div>

      <div className="box">
        <div className="box-header flex items-center justify-between">
          <h3 className="box-title">Style Code List</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Page {page} of {totalPages}</span>
            <select
              value={limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1 focus:ring-0 focus:border-gray-300"
            >
              {[10, 20, 50, 100, 200].map((option) => (
                <option key={option} value={option}>{option}/page</option>
              ))}
            </select>
          </div>
        </div>
        <div className="box-body p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4 opacity-60"></div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Loading</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <p className="text-sm font-medium">No style codes found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting the search or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">
                      Style Code
                    </th>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">
                      EAN
                    </th>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">
                      MRP
                    </th>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">
                      Brand
                    </th>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">
                      Pack
                    </th>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">
                      Status
                    </th>
                    <th className="px-3 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-[12px] font-semibold text-gray-900">{row.styleCode}</td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-800">{row.eanCode}</td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-800">{formatMoney(row.mrp)}</td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-800">{row.brand || '-'}</td>
                      <td className="px-3 py-2.5 text-[12px] text-gray-800">{row.pack || '-'}</td>
                      <td className="px-3 py-2.5 text-[11px] font-bold">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                            row.status === 'active'
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/catalog/style-codes/${row.id}/edit`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded hover:bg-purple-100 transition-colors"
                          >
                            <i className="ri-edit-line"></i>
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={deletingId === row.id}
                            onClick={() => handleDelete(row.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-100 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <i className="ri-delete-bin-line"></i>
                            {deletingId === row.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <div className="text-sm text-gray-600">
          Showing page {page} of {totalPages} • {visibleCount} style codes on this page • {totalResults} total
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm font-semibold text-gray-500 rounded border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Prev
          </button>
          <div className="text-sm font-medium text-gray-700 px-2">Page {page}</div>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm font-semibold text-gray-500 rounded border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default StyleCodesPage
