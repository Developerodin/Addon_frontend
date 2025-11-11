export interface Rack {
  id: string;
  name: string;
  zone: string;
  row: number;
  position: number;
  x: number; // Position in 2D map
  y: number; // Position in 2D map
  width: number;
  height: number;
  shelves: Shelf[];
  status: 'active' | 'maintenance' | 'blocked';
  utilization: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface Shelf {
  id: string;
  rackId: string;
  level: number; // 1, 2, 3, etc.
  baskets: Basket[];
}

export interface Basket {
  id: string;
  shelfId: string;
  rackId: string;
  position: number; // Position on shelf
  qrCode: string;
  items: BasketItem[];
  capacity: number;
  utilization: number; // 0-100
}

export interface BasketItem {
  sku: string;
  name: string;
  quantity: number;
  lastMoved: string;
}

export interface SKUMovement {
  sku: string;
  name: string;
  movementType: 'fast' | 'slow' | 'medium';
  quantity: number;
  rackId: string;
  basketId: string;
  lastMovement: string;
}

export interface RackUtilization {
  rackId: string;
  rackName: string;
  utilization: number;
  totalItems: number;
  capacity: number;
}

export interface MaintenanceNotification {
  id: string;
  rackId: string;
  rackName: string;
  type: 'maintenance' | 'blocked';
  reason: string;
  reportedAt: string;
  status: 'active' | 'resolved';
}


