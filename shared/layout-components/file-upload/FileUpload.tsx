'use client';
import React, { useState, useRef, useCallback } from 'react';
import { FileUploadService, UploadedFile } from '../../services/fileUploadService';
import { UploadProgress } from './UploadProgress';
import { FilePreview } from './FilePreview';
import './fileUpload.scss';

export interface FileUploadProps {
  onUploadSuccess?: (file: UploadedFile, originalFile?: File) => void;
  onUploadError?: (error: string) => void;
  onFileRemove?: (fileKey: string) => void;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  className?: string;
  disabled?: boolean;
}

export interface FileUploadState {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  uploadedFile?: UploadedFile;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  onFileRemove,
  multiple = false,
  accept,
  maxFiles = 5,
  className = '',
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<Map<string, FileUploadState>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const currentUploads = uploads.size;
    
    if (currentUploads + fileArray.length > maxFiles) {
      onUploadError?.(`Cannot upload more than ${maxFiles} files`);
      return;
    }

    for (const file of fileArray) {
      const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
      
      // Add file to uploads with initial state
      setUploads(prev => new Map(prev.set(fileId, {
        file,
        progress: 0,
        status: 'uploading'
      })));

      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploads(prev => {
            const current = prev.get(fileId);
            if (current && current.progress < 90) {
              const newProgress = current.progress + Math.random() * 30;
              return new Map(prev.set(fileId, {
                ...current,
                progress: Math.min(newProgress, 90)
              }));
            }
            return prev;
          });
        }, 200);

        const uploadedFile = await FileUploadService.uploadFile(file);
        
        clearInterval(progressInterval);
        
        setUploads(prev => new Map(prev.set(fileId, {
          file,
          progress: 100,
          status: 'success',
          uploadedFile
        })));

        onUploadSuccess?.(uploadedFile, file);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        
        setUploads(prev => new Map(prev.set(fileId, {
          file,
          progress: 0,
          status: 'error',
          error: errorMessage
        })));

        onUploadError?.(errorMessage);
      }
    }
  }, [disabled, uploads.size, maxFiles, onUploadSuccess, onUploadError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      // Reset input value to allow same file upload again
      e.target.value = '';
    }
  }, [handleFiles]);

  const handleRemoveFile = useCallback(async (fileId: string) => {
    const upload = uploads.get(fileId);
    if (upload?.uploadedFile) {
      try {
        await FileUploadService.deleteFile(upload.uploadedFile.key);
        onFileRemove?.(upload.uploadedFile.key);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
    
    setUploads(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  }, [uploads, onFileRemove]);

  const handleBrowseClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const uploadArray = Array.from(uploads.entries());
  const hasUploads = uploadArray.length > 0;

  return (
    <div className={`file-upload-container ${className}`}>
      <div
        className={`file-upload-dropzone ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileInputChange}
          className="file-upload-input"
          disabled={disabled}
        />
        
        <div className="file-upload-content">
          <div className="file-upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
          </div>
          
          <div className="file-upload-text">
            <h3>Drop files here or click to browse</h3>
            <p>
              {multiple ? `Upload up to ${maxFiles} files` : 'Upload a file'} 
              {accept && ` (${accept})`}
            </p>
            <p className="file-upload-limit">Maximum file size: 5MB</p>
          </div>
        </div>
      </div>

      {hasUploads && (
        <div className="file-upload-list">
          <h4>Uploaded Files</h4>
          <div className="file-upload-items">
            {uploadArray.map(([fileId, upload]) => (
              <div key={fileId} className="file-upload-item">
                <FilePreview
                  file={upload.file}
                  uploadedFile={upload.uploadedFile}
                  status={upload.status}
                  error={upload.error}
                  onRemove={() => handleRemoveFile(fileId)}
                />
                
                {upload.status === 'uploading' && (
                  <UploadProgress progress={upload.progress} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 