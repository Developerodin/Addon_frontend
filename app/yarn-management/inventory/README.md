# Yarn Inventory Management System

## Overview
A comprehensive yarn inventory management system with real-time stock tracking, alerts, transaction history, and reporting capabilities.

## Key Features

### 🔍 Real-time Stock Summary
- **Yarn Name**: Complete identification of yarn items
- **Opening Balance**: Starting stock quantity
- **Purchased Quantity**: Stock added through purchases
- **Issued Quantity**: Stock consumed/issued
- **Closing Balance**: Current available stock
- **Status Indicators**: In Stock, Low Stock, Out of Stock

### 🎯 Advanced Filtering
- **Yarn Type**: Filter by Cotton, Polyester, Silk, Wool, Linen
- **Color**: Visual color filtering with color swatches
- **Supplier**: Filter by supplier companies
- **Lot/Batch**: Track specific production batches
- **Status**: Filter by stock status
- **Date Range**: Filter transactions by date range

### 📊 Stock Alerts & Monitoring
- **Low Stock Alerts**: Automatic notifications when stock falls below minimum threshold
- **Out of Stock Alerts**: Critical alerts for zero stock items
- **Real-time Status Updates**: Dynamic status calculation based on current stock levels
- **Visual Alert Cards**: Prominent display of critical stock situations

### 📈 Transaction History & Ledger
- **Complete Audit Trail**: Every stock movement is recorded
- **Transaction Types**:
  - Purchase: Stock additions from suppliers
  - Issue: Stock consumption for production
  - Adjustment: Manual corrections with admin approval
- **Detailed Information**:
  - Date and time of transaction
  - Quantity in/out
  - Balance after transaction
  - Reference numbers
  - Created by user
  - Remarks and notes

### 🔧 Stock Adjustment System
- **Manual Adjustments**: Admin-approved stock corrections
- **Add/Subtract Operations**: Flexible stock modification
- **Validation**: Prevents negative stock adjustments
- **Audit Trail**: All adjustments are logged with reasons
- **Real-time Updates**: Immediate status recalculation

### 📋 Reporting & Analytics
- **Stock Reports**: Generate comprehensive inventory reports
- **Date Range Reports**: Customizable reporting periods
- **Export Capabilities**: PDF/Excel export functionality
- **Summary Statistics**: Total value, item counts, alert summaries

## Data Structure

### YarnInventory Interface
```typescript
interface YarnInventory {
  id: string;
  yarnName: string;
  yarnType: string;
  countDenier: string;
  color: string;
  lotNo: string;
  supplier: string;
  openingBalance: number;
  purchasedQuantity: number;
  issuedQuantity: number;
  closingBalance: number;
  unitOfMeasurement: string;
  ratePerUnit: number;
  totalValue: number;
  lastUpdated: string;
  minimumStock: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  location: string;
  remarks: string;
}
```

### TransactionHistory Interface
```typescript
interface TransactionHistory {
  id: string;
  yarnId: string;
  date: string;
  transactionType: 'Purchase' | 'Issue' | 'Adjustment';
  quantityIn: number;
  quantityOut: number;
  balanceAfterTransaction: number;
  reference: string;
  remarks: string;
  createdBy: string;
}
```

### StockAlert Interface
```typescript
interface StockAlert {
  id: string;
  yarnId: string;
  yarnName: string;
  currentStock: number;
  minimumStock: number;
  alertType: 'Low Stock' | 'Out of Stock';
  createdAt: string;
}
```

## Sample Data
The system includes comprehensive sample data with:
- 5 different yarn types (Cotton, Polyester, Silk, Wool, Linen)
- Various suppliers and lot numbers
- Realistic stock levels and transactions
- Different stock statuses for demonstration
- Complete transaction history

## Components

### Main Components
- **InventoryPage**: Main inventory management interface
- **StockAdjustmentForm**: Modal form for stock adjustments

### Key Functions
- **handleStockAdjustment**: Processes stock adjustments with validation
- **generateStockReport**: Creates comprehensive stock reports
- **filteredInventory**: Advanced filtering logic
- **filteredTransactions**: Date-range filtered transaction history

## Integration Points

### Auto-updates from Other Modules
- **Purchase Module**: Automatically updates purchased quantities
- **Issue Module**: Automatically updates issued quantities
- **Production Module**: Real-time stock consumption tracking

### Admin Approval System
- Manual stock adjustments require admin approval
- All adjustments are logged with user information
- Complete audit trail for compliance

## Usage

### Viewing Inventory
1. Navigate to `/yarn-management/inventory`
2. View real-time stock summary
3. Use filters to find specific items
4. Check stock alerts for critical items

### Stock Adjustments
1. Click the adjustment button (orange icon) for any yarn item
2. Select add or subtract operation
3. Enter quantity and remarks
4. Review preview before confirming
5. Adjustment is processed and logged

### Transaction History
1. Click "Transaction History" button
2. View complete audit trail
3. Filter by date range
4. Export for reporting

### Generating Reports
1. Set date range filters
2. Apply other filters as needed
3. Click "Generate Report"
4. Export report data

## Security & Permissions
- Permission-based access control
- Admin-only stock adjustments
- Complete user tracking for all operations
- Secure transaction logging

## Future Enhancements
- Barcode scanning integration
- Mobile app support
- Advanced analytics dashboard
- Automated reorder suggestions
- Supplier integration APIs
- Multi-location inventory tracking
