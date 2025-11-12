"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface ReceivedItem {
  id: string;
  yarnCode: string;
  yarnName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  qualityStatus: 'Approved' | 'Rejected' | 'Pending';
}

interface ReceivedOrder {
  id: string;
  orderNumber: string;
  purchaseOrderNumber: string;
  supplier: string;
  receivedDate: string;
  receivedBy: string;
  status: 'Partial' | 'Complete' | 'Pending Inspection' | 'In Transit' | 'Rejected';
  totalAmount: number;
  items: ReceivedItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const ProcessOrderPage = () => {
  const params = useParams();
  const router = useRouter();
  const { hasSubPermission, isLoading } = useNavigation();
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<ReceivedOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [isGeneratingBarcodes, setIsGeneratingBarcodes] = useState(false);
  const [barcodesGenerated, setBarcodesGenerated] = useState(false);
  const [itemBarcodes, setItemBarcodes] = useState<Record<string, string>>({});
  const [showReadyToScan, setShowReadyToScan] = useState(false);
  const [itemWeights, setItemWeights] = useState<Record<string, number>>({});
  const [activeScanRow, setActiveScanRow] = useState<string | null>(null);
  const [tempWeight, setTempWeight] = useState<string>('');
  const [showProcessedModal, setShowProcessedModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'Pending Inspection' | 'Rejected' | ''>('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Check permission - allow if user has Purchase Management access
  const hasPurchaseManagement = hasSubPermission('/yarn-management', 'Purchase Management');
  const hasPurchaseOrderReceived = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order Recevied');
  const hasPermission = hasPurchaseManagement || hasPurchaseOrderReceived;
  
  useEffect(() => {
    console.log('Process page - hasPurchaseManagement:', hasPurchaseManagement);
    console.log('Process page - hasPurchaseOrderReceived:', hasPurchaseOrderReceived);
    console.log('Process page - hasPermission:', hasPermission);
    console.log('Process page - isLoading:', isLoading);
    console.log('Process page - orderId from params:', orderId);
    console.log('Process page - params:', params);
  }, [hasPurchaseManagement, hasPurchaseOrderReceived, hasPermission, isLoading, orderId, params]);

  // Reset selected status when modal opens
  useEffect(() => {
    if (showProcessedModal) {
      setSelectedStatus('');
      setIsSubmittingStatus(false);
    }
  }, [showProcessedModal]);

  // Mock data - in real app, fetch from API
  // Note: This should match the data from the parent page
  const mockOrders: ReceivedOrder[] = [
    {
      id: "1",
      orderNumber: "RCP-2024-001",
      purchaseOrderNumber: "PO-2024-001",
      supplier: "Reliance Industries",
      receivedDate: "2024-01-25T10:30:00Z",
      receivedBy: "Rama",
      status: "In Transit",
      totalAmount: 125000,
      items: [
        {
          id: "1",
          yarnCode: "CT40-001",
          yarnName: "Cotton Count 40",
          orderedQuantity: 200,
          receivedQuantity: 200,
          unitPrice: 450,
          totalPrice: 90000,
          qualityStatus: "Approved"
        },
        {
          id: "2",
          yarnCode: "CT60-004",
          yarnName: "Cotton Count 60",
          orderedQuantity: 100,
          receivedQuantity: 100,
          unitPrice: 520,
          totalPrice: 52000,
          qualityStatus: "Approved"
        }
      ],
      notes: "All items received in good condition",
      createdAt: "2024-01-25T10:30:00Z",
      updatedAt: "2024-01-25T10:30:00Z"
    },
    {
      id: "2",
      orderNumber: "RCP-2024-002",
      purchaseOrderNumber: "PO-2024-002",
      supplier: "Aditya Birla Group",
      receivedDate: "2024-01-20T14:30:00Z",
      receivedBy: "Ganesh",
      status: "In Transit",
      totalAmount: 48000,
      items: [
        {
          id: "3",
          yarnCode: "PE150-002",
          yarnName: "Polyester DTY 150",
          orderedQuantity: 150,
          receivedQuantity: 120,
          unitPrice: 320,
          totalPrice: 38400,
          qualityStatus: "Approved"
        },
        {
          id: "4",
          yarnCode: "PE100-007",
          yarnName: "Polyester POY 100",
          orderedQuantity: 200,
          receivedQuantity: 0,
          unitPrice: 290,
          totalPrice: 0,
          qualityStatus: "Pending"
        }
      ],
      notes: "Partial delivery, remaining items expected next week",
      createdAt: "2024-01-20T14:30:00Z",
      updatedAt: "2024-01-20T14:30:00Z"
    },
    {
      id: "3",
      orderNumber: "RCP-2024-003",
      purchaseOrderNumber: "PO-2024-003",
      supplier: "Grasim Industries",
      receivedDate: "2024-01-22T09:15:00Z",
      receivedBy: "Rama",
      status: "In Transit",
      totalAmount: 95000,
      items: [
        {
          id: "5",
          yarnCode: "VR30-003",
          yarnName: "Viscose Rayon 30",
          orderedQuantity: 180,
          receivedQuantity: 180,
          unitPrice: 380,
          totalPrice: 68400,
          qualityStatus: "Pending"
        },
        {
          id: "6",
          yarnCode: "VR40-008",
          yarnName: "Viscose Rayon 40",
          orderedQuantity: 100,
          receivedQuantity: 100,
          unitPrice: 400,
          totalPrice: 40000,
          qualityStatus: "Pending"
        }
      ],
      notes: "Awaiting quality inspection",
      createdAt: "2024-01-22T09:15:00Z",
      updatedAt: "2024-01-22T09:15:00Z"
    },
    {
      id: "4",
      orderNumber: "RCP-2024-004",
      purchaseOrderNumber: "PO-2024-004",
      supplier: "Raymond Textiles",
      receivedDate: "2024-02-02T11:00:00Z",
      receivedBy: "Suresh",
      status: "In Transit",
      totalAmount: 142000,
      items: [
        {
          id: "7",
          yarnCode: "WL50-005",
          yarnName: "Wool Blend 50s",
          orderedQuantity: 160,
          receivedQuantity: 160,
          unitPrice: 550,
          totalPrice: 88000,
          qualityStatus: "Approved"
        },
        {
          id: "8",
          yarnCode: "WL70-010",
          yarnName: "Wool Blend 70s",
          orderedQuantity: 100,
          receivedQuantity: 100,
          unitPrice: 540,
          totalPrice: 54000,
          qualityStatus: "Approved"
        }
      ],
      notes: "Received on time, excellent packaging",
      createdAt: "2024-02-02T11:00:00Z",
      updatedAt: "2024-02-02T11:00:00Z"
    },
    {
      id: "5",
      orderNumber: "RCP-2024-005",
      purchaseOrderNumber: "PO-2024-005",
      supplier: "Arvind Mills",
      receivedDate: "2024-02-10T15:45:00Z",
      receivedBy: "Ganesh",
      status: "In Transit",
      totalAmount: 76500,
      items: [
        {
          id: "9",
          yarnCode: "DN30-006",
          yarnName: "Denim Yarn 30s",
          orderedQuantity: 150,
          receivedQuantity: 140,
          unitPrice: 350,
          totalPrice: 49000,
          qualityStatus: "Approved"
        },
        {
          id: "10",
          yarnCode: "DN40-012",
          yarnName: "Denim Yarn 40s",
          orderedQuantity: 90,
          receivedQuantity: 50,
          unitPrice: 550,
          totalPrice: 27500,
          qualityStatus: "Pending"
        }
      ],
      notes: "Partial delivery due to transport delay",
      createdAt: "2024-02-10T15:45:00Z",
      updatedAt: "2024-02-10T15:45:00Z"
    },
    {
      id: "6",
      orderNumber: "RCP-2024-006",
      purchaseOrderNumber: "PO-2024-006",
      supplier: "Jindal Textiles",
      receivedDate: "2024-02-18T08:20:00Z",
      receivedBy: "Rama",
      status: "In Transit",
      totalAmount: 158400,
      items: [
        {
          id: "11",
          yarnCode: "NY60-009",
          yarnName: "Nylon 60 Denier",
          orderedQuantity: 200,
          receivedQuantity: 200,
          unitPrice: 480,
          totalPrice: 96000,
          qualityStatus: "Approved"
        },
        {
          id: "12",
          yarnCode: "NY80-011",
          yarnName: "Nylon 80 Denier",
          orderedQuantity: 130,
          receivedQuantity: 130,
          unitPrice: 480,
          totalPrice: 62400,
          qualityStatus: "Approved"
        }
      ],
      notes: "All quality parameters met successfully",
      createdAt: "2024-02-18T08:20:00Z",
      updatedAt: "2024-02-18T08:20:00Z"
    }
  ];

  useEffect(() => {
    if (orderId) {
      console.log('Process page - orderId:', orderId);
      // TODO: Fetch order from API
      const foundOrder = mockOrders.find(o => o.id === orderId);
      if (foundOrder) {
        setOrder(foundOrder);
        console.log('Process page - order found:', foundOrder);
      } else {
        console.log('Process page - order not found for id:', orderId);
        toast.error('Order not found');
        router.push('/yarn-management/purchase-management/purchase-order-received');
      }
      setIsLoadingOrder(false);
    } else {
      console.log('Process page - no orderId provided');
      setIsLoadingOrder(false);
    }
  }, [orderId, router]);

  const getQualityStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Transit': return 'bg-purple-100 text-purple-800';
      case 'Partial': return 'bg-yellow-100 text-yellow-800';
      case 'Complete': return 'bg-green-100 text-green-800';
      case 'Pending Inspection': return 'bg-blue-100 text-blue-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const generateBarcode = (item: ReceivedItem, index: number): string => {
    const poPrefix = order?.purchaseOrderNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase() || "PO";
    return `${poPrefix}-${item.yarnCode}-${String(index + 1).padStart(3, "0")}`;
  };

  const handleGenerateAllBarcodes = () => {
    if (!order) return;
    
    setIsGeneratingBarcodes(true);
    
    // Simulate 4 second loading
    setTimeout(() => {
      const generatedBarcodes: Record<string, string> = {};
      order.items.forEach((item, index) => {
        generatedBarcodes[item.id] = generateBarcode(item, index);
      });
      
      setItemBarcodes(generatedBarcodes);
      setBarcodesGenerated(true);
      setIsGeneratingBarcodes(false);
      toast.success('All barcodes generated successfully');
    }, 4000);
  };

  const handlePrintAllBarcodes = () => {
    if (!order) return;
    
    // Create a print-friendly HTML with all barcodes
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print barcodes');
      return;
    }

    const barcodeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcodes - ${order.orderNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .barcode-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 20px;
            }
            .barcode-item {
              border: 1px solid #ddd;
              padding: 15px;
              text-align: center;
              page-break-inside: avoid;
            }
            .barcode-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            .barcode-value {
              font-family: 'Courier New', monospace;
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
              padding: 10px;
              background: #f5f5f5;
              border: 1px dashed #ccc;
            }
            .yarn-info {
              font-size: 11px;
              color: #333;
              margin-top: 5px;
            }
            @media print {
              .barcode-container {
                grid-template-columns: repeat(3, 1fr);
              }
            }
          </style>
        </head>
        <body>
          <h2>Barcodes - ${order.orderNumber}</h2>
          <p>PO Number: ${order.purchaseOrderNumber} | Supplier: ${order.supplier}</p>
          <div class="barcode-container">
            ${order.items.map((item, index) => {
              const barcode = itemBarcodes[item.id] || generateBarcode(item, index);
              return `
                <div class="barcode-item">
                  <div class="barcode-label">Yarn Code</div>
                  <div class="barcode-value">${barcode}</div>
                  <div class="yarn-info">${item.yarnName}</div>
                  <div class="yarn-info">Qty: ${item.receivedQuantity} kg</div>
                </div>
              `;
            }).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(barcodeHTML);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      setShowReadyToScan(true);
      toast.success('Barcodes printed successfully');
    }, 250);
  };

