"use client";

import React, { useEffect, useRef } from "react";

export interface AllocateBoxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rackCode: string;
  onRackCodeChange: (value: string) => void;
  onConfirm: () => void;
  isAllocating: boolean;
  /** Optional ref to focus the rack code input when drawer opens (e.g. for Long-Term so scanner targets this input) */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** If true, input value is shown in uppercase (e.g. Long-Term storage) */
  uppercaseInput?: boolean;
}

/**
 * Shared "Allocate Box to Storage" side drawer used in both Unallocated Boxes and Long-Term Storage.
 * Same UI and behavior so rack barcode scan + Enter confirms reliably in both tabs.
 */
const AllocateBoxDrawer: React.FC<AllocateBoxDrawerProps> = ({
  isOpen,
  onClose,
  rackCode,
  onRackCodeChange,
  onConfirm,
  isAllocating,
  inputRef: externalInputRef,
  uppercaseInput = false,
}) => {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;

  // Focus rack code input when drawer opens so scanner input goes here
  useEffect(() => {
    if (isOpen && inputRef?.current) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isOpen, inputRef]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isAllocating) {
      console.log("[AllocateBoxDrawer] Enter pressed, rackCode:", rackCode);
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Side Drawer - same structure as UnallocatedBoxes */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  Allocate Box to Storage AKS
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Enter storage rack code to allocate box
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isAllocating}
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                Storage Rack Code <span className="text-red-500">*</span>
              </label>
              <input
                ref={inputRef}
                type="text"
                className={`w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300 ${uppercaseInput ? "uppercase" : ""}`}
                placeholder="Enter storage rack barcode"
                value={rackCode}
                onChange={(e) =>
                  onRackCodeChange(
                    uppercaseInput ? e.target.value.toUpperCase() : e.target.value
                  )
                }
                disabled={isAllocating}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Enter the barcode of the storage rack location
              </p>
            </div>
          </div>
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
              disabled={isAllocating}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              disabled={isAllocating || !rackCode.trim()}
            >
              {isAllocating ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-xs" />
                  Allocating...
                </>
              ) : (
                <>
                  <i className="ri-check-line text-xs" />
                  Confirm
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllocateBoxDrawer;
