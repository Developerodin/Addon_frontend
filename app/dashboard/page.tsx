"use client"
import { Visitorsbychannel } from '@/shared/data/dashboards/analyticsdata'
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import React, { Fragment, useEffect } from 'react'
import * as Analyticsdata from "@/shared/data/dashboards/analyticsdata";
import dynamic from "next/dynamic";
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const Analytics = () => {
    const router = useRouter();
    const { isAuthenticated } = useSelector((state: any) => state.auth);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/auth/login');
        }
    }, [isAuthenticated, router]);

    if (!isAuthenticated) {
        return null;
    }

    return (
        <Fragment>
            <Seo title={"Dashboard"} />
            <Pageheader currentpage="Dashboard" activepage="Overview" mainpage="Dashboard" />
            <div className="grid grid-cols-12 gap-x-6">
                <div className="xl:col-span-7 col-span-12">
                    <div className="grid grid-cols-12 gap-x-6">
                        <div className="xl:col-span-4 lg:col-span-4 md:col-span-4 sm:col-span-6 col-span-12">
                            <div className="box">
                                <div className="box-body">
                                    <div className="flex flex-wrap items-center justify-between">
                                        <div>
                                            <h6 className="font-semibold mb-3 text-[1rem]">Total SKUs</h6>
                                            <span className="text-[1.5625rem] font-semibold">2,456</span>
                                            <span className="block text-success text-[0.75rem]">+124 <i className="ti ti-trending-up ms-1"></i></span>
                                        </div>
                                        <div id="analytics-users">
                                            <ReactApexChart
                                            options={Analyticsdata.Totalusers.options}
                                            series={Analyticsdata.Totalusers.series}
                                            type="line" height={40} width={120}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="xl:col-span-4 lg:col-span-4 md:col-span-4 sm:col-span-6 col-span-12">
                            <div className="box">
                                <div className="box-body">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h6 className="font-semibold mb-3 text-[1rem]">Low Stock Alerts</h6>
                                            <span className="text-[1.5625rem] font-semibold">156</span>
                                            <span className="block text-danger text-[0.75rem]">+12<i className="ti ti-trending-down ms-1 inline-flex"></i></span>
                                        </div>
                                        <div>
                                            <span className="avatar avatar-md bg-warning text-white">
                                                <i className="ri-alert-line"></i>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="xl:col-span-4 lg:col-span-4 md:col-span-4 sm:col-span-6 col-span-12">
                            <div className="box overflow-hidden">
                                <div className="box-body mb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h6 className="font-semibold text-primary mb-4 text-[1rem]">Replenishment Rate</h6>
                                            <span className="text-[1.5625rem] flex items-center">87.3% <span className=" text-[0.75rem] text-success opacity-[0.7] ms-2">+2.5<i className="ti ti-arrow-big-up-line ms-1 inline-flex"></i></span></span>
                                        </div>
                                    </div>
                                </div>
                                <div id="analytics-bouncerate" className="mt-1 w-full">
                                    <ReactApexChart
                                            options={Analyticsdata.Bouncerate.options}
                                            series={Analyticsdata.Bouncerate.series}
                                            type="line" height={40} width={"100%"}
                                            />
                                </div>
                            </div>
                        </div>
                        <div className="xl:col-span-12 col-span-12">
                            <div className="box">
                                <div className="box-header justify-between">
                                    <div className="box-title">
                                        Weekly Sales Trend
                                    </div>
                                    <div>
                                        <button type="button" className="ti-btn ti-btn-primary ti-btn-wave !font-medium"><i className="ri-download-2-line me-1 align-middle inline-block"></i>Export</button>
                                    </div>
                                </div>
                                <div className="box-body">
                                    <div id="audienceReport">
                                        <ReactApexChart options={Analyticsdata.AudienceReport.options} series={Analyticsdata.AudienceReport.series} type="line" width={"100%"} height={257} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="xxl:col-span-6 xl:col-span-12 col-span-12">
                            <div className="box">
                                <div className="box-header justify-between">
                                    <div className="box-title">
                                        Region-wise Sales Distribution
                                    </div>
                                    <div className="hs-dropdown ti-dropdown">
                                        <Link href="#!" scroll={false} className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50"
                                            aria-expanded="false">
                                            View All<i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                                        </Link>
                                        <ul className="hs-dropdown-menu ti-dropdown-menu hidden" role="menu">
                                            <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                                                href="#!" scroll={false}>This Week</Link></li>
                                            <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                                                href="#!" scroll={false}>Last Week</Link></li>
                                            <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                                                href="#!" scroll={false}>This Month</Link></li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="box-body">
                                    <div id="country-sessions">
                                        <ReactApexChart options={Analyticsdata.Countries.options} series={Analyticsdata.Countries.series} type="line" width={"100%"} height={330} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="xxl:col-span-6 xl:col-span-12 col-span-12">
                            <div className="box overflow-hidden">
                                <div className="box-header justify-between">
                                    <div className="box-title">
                                        Top Performing SKUs
                                    </div>
                                    <div className="hs-dropdown ti-dropdown">
                                        <Link href="#!" scroll={false} className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50"
                                            aria-expanded="false">
                                            View All<i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                                        </Link>
                                        <ul className="hs-dropdown-menu ti-dropdown-menu hidden" role="menu">
                                            <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                                                href="#!" scroll={false}>This Week</Link></li>
                                            <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                                                href="#!" scroll={false}>Last Week</Link></li>
                                            <li><Link className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium block"
                                                href="#!" scroll={false}>This Month</Link></li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="box-body !p-0">
                                    <div className="table-responsive">
                                        <table className="table table-hover whitespace-nowrap min-w-full">
                                            <thead>
                                                <tr>
                                                    <th scope="col" className="text-start">SKU Code</th>
                                                    <th scope="col" className="text-start">Sales</th>
                                                    <th scope="col" className="text-start">Stock</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-t border-inherit border-solid hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10">
                                                    <td>
                                                        <div className="flex items-center">
                                                            <span className="avatar avatar-rounded avatar-sm p-2 bg-light me-2">
                                                                <i className="ri-shopping-bag-line text-[1.125rem] text-primary"></i>
                                                            </span>
                                                            <div className="font-semibold">SKU-001</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span><i className="ri-arrow-up-s-fill me-1 text-success align-middle text-[1.125rem]"></i>1,234</span>
                                                    </td>
                                                    <td>
                                                        <div className="progress progress-xs">
                                                            <div className="progress-bar bg-primary w-[78%]" role="progressbar" aria-valuenow={78} aria-valuemin={0} aria-valuemax={100}>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr className="border-t border-inherit border-solid hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10">
                                                    <td>
                                                        <div className="flex items-center">
                                                            <span className="avatar avatar-rounded avatar-sm p-2 bg-light me-2">
                                                                <i className="ri-shopping-bag-line text-[1.125rem] text-secondary"></i>
                                                            </span>
                                                            <div className="font-semibold">SKU-002</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span><i className="ri-arrow-up-s-fill me-1 text-success align-middle text-[1.125rem]"></i>987</span>
                                                    </td>
                                                    <td>
                                                        <div className="progress progress-xs">
                                                            <div className="progress-bar bg-primary w-[65%]" role="progressbar" aria-valuenow={65} aria-valuemin={0} aria-valuemax={100}>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr className="border-t border-inherit border-solid hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10">
                                                    <td>
                                                        <div className="flex items-center">
                                                            <span className="avatar avatar-rounded avatar-sm p-2 bg-light me-2">
                                                                <i className="ri-shopping-bag-line text-[1.125rem] text-success"></i>
                                                            </span>
                                                            <div className="font-semibold">SKU-003</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span><i className="ri-arrow-up-s-fill me-1 text-success align-middle text-[1.125rem]"></i>876</span>
                                                    </td>
                                                    <td>
                                                        <div className="progress progress-xs">
                                                            <div className="progress-bar bg-primary w-[45%]" role="progressbar" aria-valuenow={45} aria-valuemin={0} aria-valuemax={100}>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr className="border-t border-inherit border-solid hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10">
                                                    <td>
                                                        <div className="flex items-center">
                                                            <span className="avatar avatar-rounded avatar-sm p-2 bg-light me-2">
                                                                <i className="ri-shopping-bag-line text-[1.125rem] text-info"></i>
                                                            </span>
                                                            <div className="font-semibold">SKU-004</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span><i className="ri-arrow-up-s-fill me-1 text-success align-middle text-[1.125rem]"></i>765</span>
                                                    </td>
                                                    <td>
                                                        <div className="progress progress-xs">
                                                            <div className="progress-bar bg-primary w-[32%]" role="progressbar" aria-valuenow={32} aria-valuemin={0} aria-valuemax={100}>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr className="border-t border-inherit border-solid hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10">
                                                    <td>
                                                        <div className="flex items-center">
                                                            <span className="avatar avatar-rounded avatar-sm p-2 bg-light me-2">
                                                                <i className="ri-shopping-bag-line text-[1.125rem] text-warning"></i>
                                                            </span>
                                                            <div className="font-semibold">SKU-005</div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span><i className="ri-arrow-up-s-fill me-1 text-success align-middle text-[1.125rem]"></i>654</span>
                                                    </td>
                                                    <td>
                                                        <div className="progress progress-xs">
                                                            <div className="progress-bar bg-primary w-[25%]" role="progressbar" aria-valuenow={25} aria-valuemin={0} aria-valuemax={100}>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="xl:col-span-5 col-span-12">
                    <div className="grid grid-cols-12 gap-x-6">
                        <div className="col-span-12">
                            <div className="box">
                                <div className="box-header justify-between">
                                    <div className="box-title">
                                        Manufacturing Status
                                    </div>
                                    <div className="hs-dropdown ti-dropdown">
                                        <Link href="#!" scroll={false} className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50"
                                            aria-expanded="false">
                                            View All<i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                                        </Link>
                                    </div>
                                </div>
                                <div className="box-body">
                                    <div id="manufacturing-status">
                                        <ReactApexChart options={Analyticsdata.ManufacturingStatus.options} series={Analyticsdata.ManufacturingStatus.series} type="bar" width={"100%"} height={300} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-12">
                            <div className="box">
                                <div className="box-header justify-between">
                                    <div className="box-title">
                                        Replenishment Alerts
                                    </div>
                                    <div className="hs-dropdown ti-dropdown">
                                        <Link href="#!" scroll={false} className="px-2 font-normal text-[0.75rem] text-[#8c9097] dark:text-white/50"
                                            aria-expanded="false">
                                            View All<i className="ri-arrow-down-s-line align-middle ms-1 inline-block"></i>
                                        </Link>
                                    </div>
                                </div>
                                <div className="box-body">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-light rounded">
                                            <div className="flex items-center">
                                                <span className="avatar avatar-rounded avatar-sm bg-warning/10 text-warning me-3">
                                                    <i className="ri-alert-line"></i>
                                                </span>
                                                <div>
                                                    <p className="mb-0 font-semibold">SKU-001 Low Stock</p>
                                                    <span className="text-[0.75rem] text-gray-500">Current stock: 45 units</span>
                                                </div>
                                            </div>
                                            <button className="ti-btn ti-btn-primary ti-btn-sm">Replenish</button>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-light rounded">
                                            <div className="flex items-center">
                                                <span className="avatar avatar-rounded avatar-sm bg-warning/10 text-warning me-3">
                                                    <i className="ri-alert-line"></i>
                                                </span>
                                                <div>
                                                    <p className="mb-0 font-semibold">SKU-002 Low Stock</p>
                                                    <span className="text-[0.75rem] text-gray-500">Current stock: 32 units</span>
                                                </div>
                                            </div>
                                            <button className="ti-btn ti-btn-primary ti-btn-sm">Replenish</button>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-light rounded">
                                            <div className="flex items-center">
                                                <span className="avatar avatar-rounded avatar-sm bg-warning/10 text-warning me-3">
                                                    <i className="ri-alert-line"></i>
                                                </span>
                                                <div>
                                                    <p className="mb-0 font-semibold">SKU-003 Low Stock</p>
                                                    <span className="text-[0.75rem] text-gray-500">Current stock: 28 units</span>
                                                </div>
                                            </div>
                                            <button className="ti-btn ti-btn-primary ti-btn-sm">Replenish</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default Analytics;