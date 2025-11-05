import { Order, Notification, SalesChannel, OrderStatus } from './types';

// Generate dummy orders
export const generateDummyOrders = (): Order[] => {
  const channels: SalesChannel[] = ['online', 'retail', 'wholesale', 'marketplace', 'direct'];
  const statuses: OrderStatus[] = ['pending', 'in-progress', 'packed', 'dispatched', 'cancelled'];
  
  const orders: Order[] = [];
  const skus = ['SKU-001', 'SKU-002', 'SKU-003', 'SKU-004', 'SKU-005', 'SKU-006', 'SKU-007', 'SKU-008'];
  const productNames = [
    'Cotton T-Shirt', 'Denim Jeans', 'Silk Scarf', 'Wool Sweater',
    'Leather Jacket', 'Canvas Bag', 'Running Shoes', 'Baseball Cap'
  ];

  for (let i = 1; i <= 50; i++) {
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const itemCount = Math.floor(Math.random() * 5) + 1;
    const items = [];

    for (let j = 0; j < itemCount; j++) {
      const skuIndex = Math.floor(Math.random() * skus.length);
      const quantity = Math.floor(Math.random() * 10) + 1;
      const unitPrice = Math.floor(Math.random() * 5000) + 500;
      const stockQty = Math.floor(Math.random() * 100);
      
      items.push({
        sku: skus[skuIndex],
        name: productNames[skuIndex],
        quantity,
        unitPrice,
        totalPrice: quantity * unitPrice,
        stockAvailable: stockQty >= quantity,
        stockQuantity: stockQty,
      });
    }

    const totalValue = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const customerNames = [
      'John Smith', 'Jane Doe', 'Robert Johnson', 'Emily Davis',
      'Michael Brown', 'Sarah Wilson', 'David Miller', 'Lisa Anderson'
    ];
    const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];

    orders.push({
      id: `ORD-${String(i).padStart(6, '0')}`,
      orderNumber: `ORD-${String(i).padStart(6, '0')}`,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status,
      channel,
      customer: {
        name: customerName,
        email: `${customerName.toLowerCase().replace(' ', '.')}@example.com`,
        phone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        address: {
          street: `${Math.floor(Math.random() * 9999) + 1} Main St`,
          city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)],
          state: ['NY', 'CA', 'IL', 'TX', 'AZ'][Math.floor(Math.random() * 5)],
          zipCode: String(Math.floor(Math.random() * 90000) + 10000),
          country: 'USA',
        },
      },
      items,
      packingInstructions: {
        fragile: Math.random() > 0.7,
        specialHandling: Math.random() > 0.8 ? 'Handle with care' : undefined,
        packagingType: ['standard', 'gift', 'bulk'][Math.floor(Math.random() * 3)] as 'standard' | 'gift' | 'bulk',
        notes: Math.random() > 0.9 ? 'Gift wrap required' : undefined,
      },
      dispatchMode: ['standard', 'express', 'overnight', 'pickup'][Math.floor(Math.random() * 4)] as 'standard' | 'express' | 'overnight' | 'pickup',
      totalValue,
      totalQuantity,
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
      estimatedDispatchDate: status !== 'cancelled' ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
      actualDispatchDate: status === 'dispatched' ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
    });
  }

  return orders;
};

// Generate dummy notifications
export const generateDummyNotifications = (orders: Order[]): Notification[] => {
  const notifications: Notification[] = [];
  
  // Low stock notifications
  orders.forEach(order => {
    order.items.forEach(item => {
      if (item.stockQuantity && item.stockQuantity < item.quantity && item.stockQuantity > 0) {
        notifications.push({
          id: `notif-${order.id}-${item.sku}`,
          type: 'low-stock',
          severity: 'warning',
          message: `Low stock for ${item.sku} (${item.stockQuantity} available, ${item.quantity} required)`,
          sku: item.sku,
          orderId: order.id,
          timestamp: new Date().toISOString(),
        });
      } else if (!item.stockAvailable) {
        notifications.push({
          id: `notif-${order.id}-${item.sku}-unavailable`,
          type: 'unavailable',
          severity: 'error',
          message: `${item.sku} is unavailable for order ${order.orderNumber}`,
          sku: item.sku,
          orderId: order.id,
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  // Add some general alerts
  notifications.push({
    id: 'alert-1',
    type: 'alert',
    severity: 'info',
    message: 'High priority order pending dispatch',
    timestamp: new Date().toISOString(),
  });

  return notifications.slice(0, 20); // Limit to 20 notifications
};

