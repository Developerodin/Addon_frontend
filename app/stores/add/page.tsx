"use client"
import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

const AddStorePage = () => {
  const [formData, setFormData] = useState({
    store_id: '',
    name: '',
    city: '',
    address_line1: '',
    address_line2: '',
    number: '',
    pincode: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    credit_rating: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add API call to save store data
    console.log('Form submitted:', formData);
  };

  return (
    <div className="main-content">
      <Seo title="Add New Store"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add New Store</h1>
              <div className="box-tools">
                <Link href="/stores" className="ti-btn ti-btn-primary">
                  <i className="ri-arrow-left-line me-2"></i> Back to Stores
                </Link>
              </div>
            </div>
          </div>

          {/* Form Box */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-12 gap-6">
                  {/* Store ID */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Store ID</label>
                    <input
                      type="text"
                      name="store_id"
                      value={formData.store_id}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter store ID"
                      required
                    />
                  </div>

                  {/* Store Name */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Store Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter store name"
                      required
                    />
                  </div>

                  {/* City */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter city"
                      required
                    />
                  </div>

                  {/* Address Line 1 */}
                  <div className="col-span-12">
                    <label className="form-label">Address Line 1</label>
                    <input
                      type="text"
                      name="address_line1"
                      value={formData.address_line1}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter street address, building name, etc."
                      required
                    />
                  </div>

                  {/* Address Line 2 */}
                  <div className="col-span-12">
                    <label className="form-label">Address Line 2</label>
                    <input
                      type="text"
                      name="address_line2"
                      value={formData.address_line2}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter apartment, suite, unit, etc. (optional)"
                    />
                  </div>

                  {/* Store Number */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Store Number</label>
                    <input
                      type="text"
                      name="number"
                      value={formData.number}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter store number"
                      required
                    />
                  </div>

                  {/* Pincode */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Pincode</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter pincode"
                      required
                    />
                  </div>

                  {/* Contact Person */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter contact person name"
                      required
                    />
                  </div>

                  {/* Contact Email */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Contact Email</label>
                    <input
                      type="email"
                      name="contact_email"
                      value={formData.contact_email}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter contact email"
                      required
                    />
                  </div>

                  {/* Contact Phone */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Contact Phone</label>
                    <input
                      type="tel"
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter contact phone number"
                      required
                    />
                  </div>

                  {/* Credit Rating */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Credit Rating</label>
                    <input
                      type="text"
                      name="credit_rating"
                      value={formData.credit_rating}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter credit rating"
                      required
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4">
                  <Link href="/stores" className="ti-btn ti-btn-light">
                    Cancel
                  </Link>
                  <button type="submit" className="ti-btn ti-btn-primary">
                    Save Store
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

export default AddStorePage;