  // Show loading state while permissions are being loaded
  if (isLoading || isLoadingOrder) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Temporarily allow access for debugging - remove permission check
  // if (!hasPermission) {
  //   return (
  //     <div className="main-content">
  //       <div className="text-center py-12">
  //         <div className="text-gray-400 mb-4">
  //           <i className="ri-lock-line text-6xl"></i>
  //         </div>
  //         <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
  //         <p className="text-gray-500 mb-4">You don't have permission to access Purchase Order Received.</p>
  //         <Link href="/yarn-management" className="ti-btn ti-btn-primary">
  //           <i className="ri-arrow-left-line me-2"></i>
  //           Back to Yarn Management
  //         </Link>
  //       </div>
  //     </div>
  //   );
  // }

  if (!order) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-error-warning-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order Not Found</h3>
          <Link href="/yarn-management/purchase-management/purchase-order-received" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Received Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title={`Process Order - ${order.orderNumber}`} />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none mb-6">
            <div className="box-header flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Link
                    href="/yarn-management/purchase-management/purchase-order-received"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <i className="ri-arrow-left-line text-xl"></i>
                  </Link>
                  <h1 className="box-title text-2xl font-semibold">Process Order</h1>
                </div>
                <p className="text-gray-600 mt-1">Order Number: {order.orderNumber}</p>
              </div>
            </div>
          </div>

