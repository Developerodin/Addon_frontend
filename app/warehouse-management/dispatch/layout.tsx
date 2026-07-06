"use client";

import React from "react";

/** Layout wrapper for WHMS dispatch screens. */
export default function DispatchLayout({ children }: { children: React.ReactNode }) {
  return <div className="main-content !p-[10px]">{children}</div>;
}
