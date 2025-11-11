import { PickItem, PackItem, PackOrder, PickList, PackList, DamageMissingReport } from './types';

// Generate dummy rack locations
const generateRackLocation = (index: number): { row: string; column: string; basketNo: string; zone: string } => {
  const zones = ['A', 'B', 'C', 'D'];
  const rows = ['01', '02', '03', '04', '05'];
  const columns = ['01', '02', '03', '04', '05', '06'];
  const baskets = ['01', '02', '03', '04', '05', '06', '07', '08'];

  return {
    zone: zones[index % zones.length],
    row: rows[Math.floor(index / 6) % rows.length],
    column: columns[index % columns.length],
    basketNo: baskets[index % baskets.length],
  };
};

// Generate dummy pick items
export const generateDummyPickItems = (): PickItem[] => {
  const skus = [
    { sku: 'SKU-001', name: 'Premium Cotton T-Shirt - Navy Blue' },
    { sku: 'SKU-002', name: 'Denim Jeans - Regular Fit' },
    { sku: 'SKU-003', name: 'Leather Jacket - Black' },
    { sku: 'SKU-004', name: 'Running Shoes - White' },
    { sku: 'SKU-005', name: 'Wool Sweater - Gray' },
    { sku: 'SKU-006', name: 'Cargo Pants - Khaki' },
    { sku: 'SKU-007', name: 'Hoodie - Charcoal' },
    { sku: 'SKU-008', name: 'Sneakers - Red' },
    { sku: 'SKU-009', name: 'Polo Shirt - White' },
    { sku: 'SKU-010', name: 'Shorts - Navy Blue' },
    { sku: 'SKU-011', name: 'Blazer - Navy' },
    { sku: 'SKU-012', name: 'Boots - Brown Leather' },
    { sku: 'SKU-013', name: 'Tank Top - Black' },
    { sku: 'SKU-014', name: 'Joggers - Gray' },
    { sku: 'SKU-015', name: 'Windbreaker - Blue' },
  ];

  return skus.map((item, index) => ({
    id: `pick-item-${index + 1}`,
    sku: item.sku,
    name: item.name,
    totalQuantity: Math.floor(Math.random() * 50) + 10,
    pickedQuantity: index < 5 ? Math.floor(Math.random() * 30) : 0,
    rackLocation: generateRackLocation(index),
    pickingPath: index + 1,
    status: index < 3 ? 'picked' : index < 5 ? 'picking' : 'pending',
    orders: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => `ORD-${1000 + i}`),
    unit: 'pcs',
    batchNumber: `BATCH-${2024}${String(Math.floor(Math.random() * 365) + 1).padStart(3, '0')}`,
    expiryDate: undefined,
  }));
};

