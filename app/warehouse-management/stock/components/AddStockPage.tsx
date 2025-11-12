"use client";

import React, { useState } from 'react';
import { StockInDocument, LocationSuggestion } from '../types';
import LocationSuggestionModal from './LocationSuggestionModal';
import ManualAssignmentPanel from './ManualAssignmentPanel';

interface AddStockPageProps {
  onBack: () => void;
  onSave: (document: StockInDocument) => void;
}

const AddStockPage: React.FC<AddStockPageProps> = ({ onBack, onSave }) => {
  const [documentType, setDocumentType] = useState<'GRN' | 'Delivery Challan'>('GRN');
  const [documentNumber, setDocumentNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [scannedData, setScannedData] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showManualPanel, setShowManualPanel] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const handleScan = () => {
    // Simulate scanning
    const mockData = `${documentType}-${Math.floor(Math.random() * 1000000)}`;
    setScannedData(mockData);
    setDocumentNumber(mockData);
    alert(`Scanned: ${mockData}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      alert(`File uploaded: ${file.name}`);
    }
  };

  const handleSave = () => {
    // Create dummy document
    const newDoc: StockInDocument = {
      id: `DOC-${Date.now()}`,
      documentNumber: documentNumber || `${documentType}-${Date.now()}`,
      documentType,
      supplierName: supplierName || 'Default Supplier',
      supplierCode: supplierCode || 'SUP-0001',
      date: new Date().toISOString().split('T')[0],
      items: [],
      totalValue: 0,
      status: 'pending',
      scannedFile: scannedData,
      uploadedFile: uploadedFile || undefined,
    };
    onSave(newDoc);
  };

  const handleLocationSuggestion = (itemId: string) => {
    setSelectedItem(itemId);
    setShowLocationModal(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Add Stock In</h2>
        <button onClick={onBack} className="ti-btn ti-btn-secondary">
          <i className="ri-arrow-left-line me-2"></i>
          Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Document Details */}
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Document Details</h3>
          </div>
          <div className="box-body space-y-4">
            {/* Document Type */}
            <div>
              <label className="form-label">Document Type</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="GRN"
                    checked={documentType === 'GRN'}
                    onChange={(e) => setDocumentType(e.target.value as 'GRN')}
                    className="me-2"
                  />
                  GRN
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Delivery Challan"
                    checked={documentType === 'Delivery Challan'}
                    onChange={(e) => setDocumentType(e.target.value as 'Delivery Challan')}
                    className="me-2"
                  />
                  Delivery Challan
                </label>
              </div>
            </div>

            {/* Document Number */}
            <div>
              <label className="form-label">Document Number</label>
              <input
                type="text"
                className="form-control"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Enter or scan document number"
              />
            </div>

            {/* Scan/Upload Options */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleScan}
                className="ti-btn ti-btn-primary"
              >
                <i className="ri-qr-scan-line me-2"></i>
                Scan Document
              </button>
              <label className="ti-btn ti-btn-secondary cursor-pointer">
                <i className="ri-upload-line me-2"></i>
                Upload File
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {/* Supplier Details */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-4">Supplier Information</h4>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Supplier Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Enter supplier name"
                  />
                </div>
                <div>
                  <label className="form-label">Supplier Code</label>
                  <input
                    type="text"
                    className="form-control"
                    value={supplierCode}
                    onChange={(e) => setSupplierCode(e.target.value)}
                    placeholder="Enter supplier code"
                  />
                </div>
              </div>
            </div>

            {/* Scanned/Uploaded File Info */}
            {(scannedData || uploadedFile) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      {scannedData ? 'Document Scanned' : 'File Uploaded'}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {scannedData || uploadedFile?.name}
                    </p>
                  </div>
                  <i className="ri-checkbox-circle-line text-2xl text-green-600"></i>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSave}
                className="ti-btn ti-btn-primary flex-1"
                disabled={!documentNumber && !scannedData && !uploadedFile}
              >
                <i className="ri-save-line me-2"></i>
                Save Document
              </button>
              <button
                onClick={() => setShowManualPanel(true)}
                className="ti-btn ti-btn-secondary"
              >
                <i className="ri-map-pin-line me-2"></i>
                Manual Assignment
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Item Management */}
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Items & Location Assignment</h3>
          </div>
          <div className="box-body">
            <div className="text-center py-8 text-gray-500">
              <i className="ri-inbox-line text-4xl mb-4"></i>
              <p>Items will appear here after document is scanned/uploaded</p>
              <p className="text-sm mt-2">
                Use location suggestions or manual assignment to place items
              </p>
            </div>

            {/* Sample item for demo */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">SKU-001</p>
                  <p className="text-sm text-gray-600">Cotton T-Shirt</p>
                </div>
                <span className="text-sm text-gray-500">Qty: 50</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleLocationSuggestion('item-1')}
                  className="ti-btn ti-btn-sm ti-btn-primary flex-1"
                >
                  <i className="ri-map-pin-line me-2"></i>
                  Get Location Suggestion
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Location Suggestion Modal */}
      {showLocationModal && selectedItem && (
        <LocationSuggestionModal
          isOpen={showLocationModal}
          onClose={() => {
            setShowLocationModal(false);
            setSelectedItem(null);
          }}
          itemId={selectedItem}
          sku="SKU-001"
          quantity={50}
        />
      )}

      {/* Manual Assignment Panel */}
      {showManualPanel && (
        <ManualAssignmentPanel
          isOpen={showManualPanel}
          onClose={() => setShowManualPanel(false)}
          onAssign={(assignment) => {
            console.log('Assignment:', assignment);
            setShowManualPanel(false);
          }}
        />
      )}
    </div>
  );
};

export default AddStockPage;



