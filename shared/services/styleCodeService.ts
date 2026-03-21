import { API_BASE_URL } from '@/shared/data/utilities/api'
import Cookies from 'js-cookie'

export interface StyleCodeBomItem {
  rawMaterial: string
  quantity: number
}

export interface StyleCode {
  id: string
  styleCode: string
  eanCode: string
  mrp: number
  brand?: string
  pack?: string
  status: 'active' | 'inactive'
  bom?: StyleCodeBomItem[]
  createdAt?: string
  updatedAt?: string
}

export interface StyleCodeQueryParams {
  styleCode?: string
  eanCode?: string
  brand?: string
  pack?: string
  status?: 'active' | 'inactive'
  sortBy?: string
  limit?: number
  page?: number
}

export interface PaginatedStyleCodes {
  results: StyleCode[]
  page: number
  limit: number
  totalPages: number
  totalResults: number
}

export interface BulkImportPayload {
  styleCodes: Array<{
    styleCode: string
    eanCode: string
    mrp: number
    brand?: string
    pack?: string
    status?: 'active' | 'inactive'
  }>
  batchSize?: number
}

export interface BulkImportSummary {
  total: number
  created: number
  updated: number
  failed: number
  errors: any[]
  processingTime?: number
  /** Present on bulk-sync: documents removed because they were not in the successful import set */
  deleted?: number
}

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null
  try {
    const tokenFromJsCookie = Cookies.get('accessToken')
    if (tokenFromJsCookie) return tokenFromJsCookie
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'accessToken') return decodeURIComponent(value)
    }
    return null
  } catch (error) {
    console.error('Error reading access token from cookies:', error)
    return null
  }
}

class StyleCodeService {
  private baseUrl = `${API_BASE_URL}/style-codes`

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getAccessToken()
    if (!token) {
      throw new Error('No access token found. Please login again.')
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`HTTP ${res.status}: ${text}`)
    }

    if (res.status === 204) {
      // No content
      return {} as T
    }

    return (await res.json()) as T
  }

  async list(params?: StyleCodeQueryParams): Promise<PaginatedStyleCodes> {
    const searchParams = new URLSearchParams()
    if (params?.styleCode) searchParams.append('styleCode', params.styleCode)
    if (params?.eanCode) searchParams.append('eanCode', params.eanCode)
    if (params?.brand) searchParams.append('brand', params.brand)
    if (params?.pack) searchParams.append('pack', params.pack)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.page) searchParams.append('page', params.page.toString())

    const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
    return this.request<PaginatedStyleCodes>(`${query}`)
  }

  async get(styleCodeId: string): Promise<StyleCode> {
    if (!styleCodeId) throw new Error('styleCodeId is required')
    return this.request<StyleCode>(`/${styleCodeId}`)
  }

  async create(payload: Omit<StyleCode, 'id' | 'createdAt' | 'updatedAt'> & { bom?: StyleCodeBomItem[] }): Promise<StyleCode> {
    return this.request<StyleCode>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async update(styleCodeId: string, payload: Partial<StyleCode>): Promise<StyleCode> {
    if (!styleCodeId) throw new Error('styleCodeId is required')
    return this.request<StyleCode>(`/${styleCodeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  }

  async remove(styleCodeId: string): Promise<void> {
    if (!styleCodeId) throw new Error('styleCodeId is required')
    await this.request<void>(`/${styleCodeId}`, { method: 'DELETE' })
  }

  async bulkImport(payload: BulkImportPayload): Promise<BulkImportSummary> {
    if (!payload || !Array.isArray(payload.styleCodes) || payload.styleCodes.length === 0) {
      throw new Error('styleCodes array is required')
    }
    return this.request<BulkImportSummary>('/bulk-import', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  /** Upsert from file rows, then delete DB rows whose styleCode was not successfully synced (same body as bulkImport). */
  async bulkSync(payload: BulkImportPayload): Promise<BulkImportSummary> {
    if (!payload || !Array.isArray(payload.styleCodes) || payload.styleCodes.length === 0) {
      throw new Error('styleCodes array is required')
    }
    return this.request<BulkImportSummary>('/bulk-sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async bulkImportBom(payload: {
    items: Array<{ styleCodeId: string; bom: StyleCodeBomItem[] }>
    batchSize?: number
  }): Promise<BulkImportSummary> {
    if (!payload?.items?.length) throw new Error('items array is required')
    return this.request<BulkImportSummary>('/bulk-import-bom', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}

export const styleCodeService = new StyleCodeService()
