import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

/** Production floors (workingFloor) */
export const PRODUCTION_FLOORS = [
  'Knitting',
  'Linking',
  'Checking',
  'Washing',
  'Boarding',
  'Silicon',
  'Secondary Checking',
  'Branding',
  'Re-Boarding',
  'Final Checking',
  'Warehouse',
  'Dispatch',
] as const;

/** Team roles */
export const TEAM_ROLES = ['Supervisor', 'Team Member'] as const;

/** Team member status */
export const TEAM_MEMBER_STATUSES = ['Active', 'Inactive'] as const;

export type ProductionFloor = (typeof PRODUCTION_FLOORS)[number];
export type TeamRole = (typeof TEAM_ROLES)[number];
export type TeamMemberStatus = (typeof TEAM_MEMBER_STATUSES)[number];

/** Populated ref: API may return object with _id, teamMemberName, etc. */
export interface TeamMemberRef {
  _id: string;
  teamMemberName?: string;
  contactNumber?: string;
  role?: string;
  workingFloor?: string;
  status?: string;
}

export interface TeamMaster {
  _id: string;
  teamMemberName: string;
  contactNumber?: string;
  workingFloor: ProductionFloor;
  myTeam?: string[] | TeamMemberRef[];
  role: TeamRole;
  status: TeamMemberStatus;
  barcode?: string;
  /** Optional: active articles assigned to this member (API may return after add). */
  articleData?: { activeArticle?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMastersListParams {
  teamMemberName?: string;
  workingFloor?: ProductionFloor;
  role?: TeamRole;
  status?: TeamMemberStatus;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTeamMasters {
  results: TeamMaster[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface CreateTeamMemberBody {
  teamMemberName: string;
  contactNumber?: string | null;
  workingFloor: ProductionFloor;
  myTeam?: string[];
  role?: TeamRole;
  status?: TeamMemberStatus;
}

export interface UpdateTeamMemberBody {
  teamMemberName?: string;
  contactNumber?: string | null;
  workingFloor?: ProductionFloor;
  myTeam?: string[];
  role?: TeamRole;
  status?: TeamMemberStatus;
}

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    const t = Cookies.get('accessToken');
    if (t) return t;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'accessToken') return decodeURIComponent(value);
    }
    return null;
  } catch {
    return null;
  }
};

/** Resolve myTeam to array of ids */
export function getMyTeamIds(myTeam: TeamMaster['myTeam']): string[] {
  if (!Array.isArray(myTeam)) return [];
  return myTeam.map((item) => (typeof item === 'string' ? item : (item as TeamMemberRef)._id)).filter(Boolean);
}

/** Resolve team member display name */
export function getTeamMemberName(item: TeamMemberRef | string): string {
  if (typeof item === 'string') return item;
  return (item as TeamMemberRef).teamMemberName ?? (item as TeamMemberRef)._id ?? '';
}

class TeamMasterService {
  private baseUrl = `${API_BASE_URL}/team-masters`;

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getAccessToken();
    if (!token) throw new Error('No access token found. Please login again.');
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  }

  async list(params?: TeamMastersListParams): Promise<PaginatedTeamMasters> {
    const sp = new URLSearchParams();
    if (params?.teamMemberName) sp.append('teamMemberName', params.teamMemberName);
    if (params?.workingFloor) sp.append('workingFloor', params.workingFloor);
    if (params?.role) sp.append('role', params.role);
    if (params?.status) sp.append('status', params.status);
    if (params?.search) sp.append('search', params.search);
    if (params?.sortBy) sp.append('sortBy', params.sortBy);
    if (params?.page != null) sp.append('page', String(params.page));
    if (params?.limit != null) sp.append('limit', String(params.limit));
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return this.request<PaginatedTeamMasters>(q);
  }

  async getById(teamMemberId: string): Promise<TeamMaster> {
    if (!teamMemberId) throw new Error('teamMemberId is required');
    return this.request<TeamMaster>(`/${teamMemberId}`);
  }

  async getByBarcode(barcode: string): Promise<TeamMaster> {
    if (!barcode) throw new Error('barcode is required');
    return this.request<TeamMaster>(`/barcode/${encodeURIComponent(barcode)}`);
  }

  async create(body: CreateTeamMemberBody): Promise<TeamMaster> {
    return this.request<TeamMaster>('', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async update(teamMemberId: string, body: UpdateTeamMemberBody): Promise<TeamMaster> {
    if (!teamMemberId) throw new Error('teamMemberId is required');
    return this.request<TeamMaster>(`/${teamMemberId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async remove(teamMemberId: string): Promise<void> {
    if (!teamMemberId) throw new Error('teamMemberId is required');
    await this.request<void>(`/${teamMemberId}`, { method: 'DELETE' });
  }

  /** Add active article to team member's articleData. POST /team-masters/:teamMemberId/active-article */
  async addActiveArticle(teamMemberId: string, articleId: string): Promise<TeamMaster> {
    if (!teamMemberId) throw new Error('teamMemberId is required');
    if (!articleId) throw new Error('articleId is required');
    return this.request<TeamMaster>(`/${teamMemberId}/active-article`, {
      method: 'POST',
      body: JSON.stringify({ articleId }),
    });
  }

  /** Remove active article and log. DELETE /team-masters/:teamMemberId/active-article/:articleId */
  async removeActiveArticle(teamMemberId: string, articleId: string): Promise<TeamMaster> {
    if (!teamMemberId) throw new Error('teamMemberId is required');
    if (!articleId) throw new Error('articleId is required');
    return this.request<TeamMaster>(`/${teamMemberId}/active-article/${encodeURIComponent(articleId)}`, {
      method: 'DELETE',
    });
  }
}

export const teamMasterService = new TeamMasterService();
