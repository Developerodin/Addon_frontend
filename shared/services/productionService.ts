import { API_BASE_URL } from '../data/utilities/api';

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  currentFloor: 'Knitting' | 'Linking' | 'Checking' | 'Washing' | 'Boarding' | 'Final Checking' | 'Branding' | 'Warehouse';
  articles: Article[];
  orderNote?: string;
  customerId?: string;
  customerName?: string;
  customerOrderNumber?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  forwardedToBranding?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface Article {
  id: string;
  _id?: string;
  orderId?: string;
  articleNumber: string;
  plannedQuantity: number;
  completedQuantity: number;
  linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  progress: number;
  currentFloor: string;
  remarks?: string;
  quantityFromPreviousFloor?: number;
  m1Quantity: number;
  m2Quantity: number;
  m3Quantity: number;
  m4Quantity: number;
  repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
  repairRemarks?: string;
  qualityConfirmed?: boolean;
  finalQualityConfirmed?: boolean;
  finalQualityConfirmedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  floorQuantities?: {
    knitting: { received: number; completed: number; remaining: number; transferred: number; m4Quantity?: number };
    linking: { received: number; completed: number; remaining: number; transferred: number };
    checking: { received: number; completed: number; remaining: number; transferred: number; m1Quantity?: number; m2Quantity?: number; m3Quantity?: number; m4Quantity?: number };
    washing: { received: number; completed: number; remaining: number; transferred: number };
    boarding: { received: number; completed: number; remaining: number; transferred: number };
    finalChecking: { received: number; completed: number; remaining: number; transferred: number; m1Quantity?: number; m2Quantity?: number; m3Quantity?: number; m4Quantity?: number };
    branding: { received: number; completed: number; remaining: number; transferred: number };
    warehouse: { received: number; completed: number; remaining: number; transferred: number };
  };
}

export interface CreateOrderRequest {
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  articles: {
    articleNumber: string;
    plannedQuantity: number;
    linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
    priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  }[];
  orderNote?: string;
  customerId?: string;
  customerName?: string;
  customerOrderNumber?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

export interface UpdateOrderRequest {
  priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
  orderNote?: string;
  plannedEndDate?: string;
  articles?: {
    id?: string;
    articleNumber: string;
    plannedQuantity: number;
    linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
    priority: 'Urgent' | 'High' | 'Medium' | 'Low';
    remarks?: string;
  }[];
}

export interface UpdateArticleProgressRequest {
  completedQuantity?: number;
  remarks?: string;
  m1Quantity?: number;
  m2Quantity?: number;
  m3Quantity?: number;
  m4Quantity?: number;
  repairStatus?: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
  repairRemarks?: string;
  machineId?: string;
  shiftId?: string;
}

export interface TransferArticleRequest {
  orderId: string;
  articleId: string;
  quantity: number;
  remarks?: string;
  batchNumber?: string;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  currentFloor?: string;
  customerId?: string;
  search?: string;
  sortBy?: string;
  populate?: string;
}

export interface FloorOrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

class ProductionService {
  private baseUrl = `${API_BASE_URL}/production`;

  // Utility function to get floor order based on linking type
  getFloorOrderByLinkingType(linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking'): string[] {
    if (linkingType === 'Auto Linking') {
      return ['Knitting', 'Checking', 'Washing', 'Boarding', 'Final Checking', 'Branding', 'Warehouse'];
    } else {
      return ['Knitting', 'Linking', 'Checking', 'Washing', 'Boarding', 'Final Checking', 'Branding', 'Warehouse'];
    }
  }

  // Transform API response to match our interfaces
  private transformOrder(order: any): ProductionOrder {
    console.log('Transforming order:', order);
    const transformed = {
      id: order.id,
      orderNumber: order.orderNumber,
      priority: order.priority,
      status: order.status,
      currentFloor: order.currentFloor,
      articles: order.articles ? order.articles.map((article: any) => this.transformArticle(article, order.id)) : [],
      orderNote: order.orderNote,
      customerId: order.customerId,
      customerName: order.customerName,
      customerOrderNumber: order.customerOrderNumber,
      plannedStartDate: order.plannedStartDate,
      plannedEndDate: order.plannedEndDate,
      actualStartDate: order.actualStartDate,
      actualEndDate: order.actualEndDate,
      forwardedToBranding: order.forwardedToBranding,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      createdBy: order.createdBy,
      lastModifiedBy: order.lastModifiedBy
    };
    console.log('Transformed order:', transformed);
    return transformed;
  }

