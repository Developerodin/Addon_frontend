"use client";
import React from "react";
import { getFloorOrder, getFloorColor, getFloorDisplayName, FloorType, LinkingType } from "@/shared/utils/productionUtils";

interface FloorProgressionProps {
  linkingType: LinkingType;
  currentFloor?: FloorType;
  className?: string;
}

const FloorProgression: React.FC<FloorProgressionProps> = ({
  linkingType,
  currentFloor,
  className = ""
}) => {
  const floorOrder = getFloorOrder(linkingType);

  return (
    <div className={`floor-progression ${className}`}>
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {floorOrder.map((floor, index) => {
          const isCurrentFloor = floor === currentFloor;
          const isCompleted = currentFloor && floorOrder.indexOf(currentFloor) > floorOrder.indexOf(floor);
          const isSkipped = linkingType === 'Auto Linking' && floor === 'Linking';
          
          return (
            <React.Fragment key={floor}>
              <div
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                  ${isCurrentFloor 
                    ? 'bg-primary text-white' 
                    : isCompleted 
                      ? 'bg-green-100 text-green-800' 
                      : isSkipped
                        ? 'bg-gray-100 text-gray-400 line-through'
                        : 'bg-gray-100 text-gray-600'
                  }
                `}
              >
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-bold">
                    {index + 1}
                  </span>
                  <span>{getFloorDisplayName(floor)}</span>
                  {isSkipped && (
                    <span className="text-xs">(Skipped)</span>
                  )}
                </div>
              </div>
              
              {index < floorOrder.length - 1 && (
                <div className="flex-shrink-0">
                  <i className="ri-arrow-right-line text-gray-400"></i>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Flow Information */}
      <div className="mt-2 text-xs text-gray-500">
        {linkingType === 'Auto Linking' ? (
          <span className="flex items-center">
            <i className="ri-information-line me-1"></i>
            Auto Linking: Skips Linking floor for faster processing
          </span>
        ) : (
          <span className="flex items-center">
            <i className="ri-information-line me-1"></i>
            {linkingType}: Includes Linking floor for manual/machine linking
          </span>
        )}
      </div>
    </div>
  );
};

export default FloorProgression;
