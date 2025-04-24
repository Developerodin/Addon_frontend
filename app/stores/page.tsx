"use client"
import React, { useState } from 'react'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'

const StoresPage = () => {
    const [selectedStores, setSelectedStores] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Sample data - replace with your actual data
    const stores = [
        { id: '1', name: 'Main Store', location: 'New York', manager: 'John Doe', status: 'Active', inventory: '2,345' },
        { id: '2', name: 'Downtown Branch', location: 'Los Angeles', manager: 'Jane Smith', status: 'Active', inventory: '1,892' },
        { id: '3', name: 'East Side Store', location: 'Chicago', manager: 'Mike Johnson', status: 'Active', inventory: '3,201' },
        { id: '4', name: 'West End Branch', location: 'Houston', manager: 'Sarah Wilson', status: 'Inactive', inventory: '945' },
        { id: '5', name: 'North Point', location: 'Phoenix', manager: 'Robert Brown', status: 'Active', inventory: '2,678' },
    ];

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedStores([]);
        } else {
            setSelectedStores(filteredStores.map(store => store.id));
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

    // Filter stores based on search query
    const filteredStores = stores.filter(store =>
        Object.values(store).some(value =>
            value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    // Calculate pagination
    const totalPages = Math.ceil(filteredStores.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentStores = filteredStores.slice(startIndex, endIndex);

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
                                <button type="button" className="ti-btn ti-btn-primary">
                                    <i className="ri-file-excel-2-line me-2"></i> Import
                                </button>
                                <button type="button" className="ti-btn ti-btn-primary">
                                    <i className="ri-download-2-line me-2"></i> Export
                                </button>
                                <Link href="/stores/add" className="ti-btn ti-btn-primary">
                                    <i className="ri-add-line me-2"></i> Add New Store
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Content Box */}
                    <div className="box">
                        <div className="box-body">
                            {/* Search Bar */}
                            <div className="mb-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="form-control py-3"
                                        placeholder="Search stores..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <button className="absolute end-0 top-0 px-4 h-full">
                                        <i className="ri-search-line text-lg"></i>
                                    </button>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table whitespace-nowrap table-bordered min-w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th scope="col" className="!text-start">
                                                <input 
                                                    type="checkbox" 
                                                    className="form-check-input" 
                                                    checked={selectAll}
                                                    onChange={handleSelectAll}
                                                />
                                            </th>
                                            <th scope="col" className="text-start">Store Name</th>
                                            <th scope="col" className="text-start">Location</th>
                                            <th scope="col" className="text-start">Manager</th>
                                            <th scope="col" className="text-start">Status</th>
                                            <th scope="col" className="text-start">Inventory Items</th>
                                            <th scope="col" className="text-start">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentStores.map((store, index) => (
                                            <tr 
                                                key={store.id}
                                                className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                                            >
                                                <td>
                                                    <input 
                                                        type="checkbox" 
                                                        className="form-check-input" 
                                                        checked={selectedStores.includes(store.id)}
                                                        onChange={() => handleStoreSelect(store.id)}
                                                    />
                                                </td>
                                                <td className="font-medium">{store.name}</td>
                                                <td>{store.location}</td>
                                                <td>{store.manager}</td>
                                                <td>
                                                    <span className={`badge ${store.status === 'Active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                                        {store.status}
                                                    </span>
                                                </td>
                                                <td>{store.inventory}</td>
                                                <td>
                                                    <div className="flex space-x-2">
                                                        <Link 
                                                            href={`/stores/edit/${store.id}`}
                                                            className="ti-btn ti-btn-primary ti-btn-sm"
                                                        >
                                                            <i className="ri-edit-line"></i>
                                                        </Link>
                                                        <button 
                                                            className="ti-btn ti-btn-danger ti-btn-sm"
                                                            onClick={() => {/* Add delete handler */}}
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

                            {/* Pagination */}
                            <div className="flex justify-between items-center mt-4">
                                <div className="text-sm text-gray-500">
                                    Showing {startIndex + 1} to {Math.min(endIndex, filteredStores.length)} of {filteredStores.length} entries
                                </div>
                                <nav aria-label="Page navigation" className="">
                                    <ul className="flex flex-wrap items-center">
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                            >
                                                Previous
                                            </button>
                                        </li>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <li key={page} className="page-item">
                                                <button
                                                    className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                                        currentPage === page 
                                                        ? 'bg-primary text-white hover:bg-primary-dark' 
                                                        : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                                    }`}
                                                    onClick={() => setCurrentPage(page)}
                                                >
                                                    {page}
                                                </button>
                                            </li>
                                        ))}
                                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                            <button
                                                className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                            >
                                                Next
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default StoresPage 