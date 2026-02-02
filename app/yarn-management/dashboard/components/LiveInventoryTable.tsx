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
      return <i className="ri-arrow-up-down-line text-gray-400 text-sm" />;
    return sortDirection === "asc" ? (
      <i className="ri-arrow-up-line text-purple-600 text-sm" />
    ) : (
      <i className="ri-arrow-down-line text-purple-600 text-sm" />
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
    <div className="border-t border-gray-100">
      <div className="p-[10px] flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          Live Inventory ({filteredAndSorted.length})
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="text"
              className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 font-medium"
              placeholder="Search yarn, supplier, lot..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          </div>
          <select
            className="bg-white border border-gray-200 text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 w-28"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
          <button
            type="button"
            onClick={() => router.push("/yarn-management/dashboard/full-inventory")}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 text-purple-700 text-[11px] font-bold rounded hover:bg-purple-50 transition-colors"
          >
            <i className="ri-eye-line"></i> Full Inventory
          </button>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[200px]">
        {filteredAndSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <i className="ri-inbox-line text-4xl text-gray-300 mb-2"></i>
            <p className="text-[11px] text-gray-500">No inventory items found</p>
          </div>
        ) : (
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                <th
                  className="pl-[10px] pr-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                  onClick={() => handleSort("yarnName")}
                >
                  <div className="flex items-center gap-1.5">
                    Yarn Name
                    <SortIcon field="yarnName" />
                  </div>
                </th>
                <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">LTS (kg)</th>
                <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">STS (kg)</th>
                <th className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Cones</th>
                <th
                  className="px-1.5 py-2.5 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 cursor-pointer hover:bg-gray-100/50"
                  onClick={() => handleSort("availableQty")}
                >
                  <div className="flex items-center gap-1.5">
                    Available Qty
                    <SortIcon field="availableQty" />
                  </div>
                </th>
                <th className="px-1.5 py-2.5 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="pl-[10px] pr-1.5 py-2 border border-gray-200">
                    <div className="text-[12px] font-bold text-gray-900">{item.yarnName}</div>
                    {item.lotNo && <div className="text-[10px] text-gray-500">Lot: {item.lotNo}</div>}
                  </td>
                  <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{item.longTermWeight.toLocaleString()} kg</td>
                  <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{item.shortTermWeight.toLocaleString()} kg</td>
                  <td className="px-1.5 py-2 text-[12px] text-gray-900 border border-gray-200">{item.conesShortTerm}</td>
                  <td className="px-1.5 py-2 text-[12px] border border-gray-200">
                    <span className="text-green-600 font-semibold">{item.availableQty.toLocaleString()} kg</span>
                  </td>
                  <td className="px-1.5 py-2 text-right pr-[10px] border border-gray-200">
                    <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LiveInventoryTable;

