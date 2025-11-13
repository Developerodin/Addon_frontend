"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export interface PacklistDetails {
  packingNumber: string;
  courierName: string;
  dispatchDate: string;
  estimatedDeliveryDate: string;
  numberOfCones: number;
  numberOfBoxes: number;
  totalWeight: number;
  notes?: string;
  packlistFile?: File;
  packlistFileName?: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  orderDate: string;
  expectedDelivery: string;
  totalAmount: number;
  items: Array<{
    yarnName: string;
    sizeCount: string;
    shadeCode: string;
    quantity: number;
    rate: number;
  }>;
}

interface PacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: PacklistDetails) => Promise<void>;
  order: PurchaseOrder | null;
  isSubmitting?: boolean;
}

const PacklistModal: React.FC<PacklistModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  order,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<PacklistDetails>({
    packingNumber: "",
    courierName: "",
    dispatchDate: new Date().toISOString().split('T')[0],
    estimatedDeliveryDate: "",
    numberOfCones: 0,
    numberOfBoxes: 0,
    totalWeight: 0,
    notes: ""
  });

  // Pre-fill estimated delivery date from order when modal opens
  useEffect(() => {
    if (isOpen && order?.expectedDelivery) {
      const expectedDate = new Date(order.expectedDelivery).toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        estimatedDeliveryDate: expectedDate
      }));
    }
  }, [isOpen, order]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        packingNumber: "",
        courierName: "",
        dispatchDate: new Date().toISOString().split('T')[0],
        estimatedDeliveryDate: order?.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : "",
        numberOfCones: 0,
        numberOfBoxes: 0,
        totalWeight: 0,
        notes: ""
      });
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.packingNumber.trim()) {
      toast.error("Packing Number is required");
      return;
    }
    if (!formData.courierName.trim()) {
      toast.error("Courier Name is required");
      return;
    }
    if (!formData.dispatchDate) {
      toast.error("Dispatch Date is required");
      return;
    }
    if (!formData.estimatedDeliveryDate) {
      toast.error("Estimated Delivery Date is required");
      return;
    }
    if (formData.numberOfCones <= 0) {
      toast.error("Number of Cones must be greater than 0");
      return;
    }
    if (formData.numberOfBoxes <= 0) {
      toast.error("Number of Boxes must be greater than 0");
      return;
    }
    if (formData.totalWeight <= 0) {
      toast.error("Total Weight must be greater than 0");
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        packingNumber: "",
        courierName: "",
        dispatchDate: new Date().toISOString().split('T')[0],
        estimatedDeliveryDate: order?.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : "",
        numberOfCones: 0,
        numberOfBoxes: 0,
        totalWeight: 0,
        notes: ""
      });
    } catch (error) {
      console.error("Packlist submission error:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'numberOfCones' || name === 'numberOfBoxes' || name === 'totalWeight' 
        ? (value === '' ? 0 : Number(value)) 
        : value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Mark Order as In Transit - {order?.orderNumber}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                  disabled={isSubmitting}
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
              
              {/* Order Details Section */}
              {order && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <label className="text-xs font-medium text-gray-600">PO Number</label>
                      <div className="mt-1 text-gray-900 font-medium">{order.orderNumber}</div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Supplier</label>
                      <div className="mt-1 text-gray-900">{order.supplier}</div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Order Date</label>
                      <div className="mt-1 text-gray-900">{new Date(order.orderDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Total Amount</label>
                      <div className="mt-1 text-gray-900 font-medium">₹{order.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>
                  {order.items && order.items.length > 0 && (
                    <div className="mt-4">
                      <label className="text-xs font-medium text-gray-600 mb-2 block">Order Items</label>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border border-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-1 text-left border border-gray-200">Yarn Name</th>
                              <th className="px-2 py-1 text-left border border-gray-200">Size/Count</th>
                              <th className="px-2 py-1 text-left border border-gray-200">Shade Code</th>
                              <th className="px-2 py-1 text-right border border-gray-200">Quantity</th>
                              <th className="px-2 py-1 text-right border border-gray-200">Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item, idx) => (
                              <tr key={idx} className="bg-white">
                                <td className="px-2 py-1 border border-gray-200">{item.yarnName}</td>
                                <td className="px-2 py-1 border border-gray-200">{item.sizeCount}</td>
                                <td className="px-2 py-1 border border-gray-200">{item.shadeCode}</td>
                                <td className="px-2 py-1 text-right border border-gray-200">{item.quantity.toLocaleString()}</td>
                                <td className="px-2 py-1 text-right border border-gray-200">₹{item.rate.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-600 mb-4">
                Please provide packlist details to update the order status to "In Transit".
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Packing Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="packingNumber"
                      value={formData.packingNumber}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter packing number"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Courier Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="courierName"
                      value={formData.courierName}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter courier name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Dispatch Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="dispatchDate"
                      value={formData.dispatchDate}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Estimated Delivery Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="estimatedDeliveryDate"
                      value={formData.estimatedDeliveryDate}
                      onChange={handleInputChange}
                      className="form-control"
                      min={formData.dispatchDate}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">
                      Number of Cones <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="numberOfCones"
                      value={formData.numberOfCones}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="0"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Number of Boxes <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="numberOfBoxes"
                      value={formData.numberOfBoxes}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="0"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Total Weight (kg) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="totalWeight"
                      value={formData.totalWeight}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="0"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleInputChange}
                    className="form-control"
                    rows={3}
                    placeholder="Additional notes about the shipment..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="ti-btn ti-btn-primary w-full sm:ml-3 sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin me-2"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line me-2"></i>
                    Update to In Transit
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="ti-btn ti-btn-light mt-3 sm:mt-0 w-full sm:w-auto"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PacklistModal;

