"use client";
import React from "react";
import {
  StorageSlot,
  BoxInSlot,
  ConeInSlot,
  SlotDetailsResponse,
} from "@/shared/services/storageSlotService";

interface RackDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: StorageSlot | null;
  boxes?: BoxInSlot[];
  cones?: ConeInSlot[];
  zoneType: string;
  dataType?: "boxes" | "cones";
  isLoading?: boolean;
}

const RackDetailsModal: React.FC<RackDetailsModalProps> = ({
  isOpen,
  onClose,
  slot,
  boxes = [],
  cones = [],
  zoneType,
  dataType = "boxes",
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-primary text-white px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center">
              <i className="ri-stack-line me-2"></i>
              Rack Details - {slot?.label || "Loading..."}
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading rack details...</p>
                </div>
              </div>
            ) : slot ? (
              <div className="space-y-6">
                {/* Slot Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <i className="ri-information-line text-primary"></i>
                    Slot Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        Label
                      </label>
                      <div className="mt-1 text-sm text-gray-900 font-mono bg-white p-2 rounded border">
                        {slot.label}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        Barcode
                      </label>
                      <div className="mt-1 text-sm text-gray-900 font-mono bg-white p-2 rounded border">
                        {slot.barcode}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        Zone Type
                      </label>
                      <div className="mt-1 text-sm text-gray-900 bg-white p-2 rounded border">
                        {zoneType}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        Shelf Number
                      </label>
                      <div className="mt-1 text-sm text-gray-900 bg-white p-2 rounded border">
                        {slot.shelfNumber}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        Floor Number
                      </label>
                      <div className="mt-1 text-sm text-gray-900 bg-white p-2 rounded border">
                        {slot.floorNumber}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase">
                        Status
                      </label>
                      <div className="mt-1">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            slot.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {slot.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Boxes or Cones in Slot */}
                <div>
                  {dataType === "boxes" ? (
                    <>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <i className="ri-inbox-line text-primary"></i>
                        Boxes in Slot ({boxes.length})
                      </h4>
                      {boxes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                          <i className="ri-inbox-line text-4xl mb-2 block"></i>
                          <p>No boxes stored in this slot</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {boxes.map((box) => (
                        <div
                          key={box._id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-600 uppercase">
                                Box ID
                              </label>
                              <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                                {box.boxId}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 uppercase">
                                Barcode
                              </label>
                              <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                                {box.barcode}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 uppercase">
                                PO Number
                              </label>
                              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                {box.poNumber}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 uppercase">
                                Yarn Name
                              </label>
                              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                {box.yarnName}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 uppercase">
                                Shade Code
                              </label>
                              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                {box.shadeCode}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 uppercase">
                                Lot Number
                              </label>
                              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                {box.lotNumber}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 uppercase">
                                Box Weight (kg)
                              </label>
                              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                {box.boxWeight}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 uppercase">
                                Number of Cones
                              </label>
                              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                {box.numberOfCones}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-600 uppercase">
                                Order Qty
                              </label>
                              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                {box.orderQty}
                              </div>
                            </div>
                            {box.qcData && (
                              <>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    QC Status
                                  </label>
                                  <div className="mt-1">
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        box.qcData.status === "qc_approved"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {box.qcData.status === "qc_approved"
                                        ? "QC Approved"
                                        : "QC Rejected"}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    QC Date
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {formatDateTime(box.qcData.date)}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Inspector
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {box.qcData.username}
                                  </div>
                                </div>
                              </>
                            )}
                            {box.coneData && (
                              <>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Cones Issued
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {box.coneData.conesIssued ? "Yes" : "No"}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Issue Date
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {formatDateTime(box.coneData.coneIssueDate)}
                                  </div>
                                </div>
                              </>
                            )}
                            <div>
                              <label className="text-xs font-medium text-gray-600 uppercase">
                                Received Date
                              </label>
                              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                {formatDateTime(box.receivedDate)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <i className="ri-barcode-line text-primary"></i>
                        Cones in Slot ({cones.length})
                      </h4>
                      {cones.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                          <i className="ri-barcode-line text-4xl mb-2 block"></i>
                          <p>No cones stored in this slot</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {cones.map((cone) => (
                            <div
                              key={cone._id}
                              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Cone Barcode
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                                    {cone.barcode}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Box ID
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                                    {cone.boxId}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    PO Number
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {cone.poNumber}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Yarn Name
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {cone.yarnName}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Shade Code
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {cone.shadeCode}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Cone Weight (kg)
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {cone.coneWeight}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Tear Weight (kg)
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {cone.tearWeight}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Issue Status
                                  </label>
                                  <div className="mt-1">
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        cone.issueStatus === "issued"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {cone.issueStatus.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Return Status
                                  </label>
                                  <div className="mt-1">
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        cone.returnStatus === "returned"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {cone.returnStatus.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Issue Weight (kg)
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {cone.issueWeight}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Return Weight (kg)
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {cone.returnWeight}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Storage ID
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded border">
                                    {cone.coneStorageId}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Created At
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {formatDateTime(cone.createdAt)}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 uppercase">
                                    Updated At
                                  </label>
                                  <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                                    {formatDateTime(cone.updatedAt)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <i className="ri-error-warning-line text-4xl mb-4 block"></i>
                <p>No rack details available</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <button onClick={onClose} className="ti-btn ti-btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RackDetailsModal;

