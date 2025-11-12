"use client";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";

export interface PacklistDetails {
  trackingNumber: string;
  courierName: string;
  dispatchDate: string;
  expectedArrivalDate: string;
  notes?: string;
  packlistFile?: File;
  packlistFileName?: string;
}

interface PacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: PacklistDetails) => Promise<void>;
  orderNumber: string;
  expectedDelivery?: string;
  isSubmitting?: boolean;
}

const PacklistModal: React.FC<PacklistModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  orderNumber,
  expectedDelivery,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<PacklistDetails>({
    trackingNumber: "",
    courierName: "",
    dispatchDate: new Date().toISOString().split('T')[0],
    expectedArrivalDate: "",
    notes: ""
  });
  const [packlistFile, setPacklistFile] = useState<File | null>(null);
  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill expected arrival date from order when modal opens
  useEffect(() => {
    if (isOpen && expectedDelivery) {
      const expectedDate = new Date(expectedDelivery).toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        expectedArrivalDate: expectedDate
      }));
    }
  }, [isOpen, expectedDelivery]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        trackingNumber: "",
        courierName: "",
        dispatchDate: new Date().toISOString().split('T')[0],
        expectedArrivalDate: expectedDelivery ? new Date(expectedDelivery).toISOString().split('T')[0] : "",
        notes: ""
      });
      setPacklistFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, expectedDelivery]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      toast.error("Please upload a valid Excel file (.xlsx, .xls, or .csv)");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsValidatingFile(true);
    
    try {
      // Validate Excel file structure
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          if (!data) {
            throw new Error("Unable to read file");
          }

          const workbook = XLSX.read(data, { type: "binary" });
          if (workbook.SheetNames.length === 0) {
            throw new Error("Excel file is empty");
          }

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          if (rows.length === 0) {
            throw new Error("Excel file has no data");
          }

          setPacklistFile(file);
          toast.success("Pack list file uploaded successfully");
        } catch (error) {
          console.error("File validation error:", error);
          toast.error(error instanceof Error ? error.message : "Invalid Excel file format");
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } finally {
          setIsValidatingFile(false);
        }
      };

      reader.onerror = () => {
        toast.error("Error reading file");
        setIsValidatingFile(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("Failed to process file");
      setIsValidatingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    setPacklistFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.trackingNumber.trim()) {
      toast.error("Tracking Number is required");
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
    if (!formData.expectedArrivalDate) {
      toast.error("Expected Arrival Date is required");
      return;
    }
    if (!packlistFile) {
      toast.error("Pack list Excel file is required");
      return;
    }

    try {
      const submitData: PacklistDetails = {
        ...formData,
        packlistFile: packlistFile,
        packlistFileName: packlistFile.name
      };
      await onSubmit(submitData);
      // Reset form on success
      setFormData({
        trackingNumber: "",
        courierName: "",
        dispatchDate: new Date().toISOString().split('T')[0],
        expectedArrivalDate: "",
        notes: ""
      });
      setPacklistFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Packlist submission error:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Packlist Details - {orderNumber}
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
              
              <p className="text-sm text-gray-600 mb-4">
                Please provide packlist details and upload the pack list Excel file to update the order status to "In Transit".
              </p>

              <div className="space-y-4">
                <div>
                  <label className="form-label">
                    Tracking Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="trackingNumber"
                    value={formData.trackingNumber}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Enter tracking number"
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
                    Expected Arrival Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="expectedArrivalDate"
                    value={formData.expectedArrivalDate}
                    onChange={handleInputChange}
                    className="form-control"
                    min={formData.dispatchDate}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="form-control"
                    rows={3}
                    placeholder="Additional notes about the shipment..."
                  />
                </div>

                <div>
                  <label className="form-label">
                    Pack List Excel File <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="form-control"
                      disabled={isValidatingFile || isSubmitting}
                    />
                    {packlistFile && (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center space-x-2">
                          <i className="ri-file-excel-line text-green-600 text-xl"></i>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{packlistFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {(packlistFile.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="text-red-600 hover:text-red-800"
                          disabled={isSubmitting}
                        >
                          <i className="ri-close-circle-line text-xl"></i>
                        </button>
                      </div>
                    )}
                    {isValidatingFile && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <i className="ri-loader-4-line animate-spin"></i>
                        <span>Validating file...</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Upload Excel file (.xlsx, .xls, or .csv) containing pack list details
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="ti-btn ti-btn-primary w-full sm:ml-3 sm:w-auto"
                disabled={isSubmitting || !packlistFile || isValidatingFile}
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

