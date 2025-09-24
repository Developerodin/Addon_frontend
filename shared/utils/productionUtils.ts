import { productionService } from "@/shared/services/productionService";

export type FloorType = 'Knitting' | 'Linking' | 'Checking' | 'Washing' | 'Boarding' | 'Final Checking' | 'Branding' | 'Warehouse';
export type LinkingType = 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';

/**
 * Get the next floor in the production flow based on current floor and linking type
 */
export const getNextFloor = (currentFloor: FloorType, linkingType: LinkingType): FloorType | null => {
  const floorOrder = productionService.getFloorOrderByLinkingType(linkingType);
  const currentIndex = floorOrder.indexOf(currentFloor);
  
  if (currentIndex === -1 || currentIndex === floorOrder.length - 1) {
    return null; // No next floor
  }
  
  return floorOrder[currentIndex + 1] as FloorType;
};

/**
 * Get the previous floor in the production flow based on current floor and linking type
 */
export const getPreviousFloor = (currentFloor: FloorType, linkingType: LinkingType): FloorType | null => {
  const floorOrder = productionService.getFloorOrderByLinkingType(linkingType);
  const currentIndex = floorOrder.indexOf(currentFloor);
  
  if (currentIndex <= 0) {
    return null; // No previous floor
  }
  
  return floorOrder[currentIndex - 1] as FloorType;
};

/**
 * Check if a floor should be skipped based on linking type
 */
export const shouldSkipFloor = (floor: FloorType, linkingType: LinkingType): boolean => {
  if (linkingType === 'Auto Linking' && floor === 'Linking') {
    return true;
  }
  return false;
};

/**
 * Get all floors in the production flow for a given linking type
 */
export const getFloorOrder = (linkingType: LinkingType): FloorType[] => {
  return productionService.getFloorOrderByLinkingType(linkingType) as FloorType[];
};

/**
 * Validate if a transfer is allowed from current floor to next floor
 */
export const isTransferAllowed = (currentFloor: FloorType, nextFloor: FloorType, linkingType: LinkingType): boolean => {
  const floorOrder = getFloorOrder(linkingType);
  const currentIndex = floorOrder.indexOf(currentFloor);
  const nextIndex = floorOrder.indexOf(nextFloor);
  
  return nextIndex === currentIndex + 1;
};

/**
 * Get floor display name with proper formatting
 */
export const getFloorDisplayName = (floor: FloorType): string => {
  const displayNames: Record<FloorType, string> = {
    'Knitting': 'Knitting',
    'Linking': 'Linking',
    'Checking': 'Checking',
    'Washing': 'Washing',
    'Boarding': 'Boarding',
    'Final Checking': 'Final Checking',
    'Branding': 'Branding',
    'Warehouse': 'Warehouse'
  };
  
  return displayNames[floor] || floor;
};

/**
 * Get floor color for UI display
 */
export const getFloorColor = (floor: FloorType): string => {
  const colors: Record<FloorType, string> = {
    'Knitting': 'bg-blue-100 text-blue-800',
    'Linking': 'bg-purple-100 text-purple-800',
    'Checking': 'bg-yellow-100 text-yellow-800',
    'Washing': 'bg-cyan-100 text-cyan-800',
    'Boarding': 'bg-green-100 text-green-800',
    'Final Checking': 'bg-orange-100 text-orange-800',
    'Branding': 'bg-pink-100 text-pink-800',
    'Warehouse': 'bg-gray-100 text-gray-800'
  };
  
  return colors[floor] || 'bg-gray-100 text-gray-800';
};
