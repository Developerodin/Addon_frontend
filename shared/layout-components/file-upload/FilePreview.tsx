import React, { useState } from 'react';
import { FileUploadService, UploadedFile } from '../../services/fileUploadService';

export interface FilePreviewProps {
  file: File;
  uploadedFile?: UploadedFile;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  onRemove: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  uploadedFile,
  status,
  error,
  onRemove
}) => {
  const [imageError, setImageError] = useState(false);
  
  const isImage = file.type.startsWith('image/');
  const fileIcon = FileUploadService.getFileIcon(file.type);
  const fileSize = FileUploadService.formatFileSize(file.size);
  const fileTypeName = FileUploadService.getFileTypeName(file.type);
  
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="status-icon success">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="status-icon error">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'uploading':
        return (
          <div className="status-icon uploading">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleDownload = () => {
    if (uploadedFile?.url) {
      window.open(uploadedFile.url, '_blank');
    }
  };

  const getPreviewUrl = () => {
    if (uploadedFile?.url) {
      return uploadedFile.url;
    }
    // For images, create object URL for preview
    if (isImage && !imageError) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const previewUrl = getPreviewUrl();

  return (
    <div className={`file-preview ${status}`}>
      <div className="file-preview-thumbnail">
        {isImage && previewUrl && !imageError ? (
          <img 
            src={previewUrl} 
            alt={file.name}
            onError={handleImageError}
            className="file-preview-image"
          />
        ) : (
          <div className="file-preview-icon">
            <span className="file-icon">{fileIcon}</span>
          </div>
        )}
      </div>
      
      <div className="file-preview-details">
        <div className="file-preview-name" title={file.name}>
          {file.name}
        </div>
        <div className="file-preview-meta">
          <span className="file-preview-size">{fileSize}</span>
          <span className="file-preview-type">{fileTypeName}</span>
        </div>
        {error && (
          <div className="file-preview-error" title={error}>
            {error}
          </div>
        )}
        {uploadedFile?.url && status === 'success' && (
          <div className="file-preview-url">
            <button 
              onClick={handleDownload}
              className="file-preview-download"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </button>
          </div>
        )}
      </div>
      
      <div className="file-preview-actions">
        <div className="file-preview-status">
          {getStatusIcon()}
        </div>
        
        <button 
          onClick={onRemove}
          className="file-preview-remove"
          type="button"
          title="Remove file"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3,6 5,6 21,6" />
            <path d="M19,6V20a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6M8,6V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  );
}; 