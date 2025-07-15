"use client";
import { Visitorsbychannel } from "@/shared/data/dashboards/analyticsdata";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import React, { Fragment, useMemo, useCallback } from "react";
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

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

// Add performance optimizations
const chartOptions = {
  chart: {
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 800,
      animateGradually: {
        enabled: true,
        delay: 150
      },
      dynamicAnimation: {
        enabled: true,
        speed: 350
      }
    },
    redrawOnWindowResize: false,
    redrawOnParentResize: false
  }
};

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

  if (loading) {
    return (
      <Fragment>
        <Seo title={"Analytics"} />
        <Pageheader
          currentpage="Analytics"
          activepage="Dashboards"
          mainpage="Analytics"
        />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            <p className="text-gray-600 animate-pulse">Loading dashboard data...</p>
          </div>
        </div>
      </Fragment>
    );
  }

  if (error) {
    return (
      <Fragment>
        <Seo title={"Analytics"} />
        <Pageheader
          currentpage="Analytics"
          activepage="Dashboards"
          mainpage="Analytics"
        />
        <div className="flex items-center justify-center h-64"  style={{border: "1px solid red"}}>
          <div className="text-center space-y-4">
            <div className="text-red-500 p-4 bg-red-50 rounded-lg border border-red-200">
              <i className="ri-error-warning-line text-2xl mb-2 block"></i>
              <p className="mb-4">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="ti-btn ti-btn-primary transition-all duration-200 hover:scale-105"
            >
              <i className="ri-refresh-line mr-2"></i>
              Retry
            </button>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title={"Analytics"} />
      <Pageheader
        currentpage="Analytics"
        activepage="Dashboards"
        mainpage="Analytics"
      />

      {/* Period Selector */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium whitespace-nowrap">Period:</span>
          {["week", "month", "quarter"].map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodUpdate(p as "week" | "month" | "quarter")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out whitespace-nowrap min-w-[60px] ${
                period === p
                  ? "bg-primary text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <button
            onClick={handleRefresh}
            style={{border: "1px solid red"}}
            className="ml-auto  ti-btn-outline-primary  transition-all duration-200 hover:bg-primary hover:text-white border-primary text-primary hover:shadow-md whitespace-nowrap flex items-center gap-2 px-3 py-1.5 text-sm font-medium"
          >
            <i className="ri-refresh-line text-base"></i>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 animate-fade-in">
        <div className="xl:col-span-12 col-span-12" >
          <div className="grid grid-cols-12 gap-6">
            <div className="xl:col-span-3 lg:col-span-4 md:col-span-4 sm:col-span-6 col-span-12">
              <div className="box h-full transition-all duration-300 hover:shadow-lg" style={{ maxHeight: "135px" }}>
                <div className="box-body">
                  <div className="flex flex-wrap items-center justify-between">
                    <div>
                      <h6 className="font-semibold mb-3 text-[1rem]">
                        Total Sale
                      </h6>
                      <span className="text-[1.5625rem] font-semibold">
                        {formatCurrency(overviewTotals.totalNSV)}
                      </span>
                      <span
                        className={`block text-[0.75rem] ${
                          overviewTotals.salesChange >= 0
                            ? "text-success"
                            : "text-danger"
                        }`}
                      >
                        {overviewTotals.salesChange >= 0 ? "+" : ""}
                        {formatPercentage(overviewTotals.salesChange)}
                        <i
                          className={`ti ti-trending-${
                            overviewTotals.salesChange >= 0 ? "up" : "down"
                          } ms-1`}
                        ></i>
                      </span>
                    </div>
                    <div id="analytics-users">
                      <ReactApexChart
                        options={Analyticsdata.Totalusers.options}
                        series={Analyticsdata.Totalusers.series}
                        type="line"
                        height={40}
                        width={120}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="xl:col-span-3 lg:col-span-4 md:col-span-4 sm:col-span-6 col-span-12">
              <div className="box h-full transition-all duration-300 hover:shadow-lg" style={{ maxHeight: "135px" }}>
                <div className="box-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="font-semibold mb-3 text-[1rem]">
                        Total Orders
                      </h6>
                      <span className="text-[1.5625rem] font-semibold">
                        {formatNumber(overviewTotals.totalOrders)}
                      </span>
                      <span
                        className={`block text-[0.75rem] ${
                          overviewTotals.salesChange >= 0
                            ? "text-success"
                            : "text-danger"
                        }`}
                      >
                        {overviewTotals.salesChange >= 0 ? "+" : ""}
                        {formatPercentage(overviewTotals.salesChange)}
                        <i
                          className={`ti ti-trending-${
                            overviewTotals.salesChange >= 0 ? "up" : "down"
                          } ms-1 inline-flex`}
                        ></i>
                      </span>
                    </div>
                    <div>
                      <span className="avatar avatar-md bg-secondary text-white">
                        <i className="ri-shopping-cart-line"></i>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="xl:col-span-3 lg:col-span-4 md:col-span-4 sm:col-span-6 col-span-12">
              <div className="box overflow-hidden h-full transition-all duration-300 hover:shadow-lg" style={{ maxHeight: "135px" }}>
                <div className="box-body mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="font-semibold text-primary mb-4 text-[1rem]">
                        Weekly Trend
                      </h6>
                      <span className="text-[1.5625rem] flex items-center">
                        {formatPercentage(overviewTotals.salesChange)}{" "}
                        <span className=" text-[0.75rem] text-warning opacity-[0.7] ms-2">
                          +{formatPercentage(overviewTotals.salesChange)}
                          <i className="ti ti-arrow-big-up-line ms-1 inline-flex"></i>
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                <div id="analytics-bouncerate" className="mt-1 w-full">
                  <ReactApexChart
                    options={Analyticsdata.Bouncerate.options}
                    series={Analyticsdata.Bouncerate.series}
                    type="line"
                    height={40}
                    width={"100%"}
                  />
                </div>
              </div>
            </div>

            <div className="xl:col-span-3 lg:col-span-4 md:col-span-4 sm:col-span-6 col-span-12">
              <div
                className="box custom-card upgrade-card text-white transition-all duration-300 hover:shadow-lg hover:scale-105"
                style={{ maxHeight: "135px" }}
              >
                <div className="box-body text-white">
                  <span className="avatar avatar-xxl !border-0">
                    <img src="../../assets/images/media/media-84.png" alt="" />
                  </span>
                  <div className="upgrade-card-content">
                    {/* <span className="opacity-[0.7] font-normal mt-2 mb-1 !text-white">Plan is expiring !</span> */}
                    <span className="text-[0.9375rem] font-semibold block mb-[2rem] upgrade-text !text-white">
                      Forecasts Updated
                    </span>
                    <button
                      type="button"
                      className="ti-btn !py-1 !px-2 bg-light text-defaulttextcolor !text-[0.75rem] font-medium ti-btn-wave"
                    >
                      Explore now
                    </button>
                  </div>
                </div>
              </div>
              
            </div>

            <div className="xl:col-span-12 col-span-12">
              <div className="box transition-all duration-300 hover:shadow-lg">
                <div className="box-header justify-between">
                  <div className="box-title">Monthly NSV & Qty Trend</div>
                  <div>
                    <Link
                      href="/analytics/all-sales-data"
                      className="ti-btn ti-btn-primary ti-btn-wave !font-medium"
                    >
                      <i className="ri-external-link-line me-1 align-middle inline-block"></i>
                      View All
                    </Link>
                  </div>
                </div>
                <div className="box-body">
                  <div id="audienceReport">
                    <ReactApexChart
                      options={{
                        ...chartOptions,
                        chart: {
                          type: "bar" as const,
                          height: 257,
                          toolbar: { show: false },
                          background: "transparent",
                          stacked: false,
                          dropShadow: {
                            enabled: true,
                            color: "#000",
                            top: 10,
                            left: 5,
                            blur: 8,
                            opacity: 0.15,
                          },
                        },
                        plotOptions: {
                          bar: {
                            horizontal: false,
                            columnWidth: "55%",
                            borderRadius: 6,
                            dataLabels: {
                              position: "top",
                            },
                          },
                        },
                        colors: ["#6366f1", "#10b981", "#f59e0b"],
                        dataLabels: {
                          enabled: false,
                        },
                        grid: {
                          borderColor: "#e2e8f0",
                          strokeDashArray: 5,
                          xaxis: {
                            lines: {
                              show: true,
                            },
                          },
                          yaxis: {
                            lines: {
                              show: true,
                            },
                          },
                        },
                        xaxis: {
                          categories:
                            monthlyTrendsData.categories.length > 0
                              ? monthlyTrendsData.categories
                              : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                          labels: {
                            style: {
                              colors: "#64748b",
                              fontSize: "12px",
                              fontFamily: "Inter, sans-serif",
                            },
                          },
                          axisBorder: {
                            show: false,
                          },
                          axisTicks: {
                            show: false,
                          },
                        },
                        yaxis: [
                          {
                            title: {
                              text: "NSV (₹)",
                              style: {
                                color: "#64748b",
                                fontSize: "12px",
                                fontFamily: "Inter, sans-serif",
                              },
                            },
                            labels: {
                              formatter: (value: number) =>
                                formatCurrency(value),
                              style: {
                                colors: "#64748b",
                                fontSize: "11px",
                              },
                            },
                          },
                          {
                            opposite: true,
                            title: {
                              text: "Quantity/Orders",
                              style: {
                                color: "#64748b",
                                fontSize: "12px",
                              },
                            },
                            labels: {
                              style: {
                                colors: "#64748b",
                                fontSize: "11px",
                              },
                            },
                          },
                        ],
                        legend: {
                          position: "top" as const,
                          horizontalAlign: "right" as const,
                          fontSize: "12px",
                          fontFamily: "Inter, sans-serif",
                          markers: {
                            radius: 4,
                            width: 12,
                            height: 12,
                          },
                        },
                        tooltip: {
                          theme: "dark",
                          style: {
                            fontSize: "12px",
                          },
                          y: {
                            formatter: (
                              value: number,
                              { seriesIndex }: any
                            ) => {
                              if (seriesIndex === 0)
                                return formatCurrency(value);
                              return formatNumber(value);
                            },
                          },
                        },
                        fill: {
                          opacity: 0.9,
                          gradient: {
                            shade: "light",
                            type: "vertical",
                            shadeIntensity: 0.1,
                            gradientToColors: ["#6366f1", "#10b981", "#f59e0b"],
                            inverseColors: false,
                            opacityFrom: 0.9,
                            opacityTo: 0.7,
                            stops: [0, 100],
                          },
                        },
                      }}
                      series={[
                        {
                          name: "NSV",
                          data:
                            monthlyTrendsData.nsvSeries.length > 0
                              ? monthlyTrendsData.nsvSeries
                              : [0, 0, 0, 0, 0, 0],
                        },
                        {
                          name: "Quantity",
                          data:
                            monthlyTrendsData.quantitySeries.length > 0
                              ? monthlyTrendsData.quantitySeries
                              : [0, 0, 0, 0, 0, 0],
                        },
                        {
                          name: "Orders",
                          data:
                            monthlyTrendsData.ordersSeries.length > 0
                              ? monthlyTrendsData.ordersSeries
                              : [0, 0, 0, 0, 0, 0],
                        },
                      ]}
                      type="bar"
                      width={"100%"}
                      height={257}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

       
      </div>


      <div className="xl:col-span-6 xl:col-span-12 col-span-12">
        <div className="box h-full transition-all duration-300 hover:shadow-lg">
                      <div className="box-header justify-between">
              <div className="box-title">Top 5 Stores</div>
              <div>
                <Link
                  href="/analytics/all-stores-performance"
                  className="ti-btn ti-btn-primary 1 !text-[0.85rem] !m-0 !font-medium"
                >
                  View All
                </Link>
              </div>
            </div>
          <div className="box-body !p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pie Chart Section */}
              <div className="flex justify-center items-center">
                <div id="sessions" className="w-full max-w-[280px]">
                  <ReactApexChart
                    options={{
                      ...chartOptions,
                      chart: {
                        type: "donut" as const,
                        height: 250,
                        background: "transparent",
                                              dropShadow: {
                        enabled: false,
                      },
                      },
                      labels:
                        storePerformanceData.labels.length > 0
                          ? storePerformanceData.labels
                          : [
                              "Store 1",
                              "Store 2",
                              "Store 3",
                              "Store 4",
                              "Store 5",
                            ],
                      colors: [
                        "#6366f1",
                        "#10b981",
                        "#f59e0b",
                        "#ef4444",
                        "#8b5cf6",
                      ],
                      legend: {
                        show: false,
                      },
                      tooltip: {
                        theme: "dark",
                        style: {
                          fontSize: "13px",
                        },
                        y: {
                          formatter: (value: number) => formatCurrency(value),
                          title: {
                            formatter: () => "NSV: ",
                          },
                        },
                      },
                      dataLabels: {
                        enabled: false,
                      },
                      plotOptions: {
                        pie: {
                          donut: {
                            size: "60%",
                            background: "transparent",
                            labels: {
                              show: true,
                              name: {
                                show: true,
                                fontSize: "13px",
                                fontFamily: "Inter, sans-serif",
                                fontWeight: "600",
                                color: "#64748b",
                              },
                              value: {
                                show: true,
                                fontSize: "16px",
                                fontFamily: "Inter, sans-serif",
                                fontWeight: "700",
                                color: "#1e293b",
                                formatter: (val: string) =>
                                  formatCurrency(parseFloat(val)),
                              },
                              total: {
                                show: true,
                                label: "Total NSV",
                                fontSize: "11px",
                                fontFamily: "Inter, sans-serif",
                                fontWeight: "600",
                                color: "#64748b",
                                formatter: (w: any) => {
                                  const total = w.globals.seriesTotals.reduce(
                                    (a: number, b: number) => a + b,
                                    0
                                  );
                                  return formatCurrency(total);
                                },
                              },
                            },
                          },
                        },
                      },
                    }}
                    series={
                      storePerformanceData.series.length > 0
                        ? storePerformanceData.series
                        : [0, 0, 0, 0, 0]
                    }
                    type="donut"
                    width={"100%"}
                    height={250}
                  />
                </div>
              </div>

              {/* Store Details Section */}
              <div className="flex flex-col justify-center">
                <div className="table-responsive">
                  <table className="table table-hover min-w-full">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="text-start text-xs font-medium text-gray-500 w-2/3"
                        >
                          Store
                        </th>
                        <th
                          scope="col"
                          className="text-start text-xs font-medium text-gray-500 w-1/6"
                        >
                          NSV
                        </th>
                        <th
                          scope="col"
                          className="text-start text-xs font-medium text-gray-500 w-1/6"
                        >
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.storePerformance
                        .slice(0, 5)
                        .map((store, index) => {
                          const totalNSV = data.storePerformance.reduce(
                            (sum, s) => sum + s.totalNSV,
                            0
                          );
                          const percentage =
                            totalNSV > 0
                              ? ((store.totalNSV / totalNSV) * 100).toFixed(1)
                              : "0.0";
                          return (
                            <tr
                              key={store._id}
                              className="border-t border-gray-100 hover:bg-gray-50"
                            >
                              <td>
                                <div className="flex items-center">
                                  <span className="avatar avatar-rounded avatar-sm p-1 bg-light me-2 flex-shrink-0">
                                    <i className="ri-store-line text-xs text-primary"></i>
                                  </span>
                                  <div
                                    className="font-medium text-xs break-words min-w-0"
                                    title={store.storeName}
                                  >
                                    {store.storeName}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="text-success font-medium text-xs">
                                  {formatCurrency(store.totalNSV)}
                                </span>
                              </td>
                              <td>
                                <span className="text-gray-600 text-xs">
                                  {percentage}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      {data.storePerformance.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-4">
                            <span className="text-gray-500 text-xs">
                              No store data available
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6" style={{ marginTop: "20px" }}>
        <div className="xxl:col-span-12 xl:col-span-12 col-span-12">
          <div className="box h-full transition-all duration-300 hover:shadow-lg">
            <div className="box-header justify-between">
              <div className="box-title">Demand Forecast vs Actual Demand</div>
              {/* <div className="hs-dropdown ti-dropdown">
                <Link
                  href="#!"
                  scroll={false}
                  className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50"
                  aria-expanded="false"
                >
                  View All
                  <i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                </Link>
                <ul
                  className="hs-dropdown-menu ti-dropdown-menu hidden"
                  role="menu"
                >
                  <li>
                    <Link
                      className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                      href="#!"
                      scroll={false}
                    >
                      Today
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                      href="#!"
                      scroll={false}
                    >
                      This Week
                    </Link>
                  </li>
                  <li>
                    <Link
                      className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                      href="#!"
                      scroll={false}
                    >
                      Last Week
                    </Link>
                  </li>
                </ul>
              </div> */}
            </div>
            <div className="box-body">
              <div id="country-sessions">
                <ReactApexChart
                  options={{
                    ...chartOptions,
                    chart: {
                      type: "bar" as const,
                      height: 330,
                      toolbar: { show: false },
                      background: "transparent",
                      stacked: false,
                      dropShadow: {
                        enabled: true,
                        color: "#000",
                        top: 10,
                        left: 5,
                        blur: 8,
                        opacity: 0.15,
                      },
                    },
                    plotOptions: {
                      bar: {
                        horizontal: false,
                        columnWidth: "60%",
                        borderRadius: 6,
                        dataLabels: {
                          position: "top",
                        },
                      },
                    },
                    colors: ["#6366f1", "#10b981"],
                    dataLabels: {
                      enabled: false,
                    },
                    grid: {
                      borderColor: "#e2e8f0",
                      strokeDashArray: 5,
                      xaxis: {
                        lines: {
                          show: true,
                        },
                      },
                      yaxis: {
                        lines: {
                          show: true,
                        },
                      },
                    },
                    xaxis: {
                      categories:
                        demandForecastData.categories.length > 0
                          ? demandForecastData.categories
                          : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                      labels: {
                        style: {
                          colors: "#64748b",
                          fontSize: "10px",
                          fontFamily: "Inter, sans-serif",
                        },
                        rotate: -45,
                        rotateAlways: false,
                        maxHeight: 60,
                        trim: true,
                        hideOverlappingLabels: true,
                      },
                      axisBorder: {
                        show: false,
                      },
                      axisTicks: {
                        show: false,
                      },
                    },
                    yaxis: {
                      title: {
                        text: "Quantity",
                        style: {
                          color: "#64748b",
                          fontSize: "12px",
                          fontFamily: "Inter, sans-serif",
                        },
                      },
                      labels: {
                        formatter: (value: number) => formatNumber(value),
                        style: {
                          colors: "#64748b",
                          fontSize: "11px",
                        },
                      },
                    },
                    legend: {
                      position: "top" as const,
                      horizontalAlign: "right" as const,
                      fontSize: "12px",
                      fontFamily: "Inter, sans-serif",
                      markers: {
                        radius: 4,
                        width: 12,
                        height: 12,
                      },
                    },
                    tooltip: {
                      theme: "dark",
                      style: {
                        fontSize: "12px",
                      },
                      y: {
                        formatter: (value: number) => formatNumber(value),
                        title: {
                          formatter: () => "Quantity: ",
                        },
                      },
                    },
                    fill: {
                      opacity: 0.9,
                      gradient: {
                        shade: "light",
                        type: "vertical",
                        shadeIntensity: 0.1,
                        gradientToColors: ["#6366f1", "#10b981"],
                        inverseColors: false,
                        opacityFrom: 0.9,
                        opacityTo: 0.7,
                        stops: [0, 100],
                      },
                    },
                  }}
                  series={[
                    {
                      name: "Actual",
                      data:
                        demandForecastData.actualSeries.length > 0
                          ? demandForecastData.actualSeries
                          : [0, 0, 0, 0, 0, 0],
                    },
                    {
                      name: "Forecast",
                      data:
                        demandForecastData.forecastSeries.length > 0
                          ? demandForecastData.forecastSeries
                          : [0, 0, 0, 0, 0, 0],
                    },
                  ]}
                  type="bar"
                  width={"100%"}
                  height={330}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="xxl:col-span-6 xl:col-span-12 col-span-12">
          <div className="box overflow-hidden h-full transition-all duration-300 hover:shadow-lg">
            <div className="box-header justify-between">
              <div className="box-title">City Performances</div>
              <div>
                <Link
                  href="/analytics/all-cities-performance"
                  className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50 hover:text-primary transition-colors"
                >
                  View All
                  <i className="ri-arrow-right-line align-middle ms-1 inline-block"></i>
                </Link>
              </div>
            </div>
            <div className="box-body !p-0">
              <div className="table-responsive">
                <table className="table table-hover whitespace-nowrap min-w-full">
                  <thead>
                    <tr>
                      <th scope="col" className="text-start">
                        City
                      </th>
                      <th scope="col" className="text-start">
                        NSV
                      </th>
                      <th scope="col" className="text-start">
                        Orders
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cityPerformance.slice(0, 6).map((city, index) => (
                      <tr
                        key={city._id}
                        className="border-t border-inherit border-solid hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10"
                      >
                        <td>
                          <div className="flex items-center">
                            <span className="avatar avatar-rounded avatar-sm p-2 bg-light me-2">
                              <i className="ri-map-pin-fill text-[1.125rem] text-primary"></i>
                            </span>
                            <div className="font-semibold">{city._id}</div>
                          </div>
                        </td>
                        <td>
                          <span className="text-success">
                            {formatCurrency(city.totalNSV)}
                          </span>
                        </td>
                        <td>
                          <div className="progress progress-xs">
                            <div
                              className="progress-bar bg-primary"
                              style={{
                                width: `${Math.min(
                                  (city.totalOrders /
                                    Math.max(
                                      ...data.cityPerformance.map(
                                        (c) => c.totalOrders
                                      ),
                                      1
                                    )) *
                                    100,
                                  100
                                )}%`,
                              }}
                              role="progressbar"
                              aria-valuenow={city.totalOrders}
                              aria-valuemin={0}
                              aria-valuemax={Math.max(
                                ...data.cityPerformance.map(
                                  (c) => c.totalOrders
                                ),
                                1
                              )}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.cityPerformance.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-4">
                          <span className="text-[#8c9097] dark:text-white/50">
                            No city data available
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="xxl:col-span-6 xl:col-span-12 col-span-12">
          <div className="box h-full transition-all duration-300 hover:shadow-lg">
            <div className="box-header">
              <div className="box-title">Category-wise NSV & QTY</div>
            </div>
            <div className="box-body">
              <div id="session-users">
                <ReactApexChart
                  options={{
                    ...chartOptions,
                    chart: {
                      type: "line" as const,
                      height: 325,
                      toolbar: { show: false },
                      background: "transparent",
                      dropShadow: {
                        enabled: true,
                        color: "#000",
                        top: 18,
                        left: 7,
                        blur: 10,
                        opacity: 0.2,
                      },
                    },
                    stroke: {
                      curve: "smooth" as const,
                      width: [4, 3],
                      lineCap: "round",
                    },
                    colors: ["#6366f1", "#10b981"],
                    fill: {
                      type: "gradient",
                      gradient: {
                        shade: "light",
                        type: "vertical",
                        shadeIntensity: 0.1,
                        gradientToColors: ["#6366f1", "#10b981"],
                        inverseColors: false,
                        opacityFrom: 0.8,
                        opacityTo: 0.1,
                        stops: [0, 100],
                      },
                    },
                    grid: {
                      borderColor: "#e2e8f0",
                      strokeDashArray: 5,
                      xaxis: {
                        lines: {
                          show: true,
                        },
                      },
                      yaxis: {
                        lines: {
                          show: true,
                        },
                      },
                    },
                    xaxis: {
                      categories:
                        categoryAnalyticsData.categories.length > 0
                          ? categoryAnalyticsData.categories
                          : [
                              "Category 1",
                              "Category 2",
                              "Category 3",
                              "Category 4",
                              "Category 5",
                            ],
                      labels: {
                        style: {
                          colors: "#64748b",
                          fontSize: "12px",
                          fontFamily: "Inter, sans-serif",
                        },
                      },
                      axisBorder: {
                        show: false,
                      },
                      axisTicks: {
                        show: false,
                      },
                    },
                    yaxis: [
                      {
                        title: {
                          text: "NSV (₹)",
                          style: {
                            color: "#64748b",
                            fontSize: "12px",
                            fontFamily: "Inter, sans-serif",
                          },
                        },
                        labels: {
                          formatter: (value: number) => formatCurrency(value),
                          style: {
                            colors: "#64748b",
                            fontSize: "11px",
                          },
                        },
                      },
                      {
                        opposite: true,
                        title: {
                          text: "Quantity",
                          style: {
                            color: "#64748b",
                            fontSize: "12px",
                          },
                        },
                        labels: {
                          style: {
                            colors: "#64748b",
                            fontSize: "11px",
                          },
                        },
                      },
                    ],
                    legend: {
                      position: "top" as const,
                      horizontalAlign: "right" as const,
                      fontSize: "12px",
                      fontFamily: "Inter, sans-serif",
                      markers: {
                        radius: 4,
                      },
                    },
                    tooltip: {
                      theme: "dark",
                      style: {
                        fontSize: "12px",
                      },
                      y: {
                        formatter: (value: number, { seriesIndex }: any) => {
                          if (seriesIndex === 0) return formatCurrency(value);
                          return formatNumber(value);
                        },
                      },
                    },
                    markers: {
                      size: 6,
                      strokeWidth: 2,
                      strokeColors: "#fff",
                      colors: ["#6366f1", "#10b981"],
                      hover: {
                        size: 8,
                      },
                    },
                  }}
                  series={[
                    {
                      name: "NSV",
                      data:
                        categoryAnalyticsData.nsvSeries.length > 0
                          ? categoryAnalyticsData.nsvSeries
                          : [0, 0, 0, 0, 0],
                    },
                    {
                      name: "Quantity",
                      data:
                        categoryAnalyticsData.quantitySeries.length > 0
                          ? categoryAnalyticsData.quantitySeries
                          : [0, 0, 0, 0, 0],
                    },
                  ]}
                  type="line"
                  width={"100%"}
                  height={325}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
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
    </Fragment>
  );
};

export default Analytics;
