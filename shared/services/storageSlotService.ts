import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";

export interface StorageSlot {
  _id: string;
  label: string;
  barcode: string;
  floorNumber: number;
  shelfNumber: number;
  zoneCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorageSlotsResponse {
  results: StorageSlot[];
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

  async getStorageSlots(zone?: string): Promise<StorageSlotsResponse> {
    const endpoint = zone ? `/slots?zone=${zone}` : "/slots";
    return this.makeRequest<StorageSlotsResponse>(endpoint, {
      method: "GET",
    });
  }

  async getSlotDetailsByBarcode(barcode: string): Promise<SlotDetailsResponse> {
    return this.makeRequest<SlotDetailsResponse>(`/slots/barcode/${barcode}`, {
      method: "GET",
    });
  }
}

const storageSlotService = new StorageSlotService();

export default storageSlotService;

