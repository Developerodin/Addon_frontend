"use client";
import React from "react";
import { Vendor } from "../types";

interface VendorDetailsDrawerProps {
  vendor: Vendor | null;
  open: boolean;
  onClose: () => void;
  onEdit: (vendor: Vendor) => void;
}

const VendorDetailsDrawer: React.FC<VendorDetailsDrawerProps> = ({ vendor, open, onClose, onEdit }) => {
  if (!vendor) return null;

  return (
    <React.Fragment>
      {/* Backdrop - same as yarn-return side panel */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Side Panel - same structure as yarn-return */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="box h-full flex flex-col">
          <div className="box-header border-b border-gray-200 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h3 className="box-title text-lg">Vendor Details</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                  onClick={() => onEdit(vendor)}
                >
                  <i className="ri-edit-line"></i>
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-light inline-flex items-center justify-center w-8 h-8 shrink-0"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
            </div>
          </div>
          <div className="box-body flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div>
                <label className="form-label text-sm font-medium text-gray-500 block mb-1">Vendor Code</label>
                <p className="text-gray-900">{vendor.vendorCode}</p>
              </div>
              <div>
                <label className="form-label text-sm font-medium text-gray-500 block mb-1">Vendor Name</label>
                <p className="text-gray-900">{vendor.vendorName}</p>
              </div>
              <div>
                <label className="form-label text-sm font-medium text-gray-500 block mb-1">Contact Person</label>
                <p className="text-gray-900">{vendor.contactPerson}</p>
              </div>
              <div>
                <label className="form-label text-sm font-medium text-gray-500 block mb-1">Phone</label>
                <p className="text-gray-900">{vendor.phone}</p>
              </div>
              {vendor.email && (
                <div>
                  <label className="form-label text-sm font-medium text-gray-500 block mb-1">Email</label>
                  <p className="text-gray-900">{vendor.email}</p>
                </div>
              )}
              {vendor.city && (
                <div>
                  <label className="form-label text-sm font-medium text-gray-500 block mb-1">City</label>
                  <p className="text-gray-900">{vendor.city}</p>
                </div>
              )}
              {vendor.address && (
                <div>
                  <label className="form-label text-sm font-medium text-gray-500 block mb-1">Address</label>
                  <p className="text-gray-900">{vendor.address}</p>
                </div>
              )}
              <div>
                <label className="form-label text-sm font-medium text-gray-500 block mb-1">Status</label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    vendor.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {vendor.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default VendorDetailsDrawer;
