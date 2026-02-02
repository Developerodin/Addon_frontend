"use client";

import Link from "next/link";
import React from "react";
import dynamic from "next/dynamic";
import * as Analyticsdata from "@/shared/data/dashboards/analyticsdata";
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
} from "@/shared/utils/dashboardUtils";
import type { StorePerformance, CityPerformance } from "@/shared/services/dashboardService";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export interface AnalyticsMainContentProps {
  overviewTotals: {
    totalNSV: number;
    totalOrders: number;
    salesChange: number;
  };
  period: "week" | "month" | "quarter";
  onPeriodUpdate: (p: "week" | "month" | "quarter") => void;
  onRefresh: () => void;
  monthlyTrendsData: {
    categories: string[];
    nsvSeries: number[];
    quantitySeries: number[];
    ordersSeries: number[];
  };
  storePerformanceData: { labels: string[]; series: number[] };
  categoryAnalyticsData: {
    categories: string[];
    nsvSeries: number[];
    quantitySeries: number[];
  };
  demandForecastData: {
    categories: string[];
    actualSeries: number[];
    forecastSeries: number[];
  };
  storePerformance: StorePerformance[];
  cityPerformance: CityPerformance[];
  chartOptions: object;
}

export function AnalyticsMainContent(props: AnalyticsMainContentProps) {
  const {
    overviewTotals,
    period,
    onPeriodUpdate,
    onRefresh,
    monthlyTrendsData,
    storePerformanceData,
    categoryAnalyticsData,
    demandForecastData,
    storePerformance,
    cityPerformance,
    chartOptions,
  } = props;

  return (<div className="main-content !p-[10px]">
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
            <h1 className="text-sm font-bold text-gray-800">Analytics</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap">Period:</span>
            {["week", "month", "quarter"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPeriodUpdate(p as "week" | "month" | "quarter")}
                className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all whitespace-nowrap min-w-[60px] ${
                  period === p ? "bg-purple-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
            <button type="button" onClick={onRefresh} className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-200 text-purple-700 text-[11px] font-bold rounded hover:bg-purple-50 transition-colors">
              <i className="ri-refresh-line text-sm"></i> Refresh
            </button>
          </div>
        </div>

        <div className="p-[10px] pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="flex items-center justify-between p-3 rounded border-l-4 border-blue-200 bg-blue-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Total Sale</p>
                <p className="text-sm font-bold text-blue-600 truncate">{formatCurrency(overviewTotals.totalNSV)}</p>
                <p className={`text-[10px] ${overviewTotals.salesChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {overviewTotals.salesChange >= 0 ? "+" : ""}{formatPercentage(overviewTotals.salesChange)}
                </p>
              </div>
              <div className="flex-shrink-0">
                <ReactApexChart options={Analyticsdata.Totalusers.options} series={Analyticsdata.Totalusers.series} type="line" height={36} width={80} />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded border-l-4 border-purple-200 bg-purple-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Total Orders</p>
                <p className="text-sm font-bold text-purple-600 truncate">{formatNumber(overviewTotals.totalOrders)}</p>
                <p className={`text-[10px] ${overviewTotals.salesChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {overviewTotals.salesChange >= 0 ? "+" : ""}{formatPercentage(overviewTotals.salesChange)}
                </p>
              </div>
              <span className="w-9 h-9 rounded flex items-center justify-center bg-purple-100 text-purple-600">
                <i className="ri-shopping-cart-line text-lg"></i>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded border-l-4 border-amber-200 bg-amber-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Weekly Trend</p>
                <p className="text-sm font-bold text-amber-700 truncate">{formatPercentage(overviewTotals.salesChange)}</p>
              </div>
              <div className="flex-shrink-0">
                <ReactApexChart options={Analyticsdata.Bouncerate.options} series={Analyticsdata.Bouncerate.series} type="line" height={36} width={80} />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded border-l-4 border-green-200 bg-green-50 border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Forecasts</p>
                <p className="text-sm font-bold text-green-700 truncate">Updated</p>
                <button type="button" className="mt-1 text-[10px] font-bold text-green-700 hover:underline">Explore now</button>
              </div>
            </div>
          </div>
        </div>

        <AnalyticsChartsSection
          chartOptions={chartOptions}
          monthlyTrendsData={monthlyTrendsData}
          storePerformanceData={storePerformanceData}
          storePerformance={storePerformance}
          demandForecastData={demandForecastData}
          cityPerformance={cityPerformance}
          categoryAnalyticsData={categoryAnalyticsData}
        />
      </div>
    </div>
  );
}

/** Charts and tables section to keep main component under 500 lines. */
function AnalyticsChartsSection(props: {
  chartOptions: object;
  monthlyTrendsData: AnalyticsMainContentProps["monthlyTrendsData"];
  storePerformanceData: AnalyticsMainContentProps["storePerformanceData"];
  storePerformance: StorePerformance[];
  demandForecastData: AnalyticsMainContentProps["demandForecastData"];
  cityPerformance: CityPerformance[];
  categoryAnalyticsData: AnalyticsMainContentProps["categoryAnalyticsData"];
}) {
  const {
    chartOptions,
    monthlyTrendsData,
    storePerformanceData,
    storePerformance,
    demandForecastData,
    cityPerformance,
    categoryAnalyticsData,
  } = props;

  return (
    <>
      <MonthlyTrendSection chartOptions={chartOptions} monthlyTrendsData={monthlyTrendsData} />
      <TopStoresSection
        chartOptions={chartOptions}
        storePerformanceData={storePerformanceData}
        storePerformance={storePerformance}
      />
      <DemandForecastSection chartOptions={chartOptions} demandForecastData={demandForecastData} />
      <CityPerformancesSection cityPerformance={cityPerformance} />
      <CategoryAnalyticsSection chartOptions={chartOptions} categoryAnalyticsData={categoryAnalyticsData} />
    </>
  );
}

function MonthlyTrendSection(props: {
  chartOptions: object;
  monthlyTrendsData: AnalyticsMainContentProps["monthlyTrendsData"];
}) {
  const { chartOptions, monthlyTrendsData } = props;
  const monthlyOptions = {
    ...chartOptions,
    chart: {
      type: "bar" as const,
      height: 257,
      toolbar: { show: false },
      background: "transparent",
      stacked: false,
      dropShadow: { enabled: true, color: "#000", top: 10, left: 5, blur: 8, opacity: 0.15 },
    },
    plotOptions: { bar: { horizontal: false, columnWidth: "55%", borderRadius: 6, dataLabels: { position: "top" } } },
    colors: ["#6366f1", "#10b981", "#f59e0b"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 5, xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } } },
    xaxis: {
      categories: monthlyTrendsData.categories.length > 0 ? monthlyTrendsData.categories : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      labels: { style: { colors: "#64748b", fontSize: "12px", fontFamily: "Inter, sans-serif" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      {
        title: { text: "NSV (₹)", style: { color: "#64748b", fontSize: "12px", fontFamily: "Inter, sans-serif" } },
        labels: { formatter: (value: number) => formatCurrency(value), style: { colors: "#64748b", fontSize: "11px" } },
      },
      { opposite: true, title: { text: "Quantity/Orders", style: { color: "#64748b", fontSize: "12px" } }, labels: { style: { colors: "#64748b", fontSize: "11px" } } },
    ],
    legend: { position: "top" as const, horizontalAlign: "right" as const, fontSize: "12px", fontFamily: "Inter, sans-serif", markers: { radius: 4, width: 12, height: 12 } },
    tooltip: {
      theme: "dark",
      style: { fontSize: "12px" },
      y: { formatter: (value: number, { seriesIndex }: any) => (seriesIndex === 0 ? formatCurrency(value) : formatNumber(value)) },
    },
    fill: { opacity: 0.9, gradient: { shade: "light", type: "vertical", shadeIntensity: 0.1, gradientToColors: ["#6366f1", "#10b981", "#f59e0b"], inverseColors: false, opacityFrom: 0.9, opacityTo: 0.7, stops: [0, 100] } },
  };
  return (
    <div className="border-t border-gray-100 p-[10px] pt-0">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Monthly NSV & Qty Trend</h3>
        <Link href="/analytics/all-sales-data" className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-600 hover:bg-purple-50 rounded transition-colors">
          <i className="ri-external-link-line text-sm"></i> View All
        </Link>
      </div>
      <div className="px-[10px] pb-[10px]">
        <div id="audienceReport">
          <ReactApexChart
            options={monthlyOptions}
            series={[
              { name: "NSV", data: monthlyTrendsData.nsvSeries.length > 0 ? monthlyTrendsData.nsvSeries : [0, 0, 0, 0, 0, 0] },
              { name: "Quantity", data: monthlyTrendsData.quantitySeries.length > 0 ? monthlyTrendsData.quantitySeries : [0, 0, 0, 0, 0, 0] },
              { name: "Orders", data: monthlyTrendsData.ordersSeries.length > 0 ? monthlyTrendsData.ordersSeries : [0, 0, 0, 0, 0, 0] },
            ]}
            type="bar"
            width={"100%"}
            height={257}
          />
        </div>
      </div>
    </div>
  );
}

function TopStoresSection(props: {
  chartOptions: object;
  storePerformanceData: AnalyticsMainContentProps["storePerformanceData"];
  storePerformance: StorePerformance[];
}) {
  const { chartOptions, storePerformanceData, storePerformance } = props;
  const storesChartOptions = {
    ...chartOptions,
    chart: { type: "donut" as const, height: 250, background: "transparent", dropShadow: { enabled: false } },
    labels: storePerformanceData.labels.length > 0 ? storePerformanceData.labels : ["Store 1", "Store 2", "Store 3", "Store 4", "Store 5"],
    colors: ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
    legend: { show: false },
    tooltip: { theme: "dark", style: { fontSize: "13px" }, y: { formatter: (value: number) => formatCurrency(value), title: { formatter: () => "NSV: " } } },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "60%",
          background: "transparent",
          labels: {
            show: true,
            name: { show: true, fontSize: "13px", fontFamily: "Inter, sans-serif", fontWeight: "600", color: "#64748b" },
            value: { show: true, fontSize: "16px", fontFamily: "Inter, sans-serif", fontWeight: "700", color: "#1e293b", formatter: (val: string) => formatCurrency(parseFloat(val)) },
            total: { show: true, label: "Total NSV", fontSize: "11px", fontFamily: "Inter, sans-serif", fontWeight: "600", color: "#64748b", formatter: (w: any) => formatCurrency(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)) },
          },
        },
      },
    },
  };
  return (<div className="border-t border-gray-100 p-[10px]">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Top 5 Stores</h3>
        <Link href="/analytics/all-stores-performance" className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-600 hover:bg-purple-50 rounded transition-colors">
          View All
        </Link>
      </div>
      <div className="!p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex justify-center items-center">
            <div id="sessions" className="w-full max-w-[280px]">
              <ReactApexChart
                options={storesChartOptions}
                series={storePerformanceData.series.length > 0 ? storePerformanceData.series : [0, 0, 0, 0, 0]}
                type="donut"
                width={"100%"}
                height={250}
              />
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="pl-[10px] pr-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Store</th>
                    <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">NSV</th>
                    <th className="px-1.5 py-2 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">%</th>
                  </tr>
                </thead>
                <tbody>
                  {storePerformance.slice(0, 5).map((store) => {
                    const totalNSV = storePerformance.reduce((sum, s) => sum + s.totalNSV, 0);
                    const percentage = totalNSV > 0 ? ((store.totalNSV / totalNSV) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={store._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="pl-[10px] pr-1.5 py-2 border border-gray-200">
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded flex items-center justify-center bg-purple-50 text-purple-600 flex-shrink-0">
                              <i className="ri-store-line text-xs"></i>
                            </span>
                            <span className="text-[12px] font-medium text-gray-900 truncate" title={store.storeName}>{store.storeName}</span>
                          </div>
                        </td>
                        <td className="px-1.5 py-2 text-[12px] font-semibold text-green-600 border border-gray-200">{formatCurrency(store.totalNSV)}</td>
                        <td className="px-1.5 py-2 text-right pr-[10px] text-[12px] text-gray-600 border border-gray-200">{percentage}%</td>
                      </tr>
                    );
                  })}
                  {storePerformance.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-[11px] text-gray-500 border border-gray-200">No store data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemandForecastSection(props: {
  chartOptions: object;
  demandForecastData: AnalyticsMainContentProps["demandForecastData"];
}) {
  const { chartOptions, demandForecastData } = props;
  const demandOptions = {
    ...chartOptions,
    chart: { type: "bar" as const, height: 330, toolbar: { show: false }, background: "transparent", stacked: false, dropShadow: { enabled: true, color: "#000", top: 10, left: 5, blur: 8, opacity: 0.15 } },
    plotOptions: { bar: { horizontal: false, columnWidth: "60%", borderRadius: 6, dataLabels: { position: "top" } } },
    colors: ["#6366f1", "#10b981"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 5, xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } } },
    xaxis: {
      categories: demandForecastData.categories.length > 0 ? demandForecastData.categories : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      labels: { style: { colors: "#64748b", fontSize: "10px", fontFamily: "Inter, sans-serif" }, rotate: -45, rotateAlways: false, maxHeight: 60, trim: true, hideOverlappingLabels: true },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: { text: "Quantity", style: { color: "#64748b", fontSize: "12px", fontFamily: "Inter, sans-serif" } },
      labels: { formatter: (value: number) => formatNumber(value), style: { colors: "#64748b", fontSize: "11px" } },
    },
    legend: { position: "top" as const, horizontalAlign: "right" as const, fontSize: "12px", fontFamily: "Inter, sans-serif", markers: { radius: 4, width: 12, height: 12 } },
    tooltip: { theme: "dark", style: { fontSize: "12px" }, y: { formatter: (value: number) => formatNumber(value), title: { formatter: () => "Quantity: " } } },
    fill: { opacity: 0.9, gradient: { shade: "light", type: "vertical", shadeIntensity: 0.1, gradientToColors: ["#6366f1", "#10b981"], inverseColors: false, opacityFrom: 0.9, opacityTo: 0.7, stops: [0, 100] } },
  };
  return (<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4 p-[10px] pt-0 border-t border-gray-100">
      <div className="lg:col-span-12">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Demand Forecast vs Actual Demand</h3>
        </div>
        <div className="pb-[10px]">
          <div id="country-sessions">
            <ReactApexChart
              options={demandOptions}
              series={[
                { name: "Actual", data: demandForecastData.actualSeries.length > 0 ? demandForecastData.actualSeries : [0, 0, 0, 0, 0, 0] },
                { name: "Forecast", data: demandForecastData.forecastSeries.length > 0 ? demandForecastData.forecastSeries : [0, 0, 0, 0, 0, 0] },
              ]}
              type="bar"
              width={"100%"}
              height={330}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CityPerformancesSection(props: { cityPerformance: CityPerformance[] }) {
  const { cityPerformance } = props;
  return (<div className="xxl:col-span-6 xl:col-span-12 col-span-12">
      <div className="border border-gray-200 rounded overflow-hidden bg-white">
        <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">City Performances</h3>
          <Link href="/analytics/all-cities-performance" className="text-[11px] font-bold text-purple-600 hover:bg-purple-50 px-2 py-1 rounded transition-colors">
            View All <i className="ri-arrow-right-line text-sm align-middle ml-0.5"></i>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="pl-[10px] pr-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">City</th>
                <th className="px-1.5 py-2 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">NSV</th>
                <th className="px-1.5 py-2 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Orders</th>
              </tr>
            </thead>
            <tbody>
              {cityPerformance.slice(0, 6).map((city) => (
                <tr key={city._id} className="border-t border-inherit border-solid hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10">
                  <td>
                    <div className="flex items-center">
                      <span className="avatar avatar-rounded avatar-sm p-2 bg-light me-2">
                        <i className="ri-map-pin-fill text-[1.125rem] text-primary"></i>
                      </span>
                      <div className="font-semibold">{city._id}</div>
                    </div>
                  </td>
                  <td>
                    <span className="text-success">{formatCurrency(city.totalNSV)}</span>
                  </td>
                  <td>
                    <div className="progress progress-xs">
                      <div
                        className="progress-bar bg-primary"
                        style={{
                          width: `${Math.min(
                            (city.totalOrders / Math.max(...cityPerformance.map((c) => c.totalOrders), 1)) * 100,
                            100
                          )}%`,
                        }}
                        role="progressbar"
                        aria-valuenow={city.totalOrders}
                        aria-valuemin={0}
                        aria-valuemax={Math.max(...cityPerformance.map((c) => c.totalOrders), 1)}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
              {cityPerformance.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-[11px] text-gray-500 border border-gray-200">No city data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CategoryAnalyticsSection(props: {
  chartOptions: object;
  categoryAnalyticsData: AnalyticsMainContentProps["categoryAnalyticsData"];
}) {
  const { chartOptions, categoryAnalyticsData } = props;
  const categoryOptions = {
    ...chartOptions,
    chart: { type: "line" as const, height: 325, toolbar: { show: false }, background: "transparent", dropShadow: { enabled: true, color: "#000", top: 18, left: 7, blur: 10, opacity: 0.2 } },
    stroke: { curve: "smooth" as const, width: [4, 3], lineCap: "round" },
    colors: ["#6366f1", "#10b981"],
    fill: { type: "gradient", gradient: { shade: "light", type: "vertical", shadeIntensity: 0.1, gradientToColors: ["#6366f1", "#10b981"], inverseColors: false, opacityFrom: 0.8, opacityTo: 0.1, stops: [0, 100] } },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 5, xaxis: { lines: { show: true } }, yaxis: { lines: { show: true } } },
    xaxis: {
      categories: categoryAnalyticsData.categories.length > 0 ? categoryAnalyticsData.categories : ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5"],
      labels: { style: { colors: "#64748b", fontSize: "12px", fontFamily: "Inter, sans-serif" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: [
      { title: { text: "NSV (₹)", style: { color: "#64748b", fontSize: "12px", fontFamily: "Inter, sans-serif" } }, labels: { formatter: (value: number) => formatCurrency(value), style: { colors: "#64748b", fontSize: "11px" } } },
      { opposite: true, title: { text: "Quantity", style: { color: "#64748b", fontSize: "12px" } }, labels: { style: { colors: "#64748b", fontSize: "11px" } } },
    ],
    legend: { position: "top" as const, horizontalAlign: "right" as const, fontSize: "12px", fontFamily: "Inter, sans-serif", markers: { radius: 4 } },
    tooltip: { theme: "dark", style: { fontSize: "12px" }, y: { formatter: (value: number, { seriesIndex }: any) => (seriesIndex === 0 ? formatCurrency(value) : formatNumber(value)) } },
    markers: { size: 6, strokeWidth: 2, strokeColors: "#fff", colors: ["#6366f1", "#10b981"], hover: { size: 8 } },
  };
  return (<div className="xxl:col-span-6 xl:col-span-12 col-span-12">
      <div className="border border-gray-200 rounded overflow-hidden bg-white">
        <div className="p-[10px] border-b border-gray-100">
          <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Category-wise NSV & QTY</h3>
        </div>
        <div className="p-[10px]">
          <div id="session-users">
            <ReactApexChart
              options={categoryOptions}
              series={[
                { name: "NSV", data: categoryAnalyticsData.nsvSeries.length > 0 ? categoryAnalyticsData.nsvSeries : [0, 0, 0, 0, 0] },
                { name: "Quantity", data: categoryAnalyticsData.quantitySeries.length > 0 ? categoryAnalyticsData.quantitySeries : [0, 0, 0, 0, 0] },
              ]}
              type="line"
              width={"100%"}
              height={325}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
