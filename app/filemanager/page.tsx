"use client"
import { Filemanagerlist, Folderdata, Myfilesdata, Recentdata } from '@/shared/data/pages/filemanager/filemanagerdata'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import React, { Fragment, useEffect, useState, useCallback } from 'react'
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { useDropzone } from 'react-dropzone'
import S3Service from '@/shared/services/s3Service'
// Additional imports will be added when implementing S3 functionality

// Define file and folder types
interface FileItem {
  id: number;
  name: string;
  size: number;
  type: string;
  lastModified: string;
  path: string;
  url: string;
}

interface FolderItem {
  id: number;
  name: string;
  type: 'folder';
  path: string;
  items: number;
  size: string;
  lastModified: string;
}

type StorageItem = FileItem | FolderItem;

// Type guard functions
const isFileItem = (item: StorageItem): item is FileItem => {
  return item.type !== 'folder';
};

const isFolderItem = (item: StorageItem): item is FolderItem => {
  return item.type === 'folder';
};

const Filemanager = () => {

    const [isFoldersOpen, setFoldersOpen] = useState(false);
    const [isDetailsOpen, setDetailsOpen] = useState(false);
    const [currentFolder, setCurrentFolder] = useState('root');
    const [folderPath, setFolderPath] = useState(['Home']);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [filesList, setFilesList] = useState<StorageItem[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFile, setSelectedFile] = useState<StorageItem | null>(null);
    
    // Initialize S3 service
    const [s3Service, setS3Service] = useState<S3Service | null>(null);
    
    // Initialize S3 on component mount
    useEffect(() => {
      const s3Config = {
        bucketName: process.env.NEXT_PUBLIC_S3_BUCKET || '',
        region: process.env.NEXT_PUBLIC_S3_REGION || '',
        accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY || '',
        secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_KEY || '',
      };
      
      console.log("S3 Config:", s3Config);
      
      if (s3Config.bucketName && s3Config.region && s3Config.accessKeyId && s3Config.secretAccessKey) {
        const service = new S3Service(s3Config);
        setS3Service(service);
        
        // Load initial files and folders
        loadFilesAndFolders();
      }
    }, []);
    
    // Load files and folders from S3
    const loadFilesAndFolders = async () => {
      try {
        if (!s3Service) return;
        
        const prefix = currentFolder === 'root' ? '' : currentFolder;
        const result = await s3Service.listObjects(prefix);
        
        // Process directories
        const folders = result.directories.map(dir => ({
          id: Date.now() + Math.random(), // Generate unique ID
          name: dir.name,
          type: 'folder' as const,
          path: dir.path,
          items: 0, // This could be updated with a count of items in the folder
          size: '0 KB',
          lastModified: new Date().toISOString()
        }));
        
        // Process files
        const files = await Promise.all(result.files.map(async file => {
          // Get signed URL for each file
          const url = await s3Service.getSignedUrl(file.path);
          
          return {
            id: Date.now() + Math.random(), // Generate unique ID
            name: file.name,
            size: file.size,
            type: file.name.split('.').pop() || 'file', // Use extension as type
            lastModified: file.lastModified,
            path: file.path,
            url: url
          };
        }));
        
        setFilesList([...folders, ...files]);
      } catch (error) {
        console.error('Error loading files and folders:', error);
      }
    };
    
    // Update file loading when folder changes
    useEffect(() => {
      if (s3Service) {
        loadFilesAndFolders();
      }
    }, [currentFolder, s3Service]);
    
    const handleResize = () => {
     const windowWidth = window.innerWidth;
     // Handle folders and details visibility
     if (windowWidth <= 575) {
       setFoldersOpen(true);
       setDetailsOpen(false);
     } else if (windowWidth <= 1200) {
       setDetailsOpen(true);
     } else {
       setFoldersOpen(false);
       setDetailsOpen(false);
     }
   };
 
   useEffect(() => {
     window.addEventListener('resize', handleResize);
 
     return () => {
       window.removeEventListener('resize', handleResize);
     };
   }, []);
    
    const handleToggleFolders = () => {
      if (window.innerWidth <= 575) {
        setFoldersOpen(true);
        setDetailsOpen(false);
      }
    };
    
    const handleToggleFoldersClose = () => {
      setFoldersOpen(false);
    };
    
    const handleToggleDetails = () => {
      if (window.innerWidth <= 1200) {
        setDetailsOpen(true);
      }
    };
    
    const handleToggleDetailsClose = () => {
      setDetailsOpen(false);
    };

    // Handle file uploads
    const onDrop = useCallback((acceptedFiles: File[]) => {
      // In a real implementation, this would upload to S3
      setSelectedFile(null);
      handleFileUpload(acceptedFiles[0]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
      onDrop,
      accept: {
        'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
        'application/pdf': ['.pdf'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'text/plain': ['.txt']
      }
    });

    const handleFileUpload = async (file: File) => {
      if (!file || !s3Service) return;
      
      setIsUploading(true);
      setUploadProgress(0);
      
      try {
        // Start progress animation
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) { // Only go to 90% until actual upload completes
              clearInterval(interval);
              return 90;
            }
            return prev + 10;
          });
        }, 300);
        
        // Actual S3 upload
        const path = currentFolder === 'root' ? '' : currentFolder;
        const result = await s3Service.uploadFile(file, path);
        
        clearInterval(interval);
        setUploadProgress(100);
        
        // Add the file to the list with the S3 URL
        const newFile: FileItem = {
          id: Date.now(),
          name: file.name,
          size: file.size,
          type: file.type || file.name.split('.').pop() || 'file',
          lastModified: new Date().toISOString(),
          path: result.key,
          url: result.location
        };
        
        setFilesList(prev => [...prev, newFile]);
        setShowUploadModal(false);
        setIsUploading(false);
        
        // Refresh the file list
        loadFilesAndFolders();
        
      } catch (error) {
        console.error('Upload failed:', error);
        setIsUploading(false);
        setUploadProgress(0);
      }
    };
    
    const createNewFolder = async () => {
      if (!newFolderName.trim() || !s3Service) return;
      
      try {
        // Create the folder path
        const path = currentFolder === 'root' 
          ? newFolderName 
          : `${currentFolder}/${newFolderName}`;
        
        // Create folder in S3
        await s3Service.createFolder(path);
        
        // Create a new folder object for UI
        const newFolder: FolderItem = {
          id: Date.now(),
          name: newFolderName,
          type: 'folder',
          path: path,
          items: 0,
          size: '0 KB',
          lastModified: new Date().toISOString()
        };
        
        // Add to folders list
        setFilesList(prev => [...prev, newFolder]);
        setNewFolderName('');
        
        // Close the modal
        const modalElement = document.getElementById('todo-compose');
        if (modalElement) {
          modalElement.classList.remove('open');
        }
        
        // Refresh the file list
        loadFilesAndFolders();
      } catch (error) {
        console.error('Error creating folder:', error);
      }
    };
    
    const navigateToFolder = (folderId: number) => {
      const folder = filesList.find(f => f.id === folderId && f.type === 'folder') as FolderItem | undefined;
      if (folder) {
        // Ensure the path ends with a slash for S3 folder convention
        const folderPath = folder.path.endsWith('/') ? folder.path : `${folder.path}/`;
        setCurrentFolder(folderPath);
        
        // Update breadcrumb navigation
        const folderName = folder.name || folder.path.split('/').filter(Boolean).pop() || '';
        setFolderPath(prev => [...prev, folderName]);
      }
    };
    
    const navigateUp = () => {
      if (folderPath.length > 1) {
        // Update breadcrumb navigation
        const newPath = [...folderPath];
        newPath.pop();
        setFolderPath(newPath);
        
        // Update current folder path
        if (folderPath.length === 2) {
          // Going back to root
          setCurrentFolder('root');
        } else {
          // Going back up one level
          const pathParts = currentFolder.split('/').filter(Boolean);
          pathParts.pop();
          const parentPath = pathParts.length ? `${pathParts.join('/')}/` : 'root';
          setCurrentFolder(parentPath);
        }
        
        // Refresh files
        loadFilesAndFolders();
      }
    };
    
    const getFileIcon = (fileType: string) => {
      if (fileType === 'folder') return <i className="ri-folder-2-line text-warning text-[2rem]"></i>;
      
      if (fileType.includes('image')) return <i className="ri-image-line text-info text-[2rem]"></i>;
      if (fileType.includes('pdf')) return <i className="ri-file-pdf-line text-danger text-[2rem]"></i>;
      if (fileType.includes('word') || fileType.includes('doc')) return <i className="ri-file-word-line text-primary text-[2rem]"></i>;
      if (fileType.includes('excel') || fileType.includes('sheet')) return <i className="ri-file-excel-line text-success text-[2rem]"></i>;
      if (fileType.includes('text')) return <i className="ri-file-text-line text-secondary text-[2rem]"></i>;
      
      return <i className="ri-file-line text-[2rem]"></i>;
    };
    
    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    const copyFileLink = (fileUrl: string) => {
      navigator.clipboard.writeText(fileUrl)
        .then(() => {
          alert('Link copied to clipboard!');
        })
        .catch(err => {
          console.error('Could not copy link: ', err);
        });
    };

    // Delete file functionality
    const deleteFile = async (file: FileItem) => {
      if (!s3Service) return;
      
      try {
        await s3Service.deleteObject(file.path);
        setFilesList(prev => prev.filter(item => item.id !== file.id));
        
        if (selectedFile && selectedFile.id === file.id) {
          setSelectedFile(null);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    };

    return (
        <Fragment>
            <Seo title={"File Manager"} />
            <div className="file-manager-container p-2 gap-2 sm:!flex !block text-defaulttextcolor text-defaultsize">

                <div className={`file-manager-folders ${isFoldersOpen ? 'open' : ''}`}>
                    <div className="flex p-4 flex-wrap gap-2 items-center justify-between border-b dark:border-defaultborder/10">
                        <div>
                            <h6 className="font-semibold mb-0 text-[1rem]">Folders</h6>
                        </div>
                        <div className="flex gap-2">
                            <button aria-label="button" onClick={handleToggleFoldersClose} type="button" id="folders-close-btn" className="sm:hidden block btn btn-icon btn-sm btn-danger">
                                <i className="ri-close-fill"></i>
                            </button>
                            <div>
                                <Link href="#!" scroll={false} className="hs-dropdown-toggle ti-btn !gap-0 !py-1 !px-2 !text-[0.75rem] !font-medium bg-primary text-white flex items-center justify-center" data-hs-overlay="#todo-compose">
                                    <i className="ri-add-circle-line align-middle !me-1"></i>Create Folder
                                </Link>
                            </div>
                            <div>
                                <button onClick={() => setShowUploadModal(true)} className="ti-btn !gap-0 !py-1 !px-2 !text-[0.75rem] !font-medium bg-secondary text-white flex items-center justify-center">
                                    <i className="ri-upload-cloud-line align-middle !me-1"></i>Upload Files
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Breadcrumb Navigation */}
                    <div className="p-4 border-b dark:border-defaultborder/10">
                        <nav aria-label="breadcrumb">
                            <ol className="flex flex-wrap items-center gap-2">
                                {folderPath.map((folder, index) => (
                                    <li key={index} className="flex items-center">
                                        {index > 0 && <i className="ri-arrow-right-s-line mx-1"></i>}
                                        <button 
                                            onClick={() => {
                                                if (index < folderPath.length - 1) {
                                                    setFolderPath(folderPath.slice(0, index + 1));
                                                    // Calculate the path based on selected breadcrumb
                                                    const newPath = folderPath.slice(0, index + 1).join('/');
                                                    setCurrentFolder(newPath === 'Home' ? 'root' : newPath);
                                                }
                                            }}
                                            className={`text-sm ${index === folderPath.length - 1 ? 'text-primary font-semibold' : 'text-gray-600'}`}
                                        >
                                            {folder}
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </div>
                    
                    <div className="p-4 file-folders-container overflow-scroll" id="file-folders-container">
                        {/* Upload Dropzone - Visible when upload modal is open */}
                        {showUploadModal && (
                            <div className="mb-6 border-2 border-dashed rounded-lg p-6 dark:border-defaultborder/10">
                                <div {...getRootProps()} className="cursor-pointer text-center">
                                    <input {...getInputProps()} />
                                    <div className="mb-4">
                                        <i className="ri-upload-cloud-2-line text-primary text-[3rem]"></i>
                                    </div>
                                    {isDragActive ? (
                                        <p className="text-lg">Drop the files here...</p>
                                    ) : (
                                        <div>
                                            <p className="text-lg mb-2">Drag & drop files here, or click to select files</p>
                                            <p className="text-sm text-gray-500">Supports images, documents, PDFs, and more</p>
                                        </div>
                                    )}
                                    
                                    {isUploading && (
                                        <div className="mt-4">
                                            <div className="flex justify-between mb-1">
                                                <span>Uploading {selectedFile?.name}</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex justify-end mt-4">
                                    <button 
                                        onClick={() => setShowUploadModal(false)}
                                        className="ti-btn ti-btn-danger !py-1 !px-3 !text-[0.75rem] !font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* Folders Section */}
                        <div className="flex mb-4 items-center justify-between">
                            <p className="mb-0 font-semibold text-[.875rem]">Folders</p>
                        </div>
                        <div className="grid grid-cols-12 gap-x-6 mb-4">
                            {filesList.filter(isFolderItem).map((folder) => (
                                <div className="xxl:col-span-3 xl:col-span-6 lg:col-span-6 md:col-span-6 col-span-12" key={folder.id}>
                                    <div className="box border dark:border-defaultborder/10 !shadow-none">
                                        <div className="box-body bg-light" onClick={() => navigateToFolder(folder.id)}>
                                            <div className="mb-4 folder-svg-container flex flex-wrap justify-between items-start">
                                                <div>
                                                    <i className="ri-folder-2-line text-warning text-[2rem]"></i>
                                                </div>
                                                <div>
                                                    <div className="hs-dropdown ti-dropdown ltr:[--placement:left-top] rtl:[--placement:right-top]">
                                                        <button className="ti-btn ti-btn-sm ti-btn-primary" aria-label="button" type="button" aria-expanded="false">
                                                            <i className="ri-more-2-fill"></i>
                                                        </button>
                                                        <ul className="hs-dropdown-menu ti-dropdown-menu hidden">
                                                            <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium" href="#!" scroll={false}>Delete</Link></li>
                                                            <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium" href="#!" scroll={false}>Rename</Link></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[.875rem] font-semibold mb-1 leading-none">
                                                <Link href="#!" scroll={false}>{folder.name}</Link>
                                            </p>
                                            <div className="flex items-center justify-between flex-wrap">
                                                <div>
                                                    <span className="text-[#8c9097] dark:text-white/50 text-[.75rem]">
                                                        {folder.items} items
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-default font-semibold">
                                                        {folder.lastModified.split('T')[0]}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {filesList.filter(isFolderItem).length === 0 && (
                                <div className="col-span-12 text-center py-8">
                                    <i className="ri-folder-2-line text-[2rem] text-gray-400 mb-2"></i>
                                    <p className="text-gray-500">No folders found in this location</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Files Section */}
                        <div className="flex mb-4 items-center justify-between">
                            <p className="mb-0 font-semibold text-[.875rem]">Files</p>
                        </div>
                        <div className="grid grid-cols-12 gap-6">
                            <div className="xl:col-span-12 col-span-12">
                                <div className="table-responsive border border-bottom-0 dark:border-defaultborder/10">
                                    <table className="table whitespace-nowrap table-hover min-w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col" className="text-start">File Name</th>
                                                <th scope="col" className="text-start">Type</th>
                                                <th scope="col" className="text-start">Size</th>
                                                <th scope="col" className="text-start">Date Modified</th>
                                                <th scope="col" className="text-start">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="files-list">
                                            {filesList.filter(isFileItem).map((file) => (
                                                <tr key={file.id} onClick={() => setSelectedFile(file)}>
                                                    <th scope="row">
                                                        <div className="flex items-center">
                                                            <div className="me-2">
                                                                <span className="avatar avatar-xs">
                                                                    {getFileIcon(file.type)}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                {file.name}
                                                            </div>
                                                        </div>
                                                    </th>
                                                    <td>{file.type.split('/')[1] || file.type}</td>
                                                    <td>{formatFileSize(file.size)}</td>
                                                    <td>{new Date(file.lastModified).toLocaleString()}</td>
                                                    <td>
                                                        <div className="flex flex-row items-center !gap-2 text-[0.9375rem]">
                                                            <Link 
                                                                aria-label="view" 
                                                                href={file.url} 
                                                                target="_blank"
                                                                className="ti-btn ti-btn-icon ti-btn-wave !rounded-full !border-info/10 !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-info/10 text-info hover:bg-info hover:text-white hover:border-info"
                                                            >
                                                                <i className="ri-eye-line"></i>
                                                            </Link>
                                                            <button
                                                                aria-label="copy link"
                                                                onClick={(e) => { e.stopPropagation(); copyFileLink(file.url); }}
                                                                className="ti-btn ti-btn-icon ti-btn-wave !rounded-full !border-success/10 !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-success/10 text-success hover:bg-success hover:text-white hover:border-success"
                                                            >
                                                                <i className="ri-link"></i>
                                                            </button>
                                                            <button
                                                                aria-label="delete"
                                                                onClick={(e) => { 
                                                                  e.stopPropagation(); 
                                                                  if (isFileItem(file)) {
                                                                    deleteFile(file);
                                                                  }
                                                                }}
                                                                className="ti-btn ti-btn-icon ti-btn-wave !rounded-full !border-danger/10 !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-danger/10 text-danger hover:bg-danger hover:text-white hover:border-danger"
                                                            >
                                                                <i className="ri-delete-bin-line"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            
                                            {filesList.filter(isFileItem).length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-8">
                                                        <i className="ri-file-line text-[2rem] text-gray-400 mb-2"></i>
                                                        <p className="text-gray-500">No files found in this location</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* File Details Panel - Will be shown when a file is selected */}
                {selectedFile && isFileItem(selectedFile) && (
                    <div className={`selected-file-details ${isDetailsOpen ? 'open' : ''}`}>
                        <div className="flex p-4 items-center justify-between border-b dark:border-defaultborder/10">
                            <div>
                                <h6 className="font-semibold mb-0 text-[1rem]">File Details</h6>
                            </div>
                            <div className="flex items-center">
                                <div className="hs-dropdown ti-dropdown me-1">
                                    <button className="ti-btn ti-btn-sm ti-btn-primary" aria-label="button" type="button" aria-expanded="false">
                                        <i className="ri-more-2-fill"></i>
                                    </button>
                                    <ul className="hs-dropdown-menu ti-dropdown-menu hidden">
                                        <li><button className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium" onClick={() => copyFileLink(selectedFile.url)}>Copy Link</button></li>
                                        <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium" href={selectedFile.url} target="_blank">View</Link></li>
                                        <li><button className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium" onClick={() => deleteFile(selectedFile)}>Delete</button></li>
                                    </ul>
                                </div>
                                <button onClick={() => setSelectedFile(null)} aria-label="button" type="button" className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger xl:hidden block">
                                    <i className="ri-close-fill"></i>
                                </button>
                            </div>
                        </div>
                        <div className="filemanager-file-details overflow-scroll" id="filemanager-file-details">
                            <div className="p-4 text-center border-b border-dashed dark:border-defaultborder/10">
                                <div className="file-details mb-4 !inline-flex">
                                    {selectedFile.type.includes('image') ? (
                                        <img src={selectedFile.url} alt={selectedFile.name} className="max-w-full h-auto max-h-48" />
                                    ) : (
                                        <div className="p-4">{getFileIcon(selectedFile.type)}</div>
                                    )}
                                </div>
                                <div>
                                    <p className="mb-0 font-semibold text-[1rem]">{selectedFile.name}</p>
                                    <p className="mb-0 text-[#8c9097] dark:text-white/50 text-[.625rem]">
                                        {formatFileSize(selectedFile.size)} | {new Date(selectedFile.lastModified).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="p-4 border-b border-dashed dark:border-defaultborder/10">
                                <ul className="list-group">
                                    <li className="list-group-item">
                                        <div>
                                            <span className="font-semibold">File Format : </span>
                                            <span className="text-[.75rem] text-[#8c9097] dark:text-white/50">
                                                {selectedFile.type.split('/')[1] || selectedFile.type}
                                            </span>
                                        </div>
                                    </li>
                                    <li className="list-group-item">
                                        <div>
                                            <p className="font-semibold mb-0">File Location : </p>
                                            <span className="text-[.75rem] text-[#8c9097] dark:text-white/50">
                                                {selectedFile.path}
                                            </span>
                                        </div>
                                    </li>
                                    <li className="list-group-item">
                                        <div>
                                            <p className="font-semibold mb-0">File URL : </p>
                                            <span className="text-[.75rem] text-[#8c9097] dark:text-white/50 break-all">
                                                {selectedFile.url}
                                            </span>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                            <div className="p-4 flex gap-2">
                                <button 
                                    onClick={() => copyFileLink(selectedFile.url)}
                                    className="ti-btn ti-btn-primary flex-1"
                                >
                                    <i className="ri-link me-1"></i> Copy Link
                                </button>
                                <button 
                                    onClick={() => deleteFile(selectedFile)}
                                    className="ti-btn ti-btn-danger flex-1"
                                >
                                    <i className="ri-delete-bin-line me-1"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Create Folder Modal */}
            <div id="todo-compose" className="hs-overlay hidden ti-modal">
                <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out min-h-[calc(100%-3.5rem)] flex items-center">
                    <div className="ti-modal-content w-full">
                        <div className="ti-modal-header">
                            <h6 className="modal-title text-[1rem] font-semibold" id="mail-ComposeLabel">Create Folder</h6>
                            <button type="button" className="hs-dropdown-toggle !text-[1rem] !font-semibold !text-defaulttextcolor" data-hs-overlay="#todo-compose">
                                <i className="ri-close-line"></i>
                            </button>
                        </div>
                        <div className="ti-modal-body px-4">
                            <label htmlFor="create-folder1" className="form-label">Folder Name</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                id="create-folder1" 
                                placeholder="Folder Name" 
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                            />
                        </div>
                        <div className="ti-modal-footer">
                            <button 
                                aria-label="button" 
                                type="button"
                                className="hs-dropdown-toggle ti-btn ti-btn-light align-middle"
                                data-hs-overlay="#todo-compose"
                            >
                                <i className="ri-close-fill"></i>
                            </button>
                            <button 
                                type="button" 
                                className="ti-btn ti-btn-success-full text-white !font-medium"
                                onClick={createNewFolder}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    )
}

export default Filemanager