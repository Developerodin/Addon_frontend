import {
  StockFlowRecord,
  OrderFulfilmentMetrics,
  RackUtilizationData,
  ShrinkageRecord,
  AuditLog
} from './types';

const generateDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

const generateTime = (): string => {
  const hours = Math.floor(Math.random() * 24);
  const minutes = Math.floor(Math.random() * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const products = [
  { sku: 'SKU-001', name: 'Product Alpha' },
  { sku: 'SKU-002', name: 'Product Beta' },
  { sku: 'SKU-003', name: 'Product Gamma' },
  { sku: 'SKU-004', name: 'Product Delta' },
  { sku: 'SKU-005', name: 'Product Epsilon' },
  { sku: 'SKU-006', name: 'Product Zeta' },
  { sku: 'SKU-007', name: 'Product Eta' },
  { sku: 'SKU-008', name: 'Product Theta' },
  { sku: 'SKU-009', name: 'Product Iota' },
  { sku: 'SKU-010', name: 'Product Kappa' },
];

const operators = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Tom Brown'];
const zones = ['A', 'B', 'C', 'D'];
const racks = Array.from({ length: 20 }, (_, i) => `RACK-${String(i + 1).padStart(3, '0')}`);

export const generateDummyStockFlow = (days: number = 30): StockFlowRecord[] => {
  const records: StockFlowRecord[] = [];
  const types: Array<'stock-in' | 'stock-out'> = ['stock-in', 'stock-out'];
  const reasons = [
    'Purchase Order',
    'Return',
    'Transfer',
    'Sale',
    'Adjustment',
    'Quality Check',
    'Restock',
    'Dispatch'
  ];

  for (let day = 0; day < days; day++) {
    const date = generateDate(day);
    const recordsPerDay = Math.floor(Math.random() * 15) + 5;

    for (let i = 0; i < recordsPerDay; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const zone = zones[Math.floor(Math.random() * zones.length)];
      const rackId = racks[Math.floor(Math.random() * racks.length)];

      records.push({
        id: `SF-${date}-${i + 1}`,
        date,
        time: generateTime(),
        type,
        sku: product.sku,
        productName: product.name,
        quantity: Math.floor(Math.random() * 100) + 1,
        location: `${zone}-${rackId}`,
        rackId,
        zone,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        operator: operators[Math.floor(Math.random() * operators.length)],
        documentNumber: `DOC-${type.toUpperCase()}-${date}-${String(i + 1).padStart(4, '0')}`
      });
    }
  }

  return records.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.time.localeCompare(a.time);
  });
};

export const generateDummyOrderFulfilment = (days: number = 30): OrderFulfilmentMetrics[] => {
  const metrics: OrderFulfilmentMetrics[] = [];

  for (let day = 0; day < days; day++) {
    const date = generateDate(day);
    const totalOrders = Math.floor(Math.random() * 200) + 50;
    const fulfilledOrders = Math.floor(totalOrders * (0.7 + Math.random() * 0.25));
    const pendingOrders = totalOrders - fulfilledOrders - Math.floor(Math.random() * 10);
    const cancelledOrders = totalOrders - fulfilledOrders - pendingOrders;

    metrics.push({
      date,
      totalOrders,
      fulfilledOrders,
      pendingOrders,
      cancelledOrders,
      fulfillmentRate: (fulfilledOrders / totalOrders) * 100,
      avgFulfillmentTime: Math.random() * 8 + 2, // 2-10 hours
      onTimeDeliveryRate: 70 + Math.random() * 25, // 70-95%
      totalValue: Math.floor(Math.random() * 500000) + 100000,
      byChannel: {
        online: Math.floor(totalOrders * (0.4 + Math.random() * 0.2)),
        offline: Math.floor(totalOrders * (0.3 + Math.random() * 0.2)),
        wholesale: totalOrders - Math.floor(totalOrders * (0.4 + Math.random() * 0.2)) - Math.floor(totalOrders * (0.3 + Math.random() * 0.2))
      }
    });
  }

  return metrics.sort((a, b) => b.date.localeCompare(a.date));
};

export const generateDummyRackUtilization = (): RackUtilizationData[] => {
  const utilization: RackUtilizationData[] = [];

  racks.forEach((rackId, index) => {
    const zone = zones[index % zones.length];
    const capacity = Math.floor(Math.random() * 500) + 200;
    const currentItems = Math.floor(capacity * (0.3 + Math.random() * 0.6));
    const itemCount = Math.floor(Math.random() * 10) + 3;

    utilization.push({
      rackId,
      rackName: `Rack ${rackId}`,
      zone,
      row: Math.floor(index / 4) + 1,
      position: (index % 4) + 1,
      capacity,
      currentItems,
      utilization: (currentItems / capacity) * 100,
      items: Array.from({ length: itemCount }, (_, i) => {
        const product = products[Math.floor(Math.random() * products.length)];
        return {
          sku: product.sku,
          productName: product.name,
          quantity: Math.floor(currentItems / itemCount) + Math.floor(Math.random() * 20),
          lastUpdated: generateDate(Math.floor(Math.random() * 7))
        };
      })
    });
  });

  return utilization;
};

