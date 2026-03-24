"use client";

import { useParams } from "next/navigation";
import { VendorReceiveProcessView } from "../VendorReceiveProcessView";

export default function VendorPOReceiveProcessPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  return <VendorReceiveProcessView orderId={orderId} />;
}
