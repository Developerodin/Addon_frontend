"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsPickListBatches,
  type PickListBatchDetail,
} from "@/shared/services/whmsPickListBatchService";
import BatchPickDetail from "../components/BatchPickDetail";

/**
 * Pick-list batch detail page — pick entry, barcode print, send to scanning.
 */
export default function PickBatchDetailPage() {
  const params = useParams();
  const batchId = String(params.batchId || "");
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState<PickListBatchDetail | null>(null);

  const loadBatch = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const data = await whmsPickListBatches.get(batchId);
      setBatch(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load pick list");
      setBatch(null);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void loadBatch();
  }, [loadBatch]);

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title={batch?.batchNumber ? `Pick List ${batch.batchNumber}` : "Pick List"} />

      <div className="box">
        <div className="box-body">
          {loading ? (
            <div className="py-16 text-center text-gray-500">
              <i className="ri-loader-4-line animate-spin text-xl" aria-hidden />
            </div>
          ) : batch ? (
            <BatchPickDetail batch={batch} onBatchUpdated={setBatch} />
          ) : (
            <div className="py-16 text-center text-gray-500">Pick list not found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
