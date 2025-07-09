"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { FileUpload } from '@/shared/layout-components/file-upload';
import type { UploadedFile } from '@/shared/services/fileUploadService';
import Link from 'next/link';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { SalesImportService, ImportProgress as ImportProgressType } from '@/shared/services/salesImportService';
import ImportProgress from '@/shared/components/ImportProgress';

interface SealsExcelMasterForm {
  fileName: string;
  description: string;
  fileUrl: string;
  fileKey: string;
  data: {
    sheets: string[];
    totalRows: number;
    columns: string[];
  };
  uploadedBy: string;
  fileSize: number;
  mimeType: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  recordsCount: number;
  isActive: boolean;
}

const AddMasterSalePage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadedFileBlob, setUploadedFileBlob] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgressType | null>(null);
  const [showImportProgress, setShowImportProgress] = useState(false);
  const [formData, setFormData] = useState<SealsExcelMasterForm>({
    fileName: '',
    description: '',
    fileUrl: '',
    fileKey: '',
    data: {
      sheets: [],
      totalRows: 0,
      columns: []
    },
    uploadedBy: '',
    fileSize: 0,
    mimeType: '',
    processingStatus: 'pending',
    recordsCount: 0,
    isActive: true
  });

  const handleFileUploadSuccess = (file: UploadedFile, originalFile?: File) => {
    setUploadedFile(file);
    setUploadedFileBlob(originalFile || null);
    setUploadError(null);
    
    // Auto-fill form data from uploaded file
    setFormData(prev => ({
      ...prev,
      fileName: file.originalName,
      fileUrl: file.url,
      fileKey: file.key,
      fileSize: file.size,
      mimeType: file.mimeType,
      processingStatus: 'pending'
    }));
  };

  const handleFileUploadError = (error: string) => {
    setUploadError(error);
    setUploadedFile(null);
  };

  const handleFileRemove = (fileKey: string) => {
    setUploadedFile(null);
    setUploadedFileBlob(null);
    setFormData(prev => ({
      ...prev,
      fileName: '',
      fileUrl: '',
      fileKey: '',
      fileSize: 0,
      mimeType: ''
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadedFile) {
      alert('Please upload a file first');
      return;
    }

    if (!formData.description.trim()) {
      alert('Please provide a description');
      return;
    }

    setLoading(true);
    setShowImportProgress(true);

    try {
      // Step 1: Process and import sales data FIRST
      if (!uploadedFileBlob) {
        throw new Error('No file available for processing');
      }

      // Process the file
      const records = await SalesImportService.processExcelFile(uploadedFileBlob, (progress) => {
        setImportProgress({
          ...progress,
          message: `Processing file: ${progress.message}`
        });
      });

      // Import sales records
      await SalesImportService.bulkImport(records, 50, (progress) => {
        setImportProgress({
          ...progress,
          message: `Importing sales data: ${progress.message}`
        });
      });

      // Step 2: Only if sales import succeeds, create master record
      const response = await fetch(`${API_BASE_URL}/seals-excel-master`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          recordsCount: records.length, // Use actual imported records count
          processingStatus: 'completed' // Mark as completed since import succeeded
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create master record');
      }

      // Success - both sales import and master record creation succeeded
      setImportProgress({
        current: records.length,
        total: records.length,
        percentage: 100,
        status: 'completed',
        message: `Successfully imported ${records.length} sales records and created master record`
      });

      setTimeout(() => {
        router.push('/sales/master');
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      setImportProgress({
        current: 0,
        total: 0,
        percentage: 0,
        status: 'failed',
        message: 'Operation failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="main-content">
      <Seo title="Add Master Sale Record"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Add Master Sale Record</h1>
                <p className="text-gray-600 mt-1">Upload Excel files and create master sales records</p>
              </div>
              <div className="box-tools">
                <Link href="/sales/master" className="ti-btn ti-btn-secondary">
                  <i className="ri-arrow-left-line me-2"></i> Back to List
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* File Upload Section */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold mb-4">Step 1: Upload Excel File</h3>
                  
                  <div className="mb-4">
                    <FileUpload
                      onUploadSuccess={handleFileUploadSuccess}
                      onUploadError={handleFileUploadError}
                      onFileRemove={handleFileRemove}
                      accept=".xls,.xlsx,.csv"
                      multiple={false}
                      className="max-w-2xl"
                    />
                  </div>

                  {uploadError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                      <i className="ri-error-warning-line me-2"></i>
                      {uploadError}
                    </div>
                  )}

                  {uploadedFile && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <i className="ri-check-line me-2"></i>
                          <span>File uploaded successfully: {uploadedFile.originalName}</span>
                        </div>
                        <div className="text-sm">
                          Size: {formatFileSize(uploadedFile.size)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Fields Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Step 2: Record Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* File Name */}
                    <div>
                      <label className="form-label">File Name</label>
                      <input
                        type="text"
                        name="fileName"
                        className="form-control"
                        value={formData.fileName}
                        onChange={handleInputChange}
                        placeholder="Enter file name"
                        readOnly={!!uploadedFile}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="form-label">Description</label>
                      <input
                        type="text"
                        name="description"
                        className="form-control"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Enter description"
                        required
                      />
                    </div>

                    {/* File Size */}
                    <div>
                      <label className="form-label">File Size</label>
                      <input
                        type="text"
                        name="fileSize"
                        className="form-control"
                        value={formData.fileSize ? formatFileSize(formData.fileSize) : ''}
                        readOnly
                        placeholder="File size will be auto-filled"
                      />
                    </div>

                    {/* MIME Type */}
                    <div>
                      <label className="form-label">File Type</label>
                      <input
                        type="text"
                        name="mimeType"
                        className="form-control"
                        value={formData.mimeType}
                        readOnly
                        placeholder="File type will be auto-filled"
                      />
                    </div>

                    {/* Processing Status */}
                    <div>
                      <label className="form-label">Processing Status</label>
                      <select
                        name="processingStatus"
                        className="form-select"
                        value={formData.processingStatus}
                        onChange={(e) => setFormData(prev => ({ ...prev, processingStatus: e.target.value as any }))}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>

                    {/* Records Count */}
                    <div>
                      <label className="form-label">Records Count</label>
                      <input
                        type="number"
                        name="recordsCount"
                        className="form-control"
                        value={formData.recordsCount}
                        onChange={handleInputChange}
                        placeholder="Enter number of records"
                        min="0"
                      />
                    </div>

                    {/* Uploaded By */}
                    <div>
                      <label className="form-label">Uploaded By</label>
                      <input
                        type="text"
                        name="uploadedBy"
                        className="form-control"
                        value={formData.uploadedBy}
                        onChange={handleInputChange}
                        placeholder="Enter uploader name or ID"
                        required
                      />
                    </div>

                    {/* Active Status */}
                    <div className="md:col-span-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="isActive"
                          className="form-check-input me-2"
                          checked={formData.isActive}
                          onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        />
                        <label className="form-label mb-0">Active Record</label>
                      </div>
                    </div>
                  </div>

                  {/* Additional Data Fields */}
                  <div className="mt-6">
                    <h4 className="text-md font-semibold mb-3">Excel Data Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="form-label">Total Rows</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.data.totalRows}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            data: { ...prev.data, totalRows: parseInt(e.target.value) || 0 }
                          }))}
                          placeholder="Enter total rows"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="form-label">Sheets (comma separated)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.data.sheets.join(', ')}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            data: { ...prev.data, sheets: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                          }))}
                          placeholder="Sheet1, Sheet2, Sheet3"
                        />
                      </div>
                      <div>
                        <label className="form-label">Columns (comma separated)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.data.columns.join(', ')}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            data: { ...prev.data, columns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                          }))}
                          placeholder="Date, Product, Sales, Region"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Section */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => SalesImportService.testApiStructure()}
                      className="ti-btn ti-btn-warning"
                    >
                      <i className="ri-bug-line me-2"></i>
                      Test API
                    </button>
                    <Link href="/sales/master" className="ti-btn ti-btn-secondary">
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={loading || !uploadedFile}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line me-2"></i>
                          Create Master Sale Record
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Import Progress Modal */}
      <ImportProgress
        progress={showImportProgress ? importProgress : null}
        onClose={() => {
          setShowImportProgress(false);
          setImportProgress(null);
          if (importProgress?.status === 'completed') {
            router.push('/sales/master');
          }
        }}
      />
    </div>
  );
};

export default AddMasterSalePage; 