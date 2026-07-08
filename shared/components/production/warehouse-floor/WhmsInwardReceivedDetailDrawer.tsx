"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  whmsWarehouseInventory,
  type WhmsInwardReceiveRow,
  type WhmsWarehouseInventoryDTO,
} from "@/shared/services/whmsService";
import { getProductByCode } from "@/shared/services/productService";
import { inwardReceiveDisplayStyleCode, isMongoObjectIdString, type InwardReceiveStyleCodeMaps } from "./inwardReceiveStyleCodeResolve";
import { isOnHoldStatus, statusBadgeClass } from "./inwardReceiveTableUtils";

type DrawerTab = "details" | "image";

/**
 * Resolve product image URL from warehouse inventory row.
 * @param row - Warehouse inventory DTO
 */
function inventoryProductImageUrl(row: WhmsWarehouseInventoryDTO | null): string {
  if (!row) return "";
  const fromProduct = row.product?.image?.trim();
  if (fromProduct) return fromProduct;
  const fromItemData = row.itemData?.image;
  if (typeof fromItemData === "string" && fromItemData.trim()) return fromItemData.trim();
  return "";
}

/**
 * Reads catalog product image URL (Product.image on factory code).
 * @param product - Product from GET /products/by-code
 */
function catalogProductImageUrl(product: { image?: unknown } | null | undefined): string {
  if (!product) return "";
  const image = product.image;
  return typeof image === "string" && image.trim() ? image.trim() : "";
}

export interface WhmsInwardReceivedDetailDrawerProps {
  detailId: string | null;
  detailRow: WhmsInwardReceiveRow | null;
  /** StyleCode ObjectId → master code + brand fallback; same map as the list tab. */
  styleCodeMaps: InwardReceiveStyleCodeMaps;
  detailLoading: boolean;
  savingId: string | null;
  onClose: () => void;
  onHoldAccept: (row: WhmsInwardReceiveRow) => void;
  onHoldReject: (row: WhmsInwardReceiveRow) => void;
}

