import {
  InventoryAlert,
  InventorySummary,
  PendingDelivery,
  YarnInventory,
} from "../types";

interface DeliverySeed {
  id: string;
  expectedDate: string;
  supplier: string;
  poNumber: string;
  yarns: {
    yarnName: string;
    quantity: number;
    ratePerUnit: number;
    totalValue: number;
  }[];
}

const inventorySeed: YarnInventory[] = [
  {
    id: "1",
    yarnName: "Cotton Yarn Premium 40s",
    weight: 2500,
    conesLongTerm: 120,
    conesShortTerm: 30,
    blockedQty: 500,
    availableQty: 2000,
    unitOfMeasurement: "kg",
    ratePerUnit: 250,
    totalValue: 625000,
    lastUpdated: "2025-11-10",
    status: "In Stock",
    supplier: "Textile Mills Ltd",
    lotNo: "COT-2025-001",
  },
  {
    id: "2",
    yarnName: "Polyester Blend 30s",
    weight: 1800,
    conesLongTerm: 85,
    conesShortTerm: 20,
    blockedQty: 300,
    availableQty: 1500,
    unitOfMeasurement: "kg",
    ratePerUnit: 180,
    totalValue: 324000,
    lastUpdated: "2025-11-09",
    status: "In Stock",
    supplier: "Synthetic Fibers Inc",
    lotNo: "POL-2025-002",
  },
  {
    id: "3",
    yarnName: "Silk Yarn Luxury 60s",
    weight: 450,
    conesLongTerm: 25,
    conesShortTerm: 5,
    blockedQty: 200,
    availableQty: 250,
    unitOfMeasurement: "kg",
    ratePerUnit: 1200,
    totalValue: 540000,
    lastUpdated: "2025-11-08",
    status: "Low Stock",
    supplier: "Silk Traders Co",
    lotNo: "SLK-2025-003",
  },
  {
    id: "4",
    yarnName: "Wool Yarn Winter 20s",
    weight: 0,
    conesLongTerm: 0,
    conesShortTerm: 0,
    blockedQty: 0,
    availableQty: 0,
    unitOfMeasurement: "kg",
    ratePerUnit: 400,
    totalValue: 0,
    lastUpdated: "2025-11-07",
    status: "Out of Stock",
    supplier: "Wool Suppliers Ltd",
    lotNo: "WOL-2025-004",
  },
  {
    id: "5",
    yarnName: "Linen Yarn Natural 35s",
    weight: 1200,
    conesLongTerm: 60,
    conesShortTerm: 15,
    blockedQty: 150,
    availableQty: 1050,
    unitOfMeasurement: "kg",
    ratePerUnit: 350,
    totalValue: 420000,
    lastUpdated: "2025-11-06",
    status: "In Stock",
    supplier: "Natural Fibers Co",
    lotNo: "LIN-2025-005",
  },
  {
    id: "6",
    yarnName: "Cotton Yarn Standard 32s",
    weight: 3200,
    conesLongTerm: 150,
    conesShortTerm: 40,
    blockedQty: 800,
    availableQty: 2400,
    unitOfMeasurement: "kg",
    ratePerUnit: 220,
    totalValue: 704000,
    lastUpdated: "2025-11-11",
    status: "In Stock",
    supplier: "Textile Mills Ltd",
    lotNo: "COT-2025-006",
  },
  {
    id: "7",
    yarnName: "Bamboo Yarn Eco 50s",
    weight: 950,
    conesLongTerm: 45,
    conesShortTerm: 12,
    blockedQty: 200,
    availableQty: 750,
    unitOfMeasurement: "kg",
    ratePerUnit: 450,
    totalValue: 427500,
    lastUpdated: "2025-11-05",
    status: "In Stock",
    supplier: "Eco Fibers Co",
    lotNo: "BAM-2025-007",
  },
  {
    id: "8",
    yarnName: "Acrylic Yarn Soft 24s",
    weight: 2800,
    conesLongTerm: 130,
    conesShortTerm: 35,
    blockedQty: 600,
    availableQty: 2200,
    unitOfMeasurement: "kg",
    ratePerUnit: 150,
    totalValue: 420000,
    lastUpdated: "2025-11-04",
    status: "In Stock",
    supplier: "Synthetic Fibers Inc",
    lotNo: "ACR-2025-008",
  },
  {
    id: "9",
    yarnName: "Cashmere Yarn Premium 80s",
    weight: 180,
    conesLongTerm: 10,
    conesShortTerm: 2,
    blockedQty: 50,
    availableQty: 130,
    unitOfMeasurement: "kg",
    ratePerUnit: 2500,
    totalValue: 450000,
    lastUpdated: "2025-11-03",
    status: "Low Stock",
    supplier: "Luxury Yarns Ltd",
    lotNo: "CAS-2025-009",
  },
  {
    id: "10",
    yarnName: "Hemp Yarn Natural 28s",
    weight: 1500,
    conesLongTerm: 70,
    conesShortTerm: 18,
    blockedQty: 250,
    availableQty: 1250,
    unitOfMeasurement: "kg",
    ratePerUnit: 380,
    totalValue: 570000,
    lastUpdated: "2025-11-02",
    status: "In Stock",
    supplier: "Natural Fibers Co",
    lotNo: "HEM-2025-010",
  },
  {
    id: "11",
    yarnName: "Cotton Yarn Premium 40s",
    weight: 2100,
    conesLongTerm: 100,
    conesShortTerm: 25,
    blockedQty: 400,
    availableQty: 1700,
    unitOfMeasurement: "kg",
    ratePerUnit: 250,
    totalValue: 525000,
    lastUpdated: "2025-11-01",
    status: "In Stock",
    supplier: "Textile Mills Ltd",
    lotNo: "COT-2025-011",
  },
  {
    id: "12",
    yarnName: "Polyester Yarn Strong 36s",
    weight: 1900,
    conesLongTerm: 90,
    conesShortTerm: 22,
    blockedQty: 350,
    availableQty: 1550,
    unitOfMeasurement: "kg",
    ratePerUnit: 190,
    totalValue: 361000,
    lastUpdated: "2025-10-31",
    status: "In Stock",
    supplier: "Synthetic Fibers Inc",
    lotNo: "POL-2025-012",
  },
  {
    id: "13",
    yarnName: "Silk Yarn Deluxe 70s",
    weight: 320,
    conesLongTerm: 18,
    conesShortTerm: 4,
    blockedQty: 150,
    availableQty: 170,
    unitOfMeasurement: "kg",
    ratePerUnit: 1500,
    totalValue: 480000,
    lastUpdated: "2025-10-30",
    status: "Low Stock",
    supplier: "Silk Traders Co",
    lotNo: "SLK-2025-013",
  },
  {
    id: "14",
    yarnName: "Cotton Yarn Organic 38s",
    weight: 1600,
    conesLongTerm: 75,
    conesShortTerm: 20,
    blockedQty: 300,
    availableQty: 1300,
    unitOfMeasurement: "kg",
    ratePerUnit: 280,
    totalValue: 448000,
    lastUpdated: "2025-10-29",
    status: "In Stock",
    supplier: "Organic Textiles Ltd",
    lotNo: "ORG-2025-014",
  },
  {
    id: "15",
    yarnName: "Wool Yarn Merino 22s",
    weight: 1100,
    conesLongTerm: 52,
    conesShortTerm: 13,
    blockedQty: 200,
    availableQty: 900,
    unitOfMeasurement: "kg",
    ratePerUnit: 420,
    totalValue: 462000,
    lastUpdated: "2025-10-28",
    status: "In Stock",
    supplier: "Wool Suppliers Ltd",
    lotNo: "WOL-2025-015",
  },
  {
    id: "16",
    yarnName: "Linen Yarn Fine 40s",
    weight: 800,
    conesLongTerm: 38,
    conesShortTerm: 10,
    blockedQty: 100,
    availableQty: 700,
    unitOfMeasurement: "kg",
    ratePerUnit: 400,
    totalValue: 320000,
    lastUpdated: "2025-10-27",
    status: "In Stock",
    supplier: "Natural Fibers Co",
    lotNo: "LIN-2025-016",
  },
  {
    id: "17",
    yarnName: "Bamboo Yarn Soft 45s",
    weight: 750,
    conesLongTerm: 35,
    conesShortTerm: 9,
    blockedQty: 120,
    availableQty: 630,
    unitOfMeasurement: "kg",
    ratePerUnit: 480,
    totalValue: 360000,
    lastUpdated: "2025-10-26",
    status: "In Stock",
    supplier: "Eco Fibers Co",
    lotNo: "BAM-2025-017",
  },
  {
    id: "18",
    yarnName: "Acrylic Yarn Bright 26s",
    weight: 2200,
    conesLongTerm: 105,
    conesShortTerm: 28,
    blockedQty: 500,
    availableQty: 1700,
    unitOfMeasurement: "kg",
    ratePerUnit: 160,
    totalValue: 352000,
    lastUpdated: "2025-10-25",
    status: "In Stock",
    supplier: "Synthetic Fibers Inc",
    lotNo: "ACR-2025-018",
  },
  {
    id: "19",
    yarnName: "Cotton Yarn Premium 40s",
    weight: 500,
    conesLongTerm: 24,
    conesShortTerm: 6,
    blockedQty: 600,
    availableQty: -100,
    unitOfMeasurement: "kg",
    ratePerUnit: 250,
    totalValue: 125000,
    lastUpdated: "2025-10-24",
    status: "Low Stock",
    supplier: "Textile Mills Ltd",
    lotNo: "COT-2025-019",
  },
  {
    id: "20",
    yarnName: "Silk Yarn Luxury 60s",
    weight: 200,
    conesLongTerm: 12,
    conesShortTerm: 3,
    blockedQty: 50,
    availableQty: 150,
    unitOfMeasurement: "kg",
    ratePerUnit: 1200,
    totalValue: 240000,
    lastUpdated: "2025-10-23",
    status: "Low Stock",
    supplier: "Silk Traders Co",
    lotNo: "SLK-2025-020",
  },
];

