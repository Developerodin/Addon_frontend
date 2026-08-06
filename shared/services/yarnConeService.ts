import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";
import { YarnBox } from "./yarnBoxService";

/**
 * Lifecycle status of a yarn cone.
 *  - not_issued: cone is in the pool / short-term storage and available.
 *  - issued: cone has been sent out for production and is currently with the operator.
 *  - used: cone was returned empty (no yarn left). It cannot be reissued or re-edited.
 */
export type YarnConeIssueStatus = "issued" | "not_issued" | "used";

export interface YarnCone {
  _id: string;
  poNumber: string;
  boxId: string;
  barcode: string;
  yarnName: string;
  shadeCode: string;
  coneWeight: number;
  tearWeight: number;
  issueStatus: YarnConeIssueStatus;
  issueWeight: number;
  issueDate?: string;
  issuedBy?: { username?: string; user?: string };
  orderId?: string;
  articleId?: string;
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

export interface ShortTermConeSummary {
  _id: string;
  boxId: string;
  barcode: string;
  coneStorageId?: string;
  coneWeight?: number;
  tearWeight?: number;
  issueStatus?: YarnConeIssueStatus;
  returnStatus?: string;
  createdAt?: string;
  updatedAt?: string;
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

  /**
   * Lists all yarn cones for a box (any issue/storage state). Uses GET /yarn-cones?box_id=...
   */
  async getYarnConesByBoxId(boxId: string): Promise<YarnCone[]> {
    if (!boxId) {
      throw new Error("Box ID is required");
    }
    const data = await this.makeRequest<YarnCone[] | { results?: YarnCone[] }>(
      `/?box_id=${encodeURIComponent(boxId)}`
    );
    return Array.isArray(data) ? data : (data.results ?? []);
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

  /** GET /short-term/by-box/:boxId - Cones currently in short-term storage for a box */
  async getShortTermConesByBoxId(boxId: string): Promise<ShortTermConeSummary[]> {
    if (!boxId) {
      throw new Error("Box ID is required");
    }
    const data = await this.makeRequest<ShortTermConeSummary[]>(
      `/short-term/by-box/${encodeURIComponent(boxId)}`
    );
    return Array.isArray(data) ? data : [];
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

  /**
   * Lists all yarn cones with issueStatus === "issued" (out for production).
   * Uses GET /yarn-cones?issue_status=issued
   */
  async getIssuedCones(): Promise<YarnCone[]> {
    const data = await this.makeRequest<YarnCone[] | { results?: YarnCone[] }>(
      "/?issue_status=issued"
    );
    return Array.isArray(data) ? data : (data.results ?? []);
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

  /**
   * Relocate a stored cone to another ST rack (POST /relocate).
   * Logs YarnTransaction internal_transfer with from/to locations.
   */
  async relocateCone(payload: {
    coneId?: string;
    coneBarcode?: string;
    toStorageLocation: string;
    transferDate?: string;
  }): Promise<{
    message: string;
    fromStorageLocation: string;
    toStorageLocation: string;
    transactionId: string;
  }> {
    if (!payload?.toStorageLocation) {
      throw new Error("toStorageLocation is required");
    }
    if (!payload.coneId && !payload.coneBarcode) {
      throw new Error("coneId or coneBarcode is required");
    }
    return this.makeRequest("/relocate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

const yarnConeService = new YarnConeService();

export default yarnConeService;


