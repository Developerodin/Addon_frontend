"use client";

import React from 'react';
import { LocationSuggestion } from '../types';

interface LocationSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  sku: string;
  quantity: number;
}

const LocationSuggestionModal: React.FC<LocationSuggestionModalProps> = ({
  isOpen,
  onClose,
  itemId,
  sku,
  quantity,
}) => {
  // Generate dummy location suggestions
  const suggestions: LocationSuggestion[] = [
    {
      rackId: 'A-1',
      zone: 'A',
      shelf: '1',
      position: '2',
      capacity: 100,
      availableSpace: 75,
      priority: 'high',
      reason: 'Same product type already stored here',
    },
    {
      rackId: 'B-3',
      zone: 'B',
      shelf: '3',
      position: '1',
      capacity: 150,
      availableSpace: 120,
      priority: 'medium',
      reason: 'Optimal temperature and humidity',
    },
    {
      rackId: 'C-2',
      zone: 'C',
      shelf: '2',
      position: '4',
      capacity: 80,
      availableSpace: 60,
      priority: 'low',
      reason: 'Near dispatch area',
    },
  ];

  const handleAssign = (suggestion: LocationSuggestion) => {
    alert(`Assigning ${quantity} units of ${sku} to ${suggestion.rackId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Location Suggestions</h3>
            <p className="text-sm text-gray-600 mt-1">
              Suggested storage locations for {sku} (Qty: {quantity})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  suggestion.priority === 'high'
                    ? 'border-green-500 bg-green-50'
                    : suggestion.priority === 'medium'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">
                        {suggestion.rackId}-{suggestion.shelf}-{suggestion.position}
                      </h4>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          suggestion.priority === 'high'
                            ? 'bg-green-200 text-green-800'
                            : suggestion.priority === 'medium'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {suggestion.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{suggestion.reason}</p>
                  </div>
                  <button
                    onClick={() => handleAssign(suggestion)}
                    className="ti-btn ti-btn-primary ti-btn-sm"
                  >
                    Assign Here
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Capacity</p>
                    <p className="font-semibold">{suggestion.capacity} units</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Available Space</p>
                    <p className="font-semibold">{suggestion.availableSpace} units</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Zone</p>
                    <p className="font-semibold">{suggestion.zone}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="ti-btn ti-btn-secondary w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSuggestionModal;