const pendingDeliverySeed: DeliverySeed[] = [
  {
    id: "D1",
    expectedDate: "2025-11-25",
    supplier: "Wool Suppliers Ltd",
    poNumber: "PO-2025-001",
    yarns: [
      {
        yarnName: "Wool Yarn Winter 20s",
        quantity: 500,
        ratePerUnit: 400,
        totalValue: 200000,
      },
      {
        yarnName: "Cotton Yarn Premium 40s",
        quantity: 800,
        ratePerUnit: 250,
        totalValue: 200000,
      },
      {
        yarnName: "Polyester Blend 30s",
        quantity: 600,
        ratePerUnit: 180,
        totalValue: 108000,
      },
      {
        yarnName: "Linen Yarn Natural 35s",
        quantity: 400,
        ratePerUnit: 350,
        totalValue: 140000,
      },
      {
        yarnName: "Bamboo Yarn Eco 50s",
        quantity: 200,
        ratePerUnit: 450,
        totalValue: 90000,
      },
    ],
  },
  {
    id: "D2",
    expectedDate: "2025-11-20",
    supplier: "Textile Mills Ltd",
    poNumber: "PO-2025-002",
    yarns: [
      {
        yarnName: "Cotton Yarn Premium 40s",
        quantity: 1000,
        ratePerUnit: 250,
        totalValue: 250000,
      },
      {
        yarnName: "Cotton Yarn Standard 32s",
        quantity: 1200,
        ratePerUnit: 220,
        totalValue: 264000,
      },
      {
        yarnName: "Cotton Yarn Organic 38s",
        quantity: 1000,
        ratePerUnit: 280,
        totalValue: 280000,
      },
    ],
  },
  {
    id: "D3",
    expectedDate: "2025-11-28",
    supplier: "Silk Traders Co",
    poNumber: "PO-2025-003",
    yarns: [
      {
        yarnName: "Silk Yarn Luxury 60s",
        quantity: 200,
        ratePerUnit: 1200,
        totalValue: 240000,
      },
      {
        yarnName: "Silk Yarn Deluxe 70s",
        quantity: 300,
        ratePerUnit: 1500,
        totalValue: 450000,
      },
      {
        yarnName: "Cashmere Yarn Premium 80s",
        quantity: 100,
        ratePerUnit: 2500,
        totalValue: 250000,
      },
      {
        yarnName: "Linen Yarn Fine 40s",
        quantity: 400,
        ratePerUnit: 400,
        totalValue: 160000,
      },
      {
        yarnName: "Bamboo Yarn Soft 45s",
        quantity: 300,
        ratePerUnit: 480,
        totalValue: 144000,
      },
      {
        yarnName: "Hemp Yarn Natural 28s",
        quantity: 200,
        ratePerUnit: 380,
        totalValue: 76000,
      },
    ],
  },
];

