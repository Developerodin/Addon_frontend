import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";

export interface StorageSlot {
  _id: string;
  label: string;
  barcode: string;
  floorNumber: number;
  shelfNumber: number;
  sectionCode?: string;
  zoneCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorageSlotsResponse {
  results: StorageSlot[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
}

export interface BoxInSlot {
  _id: string;
  tearweight: number;
  storedStatus: boolean;
  boxId: string;
  poNumber: string;
  barcode: string;
  yarnName: string;
  orderDate: string;
  orderQty: number;
  receivedDate: string;
  createdAt: string;
  updatedAt: string;
  boxWeight: number;
  lotNumber: string;
  numberOfCones: number;
  shadeCode: string;
  qcData?: {
    date: string;
    remarks: string;
    status: string;
    user: string;
    username: string;
  };
  coneData?: {
    conesIssued: boolean;
    numberOfCones: number;
    coneIssueDate: string;
  };
  storageLocation: string;
}

export interface ConeInSlot {
  _id: string;
  issueStatus: string;
  returnStatus: string;
  poNumber: string;
  boxId: string;
  coneWeight: number;
  tearWeight: number;
  yarnName: string;
  shadeCode: string;
  issueWeight: number;
  returnWeight: number;
  coneStorageId: string;
  barcode: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlotDetailsResponse {
  storageSlot: StorageSlot;
  zoneType: string;
  type: "boxes" | "cones";
  count: number;
  data: BoxInSlot[] | ConeInSlot[];
}

export interface TransferHistoryItem {
  transactionType: "internal_transfer" | "yarn_stocked" | string;
  transactionDate: string;
  yarnName: string;
  weight: number;
  boxIds: string[];
  fromLocation: string | null;
  toLocation: string | null;
}

export interface StorageHistoryResponse {
  storageLocation: string;
  currentInventory: {
    totalBoxes: number;
    totalWeight: number;
    yarns: Array<{
      yarnName: string;
      boxes: Array<{
        boxId: string;
        boxWeight: number;
        netWeight: number;
        numberOfCones: number;
        receivedDate: string;
      }>;
      totalWeight: number;
      totalNetWeight: number;
      boxCount: number;
    }>;
  };
  transferHistory: TransferHistoryItem[];
}

const getAccessToken = (): string | null => {
  if (typeof document === "undefined") return null;

  try {
    const tokenFromCookie = Cookies.get("accessToken");
    if (tokenFromCookie) {
      return tokenFromCookie;
    }

    const tokenFromStorage = localStorage.getItem("token");
    if (tokenFromStorage) {
      return tokenFromStorage;
    }

    return null;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
};

class StorageSlotService {
  private baseURL = `${API_BASE_URL}/storage`;

  private buildHeaders(additional?: HeadersInit): HeadersInit {
    const token = getAccessToken();
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...additional,
    };
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = getAccessToken();

    if (!token) {
      throw new Error("No access token found. Please login again.");
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
          throw new Error("Authentication failed. Please login again.");
        }

        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      
      // Handle both wrapped response and direct array
      if (data.results) {
        return data as T;
      } else if (Array.isArray(data)) {
        return { results: data } as T;
      }

      return data as T;
    } catch (error) {
      console.error("Storage Slot API Error:", error);
      throw error;
    }
  }

  /**
   * Fetch storage slots with optional zone and pagination.
   * @param zone - e.g. "LT" for long-term
   * @param page - 1-based page number
   * @param limit - slots per page (e.g. 200)
   */
  async getStorageSlots(
    zone?: string,
    page: number = 1,
    limit: number = 200
  ): Promise<StorageSlotsResponse> {
    const params = new URLSearchParams();
    if (zone) params.set("zone", zone);
    params.set("page", String(page));
    params.set("limit", String(limit));
    const endpoint = `/slots?${params.toString()}`;
    const data = await this.makeRequest<StorageSlotsResponse>(endpoint, {
      method: "GET",
    });
    const results = data.results ?? [];
    return {
      results,
      page: data.page ?? page,
      limit: data.limit ?? limit,
      totalPages: data.totalPages ?? Math.max(1, Math.ceil((data.totalResults ?? results.length) / (data.limit ?? limit))),
      totalResults: data.totalResults ?? results.length,
    };
  }

  async getSlotDetailsByBarcode(barcode: string): Promise<SlotDetailsResponse> {
    return this.makeRequest<SlotDetailsResponse>(`/slots/barcode/${barcode}`, {
      method: "GET",
    });
  }

  async getSlotHistory(storageLocation: string): Promise<StorageHistoryResponse> {
    return this.makeRequest<StorageHistoryResponse>(`/slots/${storageLocation}/history`, {
      method: "GET",
    });
  }
}

const storageSlotService = new StorageSlotService();

export default storageSlotService;

