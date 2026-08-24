"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardFilters, useDashboardSection, useTvMode } from './hooks';
import * as dashboardService from './services/productionDashboardService';
import type { 
  DashboardSummary, 
  FloorHeatstripData, 
  QualityData, 
  MachineUtilizationData,
  AlertsData,
  TrendsData,
  PeopleData,
  AgeingData,
  YarnReadinessData,
  ArticlePerformanceData,
  ExceptionsData,
  ExceptionType,
  ReconciliationData
} from './types';

// Components
import {
  AlertRibbon,
  KpiStrip,
  OrderFunnel,
  FloorHeatstrip,
  ThroughputPanel,
  QualityPanel,
  MachinePanel,
  PeopleShiftPanel,
  OrderAgeingPanel,
  YarnReadinessPanel,
  ArticlePerformancePanel,
  ExceptionWorklist,
  ReconciliationPanel,
  DashboardHeader,
  InfoTooltip,
  SECTION_INFO,
  KpiSkeleton,
  ChartSkeleton,
  TableSkeleton,
  CardSkeleton
} from './components';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

/**
 * Production Command Dashboard Client Component
 * Main orchestrator for all dashboard zones (0 through L)
 */
const ProductionCommandClient: React.FC = () => {
  const { filters, setFilters, clearFilters, filterCount } = useDashboardFilters();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // TV Mode
  const tvMode = useTvMode({ totalZones: 12, carouselInterval: 30000 });

  // Exception state
  const [exceptionType, setExceptionType] = useState<ExceptionType>('stalled-orders');
  const [exceptionPage, setExceptionPage] = useState(1);

  // People groupBy state
  const [peopleGroupBy, setPeopleGroupBy] = useState<'supervisor' | 'shift' | 'user'>('supervisor');

  // Article sortBy state
  const [articleSortBy, setArticleSortBy] = useState<'volume' | 'defects' | 'cycleTime'>('volume');

  // All sections fetch on mount - no lazy loading for reliability
  // Summary (Zone A + B)
  const summary = useDashboardSection<DashboardSummary>(
    dashboardService.getSummary,
    filters,
    { staleTime: 60000 }
  );

  // Alerts (Zone 0)
  const alerts = useDashboardSection<AlertsData>(
    dashboardService.getAlerts,
    filters,
    { staleTime: 120000 }
  );

  // Floors (Zone C)
  const floors = useDashboardSection<FloorHeatstripData>(
    dashboardService.getFloors,
    filters,
    { staleTime: 60000 }
  );

  // Quality (Zone E)
  const quality = useDashboardSection<QualityData>(
    dashboardService.getQuality,
    filters,
    { staleTime: 120000 }
  );

  // Machines (Zone F)
  const machines = useDashboardSection<MachineUtilizationData>(
    (f, s) => dashboardService.getMachines(f, { limit: 20 }, s),
    filters,
    { staleTime: 120000 }
  );

  // Trends (Zone D)
  const trends = useDashboardSection<TrendsData>(
    (f, s) => dashboardService.getTrends(f, 'daily', s),
    filters,
    { staleTime: 900000 }
  );

  // People (Zone G)
  const people = useDashboardSection<PeopleData>(
    (f, s) => dashboardService.getPeople(f, peopleGroupBy, s),
    filters,
    { staleTime: 300000 }
  );

  // Ageing (Zone H)
  const ageing = useDashboardSection<AgeingData>(
    (f, s) => dashboardService.getAgeing(f, 'orders', s),
    filters,
    { staleTime: 300000 }
  );

  // Yarn Readiness (Zone I)
  const yarn = useDashboardSection<YarnReadinessData>(
    dashboardService.getYarnReadiness,
    filters,
    { staleTime: 120000 }
  );

  // Articles (Zone J)
  const articles = useDashboardSection<ArticlePerformanceData>(
    (f, s) => dashboardService.getArticles(f, { sortBy: articleSortBy, limit: 20 }, s),
    filters,
    { staleTime: 300000 }
  );

  // Exceptions (Zone K)
  const exceptions = useDashboardSection<ExceptionsData>(
    (f, s) => dashboardService.getExceptions(f, exceptionType, exceptionPage, 20, s),
    filters,
    { staleTime: 120000 }
  );

  // Reconciliation (Zone L)
  const reconciliation = useDashboardSection<ReconciliationData>(
    dashboardService.getReconciliation,
    filters,
    { staleTime: 300000 }
  );

  // Auto-refresh in TV mode
  useEffect(() => {
    if (!tvMode.isTvMode) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, tvMode.autoRefreshInterval || 60000);

    return () => clearInterval(interval);
  }, [tvMode.isTvMode, tvMode.autoRefreshInterval]);

  // Refresh all sections
  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
    summary.refetch();
    alerts.refetch();
    floors.refetch();
    quality.refetch();
    machines.refetch();
    trends.refetch();
    people.refetch();
    ageing.refetch();
    yarn.refetch();
    articles.refetch();
    exceptions.refetch();
    reconciliation.refetch();
  }, [summary, alerts, floors, quality, machines, trends, people, ageing, yarn, articles, exceptions, reconciliation]);

  // Date range quick selectors
  const handleDateRangeSelect = useCallback((range: string) => {
    const now = new Date();
    let from: Date;
    
    switch (range) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'mtd':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    setFilters({
      from: from.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0]
    });
  }, [setFilters]);

  // Refetch exceptions when type or page changes
  const isFirstExceptionRender = useRef(true);
  useEffect(() => {
    if (isFirstExceptionRender.current) {
      isFirstExceptionRender.current = false;
      return;
    }
    exceptions.refetch();
  }, [exceptionType, exceptionPage]);

  // Handle exception type change
  const handleExceptionTypeChange = useCallback((type: ExceptionType) => {
    setExceptionType(type);
    setExceptionPage(1);
  }, []);

  // Refetch people when groupBy changes
  const isFirstPeopleRender = useRef(true);
  useEffect(() => {
    if (isFirstPeopleRender.current) {
      isFirstPeopleRender.current = false;
      return;
    }
    people.refetch();
  }, [peopleGroupBy]);

  // Handle people groupBy change
  const handlePeopleGroupByChange = useCallback((groupBy: 'supervisor' | 'shift' | 'user') => {
    setPeopleGroupBy(groupBy);
  }, []);

  // Refetch articles when sortBy changes
  const isFirstArticleRender = useRef(true);
  useEffect(() => {
    if (isFirstArticleRender.current) {
      isFirstArticleRender.current = false;
      return;
    }
    articles.refetch();
  }, [articleSortBy]);

  // Handle article sortBy change
  const handleArticleSortByChange = useCallback((sortBy: 'volume' | 'defects' | 'cycleTime') => {
    setArticleSortBy(sortBy);
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
    document.documentElement.classList.toggle('dark');
  }, []);

  // TV mode classes
  const containerClasses = `
    min-h-screen transition-colors duration-300
    ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}
    ${tvMode.isTvMode ? 'tv-mode' : ''}
  `;

  return (
    <div className={containerClasses}>
      {/* Dashboard Header */}
      {!tvMode.isTvMode && (
        <DashboardHeader
          filters={filters}
          filterCount={filterCount}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
          onRefresh={handleRefresh}
          onDateRangeSelect={handleDateRangeSelect}
          isRefreshing={summary.isFetching}
          lastUpdated={summary.lastFetched ? new Date(summary.lastFetched).toLocaleTimeString() : undefined}
        />
      )}

      {/* TV Mode Controls */}
      {tvMode.isTvMode && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={tvMode.togglePause}
            className="p-2 bg-white/90 rounded-lg shadow-lg text-gray-700 hover:bg-white"
            title={tvMode.isPaused ? 'Resume' : 'Pause'}
          >
            <i className={tvMode.isPaused ? 'ri-play-fill' : 'ri-pause-fill'} />
          </button>
          <button
            onClick={tvMode.toggleFullscreen}
            className="p-2 bg-white/90 rounded-lg shadow-lg text-gray-700 hover:bg-white"
            title={tvMode.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            <i className={tvMode.isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'} />
          </button>
          <button
            onClick={tvMode.toggleTvMode}
            className="p-2 bg-white/90 rounded-lg shadow-lg text-gray-700 hover:bg-white"
            title="Exit TV Mode"
          >
            <i className="ri-close-line" />
          </button>
        </div>
      )}

      {/* Quick actions bar */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
        >
          <i className={isDarkMode ? 'ri-sun-line' : 'ri-moon-line'} />
        </button>
        {!tvMode.isTvMode && (
          <button
            onClick={tvMode.toggleTvMode}
            className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            title="TV Mode"
          >
            <i className="ri-tv-2-line" />
          </button>
        )}
      </div>

      <motion.main 
        className={`p-4 md:p-6 space-y-6 ${tvMode.isTvMode ? 'p-8 pt-16' : ''}`}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Zone 0: Alert Ribbon */}
        <motion.div variants={fadeInUp}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Alerts & Warnings
            </h3>
            <InfoTooltip {...SECTION_INFO.alerts} />
          </div>
          <AlertRibbon 
            alerts={alerts.data?.alerts || []} 
            loading={alerts.status === 'loading'} 
          />
        </motion.div>

        {/* Zone A: KPI Strip */}
        <motion.div variants={fadeInUp}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Key Performance Indicators
            </h3>
            <InfoTooltip {...SECTION_INFO.kpis} />
          </div>
          {summary.status === 'loading' && !summary.data ? (
            <KpiSkeleton />
          ) : (
            <KpiStrip 
              kpis={summary.data?.kpis} 
              loading={summary.isFetching} 
            />
          )}
        </motion.div>

        {/* Zone B: Order Funnel */}
        <motion.div variants={fadeInUp}>
          <OrderFunnel 
            data={summary.data?.orderFunnel} 
            loading={summary.status === 'loading'} 
          />
        </motion.div>

        {/* Zone C: Floor Heatstrip - Most Important */}
        <motion.div variants={fadeInUp}>
          {floors.status === 'loading' && !floors.data ? (
            <TableSkeleton rows={12} cols={9} />
          ) : (
            <FloorHeatstrip 
              data={floors.data} 
              loading={floors.isFetching}
              onFloorClick={(floorKey) => {
                window.location.href = `/production/floor-supervisor/${floorKey}`;
              }}
            />
          )}
        </motion.div>

        {/* Grid for Zone D + E */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Zone D: Throughput Trends */}
          <motion.div variants={fadeInUp}>
            {trends.status === 'loading' && !trends.data ? (
              <ChartSkeleton height={300} />
            ) : (
              <ThroughputPanel 
                data={trends.data} 
                loading={trends.isFetching} 
              />
            )}
          </motion.div>

          {/* Zone E: Quality Panel */}
          <motion.div variants={fadeInUp}>
            {quality.status === 'loading' && !quality.data ? (
              <ChartSkeleton height={300} />
            ) : (
              <QualityPanel 
                data={quality.data} 
                loading={quality.isFetching} 
              />
            )}
          </motion.div>
        </div>

        {/* Zone F: Machine Utilization */}
        <motion.div variants={fadeInUp}>
          {machines.status === 'loading' && !machines.data ? (
            <ChartSkeleton height={300} />
          ) : (
            <MachinePanel 
              data={machines.data} 
              loading={machines.isFetching} 
            />
          )}
        </motion.div>

        {/* Grid for Zone G + H + I */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Zone G: People/Shift Panel */}
          <motion.div variants={fadeInUp} className="lg:col-span-2">
            {people.status === 'loading' && !people.data ? (
              <ChartSkeleton height={280} />
            ) : (
              <PeopleShiftPanel 
                data={people.data as PeopleData} 
                loading={people.isFetching}
                onGroupByChange={handlePeopleGroupByChange}
              />
            )}
          </motion.div>

          {/* Zone I: Yarn Readiness */}
          <motion.div variants={fadeInUp}>
            {yarn.status === 'loading' && !yarn.data ? (
              <CardSkeleton height={160} />
            ) : (
              <YarnReadinessPanel 
                data={yarn.data} 
                loading={yarn.isFetching} 
              />
            )}
          </motion.div>
        </div>

        {/* Grid for Zone H + J */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Zone H: Order Ageing */}
          <motion.div variants={fadeInUp}>
            {ageing.status === 'loading' && !ageing.data ? (
              <ChartSkeleton height={280} />
            ) : (
              <OrderAgeingPanel 
                data={ageing.data} 
                loading={ageing.isFetching} 
              />
            )}
          </motion.div>

          {/* Zone J: Article Performance */}
          <motion.div variants={fadeInUp}>
            {articles.status === 'loading' && !articles.data ? (
              <TableSkeleton rows={10} cols={5} />
            ) : (
              <ArticlePerformancePanel 
                data={articles.data} 
                loading={articles.isFetching}
                onSortChange={handleArticleSortByChange}
              />
            )}
          </motion.div>
        </div>

        {/* Zone K: Exception Worklist */}
        <motion.div variants={fadeInUp}>
          {exceptions.status === 'loading' && !exceptions.data ? (
            <TableSkeleton rows={5} cols={4} />
          ) : (
            <ExceptionWorklist 
              data={exceptions.data}
              loading={exceptions.isFetching}
              onTypeChange={handleExceptionTypeChange}
              onPageChange={setExceptionPage}
              pagination={undefined}
            />
          )}
        </motion.div>

        {/* Zone L: Reconciliation */}
        <motion.div variants={fadeInUp}>
          {reconciliation.status === 'loading' && !reconciliation.data ? (
            <ChartSkeleton height={200} />
          ) : (
            <ReconciliationPanel 
              data={reconciliation.data} 
              loading={reconciliation.isFetching} 
            />
          )}
        </motion.div>

        {/* Footer with last updated timestamp */}
        <motion.div 
          variants={fadeInUp}
          className="text-center text-xs text-gray-400 dark:text-gray-500 py-4"
        >
          {summary.lastFetched && (
            <span>
              Last updated: {new Date(summary.lastFetched).toLocaleString()}
              {summary.data && summary.isFetching && ' • Refreshing...'}
            </span>
          )}
        </motion.div>
      </motion.main>
    </div>
  );
};

export default ProductionCommandClient;