const alertSeed: InventoryAlert[] = [
  {
    id: "A1",
    yarnId: "3",
    yarnName: "Silk Yarn Luxury 60s",
    alertType: "Low Stock",
    message: "Stock is below minimum threshold",
    createdAt: "2025-11-10",
    severity: "medium",
  },
  {
    id: "A2",
    yarnId: "4",
    yarnName: "Wool Yarn Winter 20s",
    alertType: "Out of Stock",
    message: "Item is out of stock",
    createdAt: "2025-11-09",
    severity: "high",
  },
  {
    id: "A3",
    yarnId: "19",
    yarnName: "Cotton Yarn Premium 40s",
    alertType: "Overblocked",
    message: "Blocked quantity exceeds available stock. Urgent PO required.",
    createdAt: "2025-11-12",
    severity: "high",
  },
];

const cloneInventory = (data: YarnInventory[]): YarnInventory[] =>
  data.map((item) => ({ ...item }));

const cloneAlerts = (alerts: InventoryAlert[]): InventoryAlert[] =>
  alerts.map((alert) => ({ ...alert }));

const buildPendingDeliveries = (deliveries: DeliverySeed[]): PendingDelivery[] =>
  deliveries.map((delivery) => {
    const totalQuantity = delivery.yarns.reduce(
      (sum, yarn) => sum + yarn.quantity,
      0
    );

    return {
      id: delivery.id,
      yarnName: "Multiple Yarns",
      quantity: totalQuantity,
      expectedDate: delivery.expectedDate,
      supplier: delivery.supplier,
      poNumber: delivery.poNumber,
      yarns: delivery.yarns.map((yarn) => ({ ...yarn })),
    };
  });

export const getDummyInventory = (): YarnInventory[] =>
  cloneInventory(inventorySeed);

export const getDummyPendingDeliveries = (): PendingDelivery[] =>
  buildPendingDeliveries(pendingDeliverySeed);

export const getDummyInventoryAlerts = (): InventoryAlert[] =>
  cloneAlerts(alertSeed);

export const getInventorySummary = (
  inventory: YarnInventory[],
  pendingDeliveries: PendingDelivery[],
  alerts: InventoryAlert[]
): InventorySummary => {
  const totalStock = inventory.reduce((sum, item) => sum + item.weight, 0);
  const purchaseYarn = inventory.reduce((sum, item) => sum + item.weight, 0);
  const inventoryValue = inventory.reduce(
    (sum, item) => sum + item.totalValue,
    0
  );

  return {
    totalStock,
    purchaseYarn,
    pendingDeliveries: pendingDeliveries.length,
    inventoryAlerts: alerts.length,
    inventoryValue,
  };
};


