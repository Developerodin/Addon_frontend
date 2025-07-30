"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { useStores } from '@/shared/hooks/useStores';
import { CreateStoreData } from '@/shared/services/storeService';
import { toast } from 'react-hot-toast';
import HelpIcon from '@/shared/components/HelpIcon';

const AddStorePage = () => {
    const router = useRouter();
    const { createStore, loading } = useStores();
    
    const [formData, setFormData] = useState<CreateStoreData>({
        storeId: '',
        storeName: '',
        bpCode: '',
        oldStoreCode: '',
        bpName: '',
        street: '',
        block: '',
        city: '',
        addressLine1: '',
        addressLine2: '',
        zipCode: '',
        state: '',
        country: '',
        storeNumber: '',
        pincode: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        telephone: '',
        internalSapCode: '',
        internalSoftwareCode: '',
        brandGrouping: '',
        brand: '',
        hankyNorms: 0,
        socksNorms: 0,
        towelNorms: 0,
        totalNorms: 0,
        creditRating: 'B+',
        isActive: true
    });

    const [errors, setErrors] = useState<Partial<CreateStoreData>>({});
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

    const validateCurrentTab = (): boolean => {
        const newErrors: Partial<CreateStoreData> = {};

        switch (currentTab) {
            case 0: // Basic Info
                if (!formData.storeId.trim()) {
                    newErrors.storeId = 'Store ID is required';
                } else if (!/^[A-Z0-9]+$/.test(formData.storeId)) {
                    newErrors.storeId = 'Store ID must contain only uppercase letters and numbers';
                }
                if (!formData.storeName.trim()) {
                    newErrors.storeName = 'Store name is required';
                }
                break;

            case 1: // Address
                if (!formData.city.trim()) {
                    newErrors.city = 'City is required';
                }
                if (!formData.addressLine1.trim()) {
                    newErrors.addressLine1 = 'Address is required';
                }
                if (!formData.storeNumber.trim()) {
                    newErrors.storeNumber = 'Store number is required';
                }
                if (!formData.pincode.trim()) {
                    newErrors.pincode = 'Pincode is required';
                } else if (!/^\d{6}$/.test(formData.pincode)) {
                    newErrors.pincode = 'Pincode must be exactly 6 digits';
                }
                break;

            case 2: // Contact
                if (!formData.contactPerson.trim()) {
                    newErrors.contactPerson = 'Contact person is required';
                }
                if (!formData.contactEmail.trim()) {
                    newErrors.contactEmail = 'Contact email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
                    newErrors.contactEmail = 'Please enter a valid email address';
                }
                if (!formData.contactPhone.trim()) {
                    newErrors.contactPhone = 'Contact phone is required';
                } else if (!/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(formData.contactPhone.replace(/\s/g, ''))) {
                    newErrors.contactPhone = 'Please enter a valid phone number';
                }
                break;

            case 4: // Brand & Norms
                if (formData.hankyNorms < 0) {
                    newErrors.hankyNorms = 'Hanky norms must be 0 or greater' as any;
                }
                if (formData.socksNorms < 0) {
                    newErrors.socksNorms = 'Socks norms must be 0 or greater' as any;
                }
                if (formData.towelNorms < 0) {
                    newErrors.towelNorms = 'Towel norms must be 0 or greater' as any;
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateAllTabs = (): boolean => {
        const newErrors: Partial<CreateStoreData> = {};

        // Basic Info validation
        if (!formData.storeId.trim()) {
            newErrors.storeId = 'Store ID is required';
        } else if (!/^[A-Z0-9]+$/.test(formData.storeId)) {
            newErrors.storeId = 'Store ID must contain only uppercase letters and numbers';
        }
        if (!formData.storeName.trim()) {
            newErrors.storeName = 'Store name is required';
        }

        // Address validation
        if (!formData.city.trim()) {
            newErrors.city = 'City is required';
        }
        if (!formData.addressLine1.trim()) {
            newErrors.addressLine1 = 'Address is required';
        }
        if (!formData.storeNumber.trim()) {
            newErrors.storeNumber = 'Store number is required';
        }
        if (!formData.pincode.trim()) {
            newErrors.pincode = 'Pincode is required';
        } else if (!/^\d{6}$/.test(formData.pincode)) {
            newErrors.pincode = 'Pincode must be exactly 6 digits';
        }

        // Contact validation
        if (!formData.contactPerson.trim()) {
            newErrors.contactPerson = 'Contact person is required';
        }
        if (!formData.contactEmail.trim()) {
            newErrors.contactEmail = 'Contact email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
            newErrors.contactEmail = 'Please enter a valid email address';
        }
        if (!formData.contactPhone.trim()) {
            newErrors.contactPhone = 'Contact phone is required';
        } else if (!/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(formData.contactPhone.replace(/\s/g, ''))) {
            newErrors.contactPhone = 'Please enter a valid phone number';
        }

        // Norms validation
        if (formData.hankyNorms < 0) {
            newErrors.hankyNorms = 'Hanky norms must be 0 or greater' as any;
        }
        if (formData.socksNorms < 0) {
            newErrors.socksNorms = 'Socks norms must be 0 or greater' as any;
        }
        if (formData.towelNorms < 0) {
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
        if (errors[name as keyof CreateStoreData]) {
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
            await createStore(formData);
            toast.success('Store created successfully');
            router.push('/stores');
        } catch (error: any) {
            toast.error(error.message || 'Failed to create store');
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
                                value={formData.storeId}
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
                                className={`form-control ${errors.storeName ? 'border-danger' : ''}`}
                                value={formData.storeName}
                                onChange={handleInputChange}
                                placeholder="e.g., Main Street Store"
                            />
                            {errors.storeName && (
                                <div className="text-danger text-sm mt-1">{errors.storeName}</div>
                            )}
                        </div>

                        {/* BP Code */}
                        <div>
                            <label className="form-label">BP Code</label>
                            <input
                                type="text"
                                name="bpCode"
                                className="form-control"
                                value={formData.bpCode}
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
                                value={formData.oldStoreCode}
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
                                value={formData.bpName}
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
                                value={formData.street}
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
                                value={formData.block}
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
                                className={`form-control ${errors.city ? 'border-danger' : ''}`}
                                value={formData.city}
                                onChange={handleInputChange}
                                placeholder="e.g., Mumbai"
                            />
                            {errors.city && (
                                <div className="text-danger text-sm mt-1">{errors.city}</div>
                            )}
                        </div>

                        {/* Store Number */}
                        <div>
                            <label className="form-label">Store Number *</label>
                            <input
                                type="text"
                                name="storeNumber"
                                className={`form-control ${errors.storeNumber ? 'border-danger' : ''}`}
                                value={formData.storeNumber}
                                onChange={handleInputChange}
                                placeholder="e.g., A101"
                            />
                            {errors.storeNumber && (
                                <div className="text-danger text-sm mt-1">{errors.storeNumber}</div>
                            )}
                        </div>

                        {/* Address Line 1 */}
                        <div className="md:col-span-2">
                            <label className="form-label">Address Line 1 *</label>
                            <input
                                type="text"
                                name="addressLine1"
                                className={`form-control ${errors.addressLine1 ? 'border-danger' : ''}`}
                                value={formData.addressLine1}
                                onChange={handleInputChange}
                                placeholder="e.g., 123 Main Street"
                            />
                            {errors.addressLine1 && (
                                <div className="text-danger text-sm mt-1">{errors.addressLine1}</div>
                            )}
                        </div>

                        {/* Address Line 2 */}
                        <div className="md:col-span-2">
                            <label className="form-label">Address Line 2</label>
                            <input
                                type="text"
                                name="addressLine2"
                                className="form-control"
                                value={formData.addressLine2}
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
                                value={formData.zipCode}
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
                                value={formData.state}
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
                                value={formData.country}
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
                                value={formData.pincode}
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
                                className={`form-control ${errors.contactPerson ? 'border-danger' : ''}`}
                                value={formData.contactPerson}
                                onChange={handleInputChange}
                                placeholder="e.g., John Doe"
                            />
                            {errors.contactPerson && (
                                <div className="text-danger text-sm mt-1">{errors.contactPerson}</div>
                            )}
                        </div>

                        {/* Contact Email */}
                        <div>
                            <label className="form-label">Contact Email *</label>
                            <input
                                type="email"
                                name="contactEmail"
                                className={`form-control ${errors.contactEmail ? 'border-danger' : ''}`}
                                value={formData.contactEmail}
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
                                value={formData.contactPhone}
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
                                value={formData.telephone}
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
                                value={formData.internalSapCode}
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
                                value={formData.internalSoftwareCode}
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
                                        value={formData.brandGrouping}
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
                                        value={formData.brand}
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
                                        value={formData.hankyNorms}
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
                                        value={formData.socksNorms}
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
                                        value={formData.towelNorms}
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
                                        value={formData.totalNorms}
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
                                value={formData.creditRating}
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
                                checked={formData.isActive}
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

    return (
        <div className="main-content">
            <Seo title="Add New Store"/>
            
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                    {/* Page Header */}
                    <div className="box !bg-transparent border-0 shadow-none">
                        <div className="box-header flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <h1 className="box-title text-2xl font-semibold">Add New Store</h1>
                                <HelpIcon
                                  title="Add New Store"
                                  content={
                                    <div>
                                      <p className="mb-4">
                                        This page allows you to create a new store by filling out comprehensive store information across multiple tabs.
                                      </p>
                                      
                                      <h4 className="font-semibold mb-2">What you can do:</h4>
                                      <ul className="list-disc list-inside mb-4 space-y-1">
                                        <li><strong>Basic Info:</strong> Enter store ID, name, and business partner details</li>
                                        <li><strong>Address:</strong> Provide complete address information including street, city, and pincode</li>
                                        <li><strong>Contact:</strong> Add contact person details and communication information</li>
                                        <li><strong>Internal:</strong> Set internal codes and software configurations</li>
                                        <li><strong>Brand & Norms:</strong> Configure brand groupings and inventory norms</li>
                                        <li><strong>Status:</strong> Set credit rating and active status</li>
                                        <li><strong>Navigation:</strong> Use tabs to organize information entry</li>
                                        <li><strong>Validation:</strong> Each tab validates required fields before proceeding</li>
                                      </ul>

                                      <h4 className="font-semibold mb-2">Required Fields:</h4>
                                      <ul className="list-disc list-inside mb-4 space-y-1">
                                        <li><strong>Store ID:</strong> Unique identifier (uppercase letters and numbers only)</li>
                                        <li><strong>Store Name:</strong> Name of the store</li>
                                        <li><strong>City:</strong> City where store is located</li>
                                        <li><strong>Address:</strong> Complete address line</li>
                                        <li><strong>Store Number:</strong> Store's unique number</li>
                                        <li><strong>Pincode:</strong> 6-digit postal code</li>
                                        <li><strong>Contact Person:</strong> Primary contact for the store</li>
                                        <li><strong>Contact Email:</strong> Valid email address</li>
                                      </ul>

                                      <h4 className="font-semibold mb-2">Tips:</h4>
                                      <ul className="list-disc list-inside space-y-1">
                                        <li>Complete each tab before moving to the next</li>
                                        <li>Store ID must be unique and contain only uppercase letters and numbers</li>
                                        <li>Pincode must be exactly 6 digits</li>
                                        <li>Email must be in valid format</li>
                                        <li>Use the Previous/Next buttons to navigate between tabs</li>
                                        <li>All required fields must be completed before submission</li>
                                      </ul>
                                    </div>
                                  }
                                />
                              </div>
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
                                                        Creating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="ri-save-line me-2"></i>
                                                        Create Store
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

export default AddStorePage;
