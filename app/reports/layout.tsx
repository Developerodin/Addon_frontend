"use client";
import ContentLayout from "@/app/(components)/(contentlayout)/layout";

/**
 * Sidebar + header chrome for standalone report routes.
 */
export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ContentLayout>{children}</ContentLayout>;
}
