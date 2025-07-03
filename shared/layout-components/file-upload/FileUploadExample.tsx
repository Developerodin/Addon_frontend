'use client';
import React, { useState } from 'react';
import { FileUpload, UploadedFile } from './index';

export const FileUploadExample: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleUploadSuccess = (file: UploadedFile) => {
    setUploadedFiles(prev => [...prev, file]);
    console.log('File uploaded successfully:', file);
  };

  const handleUploadError = (error: string) => {
    setErrors(prev => [...prev, error]);
    console.error('Upload error:', error);
    
    // Auto-remove error after 5 seconds
    setTimeout(() => {
      setErrors(prev => prev.filter(err => err !== error));
    }, 5000);
  };

  const handleFileRemove = (fileKey: string) => {
    setUploadedFiles(prev => prev.filter(file => file.key !== fileKey));
    console.log('File removed:', fileKey);
  };

  return (
    <div className="file-upload-example">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">File Upload Component Demo</h2>
        
        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mb-4">
            {errors.map((error, index) => (
              <div key={index} className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-2">
                {error}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Single File Upload */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Single File Upload</h3>
        <FileUpload
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          onFileRemove={handleFileRemove}
          accept="image/*"
        />
      </div>

      {/* Multiple File Upload */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Multiple File Upload</h3>
        <FileUpload
          multiple
          maxFiles={3}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          onFileRemove={handleFileRemove}
          accept=".pdf,.doc,.docx,.jpg,.png,.gif"
        />
      </div>

      {/* Document & Excel Upload */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Documents & Excel Files</h3>
        <FileUpload
          multiple
          maxFiles={5}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          onFileRemove={handleFileRemove}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        />
        <div className="mt-2 text-sm text-gray-600">
          <strong>Supported:</strong> PDF, Word (doc/docx), Excel (xls/xlsx), PowerPoint (ppt/pptx), Text, CSV
        </div>
      </div>

      {/* Uploaded Files Summary */}
      {uploadedFiles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Successfully Uploaded Files ({uploadedFiles.length})</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            {uploadedFiles.map((file, index) => (
              <div key={file.key} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                <div>
                  <div className="font-medium text-sm">{file.originalName}</div>
                  <div className="text-xs text-gray-500">
                    {file.mimeType} • {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <a 
                  href={file.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View File
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">Usage Instructions:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Drag and drop files onto the upload area</li>
          <li>• Or click to browse and select files</li>
          <li>• Maximum file size: 5MB per file</li>
          <li>• Files are automatically uploaded to S3</li>
          <li>• Use the remove button to delete files</li>
        </ul>
      </div>
    </div>
  );
}; 