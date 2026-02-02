"use client"
import React, { useState, useEffect, useRef } from 'react'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import { useStores } from '@/shared/hooks/useStores'
import { toast } from 'react-hot-toast'
import { exportStoresToExcel, generateSampleTemplate, processBulkImport, validateFileForImport, testExcelParsing, ImportProgress } from '@/shared/utils/storeUtils'
import HelpIcon from '@/shared/components/HelpIcon'

const StoresPage = () => {
    const [selectedStores, setSelectedStores] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        city: '',
        creditRating: '',
        isActive: '',
        contactPerson: '',
        brand: '',
        bpCode: ''
    });
    const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Use the stores hook
    const { 
        stores, 
        loading, 
        error, 
        pagination, 
        fetchStores, 
        deleteStore,
        clearError 
    } = useStores();

    // Fetch stores on component mount and when filters change
    useEffect(() => {
        const apiFilters = {
            page: currentPage,
            limit: itemsPerPage,
            ...(searchQuery && { storeName: searchQuery }),
            ...(filters.city && { city: filters.city }),
            ...(filters.creditRating && { creditRating: filters.creditRating }),
            ...(filters.isActive && { isActive: filters.isActive === 'true' }),
            ...(filters.contactPerson && { contactPerson: filters.contactPerson }),
            ...(filters.brand && { brand: filters.brand }),
            ...(filters.bpCode && { bpCode: filters.bpCode })
        };
        fetchStores(apiFilters);
    }, [currentPage, itemsPerPage, searchQuery, filters, fetchStores]);

    // Handle error display
    useEffect(() => {
        if (error) {
            toast.error(error);
            clearError();
        }
    }, [error, clearError]);

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedStores([]);
        } else {
            setSelectedStores(stores.map(store => store.id));
        }
        setSelectAll(!selectAll);
    };

    const handleStoreSelect = (storeId: string) => {
        if (selectedStores.includes(storeId)) {
            setSelectedStores(selectedStores.filter(id => id !== storeId));
        } else {
            setSelectedStores([...selectedStores, storeId]);
        }
    };

    const handleDeleteStore = async (storeId: string) => {
        if (window.confirm('Are you sure you want to delete this store?')) {
            try {
                await deleteStore(storeId);
                toast.success('Store deleted successfully');
            } catch (error) {
                toast.error('Failed to delete store');
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedStores.length === 0) {
            toast.error('Please select stores to delete');
            return;
        }

        if (window.confirm(`Are you sure you want to delete ${selectedStores.length} stores?`)) {
            try {
                await Promise.all(selectedStores.map(storeId => deleteStore(storeId)));
                setSelectedStores([]);
                setSelectAll(false);
                toast.success(`${selectedStores.length} stores deleted successfully`);
            } catch (error) {
                toast.error('Failed to delete some stores');
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        setSelectedStores([]);
        setSelectAll(false);
    };

    const handleItemsPerPageChange = (newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1); // Reset to first page when changing items per page
        setSelectedStores([]);
        setSelectAll(false);
    };

    const handleExport = () => {
        try {
            exportStoresToExcel(stores);
            toast.success('Stores exported successfully');
        } catch (error) {
            toast.error('Failed to export stores');
        }
    };

    const handleDownloadTemplate = () => {
        try {
            generateSampleTemplate();
            toast.success('Template downloaded successfully');
        } catch (error) {
            toast.error('Failed to download template');
        }
    };

    const handleTestFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset file input
        event.target.value = '';

        try {
            const result = await testExcelParsing(file);
            if (result.success) {
                toast.success(result.message);
                console.log('Test result:', result.data);
            } else {
                toast.error(result.message);
                console.error('Test failed:', result);
            }
        } catch (error) {
            toast.error('Test failed due to an unexpected error');
            console.error('Test error:', error);
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset file input
        event.target.value = '';

        // Validate file before processing
        const validation = validateFileForImport(file);
        if (!validation.isValid) {
            toast.error(validation.error || 'Invalid file');
            return;
        }

        setIsImporting(true);
        setImportProgress({
            currentBatch: 0,
            totalBatches: 0,
            processedStores: 0,
            totalStores: 0,
            successCount: 0,
            errorCount: 0,
            errors: [],
            isComplete: false
        });

        try {
            const result = await processBulkImport(
                file,
                (progress) => setImportProgress(progress),
                25, // batch size
                100 // max batch size
            );

            if (result.success) {
                toast.success(result.message);
                // Refresh the stores list
                fetchStores({
                    page: currentPage,
                    limit: itemsPerPage,
                    ...(searchQuery && { storeName: searchQuery }),
                    ...(filters.city && { city: filters.city }),
                    ...(filters.creditRating && { creditRating: filters.creditRating }),
                    ...(filters.isActive && { isActive: filters.isActive === 'true' }),
                    ...(filters.contactPerson && { contactPerson: filters.contactPerson }),
                    ...(filters.brand && { brand: filters.brand }),
                    ...(filters.bpCode && { bpCode: filters.bpCode })
                });
            } else {
                toast.error(result.message);
                if (result.errors.length > 0) {
                    console.error('Import errors:', result.errors);
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            toast.error(`Import failed: ${errorMessage}`);
            console.error('Import error:', error);
        } finally {
            setIsImporting(false);
            // Keep progress visible for a few seconds to show final results
            setTimeout(() => setImportProgress(null), 5000);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page when filters change
        setSelectedStores([]);
        setSelectAll(false);
    };

    const clearFilters = () => {
        setFilters({
            city: '',
            creditRating: '',
            isActive: '',
            contactPerson: '',
            brand: '',
            bpCode: ''
        });
        setSearchQuery('');
        setCurrentPage(1);
        setSelectedStores([]);
        setSelectAll(false);
    };

    const hasActiveFilters = searchQuery || Object.values(filters).some(value => value !== '');

    return (
        <div className="main-content !p-[10px]">
            <Seo title="Stores"/>

            <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
                <div className="p-[10px]">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
                            <h1 className="text-sm font-bold text-gray-800">Stores</h1>
                            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                {pagination.totalResults}
                            </span>
                            <HelpIcon
                                    title="Stores Management"
                                    content={
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                                                <p className="text-gray-700">
                                                    This is the Stores Management page where you can view, manage, and organize all your retail stores, their locations, contact information, and operational status.
                                                </p>
                                            </div>
                                            
                                            <div>
                                                <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                    <li><strong>View Stores:</strong> Browse all stores with pagination and search functionality</li>
                                                    <li><strong>Add New Store:</strong> Click "Add New Store" to create a new store entry</li>
                                                    <li><strong>Edit Stores:</strong> Click the edit icon next to any store to modify its details</li>
                                                    <li><strong>Delete Stores:</strong> Remove individual stores or bulk delete selected ones</li>
                                                    <li><strong>Search & Filter:</strong> Use the search bar and filters to find specific stores</li>
                                                    <li><strong>Export Data:</strong> Export all stores or selected stores to Excel format</li>
                                                    <li><strong>Import Data:</strong> Import stores from Excel files using templates</li>
                                                    <li><strong>Bulk Operations:</strong> Select multiple stores for bulk export or deletion</li>
                                                </ul>
                                            </div>
                                            
                                            <div>
                                                <h4 className="font-semibold text-lg mb-2">Statistics Overview:</h4>
                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                    <li><strong>Total Stores:</strong> Complete count of all stores in the system</li>
                                                    <li><strong>Active Stores:</strong> Number of currently operational stores</li>
                                                    <li><strong>Premium Stores:</strong> Stores with high credit ratings (A-grade)</li>
                                                    <li><strong>Unique Cities:</strong> Number of different cities where stores are located</li>
                                                </ul>
                                            </div>
                                            
                                            <div>
                                                <h4 className="font-semibold text-lg mb-2">Filter Options:</h4>
                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                    <li><strong>City:</strong> Filter stores by specific city</li>
                                                    <li><strong>Credit Rating:</strong> Filter by store credit rating</li>
                                                    <li><strong>Active Status:</strong> Filter by active/inactive status</li>
                                                    <li><strong>Contact Person:</strong> Search by contact person name</li>
                                                    <li><strong>Brand:</strong> Filter by store brand</li>
                                                    <li><strong>BP Code:</strong> Filter by business partner code</li>
                                                </ul>
                                            </div>
                                            
                                            <div>
                                                <h4 className="font-semibold text-lg mb-2">Tips:</h4>
                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                    <li>Use the search bar to quickly find stores by name</li>
                                                    <li>Download the template before importing to ensure correct data format</li>
                                                    <li>Use filters to narrow down your store list</li>
                                                    <li>Check the statistics cards for quick insights</li>
                                                </ul>
                                            </div>
                                        </div>
                                    }
                                />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {selectedStores.length > 0 && (
                                <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-[11px] font-bold rounded hover:bg-red-700 transition-colors" onClick={handleBulkDelete}>
                                    <i className="ri-delete-bin-line"></i> Delete ({selectedStores.length})
                                </button>
                            )}
                            <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors" onClick={handleDownloadTemplate}>
                                <i className="ri-download-line"></i> Template
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImport} disabled={isImporting} />
                            <button type="button" className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded transition-colors disabled:opacity-50 ${isImporting ? 'border border-gray-200 bg-gray-100' : 'bg-green-600 text-white hover:bg-green-700'}`} onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                                {isImporting ? (<><div className="animate-spin h-3.5 w-3.5 border-2 border-gray-400 border-t-transparent rounded-full"></div> Importing</>) : (<><i className="ri-file-excel-2-line"></i> Import</>)}
                            </button>
                            {importProgress && importProgress.totalStores > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="bg-purple-600 h-full transition-all duration-200" style={{ width: `${(importProgress.processedStores / importProgress.totalStores) * 100}%` }}></div>
                                    </div>
                                    <span className="text-[10px] text-gray-600">{importProgress.processedStores}/{importProgress.totalStores}</span>
                                </div>
                            )}
                            <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors" onClick={handleExport}>
                                <i className="ri-download-2-line"></i> Export
                            </button>
                            <Link href="/stores/add" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                                <i className="ri-add-line"></i> Add
                            </Link>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <button type="button" className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${showFilters ? 'bg-purple-100 text-purple-800 border-purple-200' : 'border-gray-200 hover:bg-gray-50'}`} onClick={() => setShowFilters(!showFilters)}>
                                <i className="ri-filter-3-line"></i> Filters {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>}
                            </button>
                            {hasActiveFilters && (
                                <button type="button" className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors" onClick={clearFilters}>
                                    <i className="ri-close-line"></i> Clear
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <input type="text" className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 font-medium" placeholder="Search stores..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            </div>
                            <label className="text-[11px] font-medium text-gray-600">Rows:</label>
                            <select className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 w-16" value={itemsPerPage} onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}>
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={250}>250</option>
                                <option value={500}>500</option>
                                <option value={1000}>1000</option>
                            </select>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                                <input type="text" className="bg-white border border-gray-200 px-2 py-1.5 text-[11px] rounded focus:ring-0 w-full" placeholder="City" value={filters.city} onChange={(e) => handleFilterChange('city', e.target.value)} />
                                <select className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5 w-full" value={filters.creditRating} onChange={(e) => handleFilterChange('creditRating', e.target.value)}>
                                    <option value="">Rating</option>
                                    <option value="A+">A+</option>
                                    <option value="A">A</option>
                                    <option value="B+">B+</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                    <option value="F">F</option>
                                </select>
                                <select className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5 w-full" value={filters.isActive} onChange={(e) => handleFilterChange('isActive', e.target.value)}>
                                    <option value="">Status</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                                <input type="text" className="bg-white border border-gray-200 px-2 py-1.5 text-[11px] rounded focus:ring-0 w-full" placeholder="Contact" value={filters.contactPerson} onChange={(e) => handleFilterChange('contactPerson', e.target.value)} />
                                <input type="text" className="bg-white border border-gray-200 px-2 py-1.5 text-[11px] rounded focus:ring-0 w-full" placeholder="Brand" value={filters.brand} onChange={(e) => handleFilterChange('brand', e.target.value)} />
                                <input type="text" className="bg-white border border-gray-200 px-2 py-1.5 text-[11px] rounded focus:ring-0 w-full" placeholder="BP Code" value={filters.bpCode} onChange={(e) => handleFilterChange('bpCode', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-16 min-h-[300px]">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50"></div>
                        </div>
                    ) : stores.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center min-h-[300px]">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <i className="ri-store-2-line text-2xl text-gray-200"></i>
                            </div>
                            <h3 className="text-xs font-bold text-gray-400 mb-2">No stores</h3>
                            <p className="text-[11px] text-gray-500 mb-4">{hasActiveFilters ? 'Try adjusting filters or search.' : 'Add your first store.'}</p>
                            {!hasActiveFilters && (
                                <Link href="/stores/add" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
                                    <i className="ri-add-line"></i> Add First
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                        <div className="overflow-x-auto min-h-[300px]">
                            <table className="w-full border-collapse border border-gray-200">
                                <thead>
                                    <tr className="bg-gray-50/30">
                                        <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                                            <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectAll} onChange={handleSelectAll} />
                                        </th>
                                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Store Info</th>
                                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Address</th>
                                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Contact</th>
                                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Business</th>
                                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Norms</th>
                                        <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                                        <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stores.map((store) => (
                                        <tr key={store.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                                                <input type="checkbox" className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" checked={selectedStores.includes(store.id)} onChange={() => handleStoreSelect(store.id)} />
                                            </td>
                                            <td className="px-1.5 py-2.5 border border-gray-200">
                                                <Link href={`/analytics/store-analysis/${store.id}`} className="text-[12px] font-medium text-purple-600 hover:text-purple-800">
                                                    <div>{store.storeName}</div>
                                                    <div className="text-[10px] text-gray-500 font-mono">{store.storeId}{store.storeNumber ? ` • ${store.storeNumber}` : ''}</div>
                                                    {store.bpCode && <div className="text-[10px] text-gray-400">BP: {store.bpCode}</div>}
                                                </Link>
                                            </td>
                                            <td className="px-1.5 py-2.5 text-[12px] text-gray-800 border border-gray-200">
                                                <div>{store.city}</div>
                                                {store.addressLine1 && <div className="text-[10px] text-gray-500 truncate max-w-[180px]">{store.addressLine1}</div>}
                                                <div className="text-[10px] text-gray-500">{[store.state, store.country].filter(Boolean).join(', ')}{store.pincode ? ` • ${store.pincode}` : ''}</div>
                                            </td>
                                            <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                                                <div className="font-medium text-gray-800">{store.contactPerson}</div>
                                                <div className="text-[10px] text-gray-600">{store.contactEmail}</div>
                                                <div className="text-[10px] text-gray-600">{store.contactPhone}</div>
                                            </td>
                                            <td className="px-1.5 py-2.5 text-[12px] text-gray-800 border border-gray-200">
                                                {store.brand && <div>{store.brand}</div>}
                                                {store.brandGrouping && <div className="text-[10px] text-gray-500">{store.brandGrouping}</div>}
                                                {store.internalSapCode && <div className="text-[10px] text-gray-500">SAP: {store.internalSapCode}</div>}
                                            </td>
                                            <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                                                {store.totalNorms > 0 ? <span className="font-medium">{store.totalNorms}</span> : (store.hankyNorms || store.socksNorms || store.towelNorms) ? (
                                                    <span className="text-[10px]">H:{store.hankyNorms} S:{store.socksNorms} T:{store.towelNorms}</span>
                                                ) : <span className="text-[10px] text-gray-400">-</span>}
                                            </td>
                                            <td className="px-1.5 py-2.5 border border-gray-200">
                                                <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase mr-1 ${store.creditRating.startsWith('A') ? 'bg-green-100 text-green-700' : store.creditRating.startsWith('B') ? 'bg-amber-100 text-amber-700' : store.creditRating.startsWith('C') ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{store.creditRating}</span>
                                                <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${store.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{store.isActive ? 'Active' : 'Inactive'}</span>
                                            </td>
                                            <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={`/stores/edit/${store.id}`} className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded hover:bg-blue-100 transition-colors" title="Edit"><i className="ri-edit-line text-sm"></i></Link>
                                                    <button type="button" className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100 transition-colors" onClick={() => handleDeleteStore(store.id)} title="Delete"><i className="ri-delete-bin-line text-sm"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {!loading && stores.length > 0 && (
                            <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
                                <div className="text-[11px] font-medium text-[#495057] tracking-tight">
                                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalResults)} of {pagination.totalResults}
                                </div>
                                <nav className="flex items-center gap-1">
                                    <button type="button" className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" onClick={() => handlePageChange(pagination.page - 1)} disabled={!pagination.hasPrevPage}>Previous</button>
                                    {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                                        const pageNum = pagination.totalPages <= 7 ? i + 1 : pagination.page <= 4 ? i + 1 : pagination.page >= pagination.totalPages - 3 ? pagination.totalPages - 6 + i : pagination.page - 3 + i;
                                        return (
                                            <button key={pageNum} type="button" className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${pagination.page === pageNum ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`} onClick={() => handlePageChange(pageNum)}>{pageNum}</button>
                                        );
                                    })}
                                    <button type="button" className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" onClick={() => handlePageChange(pagination.page + 1)} disabled={!pagination.hasNextPage}>Next</button>
                                </nav>
                            </div>
                        )}
                        </>
                    )}
                </div>
            </div>

            {/* Import Progress Modal */}
            {importProgress && importProgress.totalStores > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">
                                {importProgress.isComplete ? 'Import Complete' : 'Importing Stores...'}
                            </h3>
                            {importProgress.isComplete && (
                                <button
                                    onClick={() => setImportProgress(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <i className="ri-close-line text-xl"></i>
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Progress Bar */}
                            <div>
                                <div className="flex justify-between text-sm text-gray-600 mb-2">
                                    <span>Progress</span>
                                    <span>{Math.round((importProgress.processedStores / importProgress.totalStores) * 100)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-primary h-3 rounded-full transition-all duration-300"
                                        style={{
                                            width: `${(importProgress.processedStores / importProgress.totalStores) * 100}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Processed:</span>
                                    <span className="ml-2 font-medium">{importProgress.processedStores}/{importProgress.totalStores}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Batch:</span>
                                    <span className="ml-2 font-medium">{importProgress.currentBatch}/{importProgress.totalBatches}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Success:</span>
                                    <span className="ml-2 font-medium text-green-600">{importProgress.successCount}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Errors:</span>
                                    <span className="ml-2 font-medium text-red-600">{importProgress.errorCount}</span>
                                </div>
                            </div>

                            {/* Errors */}
                            {importProgress.errors.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-red-600 mb-2">Errors ({importProgress.errors.length})</h4>
                                    <div className="max-h-32 overflow-y-auto text-xs text-red-600 bg-red-50 p-2 rounded">
                                        {importProgress.errors.slice(0, 5).map((error, index) => (
                                            <div key={index} className="mb-1">• {error}</div>
                                        ))}
                                        {importProgress.errors.length > 5 && (
                                            <div className="text-gray-500">
                                                ... and {importProgress.errors.length - 5} more errors
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Status */}
                            {!importProgress.isComplete && (
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                                    <p className="text-sm text-gray-600">Processing batch {importProgress.currentBatch} of {importProgress.totalBatches}</p>
                                </div>
                            )}

                            {/* Complete Status */}
                            {importProgress.isComplete && (
                                <div className="text-center">
                                    <div className={`text-2xl mb-2 ${importProgress.errorCount === 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                                        {importProgress.errorCount === 0 ? '✓' : '⚠'}
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        {importProgress.errorCount === 0 
                                            ? 'All stores imported successfully!'
                                            : `Import completed with ${importProgress.errorCount} errors`
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default StoresPage 