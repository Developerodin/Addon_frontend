"use client";
import React from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";

const WarehouseManagementPage = () => {
  const { hasSubPermission } = useNavigation();

  const warehouseManagementModules = [
    {
      title: "Orders",
      description: "Manage warehouse orders and fulfillment",
      icon: "ri-file-list-line",
      path: "/warehouse-management/orders",
      permission: "Orders"
    },
    {
      title: "Inward",
      description: "GRN and goods receipt / inward processing",
      icon: "ri-inbox-unarchive-line",
      path: "/warehouse-management/inward",
      permission: "Inward"
    },
    {
      title: "Pick&Pack",
      description: "Handle picking and packing operations",
      icon: "ri-handbag-line",
      path: "/warehouse-management/pick-pack",
      permission: "Pick&Pack"
    },
    {
      title: "Layout",
      description: "Manage warehouse layout and zones",
      icon: "ri-layout-grid-line",
      path: "/warehouse-management/layout",
      permission: "Layout"
    },
    {
      title: "Stock",
      description: "Track stock levels and inventory",
      icon: "ri-stack-line",
      path: "/warehouse-management/stock",
      permission: "Stock"
    },
    {
      title: "Reports",
      description: "View warehouse reports and analytics",
      icon: "ri-file-chart-line",
      path: "/warehouse-management/reports",
      permission: "Reports"
    }
  ];

  return (
    <div className="main-content">
      <Seo title="Warehouse Management" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Warehouse Management</h1>
              <p className="text-gray-600 mt-2">
                Comprehensive warehouse management system for orders, inward, picking, packing, layout, stock, and reporting.
              </p>
            </div>
          </div>

          {/* Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {warehouseManagementModules.map((module) => {
              const hasPermission = hasSubPermission('/warehouse-management', module.permission);
              
              return (
                <div key={module.title} className="box group hover:shadow-lg transition-shadow duration-300">
                  <div className="box-body text-center">
                    <div className="mb-4">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full text-primary text-2xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                        <i className={module.icon}></i>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {module.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-4">
                      {module.description}
                    </p>
                    
                    {hasPermission ? (
                      <Link 
                        href={module.path}
                        className="ti-btn ti-btn-primary ti-btn-sm w-full"
                      >
                        Access Module
                        <i className="ri-arrow-right-line ms-2"></i>
                      </Link>
                    ) : (
                      <div className="ti-btn ti-btn-light ti-btn-sm w-full cursor-not-allowed opacity-50">
                        Access Restricted
                        <i className="ri-lock-line ms-2"></i>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="box mt-6">
            <div className="box-header">
              <h3 className="box-title">Quick Overview</h3>
            </div>
            <div className="box-body">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">0</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-gray-600">Pending Pick&Pack</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">0</div>
                  <div className="text-sm text-gray-600">Low Stock Items</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-gray-600">Warehouse Zones</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseManagementPage;

