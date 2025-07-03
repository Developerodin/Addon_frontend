"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { API_BASE_URL } from '@/shared/data/utilities/api';

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

const MasterSaleDetailsPage = () => {
  const params = useParams();
  const recordId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<SealsExcelMaster | null>(null);



  useEffect(() => {
    // Fetch record data from API
    const fetchRecord = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/seals-excel-master/${recordId}`, {

        });

        if (response.ok) {
          const result = await response.json();
          
          // Handle direct response structure (no status/data wrapper)
          if (result.id) {
            setRecord(result);
          } else {
            console.error('Invalid response structure:', result);
            setRecord(null);
          }
        } else {
          console.error('API request failed:', response.status);
          setRecord(null);
        }
      } catch (error) {
        console.error('Error fetching record:', error);
        setRecord(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [recordId]);

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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
      <span className={`badge ${config.class} flex items-center gap-1 px-3 py-1`}>
        <i className={config.icon}></i>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getFileTypeIcon = (mimeType: string): string => {
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('sheet')) {
      return 'ri-file-excel-2-line text-green-600';
    }
    if (mimeType.includes('csv')) {
      return 'ri-file-text-line text-blue-600';
    }
    return 'ri-file-line text-gray-600';
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading record details...</span>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <i className="ri-error-warning-line text-4xl text-red-500 mb-4"></i>
            <h2 className="text-xl font-semibold mb-2">Record Not Found</h2>
            <p className="text-gray-600 mb-4">The requested record could not be found.</p>
            <Link href="/sales/master" className="ti-btn ti-btn-primary">
              <i className="ri-arrow-left-line me-2"></i> Back to List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title={`Master Sale Details - ${record.fileName}`}/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Master Sale Details</h1>
                <p className="text-gray-600 mt-1">Comprehensive information about the uploaded file</p>
              </div>
              <div className="box-tools flex items-center space-x-2">
                <Link href={`/sales/master/edit/${record.id}`} className="ti-btn ti-btn-warning">
                  <i className="ri-edit-line me-2"></i> Edit Record
                </Link>
                <Link href="/sales/master" className="ti-btn ti-btn-secondary">
                  <i className="ri-arrow-left-line me-2"></i> Back to List
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* File Information Card */}
              <div className="box mb-6">
                <div className="box-header">
                  <h3 className="box-title">File Information</h3>
                </div>
                <div className="box-body">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <i className={`${getFileTypeIcon(record.mimeType)} text-2xl`}></i>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold mb-2">{record.fileName}</h4>
                      <p className="text-gray-600 mb-3">{record.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Size: {formatFileSize(record.fileSize)}</span>
                        <span>Type: {record.mimeType}</span>
                        <span>Records: {record.recordsCount.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(record.processingStatus)}
                      <a 
                        href={record.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ti-btn ti-btn-primary ti-btn-sm"
                      >
                        <i className="ri-download-line me-1"></i> Download
                      </a>
                    </div>
                  </div>

                  {record.errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                      <div className="flex items-center">
                        <i className="ri-error-warning-line me-2"></i>
                        <strong>Error:</strong> {record.errorMessage}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">File Key</label>
                      <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{record.fileKey}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Processing Status</label>
                      <div className="mt-1">{getStatusBadge(record.processingStatus)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Excel Data Information */}
              <div className="box mb-6">
                <div className="box-header">
                  <h3 className="box-title">Excel Data Information</h3>
                </div>
                <div className="box-body">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Total Rows</label>
                      <p className="text-2xl font-semibold text-primary">{record.data.totalRows.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Number of Sheets</label>
                      <p className="text-2xl font-semibold text-primary">{record.data.sheets.length}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Number of Columns</label>
                      <p className="text-2xl font-semibold text-primary">{record.data.columns.length}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-md font-semibold mb-3">Sheets</h4>
                    <div className="flex flex-wrap gap-2">
                      {record.data.sheets.map((sheet, index) => (
                        <span key={index} className="badge bg-blue-100 text-blue-800 px-3 py-1">
                          {sheet}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-md font-semibold mb-3">Columns</h4>
                    <div className="flex flex-wrap gap-2">
                      {record.data.columns.map((column, index) => (
                        <span key={index} className="badge bg-green-100 text-green-800 px-3 py-1">
                          {column}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Upload Information */}
              <div className="box mb-6">
                <div className="box-header">
                  <h3 className="box-title">Upload Information</h3>
                </div>
                <div className="box-body">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Uploaded By</label>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {typeof record.uploadedBy === 'string' && record.uploadedBy.length > 0 
                              ? record.uploadedBy.charAt(0).toUpperCase() 
                              : 'U'
                            }
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {typeof record.uploadedBy === 'string' ? record.uploadedBy : 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500">Uploaded by user</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Upload Date</label>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(record.createdAt)}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Last Updated</label>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(record.updatedAt)}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Record Status</label>
                      <div className="mt-1">
                        <span className={`badge ${record.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {record.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="box">
                <div className="box-header">
                  <h3 className="box-title">Quick Actions</h3>
                </div>
                <div className="box-body">
                  <div className="space-y-3">
                    <Link 
                      href={`/sales/master/edit/${record.id}`}
                      className="ti-btn ti-btn-warning w-full justify-center"
                    >
                      <i className="ri-edit-line me-2"></i> Edit Record
                    </Link>
                    
                    <a 
                      href={record.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ti-btn ti-btn-primary w-full justify-center"
                    >
                      <i className="ri-download-line me-2"></i> Download File
                    </a>
                    
                    <button 
                      className="ti-btn ti-btn-danger w-full justify-center"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this record?')) {
                          // TODO: Implement delete functionality
                          console.log('Deleting record:', record.id);
                        }
                      }}
                    >
                      <i className="ri-delete-bin-line me-2"></i> Delete Record
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterSaleDetailsPage; 