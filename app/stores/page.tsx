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
        <div className="main-content">
            <Seo title="Stores"/>
            
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                    {/* Page Header */}
                    <div className="box !bg-transparent border-0 shadow-none">
                        <div className="box-header flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <h1 className="box-title text-2xl font-semibold">Stores</h1>
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
                            <div className="box-tools flex items-center space-x-2">
                                {selectedStores.length > 0 && (
                                    <button 
                                        type="button" 
                                        className="ti-btn ti-btn-danger"
                                        onClick={handleBulkDelete}
                                    >
                                        <i className="ri-delete-bin-line me-2"></i> Delete Selected ({selectedStores.length})
                                    </button>
                                )}
                                <button 
                                    type="button" 
                                    className="ti-btn ti-btn-secondary"
                                    onClick={handleDownloadTemplate}
                                >
                                    <i className="ri-download-line me-2"></i> Download Template
                                </button>
                              
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleImport}
                                    disabled={isImporting}
                                />
                                <button 
                                    type="button" 
                                    className={`ti-btn ${isImporting ? 'ti-btn-secondary' : 'ti-btn-success'}`}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isImporting}
                                >
                                    <i className={`${isImporting ? 'ri-loader-4-line animate-spin' : 'ri-file-excel-2-line'} me-2`}></i>
                                    {isImporting ? 'Importing...' : 'Import'}
                                </button>
                                {importProgress && (
                                    <div className="flex items-center space-x-2 ml-2">
                                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="bg-primary h-full transition-all duration-200"
                                                style={{ 
                                                    width: `${importProgress.totalStores > 0 
                                                        ? (importProgress.processedStores / importProgress.totalStores) * 100 
                                                        : 0}%` 
                                                }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-gray-700 whitespace-nowrap">
                                            {importProgress.processedStores}/{importProgress.totalStores}
                                        </span>
                                        {importProgress.isComplete && (
                                            <span className="text-xs text-green-600">
                                                ✓ {importProgress.successCount} | ✗ {importProgress.errorCount}
                                            </span>
                                        )}
                                    </div>
                                )}
                                <button 
                                    type="button" 
                                    className="ti-btn ti-btn-primary"
                                    onClick={handleExport}
                                >
                                    <i className="ri-download-2-line me-2"></i> Export
                                </button>
                                <Link href="/stores/add" className="ti-btn ti-btn-primary">
                                    <i className="ri-add-line me-2"></i> Add New Store
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="box bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                            <div className="box-body p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-blue-100 text-sm font-medium">Total Stores</p>
                                        <p className="text-2xl font-bold text-white">{pagination.totalResults.toLocaleString()}</p>
                                    </div>
                                    <div className="text-blue-200">
                                        <i className="ri-store-2-line text-3xl"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="box bg-gradient-to-r from-green-500 to-green-600 text-white">
                            <div className="box-body p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-100 text-sm font-medium">Active Stores</p>
                                        <p className="text-2xl font-bold text-white">
                                            {stores.filter(store => store.isActive).length}
                                        </p>
                                    </div>
                                    <div className="text-green-200">
                                        <i className="ri-check-line text-3xl"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="box bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                            <div className="box-body p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-yellow-100 text-sm font-medium">Premium Rating</p>
                                        <p className="text-2xl font-bold text-white">
                                            {stores.filter(store => store.creditRating.startsWith('A')).length}
                                        </p>
                                    </div>
                                    <div className="text-yellow-200">
                                        <i className="ri-star-line text-3xl"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="box bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                            <div className="box-body p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-purple-100 text-sm font-medium">Cities</p>
                                        <p className="text-2xl font-bold text-white">
                                            {new Set(stores.map(store => store.city)).size}
                                        </p>
                                    </div>
                                    <div className="text-purple-200">
                                        <i className="ri-map-pin-line text-3xl"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Box */}
                    <div className="box">
                        <div className="box-body">
                            {/* Search and Filters Header */}
                            <div className="mb-6">
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                    {/* Filter Toggle and Actions */}
                                    <div className="flex items-center gap-3 flex-shrink-0 order-2 sm:order-1">
                                        <button
                                            type="button"
                                            className={`ti-btn ${showFilters ? 'ti-btn-primary' : 'ti-btn-secondary'}`}
                                            onClick={() => setShowFilters(!showFilters)}
                                        >
                                            <i className="ri-filter-3-line me-2"></i>
                                            Filters {hasActiveFilters && <span className="badge bg-white text-primary ml-1">●</span>}
                                        </button>
                                        
                                        {hasActiveFilters && (
                                            <button
                                                type="button"
                                                className="ti-btn ti-btn-light"
                                                onClick={clearFilters}
                                            >
                                                <i className="ri-close-line me-1"></i>
                                                Clear
                                            </button>
                                        )}
                                    </div>

                                    {/* Search Bar */}
                                    <div className="w-full sm:w-80 lg:w-96 order-1 sm:order-2">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="form-control py-3 pl-10 pr-4 w-full"
                                                placeholder="Search stores by name..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                            <i className="ri-search-line text-lg absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                        </div>
                                    </div>

                                    {/* Rows per page selector */}
                                    <div className="flex items-center gap-2 order-3">
                                        <label className="text-sm text-gray-600 whitespace-nowrap">Show:</label>
                                        <select
                                            className="form-select form-select-sm w-20"
                                            value={itemsPerPage}
                                            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                        >
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value={250}>250</option>
                                            <option value={500}>500</option>
                                            <option value={1000}>1000</option>
                                        </select>
                                        <span className="text-sm text-gray-600 whitespace-nowrap">per page</span>
                                    </div>
                                </div>

                                {/* Filters Panel */}
                                {showFilters && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {/* City Filter */}
                                            <div>
                                                <label className="form-label text-sm font-medium">City</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Filter by city..."
                                                    value={filters.city}
                                                    onChange={(e) => handleFilterChange('city', e.target.value)}
                                                />
                                            </div>

                                            {/* Credit Rating Filter */}
                                            <div>
                                                <label className="form-label text-sm font-medium">Credit Rating</label>
                                                <select
                                                    className="form-select"
                                                    value={filters.creditRating}
                                                    onChange={(e) => handleFilterChange('creditRating', e.target.value)}
                                                >
                                                    <option value="">All Ratings</option>
                                                    <option value="A+">A+</option>
                                                    <option value="A">A</option>
                                                    <option value="A-">A-</option>
                                                    <option value="B+">B+</option>
                                                    <option value="B">B</option>
                                                    <option value="B-">B-</option>
                                                    <option value="C+">C+</option>
                                                    <option value="C">C</option>
                                                    <option value="C-">C-</option>
                                                    <option value="D">D</option>
                                                    <option value="F">F</option>
                                                </select>
                                            </div>

                                            {/* Status Filter */}
                                            <div>
                                                <label className="form-label text-sm font-medium">Status</label>
                                                <select
                                                    className="form-select"
                                                    value={filters.isActive}
                                                    onChange={(e) => handleFilterChange('isActive', e.target.value)}
                                                >
                                                    <option value="">All Status</option>
                                                    <option value="true">Active</option>
                                                    <option value="false">Inactive</option>
                                                </select>
                                            </div>

                                            {/* Contact Person Filter */}
                                            <div>
                                                <label className="form-label text-sm font-medium">Contact Person</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Filter by contact..."
                                                    value={filters.contactPerson}
                                                    onChange={(e) => handleFilterChange('contactPerson', e.target.value)}
                                                />
                                            </div>

                                            {/* Brand Filter */}
                                            <div>
                                                <label className="form-label text-sm font-medium">Brand</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Filter by brand..."
                                                    value={filters.brand}
                                                    onChange={(e) => handleFilterChange('brand', e.target.value)}
                                                />
                                            </div>

                                            {/* BP Code Filter */}
                                            <div>
                                                <label className="form-label text-sm font-medium">BP Code</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Filter by BP code..."
                                                    value={filters.bpCode}
                                                    onChange={(e) => handleFilterChange('bpCode', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {loading ? (
                                <div className="flex justify-center items-center py-12">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                                        <p className="text-gray-600">Loading stores...</p>
                                    </div>
                                </div>
                            ) : stores.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <i className="ri-store-2-line text-6xl"></i>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found</h3>
                                    <p className="text-gray-500 mb-4">
                                        {hasActiveFilters 
                                            ? 'Try adjusting your filters or search terms' 
                                            : 'Get started by adding your first store'
                                        }
                                    </p>
                                    {!hasActiveFilters && (
                                        <Link href="/stores/add" className="ti-btn ti-btn-primary">
                                            <i className="ri-add-line me-2"></i>
                                            Add First Store
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table whitespace-nowrap min-w-full">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">
                                                    <input 
                                                        type="checkbox" 
                                                        className="form-check-input" 
                                                        checked={selectAll}
                                                        onChange={handleSelectAll}
                                                    />
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Store Info</th>
                                                <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Address</th>
                                                <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Contact</th>
                                                <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Business</th>
                                                <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Norms</th>
                                                <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Status</th>
                                                <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {stores.map((store, index) => (
                                                <tr 
                                                    key={store.id}
                                                    className="hover:bg-gray-50 transition-colors duration-150"
                                                >
                                                    <td className="px-4 py-4">
                                                        <input 
                                                            type="checkbox" 
                                                            className="form-check-input" 
                                                            checked={selectedStores.includes(store.id)}
                                                            onChange={() => handleStoreSelect(store.id)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <Link href={`/analytics/store-analysis/${store.id}`} className="text-primary hover:text-primary/80 transition-colors duration-200">
                                                        <div className="space-y-1">
                                                            <div className="font-medium text-gray-900">{store.storeName}</div>
                                                            <div className="text-sm text-gray-500">
                                                                <span className="font-mono">{store.storeId}</span>
                                                                {store.storeNumber && (
                                                                    <span className="ml-2">• {store.storeNumber}</span>
                                                                )}
                                                            </div>
                                                            {store.bpCode && (
                                                                <div className="text-xs text-gray-400">
                                                                    BP: {store.bpCode}
                                                                    {store.bpName && ` (${store.bpName})`}
                                                                </div>
                                                            )}
                                                            {store.oldStoreCode && (
                                                                <div className="text-xs text-gray-400">
                                                                    Old: {store.oldStoreCode}
                                                                </div>
                                                            )}
                                                        </div>
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center">
                                                                <i className="ri-map-pin-line text-gray-400 me-2"></i>
                                                                <span className="text-gray-900">{store.city}</span>
                                                            </div>
                                                            {store.addressLine1 && (
                                                                <div className="text-sm text-gray-600 truncate max-w-48">
                                                                    {store.addressLine1}
                                                                </div>
                                                            )}
                                                            {store.street && (
                                                                <div className="text-xs text-gray-500">
                                                                    {store.street}
                                                                    {store.block && `, ${store.block}`}
                                                                </div>
                                                            )}
                                                            <div className="text-xs text-gray-500">
                                                                {store.state && `${store.state}, `}
                                                                {store.country && `${store.country}`}
                                                                {store.pincode && ` • ${store.pincode}`}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1">
                                                            <div className="font-medium text-gray-900">{store.contactPerson}</div>
                                                            <div className="text-sm text-gray-600">{store.contactEmail}</div>
                                                            <div className="text-sm text-gray-600">{store.contactPhone}</div>
                                                            {store.telephone && (
                                                                <div className="text-xs text-gray-500">
                                                                    Tel: {store.telephone}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1">
                                                            {store.brand && (
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {store.brand}
                                                                </div>
                                                            )}
                                                            {store.brandGrouping && (
                                                                <div className="text-xs text-gray-600">
                                                                    {store.brandGrouping}
                                                                </div>
                                                            )}
                                                            {store.internalSapCode && (
                                                                <div className="text-xs text-gray-500">
                                                                    SAP: {store.internalSapCode}
                                                                </div>
                                                            )}
                                                            {store.internalSoftwareCode && (
                                                                <div className="text-xs text-gray-500">
                                                                    SW: {store.internalSoftwareCode}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1">
                                                            {store.hankyNorms > 0 && (
                                                                <div className="text-xs text-gray-600">
                                                                    Hanky: {store.hankyNorms}
                                                                </div>
                                                            )}
                                                            {store.socksNorms > 0 && (
                                                                <div className="text-xs text-gray-600">
                                                                    Socks: {store.socksNorms}
                                                                </div>
                                                            )}
                                                            {store.towelNorms > 0 && (
                                                                <div className="text-xs text-gray-600">
                                                                    Towel: {store.towelNorms}
                                                                </div>
                                                            )}
                                                            {store.totalNorms > 0 && (
                                                                <div className="text-xs font-medium text-gray-900">
                                                                    Total: {store.totalNorms}
                                                                </div>
                                                            )}
                                                            {(store.hankyNorms === 0 && store.socksNorms === 0 && store.towelNorms === 0) && (
                                                                <div className="text-xs text-gray-400">No norms set</div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-2">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                store.creditRating.startsWith('A') ? 'bg-green-100 text-green-800' :
                                                                store.creditRating.startsWith('B') ? 'bg-yellow-100 text-yellow-800' :
                                                                store.creditRating.startsWith('C') ? 'bg-blue-100 text-blue-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                {store.creditRating}
                                                            </span>
                                                            <div>
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    store.isActive 
                                                                        ? 'bg-green-100 text-green-800' 
                                                                        : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                    <span className={`w-2 h-2 rounded-full mr-2 ${
                                                                        store.isActive ? 'bg-green-400' : 'bg-red-400'
                                                                    }`}></span>
                                                                    {store.isActive ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center space-x-2">
                                                            <Link 
                                                                href={`/stores/edit/${store.id}`}
                                                                className="ti-btn ti-btn-primary ti-btn-sm"
                                                                title="Edit Store"
                                                            >
                                                                <i className="ri-edit-line"></i>
                                                            </Link>
                                                            <button 
                                                                className="ti-btn ti-btn-danger ti-btn-sm"
                                                                onClick={() => handleDeleteStore(store.id)}
                                                                title="Delete Store"
                                                            >
                                                                <i className="ri-delete-bin-line"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination */}
                            {!loading && stores.length > 0 && (
                                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-6 border-t border-gray-200">
                                    <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                                        <span className="font-medium">
                                            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalResults)} 
                                        </span>
                                        <span className="text-gray-500"> of {pagination.totalResults.toLocaleString()} stores</span>
                                    </div>
                                    
                                    <nav aria-label="Page navigation" className="flex items-center space-x-1">
                                        <button
                                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                                                pagination.hasPrevPage
                                                    ? 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                                                    : 'text-gray-300 bg-gray-100 border border-gray-200 cursor-not-allowed'
                                            }`}
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            disabled={!pagination.hasPrevPage}
                                        >
                                            <i className="ri-arrow-left-s-line"></i>
                                        </button>
                                        
                                        {/* Page Numbers */}
                                        {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                                            let pageNum;
                                            if (pagination.totalPages <= 7) {
                                                pageNum = i + 1;
                                            } else if (pagination.page <= 4) {
                                                pageNum = i + 1;
                                            } else if (pagination.page >= pagination.totalPages - 3) {
                                                pageNum = pagination.totalPages - 6 + i;
                                            } else {
                                                pageNum = pagination.page - 3 + i;
                                            }
                                            
                                            return (
                                                <button
                                                    key={pageNum}
                                                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                                                        pagination.page === pageNum
                                                            ? 'bg-primary text-white border border-primary'
                                                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                                                    }`}
                                                    onClick={() => handlePageChange(pageNum)}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                        
                                        <button
                                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                                                pagination.hasNextPage
                                                    ? 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                                                    : 'text-gray-300 bg-gray-100 border border-gray-200 cursor-not-allowed'
                                            }`}
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            disabled={!pagination.hasNextPage}
                                        >
                                            <i className="ri-arrow-right-s-line"></i>
                                        </button>
                                    </nav>
                                </div>
                            )}
                        </div>
                    </div>
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