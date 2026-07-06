"use client";

import React from "react";

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return <div className="main-content !p-[10px]">{children}</div>;
}
