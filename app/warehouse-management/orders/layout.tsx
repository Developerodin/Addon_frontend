"use client";

import React from "react";

/**
 * Orders route group: list/add/edit/inward live under this segment.
 * Sub-nav tabs were removed — this section is warehouse orders only.
 */
export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <div className="main-content !p-[10px]">{children}</div>;
}
