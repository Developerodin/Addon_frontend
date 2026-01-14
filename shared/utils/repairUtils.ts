/**
 * Utility functions for extracting repair information from article logs
 */

export interface RepairInfo {
  repairReceived: number;
  repairFromFloor: string | null;
}

/**
 * Extracts repair transfer information from article logs
 * Looks for M2 repair transfer entries and calculates total repair items received
 */
export function extractRepairInfoFromLogs(
  logs: any[],
  currentFloor: string
): RepairInfo {
  if (!logs || !Array.isArray(logs)) {
    return { repairReceived: 0, repairFromFloor: null };
  }

  let totalRepairReceived = 0;
  let repairFromFloor: string | null = null;

  // Look for repair transfer logs
  logs.forEach((log) => {
    const action = (log.action || '').toLowerCase();
    const remarks = (log.remarks || '').toLowerCase();
    const description = (log.description || '').toLowerCase();
    const fullText = `${action} ${remarks} ${description}`.toLowerCase();
    
    // Check if this is a repair transfer log - more comprehensive matching
    const isRepairTransfer = 
      action.includes('m2 repair transfer') ||
      action.includes('repair transfer') ||
      action.includes('repair started') ||
      action.includes('transferred to') && (action.includes('repair') || remarks.includes('repair') || description.includes('repair')) ||
      fullText.includes('repair transfer') ||
      fullText.includes('m2 repair transfer') ||
      fullText.includes('repairable items') ||
      fullText.includes('sent back') && fullText.includes('repair');

    if (isRepairTransfer) {
      // Extract quantity from log - multiple patterns
      let quantityMatch = 
        log.quantity ||
        log.quantityTransferred ||
        action.match(/qty:\s*(\d+)/i)?.[1] ||
        action.match(/(\d+)\s*(?:repairable|repair|items)/i)?.[1] ||
        remarks.match(/(\d+)\s*(?:repairable|repair|items)/i)?.[1] ||
        description.match(/(\d+)\s*(?:repairable|repair|items)/i)?.[1] ||
        fullText.match(/(\d+)\s*(?:repairable|repair|items)/i)?.[1] ||
        action.match(/→\s*\w+\s*qty:\s*(\d+)/i)?.[1];
      
      if (quantityMatch) {
        const qty = parseInt(String(quantityMatch), 10);
        if (!isNaN(qty) && qty > 0) {
          totalRepairReceived += qty;
        }
      }

      // Extract source floor - improved patterns
      if (!repairFromFloor) {
        const fromFloorMatch = 
          log.fromFloor ||
          log.previousFloor ||
          action.match(/(checking|secondary\s*checking|final\s*checking)\s*→/i)?.[1]?.replace(/\s+/g, '') ||
          action.match(/(\w+)\s*→\s*(?:linking|washing|boarding)/i)?.[1] ||
          remarks.match(/from\s+(checking|secondary\s*checking|final\s*checking)\s*floor/i)?.[1]?.replace(/\s+/g, '') ||
          description.match(/from\s+(checking|secondary\s*checking|final\s*checking)\s*floor/i)?.[1]?.replace(/\s+/g, '') ||
          fullText.match(/(checking|secondary\s*checking|final\s*checking)/i)?.[1]?.replace(/\s+/g, '');
        
        if (fromFloorMatch) {
          // Normalize floor name
          const normalized = String(fromFloorMatch).trim().replace(/\s+/g, '');
          if (normalized.toLowerCase().includes('checking')) {
            if (normalized.toLowerCase().includes('secondary')) {
              repairFromFloor = 'Secondary Checking';
            } else if (normalized.toLowerCase().includes('final')) {
              repairFromFloor = 'Final Checking';
            } else {
              repairFromFloor = 'Checking';
            }
          } else {
            repairFromFloor = normalized;
          }
        }
      }
    }
  });

  return {
    repairReceived: totalRepairReceived,
    repairFromFloor
  };
}

/**
 * Gets repair information from floorQuantities or falls back to logs
 */
export function getRepairInfo(
  floorQuantities: any,
  logs: any[],
  currentFloor: string
): RepairInfo {
  // First try to get from floorQuantities (backend should provide this)
  const repairReceived = floorQuantities?.repairReceived;
  const repairFromFloor = floorQuantities?.repairFromFloor;

  if (repairReceived && repairReceived > 0) {
    return {
      repairReceived,
      repairFromFloor: repairFromFloor || null
    };
  }

  // Fallback: extract from logs if backend doesn't provide it
  return extractRepairInfoFromLogs(logs, currentFloor);
}
