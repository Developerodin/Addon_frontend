import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

// User interface for createdBy/uploadedBy fields
export interface User {
  id: string;
  name: string;
  email: string;
}

// Types for File Manager - Updated to match API documentation exactly
export interface Folder {
  id: string;
  type: 'folder';
  folder: {
    name: string;
    description?: string;
    parentFolder?: string | null;
    createdBy: User | string; // Can be User object or string ID
    isRoot: boolean;
    path: string;
    metadata?: any;
    createdAt: string;
    updatedAt: string;
  };
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  type: 'file';
  file: {
    fileName: string;
    fileUrl: string;
    fileKey: string;
    fileSize: number;
    mimeType: string;
    metadata?: any;
    uploadedBy: User | string; // Can be User object or string ID
    createdAt: string;
    updatedAt: string;
  };
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

// Folder tree item interface
export interface FolderTreeItem {
  id: string;
  name: string;
  path: string;
  children: FolderTreeItem[];
}

// Pagination response interface
export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

// Folder contents response interface
export interface FolderContentsResponse {
  folder: Folder;
  contents: PaginatedResponse<Folder | FileItem>;
}

// Dashboard data interface
export interface DashboardData {
  rootFolders: Folder[];
  recentFiles: FileItem[];
  folderTree: FolderTreeItem[];
  stats: {
    totalFolders: number;
    totalFiles: number;
  };
}

// Upload response interface
export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    url: string;
    key: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
}

// Delete multiple items response interface
export interface DeleteMultipleResponse {
  deletedFolders: Array<{
    deletedFolder: Folder;
    deletedItems: number;
  }>;
  deletedFiles: FileItem[];
  totalDeleted: number;
}

// Helper function to get access token from cookies
const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null; // Server-side check
  
  try {
    // First try js-cookie library
    const tokenFromJsCookie = Cookies.get('accessToken');
    if (tokenFromJsCookie) {
      console.log('Found access token via js-cookie');
      return tokenFromJsCookie;
    }

    // Fallback to manual cookie parsing
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'accessToken') {
        const token = decodeURIComponent(value);
        console.log('Found access token via manual parsing:', token ? 'Token exists' : 'Token is empty');
        return token;
      }
    }
    console.log('No accessToken cookie found. Available cookies:', document.cookie);
    return null;
  } catch (error) {
    console.error('Error reading access token from cookies:', error);
    return null;
  }
};

