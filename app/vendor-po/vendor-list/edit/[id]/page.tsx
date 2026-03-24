"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { getVendor, patchVendor } from "@/shared/services/vendorManagementService";
import CatalogProductPickerDrawer, { type CatalogProductPick } from "../../components/CatalogProductPickerDrawer";
import VendorFormBody from "../../components/VendorFormBody";
import { createEmptyContactRow, type VendorFormData } from "../../vendorFormTypes";
import {
  enrichCatalogPicks,
  mapDocProductsToCatalogPicks,
  validateVendorForm,
  vendorManagementDocToForm,
} from "../../vendorFormUtils";
import { CRM } from "../../crmUiClasses";

const EditVendorPage = () => {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [formData, setFormData] = useState<VendorFormData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<CatalogProductPick[]>([]);
  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false);

  const loadVendor = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const doc = await getVendor(id, { populate: "products" });
      setFormData(vendorManagementDocToForm(doc));
      const picks = mapDocProductsToCatalogPicks(doc);
      setSelectedProducts(await enrichCatalogPicks(picks));
      setErrors({});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/404|not\s*found/i.test(msg)) {
        setNotFound(true);
      } else {
        toast.error(msg || "Failed to load vendor");
      }
      setFormData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadVendor();
  }, [loadVendor]);

  const handleContactChange = (contactId: string, field: "contactName" | "phone" | "email", value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
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
    setFormData((prev) =>
      prev ? { ...prev, contacts: [...prev.contacts, createEmptyContactRow()] } : prev
    );
  };

  const removeContact = (contactId: string) => {
    setFormData((prev) => {
      if (!prev || prev.contacts.length <= 1) return prev;
      return { ...prev, contacts: prev.contacts.filter((c) => c.id !== contactId) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !id) return;
    const v = validateVendorForm(formData);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      toast.error("Please fix the form errors");
      return;
    }
    setIsSubmitting(true);
    try {
      const gstinTrim = formData.gstin.trim();
      await patchVendor(id, {
        header: {
          vendorCode: formData.vendorCode.trim(),
          vendorName: formData.vendorName.trim(),
          status: formData.status,
          city: formData.city.trim(),
          state: formData.state.trim(),
          notes: formData.notes.trim(),
          address: formData.address.trim(),
          gstin: gstinTrim,
        },
        contactPersons: formData.contacts.map((c) => ({
          contactName: c.contactName.trim(),
          phone: c.phone.trim(),
          email: c.email.trim() || undefined,
        })),
        products: selectedProducts.map((p) => p.id),
      });
      toast.success("Vendor updated successfully!");
      router.push("/vendor-po/vendor-list");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!id) {
    return (
      <div className={`${CRM.mainContent}`}>
        <p className="text-[12px] text-[#7987A1] mb-2">Invalid vendor id.</p>
        <Link href="/vendor-po/vendor-list" className={CRM.linkAccent}>
          Back to list
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={CRM.mainContent}>
        <div className={CRM.loadingWrap}>
          <div className={CRM.spinner} />
          <p className={CRM.loadingLabel}>Loading Data</p>
        </div>
      </div>
    );
  }

  if (notFound || !formData) {
    return (
      <div className={CRM.mainContent}>
        <Seo title="Vendor not found" />
        <div className={CRM.emptyWrap}>
          <h1 className={CRM.emptyTitle}>Vendor not found</h1>
          <Link href="/vendor-po/vendor-list" className={CRM.btnPrimary}>
            <i className="ri-arrow-left-line text-xs" />
            Back to Vendor Master
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={CRM.mainContent}>
      <Seo title={`Edit Vendor · ${formData.vendorName}`} />

      <div className={CRM.titleRow}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={CRM.titleAccent} aria-hidden />
          <h1 className={CRM.pageTitle}>Edit Vendor</h1>
          <HelpIcon
            title="Edit Vendor"
            content={
              <div className="space-y-2 text-sm text-gray-700">
                <p>Update vendor details, contacts, and catalog products. Vendor code cannot be changed.</p>
                <p>Product links replace the full list on save (same as create).</p>
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
              setFormData={setFormData as React.Dispatch<React.SetStateAction<VendorFormData>>}
              errors={errors}
              setErrors={setErrors}
              vendorCodeReadOnly
              handleContactChange={handleContactChange}
              addContact={addContact}
              removeContact={removeContact}
              selectedProducts={selectedProducts}
              onOpenCatalogPicker={() => setCatalogPickerOpen(true)}
              onRemoveProduct={(pid) => setSelectedProducts((prev) => prev.filter((x) => x.id !== pid))}
            />

            <div className="flex flex-col sm:flex-row justify-between items-center pt-4 mt-4 border-t border-gray-100 gap-3">
              <button type="button" className={CRM.btnNeutral} onClick={() => loadVendor()}>
                <i className="ri-refresh-line text-xs" />
                <span>Revert changes</span>
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
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line text-xs" />
                      <span>Save changes</span>
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

export default EditVendorPage;
