"use client"
import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

const AddSalePage = () => {
  const [formData, setFormData] = useState({
    calendar_date: '',
    plant: '1057',
    plant_name: 'LINKING ROAD, KHAR',
    division: 'LP',
    division_name: 'Louis Philippe',
    material_group: '',
    material_type: '',
    material_code: '',
    material_description: '',
    quantity: '',
    mrp: '',
    discount: '0.00',
    gsv: '0.00',
    nsv: '0.00',
    total_tax: '0.00'
  });

  // Sample data for dropdowns
  const materialGroups = ['FGSOCKS', 'FGHANKIES'];
  const materialTypes = ['Socks', 'Hankies'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };

      // Calculate GSV (Gross Sales Value)
      if (name === 'quantity' || name === 'mrp') {
        const qty = parseFloat(newData.quantity) || 0;
        const mrp = parseFloat(newData.mrp) || 0;
        const discount = parseFloat(newData.discount) || 0;
        
        const gsv = qty * mrp;
        const nsv = gsv - discount;
        const tax = nsv * 0.05; // Assuming 5% tax rate

        newData.gsv = gsv.toFixed(2);
        newData.nsv = nsv.toFixed(2);
        newData.total_tax = tax.toFixed(2);
      }

      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add API call to save sales data
    console.log('Form submitted:', formData);
  };

  return (
    <div className="main-content">
      <Seo title="Add New Sale"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add New Sale</h1>
              <div className="box-tools">
                <Link href="/sales" className="ti-btn ti-btn-primary">
                  <i className="ri-arrow-left-line me-2"></i> Back to Sales
                </Link>
              </div>
            </div>
          </div>

          {/* Form Box */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-12 gap-6">
                  {/* Calendar Date */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      name="calendar_date"
                      value={formData.calendar_date}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* Plant */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Plant</label>
                    <input
                      type="text"
                      value={`${formData.plant} - ${formData.plant_name}`}
                      className="form-control"
                      disabled
                    />
                  </div>

                  {/* Division */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Division</label>
                    <input
                      type="text"
                      value={`${formData.division} - ${formData.division_name}`}
                      className="form-control"
                      disabled
                    />
                  </div>

                  {/* Material Group */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Material Group</label>
                    <select
                      name="material_group"
                      value={formData.material_group}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      <option value="">Select Material Group</option>
                      {materialGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>

                  {/* Material Type */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Material Type</label>
                    <select
                      name="material_type"
                      value={formData.material_type}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      <option value="">Select Material Type</option>
                      {materialTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Material Code */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Material Code</label>
                    <input
                      type="text"
                      name="material_code"
                      value={formData.material_code}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter material code"
                      required
                    />
                  </div>

                  {/* Material Description */}
                  <div className="col-span-12">
                    <label className="form-label">Material Description</label>
                    <input
                      type="text"
                      name="material_description"
                      value={formData.material_description}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter material description"
                      required
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter quantity"
                      min="1"
                      required
                    />
                  </div>

                  {/* MRP */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">MRP</label>
                    <input
                      type="number"
                      name="mrp"
                      value={formData.mrp}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter MRP"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  {/* Discount */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Discount</label>
                    <input
                      type="number"
                      name="discount"
                      value={formData.discount}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="Enter discount"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  {/* Calculated Fields */}
                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">GSV (Calculated)</label>
                    <input
                      type="text"
                      value={formData.gsv}
                      className="form-control"
                      disabled
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">NSV (Calculated)</label>
                    <input
                      type="text"
                      value={formData.nsv}
                      className="form-control"
                      disabled
                    />
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="form-label">Total Tax (Calculated)</label>
                    <input
                      type="text"
                      value={formData.total_tax}
                      className="form-control"
                      disabled
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4">
                  <Link href="/sales" className="ti-btn ti-btn-light">
                    Cancel
                  </Link>
                  <button type="submit" className="ti-btn ti-btn-primary">
                    Save Sale
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

export default AddSalePage; 