          {/* PO Details Section */}
          <div className="box mb-6">
            <div className="box-header">
              <h3 className="box-title">
                <i className="ri-file-text-line me-2"></i>
                Purchase Order Details
              </h3>
            </div>
            <div className="box-body">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Receipt Number</p>
                  <p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">PO Number</p>
                  <p className="text-sm font-semibold text-gray-900">{order.purchaseOrderNumber}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Supplier</p>
                  <p className="text-sm font-semibold text-gray-900">{order.supplier}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Received Date</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(order.receivedDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Received By</p>
                  <p className="text-sm font-semibold text-gray-900">{order.receivedBy}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Total Amount</p>
                  <p className="text-sm font-semibold text-gray-900">₹{order.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Total Items</p>
                  <p className="text-sm font-semibold text-gray-900">{order.items.length}</p>
                </div>
              </div>
              {order.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs uppercase text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Yarn Details Table */}
          <div className="box">
            <div className="box-header flex justify-between items-center">
              <h3 className="box-title">
                <i className="ri-yarn-line me-2"></i>
                Yarn Details ({order.items.length} items)
              </h3>
              <div className="flex gap-2">
                {!barcodesGenerated ? (
                  <button
                    onClick={handleGenerateAllBarcodes}
                    disabled={isGeneratingBarcodes}
                    className="ti-btn ti-btn-primary"
                  >
                    {isGeneratingBarcodes ? (
                      <>
                        <i className="ri-loader-4-line animate-spin me-2"></i>
                        Generating...
                      </>
                    ) : (
                      <>
                        <i className="ri-barcode-line me-2"></i>
                        Generate All Barcodes
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handlePrintAllBarcodes}
                    className="ti-btn ti-btn-primary bg-green-600 hover:bg-green-700"
                  >
                    <i className="ri-printer-line me-2"></i>
                    Print All Barcodes
                  </button>
                )}
              </div>
            </div>
            {showReadyToScan && (
              <div className="mx-6 mt-4 mb-4">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <i className="ri-checkbox-circle-line text-2xl text-green-600"></i>
                    </div>
                    <div className="ml-3 flex-1">
                      <h4 className="text-sm font-semibold text-green-800 mb-1">
                        Ready to Scan
                      </h4>
                      <p className="text-sm text-green-700">
                        Barcodes have been printed. You can now affix them to the boxes and proceed with scanning. The system is ready to process scanned barcodes.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowReadyToScan(false)}
                      className="ml-4 flex-shrink-0 text-green-600 hover:text-green-800"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="box-body">
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                        Yarn Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                        Yarn Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                        Ordered Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                        Total Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                        Barcode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-b border-gray-300">
                        Weight (kg)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {order.items.map((item, index) => {
                      const isActiveRow = activeScanRow === item.id;
                      return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-gray-50 transition-colors ${
                          isActiveRow ? 'bg-blue-50 border-2 border-blue-400' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-b border-gray-300">
                          {item.yarnCode}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                          {item.yarnName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                          {item.orderedQuantity.toLocaleString()} kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                          ₹{item.unitPrice.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-b border-gray-300">
                          ₹{item.totalPrice.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-300">
                          {barcodesGenerated && itemBarcodes[item.id] ? (
                            <span className="font-mono text-xs bg-green-100 text-green-800 px-2 py-1 rounded border border-green-300">
                              {itemBarcodes[item.id]}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Not generated</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-300">
                          {isActiveRow ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={tempWeight}
                              onChange={(e) => setTempWeight(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const weight = parseFloat(tempWeight);
                                  if (!isNaN(weight) && weight > 0) {
                                    const updatedWeights = {
                                      ...itemWeights,
                                      [item.id]: weight
                                    };
                                    setItemWeights(updatedWeights);
                                    setActiveScanRow(null);
                                    setTempWeight('');
                                    toast.success(`Weight ${weight} kg recorded for ${item.yarnName}`);
                                    
                                    // Check if all items have weights
                                    if (order && Object.keys(updatedWeights).length === order.items.length) {
                                      setTimeout(() => {
                                        setShowProcessedModal(true);
                                      }, 500);
                                    }
                                  } else {
                                    toast.error('Please enter a valid weight');
                                  }
                                } else if (e.key === 'Escape') {
                                  setActiveScanRow(null);
                                  setTempWeight('');
                                }
                              }}
                              autoFocus
                              className="w-24 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="text-sm text-gray-900">
                              {itemWeights[item.id] ? (
                                <span className="font-semibold text-blue-600">
                                  {itemWeights[item.id].toFixed(2)} kg
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-b border-gray-300">
                          {barcodesGenerated && (
                            <button
                              onClick={() => {
                                setActiveScanRow(item.id);
                                setTempWeight(itemWeights[item.id]?.toString() || '');
                              }}
                              disabled={isActiveRow}
                              className={`ti-btn  ${
                                isActiveRow 
                                  ? 'ti-btn-primary' 
                                  : 'ti-btn-outline-primary'
                              }`}
                              title="Scan and enter weight"
                            >
                              <i className="ri-qr-scan-2-line me-1"></i>
                              Scan
                            </button>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-900 border-r border-t border-gray-300">
                        Total
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 border-r border-t border-gray-300">
                        {order.items.reduce((sum, item) => sum + item.orderedQuantity, 0).toLocaleString()} kg
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 border-r border-t border-gray-300">-</td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 border-r border-t border-gray-300">
                        ₹{order.items.reduce((sum, item) => sum + item.totalPrice, 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 border-r border-t border-gray-300">-</td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 border-r border-t border-gray-300">
                        {order.items.reduce((sum, item) => sum + (itemWeights[item.id] || 0), 0).toFixed(2)} kg
                      </td>
                      <td className="px-6 py-3 border-t border-gray-300"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Items Processed Modal */}
      {showProcessedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <i className="ri-checkbox-circle-line text-4xl text-green-600"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  All Items Processed
                </h3>
                <p className="text-sm text-gray-600">
                  All items have been weighed and processed successfully. Please select the next status.
                </p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="form-label">
                    Update Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as 'Pending Inspection' | 'Rejected' | '')}
                    className="form-select"
                    disabled={isSubmittingStatus}
                  >
                    <option value="">Select status...</option>
                    <option value="Pending Inspection">Send for QC</option>
                    <option value="Rejected">Reject</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowProcessedModal(false);
                    setSelectedStatus('');
                  }}
                  className="ti-btn ti-btn-light"
                  disabled={isSubmittingStatus}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!selectedStatus) {
                      toast.error('Please select a status');
                      return;
                    }

                    setIsSubmittingStatus(true);
                    try {
                      // Mark order as processed in localStorage
                      const processedOrders = JSON.parse(localStorage.getItem('processedOrders') || '[]');
                      if (!processedOrders.includes(orderId)) {
                        processedOrders.push(orderId);
                        localStorage.setItem('processedOrders', JSON.stringify(processedOrders));
                      }

                      // Store status update in localStorage
                      const statusUpdates = JSON.parse(localStorage.getItem('orderStatusUpdates') || '{}');
                      statusUpdates[orderId] = selectedStatus;
                      localStorage.setItem('orderStatusUpdates', JSON.stringify(statusUpdates));

                      // Dispatch custom events to notify parent page
                      window.dispatchEvent(new Event('processedOrdersUpdated'));
                      window.dispatchEvent(new Event('orderStatusUpdated'));

                      toast.success(`Order status updated to ${selectedStatus === 'Pending Inspection' ? 'Send for QC' : 'Rejected'}`);
                      
                      // Navigate back to main page
                      router.push('/yarn-management/purchase-management/purchase-order-received');
                    } catch (error) {
                      console.error('Failed to update status:', error);
                      toast.error('Failed to update status');
                      setIsSubmittingStatus(false);
                    }
                  }}
                  className="ti-btn ti-btn-primary"
                  disabled={isSubmittingStatus || !selectedStatus}
                >
                  {isSubmittingStatus ? (
                    <>
                      <i className="ri-loader-4-line animate-spin me-2"></i>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line me-2"></i>
                      Update Status
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessOrderPage;

