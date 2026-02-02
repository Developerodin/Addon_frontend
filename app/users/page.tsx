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
        <div className="main-content !p-[10px]">
            <Seo title="Users"/>

            <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
                <div className="p-[10px]">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
                            <h1 className="text-sm font-bold text-gray-800">Users</h1>
                            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                {pagination?.totalResults ?? 0}
                            </span>
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
                        <div className="flex flex-wrap items-center gap-2">
                            {selectedUsers.length > 0 && (
                                <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-[11px] font-bold rounded hover:bg-red-700 transition-colors" onClick={handleBulkDelete}>
                                    <i className="ri-delete-bin-line"></i> Delete ({selectedUsers.length})
                                </button>
                            )}
                            <Link href="/users/add" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
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
                                <input type="text" className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 font-medium" placeholder="Search name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <select className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5 w-full" value={filters.role} onChange={(e) => handleFilterChange('role', e.target.value)}>
                                    <option value="">Role</option>
                                    <option value="super_admin">Super Admin</option>
                                    <option value="admin">Admin</option>
                                    <option value="user">User</option>
                                </select>
                                <select className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5 w-full" value={filters.gender} onChange={(e) => handleFilterChange('gender', e.target.value)}>
                                    <option value="">Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                                <input type="text" className="bg-white border border-gray-200 px-2 py-1.5 text-[11px] rounded focus:ring-0 w-full" placeholder="Country" value={filters.country} onChange={(e) => handleFilterChange('country', e.target.value)} />
                                <select className="bg-white border border-gray-200 text-[11px] rounded px-2 py-1.5 w-full" value={filters.isActive} onChange={(e) => handleFilterChange('isActive', e.target.value)}>
                                    <option value="">Status</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
                            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="text-gray-400 mb-4">
                                <i className="ri-user-line text-5xl"></i>
                            </div>
                            <h3 className="text-xs font-bold text-gray-400 mb-1">No users found</h3>
                            <p className="text-[11px] text-gray-500 mb-3">
                                {hasActiveFilters ? 'Try adjusting your filters or search terms' : 'Get started by adding your first user'}
                            </p>
                            {!hasActiveFilters && (
                                <Link href="/users/add" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
                                    <i className="ri-add-line"></i> Add First User
                                </Link>
                            )}
                        </div>
                    ) : (
                        <table className="w-full border-collapse border border-gray-200">
                            <thead>
                                <tr className="bg-gray-50/30">
                                    <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                                        <input
                                            type="checkbox"
                                            checked={selectAll}
                                            onChange={handleSelectAll}
                                            className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                                        />
                                    </th>
                                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">User Info</th>
                                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Contact</th>
                                    <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Role & Status</th>
                                    <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => handleUserSelect(user.id)}
                                                className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                                            />
                                        </td>
                                        <td className="px-1.5 py-2.5 border border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <i className={`${getGenderIcon(user.gender)} text-sm text-gray-500`}></i>
                                                </div>
                                                <div>
                                                    <div className="text-[12px] font-bold text-gray-900">{user.name}</div>
                                                    <div className="text-[11px] text-gray-500">{user.email}</div>
                                                    {user.phoneNumber && <div className="text-[10px] text-gray-400">{user.phoneNumber}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-1.5 py-2.5 border border-gray-200">
                                            <div className="text-[12px] text-gray-900">{user.email}</div>
                                            {user.phoneNumber && <div className="text-[11px] text-gray-600">{user.phoneNumber}</div>}
                                            {user.timezone && <div className="text-[10px] text-gray-500">{user.timezone}</div>}
                                        </td>
                                        <td className="px-1.5 py-2.5 border border-gray-200">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${getRoleColor(user.role)}`}>
                                                    {user.role.replace('_', ' ')}
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-green-100 text-green-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/users/edit/${user.id}`}
                                                    className="w-7 h-7 flex items-center justify-center rounded text-purple-600 hover:bg-purple-50 transition-colors"
                                                    title="Edit User"
                                                >
                                                    <i className="ri-edit-line text-sm"></i>
                                                </Link>
                                                <button
                                                    type="button"
                                                    className="w-7 h-7 flex items-center justify-center rounded text-red-600 hover:bg-red-50 transition-colors"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    title="Delete User"
                                                >
                                                    <i className="ri-delete-bin-line text-sm"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {!loading && users.length > 0 && pagination && (
                    <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
                        <div className="text-[11px] font-medium text-[#495057] tracking-tight">
                            Showing <span>{((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalResults)}</span> of <span>{pagination.totalResults.toLocaleString()}</span> users
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Prev
                            </button>
                            <div className="flex items-center gap-1 mx-2">
                                {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                                    let pageNum;
                                    if (pagination.totalPages <= 7) pageNum = i + 1;
                                    else if (pagination.page <= 4) pageNum = i + 1;
                                    else if (pagination.page >= pagination.totalPages - 3) pageNum = pagination.totalPages - 6 + i;
                                    else pageNum = pagination.page - 3 + i;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${pagination.page === pageNum ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                                className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UsersPage;