  private transformArticle(article: any, orderId: string): Article {
    console.log('Transforming article:', article);
    const transformed = {
      id: article.id || article._id,
      _id: article._id || article.id,
      orderId: orderId,
      articleNumber: article.articleNumber,
      plannedQuantity: article.plannedQuantity,
      completedQuantity: article.completedQuantity,
      linkingType: article.linkingType,
      priority: article.priority,
      status: article.status,
      progress: article.progress,
      currentFloor: article.currentFloor,
      remarks: article.remarks,
      quantityFromPreviousFloor: article.quantityFromPreviousFloor,
      m1Quantity: article.m1Quantity,
      m2Quantity: article.m2Quantity,
      m3Quantity: article.m3Quantity,
      m4Quantity: article.m4Quantity,
      repairStatus: article.repairStatus,
      repairRemarks: article.repairRemarks,
      qualityConfirmed: article.qualityConfirmed || article.finalQualityConfirmed,
      finalQualityConfirmed: article.finalQualityConfirmed,
      finalQualityConfirmedAt: article.finalQualityConfirmedAt,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      floorQuantities: article.floorQuantities
    };
    console.log('Transformed article:', transformed);
    return transformed;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }

      // Handle both wrapped and direct response formats
      if (data.success !== undefined) {
        // Response is already wrapped in success format
        return data;
      } else {
        // Response is direct data, wrap it
        return {
          success: true,
          data: data
        };
      }
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Order Management APIs
  async createOrder(orderData: CreateOrderRequest): Promise<ApiResponse<ProductionOrder>> {
    return this.request<ProductionOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrders(filters: OrderFilters = {}): Promise<ApiResponse<PaginatedResponse<ProductionOrder>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/orders?${queryString}` : '/orders';
    
    try {
      const response = await this.request<any>(endpoint);
      
      // Handle both wrapped and direct response formats
      const responseData = response.success ? response.data : response;
      
      // Transform the results
      const transformedData: PaginatedResponse<ProductionOrder> = {
        ...responseData,
        results: responseData.results.map((order: any) => this.transformOrder(order))
      };
      
      return {
        success: true,
        data: transformedData
      };
    } catch (error) {
      console.error('Error in getOrders:', error);
      return {
        success: false,
        data: {
          results: [],
          page: 1,
          limit: 10,
          totalPages: 0,
          totalResults: 0
        },
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch orders'
        }
      };
    }
  }

  async getOrder(orderId: string): Promise<ApiResponse<ProductionOrder>> {
    const response = await this.request<any>(`/orders/${orderId}`);
    
    if (response.success) {
      return {
        success: true,
        data: this.transformOrder(response.data)
      };
    }
    
    return response as ApiResponse<ProductionOrder>;
  }

  async updateOrder(orderId: string, updateData: UpdateOrderRequest): Promise<ApiResponse<ProductionOrder>> {
    return this.request<ProductionOrder>(`/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async deleteOrder(orderId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/orders/${orderId}`, {
      method: 'DELETE',
    });
  }

  async bulkCreateOrders(orders: CreateOrderRequest[], batchSize: number = 50): Promise<ApiResponse<{ message: string; results: { successful: number; failed: number; errors: any[] } }>> {
    return this.request('/orders/bulk-create', {
      method: 'POST',
      body: JSON.stringify({ orders, batchSize }),
    });
  }

  // Floor Operations APIs
  async getFloorOrders(floor: string, filters: FloorOrderFilters = {}): Promise<ApiResponse<PaginatedResponse<ProductionOrder>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/floors/${floor}/orders?${queryString}` : `/floors/${floor}/orders`;
    
    try {
      const response = await this.request<any>(endpoint);
      
      // Handle both wrapped and direct response formats
      const responseData = response.success ? response.data : response;
      
      // Transform the results
      const transformedData: PaginatedResponse<ProductionOrder> = {
        ...responseData,
        results: responseData.results.map((order: any) => this.transformOrder(order))
      };
      
      return {
        success: true,
        data: transformedData
      };
    } catch (error) {
      console.error('Error in getFloorOrders:', error);
      return {
        success: false,
        data: {
          results: [],
          page: 1,
          limit: 10,
          totalPages: 0,
          totalResults: 0
        },
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch floor orders'
        }
      };
    }
  }

  async updateArticleProgress(
    floor: string,
    orderId: string,
    articleId: string,
    progressData: UpdateArticleProgressRequest
  ): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/floors/${floor}/orders/${orderId}/articles/${articleId}`, {
      method: 'PATCH',
      body: JSON.stringify(progressData),
    });
  }

  async transferArticle(floor: string, transferData: TransferArticleRequest): Promise<ApiResponse<any>> {
    return this.request(`/floors/${floor}/transfer`, {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  }

  async transferToNextFloor(articleId: string, transferData: {
    quantity: number;
    remarks?: string;
    batchNumber?: string;
  }): Promise<ApiResponse<any>> {
    return this.request(`/articles/${articleId}/transfer`, {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  }

  async getFloorStatistics(floor: string, dateFrom?: string, dateTo?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (dateFrom) queryParams.append('dateFrom', dateFrom);
    if (dateTo) queryParams.append('dateTo', dateTo);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/floors/${floor}/statistics?${queryString}` : `/floors/${floor}/statistics`;
    
