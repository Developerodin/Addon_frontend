"use client"
import ContentLayout from "@/app/(components)/(contentlayout)/layout"

export default function StoresLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <ContentLayout>{children}</ContentLayout>
} 