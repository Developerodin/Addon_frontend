"use client";
import React, { useState, useMemo, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { Vendor, VendorFormData } from "./types";
import VendorViewModal from "./components/VendorViewModal";
import VendorFormModal from "./components/VendorFormModal";
import { toast } from "react-hot-toast";

// Mock data – replace with API when backend is ready
const MOCK_VENDORS: Vendor[] = [
  {
    id: "1",
    vendorCode: "VND001",
    vendorName: "ABC Textiles Ltd",
    contactPerson: "Raj Kumar",
    phone: "+91 98765 43210",
    city: "Coimbatore",
    status: "active",
    email: "raj@abctextiles.com",
    address: "123 Industrial Area, Coimbatore",
  },
  {
    id: "2",
    vendorCode: "VND002",
    vendorName: "Premier Yarn Co",
    contactPerson: "Sita Devi",
    phone: "+91 87654 32109",
    city: "Tiruppur",
    status: "active",
    email: "sita@premieryarn.com",
  },
  {
    id: "3",
    vendorCode: "VND003",
    vendorName: "Global Fibres Inc",
    contactPerson: "Amit Shah",
    phone: "+91 76543 21098",
    city: "Chennai",
    status: "inactive",
  },
];

const VendorListPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [searchQuery, setSearchQuery] = useState("");

  // After mount, merge any vendor just created from Add page (avoids hydration mismatch)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("vendor-po-new-vendor");
      if (saved) {
        sessionStorage.removeItem("vendor-po-new-vendor");
        const newVendor = JSON.parse(saved) as Vendor;
        setVendors((prev) => [newVendor, ...prev]);
      }
    } catch (_) {}
  }, []);
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);

  const filteredVendors = useMemo(() => {
    let list = vendors;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.vendorName.toLowerCase().includes(q) ||
          v.vendorCode.toLowerCase().includes(q) ||
          v.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
          (v.contactPerson && v.contactPerson.toLowerCase().includes(q))
      );
    }
    if (statusFilter) {
      list = list.filter((v) => v.status === statusFilter);
    }
    return list;
  }, [vendors, searchQuery, statusFilter]);

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "";
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
  };

  const handleView = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedVendor(null);
  };

  const handleEditFromViewModal = (vendor: Vendor) => {
    setShowViewModal(false);
    setSelectedVendor(null);
    setEditVendor(vendor);
    setFormOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditVendor(vendor);
    setFormOpen(true);
  };

  const handleSaveVendor = (data: VendorFormData) => {
    if (editVendor) {
      setVendors((prev) =>
        prev.map((v) =>
          v.id === editVendor.id
            ? { ...v, ...data, id: v.id }
            : v
        )
      );
      toast.success("Vendor updated successfully");
    } else {
      const newVendor: Vendor = {
        ...data,
        id: String(Date.now()),
      };
      setVendors((prev) => [newVendor, ...prev]);
      toast.success("Vendor added successfully");
    }
    setFormOpen(false);
    setEditVendor(null);
  };

  const handleDisableEnable = (vendor: Vendor) => {
    const newStatus = vendor.status === "active" ? "inactive" : "active";
    const action = newStatus === "inactive" ? "Disable" : "Enable";
    const confirmed = window.confirm(
      `Are you sure you want to ${action.toLowerCase()} "${vendor.vendorName}"?`
    );
    if (confirmed) {
      setVendors((prev) =>
        prev.map((v) =>
          v.id === vendor.id ? { ...v, status: newStatus } : v
        )
      );
      toast.success(`Vendor ${newStatus === "inactive" ? "disabled" : "enabled"} successfully`);
      if (selectedVendor?.id === vendor.id) {
        setSelectedVendor((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    }
  };

  return (
    <div className="main-content">
      <Seo title="Vendor Master" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header - same structure as Stores/Users */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Vendor Master</h1>
              </div>
              <div className="box-tools flex items-center space-x-2">
                <Link
                  href="/vendor-po/vendor-list/add"
                  className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                >
                  <i className="ri-add-line"></i>
                  <span>Add Vendor</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box - same structure as Stores/Users */}
          <div className="box">
            <div className="box-body">
              {/* Search and Filters Header */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-3 flex-shrink-0 order-2 sm:order-1">
                    <button
                      type="button"
                      className={`ti-btn inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap ${showFilters ? "ti-btn-primary" : "ti-btn-secondary"}`}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <i className="ri-filter-3-line"></i>
                      <span>Filters</span>
                      {hasActiveFilters && (
                        <span className="badge bg-white text-primary">●</span>
                      )}
                    </button>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                        onClick={clearFilters}
                      >
                        <i className="ri-close-line"></i>
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                  <div className="w-full sm:w-80 lg:w-96 order-1 sm:order-2">
                    <div className="relative">
                      <input
                        type="text"
                        className="form-control py-3 pl-10 pr-4 w-full"
                        placeholder="Search by Vendor Name, Code or Phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <i className="ri-search-line text-lg absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    </div>
                  </div>
                </div>

                {/* Filters Panel - same as Users/Stores */}
                {showFilters && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="form-label text-sm font-medium">Status</label>
                        <select
                          className="form-select"
                          value={statusFilter}
                          onChange={(e) =>
                            setStatusFilter(
                              (e.target.value as "" | "active" | "inactive") || ""
                            )
                          }
                        >
                          <option value="">All Status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Table - same structure as Users/Stores */}
              <div className="table-responsive">
                <table className="table whitespace-nowrap min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Vendor Code</th>
                      <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Vendor Name</th>
                      <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Contact Person</th>
                      <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Phone</th>
                      <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">City</th>
                      <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Status</th>
                      <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVendors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12">
                          <div className="text-center py-12">
                            <div className="text-gray-400 mb-4">
                              <i className="ri-user-search-line text-6xl"></i>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
                            <p className="text-gray-500 mb-4">
                              {hasActiveFilters
                                ? "Try adjusting your filters or search terms"
                                : "Get started by adding your first vendor"}
                            </p>
                            {!hasActiveFilters && (
                              <Link
                                href="/vendor-po/vendor-list/add"
                                className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                              >
                                <i className="ri-add-line"></i>
                                <span>Add First Vendor</span>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredVendors.map((vendor) => (
                        <tr
                          key={vendor.id}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-4 py-4 font-medium text-gray-900">
                            {vendor.vendorCode}
                          </td>
                          <td className="px-4 py-4 text-gray-900">{vendor.vendorName}</td>
                          <td className="px-4 py-4 text-gray-600">
                            {vendor.contactPerson}
                          </td>
                          <td className="px-4 py-4 text-gray-600">{vendor.phone}</td>
                          <td className="px-4 py-4 text-gray-600">
                            {vendor.city || "—"}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                vendor.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {vendor.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="ti-btn ti-btn-info ti-btn-sm inline-flex items-center justify-center w-8 h-8 shrink-0"
                                title="View"
                                onClick={() => handleView(vendor)}
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                              <button
                                type="button"
                                className="ti-btn ti-btn-primary ti-btn-sm inline-flex items-center justify-center w-8 h-8 shrink-0"
                                title="Edit"
                                onClick={() => handleEdit(vendor)}
                              >
                                <i className="ri-edit-line"></i>
                              </button>
                              <button
                                type="button"
                                className={`ti-btn ti-btn-sm inline-flex items-center justify-center w-8 h-8 shrink-0 ${
                                  vendor.status === "active"
                                    ? "ti-btn-warning"
                                    : "ti-btn-success"
                                }`}
                                title={vendor.status === "active" ? "Disable" : "Enable"}
                                onClick={() => handleDisableEnable(vendor)}
                              >
                                <i
                                  className={
                                    vendor.status === "active"
                                      ? "ri-forbid-line"
                                      : "ri-check-line"
                                  }
                                ></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Vendor Modal - same pattern as Production Order View */}
      {showViewModal && selectedVendor && (
        <VendorViewModal
          vendor={selectedVendor}
          onClose={closeViewModal}
          onEdit={handleEditFromViewModal}
        />
      )}

      <VendorFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditVendor(null);
        }}
        onSave={handleSaveVendor}
        editVendor={editVendor}
      />
    </div>
  );
};

export default VendorListPage;
