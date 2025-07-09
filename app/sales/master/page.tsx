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
    const statusConfig = {
      pending: { class: 'bg-warning/10 text-warning', icon: 'ri-time-line' },
      processing: { class: 'bg-info/10 text-info', icon: 'ri-loader-4-line' },
      completed: { class: 'bg-success/10 text-success', icon: 'ri-check-line' },
      failed: { class: 'bg-danger/10 text-danger', icon: 'ri-close-line' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`badge ${config.class} flex items-center gap-1`}>
        <i className={config.icon}></i>
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

  return (
    <div className="main-content">
      <Seo title="Master Sales Records"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Master Sales Records</h1>
                          <div className="box-tools flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="ti-btn ti-btn-secondary"
                disabled={loading}
              >
                <i className="ri-file-download-line me-2"></i>
                Download Template
              </button>
            
              {selectedRecords.length > 0 && (
                <button 
                  type="button" 
                  className="ti-btn ti-btn-danger"
                  onClick={handleBulkDelete}
                >
                  <i className="ri-delete-bin-line me-2"></i> Delete Selected ({selectedRecords.length})
                </button>
              )}
              <button 
                type="button" 
                className="ti-btn ti-btn-primary"
                onClick={handleExport}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <i className="ri-file-excel-2-line me-2"></i> Export
                  </>
                )}
              </button>
              <Link href="/sales/master/add" className="ti-btn ti-btn-primary">
                <i className="ri-add-line me-2"></i> Add Master Sale
              </Link>
            </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    className="form-control py-3"
                    placeholder="Search by filename, description, or uploader..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading records...</span>
                </div>
              ) : currentRecords.length === 0 ? (
                <div className="text-center py-12">
                  <i className="ri-file-excel-2-line text-4xl text-gray-400 mb-4"></i>
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No records found</h3>
                  <p className="text-gray-500 mb-4">
                    {records.length === 0 
                      ? "No master sales records available. Upload your first Excel file to get started."
                      : "No records match your search criteria."
                    }
                  </p>
                  {records.length === 0 && (
                    <Link href="/sales/master/add" className="ti-btn ti-btn-primary">
                      <i className="ri-add-line me-2"></i> Add First Record
                    </Link>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table whitespace-nowrap table-bordered min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th scope="col" className="!text-start">
                          <input 
                            type="checkbox" 
                            className="form-check-input" 
                            checked={selectAll}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th scope="col" className="text-start">File Name</th>
                        <th scope="col" className="text-start">Description</th>
                        <th scope="col" className="text-start">Uploaded By</th>
                        <th scope="col" className="text-start">File Size</th>
                        <th scope="col" className="text-start">Records</th>
                        <th scope="col" className="text-start">Status</th>
                        <th scope="col" className="text-start">Upload Date</th>
                        <th scope="col" className="text-start">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRecords.map((record, index) => (
                        <tr 
                          key={record.id}
                          className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                        >
                          <td>
                            <input 
                              type="checkbox" 
                              className="form-check-input" 
                              checked={selectedRecords.includes(record.id)}
                              onChange={() => handleRecordSelect(record.id)}
                            />
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <i className="ri-file-excel-2-line text-lg text-green-600"></i>
                              <span className="font-medium">{record.fileName}</span>
                            </div>
                          </td>
                          <td>
                            <span className="text-sm text-gray-600" title={record.description}>
                              {record.description.length > 50 
                                ? `${record.description.substring(0, 50)}...` 
                                : record.description
                              }
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-primary">
                                  {typeof record.uploadedBy === 'string' && record.uploadedBy.length > 0 
                                    ? record.uploadedBy.charAt(0).toUpperCase() 
                                    : 'U'
                                  }
                                </span>
                              </div>
                              <span className="text-sm">
                                {typeof record.uploadedBy === 'string' ? record.uploadedBy : 'Unknown User'}
                              </span>
                            </div>
                          </td>
                          <td className="text-sm text-gray-600">
                            {formatFileSize(record.fileSize)}
                          </td>
                          <td className="text-center">
                            <span className="badge bg-gray-100 text-gray-700">
                              {record.recordsCount.toLocaleString()}
                            </span>
                          </td>
                          <td>
                            {getStatusBadge(record.processingStatus)}
                          </td>
                          <td className="text-sm text-gray-600">
                            {formatDate(record.createdAt)}
                          </td>
                          <td>
                            <div className="flex space-x-2">
                              <button 
                                className="ti-btn ti-btn-primary ti-btn-sm"
                                onClick={() => handleDownload(record)}
                                title="Download File"
                              >
                                <i className="ri-download-line"></i>
                              </button>
                              <Link 
                                href={`/sales/master/edit/${record.id}`}
                                className="ti-btn ti-btn-warning ti-btn-sm"
                                title="Edit Record"
                              >
                                <i className="ri-edit-line"></i>
                              </Link>
                              <Link 
                                href={`/sales/master/details/${record.id}`}
                                className="ti-btn ti-btn-info ti-btn-sm"
                                title="View Details"
                              >
                                <i className="ri-eye-line"></i>
                              </Link>
                              <button 
                                className="ti-btn ti-btn-danger ti-btn-sm"
                                onClick={() => handleDelete(record.id)}
                                title="Delete Record"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length} entries
                </div>
                <nav aria-label="Page navigation" className="">
                  <ul className="flex flex-wrap items-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <li key={page} className="page-item">
                        <button
                          className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                            currentPage === page 
                            ? 'bg-primary text-white hover:bg-primary-dark' 
                            : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
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