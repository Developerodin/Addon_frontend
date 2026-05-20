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
  machineId?: string | any; // Can be string or populated object
  remarks?: string;
  knittingCode?: string;
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
    knitting: { received: number; completed: number; remaining: number; transferred: number; m4Quantity?: number; weight?: number; repairReceived?: number; repairFromFloor?: string };
    linking: { received: number; completed: number; remaining: number; transferred: number; repairReceived?: number; repairFromFloor?: string };
    checking: { received: number; completed: number; remaining: number; transferred: number; m1Quantity?: number; m2Quantity?: number; m3Quantity?: number; m4Quantity?: number; m2Transferred?: number; m2Remaining?: number; repairReceived?: number; repairFromFloor?: string };
    secondaryChecking: { received: number; completed: number; remaining: number; transferred: number; m1Quantity?: number; m2Quantity?: number; m3Quantity?: number; m4Quantity?: number; m2Transferred?: number; m2Remaining?: number; repairReceived?: number; repairFromFloor?: string };
    washing: { received: number; completed: number; remaining: number; transferred: number; repairReceived?: number; repairFromFloor?: string };
    boarding: { received: number; completed: number; remaining: number; transferred: number; repairReceived?: number; repairFromFloor?: string };
    finalChecking: { received: number; completed: number; remaining: number; transferred: number; m1Quantity?: number; m2Quantity?: number; m3Quantity?: number; m4Quantity?: number; m2Transferred?: number; m2Remaining?: number; repairReceived?: number; repairFromFloor?: string; transferredData?: TransferItem[]; receivedData?: Array<TransferItem & { receivedStatusFromPreviousFloor?: string; receivedInContainerId?: string; receivedTimestamp?: string }> };
    /** Dispatch: no M1–M4; transfer is style/brand lines + container to next floor (e.g. Warehouse). */
    dispatch: {
      received: number;
      completed?: number;
      remaining?: number;
      transferred?: number;
      repairReceived?: number;
      repairFromFloor?: string;
      transferredData?: TransferItem[];
      receivedData?: DispatchReceivedDataEntry[];
    };
    branding: { received: number; completed: number; remaining: number; transferred: number; repairReceived?: number; repairFromFloor?: string; transferredData?: TransferItem[]; receivedData?: Array<TransferItem & { receivedStatusFromPreviousFloor?: string; receivedInContainerId?: string; receivedTimestamp?: string }> };
    /** Warehouse: receive from Dispatch (or prior floor) with line-level receivedData; optional outbound transferredData. */
    warehouse: {
      received: number;
      completed?: number;
      remaining?: number;
      transferred?: number;
      repairReceived?: number;
      repairFromFloor?: string;
      transferredData?: TransferItem[];
      receivedData?: DispatchReceivedDataEntry[];
    };
  };
}

/** Populated order ref from GET /production/articles/:articleId */
export interface ArticleOrderRef {
  orderNumber?: string;
  priority?: string;
  status?: string;
  _id?: string;
}

/** Populated machine ref from GET /production/articles/:articleId */
export interface ArticleMachineRef {
  machineCode?: string;
  machineNumber?: string;
  model?: string;
  floor?: string;
  status?: string;
  _id?: string;
}

/** Full article from GET /production/articles/:articleId (orderId & machineId populated) */
export interface ProductionArticleDetail extends Article {
  orderId?: string | ArticleOrderRef;
  machineId?: string | ArticleMachineRef;
}

/** Process from GET /production/articles/:articleId/processes */
export interface ArticleProcess {
  _id: string;
  name: string;
  type?: string;
  description?: string;
  sortOrder: number;
  status?: string;
  steps?: unknown[];
}

/** Response from GET /production/articles/:articleId/processes */
export interface ArticleProcessesResponse {
  articleNumber: string;
  processes: ArticleProcess[];
}

export interface CreateOrderRequest {
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  articles: {
    articleNumber: string;
    plannedQuantity: number;
    linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
    priority: 'Urgent' | 'High' | 'Medium' | 'Low';
    machineId?: string;
    remarks?: string;
    knittingCode?: string;
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
    _id?: string;
    articleNumber: string;
    plannedQuantity: number;
    linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
    priority: 'Urgent' | 'High' | 'Medium' | 'Low';
    machineId?: string;
    remarks?: string;
  }[];
}

/** Transfer item breakdown by styleCode/brand (Branding, Final Checking) */
export interface TransferItem {
  transferred: number;
  styleCode?: string;
  brand?: string;
}

/** Dispatch floor: lines received from previous floor (container scan), optional qty/style/brand per row. */
export interface DispatchReceivedDataEntry {
  receivedStatusFromPreviousFloor?: string;
  receivedInContainerId?: string | null;
  receivedTimestamp?: string | null;
  transferred?: number;
  styleCode?: string;
  brand?: string;
}

