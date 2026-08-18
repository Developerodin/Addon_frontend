"use client";

import React from "react";
import type { VendorJobPreviewBox } from "@/shared/services/yarnVendorJobService";

interface BoxDetailCardProps {
  box: VendorJobPreviewBox;
  onRemove?: () => void;
}

/**
 * Compact scanned-box card: ids, yarn, weights, location / vendor.
 */
const BoxDetailCard: React.FC<BoxDetailCardProps> = ({ box, onRemove }) => {
  const location = box.storageLocation?.trim()
    ? box.storageLocation
    : box.atVendorAt
      ? `At vendor${box.vendorName ? ` · ${box.vendorName}` : ""}`
      : "Unallocated";

  return (
    <article
      className="relative rounded border border-gray-100 bg-gray-50 px-3 py-2"
      aria-label={`Box ${box.boxId}`}
    >
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 text-gray-400 hover:text-red-500"
          aria-label={`Remove box ${box.boxId}`}
        >
          <i className="ri-close-line text-sm" />
        </button>
      )}
      <div className="pr-5">
        <p className="text-xs font-semibold text-gray-900">
          {box.boxId}
          <span className="ml-2 font-normal text-gray-500">{box.barcode}</span>
        </p>
        <p className="mt-0.5 text-xs text-gray-800">
          {box.yarnName || "—"}
          {box.shadeCode ? <span className="text-gray-500"> · {box.shadeCode}</span> : null}
        </p>
        <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-gray-600">
          <div>
            <dt className="inline text-gray-400">PO </dt>
            <dd className="inline">{box.poNumber || "—"}</dd>
          </div>
          <div>
            <dt className="inline text-gray-400">Lot </dt>
            <dd className="inline">{box.lotNumber || "—"}</dd>
          </div>
          <div>
            <dt className="inline text-gray-400">Net </dt>
            <dd className="inline">{box.netWeight || box.boxWeight || 0} kg</dd>
          </div>
          <div>
            <dt className="inline text-gray-400">Cones </dt>
            <dd className="inline">{box.numberOfCones || 0}</dd>
          </div>
          <div className="col-span-2">
            <dt className="inline text-gray-400">Loc </dt>
            <dd className="inline">{location}</dd>
          </div>
          {box.qcStatus ? (
            <div className="col-span-2">
              <dt className="inline text-gray-400">QC </dt>
              <dd className="inline">{box.qcStatus}</dd>
            </div>
          ) : null}
          {typeof box.daysOut === "number" ? (
            <div className="col-span-2">
              <dt className="inline text-gray-400">Days out </dt>
              <dd className="inline">{box.daysOut}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </article>
  );
};

export default BoxDetailCard;
