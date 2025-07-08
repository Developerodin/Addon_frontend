"use client"
import React, { useState, useEffect, useRef } from 'react'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import { useStores } from '@/shared/hooks/useStores'
import { toast } from 'react-hot-toast'
import { exportStoresToExcel, generateSampleTemplate } from '@/shared/utils/storeUtils'

const StoresPage = () => {
    const [selectedStores, setSelectedStores] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        city: '',
        creditRating: '',
        isActive: '',
        contactPerson: '',
        brand: '',
        bpCode: ''
    });
    const [importProgress, setImportProgress] = useState<number | null>(null);
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
                            <h1 className="box-title text-2xl font-semibold">Stores</h1>
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
                                    accept=".xlsx,.xls"
                                    // onChange={handleImport}
                                />
                                <button 
                                    type="button" 
                                    className="ti-btn ti-btn-success"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <i className="ri-file-excel-2-line me-2"></i> Import
                                </button>
                                {importProgress !== null && (
                                    <div className="w-40 h-3 bg-gray-200 rounded-full overflow-hidden flex items-center ml-2">
                                        <div
                                            className="bg-primary h-full transition-all duration-200"
                                            style={{ width: `${importProgress}%` }}
                                        ></div>
                                        <span className="ml-2 text-xs text-gray-700">{importProgress}%</span>
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
        </div>
    )
}

export default StoresPage 