"use client";
import ContentLayout from "@/app/(components)/(contentlayout)/layout";
import { Toaster } from "react-hot-toast";

export default function VendorPOLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ContentLayout>
      {children}
      <Toaster
        position="top-center"
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{
          duration: 5000,
          error: { duration: 8000 },
        }}
      />
    </ContentLayout>
  );
}