export default function WhmsInwardReceivedDetailDrawer({
  detailId,
  detailRow,
  styleCodeMaps,
  detailLoading,
  savingId,
  onClose,
  onHoldAccept,
  onHoldReject,
}: WhmsInwardReceivedDetailDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>("details");
  const [imageRow, setImageRow] = useState<WhmsWarehouseInventoryDTO | null>(null);
  const [catalogImageUrl, setCatalogImageUrl] = useState("");
  const [catalogProductName, setCatalogProductName] = useState("");
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    setTab("details");
    setImageRow(null);
    setCatalogImageUrl("");
    setCatalogProductName("");
  }, [detailId]);

  const displayStyleCode = detailRow
    ? inwardReceiveDisplayStyleCode(detailRow, styleCodeMaps)
    : "";

  /**
   * Load product image: warehouse inventory by style code, then catalog product by factory code.
   * Inward lines often have no warehouse inventory row until accepted qty is posted to stock.
   */
  useEffect(() => {
    if (tab !== "image" || !detailRow) {
      setImageRow(null);
      setCatalogImageUrl("");
      setCatalogProductName("");
      return undefined;
    }

    let cancelled = false;
    setImageLoading(true);
    setImageRow(null);
    setCatalogImageUrl("");
    setCatalogProductName("");

    void (async () => {
      let inventoryRow: WhmsWarehouseInventoryDTO | null = null;

      if (displayStyleCode && displayStyleCode !== "—") {
        try {
          inventoryRow = await whmsWarehouseInventory.getByStyleCode(displayStyleCode);
        } catch {
          inventoryRow = null;
        }
      }

      let catalogImage = "";
      let catalogName = "";
      const factoryCode = detailRow.articleNumber?.trim();
      if (factoryCode) {
        const product = await getProductByCode(factoryCode);
        catalogImage = catalogProductImageUrl(product);
        catalogName = typeof product?.name === "string" ? product.name.trim() : "";
      }

      if (cancelled) return;

      setImageRow(inventoryRow);
      setCatalogImageUrl(catalogImage);
      setCatalogProductName(catalogName);
      setImageLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, detailRow, displayStyleCode]);

  if (!detailId) return null;

  const onHold = Boolean(detailRow && isOnHoldStatus(String(detailRow.status)));
  const busy = detailRow ? savingId === detailRow.id : false;
  const productImageUrl = inventoryProductImageUrl(imageRow) || catalogImageUrl;
  const productName = imageRow?.product?.name ?? catalogProductName ?? detailRow?.articleNumber ?? "—";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col border-l border-gray-200 animate-slide-in-right">
        <div className="flex justify-between items-center p-[10px] border-b border-gray-200 shrink-0">
          <h3 className="text-sm font-bold text-gray-800">Inward receive</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1" aria-label="Close drawer">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-[10px] gap-1 shrink-0">
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 ${
              tab === "details" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500"
            }`}
            onClick={() => setTab("details")}
          >
            Details
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-[11px] font-bold border-b-2 ${
              tab === "image" ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500"
            }`}
            onClick={() => setTab("image")}
          >
            Image
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[10px] text-[11px] space-y-3">
          {detailLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
            </div>
          )}

          {!detailLoading && detailRow && tab === "details" && (
            <dl className="space-y-2">
              <div className="grid grid-cols-[100px_1fr] gap-1 border-b border-gray-100 pb-2">
                <dt className="text-gray-500 font-medium">ID</dt>
                <dd className="font-mono text-[10px] break-all">{detailRow.id}</dd>
              </div>
              {detailRow.inwardSource ? (
                <div className="grid grid-cols-[100px_1fr] gap-1">
                  <dt className="text-gray-500 font-medium">Source</dt>
                  <dd className="font-semibold uppercase text-[10px]">{detailRow.inwardSource}</dd>
                </div>
              ) : null}
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Article</dt>
                <dd className="font-semibold">{detailRow.articleNumber}</dd>
              </div>
              {detailRow.vendorProductionFlowId ? (
                <div className="grid grid-cols-[100px_1fr] gap-1">
                  <dt className="text-gray-500 font-medium">Vendor flow</dt>
                  <dd className="space-y-1">
                    <span className="font-mono text-[10px] break-all block">{detailRow.vendorProductionFlowId}</span>
                    <Link
                      href="/vendor-po/dispatch"
                      className="text-sky-700 font-bold underline text-[10px] inline-block"
                    >
                      Open vendor dispatch
                    </Link>
                  </dd>
                </div>
              ) : null}
              {detailRow.vendorPurchaseOrderId ? (
                <div className="grid grid-cols-[100px_1fr] gap-1">
                  <dt className="text-gray-500 font-medium">VPO id</dt>
                  <dd className="space-y-1">
                    <span className="font-mono text-[10px] break-all block">{detailRow.vendorPurchaseOrderId}</span>
                    <Link
                      href={`/vendor-po/purchase-management/purchase/edit/${encodeURIComponent(detailRow.vendorPurchaseOrderId)}`}
                      className="text-sky-700 font-bold underline text-[10px] inline-block"
                    >
                      Open purchase edit
                    </Link>
                  </dd>
                </div>
              ) : null}
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Qty factory</dt>
                <dd className="tabular-nums font-bold text-teal-800">{(detailRow.QuantityFromFactory ?? 0).toLocaleString()}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Received qty</dt>
                <dd className="tabular-nums font-bold text-gray-900">{(detailRow.receivedQuantity ?? 0).toLocaleString()}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Style</dt>
                <dd className="break-words space-y-0.5">
                  <span className="font-semibold text-gray-900">{displayStyleCode}</span>
                  {isMongoObjectIdString(detailRow.styleCode) ? (
                    <span className="block text-[10px] font-mono text-gray-500 break-all" title="Style code document id">
                      id {detailRow.styleCode}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Brand</dt>
                <dd className="break-words">{detailRow.brand}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Status</dt>
                <dd>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadgeClass(String(detailRow.status))}`}>
                    {detailRow.status}
                  </span>
                </dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">Received at</dt>
                <dd>{detailRow.receivedAt ? new Date(detailRow.receivedAt).toLocaleString() : "—"}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <dt className="text-gray-500 font-medium">WH line id</dt>
                <dd className="font-mono text-[10px] break-all">{detailRow.warehouseReceivedLineId ?? "—"}</dd>
              </div>
            </dl>
          )}

          {!detailLoading && detailRow && tab === "image" && (
            <div className="space-y-3">
              {imageLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
                </div>
              ) : (
                <>
                  <dl className="space-y-2">
                    <div className="grid grid-cols-[100px_1fr] gap-1 border-b border-gray-100 pb-2">
                      <dt className="text-gray-500 font-medium">Product</dt>
                      <dd className="font-semibold">{productName}</dd>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-1 border-b border-gray-100 pb-2">
                      <dt className="text-gray-500 font-medium">Style</dt>
                      <dd>{displayStyleCode}</dd>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-1 border-b border-gray-100 pb-2">
                      <dt className="text-gray-500 font-medium">Brand</dt>
                      <dd>{detailRow.brand || "—"}</dd>
                    </div>
                  </dl>
                  {productImageUrl ? (
                    <figure className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={productImageUrl}
                        alt={productName !== "—" ? `${productName} product image` : "Product image"}
                        className="w-full max-h-[420px] object-contain bg-white"
                      />
                    </figure>
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-center px-4"
                      role="status"
                      aria-label="No product image available"
                    >
                      <i className="ri-image-line text-3xl text-gray-300 mb-2" aria-hidden />
                      <p className="text-[11px] font-semibold text-gray-500">No product image</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        No image on this product in Catalog → Items, and no warehouse inventory row yet for this style.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!detailLoading && detailRow && onHold && (
            <div className="p-[10px] border-t border-gray-200 mt-2 space-y-2">
              <p className="text-[10px] text-amber-800">On hold — accept or reject this line.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onHoldAccept(detailRow)}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-40"
                >
                  {busy ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-check-line" />}
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => onHoldReject(detailRow)}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 disabled:opacity-40"
                >
                  <i className="ri-close-line" />
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
