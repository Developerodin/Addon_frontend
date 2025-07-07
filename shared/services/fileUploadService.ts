import { API_BASE_URL } from '../data/utilities/api';

export interface UploadedFile {
  url: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: UploadedFile;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

export class FileUploadService {
  static async uploadFile(file: File): Promise<UploadedFile> {
    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Call API directly without any authentication
      const response = await fetch(`${API_BASE_URL}/common/upload`, {
        method: 'POST',
        body: formData
      });

      const result: UploadResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      if (!result.success || !result.data) {
        throw new Error(result.message || 'Upload failed');
      }

      return result.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to upload file');
    }
  }

  static async deleteFile(fileKey: string): Promise<void> {
    if (!fileKey) {
      throw new Error('File key is required');
    }

    try {
      // Call API directly without any authentication
      const response = await fetch(`${API_BASE_URL}/common/files/${encodeURIComponent(fileKey)}`, {
        method: 'DELETE'
      });

      const result: DeleteResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.message || 'Delete failed');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete file');
    }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getFileTypeName(mimeType: string): string {
    // Images
    if (mimeType.startsWith('image/jpeg') || mimeType.startsWith('image/jpg')) return 'JPEG Image';
    if (mimeType.startsWith('image/png')) return 'PNG Image';
    if (mimeType.startsWith('image/gif')) return 'GIF Image';
    if (mimeType.startsWith('image/webp')) return 'WebP Image';
    if (mimeType.startsWith('image/')) return 'Image';

    // Documents
    if (mimeType === 'application/pdf') return 'PDF Document';
    if (mimeType === 'application/msword') return 'Word Document';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'Word Document';
    
    // Excel files
    if (mimeType === 'application/vnd.ms-excel') return 'Excel Spreadsheet';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'Excel Spreadsheet';
    
    // PowerPoint
    if (mimeType === 'application/vnd.ms-powerpoint') return 'PowerPoint Presentation';
    if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'PowerPoint Presentation';
    
    // Text files
    if (mimeType === 'text/plain') return 'Text File';
    if (mimeType === 'text/csv') return 'CSV File';
    if (mimeType.startsWith('text/')) return 'Text File';
    
    // Archives
    if (mimeType === 'application/zip') return 'ZIP Archive';
    if (mimeType === 'application/x-rar-compressed') return 'RAR Archive';
    
    // Fallback
    return mimeType.split('/')[1]?.toUpperCase() || 'File';
  }

  static getFileIcon(mimeType: string): string {
    // Images
    if (mimeType.startsWith('image/')) return '🖼️';
    
    // Videos
    if (mimeType.startsWith('video/')) return '🎥';
    
    // Audio
    if (mimeType.startsWith('audio/')) return '🎵';
    
    // PDF
    if (mimeType.includes('pdf')) return '📄';
    
    // Microsoft Word Documents
    if (mimeType.includes('word') || 
        mimeType.includes('msword') ||
        mimeType.includes('document')) return '📝';
    
    // Microsoft Excel Files
    if (mimeType.includes('excel') || 
        mimeType.includes('spreadsheet') ||
        mimeType.includes('sheet') ||
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return '📊';
    
    // Microsoft PowerPoint
    if (mimeType.includes('powerpoint') || 
        mimeType.includes('presentation') ||
        mimeType === 'application/vnd.ms-powerpoint' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return '📈';
    
    // Text files
    if (mimeType.startsWith('text/') || mimeType.includes('txt')) return '📝';
    
    // CSV files
    if (mimeType.includes('csv')) return '📋';
    
    // Archives
    if (mimeType.includes('zip') || 
        mimeType.includes('rar') || 
        mimeType.includes('7z') ||
        mimeType.includes('tar') ||
        mimeType.includes('gz')) return '📦';
    
    // Generic documents
    return '📁';
  }
}

// Standalone function exports for backward compatibility
export const formatFileSize = FileUploadService.formatFileSize;
export const getFileTypeName = FileUploadService.getFileTypeName;
export const getFileIcon = FileUploadService.getFileIcon; 