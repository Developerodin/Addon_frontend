"use client"
import React, { useState } from 'react'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUsers } from '@/shared/hooks/useUsers';
import { CreateUserRequest } from '@/shared/services/userService';
import { toast } from 'react-hot-toast';

const AddUserPage = () => {
    const router = useRouter();
    const { createUser, validateEmail, validatePassword } = useUsers();

    // Form state
    const [formData, setFormData] = useState<CreateUserRequest>({
        name: '',
        email: '',
        password: '',
        role: 'user',
        phoneNumber: '',
        gender: 'Other',
        country: '',
        timezone: 'UTC'
    });

    // Form validation
    const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form handlers
    const handleFormChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: '' }));
        }
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

        if (!formData.password.trim()) {
            errors.password = 'Password is required';
        } else {
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
        
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            await createUser(formData);
            toast.success('User created successfully');
            router.push('/users');
        } catch (error) {
            console.error('Failed to create user:', error);
            toast.error('Failed to create user');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="main-content">
            <Seo title="Add New User"/>
            
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                    {/* Page Header */}
                    <div className="box !bg-transparent border-0 shadow-none">
                        <div className="box-header flex justify-between items-center">
                            <div>
                                <h1 className="box-title text-2xl font-semibold">Add New User</h1>
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
                                        <label className="form-label">
                                            Password <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            className={`form-control ${formErrors.password ? 'border-red-500' : ''}`}
                                            value={formData.password}
                                            onChange={e => handleFormChange('password', e.target.value)}
                                            placeholder="Enter password"
                                        />
                                        {formErrors.password && <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>}
                                        <p className="text-gray-500 text-xs mt-1">
                                            Password must contain at least 8 characters with letters and numbers
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
                                                Creating User...
                                            </>
                                        ) : (
                                            <>
                                                <i className="ri-add-line me-2"></i>
                                                Create User
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

export default AddUserPage;
