"use client";
import React, { useState, useEffect } from "react";
import { Vendor, VendorFormData } from "../types";

interface VendorFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: VendorFormData) => void;
  editVendor: Vendor | null;
}

const emptyForm: VendorFormData = {
  vendorCode: "",
  vendorName: "",
  contactPerson: "",
  phone: "",
  city: "",
  status: "active",
  email: "",
  address: "",
};

const VendorFormModal: React.FC<VendorFormModalProps> = ({
  open,
  onClose,
  onSave,
  editVendor,
}) => {
  const [form, setForm] = useState<VendorFormData>(emptyForm);
  const isEdit = !!editVendor;

  useEffect(() => {
    if (open) {
      if (editVendor) {
        setForm({
          vendorCode: editVendor.vendorCode,
          vendorName: editVendor.vendorName,
          contactPerson: editVendor.contactPerson,
          phone: editVendor.phone,
          city: editVendor.city ?? "",
          status: editVendor.status,
          email: editVendor.email ?? "",
          address: editVendor.address ?? "",
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, editVendor]);

  const handleChange = (field: keyof VendorFormData, value: string | "active" | "inactive") => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop - same as project modals */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="box bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="box-header flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="box-title text-xl font-semibold">
              {isEdit ? "Edit Vendor" : "Add Vendor"}
            </h2>
            <button
              type="button"
              className="ti-btn ti-btn-light inline-flex items-center justify-center w-8 h-8 shrink-0"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="box-body p-6 space-y-4">
            <div>
              <label className="form-label text-sm font-medium">Vendor Code <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                value={form.vendorCode}
                onChange={(e) => handleChange("vendorCode", e.target.value)}
                required
                placeholder="e.g. VND001"
              />
            </div>
            <div>
              <label className="form-label text-sm font-medium">Vendor Name <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                value={form.vendorName}
                onChange={(e) => handleChange("vendorName", e.target.value)}
                required
                placeholder="Vendor name"
              />
            </div>
            <div>
              <label className="form-label text-sm font-medium">Contact Person <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                value={form.contactPerson}
                onChange={(e) => handleChange("contactPerson", e.target.value)}
                required
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="form-label text-sm font-medium">Phone <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                required
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="form-label text-sm font-medium">Email</label>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="form-label text-sm font-medium">City</label>
              <input
                type="text"
                className="form-control"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="City"
              />
            </div>
            <div>
              <label className="form-label text-sm font-medium">Address</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Full address"
              />
            </div>
            <div>
              <label className="form-label text-sm font-medium">Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value as "active" | "inactive")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                onClick={onClose}
              >
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
              >
                <span>{isEdit ? "Update" : "Add"} Vendor</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default VendorFormModal;
