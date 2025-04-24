"use client"
import ContentLayout from "@/app/(components)/(contentlayout)/layout"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ContentLayout>{children}</ContentLayout>
} 