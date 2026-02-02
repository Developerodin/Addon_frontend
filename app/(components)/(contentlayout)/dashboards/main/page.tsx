"use client";
import { Visitorsbychannel } from "@/shared/data/dashboards/analyticsdata";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { useMemo, useCallback, Fragment } from "react";
import * as Analyticsdata from "@/shared/data/dashboards/analyticsdata";
import dynamic from "next/dynamic";
import { useDashboard } from "@/shared/hooks/useDashboard";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  getOverviewTotals,
  getMonthlyTrendsChartData,
  getStorePerformanceChartData,
  getCategoryAnalyticsChartData,
  getDemandForecastChartData,
  getCityPerformanceTableData,
  getTopProductsChartData,
} from "@/shared/utils/dashboardUtils";
import { AnalyticsMainContent } from "./AnalyticsMainContent";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

// Add performance optimizations
const chartOptions = {
  chart: {
    animations: {
      enabled: true,
      easing: "easeinout",
      speed: 800,
      animateGradually: { enabled: true, delay: 150 },
      dynamicAnimation: { enabled: true, speed: 350 },
    },
    redrawOnWindowResize: false,
    redrawOnParentResize: false,
  },
};

function LoadingBlock() {
  return (
    <div className="main-content !p-[10px]">
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
        </div>
      </div>
    </div>
  );
}

function ErrorBlock(props: { error: string; onRefresh: () => void }) {
  const { error, onRefresh } = props;
  return (
    <div className="main-content !p-[10px]">
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-[10px]">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-red-400 mb-4">
            <i className="ri-error-warning-line text-5xl"></i>
          </div>
          <h3 className="text-xs font-bold text-gray-400 mb-1">Error</h3>
          <p className="text-[11px] text-gray-500 mb-4">{error}</p>
          <button type="button" onClick={onRefresh} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700">
            <i className="ri-refresh-line"></i> Retry
          </button>
        </div>
      </div>
    </div>
  );
}

