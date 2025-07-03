"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { FileUpload } from '@/shared/layout-components/file-upload';
import type { UploadedFile } from '@/shared/services/fileUploadService';
import Link from 'next/link';
import { API_BASE_URL } from '@/shared/data/utilities/api';

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
  errorMessage?: string | null;
  recordsCount: number;
  isActive: boolean;
}

const EditMasterSalePage = () => {
  const router = useRouter();
  const params = useParams();
  const recordId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
    errorMessage: null,
    recordsCount: 0,
    isActive: true
  });



  useEffect(() => {
    // Fetch record data from API
    const fetchRecord = async () => {
      setInitialLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/seals-excel-master/${recordId}`);

        if (response.ok) {
          const result = await response.json();
          
          // Handle direct response structure (no status/data wrapper)
          if (result.id) {
            setFormData({
              fileName: result.fileName,
              description: result.description,
              fileUrl: result.fileUrl,
              fileKey: result.fileKey,
              data: result.data,
              uploadedBy: result.uploadedBy,
              fileSize: result.fileSize,
              mimeType: result.mimeType,
              processingStatus: result.processingStatus,
              errorMessage: result.errorMessage,
              recordsCount: result.recordsCount,
              isActive: result.isActive
            });
          } else {
            console.error('Invalid response structure:', result);
            // Show error state
            alert('Failed to load record data');
          }
        } else {
          console.error('API request failed:', response.status);
          alert('Failed to load record data');
        }
      } catch (error) {
        console.error('Error fetching record:', error);
        alert('Failed to load record data');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchRecord();
  }, [recordId]);

  const handleFileUploadSuccess = (file: UploadedFile) => {
    setUploadedFile(file);
    setUploadError(null);
    
    // Update form data with new file information
    setFormData(prev => ({
      ...prev,
      fileName: file.originalName,
      fileUrl: file.url,
      fileKey: file.key,
      fileSize: file.size,
      mimeType: file.mimeType
    }));
  };

  const handleFileUploadError = (error: string) => {
    setUploadError(error);
    setUploadedFile(null);
  };

  const handleFileRemove = (fileKey: string) => {
    setUploadedFile(null);
    // Don't clear existing file data when removing new upload
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
    
    if (!formData.description.trim()) {
      alert('Please provide a description');
      return;
    }

    setLoading(true);

    try {
      // Update seals excel master record
      const response = await fetch(`${API_BASE_URL}/seals-excel-master/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          recordsCount: parseInt(formData.recordsCount.toString()) || 0
        })
      });

      if (response.ok) {
        alert('Master sale record updated successfully!');
        router.push('/sales/master');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update record');
      }
    } catch (error) {
      console.error('Error updating record:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to update record'}`);
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

  if (initialLoading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading record...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Edit Master Sale Record"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Edit Master Sale Record</h1>
                <p className="text-gray-600 mt-1">Update Excel file and record details</p>
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
                {/* Current File Information */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold mb-4">Current File Information</h3>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Current File</label>
                        <p className="text-sm text-gray-900">{formData.fileName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">File Size</label>
                        <p className="text-sm text-gray-900">{formatFileSize(formData.fileSize)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">File Type</label>
                        <p className="text-sm text-gray-900">{formData.mimeType}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Upload Date</label>
                        <p className="text-sm text-gray-900">
                          {new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <a 
                        href={formData.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ti-btn ti-btn-primary ti-btn-sm"
                      >
                        <i className="ri-download-line me-2"></i>
                        Download Current File
                      </a>
                    </div>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-semibold mb-4">Update File (Optional)</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a new file to replace the current one. Leave empty to keep the existing file.
                  </p>
                  
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
                          <span>New file uploaded: {uploadedFile.originalName}</span>
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
                  <h3 className="text-lg font-semibold mb-4">Record Details</h3>
                  
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

                    {/* Error Message */}
                    <div>
                      <label className="form-label">Error Message</label>
                      <input
                        type="text"
                        name="errorMessage"
                        className="form-control"
                        value={formData.errorMessage || ''}
                        onChange={handleInputChange}
                        placeholder="Enter error message if any"
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
                    <Link href="/sales/master" className="ti-btn ti-btn-secondary">
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line me-2"></i>
                          Update Master Sale Record
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
    </div>
  );
};

export default EditMasterSalePage; 