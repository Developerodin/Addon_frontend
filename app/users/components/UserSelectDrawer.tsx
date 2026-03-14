"use client";

import React, { useState, useEffect, useCallback } from "react";
import { userService } from "@/shared/services/userService";
import type { User } from "@/shared/services/userService";

export interface UserSelectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUserId: string;
  onSelect: (userId: string, label?: string) => void;
  isAdmin: boolean;
  title?: string;
}

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Side drawer to select a user for viewing activity logs.
 * Search fetches from API (handles large user lists). Quick options: My logs, All logs (admin).
 */
const UserSelectDrawer: React.FC<UserSelectDrawerProps> = ({
  isOpen,
  onClose,
  selectedUserId,
  onSelect,
  isAdmin,
  title = "Select user for logs",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await userService.getUsers({
        search: query || undefined,
        limit: 100,
        page: 1,
      });
      setUsers(res.results);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [isOpen, searchInput]);

  useEffect(() => {
    if (!isOpen) return;
    fetchUsers(searchQuery);
  }, [isOpen, searchQuery, fetchUsers]);

  if (!isOpen) return null;

  const handleSelect = (userId: string, label?: string) => {
    onSelect(userId, label);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 z-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative z-10 ml-auto w-full max-w-xl h-full bg-white shadow-xl flex flex-col border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h3 className="text-base font-bold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 border border-gray-200 rounded hover:bg-gray-200"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="p-3 border-b border-gray-200 shrink-0 space-y-2">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleSelect("me", "My logs")}
              className={`px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${
                selectedUserId === "me"
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              My logs
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleSelect("all", "All logs")}
                className={`px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${
                  selectedUserId === "all"
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                All logs
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {searchQuery ? "No users match your search." : "Type to search users."}
            </div>
          ) : (
            <ul className="space-y-1">
              {users.map((user) => {
                const isSelected = user.id === selectedUserId;
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(user.id, user.name)}
                      className={`w-full flex items-center justify-between gap-2 p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.email}
                          {user.role && (
                            <span className="ml-1">· {user.role.replace("_", " ")}</span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <i className="ri-check-line text-purple-600 text-lg shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSelectDrawer;
