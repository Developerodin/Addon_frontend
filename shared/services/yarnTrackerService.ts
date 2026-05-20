import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";
import { YarnBox } from "./yarnBoxService";

export interface TrackerTimelineEvent {
  id: string;
  kind: string;
  at: string;
  title: string;
  transactionType?: string;
  details?: Record<string, unknown>;
}

export interface TrackerConeSummary {
  _id: string;
  barcode: string;
  coneWeight?: number;
  tearWeight?: number;
  netWeight?: number;
  issueStatus?: string;
  returnStatus?: string;
  coneStorageId?: string;
  issueDate?: string;
  issueWeight?: number;
  returnDate?: string;
  returnWeight?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BoxTrackerResponse {
  entityType: "box";
  box: YarnBox & {
    currentNetWeight?: number;
    initialWeight?: number;
    conesInBox?: number;
    conesIssuedCount?: number;
    conesInStorageCount?: number;
  };
  cones: TrackerConeSummary[];
  timeline: TrackerTimelineEvent[];
  transactionCount: number;
}

export interface ConeTrackerResponse {
  entityType: "cone";
  cone: Record<string, unknown> & {
    netWeight?: number;
    parentBoxId?: string;
    parentBoxBarcode?: string;
    parentPoNumber?: string;
  };
  parentBox: {
    boxId?: string;
    barcode?: string;
    poNumber?: string;
    yarnName?: string;
    storageLocation?: string;
    boxWeight?: number;
    initialBoxWeight?: number;
  } | null;
  timeline: TrackerTimelineEvent[];
  transactionCount: number;
}

const getAccessToken = (): string | null => {
  if (typeof document === "undefined") return null;
  try {
    return Cookies.get("accessToken") || localStorage.getItem("token");
  } catch {
    return null;
  }
};

class YarnTrackerService {
  private boxBase = `${API_BASE_URL}/yarn-management/yarn-boxes`;
  private coneBase = `${API_BASE_URL}/yarn-management/yarn-cones`;

  private async get<T>(url: string): Promise<T> {
    const token = getAccessToken();
    if (!token) throw new Error("No access token found. Please login again.");
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  /**
   * Full box tracker: details, cones in box, transaction timeline.
   */
  async getBoxTracker(
    barcode: string,
    options?: { includeInactive?: boolean }
  ): Promise<BoxTrackerResponse> {
    const qs = options?.includeInactive ? "?include_inactive=true" : "";
    return this.get<BoxTrackerResponse>(
      `${this.boxBase}/barcode/${encodeURIComponent(barcode)}/tracker${qs}`
    );
  }

  /**
   * Full cone tracker: details, parent box, issue/return timeline.
   */
  async getConeTracker(
    barcode: string,
    options?: { includeInactive?: boolean }
  ): Promise<ConeTrackerResponse> {
    const qs = options?.includeInactive ? "?include_inactive=true" : "";
    return this.get<ConeTrackerResponse>(
      `${this.coneBase}/barcode/${encodeURIComponent(barcode)}/tracker${qs}`
    );
  }
}

const yarnTrackerService = new YarnTrackerService();
export default yarnTrackerService;
