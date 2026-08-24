/**
 * Production Dashboard Types
 * API response types and component props
 */

// API Response Envelope
export interface ApiResponse<T> {
  meta: {
    generatedAt: string;
    cached: boolean;
    cacheAgeMs: number;
    durationMs: number;
    asOf?: string;
    range?: { from: string; to: string };
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  data: T;
  warnings: string[];
}

// Dashboard filters
export interface DashboardFilters {
  from?: string;
  to?: string;
  compare?: 'prev' | 'yoy' | 'none';
  order?: string[];
  article?: string[];
  floor?: string[];
  machine?: string[];
  linkingType?: ('Auto Linking' | 'Hand Linking' | 'Rosso Linking')[];
  brandingType?: ('Heat Transfer' | 'Embroidery')[];
  priority?: ('Urgent' | 'High' | 'Medium' | 'Low')[];
  shift?: string[];
}

// KPI Types
export interface KpiValue {
  value: number;
  kind: 'stock' | 'flow';
  unit?: string;
  delta?: number;
  deltaDirection?: 'up' | 'down' | 'neutral';
  sparkline?: number[];
}

// Zone A - KPIs
export interface SummaryKpis {
  wipPairs: KpiValue;
  outputToday: KpiValue & { stnCount: number };
  firstPassYield: KpiValue;
  machineUtilization: KpiValue & { machinesWithWork: number; activeMachines: number };
  openOrders: KpiValue;
  readyToDispatch: KpiValue;
}

// Zone B - Order Funnel
export interface OrderFunnel {
  pending: number;
  inProgress: number;
  completed: number;
  onHold: number;
  shortClose: number;
  cancelled: number;
}

// Summary endpoint response
export interface DashboardSummary {
  kpis: SummaryKpis;
  orderFunnel: OrderFunnel;
}

// Zone C - Floor Heatstrip
export interface FloorData {
  floor: string;
  floorKey: string;
  inTransit: number;
  received: number;
  wip: number;
  completed: number;
  transferred: number;
  articleCount: number;
  backlogDays: number;
  avgDailyThroughput: number;
  // QC floors only
  m1?: number;
  m2?: number;
  m3?: number;
  m4?: number;
}

export interface FloorHeatstripData {
  floors: FloorData[];
  bottleneck: {
    floor: string;
    floorKey: string;
    backlogDays: number;
    wipPairs: number;
  } | null;
}

// Zone E - Quality
export interface QcFloorStats {
  received: number;
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  fpy: number;
}

export interface QualityData {
  targetFloor: string;
  firstPassYield: number;
  rolledThroughputYield: number;
  qcFloorStats: Record<string, QcFloorStats>;
  mMix: {
    m1: number;
    m2: number;
    m3: number;
    m4: number;
    total: number;
  };
  m2Recovery: {
    entryCount: number;
    entryQuantity: number;
    mergedQuantity: number;
    recoveryRate: number;
    toM3: number;
    toM4: number;
  };
  openM2: {
    count: number;
    pairs: number;
  };
}

// Zone F - Machines
export interface MachineData {
  id: string;
  machineCode: string;
  machineNumber: string;
  status: 'Active' | 'Idle' | 'Under Maintenance';
  capacity: number;
  queueRows: number;
  pendingPairs: number;
  daysOfQueue: number;
  activeNeedle?: string;
  maintenanceDue?: string;
  isOverloaded: boolean;
  isStarved: boolean;
}

export interface MachineUtilizationData {
  machines: MachineData[];
  totalMachines: number;
  statusBreakdown: {
    active: number;
    idle: number;
    maintenance: number;
  };
  utilization: number;
  starvedCount: number;
  overloadedCount: number;
  maintenanceDueCount: number;
}

// Zone 0 - Alerts
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertCategory = 'throughput' | 'quality' | 'machine' | 'material' | 'delivery' | 'integrity';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  value: number;
  valueLabel: string;
  href?: string;
}

export interface AlertsData {
  alerts: Alert[];
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
}

// Zone D - Trends
export interface TrendDataPoint {
  date: string;
  output: number;
  stnCount: number;
}

export interface TrendsData {
  output: TrendDataPoint[];
  granularity: 'daily' | 'weekly' | 'monthly';
}

// Zone H - Ageing
export interface AgeingBucket {
  _id: string | number;
  count: number;
  orders?: { orderNumber: string; ageDays: number }[];
}

export interface AgeingData {
  buckets: AgeingBucket[];
  type: 'orders' | 'articles';
}

// Zone G - People Metrics
export interface PeopleMetric {
  _id: string;
  totalOutput: number;
  actionCount: number;
}

export interface PeopleData {
  metrics: PeopleMetric[];
  groupBy: 'supervisor' | 'shift' | 'user';
}

// Zone I - Yarn Readiness
export interface YarnReadinessData {
  blockedRows: number;
}

// Zone J - Article Performance
export interface ArticlePerformance {
  _id: string;
  totalDispatched: number;
  totalReceived: number;
  totalM1: number;
  defectRate: number;
}

export interface ArticlePerformanceData {
  articles: ArticlePerformance[];
  sortBy: 'volume' | 'defects' | 'cycleTime';
}

// Zone K - Exceptions
export type ExceptionType =
  | 'stalled-orders'
  | 'bottleneck'
  | 'idle-machines'
  | 'overloaded-machines'
  | 'stuck-containers'
  | 'open-m2-aged'
  | 'repair-rejected'
  | 'yarn-blocked'
  | 'yarn-return-pending'
  | 'maintenance-due'
  | 'data-integrity';

export interface ExceptionItem {
  id: string;
  [key: string]: any;
}

export interface ExceptionsData {
  items: ExceptionItem[];
  type: ExceptionType;
}

// Zone L - Reconciliation
export interface ReconciliationData {
  planned: number;
  dispatched: number;
  wip: number;
  m3Out: number;
  m4Out: number;
  unaccounted: number;
  unaccountedPct: number;
  isHealthy: boolean;
}

// Dashboard section states
export type SectionStatus = 'idle' | 'loading' | 'success' | 'error';

export interface SectionState<T> {
  status: SectionStatus;
  data: T | null;
  error: string | null;
  lastFetched: number | null;
}

// Component props
export interface DashboardSectionProps {
  className?: string;
}

export interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: string;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  sparkline?: number[];
  onClick?: () => void;
  loading?: boolean;
}