export interface UpdateArticleProgressRequest {
  completedQuantity?: number;
  /** Transfer breakdown by styleCode/brand (Branding → Final Checking, Final Checking → Warehouse) */
  transferredData?: TransferItem[];
  /** Required for transfer: current user object id */
  userId?: string;
  /** Required for transfer: floor supervisor object id */
  floorSupervisorId?: string;
  remarks?: string;
  m1Quantity?: number;
  m2Quantity?: number;
  m3Quantity?: number;
  m4Quantity?: number;
  weight?: number;
  repairStatus?: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
  repairRemarks?: string;
  machineId?: string;
  shiftId?: string;
}

export interface TransferArticleRequest {
  orderId: string;
  articleId: string;
  /** Legacy: single quantity when transferItems not provided */
  quantity?: number;
  /** Breakdown by styleCode/brand for Branding/Final Checking */
  transferItems?: TransferItem[];
  userId?: string;
  floorSupervisorId?: string;
  remarks?: string;
  batchNumber?: string;
}

/** Body for PATCH /articles/:articleId/floor-received-data – append one receivedData entry. */
export type ProductionFloorName =
  | 'Knitting' | 'Linking' | 'Checking' | 'Washing' | 'Boarding' | 'Silicon'
  | 'Secondary Checking' | 'Branding' | 'Final Checking' | 'Warehouse' | 'Dispatch';

export interface FloorReceivedDataBody {
  floor: ProductionFloorName;
  /** Legacy: single quantity when receivedTransferItems not provided */
  quantity?: number;
  /** Breakdown by styleCode/brand when receiving (omit quantity when using this) */
  receivedTransferItems?: TransferItem[];
  receivedData: {
    receivedStatusFromPreviousFloor?: string;
    receivedInContainerId?: string | null;
    receivedTimestamp?: string | null;
  };
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
  machineId?: string;
  sortBy?: string;
  populate?: string;
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

/** Single order row in article-wise report */
export interface ArticleWiseReportOrder {
  articleId: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  orderPriority: string;
  orderCurrentFloor: string;
  orderNote?: string;
  orderCreatedAt?: string;
  plannedQuantity: number;
  status: string;
  progress: number;
  linkingType: string;
  priority: string;
  remarks?: string;
  machineId?: string;
  machine?: { machineCode?: string; machineNumber?: string; model?: string; floor?: string };
  floorQuantities?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  logs?: Array<{
    id: string;
    action: string;
    quantity?: number;
    fromFloor?: string;
    toFloor?: string;
    remarks?: string;
    timestamp?: string;
    date?: string;
    userId?: string;
    previousValue?: unknown;
    newValue?: unknown;
    qualityStatus?: string | null;
  }>;
}

/** Single article in article-wise report */
export interface ArticleWiseReportArticle {
  factoryCode: string;
  articleNumber: string;
  orders: ArticleWiseReportOrder[];
}

export interface ArticleWiseReportResponse {
  results: ArticleWiseReportArticle[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
}

class ProductionService {
  private baseUrl = `${API_BASE_URL}/production`;

  // Utility function to get floor order based on linking type
  getFloorOrderByLinkingType(linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking'): string[] {
    if (linkingType === 'Auto Linking') {
      return ['Knitting', 'Checking', 'Washing', 'Boarding', 'Final Checking', 'Branding', 'Warehouse', 'Dispatch'];
    } else {
      return ['Knitting', 'Linking', 'Checking', 'Washing', 'Boarding', 'Final Checking', 'Branding', 'Warehouse', 'Dispatch'];
    }
  }

  // Transform API response to match our interfaces
  private transformOrder(order: any): ProductionOrder {
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
    return transformed;
  }

  private transformArticle(article: any, orderId: string): Article {
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
      machineId: article.machineId,
      remarks: article.remarks,
      knittingCode: article.knittingCode,
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
      
      // Try to parse JSON, but handle cases where response might not be JSON
      let data: any;
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      try {
        const text = await response.text();
        data = text ? (isJson ? JSON.parse(text) : { message: text }) : {};
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        data = { message: `Failed to parse response: ${response.statusText}` };
      }

      if (!response.ok) {
        // Return error in ApiResponse format instead of throwing
        const errorMessage = 
          data.message || 
          data.error?.message || 
          data.error || 
          `Request failed with status ${response.status}`;
        
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          endpoint: `${this.baseUrl}${endpoint}`
        });
        
        return {
          success: false,
          data: {} as T,
          error: {
            code: data.code || String(response.status),
            message: errorMessage,
            details: data.error?.details || data.details || []
          }
        };
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
      // Handle network errors or JSON parsing errors
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      return {
        success: false,
        data: {} as T,
        error: {
          code: 'NETWORK_ERROR',
          message: errorMessage,
          details: []
        }
      };
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

  /** GET /production/articles/:articleId/processes – article processes (floors) from Product */
  async getArticleProcesses(articleId: string): Promise<ApiResponse<ArticleProcessesResponse>> {
    if (!articleId) throw new Error('articleId is required');
    return this.request<ArticleProcessesResponse>(`/articles/${articleId}/processes`);
  }

