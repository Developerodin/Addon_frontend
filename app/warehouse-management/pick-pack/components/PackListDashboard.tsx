"use client";

import React, { useMemo, useState } from "react";
import type { BarcodeGenerateRequest, PackBatch } from "../types";
import PackTable from "./PackTable";
import PackBatchScreen from "./PackBatchScreen";

interface PackListDashboardProps {
  batches: PackBatch[];
  onSetPackedQty: (batchId: string, orderId: string, itemId: string, packedQty: number) => void;
  onGenerateCarton: (batchId: string) => void;
  onCompletePacking: (batchId: string) => void;
  onGenerateBarcodesForOrder: (args: {
    batchId: string;
    orderId: string;
    itemIds: string[];
    request: BarcodeGenerateRequest;
  }) => Promise<void> | void;
  onAlert?: (message: string) => void;
}

const PackListDashboard: React.FC<PackListDashboardProps> = ({
  batches,
  onSetPackedQty,
  onGenerateCarton,
  onCompletePacking,
  onGenerateBarcodesForOrder,
  onAlert,
}) => {
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);

  const safeBatches = useMemo(() => (Array.isArray(batches) ? batches : []), [batches]);

  const openBatch = useMemo(
    () => (openBatchId ? safeBatches.find((b) => b.id === openBatchId) || null : null),
    [safeBatches, openBatchId]
  );

  const orderStats = useMemo(() => {
    const orders = safeBatches.reduce((acc: any[], b) => {
      const next = Array.isArray((b as any).orders) ? (b as any).orders : [];
      return acc.concat(next);
    }, []);
    return {
      ready: orders.filter((o) => o && o.status === "ready").length,
      packing: orders.filter((o) => o && o.status === "packing").length,
      packed: orders.filter((o) => o && o.status === "packed").length,
      dispatch: orders.filter((o) => o && o.status === "dispatch-ready").length,
    };
  }, [safeBatches]);

  if (openBatch) {
    return (
      <PackBatchScreen
        batch={openBatch}
        onBack={() => setOpenBatchId(null)}
        onSetPackedQty={(orderId, itemId, packedQty) => onSetPackedQty(openBatch.id, orderId, itemId, packedQty)}
        onGenerateCarton={(batchId) => onGenerateCarton(batchId)}
        onCompletePacking={(batchId) => onCompletePacking(batchId)}
        onGenerateBarcodes={(args) => onGenerateBarcodesForOrder(args)}
        onAlert={onAlert}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Orders Ready for Pack</p>
              <p className="text-2xl font-bold text-yellow-700">{orderStats.ready}</p>
            </div>
            <i className="ri-box-3-line text-3xl text-yellow-500"></i>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Packing In Progress</p>
              <p className="text-2xl font-bold text-blue-700">{orderStats.packing}</p>
            </div>
            <i className="ri-loader-4-line text-3xl text-blue-500"></i>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Packed</p>
              <p className="text-2xl font-bold text-green-700">{orderStats.packed}</p>
            </div>
            <i className="ri-checkbox-circle-line text-3xl text-green-500"></i>
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready for Dispatch</p>
              <p className="text-2xl font-bold text-purple-700">{orderStats.dispatch}</p>
            </div>
            <i className="ri-truck-line text-3xl text-purple-500"></i>
          </div>
        </div>
      </div>

      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Pack Batches</h3>
        </div>
        <div className="box-body">
          <PackTable batches={safeBatches} onOpenBatch={(b) => setOpenBatchId(b.id)} />
        </div>
      </div>
    </div>
  );
};

export default PackListDashboard;



