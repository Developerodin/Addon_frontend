"use client";

import React from "react";
import Seo from "@/shared/layout-components/seo/seo";

interface ReportPageShellProps {
  /** Browser + H1 title. */
  title: string;
  children: React.ReactNode;
}

/**
 * Shared card chrome for standalone report pages.
 */
export default function ReportPageShell({ title, children }: ReportPageShellProps) {
  return (
    <div className="main-content !p-[10px]">
      <Seo title={title} />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        {children}
      </div>
    </div>
  );
}