  /** GET /production/articles/:articleId – full article with orderId & machineId populated */
  async getArticle(articleId: string): Promise<ApiResponse<ProductionArticleDetail>> {
    if (!articleId) throw new Error('articleId is required');
    const raw = await this.request<any>(`/articles/${articleId}`);
    if (!raw.success || !raw.data) return raw as ApiResponse<ProductionArticleDetail>;
    const a = raw.data;
    const data: ProductionArticleDetail = {
      ...this.transformArticle(a, typeof a.orderId === 'object' && a.orderId?.orderNumber != null ? (a.orderId as any)._id : a.orderId),
      orderId: a.orderId,
      machineId: a.machineId
    };
    return { success: true, data };
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

  /**
   * GET /production/floors/Dispatch/orders/pending-warehouse-print
   * Same filters as getFloorOrders; response has dispatch.transferredData as pending-only lines
   * (not yet inwarded at warehouse) and omits articles/orders with no pending qty.
   */
  async getDispatchPendingWarehousePrintOrders(
    filters: FloorOrderFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<ProductionOrder>>> {
    const queryParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/floors/Dispatch/orders/pending-warehouse-print?${queryString}`
      : `/floors/Dispatch/orders/pending-warehouse-print`;

    try {
      const response = await this.request<any>(endpoint);

      const responseData = response.success ? response.data : response;

      const transformedData: PaginatedResponse<ProductionOrder> = {
        ...responseData,
        results: (responseData.results ?? []).map((order: any) => this.transformOrder(order)),
      };

      return {
        success: true,
        data: transformedData,
      };
    } catch (error) {
      console.error('Error in getDispatchPendingWarehousePrintOrders:', error);
      return {
        success: false,
        data: {
          results: [],
          page: 1,
          limit: 10,
          totalPages: 0,
          totalResults: 0,
        },
        error: {
          code: 'FETCH_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to fetch pending warehouse print orders',
        },
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

  /** PATCH /articles/:articleId/floor-received-data – append one receivedData entry for the floor. */
  async updateArticleFloorReceivedData(articleId: string, body: FloorReceivedDataBody): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/articles/${articleId}/floor-received-data`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async transferArticle(floor: string, transferData: TransferArticleRequest): Promise<ApiResponse<any>> {
    return this.request(`/floors/${floor}/transfer`, {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  }

  /** Transfer with breakdown (Branding/Final Checking): POST /floors/:floor/transfer/:orderId/:articleId */
  async transferFloorArticle(
    floor: string,
    orderId: string,
    articleId: string,
    body: {
      transferItems?: TransferItem[];
      quantity?: number;
      userId?: string;
      floorSupervisorId?: string;
      remarks?: string;
    }
  ): Promise<ApiResponse<any>> {
    return this.request(`/floors/${floor}/transfer/${orderId}/${articleId}`, {
      method: 'POST',
      body: JSON.stringify(body),
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
    floor?: string;
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

  // M2 Repair Transfer API
  async transferM2ForRepair(
    floor: string,
    orderId: string,
    articleId: string,
    repairData: {
      quantity?: number;
      remarks?: string;
      targetFloor?: string; // Optional: allows user to select destination floor (defaults to immediate previous floor)
    }
  ): Promise<ApiResponse<any>> {
    return this.request(`/floors/${floor}/repair/${orderId}/articles/${articleId}`, {
      method: 'POST',
      body: JSON.stringify(repairData),
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

  /** Article-wise production report. Use `search` for partial match on article number / knitting code; `articleNumber` for exact match. */
  async getArticleWiseReport(filters: {
    articleNumber?: string;
    search?: string;
    limit?: number;
    page?: number;
    logsPerArticle?: number;
  } = {}): Promise<ApiResponse<ArticleWiseReportResponse>> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/reports/article-wise?${queryString}` : '/reports/article-wise';
    return this.request<ArticleWiseReportResponse>(endpoint);
  }

  // Logging & Audit APIs
  async getOrderLogs(orderId: string, filters: {
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    floor?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/order/${orderId}?${queryString}` : `/logs/order/${orderId}`;
    
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  async getArticleLogs(articleId: string, filters: {
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    floor?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/article/${articleId}?${queryString}` : `/logs/article/${articleId}`;
    
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  async getFloorLogs(floor: string, filters: {
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/floor/${floor}?${queryString}` : `/logs/floor/${floor}`;
    
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  async getUserLogs(userId: string, filters: {
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/user/${userId}?${queryString}` : `/logs/user/${userId}`;
    
    return this.request<PaginatedResponse<any>>(endpoint);
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

  async getAuditTrail(orderId: string, filters: {
    includeSystemLogs?: boolean;
    includeUserActions?: boolean;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/audit-trail/${orderId}?${queryString}` : `/logs/audit-trail/${orderId}`;
    
    return this.request<PaginatedResponse<any>>(endpoint);
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
