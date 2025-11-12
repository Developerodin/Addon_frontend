"use client";
import React, { useEffect } from "react";
import { PendingDelivery, YarnInventory } from "../types";

interface POYarnDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: PendingDelivery | null;
  inventory: YarnInventory[];
}

const POYarnDetailsModal: React.FC<POYarnDetailsModalProps> = ({
  isOpen,
  onClose,
  delivery,
  inventory,
}) => {
  // Get inventory details for each yarn in the PO
  const getYarnInventoryDetails = (yarnName: string): YarnInventory | null => {
    return inventory.find((item) => item.yarnName === yarnName) || null;
  };

  // Calculate total quantity from yarns array to ensure consistency
  const calculatedTotalQuantity = delivery?.yarns
    ? delivery.yarns.reduce((sum, yarn) => sum + yarn.quantity, 0)
    : 0;
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !delivery) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-file-list-3-line text-xl text-blue-600"></i>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Yarn Details - {delivery.poNumber}
                </h2>
                <p className="text-xs text-gray-600">Purchase Order Information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200 group"
              aria-label="Close modal"
            >
              <i className="ri-close-line text-xl text-gray-500 group-hover:text-gray-900 transition-colors"></i>
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-6 min-h-0">
            <div className="space-y-6">
              {/* PO Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <i className="ri-file-text-line text-blue-600"></i>
                  PO Information
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">PO Number</p>
                      <p className="text-sm font-medium text-gray-900">
                        {delivery.poNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Expected Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(delivery.expectedDate).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Quantity</p>
                      <p className="text-sm font-medium text-gray-900">
                        {calculatedTotalQuantity.toLocaleString()} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Supplier</p>
                      <p className="text-sm font-medium text-gray-900">
                        {delivery.supplier}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Yarns Table */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <i className="ri-yarn-line text-purple-600"></i>
                  Yarn Details ({delivery.yarns?.length || 0} items)
                </h3>
                {delivery.yarns && delivery.yarns.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                            Yarn Name
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                            Quantity (kg)
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                            Rate/Unit
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                            Total Value
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                            Current Stock
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {delivery.yarns.map((yarn, index) => {
                          const inventoryDetails = getYarnInventoryDetails(yarn.yarnName);
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-b border-gray-300">
                                {yarn.yarnName}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 border-r border-b border-gray-300">
                                {yarn.quantity.toLocaleString()} kg
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 border-r border-b border-gray-300">
                                ₹{yarn.ratePerUnit.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-b border-gray-300">
                                ₹{yarn.totalValue.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 border-r border-b border-gray-300">
                                {inventoryDetails ? (
                                  <span className="text-blue-600">
                                    {inventoryDetails.weight.toLocaleString()} kg
                                  </span>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="px-4 py-3 border-b border-gray-300">
                                {inventoryDetails ? (
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      inventoryDetails.status === "In Stock"
                                        ? "bg-green-100 text-green-800"
                                        : inventoryDetails.status === "Low Stock"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {inventoryDetails.status}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">Not in Inventory</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-t border-gray-300">
                            Total
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-t border-gray-300">
                            {delivery.yarns.reduce((sum, yarn) => sum + yarn.quantity, 0).toLocaleString()} kg
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 border-r border-t border-gray-300">
                            -
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-t border-gray-300">
                            ₹{delivery.yarns.reduce((sum, yarn) => sum + yarn.totalValue, 0).toLocaleString()}
                          </td>
                          <td colSpan={2} className="px-4 py-3 border-t border-gray-300"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <i className="ri-information-line text-2xl text-gray-400 mb-2"></i>
                    <p className="text-sm text-gray-500">
                      No yarn details available for this PO
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              onClick={onClose}
              className="ti-btn ti-btn-primary "
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default POYarnDetailsModal;

