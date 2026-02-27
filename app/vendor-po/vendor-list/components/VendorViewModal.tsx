"use client";
import React from "react";
import { Vendor } from "../types";

interface VendorViewModalProps {
  vendor: Vendor;
  onClose: () => void;
  onEdit?: (vendor: Vendor) => void;
}

const VendorViewModal: React.FC<VendorViewModalProps> = ({ vendor, onClose, onEdit }) => {
  const getStatusBadge = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header - same as OrderViewModal */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Vendor Details</h2>
            <p className="text-gray-600">
              Vendor Code: {vendor.vendorCode} {vendor.vendorName && `• ${vendor.vendorName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        {/* Vendor Info - same pattern as Order Info in OrderViewModal */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Vendor Code</label>
              <div className="mt-1 text-gray-900 font-medium">{vendor.vendorCode}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Vendor Name</label>
              <div className="mt-1 text-gray-900 font-medium">{vendor.vendorName}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                    vendor.status
                  )}`}
                >
                  {vendor.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Contact Person</label>
              <div className="mt-1 text-gray-900">{vendor.contactPerson}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <div className="mt-1 text-gray-900">{vendor.phone}</div>
            </div>
            {vendor.email && (
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <div className="mt-1 text-gray-900">{vendor.email}</div>
              </div>
            )}
            {vendor.city && (
              <div>
                <label className="text-sm font-medium text-gray-500">City</label>
                <div className="mt-1 text-gray-900">{vendor.city}</div>
              </div>
            )}
          </div>

          {vendor.address && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="mt-1 text-gray-900">{vendor.address}</p>
            </div>
          )}
        </div>

        {/* Content area - single view (no tabs for vendor) */}
        <div className="p-6 max-h-64 overflow-y-auto">
          <div className="text-sm text-gray-500">
            View-only. Use Edit to update this vendor.
          </div>
        </div>

        {/* Footer - same as OrderViewModal */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(vendor)}
              className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
            >
              <i className="ri-edit-line"></i>
              <span>Edit</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ti-btn ti-btn-secondary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
          >
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorViewModal;
