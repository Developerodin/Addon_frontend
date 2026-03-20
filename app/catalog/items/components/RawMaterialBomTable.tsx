'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { rawMaterialService, RawMaterial } from '@/shared/services/rawMaterialService';

export interface RawMaterialBomItem {
  rawMaterialId: string;
  rawMaterialName?: string;
  quantity: number;
}

interface RawMaterialBomTableProps {
  items: RawMaterialBomItem[];
  onChange: (items: RawMaterialBomItem[]) => void;
  disabled?: boolean;
}

const ITEMS_PER_PAGE = 20;

/** Get stable id from API (backend may return id or _id). */
function getMaterialId(m: RawMaterial | Record<string, unknown>): string {
  const row = m as Record<string, unknown>;
  return (row.id as string) ?? (row._id as string) ?? '';
}

/** Get display name. */
function getMaterialName(m: RawMaterial | Record<string, unknown>): string {
  const row = m as Record<string, unknown>;
  return (row.name as string) ?? '';
}

/** BOM-style table: each row = raw material (select from modal) + quantity. Add/remove rows. Modal like yarn: table + search + pagination. */
export function RawMaterialBomTable({ items, onChange, disabled }: RawMaterialBomTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const fetchMaterials = useCallback(async (page: number, searchQuery: string) => {
    setLoading(true);
    try {
      const res = await rawMaterialService.listPaginated({
        page,
        limit: ITEMS_PER_PAGE,
        search: searchQuery || undefined,
      });
      setMaterials(res.results);
      setTotalPages(res.totalPages);
      setTotalResults(res.totalResults);
    } catch {
      setMaterials([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // When modal opens, reset page and search
  useEffect(() => {
    if (modalOpen) setCurrentPage(1);
  }, [modalOpen]);

  // Debounced search: sync searchInput -> search after 500ms, reset to page 1
  useEffect(() => {
    if (!modalOpen) return;
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [modalOpen, searchInput]);

  // Fetch when modal is open and page/search change
  useEffect(() => {
    if (!modalOpen) return;
    fetchMaterials(currentPage, search);
  }, [modalOpen, currentPage, search, fetchMaterials]);

  const openModal = (index: number) => {
    setSelectedRowIndex(index);
    setSearchInput('');
    setSearch('');
    setCurrentPage(1);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedRowIndex(null);
  };

  const selectMaterial = (material: RawMaterial | Record<string, unknown>) => {
    if (selectedRowIndex === null) return;
    const id = getMaterialId(material);
    const name = getMaterialName(material);
    if (!id) return;
    const next = [...items];
    next[selectedRowIndex] = {
      rawMaterialId: id,
      rawMaterialName: name,
      quantity: next[selectedRowIndex]?.quantity ?? 0,
    };
    onChange(next);
    closeModal();
  };

  const updateQuantity = (index: number, value: number) => {
    const next = [...items];
    next[index] = { ...next[index], quantity: value };
    onChange(next);
  };

  const addRow = () => {
    onChange([...items, { rawMaterialId: '', rawMaterialName: '', quantity: 0 }]);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <label className="form-label text-[12px] font-semibold text-gray-800 mb-0">Raw Materials</label>
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={disabled}
        >
          <i className="ri-add-line text-xs" />
          Add Raw Material
        </button>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Raw Material</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Quantity</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200 w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-[11px] text-gray-500 py-6 px-4">
                  No raw materials added. Click &quot;Add Raw Material&quot; to add a row.
                </td>
              </tr>
            ) : (
              items.map((row, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/30">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openModal(index)}
                      className="w-full text-left px-3 py-2 text-[12px] bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-purple-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between"
                      disabled={disabled}
                    >
                      <span className={row.rawMaterialName ? 'font-medium text-gray-800' : 'text-gray-400'}>
                        {row.rawMaterialName || 'Select Raw Material'}
                      </span>
                      <i className="ri-arrow-down-s-line text-gray-400 text-sm" />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="w-full px-3 py-2 text-[12px] border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                      value={row.quantity}
                      onChange={(e) => updateQuantity(index, Number(e.target.value))}
                      disabled={disabled || !row.rawMaterialId}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 border border-red-100 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                      disabled={disabled}
                      title="Remove"
                    >
                      <i className="ri-delete-bin-line text-sm" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Raw Material Selection Modal - same layout as yarn modal: table + search + pagination */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="raw-material-modal-title" role="dialog" aria-modal="true">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={closeModal} aria-hidden="true" />
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between border-b border-gray-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900" id="raw-material-modal-title">
                  Select Raw Material
                </h3>
                <button type="button" onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                  <i className="ri-close-line text-xl" />
                </button>
              </div>
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2 text-[12px] border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                    placeholder="Search raw materials by name..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3 opacity-60" />
                    <p className="text-[11px] text-gray-500">Loading raw materials...</p>
                  </div>
                ) : materials.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-[11px]">No raw materials found</div>
                ) : (
                  <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase border border-gray-200">Name</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase border border-gray-200">Group Name</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-600 uppercase border border-gray-200">Unit</th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-bold text-gray-600 uppercase border border-gray-200">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m) => (
                        <tr key={getMaterialId(m) || (m as RawMaterial).name} className="hover:bg-gray-50/50 border-b border-gray-100">
                          <td className="px-3 py-2 text-[12px] font-medium text-gray-900 border border-gray-200">{(m as RawMaterial).name}</td>
                          <td className="px-3 py-2 text-[12px] text-gray-600 border border-gray-200">{(m as RawMaterial).groupName || '-'}</td>
                          <td className="px-3 py-2 text-[12px] text-gray-600 border border-gray-200">{(m as RawMaterial).unit || '-'}</td>
                          <td className="px-3 py-2 text-right border border-gray-200">
                            <button
                              type="button"
                              onClick={() => selectMaterial(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 rounded hover:bg-purple-100 transition-colors"
                            >
                              <i className="ri-check-line" />
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {totalResults > 0 && (
                <div className="flex justify-between border-t border-gray-200 px-4 py-3 text-[11px] text-gray-600">
                  <span>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalResults)} of {totalResults}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1 || loading}
                      className="px-2.5 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                    >
                      Prev
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages || loading}
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
      )}
    </div>
  );
}
