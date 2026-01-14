"use client";
import React from "react";

interface ReceivedQuantityDisplayProps {
  received: number;
  repairReceived?: number;
  repairFromFloor?: string;
  className?: string;
}

/**
 * Component to display received quantity with breakdown of regular vs repair items
 */
const ReceivedQuantityDisplay: React.FC<ReceivedQuantityDisplayProps> = ({
  received,
  repairReceived,
  repairFromFloor,
  className = ''
}) => {
  // Ensure we have valid numbers
  const totalReceived = received || 0;
  const repairQty = repairReceived || 0;
  const regularReceived = totalReceived - repairQty;
  const hasRepairItems = repairQty > 0;
  
  const isLarge = className.includes('text-lg') || className.includes('text-xl') || className.includes('text-2xl');
  const mainTextSize = isLarge ? 'text-lg' : '';
  
  // Debug logging (remove in production if needed)
  if (hasRepairItems) {
    console.log('ReceivedQuantityDisplay - Repair items detected:', {
      totalReceived,
      repairQty,
      regularReceived,
      repairFromFloor
    });
  }
  
  return (
    <div className={`${className} ${hasRepairItems ? 'text-left' : 'text-center'} w-full`}>
      <div className={`text-blue-600 font-semibold ${mainTextSize} ${hasRepairItems ? 'mb-2' : ''}`}>
        {totalReceived.toLocaleString()}
      </div>
      {hasRepairItems && (
        <div className={`${isLarge ? 'text-sm' : 'text-xs'} space-y-1.5 mt-1.5 w-full`}>
          <div className="text-gray-700 font-medium">
            Regular: <span className="font-semibold text-gray-900">{regularReceived.toLocaleString()}</span>
          </div>
          <div className="text-yellow-900 font-bold bg-yellow-200 border-2 border-yellow-400 rounded px-2 py-1 w-full">
            <i className="ri-tools-line text-xs me-1.5"></i>
            <span>Repair:</span> {repairQty.toLocaleString()}
            {repairFromFloor && (
              <span className="text-yellow-800 font-semibold text-xs ml-1">(from {repairFromFloor})</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceivedQuantityDisplay;
