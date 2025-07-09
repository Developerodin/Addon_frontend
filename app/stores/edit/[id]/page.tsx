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
    const [currentTab, setCurrentTab] = useState(0);

    const creditRatingOptions = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];

    const tabs = [
        { id: 0, name: 'Basic Info', icon: 'ri-store-line' },
        { id: 1, name: 'Address', icon: 'ri-map-pin-line' },
        { id: 2, name: 'Contact', icon: 'ri-contacts-line' },
        { id: 3, name: 'Internal', icon: 'ri-settings-line' },
        { id: 4, name: 'Brand & Norms', icon: 'ri-price-tag-line' },
        { id: 5, name: 'Status', icon: 'ri-check-line' }
    ];

    // Fetch store data on component mount
    useEffect(() => {
        const fetchStore = async () => {
            try {
                const storeData = await getStore(storeId);
                setStore(storeData);
                setFormData({
                    storeId: storeData.storeId,
                    storeName: storeData.storeName,
                    bpCode: storeData.bpCode,
                    oldStoreCode: storeData.oldStoreCode,
                    bpName: storeData.bpName,
                    street: storeData.street,
                    block: storeData.block,
                    city: storeData.city,
                    addressLine1: storeData.addressLine1,
                    addressLine2: storeData.addressLine2,
                    zipCode: storeData.zipCode,
                    state: storeData.state,
                    country: storeData.country,
                    storeNumber: storeData.storeNumber,
                    pincode: storeData.pincode,
                    contactPerson: storeData.contactPerson,
                    contactEmail: storeData.contactEmail,
                    contactPhone: storeData.contactPhone,
                    telephone: storeData.telephone,
                    internalSapCode: storeData.internalSapCode,
                    internalSoftwareCode: storeData.internalSoftwareCode,
                    brandGrouping: storeData.brandGrouping,
                    brand: storeData.brand,
                    hankyNorms: storeData.hankyNorms,
                    socksNorms: storeData.socksNorms,
                    towelNorms: storeData.towelNorms,
                    totalNorms: storeData.totalNorms,
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

    const validateCurrentTab = (): boolean => {
        const newErrors: Partial<UpdateStoreData> = {};

        switch (currentTab) {
            case 0: // Basic Info
                if (formData.storeId && !/^[A-Z0-9]+$/.test(formData.storeId)) {
                    newErrors.storeId = 'Store ID must contain only uppercase letters and numbers';
                }
                break;

            case 1: // Address
                if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
                    newErrors.pincode = 'Pincode must be exactly 6 digits';
                }
                break;

            case 2: // Contact
                if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
                    newErrors.contactEmail = 'Please enter a valid email address';
                }
                if (formData.contactPhone && !/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(formData.contactPhone.replace(/\s/g, ''))) {
                    newErrors.contactPhone = 'Please enter a valid phone number';
                }
                break;

            case 4: // Brand & Norms
                if (formData.hankyNorms !== undefined && formData.hankyNorms < 0) {
                    newErrors.hankyNorms = 'Hanky norms must be 0 or greater' as any;
                }
                if (formData.socksNorms !== undefined && formData.socksNorms < 0) {
                    newErrors.socksNorms = 'Socks norms must be 0 or greater' as any;
                }
                if (formData.towelNorms !== undefined && formData.towelNorms < 0) {
                    newErrors.towelNorms = 'Towel norms must be 0 or greater' as any;
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateAllTabs = (): boolean => {
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

        if (formData.hankyNorms !== undefined && formData.hankyNorms < 0) {
            newErrors.hankyNorms = 'Hanky norms must be 0 or greater' as any;
        }

        if (formData.socksNorms !== undefined && formData.socksNorms < 0) {
            newErrors.socksNorms = 'Socks norms must be 0 or greater' as any;
        }

        if (formData.towelNorms !== undefined && formData.towelNorms < 0) {
            newErrors.towelNorms = 'Towel norms must be 0 or greater' as any;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        let processedValue: any = type === 'checkbox' ? checked : value;
        
        // Handle numeric fields
        if (['hankyNorms', 'socksNorms', 'towelNorms', 'totalNorms'].includes(name)) {
            processedValue = value === '' ? 0 : Number(value);
        }
        
        setFormData(prev => {
            const updatedData = {
                ...prev,
                [name]: processedValue
            };
            
            // Auto-calculate total norms when any norm changes
            if (['hankyNorms', 'socksNorms', 'towelNorms'].includes(name)) {
                const hankyNorms = name === 'hankyNorms' ? processedValue : prev.hankyNorms;
                const socksNorms = name === 'socksNorms' ? processedValue : prev.socksNorms;
                const towelNorms = name === 'towelNorms' ? processedValue : prev.towelNorms;
                
                // Calculate total norms: sum of all three norms
                updatedData.totalNorms = hankyNorms + socksNorms + towelNorms;
            }
            
            return updatedData;
        });

        // Clear error when user starts typing
        if (errors[name as keyof UpdateStoreData]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    const nextTab = () => {
        if (validateCurrentTab()) {
            setCurrentTab(prev => Math.min(prev + 1, tabs.length - 1));
        } else {
            toast.error('Please fix the errors in the current tab');
        }
    };

    const prevTab = () => {
        setCurrentTab(prev => Math.max(prev - 1, 0));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateAllTabs()) {
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

    const renderTabContent = () => {
        switch (currentTab) {
            case 0: // Basic Info
                return (
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

                        {/* BP Code */}
                        <div>
                            <label className="form-label">BP Code</label>
                            <input
                                type="text"
                                name="bpCode"
                                className="form-control"
                                value={formData.bpCode || ''}
                                onChange={handleInputChange}
                                placeholder="e.g., BP001"
                            />
                        </div>

                        {/* Old Store Code */}
                        <div>
                            <label className="form-label">Old Store Code</label>
                            <input
                                type="text"
                                name="oldStoreCode"
                                className="form-control"
                                value={formData.oldStoreCode || ''}
                                onChange={handleInputChange}
                                placeholder="e.g., OLD001"
                            />
                        </div>

                        {/* BP Name */}
                        <div>
                            <label className="form-label">BP Name</label>
                            <input
                                type="text"
                                name="bpName"
                                className="form-control"
                                value={formData.bpName || ''}
                                onChange={handleInputChange}
                                placeholder="e.g., Business Partner Name"
                            />
                        </div>
                    </div>
                );

            case 1: // Address
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Street */}
                        <div>
                            <label className="form-label">Street</label>
                            <input
                                type="text"
                                name="street"
                                className="form-control"
                                value={formData.street || ''}
                                onChange={handleInputChange}
                                placeholder="e.g., Main Street"
                            />
                        </div>

                        {/* Block */}
                        <div>
                            <label className="form-label">Block</label>
                            <input
                                type="text"
                                name="block"
                                className="form-control"
                                value={formData.block || ''}
                                onChange={handleInputChange}
                                placeholder="e.g., Block A"
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

                        {/* Zip Code */}
                        <div>
                            <label className="form-label">Zip Code</label>
                            <input
                                type="text"
                                name="zipCode"
                                className="form-control"
                                value={formData.zipCode || ''}
                                onChange={handleInputChange}
                                placeholder="e.g., 12345"
                            />
                        </div>

                        {/* State */}
                        <div>
                            <label className="form-label">State</label>
                            <input
                                type="text"
                                name="state"
                                className="form-control"
                                value={formData.state || ''}
                                onChange={handleInputChange}
                                placeholder="e.g., Maharashtra"
                            />
                        </div>

                        {/* Country */}
                        <div>
                            <label className="form-label">Country</label>
                            <input
                                type="text"
                                name="country"
                                className="form-control"
                                value={formData.country || ''}
                                onChange={handleInputChange}
                                placeholder="e.g., India"
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
                    </div>
                );

            case 2: // Contact
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                        {/* Telephone */}
                        <div>
                            <label className="form-label">Telephone</label>
                            <input
                                type="tel"
                                name="telephone"
                                className="form-control"
                                value={formData.telephone || ''}
                                onChange={handleInputChange}
                                placeholder="e.g., 022-12345678"
                            />
                        </div>
                    </div>
                );

            case 3: // Internal
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Internal SAP Code */}
                        <div>
                            <label className="form-label">Internal SAP Code</label>
                            <input
                                type="text"
                                name="internalSapCode"
                                className="form-control"
                                value={formData.internalSapCode || ''}
                                onChange={handleInputChange}
                                placeholder="e.g., SAP001"
                            />
                        </div>

                        {/* Internal Software Code */}
                        <div>
                            <label className="form-label">Internal Software Code</label>
                            <input
                                type="text"
                                name="internalSoftwareCode"
                                className="form-control"
                                value={formData.internalSoftwareCode || ''}
                                onChange={handleInputChange}
                                placeholder="e.g., SW001"
                            />
                        </div>
                    </div>
                );

            case 4: // Brand & Norms
                return (
                    <div className="space-y-6">
                        {/* Brand Information */}
                        <div>
                            <h4 className="text-md font-medium mb-4 text-gray-700">Brand Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Brand Grouping */}
                                <div>
                                    <label className="form-label">Brand Grouping</label>
                                    <input
                                        type="text"
                                        name="brandGrouping"
                                        className="form-control"
                                        value={formData.brandGrouping || ''}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Premium Brands"
                                    />
                                </div>

                                {/* Brand */}
                                <div>
                                    <label className="form-label">Brand</label>
                                    <input
                                        type="text"
                                        name="brand"
                                        className="form-control"
                                        value={formData.brand || ''}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Brand Name"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Norms */}
                        <div>
                            <h4 className="text-md font-medium mb-4 text-gray-700">Norms</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Hanky Norms */}
                                <div>
                                    <label className="form-label">Hanky Norms</label>
                                    <input
                                        type="number"
                                        name="hankyNorms"
                                        className={`form-control ${errors.hankyNorms ? 'border-danger' : ''}`}
                                        value={formData.hankyNorms ?? 0}
                                        onChange={handleInputChange}
                                        placeholder="0"
                                        min="0"
                                    />
                                    {errors.hankyNorms && (
                                        <div className="text-danger text-sm mt-1">{errors.hankyNorms}</div>
                                    )}
                                </div>

                                {/* Socks Norms */}
                                <div>
                                    <label className="form-label">Socks Norms</label>
                                    <input
                                        type="number"
                                        name="socksNorms"
                                        className={`form-control ${errors.socksNorms ? 'border-danger' : ''}`}
                                        value={formData.socksNorms ?? 0}
                                        onChange={handleInputChange}
                                        placeholder="0"
                                        min="0"
                                    />
                                    {errors.socksNorms && (
                                        <div className="text-danger text-sm mt-1">{errors.socksNorms}</div>
                                    )}
                                </div>

                                {/* Towel Norms */}
                                <div>
                                    <label className="form-label">Towel Norms</label>
                                    <input
                                        type="number"
                                        name="towelNorms"
                                        className={`form-control ${errors.towelNorms ? 'border-danger' : ''}`}
                                        value={formData.towelNorms ?? 0}
                                        onChange={handleInputChange}
                                        placeholder="0"
                                        min="0"
                                    />
                                    {errors.towelNorms && (
                                        <div className="text-danger text-sm mt-1">{errors.towelNorms}</div>
                                    )}
                                </div>

                                {/* Total Norms */}
                                <div>
                                    <label className="form-label">Total Norms (Auto-calculated)</label>
                                    <input
                                        type="number"
                                        name="totalNorms"
                                        className="form-control bg-gray-50"
                                        value={formData.totalNorms ?? 0}
                                        readOnly
                                        placeholder="0"
                                        min="0"
                                    />
                                    <div className="text-muted text-sm mt-1">
                                        Auto-calculated: Hanky + Socks + Towel Norms
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 5: // Status
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                        {/* Is Active */}
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
                );

            default:
                return null;
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
                            <form onSubmit={handleSubmit}>
                                {/* Tab Navigation */}
                                <div className="mb-6">
                                    <div className="flex flex-wrap gap-2 border-b border-gray-200">
                                        {tabs.map((tab, index) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setCurrentTab(tab.id)}
                                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                                                    currentTab === tab.id
                                                        ? 'bg-primary text-white border-b-2 border-primary'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                <i className={tab.icon}></i>
                                                {tab.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tab Content */}
                                <div className="mb-6">
                                    {renderTabContent()}
                                </div>

                                {/* Navigation Buttons */}
                                <div className="flex justify-between items-center pt-6 border-t">
                                    <div className="flex gap-3">
                                        {currentTab > 0 && (
                                            <button
                                                type="button"
                                                onClick={prevTab}
                                                className="ti-btn ti-btn-secondary"
                                            >
                                                <i className="ri-arrow-left-line me-2"></i>
                                                Previous
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        {currentTab < tabs.length - 1 ? (
                                            <button
                                                type="button"
                                                onClick={nextTab}
                                                className="ti-btn ti-btn-primary"
                                            >
                                                Next
                                                <i className="ri-arrow-right-line ms-2"></i>
                                            </button>
                                        ) : (
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
                                        )}
                                    </div>
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