import { Rack, SKUMovement, MaintenanceNotification, RackUtilization } from './types';

// Generate dummy racks with shelves and baskets
export const generateDummyRacks = (): Rack[] => {
  const racks: Rack[] = [];
  const zones = ['A', 'B', 'C', 'D'];
  const rowsPerZone = 5;
  const racksPerRow = 4;

  zones.forEach((zone, zoneIndex) => {
    for (let row = 1; row <= rowsPerZone; row++) {
      for (let pos = 1; pos <= racksPerRow; pos++) {
        const rackId = `${zone}-${row}-${pos}`;
        const shelves = [];
        
        // Each rack has 3-5 shelves
        const shelfCount = 3 + Math.floor(Math.random() * 3);
        for (let level = 1; level <= shelfCount; level++) {
          const baskets = [];
          // Each shelf has 2-4 baskets
          const basketCount = 2 + Math.floor(Math.random() * 3);
          for (let basketPos = 1; basketPos <= basketCount; basketPos++) {
            const basketId = `${rackId}-S${level}-B${basketPos}`;
            const itemCount = Math.floor(Math.random() * 5);
            const items = [];
            
            for (let i = 0; i < itemCount; i++) {
              items.push({
                sku: `SKU-${1000 + Math.floor(Math.random() * 9000)}`,
                name: `Product ${1000 + Math.floor(Math.random() * 9000)}`,
                quantity: Math.floor(Math.random() * 50) + 1,
                lastMoved: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
              });
            }
            
            baskets.push({
              id: basketId,
              shelfId: `${rackId}-S${level}`,
              rackId: rackId,
              position: basketPos,
              qrCode: `QR-${basketId}`,
              items: items,
              capacity: 100,
              utilization: (items.length / 5) * 100
            });
          }
          
          shelves.push({
            id: `${rackId}-S${level}`,
            rackId: rackId,
            level: level,
            baskets: baskets
          });
        }
        
        const totalItems = shelves.reduce((sum, shelf) => 
          sum + shelf.baskets.reduce((bSum, basket) => bSum + basket.items.length, 0), 0
        );
        const totalCapacity = shelves.reduce((sum, shelf) => 
          sum + shelf.baskets.length * 5, 0
        );
        const utilization = (totalItems / totalCapacity) * 100;
        
        // Some racks in maintenance or blocked
        let status: 'active' | 'maintenance' | 'blocked' = 'active';
        if (Math.random() < 0.1) {
          status = 'maintenance';
        } else if (Math.random() < 0.05) {
          status = 'blocked';
        }
        
        racks.push({
          id: rackId,
          name: `Rack ${rackId}`,
          zone: zone,
          row: row,
          position: pos,
          x: zoneIndex * 200 + (pos - 1) * 50,
          y: (row - 1) * 80,
          width: 45,
          height: 70,
          shelves: shelves,
          status: status,
          utilization: Math.round(utilization),
          createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }
  });

  return racks;
};

// Generate dummy SKU movement data
export const generateDummySKUMovements = (racks: Rack[]): SKUMovement[] => {
  const movements: SKUMovement[] = [];
  const allBaskets = racks.flatMap(rack => 
    rack.shelves.flatMap(shelf => shelf.baskets)
  );
  
  allBaskets.forEach(basket => {
    basket.items.forEach(item => {
      const daysSinceMove = Math.floor(
        (Date.now() - new Date(item.lastMoved).getTime()) / (24 * 60 * 60 * 1000)
      );
      let movementType: 'fast' | 'slow' | 'medium' = 'medium';
      
      if (daysSinceMove <= 3) {
        movementType = 'fast';
      } else if (daysSinceMove >= 15) {
        movementType = 'slow';
      }
      
      movements.push({
        sku: item.sku,
        name: item.name,
        movementType: movementType,
        quantity: item.quantity,
        rackId: basket.rackId,
        basketId: basket.id,
        lastMovement: item.lastMoved
      });
    });
  });
  
  return movements;
};

// Generate dummy maintenance notifications
export const generateDummyMaintenanceNotifications = (racks: Rack[]): MaintenanceNotification[] => {
  const notifications: MaintenanceNotification[] = [];
  
  racks.filter(rack => rack.status === 'maintenance' || rack.status === 'blocked').forEach(rack => {
    notifications.push({
      id: `NOTIF-${rack.id}`,
      rackId: rack.id,
      rackName: rack.name,
      type: rack.status === 'maintenance' ? 'maintenance' : 'blocked',
      reason: rack.status === 'maintenance' 
        ? 'Scheduled maintenance - structural inspection'
        : 'Safety hazard - blocked for investigation',
      reportedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    });
  });
  
  return notifications;
};

// Generate rack utilization data
export const generateDummyRackUtilization = (racks: Rack[]): RackUtilization[] => {
  return racks.map(rack => {
    const totalItems = rack.shelves.reduce((sum, shelf) => 
      sum + shelf.baskets.reduce((bSum, basket) => bSum + basket.items.length, 0), 0
    );
    const totalCapacity = rack.shelves.reduce((sum, shelf) => 
      sum + shelf.baskets.length * 5, 0
    );
    
    return {
      rackId: rack.id,
      rackName: rack.name,
      utilization: rack.utilization,
      totalItems: totalItems,
      capacity: totalCapacity
    };
  });
};


