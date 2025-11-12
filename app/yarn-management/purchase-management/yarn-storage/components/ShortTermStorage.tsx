"use client";
import React, { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import BarcodeScanner from "./BarcodeScanner";
import InternalTransferModal from "./InternalTransferModal";
import { ShortTermInventory, PackedBox } from "../types";

interface ShortTermStorageProps {
  inventory: ShortTermInventory[];
  boxes: PackedBox[];
  onInternalTransfer: (transferData: any) => void;
}

const ShortTermStorage: React.FC<ShortTermStorageProps> = ({
  inventory,
  boxes,
  onInternalTransfer,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedBox, setSelectedBox] = useState<PackedBox | null>(null);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) =>
      item.yarnName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventory, searchTerm]);

  const handleTransferClick = () => {
    setShowTransferModal(true);
  };

  const handleBoxScan = (barcode: string) => {
    const box = boxes.find((b) => b.boxBarcode === barcode);
    if (!box) {
      toast.error("Box not found");
      return;
    }

    if (box.status !== "Stored") {
      toast.error("Box must be stored in long-term storage first");
      return;
    }

    setSelectedBox(box);
    setShowTransferModal(true);
  };

  const handleTransferComplete = (transferData: any) => {
    onInternalTransfer(transferData);
    setShowTransferModal(false);
    setSelectedBox(null);
    toast.success(
      `Transferred ${transferData.numberOfCones} cones to short-term storage. Barcodes generated.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Transfer Button */}
      <div className="box !bg-transparent border-0 shadow-none">
        <div className="box-header flex justify-between items-center">
          <div>
            <h2 className="box-title text-xl font-semibold">
              Short-Term Storage
            </h2>
            <p className="text-gray-600 mt-1">
              Yarn inventory for knitting operations
            </p>
          </div>
          <button
            onClick={handleTransferClick}
            className="ti-btn ti-btn-primary"
          >
            <i className="ri-arrow-right-left-line me-1"></i>
            Internal Transfer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="box">
        <div className="box-body">
          <div className="relative">
            <input
              type="text"
              className="form-control ps-10"
              placeholder="Search by yarn name or batch number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">
            Inventory ({filteredInventory.length})
          </h3>
        </div>
        <div className="box-body">
          {filteredInventory.length === 0 ? (
            <div className="text-center py-8">
              <i className="ri-inbox-line text-4xl text-gray-400 mb-2"></i>
              <p className="text-gray-500">No inventory in short-term storage</p>
              <button
                onClick={handleTransferClick}
                className="ti-btn ti-btn-primary mt-4"
              >
                <i className="ri-add-line me-1"></i>
                Start Internal Transfer
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Yarn Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cones
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Weight (kg)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.yarnName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.batchNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.totalCones}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.totalWeight.toLocaleString()} kg
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.lastUpdated).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            toast.info("View details functionality coming soon");
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <i className="ri-eye-line"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Internal Transfer Modal */}
      {showTransferModal && (
        <InternalTransferModal
          selectedBox={selectedBox}
          boxes={boxes}
          onBoxScan={handleBoxScan}
          onTransfer={handleTransferComplete}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedBox(null);
          }}
        />
      )}
    </div>
  );
};

export default ShortTermStorage;

