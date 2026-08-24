/**
 * Recharts Component Library
 * Centralized exports for all chart components
 */

// Wrapper components
export { default as RechartsWrapper, withSSRSafe } from './RechartsWrapper';

// Chart components
export { default as SparklineChart } from './SparklineChart';
export { default as AreaChartCard } from './AreaChartCard';
export { default as BarChartCard } from './BarChartCard';
export { default as DonutChartCard } from './DonutChartCard';
export { default as ComposedChartCard } from './ComposedChartCard';
export { default as RadialBarChartCard } from './RadialBarChartCard';
export { default as TreemapChartCard } from './TreemapChartCard';

// Configuration and utilities
export {
  CHART_COLORS,
  CHART_GRADIENTS,
  ANIMATION_CONFIG,
  TOOLTIP_STYLE,
  AXIS_STYLE,
  GRID_STYLE,
  LEGEND_STYLE,
  RESPONSIVE_DEFAULTS,
  formatters,
  getBacklogColor,
  getEfficiencyColor,
  sanitizeChartData
} from './chartConfig';

// Re-export commonly used Recharts components for convenience
export {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  RadialBarChart,
  RadialBar,
  Treemap
} from 'recharts';
