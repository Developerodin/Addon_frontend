import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";
import { YarnBox } from "./yarnBoxService";

export interface YarnCone {
  _id: string;
  poNumber: string;
  boxId: string;
  barcode: string;
  yarnName: string;
  shadeCode: string;
  coneWeight: number;
  tearWeight: number;
  issueStatus: string;
  issueWeight: number;
  returnStatus: string;
  returnWeight: number;
  coneStorageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateConesResponse {
  message: string;
  box: YarnBox & {
    coneData?: {
      conesIssued: boolean;
      coneIssueDate?: string;
      coneIssueBy?: {
        username: string;
        user: string;
      };
      numberOfCones: number;
    };
  };
  cones: YarnCone[];
}

export interface UpdateYarnConePayload {
  coneWeight?: number;
  tearWeight?: number;
  coneStorageId?: string;
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

class YarnConeService {
  private baseURL = `${API_BASE_URL}/yarn-management/yarn-cones`;

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

      return (await response.json()) as T;
    } catch (error) {
      console.error("Yarn Cone API Error:", error);
      throw error;
    }
  }

  async generateConesByBox(boxId: string, overrides: Record<string, any> = {}): Promise<GenerateConesResponse> {
    if (!boxId) {
      throw new Error("Box ID is required to generate cones");
    }

    const hasOverrides = Object.keys(overrides).length > 0;

    return this.makeRequest<GenerateConesResponse>(`/generate-by-box/${boxId}`, {
      method: "POST",
      body: hasOverrides ? JSON.stringify(overrides) : JSON.stringify({}),
    });
  }

  async updateYarnCone(coneId: string, payload: UpdateYarnConePayload): Promise<YarnCone> {
    if (!coneId) {
      throw new Error("Cone ID is required to update cone data");
    }

    if (!payload || Object.keys(payload).length === 0) {
      throw new Error("Update payload is required");
    }

    return this.makeRequest<YarnCone>(`/${coneId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  /** GET /by-storage-location/:storageLocation - Cones at given coneStorageId (no limit) */
  async getConesByStorageLocation(coneStorageId: string): Promise<YarnCone[]> {
    if (!coneStorageId) throw new Error("Storage location (coneStorageId) is required");
    const data = await this.makeRequest<YarnCone[] | { results?: YarnCone[] }>(
      `/by-storage-location/${encodeURIComponent(coneStorageId)}`
    );
    return Array.isArray(data) ? data : (data.results ?? []);
  }

  /** GET /without-storage-location - Cones without a storage location */
  async getConesWithoutStorageLocation(): Promise<YarnCone[]> {
    const data = await this.makeRequest<YarnCone[] | { results?: YarnCone[] }>(
      "/without-storage-location"
    );
    return Array.isArray(data) ? data : (data.results ?? []);
  }

  /** PATCH /set-storage-location - Set storage location for cones */
  async setStorageLocationForCones(
    coneIds: string[],
    coneStorageId: string
  ): Promise<{ message?: string; updatedCount?: number }> {
    return this.makeRequest("/set-storage-location", {
      method: "PATCH",
      body: JSON.stringify({ coneIds, coneStorageId }),
    });
  }
}

const yarnConeService = new YarnConeService();

export default yarnConeService;


