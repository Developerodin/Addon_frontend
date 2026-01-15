"use client";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { StoragePreferences as StoragePreferencesType } from "../types";

// System default preferences (4x4 grid)
const DEFAULT_PREFERENCES: StoragePreferencesType = {
  layoutView: "grid",
  showEmptySlots: true,
  gridColumns: 4,
  gridRows: 4,
  autoRefresh: false,
  refreshInterval: 30,
  theme: "light",
  compactMode: false,
};

// Helper function to get preferences storage key for user
const getPreferencesStorageKey = (userId?: string): string => {
  if (userId) {
    return `yarnStoragePreferences_${userId}`;
  }
  return "yarnStoragePreferences"; // Fallback for non-authenticated users
};

interface StoragePreferencesProps {
  preferences: StoragePreferencesType;
  onSave: (preferences: StoragePreferencesType) => void;
  onClose: () => void;
}

const StoragePreferences: React.FC<StoragePreferencesProps> = ({
  preferences: initialPreferences,
  onSave,
  onClose,
}) => {
  const user = useSelector((state: any) => state.auth?.user);
  const [preferences, setPreferences] =
    useState<StoragePreferencesType>(initialPreferences);

  const handleChange = (
    key: keyof StoragePreferencesType,
    value: any
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    // Save to user-specific localStorage key
    if (typeof window !== "undefined") {
      const storageKey = getPreferencesStorageKey(user?.id);
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    }
    onSave(preferences);
    toast.success("Preferences saved successfully");
    onClose();
  };

  const handleReset = () => {
    setPreferences(DEFAULT_PREFERENCES);
    toast.success("Preferences reset to system default (4x4)");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Storage Preferences</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Layout View */}
          <div>
            <label className="form-label font-medium">Layout View</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="layoutView"
                  value="grid"
                  checked={preferences.layoutView === "grid"}
                  onChange={(e) => handleChange("layoutView", e.target.value)}
                  className="me-2"
                />
                <span>Grid View</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="layoutView"
                  value="list"
                  checked={preferences.layoutView === "list"}
                  onChange={(e) => handleChange("layoutView", e.target.value)}
                  className="me-2"
                />
                <span>List View</span>
              </label>
            </div>
          </div>

          {/* Grid Settings */}
          {preferences.layoutView === "grid" && (
            <>
              <div>
                <label className="form-label font-medium">
                  Grid Columns: {preferences.gridColumns}
                </label>
                <input
                  type="range"
                  min="4"
                  max="12"
                  value={preferences.gridColumns}
                  onChange={(e) =>
                    handleChange("gridColumns", parseInt(e.target.value))
                  }
                  className="w-full mt-2"
                />
              </div>

              <div>
                <label className="form-label font-medium">
                  Grid Rows: {preferences.gridRows}
                </label>
                <input
                  type="range"
                  min="4"
                  max="12"
                  value={preferences.gridRows}
                  onChange={(e) =>
                    handleChange("gridRows", parseInt(e.target.value))
                  }
                  className="w-full mt-2"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.showEmptySlots}
                    onChange={(e) =>
                      handleChange("showEmptySlots", e.target.checked)
                    }
                    className="me-2"
                  />
                  <span>Show Empty Slots</span>
                </label>
              </div>
            </>
          )}

          {/* Auto Refresh */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.autoRefresh}
                onChange={(e) => handleChange("autoRefresh", e.target.checked)}
                className="me-2"
              />
              <span>Auto Refresh</span>
            </label>
            {preferences.autoRefresh && (
              <div className="mt-2">
                <label className="form-label font-medium">
                  Refresh Interval: {preferences.refreshInterval} seconds
                </label>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="10"
                  value={preferences.refreshInterval}
                  onChange={(e) =>
                    handleChange("refreshInterval", parseInt(e.target.value))
                  }
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Theme */}
          <div>
            <label className="form-label font-medium">Theme</label>
            <select
              className="form-select mt-2"
              value={preferences.theme}
              onChange={(e) => handleChange("theme", e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          {/* Compact Mode */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.compactMode}
                onChange={(e) => handleChange("compactMode", e.target.checked)}
                className="me-2"
              />
              <span>Compact Mode</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button onClick={handleReset} className="ti-btn ti-btn-light">
              Reset to Default
            </button>
            <button onClick={onClose} className="ti-btn ti-btn-light">
              Cancel
            </button>
            <button onClick={handleSave} className="ti-btn ti-btn-primary">
              <i className="ri-save-line me-1"></i>
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoragePreferences;

