import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  addressLine1: string;
  addressLine2: string;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  email: string;
  address: OrderAddress;
}

export interface OrderPayment {
  method: string;
  status: string;
  amount: number;
}

export interface OrderLogistics {
  status: string;
  trackingId: string;
  warehouse: string;
  picker: string;
}

export interface Order {
  id: string;
  source: string;
  externalOrderId: string;
  customer: OrderCustomer;
  items: OrderItem[];
  payment: OrderPayment;
  logistics: OrderLogistics;
  orderStatus: string;
  meta: {
    notes: string;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderData {
  source: string;
  externalOrderId: string;
  customer: OrderCustomer;
  items: OrderItem[];
  payment: OrderPayment;
  logistics: OrderLogistics;
  orderStatus: string;
  meta: {
    notes: string;
  };
}

export interface UpdateOrderData extends Omit<Partial<CreateOrderData>, 'source' | 'externalOrderId'> {}

export interface OrderFilters {
  limit?: number;
  page?: number;
  sortBy?: string;
  source?: string;
  orderStatus?: string;
  externalOrderId?: string;
  customerName?: string;
  'customer.email'?: string;
  'logistics.trackingId'?: string;
  warehouse?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Helper function to get access token from cookies or localStorage
const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null; // Server-side check
  
  try {
    // First try js-cookie library
    const tokenFromJsCookie = Cookies.get('accessToken');
    if (tokenFromJsCookie) {
      return tokenFromJsCookie;
    }

    // Fallback to localStorage
    const tokenFromLocalStorage = localStorage.getItem('token');
    if (tokenFromLocalStorage) {
      return tokenFromLocalStorage;
    }

    return null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

class OrderService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/orders`;
  }

  private getHeaders(): HeadersInit {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = getAccessToken();
    
    // Check if token exists before making request
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const config: RequestInit = {
      headers: this.getHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle 401 specifically
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error('Order API Error:', error);
      throw error;
    }
  }

  // Get all orders with optional filters
  async getOrders(filters: OrderFilters = {}): Promise<PaginatedResponse<Order>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';
    
    return this.makeRequest<PaginatedResponse<Order>>(endpoint);
  }

  // Get order by ID
  async getOrder(orderId: string): Promise<Order> {
    return this.makeRequest<Order>(`/${orderId}`);
  }

  // Create new order
  async createOrder(orderData: CreateOrderData): Promise<Order> {
    return this.makeRequest<Order>('', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  // Update order
  async updateOrder(orderId: string, updateData: UpdateOrderData): Promise<Order> {
    return this.makeRequest<Order>(`/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  }

  // Delete order
  async deleteOrder(orderId: string): Promise<boolean> {
    await this.makeRequest(`/${orderId}`, {
      method: 'DELETE'
    });
    return true;
  }

  // Get order by external order ID
  async getOrderByExternalId(externalOrderId: string): Promise<Order> {
    return this.makeRequest<Order>(`/external/${externalOrderId}`);
  }

  // Update order status
  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    return this.makeRequest<Order>(`/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ orderStatus: status })
    });
  }
}

// Export singleton instance
export const orderService = new OrderService();

