"use client";
import React from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";

const YarnMasterPage = () => {
  const { hasSubPermission } = useNavigation();

  const yarnMasterModules = [
    {
      title: "Brand",
      description: "Manage yarn brands",
      icon: "ri-price-tag-line",
      path: "/yarn-management/yarn-master/brand",
      permission: "Brand"
    },
    {
      title: "Yarn Type",
      description: "Manage yarn types",
      icon: "ri-thread-line",
      path: "/yarn-management/yarn-master/yarn-type",
      permission: "Yarn Type"
    },
    {
      title: "Count/Size",
      description: "Manage yarn count and sizes",
      icon: "ri-ruler-line",
      path: "/yarn-management/yarn-master/count-size",
      permission: "Count/Size"
    },
    {
      title: "Color",
      description: "Manage yarn colors",
      icon: "ri-palette-line",
      path: "/yarn-management/yarn-master/color",
      permission: "Color"
    },
    {
      title: "Blend",
      description: "Manage yarn blends",
      icon: "ri-mix-line",
      path: "/yarn-management/yarn-master/blend",
      permission: "Blend"
    }
  ];

  return (
    <div className="main-content">
      <Seo title="Yarn Master" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Yarn Master</h1>
              <p className="text-gray-600 mt-2">
                Manage yarn master data including brands, types, count/sizes, colors, and blends.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {yarnMasterModules.map((module) => {
              const hasPermission = hasSubPermission('/yarn-management/yarn-master', module.permission);
              
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

export default YarnMasterPage;

