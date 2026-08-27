"use client";

import React, { useEffect } from "react";
import { CRM } from "../crmUiClasses";
import type { InvoiceReportColumnInfo } from "../invoiceReportColumnInfo";

type InvoiceReportColumnInfoDrawerProps = {
  info: InvoiceReportColumnInfo | null;
  onClose: () => void;
};

/**
 * Right drawer explaining how one invoice-report column is sourced and calculated.
 */
export default function InvoiceReportColumnInfoDrawer({
  info,
  onClose,
}: InvoiceReportColumnInfoDrawerProps) {
  useEffect(() => {
    if (!info) return undefined;
    /**
     * Close on Escape so keyboard users can dismiss without the close button.
     * @param event Keyboard event
     */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [info, onClose]);

  if (!info) return null;

  return (
    <>
      <button
        type="button"
        className={CRM.drawerBackdrop}
        aria-label="Close column help"
        onClick={onClose}
      />
      <aside
        className={CRM.drawerShellSm}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-col-help-title"
      >
        <div className={CRM.drawerHeaderBar}>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-purple-700">
              Column help
            </p>
            <h2 id="invoice-col-help-title" className="text-sm font-bold text-gray-900 truncate">
              {info.title}
            </h2>
          </div>
          <button
            type="button"
            className={CRM.drawerCloseBtn}
            onClick={onClose}
            aria-label="Close column help"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>

        <div className={CRM.drawerBodyScroll}>
          <p className="text-[12px] text-gray-700 leading-relaxed mb-4">{info.summary}</p>

          <section className={CRM.drawerSection}>
            <h3 className={CRM.drawerSectionHead}>Where the data comes from</h3>
            <div className="p-3 space-y-2">
              <p className="text-[12px] text-gray-800">{info.source}</p>
              <p className="text-[11px] font-semibold text-purple-800">{info.sourcePath}</p>
            </div>
          </section>

          <section className={CRM.drawerSection}>
            <h3 className={CRM.drawerSectionHead}>Formula</h3>
            <div className="p-3">
              <code className="block text-[11px] font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded px-2 py-2 whitespace-pre-wrap">
                {info.formula}
              </code>
            </div>
          </section>

          <section className={CRM.drawerSection}>
            <h3 className={CRM.drawerSectionHead}>Example</h3>
            <div className="p-3">
              <p className="text-[12px] text-gray-800 leading-relaxed">{info.example}</p>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
