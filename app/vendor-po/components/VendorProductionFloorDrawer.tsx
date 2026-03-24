"use client";

import React from "react";
import { CRM } from "../vendor-list/crmUiClasses";

export type VendorProductionFloorDrawerProps = {
  open: boolean;
  title: string;
  titleId?: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  children: React.ReactNode;
  saving?: boolean;
  /** Purple intro strip (optional) */
  hint?: React.ReactNode;
};

/**
 * Wide right drawer shell — same chrome as production floor “Update order” / vendor secondary-checking process.
 */
export function VendorProductionFloorDrawer({
  open,
  title,
  titleId = "vendor-floor-drawer-title",
  onClose,
  onSave,
  saveLabel,
  children,
  saving = false,
  hint,
}: VendorProductionFloorDrawerProps) {
  if (!open) return null;

  return (
    <>
      <div
        className={CRM.drawerBackdrop}
        onClick={() => {
          if (!saving) onClose();
        }}
        aria-hidden
      />
      <div className={CRM.drawerShellLg} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={CRM.drawerHeaderBar}>
          <h2 id={titleId} className={CRM.drawerTitle}>
            {title}
          </h2>
          <button type="button" onClick={onClose} className={CRM.drawerCloseBtn} aria-label="Close" disabled={saving}>
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className={CRM.drawerBodyScroll}>
          {hint}
          {children}
        </div>
        <div className={CRM.drawerFooterBar}>
          <button type="button" onClick={onClose} className={CRM.btnDrawerCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" onClick={onSave} className={CRM.btnPrimary} disabled={saving}>
            {saving ? (
              "…"
            ) : (
              <>
                <i className="ri-save-line text-xs" /> {saveLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
