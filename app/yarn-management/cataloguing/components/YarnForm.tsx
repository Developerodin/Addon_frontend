"use client";
import React, { useState } from "react";
import { toast } from "react-hot-toast";

interface YarnData {
  yarnName: string;
  yarnType: string;
  countDenier: string;
  color: string;
  lotNo: string;
  supplier: string;
  unitOfMeasurement: string;
  ratePerUnit: number;
  remarks: string;
  referenceDocuments?: File[];
}

interface YarnFormProps {
  initialData?: Partial<YarnData>;
  onSubmit: (data: YarnData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

const YarnForm: React.FC<YarnFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = "Save"
}) => {
  const [formData, setFormData] = useState<YarnData>({
    yarnName: initialData.yarnName || "",
    yarnType: initialData.yarnType || "",
    countDenier: initialData.countDenier || "",
    color: initialData.color || "#000000",
    lotNo: initialData.lotNo || "",
    supplier: initialData.supplier || "",
    unitOfMeasurement: initialData.unitOfMeasurement || "",
    ratePerUnit: initialData.ratePerUnit || 0,
    remarks: initialData.remarks || "",
    referenceDocuments: initialData.referenceDocuments || []
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'ratePerUnit' ? parseFloat(value) || 0 : value
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    setFormData(prev => ({
      ...prev,
      referenceDocuments: [...(prev.referenceDocuments || []), ...files]
    }));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      referenceDocuments: prev.referenceDocuments?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.yarnName.trim()) {
      toast.error("Yarn Name is required");
      return;
    }
    if (!formData.yarnType.trim()) {
      toast.error("Yarn Type is required");
      return;
    }
    if (!formData.countDenier.trim()) {
      toast.error("Count/Denier is required");
      return;
    }
    if (!formData.supplier.trim()) {
      toast.error("Supplier is required");
      return;
    }
    if (!formData.unitOfMeasurement.trim()) {
      toast.error("Unit of Measurement is required");
      return;
    }
    if (formData.ratePerUnit <= 0) {
      toast.error("Rate per Unit must be greater than 0");
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Yarn Name */}
        <div>
          <label className="form-label">
            Yarn Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="yarnName"
            value={formData.yarnName}
            onChange={handleInputChange}
            className="form-control"
            placeholder="Enter yarn name"
            required
          />
        </div>

        {/* Yarn Type */}
        <div>
          <label className="form-label">
            Yarn Type <span className="text-red-500">*</span>
          </label>
          <select
            name="yarnType"
            value={formData.yarnType}
            onChange={handleInputChange}
            className="form-control"
            required
          >
            <option value="">Select yarn type</option>
            <option value="Cotton">Cotton</option>
            <option value="Polyester">Polyester</option>
            <option value="Viscose">Viscose</option>
            <option value="Nylon">Nylon</option>
            <option value="Wool">Wool</option>
            <option value="Silk">Silk</option>
            <option value="Linen">Linen</option>
            <option value="Blend">Blend</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Count/Denier */}
        <div>
          <label className="form-label">
            Count / Denier <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="countDenier"
            value={formData.countDenier}
            onChange={handleInputChange}
            className="form-control"
            placeholder="e.g., 30s, 40s, 150D"
            required
          />
        </div>

        {/* Color */}
        <div>
          <label className="form-label">
            Color <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="color"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              required
            />
            <input
              type="text"
              value={formData.color}
              onChange={handleInputChange}
              className="form-control flex-1"
              placeholder="Color name or code"
            />
          </div>
        </div>

        {/* Lot No */}
        <div>
          <label className="form-label">Lot No.</label>
          <input
            type="text"
            name="lotNo"
            value={formData.lotNo}
            onChange={handleInputChange}
            className="form-control"
            placeholder="Enter lot number"
          />
        </div>

        {/* Supplier */}
        <div>
          <label className="form-label">
            Supplier <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="supplier"
            value={formData.supplier}
            onChange={handleInputChange}
            className="form-control"
            placeholder="Enter supplier name"
            required
          />
        </div>

        {/* Unit of Measurement */}
        <div>
          <label className="form-label">
            Unit of Measurement <span className="text-red-500">*</span>
          </label>
          <select
            name="unitOfMeasurement"
            value={formData.unitOfMeasurement}
            onChange={handleInputChange}
            className="form-control"
            required
          >
            <option value="">Select unit</option>
            <option value="kg">Kilogram (kg)</option>
            <option value="cones">Cones</option>
            <option value="meters">Meters</option>
            <option value="yards">Yards</option>
            <option value="pounds">Pounds</option>
            <option value="grams">Grams</option>
            <option value="bales">Bales</option>
            <option value="spools">Spools</option>
          </select>
        </div>

        {/* Rate per Unit */}
        <div>
          <label className="form-label">
            Rate per Unit (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="ratePerUnit"
            value={formData.ratePerUnit}
            onChange={handleInputChange}
            className="form-control"
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>
      </div>

      {/* Remarks/Notes */}
      <div>
        <label className="form-label">Remarks / Notes</label>
        <textarea
          name="remarks"
          value={formData.remarks}
          onChange={handleInputChange}
          className="form-control"
          rows={4}
          placeholder="Additional notes or remarks about the yarn..."
        />
      </div>

      {/* Reference Documents Upload */}
      <div>
        <label className="form-label">Reference Documents (Optional)</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <div className="text-center">
            <i className="ri-upload-cloud-2-line text-4xl text-gray-400 mb-2"></i>
            <p className="text-gray-600 mb-4">Upload reference documents</p>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="ti-btn ti-btn-light cursor-pointer"
            >
              <i className="ri-upload-line me-2"></i>
              Choose Files
            </label>
            <p className="text-sm text-gray-500 mt-2">
              Supported formats: PDF, DOC, DOCX, JPG, PNG, TXT
            </p>
          </div>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</h4>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div className="flex items-center">
                    <i className="ri-file-line text-gray-500 me-2"></i>
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="ti-btn ti-btn-light"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="ti-btn ti-btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <i className="ri-loader-4-line animate-spin me-2"></i>
              Saving...
            </>
          ) : (
            <>
              <i className="ri-save-line me-2"></i>
              {submitButtonText}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default YarnForm;
