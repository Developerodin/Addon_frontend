"use client";

import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { toast, Toaster } from 'react-hot-toast';
import { SalesImportService } from '@/shared/services/salesImportService';
import TemplateDownload from '@/shared/components/TemplateDownload';

// Interface for Seals Excel Master data based on actual API response
interface SealsExcelMaster {
  id: string;
  fileName: string;
  description: string;
  fileUrl: string;
  fileKey: string;
  data: {
    sheets: string[];
    totalRows: number;
    columns: string[];
  };
  uploadedBy: string; // API returns string, not object
  fileSize: number;
  mimeType: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string | null;
  recordsCount: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const MasterSalesPage = () => {
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<SealsExcelMaster[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const itemsPerPage = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Fetch records from API
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/seals-excel-master?limit=${itemsPerPage}&page=${currentPage}`);

      if (response.ok) {
        const result = await response.json();
        
        // Handle direct response structure (no status/data wrapper)
        if (result.results && Array.isArray(result.results)) {
          setRecords(result.results);
          setTotalResults(result.totalResults || result.results.length);
          setTotalPages(result.totalPages || 1);
        } else {
          console.error('Invalid response structure:', result);
          setRecords([]);
          setTotalResults(0);
          setTotalPages(1);
        }
      } else {
        console.error('API request failed:', response.status);
        setRecords([]);
        setTotalResults(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      setRecords([]);
      setTotalResults(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [currentPage, itemsPerPage]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map(record => record.id));
    }
    setSelectAll(!selectAll);
  };

  const handleRecordSelect = (recordId: string) => {
    if (selectedRecords.includes(recordId)) {
      setSelectedRecords(selectedRecords.filter(id => id !== recordId));
    } else {
      setSelectedRecords([...selectedRecords, recordId]);
    }
  };

  // Filter records based on search query
  const filteredRecords = records.filter(record =>
    Object.values(record).some(value =>
      typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase())
    ) ||
    record.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (typeof record.uploadedBy === 'string' && record.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { class: string; icon: string }> = {
      pending: { class: 'bg-amber-100 text-amber-700', icon: 'ri-time-line' },
      processing: { class: 'bg-blue-100 text-blue-700', icon: 'ri-loader-4-line' },
      completed: { class: 'bg-green-100 text-green-700', icon: 'ri-check-line' },
      failed: { class: 'bg-red-100 text-red-700', icon: 'ri-close-line' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${config.class}`}>
        <i className={config.icon + ' text-[10px]'}></i>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleDownload = (record: SealsExcelMaster) => {
    window.open(record.fileUrl, '_blank');
  };

  const handleDownloadTemplate = () => {
    setShowTemplateModal(true);
  };

  const handleImportFile = async (file: File) => {
    setImportFile(file);
    setShowImportModal(true);
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;

    try {
      setImportProgress(0);
      
      // Process the file
      const records = await SalesImportService.processExcelFile(importFile, (progress) => {
        setImportProgress(progress.percentage);
      });

      // Import the records
      await SalesImportService.bulkImport(records, 50, (progress) => {
        setImportProgress(progress.percentage);
      });

      toast.success(`Successfully imported ${records.length} sales records!`);
      setShowImportModal(false);
      setImportFile(null);
      setImportProgress(null);
      
      // Refresh the list
      fetchRecords();
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Import failed');
      setShowImportModal(false);
      setImportFile(null);
      setImportProgress(null);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/seals-excel-master/${recordId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success') {
            alert('Record deleted successfully!');
            // Refresh the list
            window.location.reload();
          } else {
            alert(`Failed to delete record: ${result.message}`);
          }
        } else {
          alert(`Failed to delete record: ${response.status}`);
        }
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record. Please try again.');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0) {
      alert('Please select records to delete');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedRecords.length} selected records?`)) {
      try {
        const deletePromises = selectedRecords.map(recordId =>
          fetch(`${API_BASE_URL}/seals-excel-master/${recordId}`, {
            method: 'DELETE'
          })
        );

        const responses = await Promise.all(deletePromises);
        const failedDeletes = responses.filter(response => !response.ok);

        if (failedDeletes.length === 0) {
          alert('All selected records deleted successfully!');
          setSelectedRecords([]);
          // Refresh the list
          window.location.reload();
        } else {
          alert(`${failedDeletes.length} records failed to delete. Please try again.`);
        }
      } catch (error) {
        console.error('Error bulk deleting records:', error);
        alert('Error deleting records. Please try again.');
      }
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      
      // Get all master records for export (without pagination)
      const response = await fetch(`${API_BASE_URL}/seals-excel-master?limit=1000`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data for export');
      }
      
      const result = await response.json();
      const allRecords = result.results || [];
      
      if (allRecords.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      // Generate CSV content
      const headers = [
        'File Name',
        'Description',
        'Uploaded By',
        'File Size (MB)',
        'Records Count',
        'Processing Status',
        'Created At',
        'File URL'
      ];

      const rows = allRecords.map((record: any) => [
        record.fileName,
        record.description,
        record.uploadedBy,
        (record.fileSize / (1024 * 1024)).toFixed(2),
        record.recordsCount,
        record.processingStatus,
        new Date(record.createdAt).toLocaleString(),
        record.fileUrl
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map((cell: any) => `"${cell}"`).join(','))
        .join('\n');
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `master_sales_export_${dateStr}.csv`;
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${allRecords.length} master records`);
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export master records');
    } finally {
      setLoading(false);
    }
  };

  function getPagination(currentPage: number, totalPages: number) {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push('...');
      for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) pages.push(i);
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Master Sales Records"/>

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Master Sales Records</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50" disabled={loading}>
                <i className="ri-file-download-line"></i> Template
              </button>
              {selectedRecords.length > 0 && (
                <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-[11px] font-bold rounded hover:bg-red-700 transition-colors" onClick={handleBulkDelete}>
                  <i className="ri-delete-bin-line"></i> Delete ({selectedRecords.length})
                </button>
              )}
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors disabled:opacity-50" onClick={handleExport} disabled={loading}>
                {loading ? (<><div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></div> Exporting</>) : (<><i className="ri-file-excel-2-line"></i> Export</>)}
              </button>
              <Link href="/sales/master/add" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-add-line"></i> Add
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4 mb-4">
            <div className="relative">
              <input type="text" className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-56 min-w-[140px] placeholder:text-gray-400 font-medium" placeholder="Search filename, description, uploader..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50"></div>
            </div>
          ) : currentRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center min-h-[300px]">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-file-excel-2-line text-2xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-2">No records</h3>
              <p className="text-[11px] text-gray-500 mb-4">{records.length === 0 ? 'Upload your first Excel file to get started.' : 'No records match your search.'}</p>
              {records.length === 0 && (
                <Link href="/sales/master/add" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
                  <i className="ri-add-line"></i> Add First
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                        <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectAll} onChange={handleSelectAll} />
                      </th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">File Name</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Description</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Uploaded By</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">File Size</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Records</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Upload Date</th>
                      <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                          <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectedRecords.includes(record.id)} onChange={() => handleRecordSelect(record.id)} />
                        </td>
                        <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-800 border border-gray-200">
                          <span className="inline-flex items-center gap-1.5"><i className="ri-file-excel-2-line text-green-600 text-sm"></i>{record.fileName}</span>
                        </td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200" title={record.description}>
                          {record.description.length > 50 ? `${record.description.substring(0, 50)}...` : record.description}
                        </td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-800 border border-gray-200">{typeof record.uploadedBy === 'string' ? record.uploadedBy : 'Unknown'}</td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">{formatFileSize(record.fileSize)}</td>
                        <td className="px-1.5 py-2.5 text-[12px] text-center border border-gray-200"><span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded bg-gray-100 text-gray-700">{record.recordsCount.toLocaleString()}</span></td>
                        <td className="px-1.5 py-2.5 border border-gray-200">{getStatusBadge(record.processingStatus)}</td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">{formatDate(record.createdAt)}</td>
                        <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded hover:bg-blue-100 transition-colors" onClick={() => handleDownload(record)} title="Download"><i className="ri-download-line text-sm"></i></button>
                            <Link href={`/sales/master/edit/${record.id}`} className="w-7 h-7 flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100 rounded hover:bg-amber-100 transition-colors" title="Edit"><i className="ri-edit-line text-sm"></i></Link>
                            <Link href={`/sales/master/details/${record.id}`} className="w-7 h-7 flex items-center justify-center bg-cyan-50 text-cyan-600 border border-cyan-100 rounded hover:bg-cyan-100 transition-colors" title="Details"><i className="ri-eye-line text-sm"></i></Link>
                            <button type="button" className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100 transition-colors" onClick={() => handleDelete(record.id)} title="Delete"><i className="ri-delete-bin-line text-sm"></i></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
                <div className="text-[11px] font-medium text-[#495057] tracking-tight">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length}
                </div>
                <nav className="flex items-center gap-1">
                  <button type="button" className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</button>
                  {getPagination(currentPage, totalPages).map((page, idx) =>
                    page === '...' ? <span key={'e-' + idx} className="px-2 text-[11px] text-gray-400">...</span> : (
                      <button key={page} type="button" className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${currentPage === page ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`} onClick={() => setCurrentPage(page)}>{page}</button>
                    )
                  )}
                  <button type="button" className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>

      <Toaster position="top-right" />

      {/* Import Modal */}
      {showImportModal && importFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Import Sales Data</h3>
              
              <div className="mb-4">
                <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded">
                  <i className="ri-file-excel-2-line text-blue-600 me-3"></i>
                  <div>
                    <div className="font-medium">{importFile.name}</div>
                    <div className="text-sm text-blue-600">
                      {(importFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              </div>

              {importProgress !== null && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Processing...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportProgress(null);
                  }}
                  className="ti-btn ti-btn-secondary"
                  disabled={importProgress !== null}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSubmit}
                  className="ti-btn ti-btn-primary"
                  disabled={importProgress !== null}
                >
                  {importProgress !== null ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="ri-upload-line me-2"></i>
                      Import
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Download Modal */}
      {showTemplateModal && (
        <TemplateDownload
          onClose={() => setShowTemplateModal(false)}
        />
      )}
    </div>
  );
};

export default MasterSalesPage; 