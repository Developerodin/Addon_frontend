"use client";

import React, { useState, useEffect } from "react";

export interface ActiveNeedleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNeedle: string;
  availableNeedles: string[];
  onSave: (activeNeedle: string) => Promise<void>;
}

export default function ActiveNeedleModal({
  isOpen,
  onClose,
  currentNeedle,
  availableNeedles,
  onSave,
}: ActiveNeedleModalProps) {
  const [activeNeedle, setActiveNeedle] = useState(currentNeedle);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveNeedle(currentNeedle);
    }
  }, [isOpen, currentNeedle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNeedle.trim()) return;
    setSaving(true);
    try {
      await onSave(activeNeedle.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const options = availableNeedles.length
    ? availableNeedles
    : [currentNeedle].filter(Boolean);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Change active needle</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <i className="ri-close-line text-2xl" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Active needle
          </label>
          {options.length ? (
            <select
              value={activeNeedle}
              onChange={(e) => setActiveNeedle(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              {options.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={activeNeedle}
              onChange={(e) => setActiveNeedle(e.target.value)}
              placeholder="e.g. 12"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          )}
          <div className="flex justify-end gap-2 mt-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
