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
        <h4 className="text-base font-medium text-gray-800">Raw Materials</h4>
        <button
          type="button"
          onClick={addRow}
          className="ti-btn ti-btn-primary"
          disabled={disabled}
        >
          <i className="ri-add-line me-2"></i> Add Raw Material
        </button>
      </div>
      <div className="table-responsive">
        <table className="table whitespace-nowrap table-bordered min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-start">Raw Material</th>
              <th className="text-start">Quantity</th>
              <th className="text-start">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-gray-500 py-4">
                  No raw materials added. Click &quot;Add Raw Material&quot; to add a row.
                </td>
              </tr>
            ) : (
              items.map((row, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td>
                    <button
                      type="button"
                      onClick={() => openModal(index)}
                      className="form-control text-left bg-white cursor-pointer hover:bg-gray-50"
                      disabled={disabled}
                    >
                      {row.rawMaterialName || 'Select Raw Material'}
                      <i className="ri-arrow-down-s-line float-right mt-1"></i>
                    </button>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-control"
                      value={row.quantity}
                      onChange={(e) => updateQuantity(index, Number(e.target.value))}
                      disabled={disabled || !row.rawMaterialId}
                      placeholder="Quantity"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="ti-btn ti-btn-danger ti-btn-sm"
                      disabled={disabled}
                    >
                      <i className="ri-delete-bin-line"></i>
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
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-transparent bg-opacity-75 transition-opacity"
              onClick={closeModal}
              aria-hidden="true"
            />
            <div
              className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900" id="raw-material-modal-title">
                    Select Raw Material
                  </h3>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <i className="ri-close-line text-2xl"></i>
                  </button>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search raw materials by name..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>

                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  {loading ? (
                    <div className="p-8 text-center">
                      <i className="ri-loader-4-line animate-spin text-2xl text-gray-400"></i>
                      <p className="mt-2 text-gray-500">Loading raw materials...</p>
                    </div>
                  ) : materials.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500">No raw materials found</p>
                    </div>
                  ) : (
                    <table className="table min-w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {materials.map((m) => (
                          <tr key={getMaterialId(m) || (m as RawMaterial).name} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {(m as RawMaterial).name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {(m as RawMaterial).groupName || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {(m as RawMaterial).unit || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <button
                                type="button"
                                onClick={() => selectMaterial(m)}
                                className="ti-btn ti-btn-primary"
                              >
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
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
                    <div className="text-sm text-gray-500 whitespace-nowrap">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                      {Math.min(currentPage * ITEMS_PER_PAGE, totalResults)} of {totalResults} raw materials
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1 || loading}
                        className="ti-btn ti-btn-outline-secondary whitespace-nowrap"
                      >
                        <i className="ri-arrow-left-s-line"></i> Previous
                      </button>
                      <span className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages || loading}
                        className="ti-btn ti-btn-outline-secondary whitespace-nowrap"
                      >
                        Next <i className="ri-arrow-right-s-line"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
