import { useState, useEffect, useCallback } from 'react';
import { 
  fileManagerService, 
  Folder, 
  FileItem, 
  DashboardData,
  UploadResponse,
  PaginatedResponse,
  FolderContentsResponse,
  FolderTreeItem,
  DeleteMultipleResponse
} from '@/shared/services/fileManagerService';

interface FileManagerState {
  dashboard: DashboardData | null;
  currentFolder: Folder | null;
  folderContents: (Folder | FileItem)[];
  folderTree: FolderTreeItem[];
  loading: boolean;
  error: string | null;
  uploadProgress: { [key: string]: number };
  selectedItems: string[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  } | null;
}

export const useFileManager = () => {
  const [state, setState] = useState<FileManagerState>({
    dashboard: null,
    currentFolder: null,
    folderContents: [],
    folderTree: [],
    loading: false,
    error: null,
    uploadProgress: {},
    selectedItems: [],
    pagination: null,
  });

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const dashboard = await fileManagerService.getDashboard(10);
      setState(prev => ({ ...prev, dashboard, loading: false }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load dashboard',
        loading: false 
      }));
    }
  }, []);

  // Load folder tree
  const loadFolderTree = useCallback(async () => {
    try {
      const folderTree = await fileManagerService.getFolderTree();
      setState(prev => ({ ...prev, folderTree }));
    } catch (error) {
      console.error('Failed to load folder tree:', error);
    }
  }, []);

  // Load folder contents
  const loadFolderContents = useCallback(async (folderId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Get folder details and contents
      const [folder, contentsResponse] = await Promise.all([
        fileManagerService.getFolder(folderId),
        fileManagerService.getFolderContents(folderId, { limit: 100 })
      ]);

      console.log('Loaded folder contents:', { folder, contentsResponse });

      setState(prev => ({ 
        ...prev, 
        currentFolder: folder,
        folderContents: contentsResponse.contents.results,
        pagination: {
          page: contentsResponse.contents.page,
          limit: contentsResponse.contents.limit,
          totalPages: contentsResponse.contents.totalPages,
          totalResults: contentsResponse.contents.totalResults,
        },
        loading: false 
      }));
    } catch (error) {
      console.error('Failed to load folder contents:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load folder contents',
        loading: false,
        folderContents: [], // Ensure it's always an array
        pagination: null
      }));
    }
  }, []);

  // Create folder
  const createFolder = useCallback(async (name: string, parentFolder?: string, description?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const newFolder = await fileManagerService.createFolder({
        name,
        parentFolder,
        description: description || '',
        metadata: {}
      });

      console.log('Created folder:', newFolder);

      // Refresh current folder contents if we're in a folder
      if (state.currentFolder) {
        await loadFolderContents(state.currentFolder.id);
      } else {
        // Refresh dashboard if we're at root
        await loadDashboard();
      }

      setState(prev => ({ ...prev, loading: false }));
      return newFolder;
    } catch (error) {
      console.error('Failed to create folder:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to create folder',
        loading: false 
      }));
      throw error;
    }
  }, [state.currentFolder, loadFolderContents, loadDashboard]);

  // Upload file
  const uploadFile = useCallback(async (file: File, parentFolder?: string) => {
    try {
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null,
        uploadProgress: { ...prev.uploadProgress, [file.name]: 0 }
      }));

      // Step 1: Upload file to S3 using Common Route API
      const uploadResponse: UploadResponse = await fileManagerService.uploadFile(file);
      
      // Step 2: Create file record in File Manager API
      const fileRecord = await fileManagerService.createFile({
        fileName: file.name,
        fileUrl: uploadResponse.data.url,
        fileKey: uploadResponse.data.key,
        parentFolder,
        fileSize: file.size,
        mimeType: file.type,
        metadata: {
          originalName: uploadResponse.data.originalName,
          uploadedAt: new Date().toISOString()
        }
      });

      console.log('Uploaded file:', fileRecord);

      // Refresh current folder contents
      if (state.currentFolder) {
        await loadFolderContents(state.currentFolder.id);
      } else {
        await loadDashboard();
      }

      setState(prev => ({ 
        ...prev, 
        loading: false,
        uploadProgress: { ...prev.uploadProgress, [file.name]: 100 }
      }));

      return fileRecord;
    } catch (error) {
      console.error('Failed to upload file:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to upload file',
        loading: false,
        uploadProgress: { ...prev.uploadProgress, [file.name]: 0 }
      }));
      throw error;
    }
  }, [state.currentFolder, loadFolderContents, loadDashboard]);

  // Upload multiple files
  const uploadMultipleFiles = useCallback(async (files: File[], parentFolder?: string) => {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await uploadFile(file, parentFolder);
        results.push({ success: true, file, result });
      } catch (error) {
        results.push({ success: false, file, error });
      }
    }

    return results;
  }, [uploadFile]);

  // Delete file
  const deleteFile = useCallback(async (fileId: string, fileKey?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Delete from File Manager API
      await fileManagerService.deleteFile(fileId);

      // Delete from S3 if fileKey is provided
      if (fileKey) {
        try {
          await fileManagerService.deleteFileFromS3(fileKey);
        } catch (s3Error) {
          console.warn('Failed to delete file from S3:', s3Error);
        }
      }

      console.log('Deleted file:', fileId);

      // Refresh current folder contents
      if (state.currentFolder) {
        await loadFolderContents(state.currentFolder.id);
      } else {
        await loadDashboard();
      }

      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      console.error('Failed to delete file:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete file',
        loading: false 
      }));
      throw error;
    }
  }, [state.currentFolder, loadFolderContents, loadDashboard]);

  // Delete folder
  const deleteFolder = useCallback(async (folderId: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      await fileManagerService.deleteFolder(folderId);

      console.log('Deleted folder:', folderId);

      // Refresh current folder contents
      if (state.currentFolder) {
        await loadFolderContents(state.currentFolder.id);
      } else {
        await loadDashboard();
      }

      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      console.error('Failed to delete folder:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete folder',
        loading: false 
      }));
      throw error;
    }
  }, [state.currentFolder, loadFolderContents, loadDashboard]);

  // Delete multiple items
  const deleteMultipleItems = useCallback(async (itemIds: string[]) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result: DeleteMultipleResponse = await fileManagerService.deleteMultipleItems(itemIds);

      console.log('Deleted multiple items:', result);

      // Refresh current folder contents
      if (state.currentFolder) {
        await loadFolderContents(state.currentFolder.id);
      } else {
        await loadDashboard();
      }

      setState(prev => ({ 
        ...prev, 
        loading: false,
        selectedItems: []
      }));
    } catch (error) {
      console.error('Failed to delete items:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete items',
        loading: false 
      }));
      throw error;
    }
  }, [state.currentFolder, loadFolderContents, loadDashboard]);

  // Search files
  const searchFiles = useCallback(async (query: string, type?: 'folder' | 'file') => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const results: PaginatedResponse<Folder | FileItem> = await fileManagerService.searchFiles(query, { type, limit: 50 });
      
      console.log('Search results:', results);
      
      setState(prev => ({ 
        ...prev, 
        folderContents: results.results,
        pagination: {
          page: results.page,
          limit: results.limit,
          totalPages: results.totalPages,
          totalResults: results.totalResults,
        },
        loading: false 
      }));
    } catch (error) {
      console.error('Failed to search files:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to search files',
        loading: false,
        folderContents: [],
        pagination: null
      }));
    }
  }, []);

  // Update file
  const updateFile = useCallback(async (fileId: string, data: any) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      await fileManagerService.updateFile(fileId, data);

      console.log('Updated file:', fileId, data);

      // Refresh current folder contents
      if (state.currentFolder) {
        await loadFolderContents(state.currentFolder.id);
      }

      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      console.error('Failed to update file:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update file',
        loading: false 
      }));
      throw error;
    }
  }, [state.currentFolder, loadFolderContents]);

  // Update folder
  const updateFolder = useCallback(async (folderId: string, data: any) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      await fileManagerService.updateFolder(folderId, data);

      console.log('Updated folder:', folderId, data);

      // Refresh current folder contents
      if (state.currentFolder) {
        await loadFolderContents(state.currentFolder.id);
      }

      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      console.error('Failed to update folder:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update folder',
        loading: false 
      }));
      throw error;
    }
  }, [state.currentFolder, loadFolderContents]);

  // Select/deselect items
  const toggleItemSelection = useCallback((itemId: string) => {
    setState(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(itemId)
        ? prev.selectedItems.filter(id => id !== itemId)
        : [...prev.selectedItems, itemId]
    }));
  }, []);

  const selectAllItems = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedItems: prev.folderContents.map(item => item.id)
    }));
  }, []);

  const selectItemsOnCurrentPage = useCallback((itemIds: string[]) => {
    setState(prev => ({
      ...prev,
      selectedItems: [...new Set([...prev.selectedItems, ...itemIds])]
    }));
  }, []);

  const deselectItemsOnCurrentPage = useCallback((itemIds: string[]) => {
    setState(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.filter(id => !itemIds.includes(id))
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedItems: [] }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initialize
  useEffect(() => {
    loadDashboard();
    loadFolderTree();
  }, [loadDashboard, loadFolderTree]);

  return {
    // State
    ...state,
    
    // Actions
    loadDashboard,
    loadFolderContents,
    createFolder,
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    deleteFolder,
    deleteMultipleItems,
    searchFiles,
    updateFile,
    updateFolder,
    toggleItemSelection,
    selectAllItems,
    selectItemsOnCurrentPage,
    deselectItemsOnCurrentPage,
    clearSelection,
    clearError,
    
    // Utility functions
    formatFileSize: fileManagerService.formatFileSize,
    getFileIcon: fileManagerService.getFileIcon,
    getFileColor: fileManagerService.getFileColor,
  };
}; 