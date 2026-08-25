"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ColumnFormula, ColumnFormulaIdentity } from "./formulaTypes";

export interface FormulaDrawerProps {
  /** Column to explain. Null closes the drawer. */
  info: ColumnFormula | null;
  onClose: () => void;
  /** Header sub-line. Defaults to "How this column is calculated". */
  subtitle?: string;
  /** Invariant shown below the example, when the report has one. */
  identity?: ColumnFormulaIdentity;
  /** Unique id for the heading, needed when two drawers can mount on one page. */
  titleId?: string;
}

/**
 * Right-side drawer showing the exact formula, source fields and a worked
 * example for a single report column.
 */
export default function FormulaDrawer({
  info,
  onClose,
  subtitle = "How this column is calculated",
  identity,
  titleId = "formula-drawer-title",
}: FormulaDrawerProps) {
  const isOpen = info != null;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && info && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-[9998]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[9999] flex flex-col"
          >
            <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-white/20 rounded-lg shrink-0">
                    <i className="ri-functions text-white text-xl" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 id={titleId} className="text-base font-semibold text-white truncate">
                      {info.title}
                    </h2>
                    <p className="text-purple-200 text-[11px]">{subtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
                  aria-label="Close formula drawer"
                >
                  <i className="ri-close-line text-xl" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <section>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Formula</h3>
                <pre className="text-[12px] font-mono text-purple-900 bg-purple-50 border border-purple-100 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                  {info.formula}
                </pre>
                <p className="mt-2 text-[12px] text-gray-700 leading-relaxed">{info.meaning}</p>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Fields used</h3>
                <ul className="space-y-1.5">
                  {info.fields.map((field) => (
                    <li
                      key={field}
                      className="text-[11px] font-mono text-gray-700 bg-gray-50 border border-gray-100 rounded px-2.5 py-1.5"
                    >
                      {field}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Example</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <ul className="divide-y divide-gray-100 bg-white">
                    {info.example.given.map((line) => (
                      <li key={line} className="px-3 py-2 text-[12px] text-gray-700">
                        {line}
                      </li>
                    ))}
                  </ul>
                  <div className="px-3 py-2.5 bg-emerald-50 border-t border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-0.5">Result</p>
                    <p className="text-[13px] font-semibold text-emerald-900 font-mono">{info.example.result}</p>
                  </div>
                </div>
              </section>

              {identity ? (
                <section className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Identity</h3>
                  <p className="text-[12px] font-mono text-gray-800">{identity.formula}</p>
                  {identity.example ? (
                    <p className="text-[11px] text-gray-500 mt-1">e.g. {identity.example}</p>
                  ) : null}
                </section>
              ) : null}

              {info.caveat ? (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                  {info.caveat}
                </p>
              ) : null}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2.5 bg-purple-600 text-white text-[12px] font-bold rounded-lg hover:bg-purple-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
