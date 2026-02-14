"use client"
import React, { useEffect, useState } from 'react'
import { styleCodeService, StyleCode } from '@/shared/services/styleCodeService'

const formatMoney = (value?: number) => {
  if (value === undefined || value === null) return '-'
  return value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

interface StyleCodeSelectModalProps {
  open: boolean
  onClose: () => void
  onSelect: (styleCode: StyleCode) => void
}

export const StyleCodeSelectModal = ({ open, onClose, onSelect }: StyleCodeSelectModalProps) => {
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [rows, setRows] = useState<StyleCode[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [loading, setLoading] = useState(false)
  const limit = 20

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => setSearch(searchInput.trim()), 400)
    return () => clearTimeout(t)
  }, [open, searchInput])

  useEffect(() => {
    if (!open) return
    const fetchList = async () => {
      setLoading(true)
      try {
        const q = search || undefined
        const resp = await styleCodeService.list({
          styleCode: q,
          eanCode: q,
          brand: q,
          pack: q,
          status: undefined,
          sortBy: 'styleCode:asc',
          limit,
          page,
        })
        setRows(resp.results || [])
        setTotalPages(resp.totalPages || 1)
        setTotalResults(resp.totalResults || 0)
      } catch (e) {
        console.error('Failed to load style codes', e)
        setRows([])
        setTotalPages(1)
        setTotalResults(0)
      } finally {
        setLoading(false)
      }
    }
    void fetchList()
  }, [open, search, page])

  useEffect(() => {
    if (!open) {
      setSearchInput('')
      setSearch('')
      setPage(1)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true" role="dialog">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-base font-semibold text-gray-900">Browse Style Codes</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by style code, EAN, brand, pack..."
                className="w-full form-control pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3 opacity-60" />
                <p className="text-xs text-gray-500">Loading...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">No style codes found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 text-left">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">Style Code</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">EAN</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">MRP</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">Brand</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">Pack</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">Status</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-600 uppercase border border-gray-200 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/50 border-b border-gray-100">
                        <td className="px-3 py-2 text-[12px] font-medium text-gray-900 border border-gray-200">{row.styleCode}</td>
                        <td className="px-3 py-2 text-[12px] text-gray-700 border border-gray-200">{row.eanCode}</td>
                        <td className="px-3 py-2 text-[12px] text-gray-700 border border-gray-200">{formatMoney(row.mrp)}</td>
                        <td className="px-3 py-2 text-[12px] text-gray-700 border border-gray-200">{row.brand || '-'}</td>
                        <td className="px-3 py-2 text-[12px] text-gray-700 border border-gray-200">{row.pack || '-'}</td>
                        <td className="px-3 py-2 text-[11px] border border-gray-200">
                          <span className={`px-2 py-0.5 rounded ${row.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right border border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              onSelect(row)
                              onClose()
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded hover:bg-purple-100"
                          >
                            <i className="ri-check-line" /> Use this
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-600">
              <span>Page {page} of {totalPages} • {totalResults} total</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
