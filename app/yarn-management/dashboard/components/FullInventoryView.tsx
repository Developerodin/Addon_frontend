"use client";
import React, { useState, useMemo } from "react";
import { YarnInventory } from "../types";

interface FullInventoryViewProps {
  inventory: YarnInventory[];
  isOpen: boolean;
  onClose: () => void;
}

type SortField = keyof YarnInventory;
type SortDirection = "asc" | "desc";

const FullInventoryView: React.FC<FullInventoryViewProps> = ({
  inventory,
  isOpen,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("yarnName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter and sort inventory
  const filteredAndSorted = useMemo(() => {
    let filtered = inventory.filter((item) => {
      const matchesSearch =
        item.yarnName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.lotNo?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [inventory, searchTerm, sortField, sortDirection, statusFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <i className="ri-arrow-up-down-line text-gray-400" />;
    return sortDirection === "asc" ? (
      <i className="ri-arrow-up-line text-primary" />
    ) : (
      <i className="ri-arrow-down-line text-primary" />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-green-100 text-green-800";
      case "Low Stock":
        return "bg-yellow-100 text-yellow-800";
      case "Out of Stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="box-header flex justify-between items-center border-b">
          <h3 className="box-title text-xl">
            Full Inventory ({filteredAndSorted.length} items)
          </h3>
          <button
            onClick={onClose}
            className="ti-modal-close-btn"
            type="button"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Body */}
        <div className="box-body overflow-y-auto flex-1">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Search</label>
              <div className="relative">
                <input
                  type="text"
                  className="form-control ps-10"
                  placeholder="Search by yarn name, supplier, lot..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
            <div>
              <label className="form-label">Status Filter</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-inbox-line text-5xl text-gray-400 mb-4"></i>
              <p className="text-gray-500 text-lg">No inventory items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                      onClick={() => handleSort("yarnName")}
                    >
                      <div className="flex items-center gap-2">
                        Yarn Name
                        <SortIcon field="yarnName" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                      onClick={() => handleSort("weight")}
                    >
                      <div className="flex items-center gap-2">
                        Weight (kg)
                        <SortIcon field="weight" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                      Cones (Short-term)
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                      onClick={() => handleSort("blockedQty")}
                    >
                      <div className="flex items-center gap-2">
                        Blocked Qty (kg)
                        <SortIcon field="blockedQty" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                      onClick={() => handleSort("availableQty")}
                    >
                      <div className="flex items-center gap-2">
                        Available Qty (kg)
                        <SortIcon field="availableQty" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredAndSorted.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                        <div className="text-sm font-medium text-gray-900">
                          {item.yarnName}
                        </div>
                        {item.lotNo && (
                          <div className="text-xs text-gray-500">
                            Lot: {item.lotNo}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                        {item.weight.toLocaleString()} kg
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                        {item.conesShortTerm}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                        <span className="text-orange-600 font-medium">
                          {item.blockedQty.toLocaleString()} kg
                        </span>
                        {item.blockedQty > item.weight && (
                          <span className="ml-2 text-xs text-red-600 font-semibold">
                            (Overblocked)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                        <span className="text-green-600 font-medium">
                          {item.availableQty.toLocaleString()} kg
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="box-footer flex justify-between items-center border-t">
          <div className="text-sm text-gray-600">
            Showing {filteredAndSorted.length} of {inventory.length} items
          </div>
          <button onClick={onClose} className="ti-btn ti-btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullInventoryView;

