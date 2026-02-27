"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { VendorFormData } from "../types";

interface ContactRow {
  id: string;
  contactName: string;
  phone: string;
  email: string;
}

interface AddVendorFormData {
  vendorCode: string;
  vendorName: string;
  status: "active" | "inactive";
  notes: string;
  city: string;
  address: string;
  contacts: ContactRow[];
}

const initialContact: () => ContactRow = () => ({
  id: String(Date.now()),
  contactName: "",
  phone: "",
  email: "",
});

const AddVendorPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<AddVendorFormData>({
    vendorCode: "",
    vendorName: "",
    status: "active",
    notes: "",
    city: "",
    address: "",
    contacts: [initialContact()],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.vendorCode.trim()) {
      newErrors.vendorCode = "Vendor Code is required";
    }
    if (!formData.vendorName.trim()) {
      newErrors.vendorName = "Vendor Name is required";
    }
    const firstContact = formData.contacts[0];
    if (!firstContact.contactName.trim()) {
      newErrors.contact_0_name = "At least one contact name is required";
    }
    if (!firstContact.phone.trim()) {
      newErrors.contact_0_phone = "At least one contact phone is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContactChange = (contactId: string, field: keyof ContactRow, value: string) => {
    setFormData((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) =>
        c.id === contactId ? { ...c, [field]: value } : c
      ),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      const key = `contact_${formData.contacts.findIndex((c) => c.id === contactId)}_${field}`;
      if (next[key]) delete next[key];
      return next;
    });
  };

  const addContact = () => {
    setFormData((prev) => ({
      ...prev,
      contacts: [...prev.contacts, initialContact()],
    }));
  };

  const removeContact = (contactId: string) => {
    if (formData.contacts.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((c) => c.id !== contactId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }
    setIsSubmitting(true);
    try {
      const primary = formData.contacts[0];
      const payload: VendorFormData = {
        vendorCode: formData.vendorCode.trim(),
        vendorName: formData.vendorName.trim(),
        contactPerson: primary.contactName.trim(),
        phone: primary.phone.trim(),
        email: primary.email.trim() || undefined,
        city: formData.city.trim() || undefined,
        address: formData.address.trim() || undefined,
        status: formData.status,
      };
      // TODO: replace with API call when backend is ready, e.g. await vendorService.create(payload)
      const newVendor = {
        ...payload,
        id: String(Date.now()),
      };
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("vendor-po-new-vendor", JSON.stringify(newVendor));
      }
      toast.success("Vendor created successfully!");
      router.push("/vendor-po/vendor-list");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create vendor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      vendorCode: "",
      vendorName: "",
      status: "active",
      notes: "",
      city: "",
      address: "",
      contacts: [initialContact()],
    });
    setErrors({});
  };

  return (
    <div className="main-content">
      <Seo title="Add New Vendor" />

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          {/* Page Header - same as Add New Production Order */}
          <div className="box !bg-transparent border-0 shadow-none mb-4">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-xl font-semibold">Add New Vendor</h1>
                <HelpIcon
                  title="Add New Vendor"
                  content={
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-base mb-1">What is this page?</h4>
                        <p className="text-gray-700 text-sm">
                          Create a new vendor with code, name, status, and contact persons.
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-base mb-1">Required fields</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                          <li><strong>Vendor Code:</strong> Unique code for the vendor</li>
                          <li><strong>Vendor Name:</strong> Display name</li>
                          <li><strong>Status:</strong> Active or Inactive</li>
                          <li><strong>Contact:</strong> At least one contact name and phone</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              </div>
              <div className="box-tools">
                <Link
                  href="/vendor-po/vendor-list"
                  className="ti-btn ti-btn-secondary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                >
                  <i className="ri-arrow-left-line"></i>
                  <span>Back</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Form - same box structure as Production Order */}
          <div className="box">
            <div className="box-body p-4">
              <form onSubmit={handleSubmit}>
                {/* Top section: Vendor Code, Name, Status + Notes (optional) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="form-label text-sm">Vendor Code *</label>
                    <input
                      type="text"
                      className={`form-control form-control-sm text-xs py-1 px-2 h-8 ${errors.vendorCode ? "border-danger" : ""}`}
                      value={formData.vendorCode}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, vendorCode: e.target.value }));
                        if (errors.vendorCode) setErrors((prev) => ({ ...prev, vendorCode: "" }));
                      }}
                      placeholder="e.g. VND001"
                    />
                    {errors.vendorCode && (
                      <div className="text-danger text-xs mt-1">{errors.vendorCode}</div>
                    )}
                  </div>
                  <div>
                    <label className="form-label text-sm">Vendor Name *</label>
                    <input
                      type="text"
                      className={`form-control form-control-sm text-xs py-1 px-2 h-8 ${errors.vendorName ? "border-danger" : ""}`}
                      value={formData.vendorName}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, vendorName: e.target.value }));
                        if (errors.vendorName) setErrors((prev) => ({ ...prev, vendorName: "" }));
                      }}
                      placeholder="Vendor name"
                    />
                    {errors.vendorName && (
                      <div className="text-danger text-xs mt-1">{errors.vendorName}</div>
                    )}
                  </div>
                  <div>
                    <label className="form-label text-sm">Status *</label>
                    <select
                      className="form-select form-select-sm text-xs py-1 px-2 h-8"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value as "active" | "inactive",
                        }))
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="form-label text-sm">City</label>
                    <input
                      type="text"
                      className="form-control form-control-sm text-xs py-1 px-2 h-8"
                      value={formData.city}
                      onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="form-label text-sm">Notes (optional)</label>
                    <textarea
                      className="form-control form-control-sm text-xs py-1 px-2"
                      rows={1}
                      placeholder="Add vendor-level notes..."
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="form-label text-sm">Address (optional)</label>
                    <input
                      type="text"
                      className="form-control form-control-sm text-xs py-1 px-2 h-8"
                      value={formData.address}
                      onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Full address"
                    />
                  </div>
                </div>

                {/* Contact Persons - same table pattern as Articles */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">
                      Contact Persons ({formData.contacts.length})
                    </h3>
                    <button
                      type="button"
                      onClick={addContact}
                      className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                      title="Add Contact"
                    >
                      <i className="ri-add-line"></i>
                      <span>Add Contact</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full table-fixed">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="w-48 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Contact Name
                          </th>
                          <th className="w-40 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phone
                          </th>
                          <th className="w-56 px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="w-16 px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.contacts.map((contact, index) => (
                          <tr key={contact.id} className="hover:bg-gray-50">
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                className={`form-control form-control-sm w-full text-xs py-1 px-2 h-8 ${
                                  errors[`contact_${index}_name`] ? "border-danger" : ""
                                }`}
                                value={contact.contactName}
                                onChange={(e) =>
                                  handleContactChange(contact.id, "contactName", e.target.value)
                                }
                                placeholder="Full name"
                              />
                              {errors[`contact_${index}_name`] && (
                                <div className="text-danger text-xs mt-1 truncate">
                                  {errors[`contact_${index}_name`]}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                className={`form-control form-control-sm w-full text-xs py-1 px-2 h-8 ${
                                  errors[`contact_${index}_phone`] ? "border-danger" : ""
                                }`}
                                value={contact.phone}
                                onChange={(e) =>
                                  handleContactChange(contact.id, "phone", e.target.value)
                                }
                                placeholder="Phone"
                              />
                              {errors[`contact_${index}_phone`] && (
                                <div className="text-danger text-xs mt-1 truncate">
                                  {errors[`contact_${index}_phone`]}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="email"
                                className="form-control form-control-sm w-full text-xs py-1 px-2 h-8"
                                value={contact.email}
                                onChange={(e) =>
                                  handleContactChange(contact.id, "email", e.target.value)
                                }
                                placeholder="Email"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              {formData.contacts.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeContact(contact.id)}
                                  className="ti-btn ti-btn-danger inline-flex items-center justify-center w-8 h-8 shrink-0"
                                  title="Remove Contact"
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Action Buttons - same as Production Order */}
                <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t mt-6 gap-4">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light inline-flex items-center justify-center gap-2 py-2 px-4 whitespace-nowrap w-full sm:w-auto"
                    onClick={handleReset}
                  >
                    <i className="ri-refresh-line"></i>
                    <span>Reset</span>
                  </button>

                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Link
                      href="/vendor-po/vendor-list"
                      className="ti-btn ti-btn-secondary inline-flex items-center justify-center gap-2 py-2 px-4 whitespace-nowrap w-full sm:w-auto"
                    >
                      <i className="ri-close-line"></i>
                      <span>Cancel</span>
                    </Link>
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary inline-flex items-center justify-center gap-2 py-2 px-4 whitespace-nowrap w-full sm:w-auto"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <i className="ri-add-line"></i>
                          <span>Create Vendor</span>
                        </>
                      )}
                    </button>
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

export default AddVendorPage;
