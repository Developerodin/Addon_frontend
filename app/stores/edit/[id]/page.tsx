"use client"
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { useStores } from '@/shared/hooks/useStores';
import { Store, UpdateStoreData } from '@/shared/services/storeService';
import { toast } from 'react-hot-toast';

const EditStorePage = () => {
    const router = useRouter();
    const params = useParams();
    const storeId = params.id as string;
    
    const { updateStore, getStore, loading } = useStores();
    
    const [store, setStore] = useState<Store | null>(null);
    const [formData, setFormData] = useState<UpdateStoreData>({});
    const [errors, setErrors] = useState<Partial<UpdateStoreData>>({});
    const [isLoading, setIsLoading] = useState(true);

    const creditRatingOptions = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];

    // Fetch store data on component mount
    useEffect(() => {
        const fetchStore = async () => {
            try {
                const storeData = await getStore(storeId);
                setStore(storeData);
                setFormData({
                    storeId: storeData.storeId,
                    storeName: storeData.storeName,
                    city: storeData.city,
                    addressLine1: storeData.addressLine1,
                    addressLine2: storeData.addressLine2,
                    storeNumber: storeData.storeNumber,
                    pincode: storeData.pincode,
                    contactPerson: storeData.contactPerson,
                    contactEmail: storeData.contactEmail,
                    contactPhone: storeData.contactPhone,
                    creditRating: storeData.creditRating,
                    isActive: storeData.isActive
                });
            } catch (error: any) {
                toast.error(error.message || 'Failed to fetch store');
                router.push('/stores');
            } finally {
                setIsLoading(false);
            }
        };

        if (storeId) {
            fetchStore();
        }
    }, [storeId, getStore, router]);

    const validateForm = (): boolean => {
        const newErrors: Partial<UpdateStoreData> = {};

        if (formData.storeId && !/^[A-Z0-9]+$/.test(formData.storeId)) {
            newErrors.storeId = 'Store ID must contain only uppercase letters and numbers';
        }

        if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
            newErrors.pincode = 'Pincode must be exactly 6 digits';
        }

        if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
            newErrors.contactEmail = 'Please enter a valid email address';
        }

        if (formData.contactPhone && !/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(formData.contactPhone.replace(/\s/g, ''))) {
            newErrors.contactPhone = 'Please enter a valid phone number';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear error when user starts typing
        if (errors[name as keyof UpdateStoreData]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        try {
            await updateStore(storeId, formData);
            toast.success('Store updated successfully');
            router.push('/stores');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update store');
        }
    };

    if (isLoading) {
        return (
            <div className="main-content">
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2">Loading store...</span>
                </div>
            </div>
        );
    }

    if (!store) {
        return (
            <div className="main-content">
                <div className="text-center py-8">
                    <p className="text-gray-500">Store not found</p>
                    <Link href="/stores" className="ti-btn ti-btn-primary mt-4">
                        Back to Stores
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            <Seo title={`Edit Store - ${store.storeName}`}/>
            
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                    {/* Page Header */}
                    <div className="box !bg-transparent border-0 shadow-none">
                        <div className="box-header flex justify-between items-center">
                            <h1 className="box-title text-2xl font-semibold">Edit Store</h1>
                            <div className="box-tools">
                                <Link href="/stores" className="ti-btn ti-btn-secondary">
                                    <i className="ri-arrow-left-line me-2"></i> Back to Stores
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="box">
                        <div className="box-body">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Store ID */}
                                    <div>
                                        <label className="form-label">Store ID *</label>
                                        <input
                                            type="text"
                                            name="storeId"
                                            className={`form-control ${errors.storeId ? 'border-danger' : ''}`}
                                            value={formData.storeId || ''}
                                            onChange={handleInputChange}
                                            placeholder="e.g., STORE001"
                                        />
                                        {errors.storeId && (
                                            <div className="text-danger text-sm mt-1">{errors.storeId}</div>
                                        )}
                                    </div>

                                    {/* Store Name */}
                                    <div>
                                        <label className="form-label">Store Name *</label>
                                        <input
                                            type="text"
                                            name="storeName"
                                            className="form-control"
                                            value={formData.storeName || ''}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Main Street Store"
                                        />
                                    </div>

                                    {/* City */}
                                    <div>
                                        <label className="form-label">City *</label>
                                        <input
                                            type="text"
                                            name="city"
                                            className="form-control"
                                            value={formData.city || ''}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Mumbai"
                                        />
                                    </div>

                                    {/* Store Number */}
                                    <div>
                                        <label className="form-label">Store Number *</label>
                                        <input
                                            type="text"
                                            name="storeNumber"
                                            className="form-control"
                                            value={formData.storeNumber || ''}
                                            onChange={handleInputChange}
                                            placeholder="e.g., A101"
                                        />
                                    </div>

                                    {/* Address Line 1 */}
                                    <div className="md:col-span-2">
                                        <label className="form-label">Address Line 1 *</label>
                                        <input
                                            type="text"
                                            name="addressLine1"
                                            className="form-control"
                                            value={formData.addressLine1 || ''}
                                            onChange={handleInputChange}
                                            placeholder="e.g., 123 Main Street"
                                        />
                                    </div>

                                    {/* Address Line 2 */}
                                    <div className="md:col-span-2">
                                        <label className="form-label">Address Line 2</label>
                                        <input
                                            type="text"
                                            name="addressLine2"
                                            className="form-control"
                                            value={formData.addressLine2 || ''}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Building A, Floor 2"
                                        />
                                    </div>

                                    {/* Pincode */}
                                    <div>
                                        <label className="form-label">Pincode *</label>
                                        <input
                                            type="text"
                                            name="pincode"
                                            className={`form-control ${errors.pincode ? 'border-danger' : ''}`}
                                            value={formData.pincode || ''}
                                            onChange={handleInputChange}
                                            placeholder="e.g., 400001"
                                            maxLength={6}
                                        />
                                        {errors.pincode && (
                                            <div className="text-danger text-sm mt-1">{errors.pincode}</div>
                                        )}
                                    </div>

                                    {/* Credit Rating */}
                                    <div>
                                        <label className="form-label">Credit Rating *</label>
                                        <select
                                            name="creditRating"
                                            className="form-select"
                                            value={formData.creditRating || ''}
                                            onChange={handleInputChange}
                                        >
                                            {creditRatingOptions.map(rating => (
                                                <option key={rating} value={rating}>{rating}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Contact Person */}
                                    <div>
                                        <label className="form-label">Contact Person *</label>
                                        <input
                                            type="text"
                                            name="contactPerson"
                                            className="form-control"
                                            value={formData.contactPerson || ''}
                                            onChange={handleInputChange}
                                            placeholder="e.g., John Doe"
                                        />
                                    </div>

                                    {/* Contact Email */}
                                    <div>
                                        <label className="form-label">Contact Email *</label>
                                        <input
                                            type="email"
                                            name="contactEmail"
                                            className={`form-control ${errors.contactEmail ? 'border-danger' : ''}`}
                                            value={formData.contactEmail || ''}
                                            onChange={handleInputChange}
                                            placeholder="e.g., john.doe@store.com"
                                        />
                                        {errors.contactEmail && (
                                            <div className="text-danger text-sm mt-1">{errors.contactEmail}</div>
                                        )}
                                    </div>

                                    {/* Contact Phone */}
                                    <div>
                                        <label className="form-label">Contact Phone *</label>
                                        <input
                                            type="tel"
                                            name="contactPhone"
                                            className={`form-control ${errors.contactPhone ? 'border-danger' : ''}`}
                                            value={formData.contactPhone || ''}
                                            onChange={handleInputChange}
                                            placeholder="e.g., +91-9876543210"
                                        />
                                        {errors.contactPhone && (
                                            <div className="text-danger text-sm mt-1">{errors.contactPhone}</div>
                                        )}
                                    </div>

                                    {/* Is Active */}
                                    <div className="md:col-span-2">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                name="isActive"
                                                id="isActive"
                                                className="form-check-input me-2"
                                                checked={formData.isActive ?? true}
                                                onChange={handleInputChange}
                                            />
                                            <label htmlFor="isActive" className="form-label mb-0">
                                                Store is active
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex justify-end space-x-3 pt-6 border-t">
                                    <Link href="/stores" className="ti-btn ti-btn-secondary">
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        className="ti-btn ti-btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2"></div>
                                                Updating...
                                            </>
                                        ) : (
                                            <>
                                                <i className="ri-save-line me-2"></i>
                                                Update Store
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
};

export default EditStorePage; 