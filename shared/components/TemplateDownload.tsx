import React, { useState } from 'react';
import { SalesImportService, TEMPLATE_COLUMNS } from '@/shared/services/salesImportService';

interface TemplateDownloadProps {
  onClose?: () => void;
}

const TemplateDownload: React.FC<TemplateDownloadProps> = ({ onClose }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await SalesImportService.downloadTemplate();
      // Success feedback is handled by the service
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Download Sales Import Template</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Instructions */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Instructions:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <i className="ri-check-line text-green-500 mt-0.5 me-2"></i>
                Download the CSV template below
              </li>
              <li className="flex items-start">
                <i className="ri-check-line text-green-500 mt-0.5 me-2"></i>
                Fill in your sales data following the column structure
              </li>
              <li className="flex items-start">
                <i className="ri-check-line text-green-500 mt-0.5 me-2"></i>
                Required fields must be filled (marked with *)
              </li>
              <li className="flex items-start">
                <i className="ri-check-line text-green-500 mt-0.5 me-2"></i>
                Save as CSV format and upload back to the system
              </li>
            </ul>
          </div>

          {/* Template Preview */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Template Structure:</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">Column</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Required</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Description</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {TEMPLATE_COLUMNS.map((column, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 px-3 py-2 font-medium">
                        {column.header}
                        {column.required && <span className="text-red-500 ml-1">*</span>}
                      </td>
                      <td className="border border-gray-200 px-3 py-2">
                        {column.required ? (
                          <span className="text-red-500 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-600">
                        {column.description}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-500 font-mono">
                        {column.example}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sample Data */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Sample Data:</h4>
            <div className="bg-gray-50 p-3 rounded border">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
{`Date,Plant,Material Code,Quantity,MRP,Discount,GSV,NSV,Total Tax
15-01-2024,STORE001,STYLE123,100,150.50,10,135.45,120.40,15.05
16-01-2024,STORE002,STYLE456,50,200.00,0,200.00,180.00,20.00`}
              </pre>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            {onClose && (
              <button
                onClick={onClose}
                className="ti-btn ti-btn-secondary"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleDownload}
              className="ti-btn ti-btn-primary"
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white me-2"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <i className="ri-download-line me-2"></i>
                  Download Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDownload; 