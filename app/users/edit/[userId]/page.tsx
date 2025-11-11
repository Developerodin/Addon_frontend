"use client"
import React, { useState, useEffect } from 'react'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useUsers } from '@/shared/hooks/useUsers';
import { UpdateUserRequest, User } from '@/shared/services/userService';
import { toast } from 'react-hot-toast';

const EditUserPage = () => {
    const router = useRouter();
    const params = useParams();
    const userId = params?.userId as string;
    
    const { 
        loadUser, 
        updateUser,
        updateUserNavigation,
        validateEmail, 
        validatePassword, 
        loading, 
        currentUser 
    } = useUsers();

    // Form state
    const [formData, setFormData] = useState<UpdateUserRequest>({
        name: '',
        email: '',
        password: '',
        role: 'user',
        phoneNumber: '',
        gender: 'Other',
        country: '',
        timezone: 'UTC'
    });

    // Navigation state
    const [navigation, setNavigation] = useState<Partial<User['navigation']>>({});

    // Form validation
    const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load user data
    useEffect(() => {
        const fetchUser = async () => {
            if (!userId) {
                console.error('No userId provided in URL params');
                toast.error('Invalid user ID');
                router.push('/users');
                return;
            }
            
            try {
                setIsLoading(true);
                await loadUser(userId);
            } catch (error) {
                console.error('Failed to load user:', error);
                toast.error('Failed to load user data');
                router.push('/users');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, [userId, loadUser, router]);

    // Update form data when user is loaded
    useEffect(() => {
        if (currentUser) {
            setFormData({
                name: currentUser.name,
                email: currentUser.email,
                password: '', // Don't pre-fill password
                role: currentUser.role,
                phoneNumber: currentUser.phoneNumber || '',
                gender: currentUser.gender,
                country: currentUser.country || '',
                timezone: currentUser.timezone
            });
            setNavigation(currentUser.navigation);
        }
    }, [currentUser]);

    // Form handlers
    const handleFormChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // Navigation handlers
    const handleNavigationChange = (section: string, subsection: string | null, subsubsection: string | null, value: boolean) => {
        setNavigation(prev => {
            const newNav = { ...prev };
            
            if (subsubsection) {
                // Handle triple-nested sections like Yarn Management -> Yarn Master -> Brand
                if (!newNav[section as keyof typeof newNav]) {
                    newNav[section as keyof typeof newNav] = {} as any;
                }
                const sectionObj = (newNav[section as keyof typeof newNav] as any);
                if (!sectionObj[subsection]) {
                    sectionObj[subsection] = {} as any;
                }
                sectionObj[subsection][subsubsection] = value;
            } else if (subsection) {
                // Handle nested sections like Catalog.Items
                if (!newNav[section as keyof typeof newNav]) {
                    newNav[section as keyof typeof newNav] = {} as any;
                }
                (newNav[section as keyof typeof newNav] as any)[subsection] = value;
            } else {
                // Handle top-level sections
                (newNav as any)[section] = value;
            }
            
            return newNav;
        });
    };

    const validateForm = (): boolean => {
        const errors: {[key: string]: string} = {};

        if (!formData.name.trim()) {
            errors.name = 'Name is required';
        }

        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!validateEmail(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        // Only validate password if it's provided
        if (formData.password && formData.password.trim()) {
            const passwordValidation = validatePassword(formData.password);
            if (!passwordValidation.isValid) {
                errors.password = passwordValidation.errors[0];
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!userId) {
            console.error('No userId available for update');
            toast.error('Invalid user ID');
            return;
        }
        
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            // Remove password from update data if it's empty
            const updateData = { ...formData };
            if (!updateData.password || !updateData.password.trim()) {
                delete updateData.password;
            }

            // Update user basic information
            await updateUser(userId, updateData);
            
            // Update user navigation permissions
            await updateUserNavigation(userId, { navigation });
            
            toast.success('User updated successfully');
            router.push('/users');
        } catch (error) {
            console.error('Failed to update user:', error);
            toast.error('Failed to update user');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="main-content">
                <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading user data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="main-content">
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                        <i className="ri-user-line text-6xl"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">User not found</h3>
                    <p className="text-gray-500 mb-4">The user you're looking for doesn't exist.</p>
                    <Link href="/users" className="ti-btn ti-btn-primary">
                        <i className="ri-arrow-left-line me-2"></i>
                        Back to Users
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            <Seo title={`Edit User - ${currentUser.name}`}/>
            
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                    {/* Page Header */}
                    <div className="box !bg-transparent border-0 shadow-none">
                        <div className="box-header flex justify-between items-center">
                            <div>
                                <h1 className="box-title text-2xl font-semibold">Edit User</h1>
                            </div>
                            <div className="box-tools">
                                <Link 
                                    href="/users" 
                                    className="ti-btn ti-btn-secondary ti-btn-sm"
                                    title="Back to Users"
                                >
                                    <i className="ri-arrow-left-line"></i>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Form Card */}
                    <div className="box">
                        <div className="box-header">
                            <h3 className="box-title">User Information</h3>
                        </div>
                        <div className="box-body">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Name */}
                                    <div>
                                        <label className="form-label">
                                            Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`form-control ${formErrors.name ? 'border-red-500' : ''}`}
                                            value={formData.name}
                                            onChange={e => handleFormChange('name', e.target.value)}
                                            placeholder="Enter full name"
                                        />
                                        {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="form-label">
                                            Email <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            className={`form-control ${formErrors.email ? 'border-red-500' : ''}`}
                                            value={formData.email}
                                            onChange={e => handleFormChange('email', e.target.value)}
                                            placeholder="Enter email address"
                                        />
                                        {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="form-label">Password</label>
                                        <input
                                            type="password"
                                            className={`form-control ${formErrors.password ? 'border-red-500' : ''}`}
                                            value={formData.password}
                                            onChange={e => handleFormChange('password', e.target.value)}
                                            placeholder="Enter new password (leave blank to keep current)"
                                        />
                                        {formErrors.password && <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>}
                                        <p className="text-gray-500 text-xs mt-1">
                                            Leave blank to keep current password. If provided, must contain at least 8 characters with letters and numbers
                                        </p>
                                    </div>

                                    {/* Role */}
                                    <div>
                                        <label className="form-label">
                                            Role <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="form-select"
                                            value={formData.role}
                                            onChange={e => handleFormChange('role', e.target.value)}
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                            <option value="super_admin">Super Admin</option>
                                        </select>
                                    </div>

                                    {/* Phone Number */}
                                    <div>
                                        <label className="form-label">Phone Number</label>
                                        <input
                                            type="tel"
                                            className="form-control"
                                            value={formData.phoneNumber}
                                            onChange={e => handleFormChange('phoneNumber', e.target.value)}
                                            placeholder="Enter phone number"
                                        />
                                    </div>

                                    {/* Gender */}
                                    <div>
                                        <label className="form-label">Gender</label>
                                        <select
                                            className="form-select"
                                            value={formData.gender}
                                            onChange={e => handleFormChange('gender', e.target.value)}
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    {/* Country */}
                                    <div>
                                        <label className="form-label">Country</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.country}
                                            onChange={e => handleFormChange('country', e.target.value)}
                                            placeholder="Enter country"
                                        />
                                    </div>

                                    {/* Timezone */}
                                    <div>
                                        <label className="form-label">Timezone</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.timezone}
                                            onChange={e => handleFormChange('timezone', e.target.value)}
                                            placeholder="Enter timezone (e.g., UTC, EST, PST)"
                                        />
                                    </div>
                                </div>

                                {/* Navigation Permissions Section */}
                                <div className="pt-6 border-t border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Navigation Permissions</h3>
                                    
                                    <div className="space-y-6">
                                        {/* Main Sections */}
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 mb-3">Main Sections</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {[
                                                    { key: 'Dashboard', label: 'Dashboard' },
                                                    { key: 'Stores', label: 'Stores' },
                                                    { key: 'Analytics', label: 'Analytics' },
                                                    { key: 'Replenishment Agent', label: 'Replenishment Agent' },
                                                    { key: 'File Manager', label: 'File Manager' },
                                                    { key: 'Users', label: 'Users Management' }
                                                ].map(section => (
                                                    <label key={section.key} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={(navigation as any)[section.key] === true}
                                                            onChange={(e) => handleNavigationChange(section.key, null, null, e.target.checked)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">{section.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Catalog Section */}
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 mb-3">Master Catalog</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                                                {[
                                                    { key: 'Items', label: 'Items' },
                                                    { key: 'Categories', label: 'Categories' },
                                                    { key: 'Raw Material', label: 'Raw Material' },
                                                    { key: 'Processes', label: 'Processes' },
                                                    { key: 'Attributes', label: 'Attributes' },
                                                    { key: 'Machines', label: 'Machines' }
                                                ].map(subsection => (
                                                    <label key={subsection.key} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={(navigation.Catalog as any)?.[subsection.key] === true}
                                                            onChange={(e) => handleNavigationChange('Catalog', subsection.key, null, e.target.checked)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">{subsection.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sales Section */}
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 mb-3">Sales</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                                                {[
                                                    { key: 'All Sales', label: 'All Sales' },
                                                    { key: 'Master Sales', label: 'Master Sales' }
                                                ].map(subsection => (
                                                    <label key={subsection.key} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={(navigation.Sales as any)?.[subsection.key] === true}
                                                            onChange={(e) => handleNavigationChange('Sales', subsection.key, null, e.target.checked)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">{subsection.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Production Planning Section */}
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 mb-3">Production Planning</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                                                {[
                                                    { key: 'Production Orders', label: 'Production Orders' },
                                                    { key: 'Knitting Floor', label: 'Knitting Floor' },
                                                    { key: 'Linking Floor', label: 'Linking Floor' },
                                                    { key: 'Checking Floor', label: 'Checking Floor' },
                                                    { key: 'Washing Floor', label: 'Washing Floor' },
                                                    { key: 'Boarding Floor', label: 'Boarding Floor' },
                                                    { key: 'Final Checking Floor', label: 'Final Checking Floor' },
                                                    { key: 'Branding Floor', label: 'Branding Floor' },
                                                    { key: 'Machine Floor', label: 'Machine Floor' },
                                                    { key: 'Warehouse Floor', label: 'Warehouse Floor' }
                                                ].map(subsection => (
                                                    <label key={subsection.key} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={(navigation['Production Planning'] as any)?.[subsection.key] === true}
                                                            onChange={(e) => handleNavigationChange('Production Planning', subsection.key, null, e.target.checked)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">{subsection.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Yarn Management Section */}
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 mb-3">Yarn Management</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                                                {[
                                                    { key: 'Cataloguing', label: 'Cataloguing' },
                                                    { key: 'Purchase Order', label: 'Purchase Order' },
                                                    { key: 'Purchase Order Received', label: 'Purchase Order Received' },
                                                    { key: 'Inventory', label: 'Inventory' },
                                                    { key: 'Yarn Issue', label: 'Yarn Issue' }
                                                ].map(subsection => (
                                                    <label key={subsection.key} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={(navigation['Yarn Management'] as any)?.[subsection.key] === true}
                                                            onChange={(e) => handleNavigationChange('Yarn Management', subsection.key, null, e.target.checked)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">{subsection.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            
                                            {/* Yarn Master Subsection */}
                                            <div className="mt-4 ml-8">
                                                <h5 className="text-sm font-medium text-gray-800 mb-2">Yarn Master</h5>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                                                    {[
                                                        { key: 'Brand', label: 'Brand' },
                                                        { key: 'Yarn Type', label: 'Yarn Type' },
                                                        { key: 'Count/Size', label: 'Count/Size' },
                                                        { key: 'Color', label: 'Color' },
                                                        { key: 'Blend', label: 'Blend' }
                                                    ].map(subsubsection => (
                                                        <label key={subsubsection.key} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={(navigation['Yarn Management'] as any)?.['Yarn Master']?.[subsubsection.key] === true}
                                                                onChange={(e) => handleNavigationChange('Yarn Management', 'Yarn Master', subsubsection.key, e.target.checked)}
                                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-700">{subsubsection.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Warehouse Management Section */}
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 mb-3">Warehouse Management</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                                                {[
                                                    { key: 'Orders', label: 'Orders' },
                                                    { key: 'Pick&Pack', label: 'Pick&Pack' },
                                                    { key: 'Layout', label: 'Layout' },
                                                    { key: 'Stock', label: 'Stock' },
                                                    { key: 'Reports', label: 'Reports' }
                                                ].map(subsection => (
                                                    <label key={subsection.key} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={(navigation['Warehouse Management'] as any)?.[subsection.key] === true}
                                                            onChange={(e) => handleNavigationChange('Warehouse Management', subsection.key, null, e.target.checked)}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">{subsection.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                    <Link 
                                        href="/users" 
                                        className="ti-btn ti-btn-light"
                                    >
                                        Cancel
                                    </Link>
                                    <button 
                                        type="submit" 
                                        className="ti-btn ti-btn-primary"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <i className="ri-loader-4-line animate-spin me-2"></i>
                                                Updating User...
                                            </>
                                        ) : (
                                            <>
                                                <i className="ri-save-line me-2"></i>
                                                Update User
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditUserPage;
