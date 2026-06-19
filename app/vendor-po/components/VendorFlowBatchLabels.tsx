"use client";

import React from "react";
import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";
import {
  getArticleVendorCode,
  getProductName,
} from "../utils/groupVendorProductionFlows";

/**
 * Resolves a short batch label from reference code or flow id suffix.
 * @param flow - Vendor production flow document
 */
export function getFlowBatchRef(flow: VendorProductionFlow): string {
  return flow.referenceCode?.trim() || flow.id.slice(-6);
}

type ArticleMetaProps = {
  flow: VendorProductionFlow;
  className?: string;
};

/**
 * Product name and article vendor code for a production flow batch.
 */
export function VendorFlowArticleMeta({ flow, className }: ArticleMetaProps) {
  const productName = getProductName(flow);
  const vendorCode = getArticleVendorCode(flow);

  return (
    <div className={className}>
      <div>
        Product: <strong className="text-gray-900">{productName}</strong>
      </div>
      <div>
        Vendor code:{" "}
        <strong className="font-mono text-gray-800">{vendorCode}</strong>
      </div>
    </div>
  );
}

type StagingHeaderProps = {
  flow: VendorProductionFlow;
  children?: React.ReactNode;
};

/**
 * Gray summary block used at the top of container staging / transfer modals.
 */
export function VendorStagingBatchHeader({ flow, children }: StagingHeaderProps) {
  return (
    <div className="p-2 rounded border border-gray-200 bg-gray-50 space-y-1">
      <div>
        Batch: <strong>{getFlowBatchRef(flow)}</strong>
      </div>
      <VendorFlowArticleMeta flow={flow} />
      {children}
    </div>
  );
}
