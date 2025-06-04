"use client"
import { Filemanagerlist, Folderdata, Myfilesdata, Recentdata } from '@/shared/data/pages/filemanager/filemanagerdata'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import React, { useEffect, useState, useRef, useMemo,Fragment } from 'react'
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import ContentLayout from "@/app/(components)/(contentlayout)/layout";

const Filemanager = () => {

    const [isFoldersOpen, setFoldersOpen] = useState(false);
    const [selectedFolders, setSelectedFolders] = useState<number[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [renameFileId, setRenameFileId] = useState<number | null>(null);
    const [renameFileName, setRenameFileName] = useState('');
    const [fileData, setFileData] = useState(() => Recentdata.map((f, i) => ({ ...f, id: i + 1 })));
 
    const handleResize = () => {
     const windowWidth = window.innerWidth;
     // Handle folders and details visibility
     if (windowWidth <= 575) {
       setFoldersOpen(true);
     } else {
       setFoldersOpen(false);
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
      }
    };
    
    const handleToggleFoldersClose = () => {
      setFoldersOpen(false);
    };
    
    // Folder checkbox handler
    const handleFolderCheckbox = (id: number) => {
        setSelectedFolders(prev =>
            prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
        );
    };
    // File checkbox handler
    const handleFileCheckbox = (id: number) => {
        setSelectedFiles(prev =>
            prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
        );
    };

    // Handle file selection
    const handleFilesSelected = (files: FileList | null) => {
        if (!files) return;
        const validTypes = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'];
        const filtered = Array.from(files).filter(f => validTypes.includes(f.type));
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
                setUploadProgress(prev => {
                    const updated = { ...prev };
                    unfinished.forEach(f => {
                        const current = updated[f.name] || 0;
                        if (current < 100) {
                            updated[f.name] = Math.min(100, current + Math.random() * 20 + 10);
                        }
                    });
                    return updated;
                });
            }, 400);
        }
        return () => clearInterval(interval);
    }, [uploadFiles]);

    // Remove file from upload list
    const handleRemoveUploadFile = (name: string) => {
        setUploadFiles(prev => prev.filter(f => f.name !== name));
        setUploadProgress(prev => {
            const updated = { ...prev };
            delete updated[name];
            return updated;
        });
    };

    // Add a sample nested folder structure for demonstration
    const nestedFolders = [
        {
            id: 1,
            name: 'Images',
            children: [
                { id: 5, name: 'Vacation', children: [] },
                { id: 6, name: 'Work', children: [] },
            ],
        },
        {
            id: 2,
            name: 'Docs',
            children: [
                { id: 7, name: 'Invoices', children: [] },
            ],
        },
        {
            id: 3,
            name: 'Downloads',
            children: [],
        },
        {
            id: 4,
            name: 'Apps',
            children: [],
        },
    ];

    const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<number[]>([]);
    const toggleExpand = (id: number) => {
        setExpandedFolders(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
    };

    // Recursive folder tree component
    const FolderTree = ({ folders, level = 0 }: { folders: any[]; level?: number }) => (
        <ul
            className={`relative transition-all duration-200
                ${level > 0 ? 'pl-5 ml-2 border-l-2 border-primary/40 dark:border-primary/60' : ''}
            `}
            style={{
                borderColor: level > 0 ? 'rgba(59,130,246,0.4)' : undefined, // Tailwind primary/40
            }}
        >
            {folders.map(folder => {
                const isActive = activeFolderId === folder.id;
                const isExpanded = expandedFolders.includes(folder.id);
                const hasChildren = folder.children && folder.children.length > 0;
                return (
                    <li key={folder.id} className="relative group transition-all duration-200">
                        <div
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-all duration-200
                                ${isActive ? 'bg-primary/10 text-primary font-semibold shadow-sm' : 'hover:bg-primary/5 hover:text-primary'}
                                ${level > 0 ? 'ml-2 bg-primary/5' : ''}`}
                            style={{ minHeight: '2.25rem' }}
                            onClick={() => setActiveFolderId(folder.id)}
                        >
                            {hasChildren && (
                                <span
                                    className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-primary transition mr-1"
                                    onClick={e => { e.stopPropagation(); toggleExpand(folder.id); }}
                                >
                                    <i className={`ri-arrow-${isExpanded ? 'down' : 'right'}-s-line`}></i>
                                </span>
                            )}
                            <span className={`flex items-center justify-center w-7 h-7 rounded-lg ${isActive ? 'bg-primary/20' : 'bg-gray-100 dark:bg-defaultbg'} mr-1`}>
                                <i className={`ri-folder-2-line text-lg ${isActive ? 'text-primary' : 'text-gray-500'}`}></i>
                            </span>
                            <span className="truncate text-base">{folder.name}</span>
                        </div>
                        {hasChildren && isExpanded && (
                            <FolderTree folders={folder.children} level={level + 1} />
                        )}
                    </li>
                );
            })}
        </ul>
    );

    // Find the active folder name for display
    const getActiveFolderName = (id: number | null, folders: any[]): string => {
        if (!id) return '';
        for (const folder of folders) {
            if (folder.id === id) return folder.name;
            if (folder.children) {
                const name = getActiveFolderName(id, folder.children);
                if (name) return name;
            }
        }
        return '';
    };

    // File table state
    const [fileSearch, setFileSearch] = useState('');
    const [filePage, setFilePage] = useState(1);
    const [fileRowsPerPage, setFileRowsPerPage] = useState(10);
    type FileSortCol = 'text1' | 'text3' | 'text4';
    const [fileSort, setFileSort] = useState<{ col: FileSortCol, dir: 'asc' | 'desc' }>({ col: 'text1', dir: 'asc' });
    const [selectedFileRows, setSelectedFileRows] = useState<number[]>([]);
    const [selectAllFiles, setSelectAllFiles] = useState(false);

    // Prepare file data (filter, sort, paginate)
    const filteredFiles = useMemo(() => {
        let files = fileData;
        if (fileSearch) {
            files = files.filter(f => f.text1.toLowerCase().includes(fileSearch.toLowerCase()));
        }
        if (fileSort.col) {
            files = files.sort((a, b) => {
                let aVal: any;
                let bVal: any;
                if (fileSort.col === 'text1') {
                    aVal = a.text1;
                    bVal = b.text1;
                } else if (fileSort.col === 'text3') {
                    aVal = parseFloat(a.text3);
                    bVal = parseFloat(b.text3);
                } else if (fileSort.col === 'text4') {
                    aVal = new Date(a.text4);
                    bVal = new Date(b.text4);
                }
                if (aVal < bVal) return fileSort.dir === 'asc' ? -1 : 1;
                if (aVal > bVal) return fileSort.dir === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return files;
    }, [fileSearch, fileSort, fileData]);

    const totalFileResults = filteredFiles.length;
    const totalFilePages = Math.ceil(totalFileResults / fileRowsPerPage);
    const pagedFiles = filteredFiles.slice((filePage - 1) * fileRowsPerPage, filePage * fileRowsPerPage);

    const handleFileSelectAll = () => {
        if (selectAllFiles) {
            setSelectedFileRows([]);
        } else {
            setSelectedFileRows(pagedFiles.map(f => f.id));
        }
        setSelectAllFiles(!selectAllFiles);
    };
    const handleFileRowSelect = (id: number) => {
        setSelectedFileRows(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const handleFileSort = (col: FileSortCol) => {
        setFileSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }));
    };

    // Rename handlers
    const openRenameModal = (file: any) => {
        setRenameFileId(file.id);
        setRenameFileName(file.text1);
        setRenameModalOpen(true);
    };
    const closeRenameModal = () => {
        setRenameModalOpen(false);
        setRenameFileId(null);
        setRenameFileName('');
    };
    const handleRenameSave = () => {
        setFileData(prev => prev.map(f => f.id === renameFileId ? { ...f, text1: renameFileName } : f));
        closeRenameModal();
    };

    return (
        <Fragment>
            <Seo title={"File Manager"} />
            <div className="file-manager-container p-2 gap-1 sm:!flex !block text-defaulttextcolor text-defaultsize">
                {/* Sidebar: Folders vertical card */}
                <div className="bg-white dark:bg-bodybg shadow-md p-2 w-full max-w-xs mr-4 h-[calc(100vh-5.5rem)] overflow-y-auto rounded-lg">
                    {/* Folder tree header */}
                    <div className="flex items-center justify-between border-b border-defaultborder dark:border-defaultborder/10 px-5 py-2 bg-light/60 rounded-t-lg mb-2">
                        <h6 className="font-semibold text-[1rem] m-0">Folders</h6>
                        <div className="flex gap-2">
                            <button
                                className="ti-btn ti-btn-primary ti-btn-xs flex items-center gap-1 px-2 py-1 text-xs font-medium shadow-sm hover:bg-primary-dark transition"
                                data-hs-overlay="#todo-compose"
                            >
                                <i className="ri-add-circle-line text-base"></i> New
                            </button>
                            <button
                                className="ti-btn ti-btn-danger ti-btn-xs flex items-center gap-1 px-2 py-1 text-xs font-medium shadow-sm transition disabled:opacity-50"
                                disabled={!activeFolderId}
                            >
                                <i className="ri-delete-bin-line text-base"></i> Delete
                            </button>
                        </div>
                    </div>
                    {/* Beautified FolderTree */}
                    <div className="pt-1 pb-2 pr-1">
                        <FolderTree folders={nestedFolders} />
                    </div>
                </div>
                {/* Main area: Show contents of selected folder */}
                <div className="flex-1 bg-white dark:bg-bodybg shadow-md p-0 min-h-[10rem] rounded-lg flex flex-col">
                    {activeFolderId ? (
                        <>
                            {/* Folder name header and upload button */}
                            <div className="flex items-center justify-between border-b border-defaultborder dark:border-defaultborder/10 px-5 py-2 bg-light/60 rounded-t-lg">
                                <h2 className="text-lg font-semibold text-defaulttextcolor m-0">{getActiveFolderName(activeFolderId, nestedFolders)}</h2>
                                <div className="flex gap-2">
                                    <button
                                        className="ti-btn ti-btn-danger flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-sm transition disabled:opacity-50"
                                        disabled={selectedFileRows.length === 0}
                                    >
                                        <i className="ri-delete-bin-line text-lg"></i> Delete{selectedFileRows.length > 0 && ` (${selectedFileRows.length})`}
                                    </button>
                                    <button
                                        className="ti-btn ti-btn-warning flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-sm transition disabled:opacity-50"
                                        disabled={selectedFileRows.length === 0}
                                    >
                                        <i className="ri-share-forward-line text-lg"></i> Export Path{selectedFileRows.length > 0 && ` (${selectedFileRows.length})`}
                                    </button>
                                    <button
                                        className="ti-btn ti-btn-info flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-sm transition disabled:opacity-50"
                                        disabled={selectedFileRows.length === 0}
                                    >
                                        <i className="ri-download-2-line text-lg"></i> Download{selectedFileRows.length > 0 && ` (${selectedFileRows.length})`}
                                    </button>
                                    <button
                                        className="ti-btn ti-btn-primary flex items-center gap-2 px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary-dark transition"
                                        onClick={() => setShowUploadModal(true)}
                                    >
                                        <i className="ri-upload-2-line text-lg"></i> Upload
                                    </button>
                                </div>
                            </div>
                            {/* Search, rows per page, and table */}
                            <div className="flex flex-wrap justify-between items-center mb-4 gap-2 px-6 pt-4">
                                <div className="flex items-center">
                                    <label className="mr-2 text-sm text-gray-600">Rows per page:</label>
                                    <select
                                        className="form-select w-auto text-sm"
                                        value={fileRowsPerPage}
                                        onChange={e => { setFileRowsPerPage(Number(e.target.value)); setFilePage(1); }}
                                    >
                                        <option value={10}>10</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                                <div className="relative w-full max-w-xs">
                                    <input
                                        type="text"
                                        className="form-control py-3 pr-10"
                                        placeholder="Search by file name..."
                                        value={fileSearch}
                                        onChange={e => { setFileSearch(e.target.value); setFilePage(1); }}
                                    />
                                    <button className="absolute end-0 top-0 px-4 h-full">
                                        <i className="ri-search-line text-lg"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="table-responsive px-6">
                                <table className="table whitespace-nowrap table-bordered min-w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th>
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={selectAllFiles}
                                                    onChange={handleFileSelectAll}
                                                />
                                            </th>
                                            <th className="text-start cursor-pointer" onClick={() => handleFileSort('text1')}>
                                                File Name
                                                {fileSort.col === 'text1' && (fileSort.dir === 'asc' ? ' ▲' : ' ▼')}
                                            </th>
                                            <th className="text-start">Thumbnail</th>
                                            <th className="text-start cursor-pointer" onClick={() => handleFileSort('text3')}>
                                                Size
                                                {fileSort.col === 'text3' && (fileSort.dir === 'asc' ? ' ▲' : ' ▼')}
                                            </th>
                                            <th className="text-start cursor-pointer" onClick={() => handleFileSort('text4')}>
                                                Date Modified
                                                {fileSort.col === 'text4' && (fileSort.dir === 'asc' ? ' ▲' : ' ▼')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedFiles.map((file, idx) => (
                                            <tr key={file.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-gray-50' : ''}`}>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        checked={selectedFileRows.includes(file.id)}
                                                        onChange={() => handleFileRowSelect(file.id)}
                                                    />
                                                </td>
                                                <td className="align-middle">
                                                    <div className="flex items-center gap-2 h-16">
                                                        {file.text1}
                                                        <button
                                                            className="ml-1 p-1"
                                                            style={{ fontSize: '0.85em', height: '1.5em', width: '1.5em' }}
                                                            title="Rename"
                                                            onClick={() => openRenameModal(file)}
                                                        >
                                                            <i className="ri-edit-2-line"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="inline-block w-16 h-16 bg-gray-200 rounded overflow-hidden">
                                                        <img src="../../assets/images/media/file-manager/1.png" alt="" className="object-cover w-full h-full" />
                                                    </span>
                                                </td>
                                                <td>{file.text3}</td>
                                                <td>{file.text4}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination */}
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
                        </>
                    ) : (
                        <div className="text-gray-400 text-center mt-10">Select a folder to view its contents.</div>
                    )}
                </div>
            </div>
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
                            <input type="text" className="form-control" id="create-folder1" placeholder="Folder Name" />
                        </div>
                        <div className="ti-modal-footer">
                            <button aria-label="button" type="button"
                                className="hs-dropdown-toggle ti-btn  ti-btn-light align-middle"
                                data-hs-overlay="#todo-compose">
                                <i className="ri-close-fill"></i>
                            </button>
                            <button type="button" className="ti-btn ti-btn-success-full text-white !font-medium">Create</button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="todo-compose2" className="hs-overlay hidden ti-modal">
                <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out min-h-[calc(100%-3.5rem)] flex items-center">
                    <div className="ti-modal-content w-full">
                        <div className="ti-modal-header">
                            <h6 className="modal-title text-[1rem] font-semibold">Create File</h6>
                            <button type="button" className="hs-dropdown-toggle !text-[1rem] !font-semibold !text-defaulttextcolor" data-hs-overlay="#todo-compose2">
                                <span className="sr-only">Close</span>
                                <i className="ri-close-line"></i>
                            </button>
                        </div>
                        <div className="ti-modal-body px-4">
                            <label htmlFor="create-folder1" className="form-label">Folder Name</label>
                            <input type="text" className="form-control" placeholder="Folder Name" />
                        </div>
                        <div className="ti-modal-footer">
                            <button aria-label="button" type="button"
                                className="hs-dropdown-toggle ti-btn  ti-btn-light align-middle"
                                data-hs-overlay="#todo-compose2">
                                <i className="ri-close-fill"></i>
                            </button>
                            <button type="button" className="ti-btn ti-btn-success-full text-white !font-medium">Create</button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Upload Modal Overlay */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-bodybg rounded-lg shadow-lg p-8 w-full max-w-lg relative animate-fade-in">
                        <button
                            className="absolute top-3 right-3 ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                            onClick={() => { setShowUploadModal(false); setUploadFiles([]); setUploadProgress({}); }}
                            aria-label="Close upload modal"
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
                                accept=".jpg,.jpeg,.png,.pdf,.mp4"
                                className="hidden"
                                onChange={e => handleFilesSelected(e.target.files)}
                            />
                            <i className="ri-upload-cloud-2-line text-4xl text-primary mb-2"></i>
                            <p className="text-defaulttextcolor font-medium">Drag & Drop files here or <span className="text-primary underline">browse</span></p>
                            <p className="text-xs text-gray-500 mt-1">Supported: JPG, PNG, PDF, MP4</p>
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
                                            aria-label="Remove file"
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
                                disabled={uploadFiles.length === 0 || Object.values(uploadProgress).some(p => p < 100)}
                                onClick={() => { setShowUploadModal(false); setUploadFiles([]); setUploadProgress({}); }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {renameModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-bodybg rounded-lg shadow-lg p-6 w-full max-w-sm relative animate-fade-in">
                        <button
                            className="absolute top-3 right-3 ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                            onClick={closeRenameModal}
                            aria-label="Close rename modal"
                        >
                            <i className="ri-close-line"></i>
                        </button>
                        <h2 className="text-lg font-semibold mb-4 text-defaulttextcolor">Rename File</h2>
                        <input
                            type="text"
                            className="form-control mb-4"
                            value={renameFileName}
                            onChange={e => setRenameFileName(e.target.value)}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button className="ti-btn ti-btn-light" onClick={closeRenameModal}>Cancel</button>
                            <button className="ti-btn ti-btn-primary" onClick={handleRenameSave} disabled={!renameFileName.trim()}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </Fragment>
    );
}

export default Filemanager