// Generate dummy pack items by order
export const generateDummyPackOrders = (): PackOrder[] => {
  const orders = [
    {
      orderId: 'ORD-1001',
      orderNumber: 'ORD-1001',
      customerName: 'John Smith',
      items: [
        { sku: 'SKU-001', name: 'Premium Cotton T-Shirt - Navy Blue', quantity: 2 },
        { sku: 'SKU-005', name: 'Wool Sweater - Gray', quantity: 1 },
      ],
      priority: 'high' as const,
    },
    {
      orderId: 'ORD-1002',
      orderNumber: 'ORD-1002',
      customerName: 'Sarah Johnson',
      items: [
        { sku: 'SKU-002', name: 'Denim Jeans - Regular Fit', quantity: 1 },
        { sku: 'SKU-004', name: 'Running Shoes - White', quantity: 1 },
        { sku: 'SKU-007', name: 'Hoodie - Charcoal', quantity: 2 },
      ],
      priority: 'medium' as const,
    },
    {
      orderId: 'ORD-1003',
      orderNumber: 'ORD-1003',
      customerName: 'Michael Brown',
      items: [
        { sku: 'SKU-003', name: 'Leather Jacket - Black', quantity: 1 },
        { sku: 'SKU-008', name: 'Sneakers - Red', quantity: 1 },
      ],
      priority: 'low' as const,
    },
    {
      orderId: 'ORD-1004',
      orderNumber: 'ORD-1004',
      customerName: 'Emily Davis',
      items: [
        { sku: 'SKU-006', name: 'Cargo Pants - Khaki', quantity: 2 },
        { sku: 'SKU-009', name: 'Polo Shirt - White', quantity: 3 },
        { sku: 'SKU-010', name: 'Shorts - Navy Blue', quantity: 1 },
      ],
      priority: 'high' as const,
    },
    {
      orderId: 'ORD-1005',
      orderNumber: 'ORD-1005',
      customerName: 'David Wilson',
      items: [
        { sku: 'SKU-011', name: 'Blazer - Navy', quantity: 1 },
        { sku: 'SKU-012', name: 'Boots - Brown Leather', quantity: 1 },
        { sku: 'SKU-013', name: 'Tank Top - Black', quantity: 2 },
      ],
      priority: 'medium' as const,
    },
    {
      orderId: 'ORD-1006',
      orderNumber: 'ORD-1006',
      customerName: 'Lisa Anderson',
      items: [
        { sku: 'SKU-014', name: 'Joggers - Gray', quantity: 2 },
        { sku: 'SKU-015', name: 'Windbreaker - Blue', quantity: 1 },
      ],
      priority: 'low' as const,
    },
  ];

  return orders.map((order, orderIndex) => ({
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    items: order.items.map((item, itemIndex) => ({
      id: `pack-item-${order.orderId}-${itemIndex}`,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      packedQuantity: orderIndex < 2 && itemIndex === 0 ? item.quantity : 0,
      status: orderIndex < 2 && itemIndex === 0 ? 'packed' : 'pending',
      labelPrinted: orderIndex < 2,
      customerName: order.customerName,
      priority: order.priority,
    })),
    totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
    packedItems: orderIndex < 2 ? order.items[0].quantity : 0,
    status: orderIndex < 2 ? 'packed' : 'pending',
    labelPrinted: orderIndex < 2,
    priority: order.priority,
  }));
};

// Generate dummy pick list
export const generateDummyPickList = (): PickList => {
  return {
    id: 'pick-list-001',
    batchId: 'BATCH-PICK-2024-001',
    createdAt: new Date().toISOString(),
    status: 'picking',
    items: generateDummyPickItems(),
    assignedTo: 'Warehouse Worker 1',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
  };
};

// Generate dummy pack list
export const generateDummyPackList = (): PackList => {
  return {
    id: 'pack-list-001',
    batchId: 'BATCH-PACK-2024-001',
    createdAt: new Date().toISOString(),
    status: 'packing',
    orders: generateDummyPackOrders(),
    assignedTo: 'Warehouse Worker 2',
    startedAt: new Date(Date.now() - 1800000).toISOString(),
  };
};

// Generate dummy damage/missing reports
export const generateDummyDamageMissingReports = (): DamageMissingReport[] => {
  return [
    {
      id: 'report-001',
      orderId: 'ORD-1001',
      orderNumber: 'ORD-1001',
      sku: 'SKU-001',
      itemName: 'Premium Cotton T-Shirt - Navy Blue',
      type: 'damage',
      quantity: 1,
      reason: 'Torn packaging',
      reportedBy: 'Warehouse Worker 2',
      reportedAt: new Date(Date.now() - 7200000).toISOString(),
      notes: 'Item packaging was torn during handling',
    },
    {
      id: 'report-002',
      orderId: 'ORD-1002',
      orderNumber: 'ORD-1002',
      sku: 'SKU-004',
      itemName: 'Running Shoes - White',
      type: 'missing',
      quantity: 1,
      reason: 'Not found in pick list',
      reportedBy: 'Warehouse Worker 2',
      reportedAt: new Date(Date.now() - 3600000).toISOString(),
      notes: 'Item was not available at the specified location',
    },
  ];
};


