/**
 * Production Dashboard API Service
 * Fetches dashboard data from backend with abort controller support
 */

import { API_BASE_URL } from '@/shared/data/utilities/api';
import type {
  ApiResponse,
  DashboardFilters,
  DashboardSummary,
  FloorHeatstripData,
  QualityData,
  MachineUtilizationData,
  AlertsData,
  TrendsData,
  AgeingData,
  YarnReadinessData,
  ArticlePerformanceData,
  ExceptionsData,
  ExceptionType,
  ReconciliationData
} from '../types';

const DASHBOARD_BASE = `${API_BASE_URL}/production/dashboard-v2`;

/**
 * Build query string from filters
 */
const buildQueryString = (filters: DashboardFilters, extra: Record<string, any> = {}): string => {
  const params = new URLSearchParams();
  
  // Date range
  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);
  if (filters.compare) params.append('compare', filters.compare);
  
  // Array filters
  ['order', 'article', 'floor', 'machine', 'linkingType', 'brandingType', 'priority', 'shift'].forEach(key => {
    const value = filters[key as keyof DashboardFilters];
    if (Array.isArray(value) && value.length > 0) {
      value.forEach(v => params.append(key, v));
    }
  });
  
  // Extra params
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Generic fetch wrapper with error handling
 */
async function fetchDashboard<T>(
  endpoint: string,
  filters: DashboardFilters,
  extra: Record<string, any> = {},
  signal?: AbortSignal
): Promise<ApiResponse<T>> {
  const url = `${DASHBOARD_BASE}${endpoint}${buildQueryString(filters, extra)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
    },
    signal
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get dashboard summary (Zones A + B)
 */
export const getSummary = (
  filters: DashboardFilters,
  signal?: AbortSignal
): Promise<ApiResponse<DashboardSummary>> => {
  return fetchDashboard<DashboardSummary>('/summary', filters, {}, signal);
};

/**
 * Get floor heatstrip data (Zone C)
 */
export const getFloors = (
  filters: DashboardFilters,
  signal?: AbortSignal
): Promise<ApiResponse<FloorHeatstripData>> => {
  return fetchDashboard<FloorHeatstripData>('/floors', filters, {}, signal);
};

/**
 * Get throughput trends (Zone D)
 */
export const getTrends = (
  filters: DashboardFilters,
  granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
  signal?: AbortSignal
): Promise<ApiResponse<TrendsData>> => {
  return fetchDashboard<TrendsData>('/trends', filters, { granularity }, signal);
};

/**
 * Get quality metrics (Zone E)
 */
export const getQuality = (
  filters: DashboardFilters,
  qcFloor?: string,
  signal?: AbortSignal
): Promise<ApiResponse<QualityData>> => {
  return fetchDashboard<QualityData>('/quality', filters, { qcFloor }, signal);
};

/**
 * Get machine utilization (Zone F)
 */
export const getMachines = (
  filters: DashboardFilters,
  options: { status?: string; limit?: number } = {},
  signal?: AbortSignal
): Promise<ApiResponse<MachineUtilizationData>> => {
  return fetchDashboard<MachineUtilizationData>('/machines', filters, options, signal);
};

/**
 * Get people/shift metrics (Zone G)
 */
export const getPeople = (
  filters: DashboardFilters,
  groupBy: 'supervisor' | 'shift' | 'user' = 'supervisor',
  signal?: AbortSignal
): Promise<ApiResponse<any>> => {
  return fetchDashboard<any>('/people', filters, { groupBy }, signal);
};

/**
 * Get order ageing (Zone H)
 */
export const getAgeing = (
  filters: DashboardFilters,
  type: 'orders' | 'articles' = 'orders',
  signal?: AbortSignal
): Promise<ApiResponse<AgeingData>> => {
  return fetchDashboard<AgeingData>('/ageing', filters, { type }, signal);
};

/**
 * Get yarn readiness (Zone I)
 */
export const getYarnReadiness = (
  filters: DashboardFilters,
  signal?: AbortSignal
): Promise<ApiResponse<YarnReadinessData>> => {
  return fetchDashboard<YarnReadinessData>('/yarn-readiness', filters, {}, signal);
};

/**
 * Get article performance (Zone J)
 */
export const getArticles = (
  filters: DashboardFilters,
  options: { sortBy?: 'volume' | 'defects' | 'cycleTime'; limit?: number } = {},
  signal?: AbortSignal
): Promise<ApiResponse<ArticlePerformanceData>> => {
  return fetchDashboard<ArticlePerformanceData>('/articles', filters, options, signal);
};

/**
 * Get alerts (Zone 0)
 */
export const getAlerts = (
  filters: DashboardFilters,
  options: { severity?: string[]; category?: string[] } = {},
  signal?: AbortSignal
): Promise<ApiResponse<AlertsData>> => {
  return fetchDashboard<AlertsData>('/alerts', filters, options, signal);
};

/**
 * Get exceptions worklist (Zone K)
 */
export const getExceptions = (
  filters: DashboardFilters,
  type: ExceptionType,
  page: number = 1,
  limit: number = 20,
  signal?: AbortSignal
): Promise<ApiResponse<ExceptionsData>> => {
  return fetchDashboard<ExceptionsData>('/exceptions', filters, { type, page, limit }, signal);
};

/**
 * Get reconciliation (Zone L)
 */
export const getReconciliation = (
  filters: DashboardFilters,
  signal?: AbortSignal
): Promise<ApiResponse<ReconciliationData>> => {
  return fetchDashboard<ReconciliationData>('/reconciliation', filters, {}, signal);
};

export default {
  getSummary,
  getFloors,
  getTrends,
  getQuality,
  getMachines,
  getPeople,
  getAgeing,
  getYarnReadiness,
  getArticles,
  getAlerts,
  getExceptions,
  getReconciliation
};
