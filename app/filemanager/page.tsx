"use client"
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import React, { useEffect, useState, useRef, useMemo, Fragment } from 'react'
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { useFileManager } from '@/shared/hooks/useFileManager';
import { Folder, FileItem, User } from '@/shared/services/fileManagerService';
import * as XLSX from 'xlsx';
import HelpIcon from '@/shared/components/HelpIcon';

const Filemanager = () => {
    const {
        dashboard,
        currentFolder,
        folderContents,
        folderTree,
        loading,
        error,
        uploadProgress,
        pagination,
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
        formatFileSize,
        getFileIcon,
        getFileColor,
        clearError
    } = useFileManager();

    // --- LOCAL SELECTION STATE ---
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isFoldersOpen, setFoldersOpen] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [renameItemId, setRenameItemId] = useState<string | null>(null);
    const [renameItemName, setRenameItemName] = useState('');
    const [renameItemType, setRenameItemType] = useState<'file' | 'folder'>('file');
    const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderDescription, setNewFolderDescription] = useState('');
    const [fileSearch, setFileSearch] = useState('');
    const [filePage, setFilePage] = useState(1);
    const [fileRowsPerPage, setFileRowsPerPage] = useState(10);
    const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        itemId: string;
        itemName: string;
        itemType: 'file' | 'folder';
        item?: Folder | FileItem;
    } | null>(null);
    const [filePreviewModal, setFilePreviewModal] = useState<{
        visible: boolean;
        file: FileItem | null;
    }>({ visible: false, file: null });

    // Handle responsive behavior
    const handleResize = () => {
        const windowWidth = window.innerWidth;
        if (windowWidth <= 575) {
            setFoldersOpen(true);
        } else {
            setFoldersOpen(false);
        }
    };

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenu?.visible) {
                closeContextMenu();
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [contextMenu]);

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleToggleFolders = () => {
        if (window.innerWidth <= 575) {
            setFoldersOpen(true);
        }
    };

    const handleToggleFoldersClose = () => {
        setFoldersOpen(false);
    };

    // Handle file selection
    const handleFilesSelected = (files: FileList | null) => {
        if (!files) return;
        const validTypes = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const filtered = Array.from(files).filter(f => validTypes.includes(f.type) || f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/'));
        setUploadFiles(prev => [...prev, ...filtered]);
    };

    // Handle drag and drop
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleFilesSelected(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    // Simulate upload progress
    useEffect(() => {
        if (uploadFiles.length === 0) return;
        let interval: NodeJS.Timeout;
        const unfinished = uploadFiles.filter(f => !uploadProgress[f.name]);
        if (unfinished.length > 0) {
            interval = setInterval(() => {
                // Progress is handled by the hook now
            }, 400);
        }
        return () => clearInterval(interval);
    }, [uploadFiles, uploadProgress]);

    // Remove file from upload list
    const handleRemoveUploadFile = (name: string) => {
        setUploadFiles(prev => prev.filter(f => f.name !== name));
    };

    // Handle folder navigation with auto-expand
    const handleFolderClick = (folderId: string) => {
        // Auto-expand parent folders to show the path to the selected folder
        expandParentFolders(folderId, folderTree);
        loadFolderContents(folderId);
    };

    // Handle item clicks (both files and folders)
    const handleItemClick = (item: Folder | FileItem) => {
        if (item.type === 'folder') {
            // If it's a folder, navigate to it
            handleFolderClick(item.id);
        } else if (item.type === 'file' && item.file) {
            // If it's a file, open it
            handleFileClick(item);
        }
    };

    // Handle file clicks
    const handleFileClick = (fileItem: FileItem) => {
        if (fileItem.file) {
            // Open file in new tab
            window.open(fileItem.file.fileUrl, '_blank');
        }
    };

    // Auto-expand parent folders when navigating to a child folder
    const expandParentFolders = (folderId: string, folders: any[]): void => {
        const findPath = (folders: any[], targetId: string, path: string[] = []): string[] | null => {
            for (const folder of folders) {
                const currentPath = [...path, folder.id];
                if (folder.id === targetId) {
                    return currentPath;
                }
                if (folder.children && folder.children.length > 0) {
                    const result = findPath(folder.children, targetId, currentPath);
                    if (result) return result;
                }
            }
            return null;
        };

        const path = findPath(folders, folderId);
        if (path) {
            // Remove the target folder ID from the path (we don't want to expand the target itself)
            const parentIds = path.slice(0, -1);
            setExpandedFolders(prev => {
                const newExpanded = [...prev];
                parentIds.forEach(id => {
                    if (!newExpanded.includes(id)) {
                        newExpanded.push(id);
                    }
                });
                return newExpanded;
            });
        }
    };

    // Handle folder expansion
    const toggleExpand = (id: string) => {
        setExpandedFolders(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
    };

    // Helper function to get user display name
    const getUserDisplayName = (user: User | string): string => {
        if (typeof user === 'string') return user;
        return user.name || user.email || 'Unknown User';
    };

    // VS Code-like folder tree component with improved UI
    const FolderTree = ({ folders, level = 0 }: { folders: any[]; level?: number }) => (
        <ul className="space-y-0.5">
            {folders.map(folder => {
                const isActive = currentFolder?.id === folder.id;
                const isExpanded = expandedFolders.includes(folder.id);
                const hasChildren = folder.children && folder.children.length > 0;
                
                return (
                    <li key={folder.id} className="relative group">
                        <div
                            className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-colors duration-150
                                ${isActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                            `}
                            style={{ paddingLeft: `${level * 16 + 8}px` }}
                            onClick={() => handleFolderClick(folder.id)}
                        >
                            {/* Expand/Collapse Arrow */}
                            {hasChildren && (
                                <button
                                    className="flex items-center justify-center w-4 h-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                    onClick={e => { 
                                        e.stopPropagation(); 
                                        toggleExpand(folder.id); 
                                    }}
                                    title={isExpanded ? 'Collapse' : 'Expand'}
                                >
                                    <i className={`ri-arrow-${isExpanded ? 'down' : 'right'}-s-line text-xs transition-transform duration-200`}></i>
                                </button>
                            )}
                            
                            {/* Folder Icon */}
                            <span className="flex items-center justify-center w-4 h-4 mr-2">
                                <i className={`ri-folder-${isExpanded ? 'open' : '2'}-line text-sm ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}></i>
                            </span>
                            
                            {/* Folder Name */}
                            <span className="truncate text-sm font-medium flex-1">
                                {folder.name}
                            </span>
                            
                            {/* Context Menu */}
                            <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                onClick={(e) => handleItemContextMenu(e, { id: folder.id, type: 'folder', folder } as Folder)}
                                title="Folder options"
                            >
                                <i className="ri-more-2-fill text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs"></i>
                            </button>
                        </div>
                        
                        {/* Nested Children */}
                        {hasChildren && isExpanded && (
                            <FolderTree folders={folder.children} level={level + 1} />
                        )}
                    </li>
                );
            })}
        </ul>
    );

    // Prepare file data (filter, sort, paginate)
    const filteredFiles = useMemo(() => {
        // Ensure folderContents is always an array
        let files = Array.isArray(folderContents) ? folderContents : [];
        
        // Debug: Log the structure of items
        if (files.length > 0) {
            console.log('File contents structure:', files[0]);
        }
        
        // Filter out invalid items (files with null file data, folders with null folder data)
        // This handles cases where the API returns items with null data, which can happen
        // when files are deleted but not properly cleaned up from the database
        files = files.filter(f => {
            if (f.type === 'file') {
                return f.file !== null && f.file !== undefined;
            } else if (f.type === 'folder') {
                return f.folder !== null && f.folder !== undefined;
            }
            return false; // Unknown type
        });
        
        if (fileSearch) {
            files = files.filter(f => {
                if (f.type === 'file') {
                    return f.file?.fileName?.toLowerCase().includes(fileSearch.toLowerCase()) || false;
                } else {
                    return f.folder?.name?.toLowerCase().includes(fileSearch.toLowerCase()) || false;
                }
            });
        }
        // --- NORMALIZE IDs ---
        return files.map(f => {
            return { ...f, id: (f as any)._id };
        });
    }, [fileSearch, folderContents]);

    const totalFileResults = pagination?.totalResults || filteredFiles.length;
    const totalFilePages = pagination?.totalPages || Math.ceil(totalFileResults / fileRowsPerPage);
    const pagedFiles = filteredFiles.slice((filePage - 1) * fileRowsPerPage, filePage * fileRowsPerPage);

    const handleFileSelectAll = () => {
        const currentPageItemIds = pagedFiles.map(item => item.id);
        const allCurrentPageSelected = currentPageItemIds.every(id => selectedIds.includes(id));
        
        if (allCurrentPageSelected) {
            setSelectedIds(selectedIds.filter(id => !currentPageItemIds.includes(id)));
        } else {
            setSelectedIds([...selectedIds, ...currentPageItemIds.filter(id => !selectedIds.includes(id))]);
        }
    };

    // Rename handlers
    const openRenameModal = (item: Folder | FileItem) => {
        setRenameItemId(item.id);
        setRenameItemType(item.type);
        if (item.type === 'file' && item.file) {
            setRenameItemName(item.file.fileName);
        } else if (item.type === 'folder') {
            setRenameItemName(item.folder.name);
        }
        setRenameModalOpen(true);
    };

    const closeRenameModal = () => {
        setRenameModalOpen(false);
        setRenameItemId(null);
        setRenameItemName('');
        setRenameItemType('file');
    };

    const handleRenameSave = async () => {
        if (!renameItemId || !renameItemName.trim()) return;

        try {
            if (renameItemType === 'file') {
                await updateFile(renameItemId, { fileName: renameItemName.trim() });
            } else {
                await updateFolder(renameItemId, { name: renameItemName.trim() });
            }
            closeRenameModal();
        } catch (error) {
            console.error('Failed to rename item:', error);
        }
    };

    // Create folder handler
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            const parentFolderId = contextMenu?.itemType === 'folder' ? contextMenu?.itemId : currentFolder?.id;
            await createFolder(newFolderName.trim(), parentFolderId, newFolderDescription.trim());
            setCreateFolderModalOpen(false);
            setNewFolderName('');
            setNewFolderDescription('');
        } catch (error) {
            console.error('Failed to create folder:', error);
        }
    };

    // Context menu handlers
    const handleItemContextMenu = (e: React.MouseEvent, item: Folder | FileItem) => {
        e.preventDefault();
        e.stopPropagation();
        const itemName = item.type === 'file' ? (item.file?.fileName || 'Unknown File') : item.folder.name;
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            itemId: item.id,
            itemName,
            itemType: item.type,
            item
        });
    };

    const closeContextMenu = () => {
        setContextMenu(null);
    };

    const handleCreateSubfolder = () => {
        if (contextMenu) {
            setNewFolderName('');
            setNewFolderDescription('');
            setCreateFolderModalOpen(true);
            closeContextMenu();
        }
    };

    // Upload handler
    const handleUpload = async () => {
        if (uploadFiles.length === 0) return;

        try {
            await uploadMultipleFiles(uploadFiles, currentFolder?.id);
            setShowUploadModal(false);
            setUploadFiles([]);
        } catch (error) {
            console.error('Failed to upload files:', error);
        }
    };

    // Delete handlers
    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;

        if (confirm(`Are you sure you want to delete ${selectedIds.length} item(s)?`)) {
            try {
                await deleteMultipleItems(selectedIds);
                setSelectedIds([]);
            } catch (error) {
                console.error('Failed to delete items:', error);
            }
        }
    };

    const handleDeleteItem = async (item: Folder | FileItem) => {
        const itemName = item.type === 'file' ? (item.file?.fileName || 'Unknown File') : item.folder.name;
        if (confirm(`Are you sure you want to delete "${itemName}"?`)) {
            try {
                if (item.type === 'file' && item.file) {
                    await deleteFile(item.id, item.file.fileKey);
                } else {
                    await deleteFolder(item.id);
                }
            } catch (error) {
                console.error('Failed to delete item:', error);
            }
        }
    };

    // Search handler
    const handleSearch = (query: string) => {
        setFileSearch(query);
        setFilePage(1);
        if (query.trim()) {
            searchFiles(query);
        } else if (currentFolder) {
            loadFolderContents(currentFolder.id);
        } else {
            loadDashboard();
        }
    };

    const handleExportPath = () => {
        // Get selected file items only
        const selectedFiles = filteredFiles.filter(item => selectedIds.includes(item.id) && item.type === 'file');
        if (selectedFiles.length === 0) return;
        // Prepare data for Excel
        const data = selectedFiles.map(item => {
            if (item.type === 'file') {
                return {
                    'File Name': (item as any).file.fileName,
                    'File URL': (item as any).file.fileUrl
                };
            }
            return {};
        });
        // Create worksheet and workbook
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Exported Files');
        // Generate and trigger download
        XLSX.writeFile(wb, 'exported_file_paths.xlsx');
    };

    const handleDownloadSelected = () => {
        const selectedFiles = filteredFiles.filter(item => selectedIds.includes(item.id) && item.type === 'file');
        if (selectedFiles.length === 0) return;
        selectedFiles.forEach(item => {
            const file = (item as any).file;
            if (file && file.fileUrl && file.fileName) {
                const link = document.createElement('a');
                link.href = file.fileUrl;
                link.download = file.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    };

    // Copy file URL to clipboard
    const copyFileUrl = async (fileUrl: string) => {
        try {
            await navigator.clipboard.writeText(fileUrl);
            // You can add a toast notification here if you have a toast system
            console.log('File URL copied to clipboard');
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    };

    // Auto-select first folder on mount or when folderTree changes
    useEffect(() => {
        if (!currentFolder && Array.isArray(folderTree) && folderTree.length > 0) {
            // Find the first folder (recursively if needed)
            const findFirstFolder = (folders: any[]): string | null => {
                for (const folder of folders) {
                    if (folder && (folder as any).id) return (folder as any).id;
                    if ((folder as any).children && (folder as any).children.length > 0) {
                        const childId = findFirstFolder((folder as any).children);
                        if (childId) return childId;
                    }
                }
                return null;
            };
            const firstFolderId = findFirstFolder(folderTree);
            if (firstFolderId) {
                loadFolderContents(firstFolderId);
            }
        }
        // No cleanup needed
        return;
    }, [currentFolder, folderTree, loadFolderContents]);

    return (
        <Fragment>
            <Seo title={"File Manager"} />
            
            {/* Error Toast */}
            {error && (
                <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <div className="flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={clearError} className="ml-4 text-red-500 hover:text-red-700">
                            <i className="ri-close-line"></i>
                        </button>
                    </div>
                </div>
            )}

            <div className="file-manager-container p-2 gap-1 sm:!flex !block text-defaulttextcolor text-defaultsize">
                {/* Sidebar: Folders vertical card */}
                <div className="bg-white dark:bg-bodybg shadow-md p-2 w-full max-w-xs mr-4 h-[calc(100vh-5.5rem)] overflow-y-auto rounded-lg">
                    {/* Folder tree header */}
                    <div className="flex items-center justify-between border-b border-defaultborder dark:border-defaultborder/10 px-5 py-2 bg-light/60 rounded-t-lg mb-2">
                        <div className="flex items-center gap-3">
                            <h6 className="font-semibold text-[1rem] m-0">Folders</h6>
                            <HelpIcon
                              title="File Manager"
                              content={
                                <div>
                                  <p className="mb-4">
                                    This page allows you to manage files and folders in your system, providing a comprehensive file management interface.
                                  </p>
                                  
                                  <h4 className="font-semibold mb-2">What you can do:</h4>
                                  <ul className="list-disc list-inside mb-4 space-y-1">
                                    <li><strong>Browse Folders:</strong> Navigate through the folder structure using the sidebar tree</li>
                                    <li><strong>View Files:</strong> See all files in the current folder with details like size, type, and creation date</li>
                                    <li><strong>Upload Files:</strong> Upload single or multiple files to the current folder</li>
                                    <li><strong>Create Folders:</strong> Create new folders to organize your files</li>
                                    <li><strong>Rename Items:</strong> Rename files and folders for better organization</li>
                                    <li><strong>Delete Items:</strong> Remove files and folders that are no longer needed</li>
                                    <li><strong>Download Files:</strong> Download individual files or bulk download selected files</li>
                                    <li><strong>Export Paths:</strong> Export file paths for selected items</li>
                                    <li><strong>Search Files:</strong> Find specific files using the search functionality</li>
                                    <li><strong>Preview Files:</strong> Preview file contents before downloading</li>
                                  </ul>

                                  <h4 className="font-semibold mb-2">View Modes:</h4>
                                  <ul className="list-disc list-inside mb-4 space-y-1">
                                    <li><strong>Grid View:</strong> Display files in a card-based grid layout</li>
                                    <li><strong>List View:</strong> Display files in a detailed list format</li>
                                  </ul>

                                  <h4 className="font-semibold mb-2">File Information:</h4>
                                  <ul className="list-disc list-inside mb-4 space-y-1">
                                    <li><strong>Name:</strong> File or folder name</li>
                                    <li><strong>Size:</strong> File size in bytes, KB, MB, or GB</li>
                                    <li><strong>Type:</strong> File type or folder indicator</li>
                                    <li><strong>Created:</strong> Creation date and time</li>
                                    <li><strong>Modified:</strong> Last modification date and time</li>
                                    <li><strong>Created By:</strong> User who created the file or folder</li>
                                  </ul>

                                  <h4 className="font-semibold mb-2">Tips:</h4>
                                  <ul className="list-disc list-inside space-y-1">
                                    <li>Use drag and drop to upload files directly to folders</li>
                                    <li>Right-click on files for context menu options</li>
                                    <li>Select multiple files for bulk operations</li>
                                    <li>Use the search function to quickly find files</li>
                                    <li>Organize files in folders for better management</li>
                                  </ul>
                                </div>
                              }
                            />
                          </div>
                        <div className="flex gap-2">
                            <button
                                className="ti-btn ti-btn-primary ti-btn-xs flex items-center gap-1 px-2 py-1 text-xs font-medium shadow-sm hover:bg-primary-dark transition"
                                onClick={() => setCreateFolderModalOpen(true)}
                            >
                                <i className="ri-add-circle-line text-base"></i> New
                            </button>
                            <button
                                className="ti-btn ti-btn-danger ti-btn-xs flex items-center gap-1 px-2 py-1 text-xs font-medium shadow-sm transition disabled:opacity-50"
                                disabled={!currentFolder}
                                onClick={() => currentFolder && handleDeleteItem(currentFolder)}
                            >
                                <i className="ri-delete-bin-line text-base"></i> Delete
                            </button>
                        </div>
                    </div>
                    {/* Beautified FolderTree */}
                    <div className="pt-1 pb-2 pr-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                        ) : (
                            <FolderTree folders={folderTree} />
                        )}
                    </div>
                </div>

                {/* Main area: Show contents of selected folder */}
                <div className="flex-1 bg-white dark:bg-bodybg shadow-md p-0 min-h-[10rem] rounded-lg flex flex-col">
                    {currentFolder ? (
                        <>
                            {/* Folder name header and upload button */}
                            <div className="flex items-center justify-between border-b border-defaultborder dark:border-defaultborder/10 px-5 py-2 bg-light/60 rounded-t-lg">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-semibold text-defaulttextcolor m-0">{currentFolder.folder.name}</h2>
                                    {currentFolder.folder.description && (
                                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {currentFolder.folder.description}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">
                                        Created by: {getUserDisplayName(currentFolder.folder.createdBy)}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className="ti-btn ti-btn-danger flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-sm transition disabled:opacity-50"
                                        disabled={selectedIds.length === 0}
                                        onClick={handleDeleteSelected}
                                    >
                                        <i className="ri-delete-bin-line text-lg"></i> Delete{selectedIds.length > 0 && ` (${selectedIds.length})`}
                                    </button>
                                    <button
                                        className="ti-btn ti-btn-warning flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-sm transition disabled:opacity-50"
                                        disabled={selectedIds.length === 0}
                                        onClick={handleExportPath}
                                    >
                                        <i className="ri-share-forward-line text-lg"></i> Export Path{selectedIds.length > 0 && ` (${selectedIds.length})`}
                                    </button>
                                    <button
                                        className="ti-btn ti-btn-info flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-sm transition disabled:opacity-50"
                                        disabled={selectedIds.length === 0}
                                        onClick={handleDownloadSelected}
                                    >
                                        <i className="ri-download-2-line text-lg"></i> Download{selectedIds.length > 0 && ` (${selectedIds.length})`}
                                    </button>
                                    <button
                                        className="ti-btn ti-btn-primary flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary-dark transition"
                                        onClick={() => setShowUploadModal(true)}
                                    >
                                        <i className="ri-upload-2-line text-lg"></i> Upload
                                    </button>
                                </div>
                            </div>

                            {/* Search, view mode, and controls */}
                            <div className="flex flex-wrap justify-between items-center mb-4 gap-2 px-6 pt-4">
                                <div className="flex items-center gap-4">
                                    {/* View Mode Toggle */}
                                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                        <button
                                            className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                            onClick={() => setViewMode('grid')}
                                            title="Grid View"
                                        >
                                            <i className="ri-grid-line text-lg"></i>
                                        </button>
                                        <button
                                            className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                            onClick={() => setViewMode('list')}
                                            title="List View"
                                        >
                                            <i className="ri-list-check text-lg"></i>
                                        </button>
                                    </div>
                                    
                                    {/* Items Count */}
                                    <span className="text-sm text-gray-500">
                                        {filteredFiles.length} item{filteredFiles.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                
                                {/* Search */}
                                <div className="relative w-full max-w-xs">
                                    <input
                                        type="text"
                                        className="form-control py-3 pr-10"
                                        placeholder="Search by file name..."
                                        value={fileSearch}
                                        onChange={e => handleSearch(e.target.value)}
                                    />
                                    <button className="absolute end-0 top-0 px-4 h-full">
                                        <i className="ri-search-line text-lg"></i>
                                    </button>
                                </div>
                            </div>

                                                        {/* File/Folder Display */}
                            <div className="px-6">
                                {loading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : filteredFiles.length > 0 ? (
                                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4' : 'space-y-2'}>
                                        {filteredFiles.filter(item => {
                                            if (!item || typeof item !== 'object') return false;
                                            if (item.type === 'file' && (!item.file || item.file === null)) return false;
                                            if (item.type === 'folder' && (!item.folder || item.folder === null)) return false;
                                            return true;
                                        }).map((item) => (
                                            <div
                                                key={item.id}
                                                className={`group relative ${viewMode === 'grid' 
                                                    ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer' 
                                                    : 'flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 cursor-pointer'
                                                }`}
                                                onClick={() => handleItemClick(item)}
                                            >
                                                {/* Selection Checkbox */}
                                                <input
                                                    type="checkbox"
                                                    className={`absolute top-2 left-2 z-10 opacity-100 transition-opacity duration-200`}
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={e => {
                                                        e.stopPropagation();
                                                        setSelectedIds(prev =>
                                                            prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]
                                                        );
                                                    }}
                                                    onClick={() => console.log('Checkbox for', item.id, 'selectedIds:', selectedIds)}
                                                />

                                                {/* Icon */}
                                                <div className={`flex items-center justify-center ${viewMode === 'grid' ? 'w-16 h-16 mb-3' : 'w-10 h-10'}`}>
                                                    <div className={`w-full h-full rounded-lg flex items-center justify-center ${
                                                        item.type === 'folder' 
                                                            ? 'bg-blue-100 dark:bg-blue-900/30' 
                                                            : 'bg-gray-100 dark:bg-gray-700'
                                                    }`}>
                                                        <i className={`text-2xl ${
                                                            item.type === 'folder' 
                                                                ? 'ri-folder-2-line text-blue-600 dark:text-blue-400' 
                                                                : getFileIcon(item.type === 'file' && item.file ? item.file.mimeType : '')
                                                        }`}></i>
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'text-center' : ''}`}>
                                                    <div className="font-medium text-sm truncate">
                                                        {item.type === 'file' ? ((item as FileItem).file?.fileName || 'Unknown File') : (item as Folder).folder.name}
                                                    </div>
                                                    {viewMode === 'grid' && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {item.type === 'folder' ? 'Folder' : formatFileSize((item as FileItem).file?.fileSize || 0)}
                                                        </div>
                                                    )}
                                                    {viewMode === 'list' && (
                                                        <div className="text-xs text-gray-500">
                                                            {item.type === 'folder' ? 'Folder' : ((item as FileItem).file?.mimeType || 'Unknown')} • {formatFileSize((item as FileItem).file?.fileSize || 0)} • {new Date(item.updatedAt).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Three-dot menu */}
                                                <button
                                                    className={`${viewMode === 'grid' ? 'absolute top-2 right-2' : 'ml-2'} opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleItemContextMenu(e, item);
                                                    }}
                                                    title="More options"
                                                >
                                                    <i className="ri-more-2-fill text-gray-500 hover:text-primary"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-16 text-gray-500">
                                        <i className="ri-folder-open-line text-4xl mb-4 opacity-50"></i>
                                        <p className="text-lg font-medium">No files found in this folder</p>
                                        <p className="text-sm">Try uploading some files or creating a new folder</p>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {totalFilePages > 1 && (
                                <div className="flex justify-between items-center mt-4 px-6 pb-4">
                                    <div className="text-sm text-gray-500">
                                        Showing {totalFileResults === 0 ? 0 : (filePage - 1) * fileRowsPerPage + 1} to {totalFileResults === 0 ? 0 : Math.min(filePage * fileRowsPerPage, totalFileResults)} of {totalFileResults} entries
                                    </div>
                                    <nav aria-label="Page navigation" className="">
                                        <ul className="flex flex-wrap items-center">
                                            <li className={`page-item ${filePage === 1 ? 'disabled' : ''}`}>
                                                <button
                                                    className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                                                    onClick={() => setFilePage(prev => Math.max(prev - 1, 1))}
                                                    disabled={filePage === 1}
                                                >
                                                    Previous
                                                </button>
                                            </li>
                                            {Array.from({ length: totalFilePages }, (_, i) => i + 1).map(page => (
                                                <li key={page} className="page-item">
                                                    <button
                                                        className={`page-link py-2 px-3 leading-tight border border-gray-300 ${filePage === page ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                                                        onClick={() => setFilePage(page)}
                                                    >
                                                        {page}
                                                    </button>
                                                </li>
                                            ))}
                                            <li className={`page-item ${filePage === totalFilePages ? 'disabled' : ''}`}>
                                                <button
                                                    className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                                                    onClick={() => setFilePage(prev => Math.min(prev + 1, totalFilePages))}
                                                    disabled={filePage === totalFilePages}
                                                >
                                                    Next
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-gray-400 text-center mt-10">
                            {loading ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            ) : (
                                "Select a folder to view its contents."
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Folder Modal */}
            {createFolderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-bodybg rounded-lg shadow-lg p-6 w-full max-w-sm relative">
                        <button
                            className="absolute top-3 right-3 ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                            onClick={() => setCreateFolderModalOpen(false)}
                        >
                            <i className="ri-close-line"></i>
                        </button>
                        <h2 className="text-lg font-semibold mb-4 text-defaulttextcolor">
                            {contextMenu?.itemType === 'folder' ? `Create Subfolder in "${contextMenu.itemName}"` : 'Create Folder'}
                        </h2>
                        <input
                            type="text"
                            className="form-control mb-3"
                            placeholder="Folder Name"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            autoFocus
                        />
                        <textarea
                            className="form-control mb-4"
                            placeholder="Description (optional)"
                            value={newFolderDescription}
                            onChange={e => setNewFolderDescription(e.target.value)}
                            rows={3}
                        />
                        <div className="flex justify-end gap-2">
                            <button className="ti-btn ti-btn-light" onClick={() => setCreateFolderModalOpen(false)}>Cancel</button>
                            <button className="ti-btn ti-btn-primary" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Modal Overlay */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-bodybg rounded-lg shadow-lg p-8 w-full max-w-lg relative">
                        <button
                            className="absolute top-3 right-3 ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                            onClick={() => { setShowUploadModal(false); setUploadFiles([]); }}
                        >
                            <i className="ri-close-line"></i>
                        </button>
                        <h2 className="text-xl font-semibold mb-4 text-defaulttextcolor flex items-center">
                            <i className="ri-upload-2-line text-2xl mr-2 text-primary"></i> Upload Files
                        </h2>
                        <div
                            className="border-2 border-dashed border-primary/40 rounded-lg p-6 mb-4 flex flex-col items-center justify-center cursor-pointer bg-light/40 hover:bg-primary/10 transition"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="*/*"
                                className="hidden"
                                onChange={e => handleFilesSelected(e.target.files)}
                            />
                            <i className="ri-upload-cloud-2-line text-4xl text-primary mb-2"></i>
                            <p className="text-defaulttextcolor font-medium">Drag & Drop files here or <span className="text-primary underline">browse</span></p>
                            <p className="text-xs text-gray-500 mt-1">All file types supported</p>
                        </div>
                        {uploadFiles.length > 0 && (
                            <div className="space-y-3 max-h-56 overflow-y-auto mb-2 w-full">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-defaulttextcolor font-medium">{uploadFiles.length} file(s) selected</span>
                                </div>
                                {uploadFiles.map(file => (
                                    <div key={file.name} className="flex items-center gap-3 bg-light rounded p-2">
                                        <div className="flex-1">
                                            <div className="font-medium text-defaulttextcolor text-sm truncate">{file.name}</div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                <div
                                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress[file.name] || 0}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500 ml-2">{Math.round((uploadProgress[file.name] || 0))}%</span>
                                        <button
                                            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger ml-2"
                                            onClick={() => handleRemoveUploadFile(file.name)}
                                        >
                                            <i className="ri-close-line"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-end mt-4">
                            <button
                                className="ti-btn ti-btn-primary"
                                disabled={uploadFiles.length === 0 || loading}
                                onClick={handleUpload}
                            >
                                {loading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {renameModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-bodybg rounded-lg shadow-lg p-6 w-full max-w-sm relative">
                        <button
                            className="absolute top-3 right-3 ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                            onClick={closeRenameModal}
                        >
                            <i className="ri-close-line"></i>
                        </button>
                        <h2 className="text-lg font-semibold mb-4 text-defaulttextcolor">Rename {renameItemType === 'file' ? 'File' : 'Folder'}</h2>
                        <input
                            type="text"
                            className="form-control mb-4"
                            value={renameItemName}
                            onChange={e => setRenameItemName(e.target.value)}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button className="ti-btn ti-btn-light" onClick={closeRenameModal}>Cancel</button>
                            <button className="ti-btn ti-btn-primary" onClick={handleRenameSave} disabled={!renameItemName.trim()}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu?.visible && (
                <div 
                    className="fixed z-50 bg-white dark:bg-bodybg border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-48"
                    style={{
                        left: contextMenu.x,
                        top: contextMenu.y,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                        {contextMenu.itemName}
                    </div>
                    {contextMenu.itemType === 'folder' && (
                        <>
                            <button
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                onClick={handleCreateSubfolder}
                            >
                                <i className="ri-folder-add-line text-blue-600"></i>
                                Add Subfolder
                            </button>
                            <button
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                onClick={() => {
                                    handleFolderClick(contextMenu.itemId);
                                    closeContextMenu();
                                }}
                            >
                                <i className="ri-folder-open-line text-green-600"></i>
                                Open Folder
                            </button>
                        </>
                    )}
                    {contextMenu.itemType === 'file' && contextMenu.item && (
                        <>
                            <button
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                onClick={() => {
                                    setFilePreviewModal({ visible: true, file: contextMenu.item as FileItem });
                                    closeContextMenu();
                                }}
                            >
                                <i className="ri-eye-line text-blue-600"></i>
                                View File
                            </button>
                            <button
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                onClick={() => {
                                    if (contextMenu.item?.type === 'file' && contextMenu.item.file) {
                                        window.open(contextMenu.item.file.fileUrl, '_blank');
                                    }
                                    closeContextMenu();
                                }}
                            >
                                <i className="ri-external-link-line text-green-600"></i>
                                Open in New Tab
                            </button>
                            <button
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                onClick={() => {
                                    if (contextMenu.item?.type === 'file' && contextMenu.item.file) {
                                        const link = document.createElement('a');
                                        link.href = contextMenu.item.file.fileUrl;
                                        link.download = contextMenu.item.file.fileName;
                                        link.click();
                                    }
                                    closeContextMenu();
                                }}
                            >
                                <i className="ri-download-2-line text-purple-600"></i>
                                Download
                            </button>
                            <button
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                onClick={() => {
                                    if (contextMenu.item?.type === 'file' && contextMenu.item.file) {
                                        copyFileUrl(contextMenu.item.file.fileUrl);
                                    }
                                    closeContextMenu();
                                }}
                            >
                                <i className="ri-link text-orange-600"></i>
                                Copy URL
                            </button>
                        </>
                    )}
                    <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
                        onClick={() => {
                            if (contextMenu.item && confirm(`Are you sure you want to delete "${contextMenu.itemName}"?`)) {
                                handleDeleteItem(contextMenu.item);
                                closeContextMenu();
                            }
                        }}
                    >
                        <i className="ri-delete-bin-line"></i>
                        Delete {contextMenu.itemType === 'folder' ? 'Folder' : 'File'}
                    </button>
                </div>
            )}

            {/* File Preview Modal */}
            {filePreviewModal.visible && filePreviewModal.file && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <i className={`text-xl ${getFileIcon(filePreviewModal.file.file?.mimeType || '')}`}></i>
                                <div>
                                    <h3 className="font-semibold text-lg">{filePreviewModal.file.file?.fileName}</h3>
                                    <p className="text-sm text-gray-500">
                                        {formatFileSize(filePreviewModal.file.file?.fileSize || 0)} • {filePreviewModal.file.file?.mimeType}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                    onClick={() => {
                                        if (filePreviewModal.file?.file) {
                                            window.open(filePreviewModal.file.file.fileUrl, '_blank');
                                        }
                                    }}
                                    title="Open in new tab"
                                >
                                    <i className="ri-external-link-line"></i>
                                </button>
                                <button
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                    onClick={() => {
                                        if (filePreviewModal.file?.file) {
                                            const link = document.createElement('a');
                                            link.href = filePreviewModal.file.file.fileUrl;
                                            link.download = filePreviewModal.file.file.fileName;
                                            link.click();
                                        }
                                    }}
                                    title="Download"
                                >
                                    <i className="ri-download-2-line"></i>
                                </button>
                                <button
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                    onClick={() => setFilePreviewModal({ visible: false, file: null })}
                                    title="Close"
                                >
                                    <i className="ri-close-line"></i>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
                            {filePreviewModal.file.file?.mimeType?.startsWith('image/') ? (
                                <img 
                                    src={filePreviewModal.file.file.fileUrl} 
                                    alt={filePreviewModal.file.file.fileName}
                                    className="max-w-full h-auto mx-auto"
                                />
                            ) : filePreviewModal.file.file?.mimeType?.startsWith('video/') ? (
                                <video 
                                    src={filePreviewModal.file.file.fileUrl} 
                                    controls 
                                    className="max-w-full h-auto mx-auto"
                                />
                            ) : filePreviewModal.file.file?.mimeType?.startsWith('audio/') ? (
                                <audio 
                                    src={filePreviewModal.file.file.fileUrl} 
                                    controls 
                                    className="w-full"
                                />
                            ) : filePreviewModal.file.file?.mimeType?.includes('pdf') ? (
                                <iframe 
                                    src={filePreviewModal.file.file.fileUrl} 
                                    className="w-full h-[70vh] border-0"
                                    title={filePreviewModal.file.file.fileName}
                                />
                            ) : (
                                <div className="text-center py-16">
                                    <i className="ri-file-line text-6xl text-gray-400 mb-4"></i>
                                    <p className="text-lg font-medium text-gray-600">Preview not available</p>
                                    <p className="text-sm text-gray-500 mb-4">This file type cannot be previewed</p>
                                    <button
                                        className="ti-btn ti-btn-primary"
                                        onClick={() => {
                                            if (filePreviewModal.file?.file) {
                                                window.open(filePreviewModal.file.file.fileUrl, '_blank');
                                            }
                                        }}
                                    >
                                        <i className="ri-external-link-line mr-2"></i>
                                        Open File
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Fragment>
    );
}

export default Filemanager