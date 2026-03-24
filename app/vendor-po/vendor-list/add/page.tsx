"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { createVendor } from "@/shared/services/vendorManagementService";
import CatalogProductPickerDrawer, { type CatalogProductPick } from "../components/CatalogProductPickerDrawer";
import VendorFormBody from "../components/VendorFormBody";
import { createEmptyContactRow, type VendorFormData } from "../vendorFormTypes";
import { validateVendorForm } from "../vendorFormUtils";
import { CRM } from "../crmUiClasses";

const AddVendorPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<VendorFormData>({
    vendorCode: "",
    vendorName: "",
    status: "active",
    notes: "",
    city: "",
    state: "",
    address: "",
    gstin: "",
    contacts: [createEmptyContactRow()],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<CatalogProductPick[]>([]);
  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false);

  const handleContactChange = (contactId: string, field: "contactName" | "phone" | "email", value: string) => {
    setFormData((prev) => {
      const idx = prev.contacts.findIndex((c) => c.id === contactId);
      const errKey =
        field === "contactName"
          ? `contact_${idx}_name`
          : field === "phone"
            ? `contact_${idx}_phone`
            : `contact_${idx}_email`;
      setErrors((e) => {
        const next = { ...e };
        if (next[errKey]) delete next[errKey];
        return next;
      });
      return {
        ...prev,
        contacts: prev.contacts.map((c) => (c.id === contactId ? { ...c, [field]: value } : c)),
      };
    });
  };

  const addContact = () => {
    setFormData((prev) => ({
      ...prev,
      contacts: [...prev.contacts, createEmptyContactRow()],
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
    const v = validateVendorForm(formData);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      toast.error("Please fix the form errors");
      return;
    }
    setIsSubmitting(true);
    try {
      const gstinTrim = formData.gstin.trim();
      await createVendor({
        header: {
          vendorCode: formData.vendorCode.trim(),
          vendorName: formData.vendorName.trim(),
          status: formData.status,
          city: formData.city.trim(),
          state: formData.state.trim(),
          notes: formData.notes.trim(),
          address: formData.address.trim(),
          ...(gstinTrim ? { gstin: gstinTrim } : {}),
        },
        contactPersons: formData.contacts.map((c) => ({
          contactName: c.contactName.trim(),
          phone: c.phone.trim(),
          email: c.email.trim() || undefined,
        })),
        products: selectedProducts.map((p) => p.id),
      });
      toast.success("Vendor created successfully!");
      router.push("/vendor-po/vendor-list");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create vendor";
      toast.error(msg);
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
      state: "",
      address: "",
      gstin: "",
      contacts: [createEmptyContactRow()],
    });
    setSelectedProducts([]);
    setErrors({});
  };

  return (
    <div className={CRM.mainContent}>
      <Seo title="Add New Vendor" />

      <div className={CRM.titleRow}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={CRM.titleAccent} aria-hidden />
          <h1 className={CRM.pageTitle}>Add New Vendor</h1>
          <HelpIcon
            title="Add New Vendor"
            content={
              <div className="space-y-3">
                <div>
                  <h4 className="text-lg font-semibold mb-2">What is this page?</h4>
                  <p className="text-gray-700 text-sm">
                    Create a new vendor with code, name, status, GSTIN, address, contact persons, and optional
                    catalog products.
                  </p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">Required fields</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                    <li>
                      <strong>Vendor Code:</strong> Unique code for the vendor
                    </li>
                    <li>
                      <strong>Vendor Name:</strong> Display name
                    </li>
                    <li>
                      <strong>Status:</strong> Active or Inactive
                    </li>
                    <li>
                      <strong>Contact:</strong> At least one contact name and phone (10–15 digits)
                    </li>
                    <li>
                      <strong>Products:</strong> Optional — link catalog items via &quot;Add from catalog&quot;
                    </li>
                  </ul>
                </div>
              </div>
            }
          />
        </div>
        <Link href="/vendor-po/vendor-list" className={CRM.btnSecondary}>
          <i className="ri-arrow-left-line text-xs" />
          <span>Back</span>
        </Link>
      </div>

      <div className={CRM.card}>
        <div className={CRM.cardBody}>
          <form onSubmit={handleSubmit}>
            <VendorFormBody
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              setErrors={setErrors}
              handleContactChange={handleContactChange}
              addContact={addContact}
              removeContact={removeContact}
              selectedProducts={selectedProducts}
              onOpenCatalogPicker={() => setCatalogPickerOpen(true)}
              onRemoveProduct={(id) => setSelectedProducts((prev) => prev.filter((x) => x.id !== id))}
            />

            <div className="flex flex-col sm:flex-row justify-between items-center pt-4 mt-4 border-t border-gray-100 gap-3">
              <button type="button" className={CRM.btnNeutral} onClick={handleReset}>
                <i className="ri-refresh-line text-xs" />
                <span>Reset</span>
              </button>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Link href="/vendor-po/vendor-list" className={`${CRM.btnSecondary} w-full sm:w-auto justify-center`}>
                  <i className="ri-close-line text-xs" />
                  <span>Cancel</span>
                </Link>
                <button type="submit" className={`${CRM.btnPrimary} w-full sm:w-auto`} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-add-line text-xs" />
                      <span>Create Vendor</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <CatalogProductPickerDrawer
        open={catalogPickerOpen}
        onClose={() => setCatalogPickerOpen(false)}
        value={selectedProducts}
        onApply={setSelectedProducts}
      />
    </div>
  );
};

export default AddVendorPage;
