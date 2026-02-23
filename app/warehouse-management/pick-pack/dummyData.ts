import {
  PickItem,
  PickList,
  PackList,
  PackBatch,
  PackOrder,
  PackItem,
  DamageMissingReport,
} from './types';

// Generate dummy rack locations
const generateRackLocation = (index: number): { row: string; column: string; bin: string; zone: string } => {
  const zones = ['A', 'B', 'C', 'D'];
  const rows = ['01', '02', '03', '04', '05'];
  const columns = ['01', '02', '03', '04', '05', '06'];
  const bins = ['01', '02', '03', '04', '05', '06', '07', '08'];

  return {
    zone: zones[index % zones.length],
    row: rows[Math.floor(index / 6) % rows.length],
    column: columns[index % columns.length],
    bin: bins[index % bins.length],
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

  return skus.map((item, index) => {
    const requiredQty = Math.floor(Math.random() * 12) + 3;
    const pickedQty = index < 4 ? Math.min(requiredQty, Math.floor(Math.random() * requiredQty)) : 0;
    const status =
      pickedQty === 0 ? 'pending' : pickedQty < requiredQty ? 'partial' : index % 7 === 0 ? 'verified' : 'picked';

    return {
      id: `pick-item-${index + 1}`,
      sku: item.sku,
      name: item.name,
      imageUrl: undefined,
      pathIndex: index + 1,
      rackLocation: generateRackLocation(index),
      requiredQty,
      pickedQty,
      unit: 'pcs',
      status,
      linkedOrderIds: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, i) => `ORD-${1001 + i}`),
      batchId: `PICK-BATCH-${new Date().getFullYear()}-001`,
    };
  });
};

const createPackItem = (sku: string, name: string, pickedQty: number): PackItem => {
  const packedQty = Math.max(0, Math.min(pickedQty, Math.floor(Math.random() * (pickedQty + 1))));
  const status = packedQty === 0 ? 'pending' : packedQty < pickedQty ? 'partial' : 'packed';

  return {
    id: `pack-item-${sku}-${Math.random().toString(16).slice(2)}`,
    sku,
    name,
    pickedQty,
    packedQty,
    status,
    itemBarcode: undefined,
  };
};

// Generate dummy pack orders (order-wise packing, batched pick)
export const generateDummyPackOrders = (): PackOrder[] => {
  const orders = [
    {
      orderId: 'ORD-1001',
      orderNumber: 'ORD-1001',
      customerName: 'John Smith',
      items: [
        { sku: 'SKU-001', name: 'Premium Cotton T-Shirt - Navy Blue', pickedQty: 2 },
        { sku: 'SKU-005', name: 'Wool Sweater - Gray', pickedQty: 1 },
      ],
      priority: 'high' as const,
    },
    {
      orderId: 'ORD-1002',
      orderNumber: 'ORD-1002',
      customerName: 'Sarah Johnson',
      items: [
        { sku: 'SKU-002', name: 'Denim Jeans - Regular Fit', pickedQty: 1 },
        { sku: 'SKU-004', name: 'Running Shoes - White', pickedQty: 1 },
        { sku: 'SKU-007', name: 'Hoodie - Charcoal', pickedQty: 2 },
      ],
      priority: 'medium' as const,
    },
    {
      orderId: 'ORD-1003',
      orderNumber: 'ORD-1003',
      customerName: 'Michael Brown',
      items: [
        { sku: 'SKU-003', name: 'Leather Jacket - Black', pickedQty: 1 },
        { sku: 'SKU-008', name: 'Sneakers - Red', pickedQty: 1 },
      ],
      priority: 'low' as const,
    },
    {
      orderId: 'ORD-1004',
      orderNumber: 'ORD-1004',
      customerName: 'Emily Davis',
      items: [
        { sku: 'SKU-006', name: 'Cargo Pants - Khaki', pickedQty: 2 },
        { sku: 'SKU-009', name: 'Polo Shirt - White', pickedQty: 3 },
        { sku: 'SKU-010', name: 'Shorts - Navy Blue', pickedQty: 1 },
      ],
      priority: 'high' as const,
    },
    {
      orderId: 'ORD-1005',
      orderNumber: 'ORD-1005',
      customerName: 'David Wilson',
      items: [
        { sku: 'SKU-011', name: 'Blazer - Navy', pickedQty: 1 },
        { sku: 'SKU-012', name: 'Boots - Brown Leather', pickedQty: 1 },
        { sku: 'SKU-013', name: 'Tank Top - Black', pickedQty: 2 },
      ],
      priority: 'medium' as const,
    },
    {
      orderId: 'ORD-1006',
      orderNumber: 'ORD-1006',
      customerName: 'Lisa Anderson',
      items: [
        { sku: 'SKU-014', name: 'Joggers - Gray', pickedQty: 2 },
        { sku: 'SKU-015', name: 'Windbreaker - Blue', pickedQty: 1 },
      ],
      priority: 'low' as const,
    },
  ];

  return orders.map((order, idx) => {
    const items = order.items.map((it) => createPackItem(it.sku, it.name, it.pickedQty));
    const allPacked = items.every(i => i.packedQty >= i.pickedQty && i.pickedQty > 0);
    const anyPacked = items.some(i => i.packedQty > 0);
    const status = allPacked ? 'packed' : anyPacked ? 'packing' : 'ready';

    return {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      priority: order.priority,
      status,
      items,
    };
  });
};

const splitIntoBatches = (orders: PackOrder[]): PackBatch[] => {
  const now = new Date().toISOString();
  const chunks: PackOrder[][] = [];
  for (let i = 0; i < orders.length; i += 2) chunks.push(orders.slice(i, i + 2));

  return chunks.map((chunk, i) => {
    const allPacked = chunk.every(o => o.status === 'packed');
    const anyPacking = chunk.some(o => o.status === 'packing');
    const status = allPacked ? 'packed' : anyPacking ? 'packing' : 'ready';

    return {
      id: `PACK-BATCH-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`,
      orderIds: chunk.map(o => o.orderId),
      status: status === 'ready' ? 'ready' : status === 'packing' ? 'packing' : 'packed',
      orders: chunk,
      cartons: [
        { id: `CTN-${i + 1}-01`, cartonBarcode: undefined, createdAt: now },
      ],
      createdAt: now,
    };
  });
};

// Generate dummy pick list
export const generateDummyPickList = (): PickList => {
  return {
    id: 'pick-list-001',
    pickBatchId: `PICK-BATCH-${new Date().getFullYear()}-001`,
    createdAt: new Date().toISOString(),
    status: 'picking-in-progress',
    items: generateDummyPickItems(),
    assignedTo: 'Warehouse Worker 1',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
  };
};

// Generate dummy pack list
export const generateDummyPackList = (): PackList => {
  const orders = generateDummyPackOrders();
  const batches = splitIntoBatches(orders);

  return {
    id: 'pack-list-001',
    createdAt: new Date().toISOString(),
    status: 'packing-in-progress',
    batches,
    assignedTo: 'Warehouse Worker 2',
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