    return this.request(endpoint);
  }

  // Quality Control APIs
  async updateQualityInspection(articleId: string, qualityData: {
    inspectedQuantity: number;
    m1Quantity: number;
    m2Quantity: number;
    m3Quantity: number;
    m4Quantity: number;
    remarks?: string;
    machineId?: string;
    shiftId?: string;
  }): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/articles/${articleId}/quality-inspection`, {
      method: 'POST',
      body: JSON.stringify(qualityData),
    });
  }

  async updateQualityCategories(articleId: string, qualityData: {
    m1Quantity: number;
    m2Quantity: number;
    m3Quantity: number;
    m4Quantity: number;
    repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
    repairRemarks?: string;
  }): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/floors/final-checking/quality/${articleId}`, {
      method: 'PATCH',
      body: JSON.stringify(qualityData),
    });
  }

  async shiftM2Items(shiftData: {
    articleId: string;
    fromM2: number;
    toM1: number;
    toM3: number;
    toM4: number;
    remarks?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/floors/final-checking/shift-m2', {
      method: 'POST',
      body: JSON.stringify(shiftData),
    });
  }

  async confirmFinalQuality(articleId: string, confirmed: boolean, remarks?: string): Promise<ApiResponse<any>> {
    return this.request('/floors/final-checking/confirm-quality', {
      method: 'POST',
      body: JSON.stringify({ articleId, confirmed, remarks }),
    });
  }

  async forwardToWarehouse(orderId: string, remarks?: string): Promise<ApiResponse<any>> {
    return this.request('/floors/final-checking/forward-to-warehouse', {
      method: 'POST',
      body: JSON.stringify({ orderId, remarks }),
    });
  }

  // Reports & Analytics APIs
  async getProductionDashboard(dateFrom?: string, dateTo?: string, floor?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (dateFrom) queryParams.append('dateFrom', dateFrom);
    if (dateTo) queryParams.append('dateTo', dateTo);
    if (floor) queryParams.append('floor', floor);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/dashboard?${queryString}` : '/dashboard';
    
    return this.request(endpoint);
  }

  async getEfficiencyReport(floor?: string, dateFrom?: string, dateTo?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (floor) queryParams.append('floor', floor);
    if (dateFrom) queryParams.append('dateFrom', dateFrom);
    if (dateTo) queryParams.append('dateTo', dateTo);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/reports/efficiency?${queryString}` : '/reports/efficiency';
    
    return this.request(endpoint);
  }

  async getQualityReport(dateFrom?: string, dateTo?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (dateFrom) queryParams.append('dateFrom', dateFrom);
    if (dateTo) queryParams.append('dateTo', dateTo);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/reports/quality?${queryString}` : '/reports/quality';
    
    return this.request(endpoint);
  }

  async getOrderTrackingReport(orderId: string): Promise<ApiResponse<any>> {
    return this.request(`/reports/order-tracking/${orderId}`);
  }

  // Logging & Audit APIs
  async getArticleLogs(articleId: string, filters: {
    dateFrom?: string;
    dateTo?: string;
    action?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/article/${articleId}?${queryString}` : `/logs/article/${articleId}`;
    
    return this.request(endpoint);
  }

  async getOrderLogs(orderId: string): Promise<ApiResponse<any>> {
    return this.request(`/logs/order/${orderId}`);
  }

  async getFloorLogs(floor: string): Promise<ApiResponse<any>> {
    return this.request(`/logs/floor/${floor}`);
  }

  async getUserLogs(userId: string): Promise<ApiResponse<any>> {
    return this.request(`/logs/user/${userId}`);
  }

  async getLogStatistics(filters: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: string;
    floor?: string;
    action?: string;
  } = {}): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/statistics?${queryString}` : '/logs/statistics';
    
    return this.request(endpoint);
  }

  async getAuditTrail(orderId: string, includeSystemLogs?: boolean, includeUserActions?: boolean): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (includeSystemLogs !== undefined) queryParams.append('includeSystemLogs', String(includeSystemLogs));
    if (includeUserActions !== undefined) queryParams.append('includeUserActions', String(includeUserActions));

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/audit-trail/${orderId}?${queryString}` : `/logs/audit-trail/${orderId}`;
    
    return this.request(endpoint);
  }

  // Bulk Operations APIs
  async bulkUpdateArticles(updates: {
    articleId: string;
    completedQuantity?: number;
    remarks?: string;
  }[], batchSize: number = 50): Promise<ApiResponse<any>> {
    return this.request('/bulk/update-articles', {
      method: 'POST',
      body: JSON.stringify({ updates, batchSize }),
    });
  }
}

export const productionService = new ProductionService();
