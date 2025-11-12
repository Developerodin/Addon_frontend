"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import StockAdjustmentForm from "./components/StockAdjustmentForm";

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

interface StockAlert {
  id: string;
  yarnId: string;
  yarnName: string;
  currentStock: number;
  minimumStock: number;
  alertType: 'Low Stock' | 'Out of Stock';
  createdAt: string;
}

const DashboardPage = () => {
  const { hasSubPermission } = useNavigation();
  const [inventory, setInventory] = useState<YarnInventory[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistory[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yarnTypeFilter, setYarnTypeFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [lotFilter, setLotFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [selectedYarn, setSelectedYarn] = useState<YarnInventory | null>(null);

  // Sample data for demonstration
  useEffect(() => {
    const sampleInventory: YarnInventory[] = [
      {
        id: "1",
        yarnName: "Cotton Yarn Premium",
        yarnType: "Cotton",
        countDenier: "40s",
        color: "#FF6B6B",
        lotNo: "COT-2024-001",
        supplier: "Textile Mills Ltd",
        openingBalance: 1000,
        purchasedQuantity: 500,
        issuedQuantity: 300,
        closingBalance: 1200,
        unitOfMeasurement: "kg",
        ratePerUnit: 250,
        totalValue: 300000,
        lastUpdated: "2024-01-15",
        minimumStock: 200,
        status: "In Stock",
        location: "Warehouse A",
        remarks: "High quality cotton yarn"
      },
      {
        id: "2",
        yarnName: "Polyester Blend",
        yarnType: "Polyester",
        countDenier: "30s",
        color: "#4ECDC4",
        lotNo: "POL-2024-002",
        supplier: "Synthetic Fibers Inc",
        openingBalance: 800,
        purchasedQuantity: 200,
        issuedQuantity: 150,
        closingBalance: 850,
        unitOfMeasurement: "kg",
        ratePerUnit: 180,
        totalValue: 153000,
        lastUpdated: "2024-01-14",
        minimumStock: 100,
        status: "In Stock",
        location: "Warehouse B",
        remarks: "Durable polyester blend"
      },
      {
        id: "3",
        yarnName: "Silk Yarn Luxury",
        yarnType: "Silk",
        countDenier: "60s",
        color: "#45B7D1",
        lotNo: "SLK-2024-003",
        supplier: "Silk Traders Co",
        openingBalance: 200,
        purchasedQuantity: 50,
        issuedQuantity: 80,
        closingBalance: 170,
        unitOfMeasurement: "kg",
        ratePerUnit: 1200,
        totalValue: 204000,
        lastUpdated: "2024-01-13",
        minimumStock: 50,
        status: "Low Stock",
        location: "Warehouse C",
        remarks: "Premium silk yarn"
      },
      {
        id: "4",
        yarnName: "Wool Yarn Winter",
        yarnType: "Wool",
        countDenier: "20s",
        color: "#96CEB4",
        lotNo: "WOL-2024-004",
        supplier: "Wool Suppliers Ltd",
        openingBalance: 150,
        purchasedQuantity: 0,
        issuedQuantity: 160,
        closingBalance: 0,
        unitOfMeasurement: "kg",
        ratePerUnit: 400,
        totalValue: 0,
        lastUpdated: "2024-01-12",
        minimumStock: 30,
        status: "Out of Stock",
        location: "Warehouse A",
        remarks: "Winter wool yarn"
      },
      {
        id: "5",
        yarnName: "Linen Yarn Natural",
        yarnType: "Linen",
        countDenier: "35s",
        color: "#FFEAA7",
        lotNo: "LIN-2024-005",
        supplier: "Natural Fibers Co",
        openingBalance: 300,
        purchasedQuantity: 100,
        issuedQuantity: 50,
        closingBalance: 350,
        unitOfMeasurement: "kg",
        ratePerUnit: 350,
        totalValue: 122500,
        lastUpdated: "2024-01-11",
        minimumStock: 75,
        status: "In Stock",
        location: "Warehouse B",
        remarks: "Natural linen yarn"
      }
    ];

    const sampleTransactions: TransactionHistory[] = [
      {
        id: "T1",
        yarnId: "1",
        date: "2024-01-15",
        transactionType: "Purchase",
        quantityIn: 500,
        quantityOut: 0,
        balanceAfterTransaction: 1200,
        reference: "PO-2024-001",
        remarks: "Bulk purchase order",
        createdBy: "Admin"
      },
      {
        id: "T2",
        yarnId: "1",
        date: "2024-01-14",
        transactionType: "Issue",
        quantityIn: 0,
        quantityOut: 300,
        balanceAfterTransaction: 700,
        reference: "IS-2024-001",
        remarks: "Production issue",
        createdBy: "Production Manager"
      },
      {
        id: "T3",
        yarnId: "3",
        date: "2024-01-13",
        transactionType: "Issue",
        quantityIn: 0,
        quantityOut: 80,
        balanceAfterTransaction: 170,
        reference: "IS-2024-002",
        remarks: "Urgent production requirement",
        createdBy: "Production Manager"
      }
    ];

    const sampleAlerts: StockAlert[] = [
      {
        id: "A1",
        yarnId: "3",
        yarnName: "Silk Yarn Luxury",
        currentStock: 170,
        minimumStock: 50,
        alertType: "Low Stock",
        createdAt: "2024-01-13"
      },
      {
        id: "A2",
        yarnId: "4",
        yarnName: "Wool Yarn Winter",
        currentStock: 0,
        minimumStock: 30,
        alertType: "Out of Stock",
        createdAt: "2024-01-12"
      }
    ];

    setInventory(sampleInventory);
    setTransactionHistory(sampleTransactions);
    setStockAlerts(sampleAlerts);
  }, []);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management', 'Dashboard');

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Yarn Management Dashboard.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  const handleDeleteInventory = async (inventoryId: string) => {
    if (!confirm('Are you sure you want to delete this inventory record?')) return;
    
    try {
      // TODO: Implement API call to delete inventory
      setInventory(prev => prev.filter(item => item.id !== inventoryId));
      toast.success('Inventory record deleted successfully');
    } catch (error) {
      console.error('Failed to delete inventory:', error);
      toast.error('Failed to delete inventory record');
    }
  };

  const handleStockAdjustment = async (yarnId: string, adjustmentQuantity: number, adjustmentType: 'add' | 'subtract', remarks: string) => {
    try {
      const yarn = inventory.find(item => item.id === yarnId);
      if (!yarn) return;

      const newQuantity = adjustmentType === 'add' 
        ? yarn.closingBalance + adjustmentQuantity 
        : yarn.closingBalance - adjustmentQuantity;

      if (newQuantity < 0) {
        toast.error('Cannot adjust stock below zero');
        return;
      }

      // Update inventory
      setInventory(prev => prev.map(item => 
        item.id === yarnId 
          ? { 
              ...item, 
              closingBalance: newQuantity,
              status: newQuantity === 0 ? 'Out of Stock' : 
                     newQuantity <= item.minimumStock ? 'Low Stock' : 'In Stock',
              lastUpdated: new Date().toISOString().split('T')[0]
            }
          : item
      ));

      // Add transaction record
      const newTransaction: TransactionHistory = {
        id: `T${Date.now()}`,
        yarnId,
        date: new Date().toISOString().split('T')[0],
        transactionType: 'Adjustment',
        quantityIn: adjustmentType === 'add' ? adjustmentQuantity : 0,
        quantityOut: adjustmentType === 'subtract' ? adjustmentQuantity : 0,
        balanceAfterTransaction: newQuantity,
        reference: `ADJ-${Date.now()}`,
        remarks,
        createdBy: 'Current User'
      };

      setTransactionHistory(prev => [newTransaction, ...prev]);
      toast.success('Stock adjustment completed successfully');
      setShowStockAdjustment(false);
      setSelectedYarn(null);
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      toast.error('Failed to adjust stock');
    }
  };

  const generateStockReport = () => {
    const filteredData = filteredInventory;
    const reportData = {
      generatedOn: new Date().toLocaleDateString(),
      dateRange: dateRange.from && dateRange.to ? `${dateRange.from} to ${dateRange.to}` : 'All Time',
      totalItems: filteredData.length,
      totalValue: filteredData.reduce((sum, item) => sum + item.totalValue, 0),
      lowStockItems: filteredData.filter(item => item.status === 'Low Stock').length,
      outOfStockItems: filteredData.filter(item => item.status === 'Out of Stock').length,
      items: filteredData
    };
    
    // In a real app, this would generate and download a PDF/Excel report
    console.log('Stock Report:', reportData);
    toast.success('Stock report generated successfully');
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.yarnName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.yarnType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.countDenier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lotNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesYarnType = yarnTypeFilter === "all" || item.yarnType === yarnTypeFilter;
    const matchesColor = colorFilter === "all" || item.color === colorFilter;
    const matchesSupplier = supplierFilter === "all" || item.supplier === supplierFilter;
    const matchesLot = lotFilter === "all" || item.lotNo === lotFilter;
    
    return matchesSearch && matchesStatus && matchesYarnType && matchesColor && matchesSupplier && matchesLot;
  });

  const filteredTransactions = transactionHistory.filter(transaction => {
    if (!dateRange.from || !dateRange.to) return true;
    return transaction.date >= dateRange.from && transaction.date <= dateRange.to;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'bg-green-100 text-green-800';
      case 'Low Stock': return 'bg-yellow-100 text-yellow-800';
      case 'Out of Stock': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalValue = filteredInventory.reduce((sum, item) => sum + item.totalValue, 0);
  const lowStockCount = filteredInventory.filter(item => item.status === 'Low Stock').length;
  const outOfStockCount = filteredInventory.filter(item => item.status === 'Out of Stock').length;
  const inStockCount = filteredInventory.filter(item => item.status === 'In Stock').length;
  const totalItems = filteredInventory.length;
  const recentTransactions = transactionHistory.slice(0, 5);

  return (
    <div className="main-content">
      <Seo title="Yarn Management Dashboard" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Yarn Management Dashboard</h1>
                <p className="text-gray-600 mt-1">Overview of inventory, stock alerts, and recent transactions</p>
              </div>
              <div className="box-tools flex gap-2">
                <button 
                  onClick={() => setShowTransactionHistory(true)}
                  className="ti-btn ti-btn-outline-primary"
                >
                  <i className="ri-history-line me-1"></i>
                  Transaction History
                </button>
                <button 
                  onClick={generateStockReport}
                  className="ti-btn ti-btn-outline-secondary"
                >
                  <i className="ri-file-download-line me-1"></i>
                  Generate Report
                </button>
                <Link 
                  href="/yarn-management/dashboard/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-1"></i>
                  Add Inventory
                </Link>
              </div>
            </div>
          </div>

          {/* Stock Alerts */}
          {stockAlerts.length > 0 && (
            <div className="box border-l-4 border-red-500 mb-6">
              <div className="box-header">
                <h3 className="box-title text-red-700">
                  <i className="ri-alarm-warning-line me-2"></i>
                  Stock Alerts ({stockAlerts.length})
                </h3>
              </div>
              <div className="box-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stockAlerts.map((alert) => (
                    <div key={alert.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-red-800">{alert.yarnName}</h4>
                          <p className="text-sm text-red-600">
                            Current: {alert.currentStock} | Minimum: {alert.minimumStock}
                          </p>
                          <p className="text-xs text-red-500 mt-1">
                            Alert: {alert.alertType} | {alert.createdAt}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          alert.alertType === 'Out of Stock' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {alert.alertType}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            <div className="box">
              <div className="box-body text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {totalItems}
                </div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
            </div>
            <div className="box">
              <div className="box-body text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  ₹{totalValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
            </div>
            <div className="box">
              <div className="box-body text-center">
                <div className="text-3xl font-bold text-emerald-600 mb-2">
                  {inStockCount}
                </div>
                <div className="text-sm text-gray-600">In Stock</div>
              </div>
            </div>
            <div className="box">
              <div className="box-body text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-2">
                  {lowStockCount}
                </div>
                <div className="text-sm text-gray-600">Low Stock</div>
              </div>
            </div>
            <div className="box">
              <div className="box-body text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {outOfStockCount}
                </div>
                <div className="text-sm text-gray-600">Out of Stock</div>
              </div>
            </div>
          </div>

          {/* Quick Actions and Recent Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Quick Actions */}
            <div className="box">
              <div className="box-header">
                <h3 className="box-title">Quick Actions</h3>
              </div>
              <div className="box-body">
                <div className="grid grid-cols-2 gap-4">
                  <Link 
                    href="/yarn-management/dashboard/add"
                    className="ti-btn ti-btn-primary w-full"
                  >
                    <i className="ri-add-line me-2"></i>
                    Add Inventory
                  </Link>
                  <Link 
                    href="/yarn-management/purchase-management"
                    className="ti-btn ti-btn-outline-primary w-full"
                  >
                    <i className="ri-shopping-cart-line me-2"></i>
                    Purchase Order
                  </Link>
                  <Link 
                    href="/yarn-management/yarn-issue"
                    className="ti-btn ti-btn-outline-success w-full"
                  >
                    <i className="ri-send-plane-line me-2"></i>
                    Yarn Issue
                  </Link>
                  <button 
                    onClick={() => setShowTransactionHistory(true)}
                    className="ti-btn ti-btn-outline-secondary w-full"
                  >
                    <i className="ri-history-line me-2"></i>
                    Transaction History
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="box">
              <div className="box-header flex justify-between items-center">
                <h3 className="box-title">Recent Transactions</h3>
                <button 
                  onClick={() => setShowTransactionHistory(true)}
                  className="text-sm text-primary hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="box-body">
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <i className="ri-file-list-line text-4xl mb-2"></i>
                    <p>No recent transactions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => {
                      const yarn = inventory.find(item => item.id === transaction.yarnId);
                      return (
                        <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{yarn?.yarnName || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{transaction.date} • {transaction.reference}</div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              transaction.transactionType === 'Purchase' ? 'bg-green-100 text-green-800' :
                              transaction.transactionType === 'Issue' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {transaction.transactionType}
                            </span>
                            <div className="text-xs text-gray-600 mt-1">
                              {transaction.quantityIn > 0 ? `+${transaction.quantityIn}` : `-${transaction.quantityOut}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Filters & Search</h3>
            </div>
            <div className="box-body">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="form-label">Search</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by yarn name, type, supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Yarn Type</label>
                  <select
                    className="form-select"
                    value={yarnTypeFilter}
                    onChange={(e) => setYarnTypeFilter(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Polyester">Polyester</option>
                    <option value="Silk">Silk</option>
                    <option value="Wool">Wool</option>
                    <option value="Linen">Linen</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Supplier</label>
                  <select
                    className="form-select"
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                  >
                    <option value="all">All Suppliers</option>
                    <option value="Textile Mills Ltd">Textile Mills Ltd</option>
                    <option value="Synthetic Fibers Inc">Synthetic Fibers Inc</option>
                    <option value="Silk Traders Co">Silk Traders Co</option>
                    <option value="Wool Suppliers Ltd">Wool Suppliers Ltd</option>
                    <option value="Natural Fibers Co">Natural Fibers Co</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Lot/Batch</label>
                  <select
                    className="form-select"
                    value={lotFilter}
                    onChange={(e) => setLotFilter(e.target.value)}
                  >
                    <option value="all">All Lots</option>
                    <option value="COT-2024-001">COT-2024-001</option>
                    <option value="POL-2024-002">POL-2024-002</option>
                    <option value="SLK-2024-003">SLK-2024-003</option>
                    <option value="WOL-2024-004">WOL-2024-004</option>
                    <option value="LIN-2024-005">LIN-2024-005</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="form-control"
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    />
                    <input
                      type="date"
                      className="form-control"
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Stock Summary Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Real-time Stock Summary ({filteredInventory.length})</h3>
            </div>
            <div className="box-body">
              {filteredInventory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-archive-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Inventory Records</h3>
                  <p className="text-gray-500 mb-4">Start by adding your first inventory record.</p>
                  <Link 
                    href="/yarn-management/dashboard/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Add First Record
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Yarn Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Color
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lot/Batch
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Opening Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Purchased Qty
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Issued Qty
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Closing Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredInventory.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div>
                              <div className="font-medium">{item.yarnName}</div>
                              <div className="text-xs text-gray-500">{item.supplier}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div>{item.yarnType}</div>
                              <div className="text-xs text-gray-500">{item.countDenier}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="inline-flex items-center">
                              <span 
                                className="w-4 h-4 rounded-full mr-2 border border-gray-300"
                                style={{ backgroundColor: item.color }}
                              ></span>
                              {item.color}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.lotNo || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.openingBalance} {item.unitOfMeasurement}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="text-green-600">+{item.purchasedQuantity}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="text-red-600">-{item.issuedQuantity}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{item.closingBalance} {item.unitOfMeasurement}</div>
                              <div className="text-xs text-gray-500">Min: {item.minimumStock}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedYarn(item);
                                  setShowStockAdjustment(true);
                                }}
                                className="text-orange-600 hover:text-orange-900"
                                title="Adjust Stock"
                              >
                                <i className="ri-add-subtract-line"></i>
                              </button>
                              <Link
                                href={`/yarn-management/dashboard/edit/${item.id}`}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <i className="ri-edit-line"></i>
                              </Link>
                              <button
                                onClick={() => handleDeleteInventory(item.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Modal */}
      {showTransactionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Transaction History</h3>
              <button
                onClick={() => setShowTransactionHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yarn</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance After</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => {
                    const yarn = inventory.find(item => item.id === transaction.yarnId);
                    return (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{yarn?.yarnName || 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.transactionType === 'Purchase' ? 'bg-green-100 text-green-800' :
                            transaction.transactionType === 'Issue' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {transaction.transactionType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.quantityIn > 0 ? `+${transaction.quantityIn}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.quantityOut > 0 ? `-${transaction.quantityOut}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.balanceAfterTransaction}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.reference}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{transaction.createdBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockAdjustment && selectedYarn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Stock Adjustment</h3>
              <button
                onClick={() => {
                  setShowStockAdjustment(false);
                  setSelectedYarn(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Adjusting stock for:</p>
              <p className="font-medium">{selectedYarn.yarnName}</p>
              <p className="text-sm text-gray-500">Current Stock: {selectedYarn.closingBalance} {selectedYarn.unitOfMeasurement}</p>
            </div>
            <StockAdjustmentForm 
              yarn={selectedYarn}
              onAdjust={handleStockAdjustment}
              onCancel={() => {
                setShowStockAdjustment(false);
                setSelectedYarn(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;


