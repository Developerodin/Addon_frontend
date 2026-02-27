"use client";
import ContentLayout from "@/app/(components)/(contentlayout)/layout";

export default function VendorPOLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ContentLayout>{children}</ContentLayout>;
}
