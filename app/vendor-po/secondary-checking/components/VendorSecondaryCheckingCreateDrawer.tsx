"use client";

import React from "react";
import { CRM } from "../../vendor-list/crmUiClasses";
import type { CreateProductionFlowPayload } from "@/shared/services/vendorProductionFlowService";
import type { VendorManagementDocument } from "@/shared/services/vendorManagementService";
import type { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";

type Props = {
  open: boolean;
  onClose: () => void;
  createData: CreateProductionFlowPayload;
  setCreateData: React.Dispatch<React.SetStateAction<CreateProductionFlowPayload>>;
  vendors: VendorManagementDocument[];
  vendorPos: VendorPurchaseOrder[];
  onSubmit: () => void;
};

/**
 * Right-slide drawer for creating a vendor production batch (matches production floor drawer UX).
 */
export function VendorSecondaryCheckingCreateDrawer({
  open,
  onClose,
  createData,
  setCreateData,
  vendors,
  vendorPos,
  onSubmit,
}: Props) {
  if (!open) return null;

  return (
    <>
      <div className={CRM.drawerBackdrop} onClick={onClose} aria-hidden />
      <div className={CRM.drawerShellSm} role="dialog" aria-modal="true" aria-labelledby="vendor-sc-create-title">
        <div className={CRM.drawerHeaderBar}>
          <h2 id="vendor-sc-create-title" className={CRM.drawerTitle}>
            Create production batch
          </h2>
          <button type="button" onClick={onClose} className={CRM.drawerCloseBtn} aria-label="Close">
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className={CRM.drawerBodyScroll}>
          <p className={CRM.drawerHint}>
            <strong>New batch:</strong> pick vendor and optional PO, set reference and planned quantity, then create. You can
            record secondary-checking counts from the list after.
          </p>
          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>Vendor &amp; PO</div>
            <div className="p-3 space-y-3">
              <div>
                <label className={CRM.label}>
                  Vendor <span className="text-red-500">*</span>
                </label>
                <select
                  className={CRM.select}
                  value={createData.vendor}
                  onChange={(e) => setCreateData((d) => ({ ...d, vendor: e.target.value }))}
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.header.vendorName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={CRM.label}>Vendor PO</label>
                <select
                  className={CRM.select}
                  value={createData.vendorPurchaseOrder}
                  disabled={!createData.vendor}
                  onChange={(e) => setCreateData((d) => ({ ...d, vendorPurchaseOrder: e.target.value }))}
                >
                  <option value="">Select PO</option>
                  {vendorPos.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.vpoNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className={CRM.drawerSection}>
            <div className={CRM.drawerSectionHead}>Reference &amp; quantity</div>
            <div className="p-3 grid grid-cols-1 gap-3">
              <div>
                <label className={CRM.label}>Reference / batch code</label>
                <input
                  type="text"
                  className={CRM.input}
                  placeholder="e.g. BATCH-001"
                  value={createData.referenceCode}
                  onChange={(e) => setCreateData((d) => ({ ...d, referenceCode: e.target.value }))}
                />
              </div>
              <div>
                <label className={CRM.label}>Planned quantity</label>
                <input
                  type="number"
                  className={CRM.input}
                  value={createData.plannedQuantity}
                  onChange={(e) => setCreateData((d) => ({ ...d, plannedQuantity: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className={CRM.label}>Remarks</label>
                <textarea
                  className={`${CRM.input} h-20 resize-none`}
                  placeholder="Optional notes about this batch..."
                  value={createData.remarks}
                  onChange={(e) => setCreateData((d) => ({ ...d, remarks: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>
        <div className={CRM.drawerFooterBar}>
          <button type="button" onClick={onClose} className={CRM.btnDrawerCancel}>
            Cancel
          </button>
          <button type="button" onClick={onSubmit} className={CRM.btnPrimary}>
            <i className="ri-add-line" />
            Create flow
          </button>
        </div>
      </div>
    </>
  );
}
