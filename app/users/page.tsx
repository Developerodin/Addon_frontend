"use client"
import React, { useState, useEffect, useRef } from 'react'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import { useUsers } from '@/shared/hooks/useUsers';
import { User } from '@/shared/services/userService';
import HelpIcon from '@/shared/components/HelpIcon';
import { toast } from 'react-hot-toast';

const UsersPage = () => {
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        role: '',
        gender: '',
        country: '',
        isActive: ''
    });

    // Use the users hook
    const { 
        users, 
        loading, 
        error, 
        pagination, 
        loadUsers,
        deleteUser,
        clearError,
        formatDate,
        getRoleColor,
        getGenderIcon
    } = useUsers();


    // Fetch users on component mount and when filters change
    useEffect(() => {
        const apiFilters = {
            page: currentPage,
            limit: itemsPerPage,
            ...(searchQuery && { search: searchQuery }),
            ...(filters.role && { role: filters.role }),
            ...(filters.gender && { gender: filters.gender }),
            ...(filters.country && { country: filters.country }),
            ...(filters.isActive && { isActive: filters.isActive === 'true' })
        };
        loadUsers(apiFilters);
    }, [currentPage, itemsPerPage, searchQuery, filters, loadUsers]);

    // Handle error display
    useEffect(() => {
        if (error) {
            toast.error(error);
            clearError();
        }
    }, [error, clearError]);

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(users.map(user => user.id));
        }
        setSelectAll(!selectAll);
    };

    const handleUserSelect = (userId: string) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await deleteUser(userId);
                toast.success('User deleted successfully');
            } catch (error) {
                toast.error('Failed to delete user');
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUsers.length === 0) {
            toast.error('Please select users to delete');
            return;
        }

        if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) {
            try {
                await Promise.all(selectedUsers.map(userId => deleteUser(userId)));
                setSelectedUsers([]);
                setSelectAll(false);
                toast.success(`${selectedUsers.length} users deleted successfully`);
            } catch (error) {
                toast.error('Failed to delete some users');
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        setSelectedUsers([]);
        setSelectAll(false);
    };

    const handleItemsPerPageChange = (newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1); // Reset to first page when changing items per page
        setSelectedUsers([]);
        setSelectAll(false);
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page when filters change
        setSelectedUsers([]);
        setSelectAll(false);
    };

    const clearFilters = () => {
        setFilters({
            role: '',
            gender: '',
            country: '',
            isActive: ''
        });
        setSearchQuery('');
        setCurrentPage(1);
        setSelectedUsers([]);
        setSelectAll(false);
    };

    const hasActiveFilters = searchQuery || Object.values(filters).some(value => value !== '');




    return (
        <div className="main-content">
            <Seo title="Users"/>
            
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                    {/* Page Header */}
                    <div className="box !bg-transparent border-0 shadow-none">
                        <div className="box-header flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <h1 className="box-title text-2xl font-semibold">Users</h1>
                                <HelpIcon
                                    title="Users Management"
                                    content={
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                                                <p className="text-gray-700">
                                                    This is the Users Management page where you can view, manage, and organize all system users, their roles, permissions, and access levels.
                                                </p>
                                            </div>
                                            
                                            <div>
                                                <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                    <li><strong>View Users:</strong> Browse all users with pagination and search functionality</li>
                                                    <li><strong>Add New User:</strong> Click "Add New User" to create a new user account</li>
                                                    <li><strong>Edit Users:</strong> Click the edit icon next to any user to modify their details</li>
                                                    <li><strong>Delete Users:</strong> Remove individual users or bulk delete selected ones</li>
                                                    <li><strong>Manage Permissions:</strong> Control what sections each user can access</li>
                                                    <li><strong>Search & Filter:</strong> Use the search bar and filters to find specific users</li>
                                                    <li><strong>Bulk Operations:</strong> Select multiple users for bulk operations</li>
                                                </ul>
                                            </div>
                                            
                                            <div>
                                                <h4 className="font-semibold text-lg mb-2">User Roles:</h4>
                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                    <li><strong>Super Admin:</strong> Full system access with all permissions</li>
                                                    <li><strong>Admin:</strong> Administrative access to most features</li>
                                                    <li><strong>User:</strong> Standard user access with limited permissions</li>
                                                </ul>
                                            </div>
                                            
                                            <div>
                                                <h4 className="font-semibold text-lg mb-2">Filter Options:</h4>
                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                    <li><strong>Role:</strong> Filter users by their assigned role</li>
                                                    <li><strong>Gender:</strong> Filter by user gender</li>
                                                    <li><strong>Country:</strong> Filter by user country</li>
                                                    <li><strong>Status:</strong> Filter by active/inactive status</li>
                                                </ul>
                                            </div>
                                            
                                            <div>
                                                <h4 className="font-semibold text-lg mb-2">Tips:</h4>
                                                <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                    <li>Use the search bar to quickly find users by name or email</li>
                                                    <li>Use filters to narrow down your user list</li>
                                                    <li>Check the statistics cards for quick insights</li>
                                                    <li>Manage navigation permissions for fine-grained access control</li>
                                                </ul>
                                            </div>
                                        </div>
                                    }
                                />
                            </div>
                            <div className="box-tools flex items-center space-x-2">
                                {selectedUsers.length > 0 && (
                                    <button 
                                        type="button" 
                                        className="ti-btn ti-btn-danger"
                                        onClick={handleBulkDelete}
                                    >
                                        <i className="ri-delete-bin-line me-2"></i> Delete Selected ({selectedUsers.length})
                                    </button>
                                )}
                                <Link 
                                    href="/users/add" 
                                    className="ti-btn ti-btn-primary"
                                >
                                    <i className="ri-add-line me-2"></i> Add New User
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
                                        <p className="text-blue-100 text-sm font-medium">Total Users</p>
                                        <p className="text-2xl font-bold text-white">{pagination?.totalResults.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="text-blue-200">
                                        <i className="ri-user-line text-3xl"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="box bg-gradient-to-r from-green-500 to-green-600 text-white">
                            <div className="box-body p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-100 text-sm font-medium">Admins</p>
                                        <p className="text-2xl font-bold text-white">
                                            {users.filter(user => user.role === 'admin' || user.role === 'super_admin').length}
                                        </p>
                                    </div>
                                    <div className="text-green-200">
                                        <i className="ri-admin-line text-3xl"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="box bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                            <div className="box-body p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-yellow-100 text-sm font-medium">Regular Users</p>
                                        <p className="text-2xl font-bold text-white">
                                            {users.filter(user => user.role === 'user').length}
                                        </p>
                                    </div>
                                    <div className="text-yellow-200">
                                        <i className="ri-user-3-line text-3xl"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="box bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                            <div className="box-body p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-purple-100 text-sm font-medium">Countries</p>
                                        <p className="text-2xl font-bold text-white">
                                            {new Set(users.map(user => user.country).filter(Boolean)).size}
                                        </p>
                                    </div>
                                    <div className="text-purple-200">
                                        <i className="ri-global-line text-3xl"></i>
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
                                                placeholder="Search users by name or email..."
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* Role Filter */}
                                            <div>
                                                <label className="form-label text-sm font-medium">Role</label>
                                                <select
                                                    className="form-select"
                                                    value={filters.role}
                                                    onChange={(e) => handleFilterChange('role', e.target.value)}
                                                >
                                                    <option value="">All Roles</option>
                                                    <option value="super_admin">Super Admin</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="user">User</option>
                                                </select>
                                            </div>

                                            {/* Gender Filter */}
                                            <div>
                                                <label className="form-label text-sm font-medium">Gender</label>
                                                <select
                                                    className="form-select"
                                                    value={filters.gender}
                                                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                                                >
                                                    <option value="">All Genders</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>

                                            {/* Country Filter */}
                                            <div>
                                                <label className="form-label text-sm font-medium">Country</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Filter by country..."
                                                    value={filters.country}
                                                    onChange={(e) => handleFilterChange('country', e.target.value)}
                                                />
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
                                        </div>
                                    </div>
                                )}
                            </div>

                            {loading ? (
                                <div className="flex justify-center items-center py-12">
                                    <div className="text-center">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                                        <p className="text-gray-600">Loading users...</p>
                                    </div>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-gray-400 mb-4">
                                        <i className="ri-user-line text-6xl"></i>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                                    <p className="text-gray-500 mb-4">
                                        {hasActiveFilters 
                                            ? 'Try adjusting your filters or search terms' 
                                            : 'Get started by adding your first user'
                                        }
                                    </p>
                                    {!hasActiveFilters && (
                                        <Link 
                                            href="/users/add" 
                                            className="ti-btn ti-btn-primary"
                                        >
                                            <i className="ri-add-line me-2"></i>
                                            Add First User
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
                                                <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">User Info</th>
                                                <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Contact</th>
                                                <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Role & Status</th>
                                                <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {users.map((user) => (
                                                <tr 
                                                    key={user.id}
                                                    className="hover:bg-gray-50 transition-colors duration-150"
                                                >
                                                    <td className="px-4 py-4">
                                                        <input 
                                                            type="checkbox" 
                                                            className="form-check-input" 
                                                            checked={selectedUsers.includes(user.id)}
                                                            onChange={() => handleUserSelect(user.id)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="flex-shrink-0 h-10 w-10">
                                                                <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                                                    <i className={`${getGenderIcon(user.gender)} text-lg`}></i>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="font-medium text-gray-900">{user.name}</div>
                                                                <div className="text-sm text-gray-500">{user.email}</div>
                                                                {user.phoneNumber && (
                                                                    <div className="text-xs text-gray-400">
                                                                        {user.phoneNumber}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-1">
                                                            <div className="text-sm text-gray-900">{user.email}</div>
                                                            {user.phoneNumber && (
                                                                <div className="text-sm text-gray-600">{user.phoneNumber}</div>
                                                            )}
                                                            <div className="text-xs text-gray-500">
                                                                {user.timezone}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="space-y-2">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                                                {user.role.replace('_', ' ').toUpperCase()}
                                                            </span>
                                                            <div>
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    <span className="w-2 h-2 rounded-full mr-2 bg-green-400"></span>
                                                                    Active
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center space-x-2">
                                                            <Link 
                                                                href={`/users/edit/${user.id}`}
                                                                className="ti-btn ti-btn-primary ti-btn-sm"
                                                                title="Edit User"
                                                            >
                                                                <i className="ri-edit-line"></i>
                                                            </Link>
                                                            <button 
                                                                className="ti-btn ti-btn-danger ti-btn-sm"
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                title="Delete User"
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
                            {!loading && users.length > 0 && pagination && (
                                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-6 border-t border-gray-200">
                                    <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                                        <span className="font-medium">
                                            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalResults)} 
                                        </span>
                                        <span className="text-gray-500"> of {pagination.totalResults.toLocaleString()} users</span>
                                    </div>
                                    
                                    <nav aria-label="Page navigation" className="flex items-center space-x-1">
                                        <button
                                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                                                pagination.page > 1
                                                    ? 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                                                    : 'text-gray-300 bg-gray-100 border border-gray-200 cursor-not-allowed'
                                            }`}
                                            onClick={() => handlePageChange(pagination.page - 1)}
                                            disabled={pagination.page <= 1}
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
                                                pagination.page < pagination.totalPages
                                                    ? 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                                                    : 'text-gray-300 bg-gray-100 border border-gray-200 cursor-not-allowed'
                                            }`}
                                            onClick={() => handlePageChange(pagination.page + 1)}
                                            disabled={pagination.page >= pagination.totalPages}
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
    );
}

export default UsersPage;