export const generateDummyShrinkage = (days: number = 30): ShrinkageRecord[] => {
  const records: ShrinkageRecord[] = [];
  const types: Array<'damage' | 'theft' | 'expiry' | 'error' | 'other'> = [
    'damage', 'theft', 'expiry', 'error', 'other'
  ];
  const severities: Array<'low' | 'medium' | 'high' | 'critical'> = [
    'low', 'medium', 'high', 'critical'
  ];
  const statuses: Array<'reported' | 'investigating' | 'resolved' | 'closed'> = [
    'reported', 'investigating', 'resolved', 'closed'
  ];
  const descriptions = [
    'Damaged during handling',
    'Expired stock removed',
    'Inventory discrepancy found',
    'Theft reported by security',
    'Data entry error corrected',
    'Product quality issue',
    'Missing items during audit',
    'System error in stock count'
  ];

  for (let day = 0; day < days; day++) {
    const date = generateDate(day);
    const recordsPerDay = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < recordsPerDay; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const zone = zones[Math.floor(Math.random() * zones.length)];
      const rackId = racks[Math.floor(Math.random() * racks.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const quantity = Math.floor(Math.random() * 50) + 1;
      const value = Math.floor(quantity * (Math.random() * 100 + 10));

      const record: ShrinkageRecord = {
        id: `SHR-${date}-${i + 1}`,
        date,
        time: generateTime(),
        type,
        severity,
        sku: product.sku,
        productName: product.name,
        quantity,
        value,
        location: `${zone}-${rackId}`,
        rackId,
        reportedBy: operators[Math.floor(Math.random() * operators.length)],
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        status
      };

      if (status === 'resolved' || status === 'closed') {
        record.resolvedBy = operators[Math.floor(Math.random() * operators.length)];
        record.resolvedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
        record.resolution = 'Issue resolved and documented';
      }

      records.push(record);
    }
  }

  return records.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.time.localeCompare(a.time);
  });
};

export const generateDummyAuditLogs = (days: number = 30): AuditLog[] => {
  const logs: AuditLog[] = [];
  const actions = [
    'Create Order',
    'Update Order',
    'Cancel Order',
    'Stock In',
    'Stock Out',
    'Update Rack',
    'Assign Location',
    'Quality Check',
    'Dispatch Order',
    'User Login',
    'User Logout',
    'Permission Change',
    'System Configuration'
  ];
  const entityTypes: Array<'order' | 'stock' | 'rack' | 'system' | 'user'> = [
    'order', 'stock', 'rack', 'system', 'user'
  ];
  const users = operators;
  const roles = ['Admin', 'Manager', 'Operator', 'Supervisor', 'Viewer'];
  const ipAddresses = [
    '192.168.1.10',
    '192.168.1.11',
    '192.168.1.12',
    '192.168.1.13',
    '10.0.0.5'
  ];
  const locations = ['Warehouse Floor', 'Office', 'Remote', 'Mobile Device'];

  for (let day = 0; day < days; day++) {
    const date = generateDate(day);
    const logsPerDay = Math.floor(Math.random() * 100) + 20;

    for (let i = 0; i < logsPerDay; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const role = roles[Math.floor(Math.random() * roles.length)];
      const timestamp = new Date(`${date}T${generateTime()}`).toISOString();
      const entityId = `${entityType.toUpperCase()}-${date}-${i + 1}`;
      const hasChanges = Math.random() > 0.5;

      const log: AuditLog = {
        id: `AUDIT-${timestamp}-${i + 1}`,
        timestamp,
        action,
        user,
        userRole: role,
        entityType,
        entityId,
        entityName: `${entityType} ${entityId}`,
        ipAddress: ipAddresses[Math.floor(Math.random() * ipAddresses.length)],
        location: locations[Math.floor(Math.random() * locations.length)]
      };

      if (hasChanges) {
        log.changes = [
          {
            field: 'Status',
            oldValue: 'Pending',
            newValue: 'Completed'
          },
          {
            field: 'Quantity',
            oldValue: '100',
            newValue: '95'
          }
        ];
      }

      logs.push(log);
    }
  }

  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

