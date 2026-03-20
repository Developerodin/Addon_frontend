import { API_BASE_URL } from '@/shared/data/utilities/api'
import Cookies from 'js-cookie'

export interface StyleCodePairsBomItem {
  rawMaterial: string
  quantity: number
}

export interface StyleCodePair {
  id?: string
  _id?: string
  pairStyleCode: string
  eanCode: string
  mrp: number
  pack?: number
  status: 'active' | 'inactive'
  styleCodes?: Array<{ id: string; styleCode?: string; eanCode?: string } | string>
  bom?: Array<{
    rawMaterial: string | { id?: string; _id?: string; name?: string }
    quantity: number
  }>
  createdAt?: string
  updatedAt?: string
}

export interface StyleCodePairCreatePayload {
  pairStyleCode: string
  eanCode: string
  mrp: number
  pack?: number
  status?: 'active' | 'inactive'
  styleCodes: string[]
  bom?: StyleCodePairsBomItem[]
}

export interface StyleCodePairQueryParams {
  pairStyleCode?: string
  eanCode?: string
  status?: 'active' | 'inactive'
  search?: string
  sortBy?: string
  limit?: number
  page?: number
}

export interface PaginatedStyleCodePairs {
  results: StyleCodePair[]
  page: number
  limit: number
  totalPages: number
  totalResults: number
}

export interface BulkImportSummary {
  message: string
  total: number
  created: number
  updated: number
  failed: number
  errors: any[]
  processingTime?: number
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

class StyleCodePairsService {
  private baseUrl = `${API_BASE_URL}/style-code-pairs`

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
      return {} as T
    }

    return (await res.json()) as T
  }

  async list(params?: StyleCodePairQueryParams): Promise<PaginatedStyleCodePairs> {
    const searchParams = new URLSearchParams()
    if (params?.pairStyleCode) searchParams.append('pairStyleCode', params.pairStyleCode)
    if (params?.eanCode) searchParams.append('eanCode', params.eanCode)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.page) searchParams.append('page', params.page.toString())

    const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
    return this.request<PaginatedStyleCodePairs>(`${query}`)
  }

  async get(id: string): Promise<StyleCodePair> {
    if (!id) throw new Error('styleCodePairsId is required')
    return this.request<StyleCodePair>(`/${id}`)
  }

  async create(payload: StyleCodePairCreatePayload): Promise<StyleCodePair> {
    return this.request<StyleCodePair>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async update(id: string, payload: Partial<StyleCodePairCreatePayload>): Promise<StyleCodePair> {
    if (!id) throw new Error('styleCodePairsId is required')
    return this.request<StyleCodePair>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  }

  async remove(id: string): Promise<void> {
    if (!id) throw new Error('styleCodePairsId is required')
    await this.request<void>(`/${id}`, { method: 'DELETE' })
  }

  async bulkImport(payload: {
    items: StyleCodePairCreatePayload[]
    batchSize?: number
  }): Promise<BulkImportSummary> {
    return this.request<BulkImportSummary>('/bulk-import', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async bulkImportBom(payload: {
    items: Array<{ styleCodePairsId: string; bom: StyleCodePairsBomItem[] }>
    batchSize?: number
  }): Promise<BulkImportSummary> {
    return this.request<BulkImportSummary>('/bulk-import-bom', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }
}

export const styleCodePairsService = new StyleCodePairsService()
