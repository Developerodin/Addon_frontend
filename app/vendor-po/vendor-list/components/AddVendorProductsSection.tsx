"use client";

import React from "react";
import Link from "next/link";
import type { CatalogProductPick } from "./CatalogProductPickerDrawer";
import { CRM } from "../crmUiClasses";

interface AddVendorProductsSectionProps {
  selectedProducts: CatalogProductPick[];
  onOpenPicker: () => void;
  onRemove: (id: string) => void;
}

const AddVendorProductsSection: React.FC<AddVendorProductsSectionProps> = ({
  selectedProducts,
  onOpenPicker,
  onRemove,
}) => (
  <div className="border-t border-gray-100 pt-4 mt-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
      <div>
        <h3 className="text-sm font-bold text-gray-800">Catalog products</h3>
        <p className="text-[11px] text-[#7987A1] mt-0.5">
          Optional. Same data as{" "}
          <Link href="/catalog/items" target="_blank" rel="noopener noreferrer" className={CRM.linkAccent}>
            Catalog → Items
          </Link>
          .
        </p>
      </div>
      <button type="button" className={`${CRM.btnPrimary} shrink-0`} onClick={onOpenPicker}>
        <i className="ri-stack-line text-xs" />
        <span>Add from catalog</span>
      </button>
    </div>
    {selectedProducts.length === 0 ? (
      <p className="text-[11px] text-[#7987A1] py-2">No products linked yet.</p>
    ) : (
      <div className={CRM.tableWrap}>
        <table className={CRM.table}>
          <thead>
            <tr className={CRM.theadTr}>
              <th className={CRM.th}>Name</th>
              <th className={CRM.th}>Factory code</th>
              <th className={CRM.th}>Vendor code</th>
              <th className={CRM.thRight}>Action</th>
            </tr>
          </thead>
          <tbody>
            {selectedProducts.map((p) => (
              <tr key={p.id} className={CRM.tbodyTr}>
                <td className={`${CRM.td} font-medium`}>{p.name}</td>
                <td className={`${CRM.td} ${CRM.tdMuted} font-mono text-[11px]`}>{p.factoryCode ?? "—"}</td>
                <td className={`${CRM.td} ${CRM.tdMuted} font-mono text-[11px]`}>{p.vendorCode ?? "—"}</td>
                <td className={CRM.td}>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className={CRM.iconDanger}
                      title="Remove"
                      onClick={() => onRemove(p.id)}
                    >
                      <i className="ri-delete-bin-line text-xs" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default AddVendorProductsSection;
