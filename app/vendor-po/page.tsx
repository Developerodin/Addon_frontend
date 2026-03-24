"use client";
import React from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";

const VendorPOPage = () => {
  const modules = [
    { title: "Purchase Management", path: "/vendor-po/purchase-management", icon: "ri-shopping-cart-line" },
    { title: "Secondary Checking", path: "/vendor-po/secondary-checking", icon: "ri-checkbox-circle-line" },
    { title: "Washing", path: "/vendor-po/washing", icon: "ri-water-flash-line" },
    { title: "Boarding", path: "/vendor-po/boarding", icon: "ri-airplay-line" },
    { title: "GRN", path: "/vendor-po/grn", icon: "ri-draft-line" },
    { title: "Branding", path: "/vendor-po/branding", icon: "ri-price-tag-3-line" },
    { title: "Final Checking", path: "/vendor-po/final-checking", icon: "ri-check-double-line" },
    { title: "Counting & Dispatch", path: "/vendor-po/counting", icon: "ri-truck-line" },
  ];

  return (
    <div className="main-content">
      <Seo title="Vendor PO" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Vendor PO</h1>
              <p className="text-gray-600 mt-2">
                Manage vendor purchase orders, receiving, checking, GRN, branding, and dispatch.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <div key={module.title} className="box group hover:shadow-lg transition-shadow duration-300">
                <div className="box-body text-center">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full text-primary text-2xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                      <i className={module.icon}></i>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.title}</h3>
                  <Link
                    href={module.path}
                    className="ti-btn ti-btn-primary ti-btn-sm w-full"
                  >
                    Open
                    <i className="ri-arrow-right-line ms-2"></i>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorPOPage;
