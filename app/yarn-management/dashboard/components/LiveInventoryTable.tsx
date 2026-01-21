"use client";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { YarnInventory } from "../types";

interface LiveInventoryTableProps {
  inventory: YarnInventory[];
}

type SortField = keyof YarnInventory;
type SortDirection = "asc" | "desc";

const LiveInventoryTable: React.FC<LiveInventoryTableProps> = ({
  inventory,
}) => {
  const router = useRouter();
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

    // Return first 15-20 items
    return filtered.slice(0, 20);
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

  return (
    <div className="box">
      <div className="box-header flex justify-between items-center">
        <h3 className="box-title">Live Inventory ({filteredAndSorted.length})</h3>
        <button
          onClick={() => router.push("/yarn-management/dashboard/full-inventory")}
          className="ti-btn ti-btn-primary ti-btn-outline"
        >
          <i className="ri-eye-line me-1"></i>
          View Full Inventory
        </button>
      </div>
      <div className="box-body">
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
          <div className="text-center py-8">
            <i className="ri-inbox-line text-4xl text-gray-400 mb-2"></i>
            <p className="text-gray-500">No inventory items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-50">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                    Available in Long Term (kg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                    Available in Short Term (kg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                    Cones (Short-term)
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-b border-gray-300"
                    onClick={() => handleSort("availableQty")}
                  >
                    <div className="flex items-center gap-2">
                      Total Available Qty
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
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
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
                      {item.longTermWeight.toLocaleString()} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                      {item.shortTermWeight.toLocaleString()} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                      {item.conesShortTerm}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                      <span className="text-green-600 font-medium">
                        {item.availableQty.toLocaleString()} kg
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-b border-gray-300">
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
    </div>
  );
};

export default LiveInventoryTable;

