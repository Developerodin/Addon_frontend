"use client"

import React, { useEffect, useState, useCallback } from "react"
import { styleCodeService, StyleCode } from "@/shared/services/styleCodeService"

const formatMoney = (value?: number) => {
  if (value === undefined || value === null) return "-"
  return value.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

let _uidCounter = 0
const nextUid = () => `sc_${Date.now()}_${++_uidCounter}`

export interface SelectedStyleCode {
  uid: string
  id: string
  styleCode?: string
  eanCode?: string
}

interface StyleCodeMultiSelectProps {
  selected: SelectedStyleCode[]
  onChange: (items: SelectedStyleCode[]) => void
  disabled?: boolean
}

export const StyleCodeMultiSelect = ({
  selected,
  onChange,
  disabled = false,
}: StyleCodeMultiSelectProps) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<StyleCode[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const limit = 20

  useEffect(() => {
    if (!modalOpen) return
    const t = setTimeout(() => setSearch(searchInput.trim()), 400)
    return () => clearTimeout(t)
  }, [modalOpen, searchInput])

  useEffect(() => {
    if (!modalOpen) return
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
          sortBy: "styleCode:asc",
          limit,
          page,
        })
        setRows(resp.results || [])
        setTotalPages(resp.totalPages || 1)
      } catch (e) {
        console.error("Failed to load style codes", e)
        setRows([])
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    }
    void fetchList()
  }, [modalOpen, search, page])

  useEffect(() => {
    if (!modalOpen) {
      setSearchInput("")
      setSearch("")
      setPage(1)
    }
  }, [modalOpen])

  const countForId = useCallback(
    (id: string) => selected.filter((s) => s.id === id).length,
    [selected]
  )

  const addStyleCode = (row: StyleCode) => {
    onChange([
      ...selected,
      { uid: nextUid(), id: row.id, styleCode: row.styleCode, eanCode: row.eanCode },
    ])
  }

  const removeOneById = (styleCodeId: string) => {
    const idx = selected.findIndex((s) => s.id === styleCodeId)
    if (idx === -1) return
    onChange(selected.filter((_, i) => i !== idx))
  }

  const removeByUid = (uid: string) => {
    onChange(selected.filter((s) => s.uid !== uid))
  }

  if (!modalOpen) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="form-label text-[12px] font-semibold text-gray-800 mb-0">
            Style Codes *
          </label>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={disabled}
          >
            <i className="ri-add-line text-xs" />
            Add Style Codes
          </button>
        </div>
        {selected.length === 0 ? (
          <div className="flex items-center gap-2 py-3 px-3 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-500">
            <i className="ri-purchase-tag-line text-gray-400" />
            No style codes selected. Click &quot;Add Style Codes&quot; to add.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50/50 border border-gray-200 rounded">
            {selected.map((s) => (
              <span
                key={s.uid}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-100 rounded"
              >
                {s.styleCode || s.eanCode || s.id}
                <button
                  type="button"
                  onClick={() => removeByUid(s.uid)}
                  disabled={disabled}
                  className="hover:text-red-600 hover:bg-red-50 rounded p-0.5 transition-colors"
                >
                  <i className="ri-close-line text-sm" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true" role="dialog">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="flex justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Select Style Codes ({selected.length} selected)
            </h3>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
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
                placeholder="Search by style code, EAN..."
                className="w-full pl-9 pr-3 py-2 text-[12px] border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3 opacity-60" />
                <p className="text-[11px] text-gray-500">Loading...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-[11px]">
                No style codes found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 text-left">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-2 py-2 text-[11px] font-bold text-gray-600 uppercase border border-gray-200 text-center w-16">
                        Qty
                      </th>
                      <th className="px-2 py-2 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                        Style Code
                      </th>
                      <th className="px-2 py-2 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                        EAN
                      </th>
                      <th className="px-2 py-2 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                        MRP
                      </th>
                      <th className="px-2 py-2 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                        Brand
                      </th>
                      <th className="px-2 py-2 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                        Pack
                      </th>
                      <th className="px-2 py-2 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const count = countForId(row.id)
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-gray-50/50 border-b border-gray-100 ${
                            count > 0 ? "bg-purple-50/50" : ""
                          }`}
                        >
                          <td className="px-2 py-2 border border-gray-200 text-center">
                            {count > 0 ? (
                              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-purple-600 text-white rounded-full">
                                {count}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-300">0</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-[12px] font-medium text-gray-900 border border-gray-200">
                            {row.styleCode}
                          </td>
                          <td className="px-2 py-2 text-[12px] text-gray-700 border border-gray-200">
                            {row.eanCode}
                          </td>
                          <td className="px-2 py-2 text-[12px] text-gray-700 border border-gray-200">
                            {formatMoney(row.mrp)}
                          </td>
                          <td className="px-2 py-2 text-[12px] text-gray-700 border border-gray-200">
                            {row.brand || "-"}
                          </td>
                          <td className="px-2 py-2 text-[12px] text-gray-700 border border-gray-200">
                            {row.pack || "-"}
                          </td>
                          <td className="px-2 py-2 border border-gray-200">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => addStyleCode(row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded transition-colors bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100"
                              >
                                <i className="ri-add-line" />
                                Add
                              </button>
                              {count > 0 && (
                                <button
                                  type="button"
                                  onClick={() => removeOneById(row.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded transition-colors bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                                >
                                  <i className="ri-subtract-line" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-between border-t border-gray-200 px-4 py-3 text-[11px] text-gray-600">
              <span>
                Page {page} of {totalPages}
              </span>
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
          <div className="border-t border-gray-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-[12px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
            >
              Done ({selected.length} selected)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
