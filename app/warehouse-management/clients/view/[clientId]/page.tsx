"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy URL: redirects to list with ?view= so the detail drawer opens. */
export default function WarehouseClientViewRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = (params?.clientId as string) || "";

  useEffect(() => {
    if (clientId) {
      router.replace(`/warehouse-management/clients?view=${encodeURIComponent(clientId)}`);
    }
  }, [clientId, router]);

  return (
    <div className="main-content !p-[10px] flex items-center justify-center min-h-[40vh]">
      <i className="ri-loader-4-line animate-spin text-2xl text-purple-500" />
    </div>
  );
}
