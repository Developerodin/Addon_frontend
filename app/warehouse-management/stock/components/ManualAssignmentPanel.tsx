"use client";

import React, { useState } from 'react';
import { StockAssignment } from '../types';

interface ManualAssignmentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assignment: StockAssignment) => void;
}

const ManualAssignmentPanel: React.FC<ManualAssignmentPanelProps> = ({
  isOpen,
  onClose,
  onAssign,
}) => {
  const [selectedItem, setSelectedItem] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [rackId, setRackId] = useState('');
  const [zone, setZone] = useState('');
  const [shelf, setShelf] = useState('');
  const [position, setPosition] = useState('');

  const handleSubmit = () => {
    if (!selectedItem || !sku || !quantity || !rackId || !zone || !shelf || !position) {
      alert('Please fill in all fields');
      return;
    }

    const assignment: StockAssignment = {
      itemId: selectedItem,
      sku,
      quantity,
      location: {
        rackId,
        zone,
        shelf,
        position,
      },
      assignedBy: 'Current User', // In real app, get from auth context
      assignedAt: new Date().toISOString(),
    };

    onAssign(assignment);
    // Reset form
    setSelectedItem('');
    setSku('');
    setQuantity(0);
    setRackId('');
    setZone('');
    setShelf('');
    setPosition('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Manual Location Assignment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="form-label">Item ID</label>
            <input
              type="text"
              className="form-control"
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              placeholder="Enter item ID"
            />
          </div>

          <div>
            <label className="form-label">SKU</label>
            <input
              type="text"
              className="form-control"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Enter SKU"
            />
          </div>

          <div>
            <label className="form-label">Quantity</label>
            <input
              type="number"
              className="form-control"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              placeholder="Enter quantity"
              min="1"
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold mb-4">Location Details</h4>
            <div className="space-y-4">
              <div>
                <label className="form-label">Rack ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={rackId}
                  onChange={(e) => setRackId(e.target.value)}
                  placeholder="e.g., A-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Zone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="e.g., A"
                  />
                </div>
                <div>
                  <label className="form-label">Shelf</label>
                  <input
                    type="text"
                    className="form-control"
                    value={shelf}
                    onChange={(e) => setShelf(e.target.value)}
                    placeholder="e.g., 1"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Position</label>
                <input
                  type="text"
                  className="form-control"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g., 2"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSubmit}
              className="ti-btn ti-btn-primary flex-1"
            >
              <i className="ri-check-line me-2"></i>
              Assign Location
            </button>
            <button
              onClick={onClose}
              className="ti-btn ti-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualAssignmentPanel;