class FileManagerService {
  private baseURL = `${API_BASE_URL}/file-manager`;
  private commonURL = `${API_BASE_URL}/common`;

  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const token = getAccessToken();

      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('File Manager API Error:', error);
      throw error;
    }
  }

  private async makeCommonRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const url = `${this.commonURL}${endpoint}`;
      const token = getAccessToken();

      if (!token) {
        throw new Error('No access token found. Please login again.');
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Common API Error:', error);
      throw error;
    }
  }

  // Dashboard
  async getDashboard(limit?: number): Promise<DashboardData> {
    const params = limit ? `?limit=${limit}` : '';
    const result = await this.makeRequest<DashboardData>(`/dashboard${params}`);
    console.log('Dashboard API response:', result);
    return result;
  }

  // Root Folders - Updated to return paginated response
  async getRootFolders(params?: {
    sortBy?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Folder>> {
    const searchParams = new URLSearchParams();
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const result = await this.makeRequest<PaginatedResponse<Folder>>(`/root-folders${query}`);
    console.log('Root folders API response:', result);
    return result;
  }

  // Folder Tree - Updated to return FolderTreeItem array
  async getFolderTree(rootFolderId?: string): Promise<FolderTreeItem[]> {
    const params = rootFolderId ? `?rootFolderId=${rootFolderId}` : '';
    const result = await this.makeRequest<FolderTreeItem[]>(`/folder-tree${params}`);
    console.log('Folder tree API response:', result);
    return result;
  }

  // Search - Updated to return paginated response
  async searchFiles(query: string, params?: {
    type?: 'folder' | 'file';
    userId?: string;
    sortBy?: string;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<Folder | FileItem>> {
    const searchParams = new URLSearchParams({ query });
    if (params?.type) searchParams.append('type', params.type);
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const result = await this.makeRequest<PaginatedResponse<Folder | FileItem>>(`/search?${searchParams.toString()}`);
    console.log('Search API response:', result);
    return result;
  }

  // Folders
  async createFolder(data: {
    name: string;
    parentFolder?: string;
    description?: string;
    metadata?: any;
  }): Promise<Folder> {
    const result = await this.makeRequest<Folder>('/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('Create folder API response:', result);
    return result;
  }

  async getFolder(folderId: string): Promise<Folder> {
    const result = await this.makeRequest<Folder>(`/folders/${folderId}`);
    console.log('Get folder API response:', result);
    return result;
  }

  async updateFolder(folderId: string, data: {
    name?: string;
    description?: string;
    metadata?: any;
  }): Promise<Folder> {
    const result = await this.makeRequest<Folder>(`/folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    console.log('Update folder API response:', result);
    return result;
  }

  async deleteFolder(folderId: string): Promise<void> {
    await this.makeRequest<void>(`/folders/${folderId}`, {
      method: 'DELETE',
    });
    console.log('Delete folder API response: success');
  }

  // Get folder contents - Updated to return FolderContentsResponse
  async getFolderContents(folderId: string, params?: {
    sortBy?: string;
    limit?: number;
    page?: number;
  }): Promise<FolderContentsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const result = await this.makeRequest<FolderContentsResponse>(`/folders/${folderId}/contents${query}`);
    console.log('Get folder contents API response:', result);
    return result;
  }

  // Files
  async createFile(data: {
    fileName: string;
    fileUrl: string;
    fileKey: string;
    parentFolder?: string;
    fileSize?: number;
    mimeType?: string;
    metadata?: any;
  }): Promise<FileItem> {
    const result = await this.makeRequest<FileItem>('/files', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('Create file API response:', result);
    return result;
  }

  async getFile(fileId: string): Promise<FileItem> {
    const result = await this.makeRequest<FileItem>(`/files/${fileId}`);
    console.log('Get file API response:', result);
    return result;
  }

  async updateFile(fileId: string, data: {
    fileName?: string;
    fileUrl?: string;
    fileKey?: string;
    fileSize?: number;
    mimeType?: string;
    metadata?: any;
  }): Promise<FileItem> {
    const result = await this.makeRequest<FileItem>(`/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    console.log('Update file API response:', result);
    return result;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.makeRequest<void>(`/files/${fileId}`, {
      method: 'DELETE',
    });
    console.log('Delete file API response: success');
  }

  // Delete multiple items - Updated to return DeleteMultipleResponse
  async deleteMultipleItems(itemIds: string[]): Promise<DeleteMultipleResponse> {
    const result = await this.makeRequest<DeleteMultipleResponse>('/items', {
      method: 'DELETE',
      body: JSON.stringify({ itemIds }),
    });
    console.log('Delete multiple items API response:', result);
    return result;
  }

  // Common Route APIs (File Upload/Delete)
  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const result = await this.makeCommonRequest<UploadResponse>('/upload', {
      method: 'POST',
      body: formData,
    });
    console.log('Upload file API response:', result);
    return result;
  }

  async deleteFileFromS3(fileKey: string): Promise<{ success: boolean; message: string }> {
    const result = await this.makeCommonRequest<{ success: boolean; message: string }>('/delete-file', {
      method: 'POST',
      body: JSON.stringify({ fileKey }),
    });
    console.log('Delete file from S3 API response:', result);
    return result;
  }

  // Utility functions
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'ri-image-line text-green-600';
    if (mimeType.startsWith('video/')) return 'ri-video-line text-purple-600';
    if (mimeType.startsWith('audio/')) return 'ri-music-line text-orange-600';
    if (mimeType.includes('pdf')) return 'ri-file-pdf-line text-red-600';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'ri-file-word-line text-blue-600';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'ri-file-excel-line text-green-600';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'ri-file-ppt-line text-orange-600';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return 'ri-file-zip-line text-purple-600';
    if (mimeType.includes('text/')) return 'ri-file-text-line text-gray-600';
    return 'ri-file-line text-gray-600';
  }

  getFileColor(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'text-green-600';
    if (mimeType.startsWith('video/')) return 'text-purple-600';
    if (mimeType.startsWith('audio/')) return 'text-orange-600';
    if (mimeType.includes('pdf')) return 'text-red-600';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'text-blue-600';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'text-green-600';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'text-orange-600';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return 'text-purple-600';
    if (mimeType.includes('text/')) return 'text-gray-600';
    return 'text-gray-600';
  }
}

export const fileManagerService = new FileManagerService(); 