const Analytics = () => {
  const { loading, error, period, data, loadDashboardData, updatePeriod } =
    useDashboard();

  // Memoize formatted data to prevent unnecessary recalculations
  const overviewTotals = useMemo(() => 
    getOverviewTotals(data.overview?.overview), 
    [data.overview?.overview]
  );
  
  const monthlyTrendsData = useMemo(() => 
    getMonthlyTrendsChartData(data.overview?.monthlyTrends), 
    [data.overview?.monthlyTrends]
  );
  
  const storePerformanceData = useMemo(() => 
    getStorePerformanceChartData(data.storePerformance), 
    [data.storePerformance]
  );
  
  const categoryAnalyticsData = useMemo(() => 
    getCategoryAnalyticsChartData(data.categoryAnalytics), 
    [data.categoryAnalytics]
  );
  
  const demandForecastData = useMemo(() => 
    getDemandForecastChartData(data.demandForecast), 
    [data.demandForecast]
  );
  
  const cityPerformanceData = useMemo(() => 
    getCityPerformanceTableData(data.cityPerformance), 
    [data.cityPerformance]
  );
  
  const topProductsData = useMemo(() => 
    getTopProductsChartData(data.topProducts), 
    [data.topProducts]
  );

  // Memoize period update handler
  const handlePeriodUpdate = useCallback((newPeriod: 'week' | 'month' | 'quarter') => {
    updatePeriod(newPeriod);
  }, [updatePeriod]);

  // Memoize refresh handler
  const handleRefresh = useCallback(() => {
    loadDashboardData();
  }, [loadDashboardData]);


  return (
    <React.Fragment>
      <Seo title={"Analytics"} />
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock error={error} onRefresh={handleRefresh} />
      ) : (
        <AnalyticsMainContent
          overviewTotals={overviewTotals}
          period={period}
          onPeriodUpdate={handlePeriodUpdate}
          onRefresh={handleRefresh}
          monthlyTrendsData={monthlyTrendsData}
          storePerformanceData={storePerformanceData}
          categoryAnalyticsData={categoryAnalyticsData}
          demandForecastData={demandForecastData}
          storePerformance={data.storePerformance}
          cityPerformance={data.cityPerformance}
          chartOptions={chartOptions}
        />
      )}
      {/* <div className="grid grid-cols-12 gap-x-6">
                <div className="xl:col-span-9 col-span-12">
                    <div className="box">
                        <div className="box-header justify-between">
                            <div className="box-title">
                                Visitors By Channel Report
                            </div>
                            <div className="flex flex-wrap">
                                <div className="me-3 my-1">
                                    <input className="ti-form-control form-control-sm" type="text" placeholder="Search Here" aria-label=".form-control-sm example" />
                                </div>
                                <div className="hs-dropdown ti-dropdown my-1">
                                    <Link href="#!" scroll={false}
                                        className="ti-btn ti-btn-primary !bg-primary !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-0 !font-medium"
                                        aria-expanded="false">
                                        Sort By<i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                                    </Link>
                                    <ul className="hs-dropdown-menu ti-dropdown-menu hidden" role="menu">
                                        <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                                            href="#!" scroll={false}>New</Link></li>
                                        <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                                            href="#!" scroll={false}>Popular</Link></li>
                                        <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                                            href="#!" scroll={false}>Relevant</Link></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="box-body">
                            <div className="table-responsive">
                                <table className="table table-hover whitespace-nowrap table-bordered min-w-full">
                                    <thead>
                                        <tr>
                                            <th scope="col" className="text-start">S.No</th>
                                            <th scope="col" className="text-start">Channel</th>
                                            <th scope="col" className="text-start">Sessions</th>
                                            <th scope="col" className="text-start">Bounce Rate</th>
                                            <th scope="col" className="text-start">Avg Session Duration</th>
                                            <th scope="col" className="text-start">Goal Completed</th>
                                            <th scope="col" className="text-start">Pages Per Session</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Visitorsbychannel.map((idx) => (
                                            <tr className="border-t border-inherit border-solid hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10" key={Math.random()}>
                                                <th scope="row" className="!text-start">
                                                    {idx.id}
                                                </th>
                                                <td>
                                                    <div className="flex items-center">
                                                        <span className={`avatar avatar-sm !mb-0 bg-${idx.color}/10 avatar-rounded`}>
                                                            <i className={`ri-${idx.icon} text-[0.9375rem] font-semibiold text-${idx.color}`}></i>
                                                        </span>
                                                        <span className="ms-2">
                                                            {idx.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>{idx.session}</td>
                                                <td>{idx.rate}</td>
                                                <td>
                                                    {idx.avg}
                                                </td>
                                                <td>
                                                    <span className={`badge bg-${idx.color}/10 text-${idx.color}`}>{idx.goal}</span>
                                                </td>
                                                <td>
                                                    {idx.pages}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="box-footer">
                            <div className="sm:flex items-center">
                                <div className="dark:text-defaulttextcolor/70">
                                    Showing 5 Entries <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                                </div>
                                <div className="ms-auto">
                                    <nav aria-label="Page navigation" className="pagination-style-4">
                                        <ul className="ti-pagination mb-0">
                                            <li className="page-item disabled">
                                                <Link className="page-link" href="#!" scroll={false}>
                                                    Prev
                                                </Link>
                                            </li>
                                            <li className="page-item"><Link className="page-link active" href="#!" scroll={false}>1</Link></li>
                                            <li className="page-item"><Link className="page-link" href="#!" scroll={false}>2</Link></li>
                                            <li className="page-item">
                                                <Link className="page-link !text-primary" href="#!" scroll={false}>
                                                    next
                                                </Link>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="xl:col-span-3 col-span-12">
                    <div className="box">
                        <div className="box-header justify-between">
                            <div className="box-title">
                                Visitors By Countries
                            </div>
                            <div className="hs-dropdown ti-dropdown">
                                <Link href="#!" scroll={false} className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50"
                                    aria-expanded="false">
                                    View All<i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                                </Link>
                                <ul className="hs-dropdown-menu ti-dropdown-menu hidden" role="menu">
                                    <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                                        href="#!" scroll={false}>Today</Link></li>
                                    <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                                        href="#!" scroll={false}>This Week</Link></li>
                                    <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                                        href="#!" scroll={false}>Last Week</Link></li>
                                </ul>
                            </div>
                        </div>
                        <div className="box-body">
                            <ul className="list-none mb-0 analytics-visitors-countries min-w-full">
                                <li>
                                    <div className="flex items-center">
                                        <div className="leading-none">
                                            <span className="avatar avatar-sm !mb-0 text-default">
                                                <img src="../../assets/images/flags/us_flag.jpg" alt="" className="!rounded-full h-[1.75rem] w-[1.75rem]" />
                                            </span>
                                        </div>
                                        <div className="ms-4 flex-grow leading-none">
                                            <span className="text-[0.75rem]">United States</span>
                                        </div>
                                        <div>
                                            <span className="text-default badge bg-light font-semibold mt-2">32,190</span>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <div className="leading-none">
                                            <span className="avatar avatar-sm !mb-0 avatar-rounded text-default">
                                                <img src="../../assets/images/flags/germany_flag.jpg" alt="" className="!rounded-full h-[1.75rem] w-[1.75rem]" />
                                            </span>
                                        </div>
                                        <div className="ms-4 flex-grow leading-none">
                                            <span className="text-[0.75rem]">Germany</span>
                                        </div>
                                        <div>
                                            <span className="text-default badge bg-light font-semibold mt-2">8,798</span>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <div className="leading-none">
                                            <span className="avatar avatar-sm !mb-0 avatar-rounded text-default">
                                                <img src="../../assets/images/flags/mexico_flag.jpg" alt="" className="!rounded-full h-[1.75rem] w-[1.75rem]" />
                                            </span>
                                        </div>
                                        <div className="ms-4 flex-grow leading-none">
                                            <span className="text-[0.75rem]">Mexico</span>
                                        </div>
                                        <div>
                                            <span className="text-default badge bg-light font-semibold mt-2">16,885</span>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <div className="leading-none">
                                            <span className="avatar avatar-sm !mb-0 avatar-rounded text-default">
                                                <img src="../../assets/images/flags/uae_flag.jpg" alt="" className="!rounded-full h-[1.75rem] w-[1.75rem]" />
                                            </span>
                                        </div>
                                        <div className="ms-4 flex-grow leading-none">
                                            <span className="text-[0.75rem]">Uae</span>
                                        </div>
                                        <div>
                                            <span className="text-default badge bg-light font-semibold mt-2">14,885</span>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <div className="leading-none">
                                            <span className="avatar avatar-sm !mb-0 avatar-rounded text-default">
                                                <img src="../../assets/images/flags/argentina_flag.jpg" alt="" className="!rounded-full h-[1.75rem] w-[1.75rem]" />
                                            </span>
                                        </div>
                                        <div className="ms-4 flex-grow leading-none">
                                            <span className="text-[0.75rem]">Argentina</span>
                                        </div>
                                        <div>
                                            <span className="text-default badge bg-light font-semibold mt-2">17,578</span>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <div className="leading-none">
                                            <span className="avatar avatar-sm !mb-0 avatar-rounded text-default">
                                                <img src="../../assets/images/flags/russia_flag.jpg" alt="" className="!rounded-full h-[1.75rem] w-[1.75rem]" />
                                            </span>
                                        </div>
                                        <div className="ms-4 flex-grow leading-none">
                                            <span className="text-[0.75rem]">Russia</span>
                                        </div>
                                        <div>
                                            <span className="text-default badge bg-light font-semibold mt-2">10,118</span>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <div className="leading-none">
                                            <span className="avatar avatar-sm !mb-0 avatar-rounded text-default">
                                                <img src="../../assets/images/flags/china_flag.jpg" alt="" className="!rounded-full h-[1.75rem] w-[1.75rem]" />
                                            </span>
                                        </div>
                                        <div className="ms-4 flex-grow leading-none">
                                            <span className="text-[0.75rem]">China</span>
                                        </div>
                                        <div>
                                            <span className="text-default badge bg-light font-semibold mt-2">6,578</span>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <div className="leading-none">
                                            <span className="avatar avatar-sm !mb-0 avatar-rounded text-default">
                                                <img src="../../assets/images/flags/french_flag.jpg" alt="" className="!rounded-full h-[1.75rem] w-[1.75rem]" />
                                            </span>
                                        </div>
                                        <div className="ms-4 flex-grow leading-none">
                                            <span className="text-[0.75rem]">France</span>
                                        </div>
                                        <div>
                                            <span className="text-default badge bg-light font-semibold mt-2">2,345</span>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    <div className="flex items-center">
                                        <div className="leading-none">
                                            <span className="avatar avatar-sm !mb-0 avatar-rounded text-default">
                                                <img src="../../assets/images/flags/canada_flag.jpg" alt="" className="!rounded-full h-[1.75rem] w-[1.75rem]" />
                                            </span>
                                        </div>
                                        <div className="ms-4 flex-grow leading-none">
                                            <span className="text-[0.75rem]">Canada</span>
                                        </div>
                                        <div>
                                            <span className="text-default badge bg-light font-semibold mt-2">1,678</span>
                                        </div>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div> */}
    </React.Fragment>
  );
};

export default Analytics;
