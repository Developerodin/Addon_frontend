"use client";
import React from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";

type WhmsModule = {
  title: string;
  description: string;
  icon: string;
  path: string;
  permission: string;
};

type WhmsModuleGroup = {
  title: string;
  description: string;
  modules: WhmsModule[];
};

const WarehouseManagementPage = () => {
  const { hasSubPermission } = useNavigation();

  const moduleGroups: WhmsModuleGroup[] = [
    {
      title: "Order Management",
      description: "Create orders and manage warehouse clients",
      modules: [
        {
          title: "Orders",
          description: "Create, import, and track warehouse orders",
          icon: "ri-file-list-line",
          path: "/warehouse-management/orders",
          permission: "Orders",
        },
        {
          title: "Clients",
          description: "Warehouse clients and store profiles",
          icon: "ri-contacts-line",
          path: "/warehouse-management/clients",
          permission: "Clients",
        },
      ],
    },
    {
      title: "Fulfilment Flow",
      description: "End-to-end order processing — pick through dispatch",
      modules: [
        {
          title: "Pick & Pack",
          description: "Pick lists, barcode printing, and packing",
          icon: "ri-handbag-line",
          path: "/warehouse-management/pick-pack",
          permission: "Pick&Pack",
        },
        {
          title: "Scanning",
          description: "Verify picked quantities before billing",
          icon: "ri-qr-scan-2-line",
          path: "/warehouse-management/scanning",
          permission: "Scanning",
        },
        {
          title: "Billing",
          description: "Generate invoices from scanned quantities",
          icon: "ri-bill-line",
          path: "/warehouse-management/billing",
          permission: "Billing",
        },
        {
          title: "Dispatch",
          description: "Courier details, labels, and shipment confirmation",
          icon: "ri-truck-line",
          path: "/warehouse-management/dispatch",
          permission: "Dispatch",
        },
      ],
    },
    {
      title: "Stock & Inward",
      description: "Goods receipt and inventory management",
      modules: [
        {
          title: "Inward",
          description: "GRN and goods receipt from production or vendor",
          icon: "ri-inbox-unarchive-line",
          path: "/warehouse-management/inward",
          permission: "Inward",
        },
        {
          title: "Stock",
          description: "Live stock levels, movements, and adjustments",
          icon: "ri-stack-line",
          path: "/warehouse-management/stock",
          permission: "Stock",
        },
        {
          title: "Warehouse Layout",
          description: "Racks, zones, and warehouse map",
          icon: "ri-layout-grid-line",
          path: "/warehouse-management/layout",
          permission: "Layout",
        },
      ],
    },
    {
      title: "Returns & Reports",
      description: "Post-dispatch returns and warehouse analytics",
      modules: [
        {
          title: "Returns",
          description: "RTO and customer returns with scan verification",
          icon: "ri-arrow-go-back-line",
          path: "/warehouse-management/returns",
          permission: "Returns",
        },
        {
          title: "Reports",
          description: "Fulfilment, stock flow, and audit reports",
          icon: "ri-file-chart-line",
          path: "/warehouse-management/reports",
          permission: "Reports",
        },
      ],
    },
  ];

  return (
    <div className="main-content">
      <Seo title="Warehouse Management" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">WHMS</h1>
              <p className="text-gray-600 mt-2">
                Warehouse management — orders, fulfilment flow, stock, returns, and reports.
              </p>
            </div>
          </div>

          {moduleGroups.map((group) => (
            <div key={group.title} className="mb-8">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{group.title}</h2>
                <p className="text-sm text-gray-500">{group.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {group.modules.map((module) => {
                  const hasPermission = hasSubPermission("/warehouse-management", module.permission);

                  return (
                    <div key={module.title} className="box group hover:shadow-lg transition-shadow duration-300">
                      <div className="box-body text-center">
                        <div className="mb-4">
                          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full text-primary text-2xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                            <i className={module.icon}></i>
                          </div>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.title}</h3>

                        <p className="text-gray-600 text-sm mb-4">{module.description}</p>

                        {hasPermission ? (
                          <Link href={module.path} className="ti-btn ti-btn-primary ti-btn-sm w-full">
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WarehouseManagementPage;
