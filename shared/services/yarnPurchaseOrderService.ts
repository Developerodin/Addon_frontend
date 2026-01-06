import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface PurchaseOrderItem {
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

export interface PacklistDetails {
  packingNumber: string;
  courierName: string;
  courierNumber: string;
  vehicleNumber: string;
  challanNumber: string;
  dispatchDate: string;
  estimatedDeliveryDate: string;
  numberOfCones: number;
  numberOfBoxes: number;
  totalWeight: number;
  notes?: string;
  packlistFile?: File;
  packlistFileName?: string;
}

export type PurchaseOrderStatus =
  | 'submitted to supplier'
  | 'in transit'
  | 'delivered'
  | 'rejected'
  | 'QC pending'
  | 'partially delivered'
  | 'stocked'
  | 'goods received'
  | 'goods partially received'
  | 'PO accepted'
  | 'PO accepted partially'
  | 'po_accepted'
  | 'po_rejected';

export interface PurchaseOrder {
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
  items: PurchaseOrderItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  packlistDetails?: PacklistDetails;
}

export interface PurchaseOrderListResponse {
  results: PurchaseOrder[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
}

export interface PurchaseOrderQueryParams {
  start_date?: string;
  end_date?: string;
  status_code?: string;
  supplier_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseOrderItemPayload {
  yarn: string;
  yarnName: string;
  sizeCount: string;
  shadeCode?: string;
  rate: number;
  quantity: number;
  estimatedDeliveryDate: string;
  gstRate: number;
}

export interface CreatePurchaseOrderPayload {
  poNumber: string;
  supplierName: string;
  supplier: string;
  poItems: PurchaseOrderItemPayload[];
  notes?: string;
  subTotal: number;
  gst: number;
  total: number;
  currentStatus: string;
}

export interface UpdatePurchaseOrderPayload {
  poNumber: string;
  supplierName: string;
  supplier: string;
  poItems: PurchaseOrderItemPayload[];
  notes?: string;
  subTotal: number;
  gst: number;
  total: number;
  currentStatus: string;
}

export interface ReceivedLotPoItem {
  poItem: string;
  receivedQuantity: number;
}

export interface ReceivedLotDetail {
  lotNumber: string;
  numberOfCones: number;
  totalWeight: number;
  numberOfBoxes: number;
  poItems: ReceivedLotPoItem[];
  status: 'lot_pending' | 'lot_qc_pending' | 'lot_accepted' | 'lot_rejected';
}

export interface UpdatePurchaseOrderWithReceivedLotsPayload {
  receivedLotDetails: ReceivedLotDetail[];
  currentStatus: 'goods_received' | 'goods_partially_received';
}

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;

  try {
    const tokenFromCookie = Cookies.get('accessToken');
    if (tokenFromCookie) {
      return tokenFromCookie;
    }

    const tokenFromStorage = localStorage.getItem('token');
    if (tokenFromStorage) {
      return tokenFromStorage;
    }

    return null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

class YarnPurchaseOrderService {
  private baseURL = `${API_BASE_URL}/yarn-management/yarn-purchase-orders`;

  private buildHeaders(additional?: HeadersInit): HeadersInit {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...additional,
    };
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = getAccessToken();

    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const config: RequestInit = {
      ...options,
      headers: this.buildHeaders(options.headers),
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }

        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error('Yarn Purchase Order API Error:', error);
      throw error;
    }
  }

  async getPurchaseOrders(params: PurchaseOrderQueryParams = {}): Promise<PurchaseOrderListResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const query = searchParams.toString();
    const endpoint = query ? `?${query}` : '';

    return this.makeRequest<PurchaseOrderListResponse>(endpoint);
  }

  async getPurchaseOrderById(orderId: string): Promise<PurchaseOrder> {
    if (!orderId) {
      throw new Error('Order ID is required');
    }
    return this.makeRequest<PurchaseOrder>(`/${orderId}`);
  }

  async updatePurchaseOrderWithPacklist(
    orderId: string,
    packlistDetails: PacklistDetails[]
  ): Promise<PurchaseOrder> {
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    if (!packlistDetails || packlistDetails.length === 0) {
      throw new Error('At least one packlist detail is required');
    }

    // Combine notes from all entries (or use the first one)
    const combinedNotes = packlistDetails
      .map(d => d.notes)
      .filter(Boolean)
      .join('; ') || 'Update packing details';

    const payload: {
      notes?: string;
      packListDetails: Array<{
        packingNumber: string;
        courierName: string;
        courierNumber?: string;
        vehicleNumber?: string;
        challanNumber?: string;
        dispatchDate: string;
        estimatedDeliveryDate: string;
        numberOfCones: number;
        numberOfBoxes: number;
        totalWeight: number;
        notes?: string;
        poItems?: string[];
      }>;
    } = {
      notes: combinedNotes,
      packListDetails: packlistDetails.map(detail => ({
        packingNumber: detail.packingNumber,
        courierName: detail.courierName,
        courierNumber: detail.courierNumber || '',
        vehicleNumber: detail.vehicleNumber || '',
        challanNumber: detail.challanNumber || '',
        dispatchDate: detail.dispatchDate,
        estimatedDeliveryDate: detail.estimatedDeliveryDate,
        numberOfCones: detail.numberOfCones,
        numberOfBoxes: detail.numberOfBoxes,
        totalWeight: detail.totalWeight,
        notes: detail.notes || '',
        poItems: detail.poItems || [],
      })),
    };

    return this.makeRequest<PurchaseOrder>(`/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async updatePurchaseOrderStatus(
    orderId: string,
    status: PurchaseOrderStatus,
    userId: string,
    username: string,
    notes?: string
  ): Promise<PurchaseOrder> {
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    const payload = {
      status_code: this.convertStatusToAPI(status),
      updated_by: {
        username: username,
        user_id: userId
      },
      notes: notes || ''
    };

    return this.makeRequest<PurchaseOrder>(`/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  private convertStatusToAPI(status: PurchaseOrderStatus): string {
    const statusMap: Record<PurchaseOrderStatus, string> = {
      'submitted to supplier': 'submitted_to_supplier',
      'in transit': 'in_transit',
      'delivered': 'delivered',
      'rejected': 'po_rejected',
      'QC pending': 'qc_pending',
      'partially delivered': 'partially_delivered',
      'stocked': 'stocked',
      'goods received': 'goods_received',
      'goods partially received': 'goods_partially_received',
      'po_accepted': 'po_accepted',
      'po_rejected': 'po_rejected',
    };
    return statusMap[status] || 'submitted_to_supplier';
  }

  async createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
    return this.makeRequest<PurchaseOrder>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updatePurchaseOrder(orderId: string, payload: UpdatePurchaseOrderPayload): Promise<PurchaseOrder> {
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    return this.makeRequest<PurchaseOrder>(`/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async updatePurchaseOrderWithReceivedLots(
    orderId: string,
    payload: UpdatePurchaseOrderWithReceivedLotsPayload
  ): Promise<PurchaseOrder> {
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    return this.makeRequest<PurchaseOrder>(`/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async updateLotStatus(
    poNumber: string,
    lotNumber: string,
    lotStatus: 'lot_qc_pending' | 'lot_accepted' | 'lot_rejected'
  ): Promise<any> {
    if (!poNumber) {
      throw new Error('PO Number is required');
    }
    if (!lotNumber) {
      throw new Error('Lot Number is required');
    }

    const payload = {
      poNumber,
      lotNumber,
      lotStatus,
    };

    return this.makeRequest<any>(`/lot-status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async updateLotStatusQCApprove(payload: {
    poNumber: string;
    lotNumber: string;
    lotStatus: 'lot_accepted' | 'lot_rejected';
    updated_by: {
      username: string;
      user_id: string;
    };
    notes?: string;
    remarks?: string;
    mediaUrl?: Record<string, string>;
  }): Promise<any> {
    if (!payload.poNumber) {
      throw new Error('PO Number is required');
    }
    if (!payload.lotNumber) {
      throw new Error('Lot Number is required');
    }

    return this.makeRequest<any>(`/lot-status-qc-approve`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deletePurchaseOrder(purchaseOrderId: string): Promise<void> {
    if (!purchaseOrderId) {
      throw new Error('Purchase Order ID is required');
    }

    return this.makeRequest<void>(`/${purchaseOrderId}`, {
      method: 'DELETE',
    });
  }
}

const yarnPurchaseOrderService = new YarnPurchaseOrderService();

export default yarnPurchaseOrderService;
