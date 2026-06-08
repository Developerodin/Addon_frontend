"use client";
import React from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";

const PurchaseManagementPage = () => {
  const { hasSubPermission, isLoading } = useNavigation();

  const purchaseManagementModules = [
    {
      title: "Requisition list",
      description: "Manage yarn requisition requests",
      icon: "ri-file-list-3-line",
      path: "/yarn-management/purchase-management/requisition-list",
      permission: "Requisition list"
    },
    {
      title: "All POs",
      description: "Handle yarn procurement and purchase orders",
      icon: "ri-shopping-cart-line",
      path: "/yarn-management/purchase-management/purchase",
      permission: "Purchase Order"
    },
    {
      title: "PO Received",
      description: "Track and manage received purchase orders",
      icon: "ri-inbox-line",
      path: "/yarn-management/purchase-management/purchase-order-received",
      permission: "Purchase Order Recevied"
    },
    {
      title: "Draft POs",
      description: "Purchase orders saved before supplier submission",
      icon: "ri-draft-line",
      path: "/yarn-management/purchase-management/draft-pos",
      permission: "Draft POs"
    },
    {
      title: "PO Return",
      description: "Rejected purchase orders and return workflow",
      icon: "ri-arrow-go-back-line",
      path: "/yarn-management/purchase-management/po-return",
      permission: "PO Return"
    },
    {
      title: "PO Return Challan",
      description: "Search, view, and reprint vendor return challans",
      icon: "ri-file-list-3-line",
      path: "/yarn-management/purchase-management/po-return-challan",
      permission: "PO Return Challan"
    },
    {
      title: "GRN History",
      description: "Search and reprint yarn goods received notes",
      icon: "ri-file-text-line",
      path: "/yarn-management/grn",
      permission: "GRN History"
    },
    {
      title: "Yarn QC",
      description: "Quality control for yarn purchases",
      icon: "ri-checkbox-circle-line",
      path: "/yarn-management/purchase-management/yarn-qc",
      permission: "Yarn QC"
    }
  ];

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Purchase Management" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Purchase Management</h1>
              <p className="text-gray-600 mt-2">
                Manage yarn procurement, purchase orders, and quality control.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {purchaseManagementModules.map((module) => {
              const hasPermission = hasSubPermission('/yarn-management/purchase-management', module.permission);
              
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
        </div>
      </div>
    </div>
  );
};

export default PurchaseManagementPage;

