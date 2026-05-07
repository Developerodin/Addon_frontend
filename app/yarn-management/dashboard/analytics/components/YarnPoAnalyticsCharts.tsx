"use client";

import React, { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import SafeChart from "@/shared/components/SafeChart";
import type {
  PoAnalyticsResponse,
  YarnTransactionAnalyticsResponse,
  YarnClosingTrendResponse,
} from "../../services/yarnInventoryService";

export interface YarnPoAnalyticsChartsProps {
  analytics: PoAnalyticsResponse | null;
  transactionAnalytics: YarnTransactionAnalyticsResponse | null;
  closingTrend: YarnClosingTrendResponse | null;
  onSupplierBarSelect?: (supplierId: string | null, supplierName: string) => void;
}

interface ChartDef {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  type: "bar" | "donut" | "area";
  height: number;
  span: string;
  options: ApexOptions;
  series: ApexAxisChartSeries | number[];
}

const COLOR_MAP: Record<string, { bg: string; icon: string; border: string }> = {
  purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-200" },
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", border: "border-indigo-200" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-200" },
  teal: { bg: "bg-teal-50", icon: "text-teal-600", border: "border-teal-200" },
  violet: { bg: "bg-violet-50", icon: "text-violet-600", border: "border-violet-200" },
};

export function YarnPoAnalyticsCharts({
  analytics,
  transactionAnalytics,
  closingTrend,
  onSupplierBarSelect,
}: YarnPoAnalyticsChartsProps) {
  const charts = useMemo(() => {
    const result: ChartDef[] = [];

    // 1. Supplier ordered vs received (all suppliers)
    if (analytics?.bySupplier?.length) {
      const sorted = [...analytics.bySupplier]
        .sort((a, b) => b.orderedKg - a.orderedKg);
      const categories = sorted.map((s) =>
        s.supplierName.length > 20 ? `${s.supplierName.slice(0, 18)}…` : s.supplierName
      );
      const chartHeight = Math.max(340, sorted.length * 28);
      result.push({
        key: "supplier",
        title: `Supplier Performance (${sorted.length})`,
        subtitle: "Ordered vs received (kg) — click a bar to drill down",
        icon: "ri-building-2-line",
        color: "purple",
        type: "bar",
        height: chartHeight,
        span: "xl:col-span-7 col-span-12",
        options: {
          chart: {
            type: "bar",
            toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } },
            events: {
              dataPointSelection: (
                _e: unknown,
                _ctx: unknown,
                cfg: { seriesIndex: number; dataPointIndex: number }
              ) => {
                if (cfg.seriesIndex !== 0 || !onSupplierBarSelect) return;
                const row = sorted[cfg.dataPointIndex];
                if (row) onSupplierBarSelect(row.supplierId, row.supplierName);
              },
            },
          },
          plotOptions: {
            bar: { horizontal: false, columnWidth: "60%", borderRadius: 4 },
          },
          dataLabels: { enabled: false },
          stroke: { show: true, width: 2, colors: ["transparent"] },
          xaxis: {
            categories,
            labels: { style: { fontSize: "10px", fontWeight: 600 }, rotate: -35, rotateAlways: categories.length > 6 },
          },
          yaxis: {
            labels: { style: { fontSize: "10px" }, formatter: (v: number) => `${Math.round(v)}` },
            title: { text: "Kilograms", style: { fontSize: "10px", fontWeight: 600 } },
          },
          fill: { opacity: 1 },
          legend: { position: "top", fontSize: "11px", fontWeight: 600 },
          tooltip: {
            y: { formatter: (v: number) => `${v.toLocaleString()} kg` },
          },
          colors: ["#7c3aed", "#10b981"],
          grid: { borderColor: "#f1f1f1", strokeDashArray: 3 },
        },
        series: [
          { name: "Ordered kg", data: sorted.map((s) => s.orderedKg) },
          { name: "Received kg", data: sorted.map((s) => s.receivedAcceptedKg) },
        ],
      });
    }

    // 2. Status donut
    if (analytics?.byStatus?.length) {
      const labels = analytics.byStatus.map((x) => x.status.replace(/_/g, " "));
      result.push({
        key: "status",
        title: "PO Status Distribution",
        subtitle: "Current status mix across purchase orders",
        icon: "ri-pie-chart-2-line",
        color: "indigo",
        type: "donut",
        height: 340,
        span: "xl:col-span-5 col-span-12",
        options: {
          chart: { type: "donut", toolbar: { show: false } },
          labels,
          legend: { position: "bottom", fontSize: "11px", fontWeight: 600 },
          plotOptions: {
            pie: {
              donut: {
                size: "65%",
                labels: {
                  show: true,
                  total: { show: true, label: "Total POs", fontSize: "11px", fontWeight: "700" },
                },
              },
            },
          },
          dataLabels: {
            enabled: true,
            formatter: (_val: number, opts: { seriesIndex: number; w: { globals: { series: number[] } } }) => {
              return opts.w.globals.series[opts.seriesIndex].toString();
            },
            style: { fontSize: "11px", fontWeight: 700 },
          },
          colors: ["#6b7280", "#3b82f6", "#6366f1", "#f59e0b", "#14b8a6", "#f97316", "#ef4444", "#22c55e", "#10b981"],
          stroke: { width: 2, colors: ["#fff"] },
        } as ApexOptions,
        series: analytics.byStatus.map((x) => x.count),
      });
    }

    // 3. All yarns by ordered qty
    if (analytics?.byYarn?.length) {
      const allYarns = [...analytics.byYarn].sort((a, b) => b.orderedKg - a.orderedKg);
      const yarnChartHeight = Math.max(360, allYarns.length * 28);
      result.push({
        key: "yarn",
        title: `Yarns by Ordered Qty (${allYarns.length})`,
        subtitle: "All yarn catalogs by total ordered kilograms",
        icon: "ri-shopping-bag-line",
        color: "blue",
        type: "bar",
        height: yarnChartHeight,
        span: "xl:col-span-6 col-span-12",
        options: {
          chart: { type: "bar", toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } } },
          plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "70%" } },
          dataLabels: {
            enabled: allYarns.length <= 20,
            formatter: (v: number) => `${v.toLocaleString()} kg`,
            style: { fontSize: "10px", fontWeight: 600 },
            offsetX: 5,
          },
          xaxis: {
            categories: allYarns.map((y) =>
              y.yarnName.length > 24 ? `${y.yarnName.slice(0, 22)}…` : y.yarnName
            ),
            labels: { style: { fontSize: "10px" } },
          },
          yaxis: { labels: { style: { fontSize: "10px", fontWeight: 600 } } },
          tooltip: { y: { formatter: (v: number) => `${v.toLocaleString()} kg` } },
          colors: ["#6366f1"],
          grid: { borderColor: "#f1f1f1", strokeDashArray: 3, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
        },
        series: [{ name: "Ordered kg", data: allYarns.map((y) => y.orderedKg) }],
      });
    }

    // 4. Movements by transaction type
    if (transactionAnalytics?.byType?.length) {
      const rows = [...transactionAnalytics.byType].sort((a, b) => b.kg - a.kg);
      result.push({
        key: "txn",
        title: "Inventory Movements",
        subtitle: "Kilograms moved by transaction type",
        icon: "ri-exchange-line",
        color: "teal",
        type: "bar",
        height: 360,
        span: "xl:col-span-6 col-span-12",
        options: {
          chart: { type: "bar", toolbar: { show: false } },
          plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "65%" } },
          dataLabels: {
            enabled: true,
            formatter: (v: number) => `${v.toLocaleString()} kg`,
            style: { fontSize: "10px", fontWeight: 600 },
            offsetX: 5,
          },
          xaxis: {
            categories: rows.map((r) => r.transactionType.replace(/_/g, " ")),
            labels: { style: { fontSize: "10px" } },
          },
          yaxis: { labels: { style: { fontSize: "10px", fontWeight: 600 } } },
          tooltip: {
            y: { formatter: (v: number) => `${v.toLocaleString()} kg` },
          },
          colors: ["#0d9488"],
          grid: { borderColor: "#f1f1f1", strokeDashArray: 3, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
        },
        series: [{ name: "Kg", data: rows.map((r) => r.kg) }],
      });
    }

    // 5. Closing trend
    if (closingTrend?.series?.length) {
      const dates = closingTrend.series.map((p) => p.date);
      const values = closingTrend.series.map((p) => p.closingKg);
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);

      result.push({
        key: "trend",
        title: "Closing Inventory Trend",
        subtitle: "Daily closing stock (kg) for selected yarn",
        icon: "ri-line-chart-line",
        color: "violet",
        type: "area",
        height: 300,
        span: "col-span-12",
        options: {
          chart: {
            type: "area",
            toolbar: { show: true, tools: { download: true, selection: true, zoom: true, zoomin: true, zoomout: true, pan: false, reset: true } },
            zoom: { enabled: true },
          },
          dataLabels: { enabled: false },
          stroke: { curve: "smooth", width: 2.5 },
          xaxis: {
            categories: dates,
            labels: { rotate: -45, rotateAlways: dates.length > 15, style: { fontSize: "9px" } },
            tickAmount: Math.min(dates.length, 20),
          },
          yaxis: {
            labels: { style: { fontSize: "10px" }, formatter: (v: number) => `${Math.round(v)}` },
            title: { text: "Closing kg", style: { fontSize: "10px", fontWeight: 600 } },
            min: Math.max(0, minVal - (maxVal - minVal) * 0.1),
          },
          tooltip: {
            y: { formatter: (v: number) => `${v.toLocaleString()} kg` },
          },
          colors: ["#8b5cf6"],
          fill: {
            type: "gradient",
            gradient: {
              shadeIntensity: 1,
              opacityFrom: 0.5,
              opacityTo: 0.05,
              stops: [0, 90, 100],
            },
          },
          grid: { borderColor: "#f1f1f1", strokeDashArray: 3 },
          markers: {
            size: dates.length <= 30 ? 3 : 0,
            colors: ["#8b5cf6"],
            strokeColors: "#fff",
            strokeWidth: 2,
            hover: { size: 5 },
          },
        },
        series: [{ name: "Closing kg", data: values }],
      });
    }

    return result;
  }, [analytics, transactionAnalytics, closingTrend, onSupplierBarSelect]);

  if (charts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center mb-5">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <i className="ri-bar-chart-box-line text-2xl text-gray-400" aria-hidden />
        </div>
        <h3 className="text-sm font-bold text-gray-500 mb-1">No Chart Data</h3>
        <p className="text-[11px] text-gray-400">
          Adjust the date range or filters above, then click Refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4 mb-5">
      {charts.map((chart) => {
        const colors = COLOR_MAP[chart.color] || COLOR_MAP.purple;
        return (
          <div key={chart.key} className={chart.span}>
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Chart header */}
              <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg} ${colors.icon}`}
                  >
                    <i className={`${chart.icon} text-sm`} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider truncate">
                      {chart.title}
                    </h3>
                    <p className="text-[10px] text-gray-500 truncate">{chart.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Chart body */}
              <div className="p-2.5">
                <SafeChart
                  options={chart.options}
                  series={chart.series}
                  type={chart.type}
                  height={chart.height}
                  chartTitle={chart.title}
                  fallbackMessage={`Unable to load ${chart.title}`}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
