"use client";
import React, { useMemo, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface ReceivedOrder {
  id: string;
  orderNumber: string;
  purchaseOrderNumber: string;
  supplier: string;
  receivedDate: string;
  receivedBy: string;
  status: 'Partial' | 'Complete' | 'Pending Inspection' | 'In Transit';
  totalAmount: number;
  items: ReceivedItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

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

interface PackBox {
  id: string;
  boxNumber: number;
  barcode: string;
  status: "pending" | "scanned" | "weighed";
  generatedAt: string;
  scannedAt?: string;
  weight?: number;
}

type OrderSortField =
  | "orderNumber"
  | "purchaseOrderNumber"
  | "supplier"
  | "receivedDate"
  | "receivedBy"
  | "status"
  | "totalAmount";

type SortDirection = "asc" | "desc";

const getOrderSortValue = (order: ReceivedOrder, field: OrderSortField) => {
  switch (field) {
    case "totalAmount":
      return order.totalAmount;
    case "receivedDate":
      return new Date(order.receivedDate).getTime();
    case "orderNumber":
    case "purchaseOrderNumber":
    case "supplier":
    case "receivedBy":
    case "status":
    default:
      return (order[field] as string).toLowerCase();
  }
};

const PurchaseOrderReceivedPage = () => {
  const { hasSubPermission, isLoading } = useNavigation();
  
  // Static received orders data
  const staticReceivedOrders: ReceivedOrder[] = [
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
      id: "5",
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
      id: "6",
      orderNumber: "RCP-2024-006",
      purchaseOrderNumber: "PO-2024-006",
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
    }
  ];

  const [receivedOrders, setReceivedOrders] = useState<ReceivedOrder[]>(staticReceivedOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [packLists, setPackLists] = useState<Record<string, PackBox[]>>({});
  const [boxCountInput, setBoxCountInput] = useState<number>(0);
  const [scanValue, setScanValue] = useState("");
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [activeBox, setActiveBox] = useState<PackBox | null>(null);
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null);
  const [isReadingWeight, setIsReadingWeight] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<OrderSortField>("receivedDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order Recevied');

  const selectedOrder = useMemo(
    () => receivedOrders.find(order => order.id === selectedOrderId) ?? null,
    [receivedOrders, selectedOrderId]
  );

  const selectedPackList = useMemo(() => {
    if (!selectedOrderId) {
      return [] as PackBox[];
    }
    return packLists[selectedOrderId] ?? [];
  }, [packLists, selectedOrderId]);

  const packStatusCounts = useMemo(() => {
    return selectedPackList.reduce(
      (acc, box) => {
        acc[box.status] += 1;
        return acc;
      },
      { pending: 0, scanned: 0, weighed: 0 }
    );
  }, [selectedPackList]);

  const filteredAndSortedOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = receivedOrders.filter(order => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        order.orderNumber.toLowerCase().includes(normalizedSearch) ||
        order.purchaseOrderNumber.toLowerCase().includes(normalizedSearch) ||
        order.supplier.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      const aValue = getOrderSortValue(a, sortField);
      const bValue = getOrderSortValue(b, sortField);

      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
      }

      const numericComparison = Number(aValue) - Number(bValue);
      if (numericComparison === 0) {
        return 0;
      }
      return sortDirection === "asc" ? numericComparison : -numericComparison;
    });

    return sorted;
  }, [receivedOrders, searchTerm, statusFilter, sortField, sortDirection]);

  // Show loading state while permissions are being loaded
  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  const safeRandomSegment = () => {
    try {
      if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID().slice(0, 4).toUpperCase();
      }
    } catch (error) {
      console.warn("Falling back to Math.random for barcode generation", error);
    }
    return Math.random().toString(36).slice(2, 6).toUpperCase();
  };

  const buildBarcode = (order: ReceivedOrder, index: number) => {
    const prefix = order.purchaseOrderNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const serial = String(index + 1).padStart(3, "0");
    return `${prefix}-${serial}-${safeRandomSegment()}`;
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    const existingBoxes = packLists[orderId] ?? [];
    setBoxCountInput(existingBoxes.length);
    setScanValue("");
    setActiveBox(null);
    setCapturedWeight(null);
    setWeightError(null);
  };

  const handleGenerateBarcodes = () => {
    if (!selectedOrder) {
      toast.error("Select a purchase order first");
      return;
    }
    if (!boxCountInput || boxCountInput <= 0) {
      toast.error("Enter a valid number of boxes");
      return;
    }
    const shouldRegenerate =
      (packLists[selectedOrder.id]?.length ?? 0) > 0
        ? confirm("Existing barcodes will be replaced. Continue?")
        : true;
    if (!shouldRegenerate) {
      return;
    }

    const generatedAt = new Date().toISOString();
    const newBoxes: PackBox[] = Array.from({ length: boxCountInput }, (_, idx) => ({
      id: `${selectedOrder.id}-${idx + 1}`,
      boxNumber: idx + 1,
      barcode: buildBarcode(selectedOrder, idx),
      status: "pending",
      generatedAt,
    }));

    setPackLists(prev => ({
      ...prev,
      [selectedOrder.id]: newBoxes,
    }));
    toast.success(`${newBoxes.length} barcodes generated`);
  };

  const updateBox = (orderId: string, boxId: string, updates: Partial<PackBox>) => {
    setPackLists(prev => {
      const boxes = prev[orderId] ?? [];
      return {
        ...prev,
        [orderId]: boxes.map(box =>
          box.id === boxId
            ? {
                ...box,
                ...updates,
              }
            : box
        ),
      };
    });
  };

  const handleScanSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrderId || !selectedOrder) {
      toast.error("Select an order before scanning");
      return;
    }
    if (!scanValue.trim()) {
      return;
    }

    const boxes = packLists[selectedOrderId];
    if (!boxes || boxes.length === 0) {
      toast.error("Generate barcodes before scanning");
      return;
    }

    const barcode = scanValue.trim();
    const box = boxes.find(item => item.barcode === barcode);
    if (!box) {
      toast.error("Scanned barcode does not match this receipt");
      return;
    }
    if (box.status === "weighed") {
      toast.success("Box already weighed");
      setScanValue("");
      return;
    }

    const scannedAt = new Date().toISOString();
    updateBox(selectedOrderId, box.id, {
      status: "scanned",
      scannedAt,
    });
    setActiveBox({ ...box, status: "scanned", scannedAt });
    setWeightModalOpen(true);
    setCapturedWeight(box.weight ?? null);
    setWeightError(null);
  };

  const handleCloseWeightModal = () => {
    setWeightModalOpen(false);
    setActiveBox(null);
    setCapturedWeight(null);
    setWeightError(null);
  };

  const readWeightFromDevice = async () => {
    if (typeof navigator === "undefined" || !(navigator as Navigator & { serial?: unknown }).serial) {
      setWeightError("Connected device not supported in this browser. Enter weight manually.");
      toast.error("Scale connection not supported");
      return;
    }
    const serialNavigator = navigator as Navigator & { serial: any };
    setIsReadingWeight(true);
    try {
      const port = await serialNavigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      const decoder = new TextDecoder();
      const reader = port.readable?.getReader();
      let weightValue: number | null = null;

      while (reader) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        const textChunk = decoder.decode(value);
        const match = textChunk.match(/(\d+(\.\d+)?)/);
        if (match) {
          weightValue = parseFloat(match[1]);
          break;
        }
      }

      reader?.releaseLock();
      await port.close();

      if (weightValue == null || Number.isNaN(weightValue)) {
        throw new Error("Unable to parse weight data from device");
      }

      setCapturedWeight(weightValue);
      toast.success(`Weight captured: ${weightValue.toFixed(2)} kg`);
      setWeightError(null);
    } catch (error: any) {
      console.error("Failed to read weight:", error);
      setWeightError(error?.message ?? "Failed to read weight from device. Please enter manually.");
      toast.error("Failed to read weight from device");
    } finally {
      setIsReadingWeight(false);
    }
  };

  const handleConfirmWeight = () => {
    if (!selectedOrderId || !activeBox) {
      return;
    }
    if (capturedWeight == null || Number.isNaN(capturedWeight) || capturedWeight <= 0) {
      setWeightError("Enter a valid weight before confirming.");
      return;
    }

    updateBox(selectedOrderId, activeBox.id, {
      status: "weighed",
      weight: capturedWeight,
    });
    toast.success("Box weighed and recorded");
    handleCloseWeightModal();
    setScanValue("");
  };

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Purchase Order Received.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  const handleUpdateReceivedOrder = async (orderData: ReceivedOrder) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to update received order
      setReceivedOrders(prev => prev.map(order => 
        order.id === orderData.id ? { ...orderData, updatedAt: new Date().toISOString() } : order
      ));
      toast.success('Received order updated successfully');
    } catch (error) {
      console.error('Failed to update received order:', error);
      toast.error('Failed to update received order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReceivedOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this received order?')) return;
    
    try {
      // TODO: Implement API call to delete received order
      setReceivedOrders(prev => prev.filter(order => order.id !== orderId));
      toast.success('Received order deleted successfully');
    } catch (error) {
      console.error('Failed to delete received order:', error);
      toast.error('Failed to delete received order');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Transit': return 'bg-purple-100 text-purple-800';
      case 'Partial': return 'bg-yellow-100 text-yellow-800';
      case 'Complete': return 'bg-green-100 text-green-800';
      case 'Pending Inspection': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (field: OrderSortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("asc");
  };

  const SortIcon = ({ field }: { field: OrderSortField }) => {
    if (sortField !== field) {
      return <i className="ri-arrow-up-down-line text-gray-400"></i>;
    }
    return sortDirection === "asc" ? (
      <i className="ri-arrow-up-line text-primary"></i>
    ) : (
      <i className="ri-arrow-down-line text-primary"></i>
    );
  };

  return (
    <>
      <div className="main-content">
      <Seo title="Purchase Order Received" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Purchase Order Received</h1>
                <p className="text-gray-600 mt-1">Track and manage received purchase orders</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/purchase-management/purchase-order-received/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-1"></i>
                  Record Receipt
                </Link>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="box">
            <div className="box-body">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by order number, PO number or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Partial">Partial</option>
                    <option value="Complete">Complete</option>
                    <option value="Pending Inspection">Pending Inspection</option>
                  </select>
                  <button className="ti-btn ti-btn-light">
                    <i className="ri-download-line me-1"></i>
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Received Orders Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Received Orders ({filteredAndSortedOrders.length})</h3>
            </div>
            <div className="box-body">
              {filteredAndSortedOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-inbox-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Received Orders</h3>
                  <p className="text-gray-500 mb-4">Start by recording your first order receipt.</p>
                  <Link 
                    href="/yarn-management/purchase-management/purchase-order-received/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Record First Receipt
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-50 border-b border-gray-300">
                      <tr>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-300"
                          onClick={() => handleSort("orderNumber")}
                        >
                          <div className="flex items-center gap-2">
                            Receipt Number
                            <SortIcon field="orderNumber" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-300"
                          onClick={() => handleSort("purchaseOrderNumber")}
                        >
                          <div className="flex items-center gap-2">
                            PO Number
                            <SortIcon field="purchaseOrderNumber" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-300"
                          onClick={() => handleSort("supplier")}
                        >
                          <div className="flex items-center gap-2">
                            Supplier
                            <SortIcon field="supplier" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-300"
                          onClick={() => handleSort("receivedDate")}
                        >
                          <div className="flex items-center gap-2">
                            Received Date
                            <SortIcon field="receivedDate" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-300"
                          onClick={() => handleSort("receivedBy")}
                        >
                          <div className="flex items-center gap-2">
                            Received By
                            <SortIcon field="receivedBy" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-300"
                          onClick={() => handleSort("status")}
                        >
                          <div className="flex items-center gap-2">
                            Status
                            <SortIcon field="status" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 border-r border-gray-300"
                          onClick={() => handleSort("totalAmount")}
                        >
                          <div className="flex items-center gap-2">
                            Total Amount
                            <SortIcon field="totalAmount" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredAndSortedOrders.map((order) => (
                        <tr
                          key={order.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            selectedOrderId === order.id ? "!bg-primary/5" : ""
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-b border-gray-200">
                            {order.orderNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-200">
                            <Link 
                              href={`/yarn-management/purchase-management/purchase/${order.purchaseOrderNumber}`}
                              className="text-primary hover:underline"
                            >
                              {order.purchaseOrderNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-200">
                            {order.supplier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-200">
                            {new Date(order.receivedDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-200">
                            {order.receivedBy}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border-r border-b border-gray-200">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-b border-gray-200">
                            ₹{order.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium border-b border-gray-200">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleSelectOrder(order.id)}
                                className={`inline-flex items-center gap-1 rounded-md border px-3 py-1 text-sm transition ${
                                  selectedOrderId === order.id
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-gray-300 text-gray-600 hover:border-primary hover:text-primary"
                                }`}
                                title="Process receipt workflow"
                              >
                                <i className="ri-box-3-line"></i>
                                Process
                              </button>
                              <button
                                onClick={() => {
                                  // TODO: Implement view details modal
                                  toast('View details functionality coming soon', { icon: 'ℹ️' });
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Details"
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteReceivedOrder(order.id)}
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

      {selectedOrder && (
        <div className="mt-6">
          <div className="box">
            <div className="box-header">
              <div>
                <h3 className="box-title flex items-center gap-2">
                  <i className="ri-truck-line text-primary"></i>
                  Unloading & Verification
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Follow the guided workflow to unload, verify packs, and capture weights for{" "}
                  <span className="font-medium text-gray-700">{selectedOrder.purchaseOrderNumber}</span>.
                </p>
              </div>
            </div>
            <div className="box-body space-y-6">
              <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Supplier</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedOrder.supplier}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Receipt Number</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Received By</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedOrder.receivedBy}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-gray-200 p-3 bg-white">
                  <p className="text-xs uppercase text-gray-500">Pending</p>
                  <p className="text-xl font-semibold text-gray-800">{packStatusCounts.pending}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 bg-white">
                  <p className="text-xs uppercase text-gray-500">Scanned</p>
                  <p className="text-xl font-semibold text-gray-800">{packStatusCounts.scanned}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 bg-white">
                  <p className="text-xs uppercase text-gray-500">Weighed</p>
                  <p className="text-xl font-semibold text-gray-800">{packStatusCounts.weighed}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="form-label">Total Boxes (per supplier pack list)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={boxCountInput}
                    onChange={(event) => {
                      const parsed = parseInt(event.target.value, 10);
                      setBoxCountInput(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
                    }}
                    placeholder="Enter number of boxes unloaded"
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary whitespace-nowrap"
                    onClick={handleGenerateBarcodes}
                  >
                    <i className="ri-barcode-line me-1"></i>
                    Generate Barcodes
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  The system creates unique barcodes for each box so they can be scanned during weighing.
                </p>
              </div>

              <div className="space-y-3">
                <form onSubmit={handleScanSubmit} className="space-y-3">
                  <div>
                    <label className="form-label">Scan or Enter Barcode</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Scan box barcode"
                        value={scanValue}
                        onChange={(event) => setScanValue(event.target.value)}
                        disabled={selectedPackList.length === 0}
                      />
                      <button
                        type="submit"
                        className="ti-btn ti-btn-outline-primary whitespace-nowrap"
                        disabled={selectedPackList.length === 0 || !scanValue.trim()}
                      >
                        <i className="ri-qr-scan-2-line me-1"></i>
                        Scan
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    After every successful scan, connect to the weighing scale to capture box weight automatically.
                  </p>
                </form>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <i className="ri-list-ordered"></i>
                  Supplier Pack List
                </h4>
                {selectedPackList.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Generate barcodes to populate the pack list and begin scanning.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {selectedPackList.map((box) => (
                        <li key={box.id} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-800">Box {box.boxNumber}</p>
                            <p className="text-xs text-gray-500">{box.barcode}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase text-gray-500">Status</p>
                            <p
                              className={`text-sm font-semibold ${
                                box.status === "weighed"
                                  ? "text-green-600"
                                  : box.status === "scanned"
                                  ? "text-orange-500"
                                  : "text-gray-500"
                              }`}
                            >
                              {box.status === "weighed"
                                ? "Weighed"
                                : box.status === "scanned"
                                ? "Scanned"
                                : "Pending"}
                            </p>
                            {box.weight && (
                              <p className="text-xs text-gray-500">
                                {box.weight.toFixed(2)} kg
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {weightModalOpen && activeBox ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <i className="ri-scales-2-line text-primary"></i>
                  Weigh Box {activeBox?.boxNumber}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Barcode: <span className="font-mono">{activeBox?.barcode}</span>
                </p>
              </div>
              <button
                onClick={handleCloseWeightModal}
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="Close weight modal"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 p-3">
                <i className="ri-information-line text-xl text-blue-500 mt-0.5"></i>
                <p className="text-sm text-blue-700">
                  Connect the weighing scale and click <span className="font-semibold">Read Weight</span>.
                  If the device is not available, enter the weight manually.
                </p>
              </div>

              <div className="space-y-2">
                <label className="form-label">Captured Weight (kg)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={capturedWeight ?? ""}
                  onChange={(event) => {
                    const { value } = event.target;
                    setCapturedWeight(value === "" ? null : parseFloat(value));
                  }}
                  className="form-control"
                  placeholder="0.00"
                />
              </div>

              {weightError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {weightError}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                className="ti-btn ti-btn-outline-secondary"
                onClick={handleCloseWeightModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-outline-primary"
                onClick={readWeightFromDevice}
                disabled={isReadingWeight}
              >
                {isReadingWeight ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin rounded-full border-2 border-primary border-t-transparent h-4 w-4 inline-block"></span>
                    Reading...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <i className="ri-sensor-line"></i>
                    Read Weight
                  </span>
                )}
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary"
                onClick={handleConfirmWeight}
              >
                <i className="ri-check-line me-1"></i>
                Confirm Weight
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default PurchaseOrderReceivedPage;

