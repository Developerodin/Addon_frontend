"use client";
import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import { PurchaseOrderStatus } from "./components/PurchaseForm";
import PacklistModal, { PacklistDetails } from "./components/PacklistModal";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  supplierId: string;
  orderDate: string;
  expectedDelivery: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  subTotal: number;
  totalGst: number;
  items: PurchaseItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  packlistDetails?: PacklistDetails;
}

interface PurchaseItem {
  id: string;
  yarnName: string;
  sizeCount: string;
  shadeCode: string;
  quantity: number;
  rate: number;
  gst: number;
  subTotal: number;
  estimatedDeliveryDate: string;
}

const PurchasePage = () => {
  const router = useRouter();
  const { hasSubPermission, isLoading } = useNavigation();
  
  // Static purchase orders data with new statuses
  // Today's date: Nov 12, 2025 - order dates are in past, expected delivery dates are in future
  const staticOrders: PurchaseOrder[] = [
    {
      id: "1",
      orderNumber: "PO-2025-001",
      supplier: "Reliance Industries",
      supplierId: "supplier-1",
      orderDate: "2025-10-15T10:30:00Z",
      expectedDelivery: "2025-11-25T10:30:00Z",
      status: "stocked",
      totalAmount: 125000,
      subTotal: 100000,
      totalGst: 25000,
      items: [
        {
          id: "1",
          yarnName: "Cotton Count 40",
          sizeCount: "40",
          shadeCode: "SH001",
          quantity: 200,
          rate: 400,
          gst: 18,
          subTotal: 94400,
          estimatedDeliveryDate: "2025-11-25"
        },
        {
          id: "2",
          yarnName: "Cotton Count 60",
          sizeCount: "60",
          shadeCode: "SH002",
          quantity: 100,
          rate: 500,
          gst: 18,
          subTotal: 59000,
          estimatedDeliveryDate: "2025-11-25"
        }
      ],
      notes: "Priority order for production",
      createdAt: "2025-10-15T10:30:00Z",
      updatedAt: "2025-11-10T10:30:00Z"
    },
    {
      id: "2",
      orderNumber: "PO-2025-002",
      supplier: "Aditya Birla Group",
      supplierId: "supplier-2",
      orderDate: "2025-10-20T09:15:00Z",
      expectedDelivery: "2025-11-20T09:15:00Z",
      status: "in transit",
      totalAmount: 85000,
      subTotal: 72000,
      totalGst: 13000,
      items: [
        {
          id: "3",
          yarnName: "Polyester DTY 150",
          sizeCount: "150",
          shadeCode: "SH003",
          quantity: 150,
          rate: 320,
          gst: 18,
          subTotal: 56640,
          estimatedDeliveryDate: "2025-11-20"
        }
      ],
      notes: "Standard delivery",
      createdAt: "2025-10-20T09:15:00Z",
      updatedAt: "2025-11-10T14:30:00Z",
      packlistDetails: {
        trackingNumber: "TRK123456",
        courierName: "BlueDart",
        dispatchDate: "2025-11-10",
        expectedArrivalDate: "2025-11-20"
      }
    },
    {
      id: "3",
      orderNumber: "PO-2025-003",
      supplier: "Grasim Industries",
      supplierId: "supplier-3",
      orderDate: "2025-11-05T14:20:00Z",
      expectedDelivery: "2025-11-25T14:20:00Z",
      status: "submitted to supplier",
      totalAmount: 95000,
      subTotal: 80000,
      totalGst: 15000,
      items: [
        {
          id: "5",
          yarnName: "Viscose Rayon 30",
          sizeCount: "30",
          shadeCode: "SH004",
          quantity: 180,
          rate: 380,
          gst: 18,
          subTotal: 80712,
          estimatedDeliveryDate: "2025-11-25"
        }
      ],
      notes: "Quality check required",
      createdAt: "2025-11-05T14:20:00Z",
      updatedAt: "2025-11-05T14:20:00Z"
    },
    {
      id: "4",
      orderNumber: "PO-2025-004",
      supplier: "SRF Limited",
      supplierId: "supplier-4",
      orderDate: "2025-10-25T16:30:00Z",
      expectedDelivery: "2025-11-20T16:30:00Z",
      status: "QC pending",
      totalAmount: 42000,
      subTotal: 35000,
      totalGst: 7000,
      items: [
        {
          id: "7",
          yarnName: "Nylon FDY 70",
          sizeCount: "70",
          shadeCode: "SH005",
          quantity: 150,
          rate: 280,
          gst: 18,
          subTotal: 49560,
          estimatedDeliveryDate: "2025-11-20"
        }
      ],
      notes: "Awaiting QC approval",
      createdAt: "2025-10-25T16:30:00Z",
      updatedAt: "2025-11-10T16:30:00Z"
    },
    {
      id: "5",
      orderNumber: "PO-2025-005",
      supplier: "Welspun India",
      supplierId: "supplier-5",
      orderDate: "2025-10-28T08:15:00Z",
      expectedDelivery: "2025-11-18T08:15:00Z",
      status: "rejected",
      totalAmount: 76000,
      subTotal: 64000,
      totalGst: 12000,
      items: [
        {
          id: "8",
          yarnName: "Cotton Count 20",
          sizeCount: "20",
          shadeCode: "SH006",
          quantity: 200,
          rate: 380,
          gst: 18,
          subTotal: 89680,
          estimatedDeliveryDate: "2025-11-18"
        }
      ],
      notes: "Rejected due to quality issues",
      createdAt: "2025-10-28T08:15:00Z",
      updatedAt: "2025-11-05T11:45:00Z"
    },
    {
      id: "6",
      orderNumber: "PO-2025-006",
      supplier: "Reliance Industries",
      supplierId: "supplier-1",
      orderDate: "2025-10-30T15:40:00Z",
      expectedDelivery: "2025-11-22T15:40:00Z",
      status: "partially delivered",
      totalAmount: 136000,
      subTotal: 115000,
      totalGst: 21000,
      items: [
        {
          id: "9",
          yarnName: "Cotton Count 80",
          sizeCount: "80",
          shadeCode: "SH007",
          quantity: 200,
          rate: 680,
          gst: 18,
          subTotal: 160480,
          estimatedDeliveryDate: "2025-11-22"
        }
      ],
      notes: "Premium quality required",
      createdAt: "2025-10-30T15:40:00Z",
      updatedAt: "2025-11-08T09:20:00Z"
    },
    {
      id: "7",
      orderNumber: "PO-2025-007",
      supplier: "Raymond Limited",
      supplierId: "supplier-6",
      orderDate: "2025-11-08T10:00:00Z",
      expectedDelivery: "2025-11-28T10:00:00Z",
      status: "submitted to supplier",
      totalAmount: 110000,
      subTotal: 93000,
      totalGst: 17000,
      items: [
        {
          id: "10",
          yarnName: "Cotton Count 50",
          sizeCount: "50",
          shadeCode: "SH008",
          quantity: 150,
          rate: 450,
          gst: 18,
          subTotal: 79650,
          estimatedDeliveryDate: "2025-11-28"
        },
        {
          id: "11",
          yarnName: "Polyester Count 100",
          sizeCount: "100",
          shadeCode: "SH009",
          quantity: 100,
          rate: 350,
          gst: 18,
          subTotal: 41300,
          estimatedDeliveryDate: "2025-11-28"
        }
      ],
      notes: "Urgent order for upcoming production",
      createdAt: "2025-11-08T10:00:00Z",
      updatedAt: "2025-11-08T10:00:00Z"
    },
    {
      id: "8",
      orderNumber: "PO-2025-008",
      supplier: "Arvind Limited",
      supplierId: "supplier-7",
      orderDate: "2025-11-10T14:30:00Z",
      expectedDelivery: "2025-11-30T14:30:00Z",
      status: "submitted to supplier",
      totalAmount: 145000,
      subTotal: 123000,
      totalGst: 22000,
      items: [
        {
          id: "12",
          yarnName: "Cotton Count 30",
          sizeCount: "30",
          shadeCode: "SH010",
          quantity: 250,
          rate: 420,
          gst: 18,
          subTotal: 123900,
          estimatedDeliveryDate: "2025-11-30"
        }
      ],
      notes: "Bulk order for seasonal production",
      createdAt: "2025-11-10T14:30:00Z",
      updatedAt: "2025-11-10T14:30:00Z"
    },
    {
      id: "9",
      orderNumber: "PO-2025-009",
      supplier: "Bombay Dyeing",
      supplierId: "supplier-8",
      orderDate: "2025-11-11T09:00:00Z",
      expectedDelivery: "2025-12-01T09:00:00Z",
      status: "submitted to supplier",
      totalAmount: 88000,
      subTotal: 75000,
      totalGst: 13000,
      items: [
        {
          id: "13",
          yarnName: "Viscose Count 40",
          sizeCount: "40",
          shadeCode: "SH011",
          quantity: 120,
          rate: 480,
          gst: 18,
          subTotal: 67968,
          estimatedDeliveryDate: "2025-12-01"
        },
        {
          id: "14",
          yarnName: "Cotton Count 70",
          sizeCount: "70",
          shadeCode: "SH012",
          quantity: 80,
          rate: 580,
          gst: 18,
          subTotal: 54752,
          estimatedDeliveryDate: "2025-12-01"
        }
      ],
      notes: "Mixed yarn order for special collection",
      createdAt: "2025-11-11T09:00:00Z",
      updatedAt: "2025-11-11T09:00:00Z"
    },
    {
      id: "10",
      orderNumber: "PO-2025-010",
      supplier: "Trident Group",
      supplierId: "supplier-9",
      orderDate: "2025-11-12T11:15:00Z",
      expectedDelivery: "2025-12-02T11:15:00Z",
      status: "submitted to supplier",
      totalAmount: 132000,
      subTotal: 112000,
      totalGst: 20000,
      items: [
        {
          id: "15",
          yarnName: "Polyester Count 75",
          sizeCount: "75",
          shadeCode: "SH013",
          quantity: 200,
          rate: 380,
          gst: 18,
          subTotal: 89680,
          estimatedDeliveryDate: "2025-12-02"
        },
        {
          id: "16",
          yarnName: "Nylon Count 60",
          sizeCount: "60",
          shadeCode: "SH014",
          quantity: 150,
          rate: 420,
          gst: 18,
          subTotal: 74340,
          estimatedDeliveryDate: "2025-12-02"
        }
      ],
      notes: "Standard quality yarn for regular production",
      createdAt: "2025-11-12T11:15:00Z",
      updatedAt: "2025-11-12T11:15:00Z"
    },
    {
      id: "11",
      orderNumber: "PO-2025-011",
      supplier: "Grasim Industries",
      supplierId: "supplier-3",
      orderDate: "2025-11-07T16:45:00Z",
      expectedDelivery: "2025-11-27T16:45:00Z",
      status: "submitted to supplier",
      totalAmount: 98000,
      subTotal: 83000,
      totalGst: 15000,
      items: [
        {
          id: "17",
          yarnName: "Cotton Count 45",
          sizeCount: "45",
          shadeCode: "SH015",
          quantity: 180,
          rate: 440,
          gst: 18,
          subTotal: 93456,
          estimatedDeliveryDate: "2025-11-27"
        }
      ],
      notes: "Follow-up order for continuous production",
      createdAt: "2025-11-07T16:45:00Z",
      updatedAt: "2025-11-07T16:45:00Z"
    },
    {
      id: "12",
      orderNumber: "PO-2025-012",
      supplier: "Aditya Birla Group",
      supplierId: "supplier-2",
      orderDate: "2025-11-09T13:20:00Z",
      expectedDelivery: "2025-11-29T13:20:00Z",
      status: "submitted to supplier",
      totalAmount: 156000,
      subTotal: 132000,
      totalGst: 24000,
      items: [
        {
          id: "18",
          yarnName: "Viscose Count 35",
          sizeCount: "35",
          shadeCode: "SH016",
          quantity: 220,
          rate: 460,
          gst: 18,
          subTotal: 119416,
          estimatedDeliveryDate: "2025-11-29"
        },
        {
          id: "19",
          yarnName: "Cotton Count 55",
          sizeCount: "55",
          shadeCode: "SH017",
          quantity: 100,
          rate: 520,
          gst: 18,
          subTotal: 61360,
          estimatedDeliveryDate: "2025-11-29"
        }
      ],
      notes: "Large order for export production",
      createdAt: "2025-11-09T13:20:00Z",
      updatedAt: "2025-11-09T13:20:00Z"
    }
  ];

  const [orders, setOrders] = useState<PurchaseOrder[]>(staticOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("submitted to supplier");
  const [packlistModalOpen, setPacklistModalOpen] = useState(false);
  const [orderForPacklist, setOrderForPacklist] = useState<PurchaseOrder | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');

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

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Purchase Order.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  const handlePrintInvoice = async (order: PurchaseOrder) => {
    try {
      // Fetch the HTML template
      const response = await fetch('/templates/yarn-purchase-invoice.html');
      let htmlTemplate = await response.text();

      // Get supplier details (you may need to fetch this from API)
      // For now, using order data
      const supplier = {
        name: order.supplier,
        address: {
          line1: '', // TODO: Get from supplier data
          line2: '',
          city: '',
          state: '',
          pin: ''
        },
        phone: '',
        mobile: '',
        gst: ''
      };

      // Calculate tax breakdown (assuming GST is split into SGST and CGST)
      const gstRate = order.items.length > 0 ? order.items[0].gst : 18;
      const sgstRate = gstRate / 2;
      const cgstRate = gstRate / 2;
      const sgstAmount = order.totalGst / 2;
      const cgstAmount = order.totalGst / 2;

      // Replace template variables
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.name\}\}/g, supplier.name || order.supplier);
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.address\.line1\}\}/g, supplier.address.line1 || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.address\.line2\}\}/g, supplier.address.line2 || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.address\.city\}\}/g, supplier.address.city || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.address\.state\}\}/g, supplier.address.state || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.address\.pin\}\}/g, supplier.address.pin || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.phone\}\}/g, supplier.phone || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.mobile\}\}/g, supplier.mobile || '');
      htmlTemplate = htmlTemplate.replace(/\{\{supplier\.gst\}\}/g, supplier.gst || '');

      // Invoice details
      htmlTemplate = htmlTemplate.replace(/\{\{invoice\.number\}\}/g, order.orderNumber);
      htmlTemplate = htmlTemplate.replace(/\{\{invoice\.date\}\}/g, new Date(order.orderDate).toLocaleDateString());
      htmlTemplate = htmlTemplate.replace(/\{\{invoice\.payment_terms\}\}/g, 'Credit');
      htmlTemplate = htmlTemplate.replace(/\{\{invoice\.supplier_ref\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{invoice\.po_number\}\}/g, order.orderNumber);

      // Delivery details
      htmlTemplate = htmlTemplate.replace(/\{\{delivery\.note\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{delivery\.date\}\}/g, new Date(order.expectedDelivery).toLocaleDateString());

      // Consignee (company details)
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.name\}\}/g, 'Addon holding pvt ltd');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.address\.line1\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.address\.line2\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.address\.city\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.address\.state\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.address\.pin\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.state_code\}\}/g, 'MH');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.phone\}\}/g, '+91 9898989898');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.email\}\}/g, 'info@addon.in');
      htmlTemplate = htmlTemplate.replace(/\{\{consignee\.gstin\}\}/g, '');

      // Order details
      htmlTemplate = htmlTemplate.replace(/\{\{order\.number\}\}/g, order.orderNumber);
      htmlTemplate = htmlTemplate.replace(/\{\{order\.date\}\}/g, new Date(order.orderDate).toLocaleDateString());

      // Despatch details
      htmlTemplate = htmlTemplate.replace(/\{\{despatch\.number\}\}/g, order.packlistDetails?.trackingNumber || '');

      // Generate items rows
      let itemsHtml = '';
      order.items.forEach((item, index) => {
        itemsHtml += `
          <tr>
            <td>${index + 1}</td>
            <td>${item.shadeCode || ''}</td>
            <td>${item.yarnName} - ${item.sizeCount}</td>
            <td class="numeric">${item.quantity}</td>
            <td class="numeric">₹${item.rate.toLocaleString()}</td>
            <td class="numeric">₹${(item.rate * item.quantity).toLocaleString()}</td>
          </tr>
        `;
      });
      htmlTemplate = htmlTemplate.replace(/<!-- Repeat this <tr> block for each line item -->[\s\S]*?<!-- Add additional rows as needed -->/g, itemsHtml);

      // Summary totals
      const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.total_quantity\}\}/g, totalQuantity.toString());
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.subtotal\}\}/g, `₹${order.subTotal.toLocaleString()}`);
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.shipping\}\}/g, '₹0');
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.round_off\}\}/g, '₹0');
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.taxable_value\}\}/g, `₹${order.subTotal.toLocaleString()}`);
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.grand_total\}\}/g, `₹${order.totalAmount.toLocaleString()}`);

      // Tax details
      htmlTemplate = htmlTemplate.replace(/\{\{tax\.sgst_rate\}\}/g, sgstRate.toString());
      htmlTemplate = htmlTemplate.replace(/\{\{tax\.sgst_amount\}\}/g, `₹${sgstAmount.toLocaleString()}`);
      htmlTemplate = htmlTemplate.replace(/\{\{tax\.cgst_rate\}\}/g, cgstRate.toString());
      htmlTemplate = htmlTemplate.replace(/\{\{tax\.cgst_amount\}\}/g, `₹${cgstAmount.toLocaleString()}`);
      htmlTemplate = htmlTemplate.replace(/\{\{tax\.igst_rate\}\}/g, '0');
      htmlTemplate = htmlTemplate.replace(/\{\{tax\.igst_amount\}\}/g, '₹0');

      // Amount in words (simple conversion - you may want to use a library)
      htmlTemplate = htmlTemplate.replace(/\{\{summary\.amount_in_words\}\}/g, `Rupees ${numberToWords(order.totalAmount)} only`);

      // Narration
      htmlTemplate = htmlTemplate.replace(/\{\{narration\}\}/g, order.notes || '');

      // Signatures
      htmlTemplate = htmlTemplate.replace(/\{\{signatures\.prepared_by\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{signatures\.verified_by\}\}/g, '');
      htmlTemplate = htmlTemplate.replace(/\{\{signatures\.authorised_date\}\}/g, new Date().toLocaleDateString());

      // Open print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlTemplate);
        printWindow.document.close();
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Failed to load invoice template');
    }
  };

  // Helper function to convert number to words (simple version)
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const remainder = num % 100;
      return ones[hundred] + ' Hundred' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    if (num < 100000) {
      const thousand = Math.floor(num / 1000);
      const remainder = num % 1000;
      return numberToWords(thousand) + ' Thousand' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    if (num < 10000000) {
      const lakh = Math.floor(num / 100000);
      const remainder = num % 100000;
      return numberToWords(lakh) + ' Lakh' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    const crore = Math.floor(num / 10000000);
    const remainder = num % 10000000;
    return numberToWords(crore) + ' Crore' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
  };

  const handleStatusUpdate = async (orderId: string, newStatus: PurchaseOrderStatus) => {
    // If updating to "in transit", show packlist modal
    if (newStatus === 'in transit') {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setOrderForPacklist(order);
        setPacklistModalOpen(true);
      }
      return;
    }

    // For other status updates, proceed directly
    await updateOrderStatus(orderId, newStatus);
  };

  const updateOrderStatus = async (orderId: string, newStatus: PurchaseOrderStatus, packlistDetails?: PacklistDetails) => {
    setIsUpdatingStatus(true);
    try {
      // Handle file upload if packlist file is provided
      if (packlistDetails?.packlistFile) {
        // TODO: Implement API call to upload packlist file
        // Example: await uploadPacklistFile(orderId, packlistDetails.packlistFile);
        console.log('Packlist file to upload:', {
          fileName: packlistDetails.packlistFileName,
          fileSize: packlistDetails.packlistFile.size,
          fileType: packlistDetails.packlistFile.type
        });
      }

      // TODO: Implement API call to update status
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              status: newStatus, 
              updatedAt: new Date().toISOString(),
              packlistDetails: packlistDetails ? {
                trackingNumber: packlistDetails.trackingNumber,
                courierName: packlistDetails.courierName,
                dispatchDate: packlistDetails.dispatchDate,
                expectedArrivalDate: packlistDetails.expectedArrivalDate,
                notes: packlistDetails.notes
              } : order.packlistDetails
            } 
          : order
      ));
      toast.success('Purchase order status updated successfully');
      setPacklistModalOpen(false);
      setOrderForPacklist(null);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePacklistSubmit = async (details: PacklistDetails) => {
    if (orderForPacklist) {
      await updateOrderStatus(orderForPacklist.id, 'in transit', details);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'submitted to supplier': return 'bg-blue-100 text-blue-800';
      case 'in transit': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'QC pending': return 'bg-yellow-100 text-yellow-800';
      case 'partially delivered': return 'bg-orange-100 text-orange-800';
      case 'stocked': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextStatusOptions = (currentStatus: PurchaseOrderStatus): PurchaseOrderStatus[] => {
    switch (currentStatus) {
      case 'submitted to supplier':
        return ['in transit', 'rejected'];
      case 'in transit':
        return ['delivered', 'partially delivered'];
      case 'delivered':
        return ['QC pending'];
      case 'QC pending':
        return ['stocked', 'rejected'];
      case 'partially delivered':
        return ['delivered', 'QC pending'];
      default:
        return [];
    }
  };

  return (
    <div className="main-content">
      <Seo title="Purchase Order" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Purchase Order</h1>
                <p className="text-gray-600 mt-1">Manage yarn procurement and purchase orders</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/purchase-management/purchase/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-1"></i>
                  New Order
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
                    placeholder="Search by order number or supplier..."
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
                    <option value="submitted to supplier">Submitted to Supplier</option>
                    <option value="in transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="rejected">Rejected</option>
                    <option value="QC pending">QC Pending</option>
                    <option value="partially delivered">Partially Delivered</option>
                    <option value="stocked">Stocked</option>
                  </select>
                  <button className="ti-btn ti-btn-light">
                    <i className="ri-download-line me-1"></i>
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Orders Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Purchase Orders ({filteredOrders.length})</h3>
            </div>
            <div className="box-body">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-shopping-cart-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Orders</h3>
                  <p className="text-gray-500 mb-4">Start by creating your first purchase order.</p>
                  <Link 
                    href="/yarn-management/purchase-management/purchase/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Create First Order
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Number
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Date
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expected Delivery
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="border border-gray-300 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {filteredOrders.map((order) => {
                        const nextStatusOptions = getNextStatusOptions(order.status);
                        return (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {order.orderNumber}
                            </td>
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {order.supplier}
                            </td>
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(order.orderDate).toLocaleDateString()}
                            </td>
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(order.expectedDelivery).toLocaleDateString()}
                            </td>
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ₹{order.totalAmount.toLocaleString()}
                            </td>
                            <td className="border border-gray-300 px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handlePrintInvoice(order)}
                                  className="text-blue-600 hover:text-blue-900 flex items-center justify-center"
                                  title="Print Invoice"
                                >
                                  <i className="ri-printer-line text-lg"></i>
                                </button>
                                <Link
                                  href={`/yarn-management/purchase-management/purchase/edit/${order.id}`}
                                  className="text-green-600 hover:text-green-900 flex items-center justify-center"
                                  title="Edit"
                                >
                                  <i className="ri-edit-line text-lg"></i>
                                </Link>
                                {nextStatusOptions.length > 0 && (
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleStatusUpdate(order.id, e.target.value as PurchaseOrderStatus);
                                        e.target.value = "";
                                      }
                                    }}
                                    className="text-xs border border-gray-300 rounded px-2 py-1 h-7"
                                    title="Update Status"
                                  >
                                    <option value="">Update Status</option>
                                    {nextStatusOptions.map(status => (
                                      <option key={status} value={status}>
                                        Mark as {status}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Packlist Modal */}
      {orderForPacklist && (
        <PacklistModal
          isOpen={packlistModalOpen}
          onClose={() => {
            setPacklistModalOpen(false);
            setOrderForPacklist(null);
          }}
          onSubmit={handlePacklistSubmit}
          orderNumber={orderForPacklist.orderNumber}
          expectedDelivery={orderForPacklist.expectedDelivery}
          isSubmitting={isUpdatingStatus}
        />
      )}
    </div>
  );
};

export default PurchasePage;
