import {
  StockInDocument,
  StockOutStatus,
  PickPackList,
  QualityCheck,
  DispatchSummary,
  CourierIntegration,
  StockInStatus,
  DocumentType,
  CourierService,
  QualityStatus,
} from './types';

// Generate dummy Stock In documents
export const generateDummyStockIn = (): StockInDocument[] => {
  const documents: StockInDocument[] = [];
  const suppliers = ['ABC Suppliers', 'XYZ Trading', 'Global Imports', 'Local Distributors', 'Premium Goods Ltd'];
  const documentTypes: DocumentType[] = ['GRN', 'Delivery Challan', 'Purchase Order'];
  const statuses: StockInStatus[] = ['pending', 'received', 'inspected', 'assigned', 'completed'];

  const products = [
    { sku: 'SKU-001', name: 'Cotton T-Shirt' },
    { sku: 'SKU-002', name: 'Denim Jeans' },
    { sku: 'SKU-003', name: 'Silk Scarf' },
    { sku: 'SKU-004', name: 'Wool Sweater' },
    { sku: 'SKU-005', name: 'Leather Jacket' },
    { sku: 'SKU-006', name: 'Canvas Bag' },
    { sku: 'SKU-007', name: 'Running Shoes' },
    { sku: 'SKU-008', name: 'Baseball Cap' },
  ];

  for (let i = 1; i <= 30; i++) {
    const docType = documentTypes[Math.floor(Math.random() * documentTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const itemCount = Math.floor(Math.random() * 5) + 2;
    const items = [];

    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 100) + 10;
      const receivedQty = status === 'pending' ? 0 : Math.floor(quantity * (0.8 + Math.random() * 0.2));
      const unitPrice = Math.floor(Math.random() * 5000) + 500;

      items.push({
        id: `item-${i}-${j}`,
        sku: product.sku,
        name: product.name,
        quantity,
        receivedQuantity: receivedQty,
        unitPrice,
        batchNumber: `BATCH-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
        expiryDate: Math.random() > 0.7
          ? new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : undefined,
        status,
      });
    }

    const totalValue = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    documents.push({
      id: `DOC-${String(i).padStart(6, '0')}`,
      documentNumber: `${docType}-${String(i).padStart(6, '0')}`,
      documentType: docType,
      supplierName: supplier,
      supplierCode: `SUP-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items,
      totalValue,
      status,
    });
  }

  return documents;
};

// Generate dummy Pick & Pack lists
export const generateDummyPickPackLists = (): PickPackList[] => {
  const lists: PickPackList[] = [];
  const statuses: StockOutStatus[] = ['pending', 'picked', 'quality-checked', 'packed', 'dispatched'];

  const products = [
    { sku: 'SKU-001', name: 'Cotton T-Shirt' },
    { sku: 'SKU-002', name: 'Denim Jeans' },
    { sku: 'SKU-003', name: 'Silk Scarf' },
    { sku: 'SKU-004', name: 'Wool Sweater' },
    { sku: 'SKU-005', name: 'Leather Jacket' },
  ];

  const locations = ['A-1-2', 'B-3-1', 'C-2-4', 'D-1-3', 'E-4-2'];

  for (let i = 1; i <= 25; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const items = [];

    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const requestedQty = Math.floor(Math.random() * 20) + 1;
      const pickedQty = status === 'pending' ? 0 : Math.floor(requestedQty * (0.9 + Math.random() * 0.1));

      items.push({
        id: `out-item-${i}-${j}`,
        sku: product.sku,
        name: product.name,
        requestedQuantity: requestedQty,
        pickedQuantity: pickedQty,
        location: locations[Math.floor(Math.random() * locations.length)],
        qualityStatus: status === 'pending' || status === 'picked' ? 'pending' : 'passed',
        batchNumber: `BATCH-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
      });
    }

    lists.push({
      id: `PPL-${String(i).padStart(6, '0')}`,
      orderNumber: `ORD-${String(i).padStart(6, '0')}`,
      date: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items,
      status,
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
      assignedTo: status !== 'pending' ? `User-${Math.floor(Math.random() * 10) + 1}` : undefined,
    });
  }

  return lists;
};

// Generate dummy quality checks
export const generateDummyQualityChecks = (): QualityCheck[] => {
  const checks: QualityCheck[] = [];
  const statuses: QualityStatus[] = ['passed', 'failed', 'pending'];

  for (let i = 1; i <= 20; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const defects = status === 'failed' 
      ? ['Color mismatch', 'Size variation', 'Damaged packaging'][Math.floor(Math.random() * 3)]
      : undefined;

    checks.push({
      id: `QC-${String(i).padStart(6, '0')}`,
      itemId: `item-${i}`,
      sku: `SKU-${String(Math.floor(Math.random() * 8) + 1).padStart(3, '0')}`,
      quantity: Math.floor(Math.random() * 50) + 10,
      status,
      checkedBy: `Inspector-${Math.floor(Math.random() * 5) + 1}`,
      checkedAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
      notes: status === 'failed' ? 'Items do not meet quality standards' : 'All items passed inspection',
      defects: defects ? [defects] : undefined,
    });
  }

  return checks;
};

// Generate dummy dispatch summaries
export const generateDummyDispatchSummaries = (): DispatchSummary[] => {
  const summaries: DispatchSummary[] = [];
  const courierServices: CourierService[] = ['FedEx', 'UPS', 'DHL', 'BlueDart', 'DTDC'];

  const customers = [
    { name: 'John Smith', city: 'New York' },
    { name: 'Jane Doe', city: 'Los Angeles' },
    { name: 'Robert Johnson', city: 'Chicago' },
    { name: 'Emily Davis', city: 'Houston' },
    { name: 'Michael Brown', city: 'Phoenix' },
  ];

  const products = [
    { sku: 'SKU-001', name: 'Cotton T-Shirt' },
    { sku: 'SKU-002', name: 'Denim Jeans' },
    { sku: 'SKU-003', name: 'Silk Scarf' },
  ];

  for (let i = 1; i <= 15; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let totalValue = 0;

    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 10) + 1;
      const unitPrice = Math.floor(Math.random() * 5000) + 500;
      totalValue += quantity * unitPrice;

      items.push({
        id: `dispatch-item-${i}-${j}`,
        sku: product.sku,
        name: product.name,
        quantity,
        batchNumber: `BATCH-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
      });
    }

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const courierService = courierServices[Math.floor(Math.random() * courierServices.length)];

    summaries.push({
      id: `DISP-${String(i).padStart(6, '0')}`,
      dispatchNumber: `DISP-${String(i).padStart(6, '0')}`,
      date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items,
      customerDetails: {
        name: customer.name,
        address: `${Math.floor(Math.random() * 9999) + 1} Main St, ${customer.city}`,
        phone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        email: `${customer.name.toLowerCase().replace(' ', '.')}@example.com`,
      },
      courierService,
      trackingNumber: `TRACK-${String(Math.floor(Math.random() * 1000000)).padStart(10, '0')}`,
      shippingManifest: {
        totalItems,
        totalWeight: totalItems * (0.5 + Math.random() * 2),
        totalValue,
        packageCount: Math.ceil(itemCount / 2),
        specialInstructions: Math.random() > 0.7 ? 'Handle with care' : undefined,
      },
      status: 'dispatched',
    });
  }

  return summaries;
};

// Generate dummy courier integrations
export const generateDummyCourierIntegrations = (): CourierIntegration[] => {
  const services: CourierService[] = ['FedEx', 'UPS', 'DHL', 'BlueDart', 'DTDC', 'Custom'];

  return services.map((service, index) => ({
    id: `courier-${index + 1}`,
    serviceName: service,
    isConfigured: Math.random() > 0.3,
    isActive: Math.random() > 0.5,
    lastSync: Math.random() > 0.5
      ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      : undefined,
  }));
};



