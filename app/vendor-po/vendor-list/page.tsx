"use client";
import React from "react";
import Seo from "@/shared/layout-components/seo/seo";
import VendorMasterTab from "./components/VendorMasterTab";
import { CRM } from "./crmUiClasses";

/**
 * Vendor List: Vendor Master CRUD.
 */
const VendorListPage = () => {
  return (
    <div className={CRM.mainContent}>
      <Seo title="Vendor Master" />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <VendorMasterTab />
      </div>
    </div>
  );
};

export default VendorListPage;
