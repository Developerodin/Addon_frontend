"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import {
  yarnInventoryService,
  requisitionMongoId,
  requisitionYarnId,
} from "@/app/yarn-management/dashboard/services/yarnInventoryService";
import type { YarnRequisitionResponse } from "@/app/yarn-management/dashboard/services/yarnInventoryService";

/**
 * Lists yarns staged for purchase order drafting (from requisition list → Mark PO Sent).
 */
export default function DraftPOsPage() {
  const { hasSubPermission, isLoading } = useNavigation();
  const canAccess = hasSubPermission(
    "/yarn-management/purchase-management",
    "Draft POs"
  );

  const [rows, setRows] = useState<YarnRequisitionResponse[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const fetchDraftQueue = useCallback(async () => {
    try {
      setListLoading(true);
      const data = await yarnInventoryService.getAllDraftQueueRequisitions();
      setRows(data);
    } catch (err) {
      console.error("[DraftPOsPage] fetch failed", err);
      toast.error("Could not load draft queue");
      setRows([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess || isLoading) {
      return;
    }
    fetchDraftQueue();
  }, [canAccess, isLoading, fetchDraftQueue]);

  if (isLoading) {
    return (
      <div className="main-content flex justify-center items-center py-16">
        <div
          className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="main-content">
        <Seo title="Draft POs" />
        <div className="box border border-gray-100">
          <div className="box-body text-center py-12">
            <p className="text-sm text-gray-600">
              You don&apos;t have permission to access Draft POs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Draft POs" />
      <div className="box border border-gray-100 shadow-sm">
        <div className="box-header flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60">
          <div>
            <h1 className="text-sm font-bold text-gray-900">Draft POs</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Yarns staged from critical requisitions. Select a supplier on the next
              screen; only yarns that vendor supplies stay on the PO.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/yarn-management/purchase-management/purchase/add?fromDraftQueue=1"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
            >
              <i className="ri-add-line text-xs" aria-hidden />
              New purchase order
            </Link>
            <Link
              href="/yarn-management/purchase-management/requisition-list"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white text-gray-800 text-[11px] font-bold rounded hover:bg-gray-50"
            >
              <i className="ri-list-check text-xs" aria-hidden />
              Requisition list
            </Link>
            <Link
              href="/yarn-management/purchase-management/purchase"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white text-gray-800 text-[11px] font-bold rounded hover:bg-gray-50"
            >
              <i className="ri-file-list-line text-xs" aria-hidden />
              All POs
            </Link>
          </div>
        </div>

        <div className="box-body px-4 py-4">
          {listLoading ? (
            <div className="flex justify-center py-12">
              <div
                className="animate-spin rounded-full h-9 w-9 border-b-2 border-purple-600"
                role="status"
                aria-label="Loading draft list"
              />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-600">
              <div
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-2xl mb-4"
                aria-hidden
              >
                <i className="ri-draft-line" />
              </div>
              <p className="font-semibold text-gray-800">No yarns in draft queue</p>
              <p className="text-[12px] text-gray-500 mt-2 max-w-md mx-auto">
                Use{" "}
                <span className="font-medium text-gray-700">Mark PO Sent</span> on the
                requisition list to stage a yarn here before you raise a PO.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-100 rounded-md">
              <table className="min-w-full text-left text-[11px]">
                <thead className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wide">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Yarn
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Catalog id
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Min
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Available
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Blocked
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => {
                    const rowId = requisitionMongoId(r) ?? r.yarnName;
                    const cid = requisitionYarnId(r) ?? "—";
                    return (
                      <tr key={rowId} className="hover:bg-gray-50/80">
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {r.yarnName}
                        </td>
                        <td className="px-3 py-2 text-gray-500 font-mono text-[10px]">
                          {cid}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.minQty}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.availableQty}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.blockedQty}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
