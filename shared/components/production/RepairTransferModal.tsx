"use client";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { productionService } from "@/shared/services/productionService";
import NumericInput from "@/shared/utils/numericInput";

interface RepairTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  articleNumber: string;
  orderId: string;
  floor: string;
  m2Remaining: number;
  previousFloor: string;
  onSuccess?: () => void;
}

interface RepairTransferData {
  quantity: number;
  remarks: string;
  selectedFloor: string;
}

// Available floors for repair transfer (excluding current floor)
const AVAILABLE_FLOORS = [
  { value: 'Knitting', label: 'Knitting' },
  { value: 'Linking', label: 'Linking' },
  { value: 'Checking', label: 'Checking' },
  { value: 'Washing', label: 'Washing' },
  { value: 'Boarding', label: 'Boarding' },
  { value: 'Silicon', label: 'Silicon' },
  { value: 'SecondaryChecking', label: 'Secondary Checking' },
  { value: 'Branding', label: 'Branding' },
  { value: 'FinalChecking', label: 'Final Checking' },
  { value: 'Warehouse', label: 'Warehouse' },
  { value: 'Dispatch', label: 'Dispatch' },
];

const RepairTransferModal: React.FC<RepairTransferModalProps> = ({
  isOpen,
  onClose,
  articleId,
  articleNumber,
  orderId,
  floor,
  m2Remaining,
  previousFloor,
  onSuccess
}) => {
  const [transferData, setTransferData] = useState<RepairTransferData>({
    quantity: m2Remaining,
    remarks: '',
    selectedFloor: previousFloor
  });
  const [isLoading, setIsLoading] = useState(false);

  // Update quantity and selected floor when modal opens
  React.useEffect(() => {
    if (isOpen && m2Remaining > 0) {
      setTransferData(prev => ({
        ...prev,
        quantity: m2Remaining,
        selectedFloor: previousFloor // Default to previous floor
      }));
    }
  }, [isOpen, m2Remaining, previousFloor]);

  // Get available floors (excluding current floor)
  const getAvailableFloors = () => {
    return AVAILABLE_FLOORS.filter(f => {
      // Convert current floor to match format
      const currentFloorFormatted = floor === 'Checking' ? 'Checking' :
                                    floor === 'SecondaryChecking' ? 'SecondaryChecking' :
                                    floor === 'FinalChecking' ? 'FinalChecking' :
                                    floor === 'Dispatch' ? 'Dispatch' :
                                    floor;
      return f.value !== currentFloorFormatted;
    });
  };

  const handleInputChange = (field: keyof RepairTransferData, value: string | number) => {
    setTransferData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!transferData.quantity || transferData.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (transferData.quantity > m2Remaining) {
      toast.error(`Quantity cannot exceed available M2 remaining (${m2Remaining})`);
      return;
    }

    if (!transferData.selectedFloor) {
      toast.error('Please select a destination floor');
      return;
    }

    try {
      setIsLoading(true);
      
      // The API expects the target floor in the request body
      const response = await productionService.transferM2ForRepair(
        floor,
        orderId,
        articleId,
        {
          quantity: transferData.quantity,
          remarks: transferData.remarks,
          targetFloor: transferData.selectedFloor
        }
      );

      if (response.success) {
        const formatFloorName = (floorName: string): string => {
          const floorMap: { [key: string]: string } = {
            'Checking': 'Checking',
            'SecondaryChecking': 'Secondary Checking',
            'FinalChecking': 'Final Checking',
            'Linking': 'Linking',
            'Knitting': 'Knitting',
            'Washing': 'Washing',
            'Boarding': 'Boarding',
            'Branding': 'Branding',
            'Warehouse': 'Warehouse',
            'Dispatch': 'Dispatch',
          };
          return floorMap[floorName] || floorName;
        };
        
        const selectedFloorName = formatFloorName(transferData.selectedFloor);
        const currentFloorName = formatFloorName(floor);
        
        toast.success(
          `✅ Successfully transferred ${transferData.quantity} M2 items from ${currentFloorName} to ${selectedFloorName} for repair`,
          { duration: 5000 }
        );
        
        // Show detailed success message
        setTimeout(() => {
          toast.success(
            `📋 Check ${selectedFloorName} floor - ${transferData.quantity} repair items added to received quantity`,
            { duration: 4000 }
          );
        }, 1000);
        
        onSuccess?.();
        onClose();
        // Reset form
        setTransferData({
          quantity: m2Remaining,
          remarks: '',
          selectedFloor: previousFloor
        });
      } else {
        throw new Error(response.error?.message || 'Repair transfer failed');
      }
    } catch (error: any) {
      console.error('Repair transfer error:', error);
      toast.error(error.message || 'Failed to transfer M2 for repair');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format floor names for display
  const formatFloorName = (floorName: string): string => {
    const floorMap: { [key: string]: string } = {
      'Checking': 'Checking',
      'SecondaryChecking': 'Secondary Checking',
      'FinalChecking': 'Final Checking',
      'Linking': 'Linking',
      'Knitting': 'Knitting',
      'Washing': 'Washing',
      'Boarding': 'Boarding',
      'Branding': 'Branding',
      'Warehouse': 'Warehouse',
      'Dispatch': 'Dispatch',
    };
    return floorMap[floorName] || floorName;
  };

  if (!isOpen) return null;

  const currentFloorName = formatFloorName(floor);
  const selectedFloorName = formatFloorName(transferData.selectedFloor);
  const availableFloors = getAvailableFloors();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Send M2 for Repair</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="space-y-4">
          {/* Article Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Article Details</div>
            <div className="font-medium text-gray-900 text-lg">{articleNumber}</div>
          </div>

          {/* Destination Floor Selection */}
          <div>
            <label className="form-label">Select Destination Floor for Repair *</label>
            <select
              className="form-select"
              value={transferData.selectedFloor}
              onChange={(e) => handleInputChange('selectedFloor', e.target.value)}
              disabled={isLoading}
            >
              <option value="">-- Select Floor --</option>
              {availableFloors.map(floorOption => (
                <option key={floorOption.value} value={floorOption.value}>
                  {floorOption.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Choose which floor should receive these items for repair
            </div>
          </div>

          {/* Transfer Flow Visualization */}
          {transferData.selectedFloor && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-blue-900 mb-3">Repair Transfer Flow</div>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3 mb-2">
                    <div className="text-xs text-gray-600 mb-1">From Floor</div>
                    <div className="font-bold text-yellow-800 text-base">{currentFloorName}</div>
                  </div>
                  <div className="text-xs text-gray-600">M2 Available: <span className="font-bold text-yellow-700">{m2Remaining}</span></div>
                </div>
                
                <div className="mx-4 text-blue-600">
                  <i className="ri-arrow-right-line text-3xl"></i>
                </div>
                
                <div className="text-center flex-1">
                  <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3 mb-2">
                    <div className="text-xs text-gray-600 mb-1">To Floor (For Repair)</div>
                    <div className="font-bold text-green-800 text-base">{selectedFloorName}</div>
                  </div>
                  <div className="text-xs text-gray-600">Items will be repaired here</div>
                </div>
              </div>
              <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                <i className="ri-information-line me-1"></i>
                After repair, items will follow the same process flow again from <strong>{selectedFloorName}</strong> floor
              </div>
            </div>
          )}

          {/* Transfer Quantity */}
          <div>
            <label className="form-label">Quantity *</label>
            <NumericInput
              className="form-control"
              value={transferData.quantity}
              onChange={(value) => handleInputChange('quantity', value)}
              min={1}
              max={m2Remaining}
              disabled={isLoading}
              placeholder={`Max: ${m2Remaining}`}
            />
            <div className="text-xs text-gray-500 mt-1">
              Maximum: {m2Remaining} items (leave empty to send all remaining)
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="form-label">Remarks</label>
            <textarea
              className="form-control"
              rows={3}
              value={transferData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              placeholder="Add remarks about the repair transfer..."
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="ti-btn ti-btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="ti-btn ti-btn-primary"
            disabled={isLoading || transferData.quantity <= 0 || transferData.quantity > m2Remaining || !transferData.selectedFloor}
          >
            {isLoading ? (
              <>
                <i className="ri-loader-4-line animate-spin me-2"></i>
                Sending...
              </>
            ) : (
              <>
                <i className="ri-tools-line me-2"></i>
                Send for Repair
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepairTransferModal;
