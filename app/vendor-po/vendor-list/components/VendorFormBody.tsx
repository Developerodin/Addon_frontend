"use client";

import React from "react";
import type { VendorFormData } from "../vendorFormTypes";
import type { CatalogProductPick } from "./CatalogProductPickerDrawer";
import AddVendorProductsSection from "./AddVendorProductsSection";
import { CRM } from "../crmUiClasses";

interface VendorFormBodyProps {
  formData: VendorFormData;
  setFormData: React.Dispatch<React.SetStateAction<VendorFormData>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  vendorCodeReadOnly?: boolean;
  handleContactChange: (contactId: string, field: "contactName" | "phone" | "email", value: string) => void;
  addContact: () => void;
  removeContact: (contactId: string) => void;
  selectedProducts: CatalogProductPick[];
  onOpenCatalogPicker: () => void;
  onRemoveProduct: (id: string) => void;
}

function fieldClass(base: string, hasError: boolean): string {
  return `${base} ${hasError ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}`;
}

/** Shared vendor fields: header, contacts, catalog products (CRM spec). */
const VendorFormBody: React.FC<VendorFormBodyProps> = ({
  formData,
  setFormData,
  errors,
  setErrors,
  vendorCodeReadOnly,
  handleContactChange,
  addContact,
  removeContact,
  selectedProducts,
  onOpenCatalogPicker,
  onRemoveProduct,
}) => (
  <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
      <div>
        <label className={CRM.label}>Vendor Code *</label>
        <input
          type="text"
          className={fieldClass(
            `${CRM.input} ${vendorCodeReadOnly ? "bg-gray-50" : ""}`,
            !!errors.vendorCode
          )}
          value={formData.vendorCode}
          readOnly={vendorCodeReadOnly}
          title={vendorCodeReadOnly ? "Vendor code cannot be changed" : undefined}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, vendorCode: e.target.value }));
            if (errors.vendorCode) setErrors((prev) => ({ ...prev, vendorCode: "" }));
          }}
          placeholder="e.g. VND001"
        />
        {errors.vendorCode && <div className="text-red-600 text-[10px] mt-1">{errors.vendorCode}</div>}
      </div>
      <div>
        <label className={CRM.label}>Vendor Name *</label>
        <input
          type="text"
          className={fieldClass(CRM.input, !!errors.vendorName)}
          value={formData.vendorName}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, vendorName: e.target.value }));
            if (errors.vendorName) setErrors((prev) => ({ ...prev, vendorName: "" }));
          }}
          placeholder="Vendor name"
        />
        {errors.vendorName && <div className="text-red-600 text-[10px] mt-1">{errors.vendorName}</div>}
      </div>
      <div>
        <label className={CRM.label}>Status *</label>
        <select
          className={CRM.select}
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
      <div>
        <label className={CRM.label}>City</label>
        <input
          type="text"
          className={CRM.input}
          value={formData.city}
          onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
          placeholder="City"
        />
      </div>
      <div>
        <label className={CRM.label}>State</label>
        <input
          type="text"
          className={CRM.input}
          value={formData.state}
          onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
          placeholder="State"
        />
      </div>
      <div>
        <label className={CRM.label}>GSTIN (optional)</label>
        <input
          type="text"
          className={fieldClass(CRM.input, !!errors.gstin)}
          value={formData.gstin}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }));
            if (errors.gstin) setErrors((prev) => ({ ...prev, gstin: "" }));
          }}
          placeholder="15-character GSTIN or leave empty"
          maxLength={15}
        />
        {errors.gstin && <div className="text-red-600 text-[10px] mt-1">{errors.gstin}</div>}
      </div>
      <div className="lg:col-span-3">
        <label className={CRM.label}>Notes (optional)</label>
        <textarea
          className={`${CRM.input} min-h-[2.5rem]`}
          rows={2}
          placeholder="Add vendor-level notes..."
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
        />
      </div>
      <div className="lg:col-span-3">
        <label className={CRM.label}>Address (optional)</label>
        <input
          type="text"
          className={CRM.input}
          value={formData.address}
          onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
          placeholder="Full address"
        />
      </div>
    </div>

    <div className="border-t border-gray-100 pt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-gray-800">Contact Persons ({formData.contacts.length})</h3>
        <button type="button" onClick={addContact} className={CRM.btnPrimary} title="Add Contact">
          <i className="ri-add-line text-xs" />
          <span>Add Contact</span>
        </button>
      </div>

      <div className={CRM.tableWrap}>
        <table className={`${CRM.table} table-fixed`}>
          <thead>
            <tr className={CRM.theadTr}>
              <th className={`${CRM.th} w-[28%]`}>Contact Name</th>
              <th className={`${CRM.th} w-[22%]`}>Phone</th>
              <th className={`${CRM.th} w-[38%]`}>Email</th>
              <th className={`${CRM.th} text-center w-16`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {formData.contacts.map((contact, index) => (
              <tr key={contact.id} className={CRM.tbodyTr}>
                <td className={CRM.td}>
                  <input
                    type="text"
                    className={fieldClass(`${CRM.input} w-full`, !!errors[`contact_${index}_name`])}
                    value={contact.contactName}
                    onChange={(e) => handleContactChange(contact.id, "contactName", e.target.value)}
                    placeholder="Full name"
                  />
                  {errors[`contact_${index}_name`] && (
                    <div className="text-red-600 text-[10px] mt-0.5 truncate">
                      {errors[`contact_${index}_name`]}
                    </div>
                  )}
                </td>
                <td className={CRM.td}>
                  <input
                    type="text"
                    className={fieldClass(`${CRM.input} w-full`, !!errors[`contact_${index}_phone`])}
                    value={contact.phone}
                    onChange={(e) => handleContactChange(contact.id, "phone", e.target.value)}
                    placeholder="Phone"
                  />
                  {errors[`contact_${index}_phone`] && (
                    <div className="text-red-600 text-[10px] mt-0.5 truncate">
                      {errors[`contact_${index}_phone`]}
                    </div>
                  )}
                </td>
                <td className={CRM.td}>
                  <input
                    type="email"
                    className={`${CRM.input} w-full`}
                    value={contact.email}
                    onChange={(e) => handleContactChange(contact.id, "email", e.target.value)}
                    placeholder="Email"
                  />
                </td>
                <td className={`${CRM.td} text-center`}>
                  {formData.contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(contact.id)}
                      className={CRM.iconDanger}
                      title="Remove Contact"
                    >
                      <i className="ri-delete-bin-line text-xs" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <AddVendorProductsSection
      selectedProducts={selectedProducts}
      onOpenPicker={onOpenCatalogPicker}
      onRemove={onRemoveProduct}
    />
  </>
);

export default VendorFormBody;
