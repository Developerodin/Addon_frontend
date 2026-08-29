"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import VendorPOPurchaseListLayout from "../purchase-management/components/VendorPOPurchaseListLayout";
import { VendorGoodsReceivedModal } from "../components/VendorGoodsReceivedModal";
import { VendorPODetailsDrawer } from "../components/VendorPODetailsDrawer";
import { lotDetailsForBulkBoxes, mapVendorPurchaseOrderToUi } from "../utils/vendorPoFlow";
import { vendorPoMatchesDateRange, vendorReceiveInvoiceNumbers } from "./receivePageUtils";
import VendorReceiveOrdersTable from "./VendorReceiveOrdersTable";
import { VendorPO, VendorPOStatus } from "../raise/types";
import vendorPurchaseOrderService, { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import vendorBoxService from "@/shared/services/vendorBoxService";

const getDefaultStartDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().split("T")[0];
};
const getDefaultEndDate = () => new Date().toISOString().split("T")[0];

/** Filters aligned with yarn PO Received (in transit → receipt → process). */
const RECEIVE_STATUS_OPTIONS: { value: "" | "Pending" | VendorPOStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "Pending", label: "In transit (pending receipt)" },
  { value: "In transit", label: "In transit" },
  { value: "Goods partially received", label: "Goods partially received" },
  { value: "Goods received", label: "Goods received" },
];

async function fetchInboundPurchaseOrders(): Promise<VendorPurchaseOrder[]> {
  const base = {
    page: 1,
    limit: 500,
    sortBy: "createdAt:desc" as const,
    populate: "vendor,poItems.productId",
  };
  const [a, b, c] = await Promise.all([
    vendorPurchaseOrderService.list({ ...base, currentStatus: "in_transit" }),
    vendorPurchaseOrderService.list({ ...base, currentStatus: "goods_partially_received" }),
    vendorPurchaseOrderService.list({ ...base, currentStatus: "goods_received" }),
  ]);
  const merged = new Map<string, VendorPurchaseOrder>();
  for (const res of [a, b, c]) {
    for (const po of res.results || []) {
      merged.set(po.id, po);
    }
  }
  return Array.from(merged.values());
}

const VendorPOReceivePage = () => {
  const router = useRouter();
  const { hasSubPermission, isLoading: permLoading } = useNavigation();
  const canAccess = hasSubPermission("/vendor-po", "Vendor PO Receive");
  const [orders, setOrders] = useState<VendorPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "Pending" | VendorPOStatus>("");
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());
  const [goodsModalPo, setGoodsModalPo] = useState<VendorPurchaseOrder | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<VendorPO | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await fetchInboundPurchaseOrders();
      setOrders(raw.map(mapVendorPurchaseOrderToUi));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!vendorPoMatchesDateRange(order, startDate, endDate)) return false;
      const q = searchTerm.toLowerCase();
      const invoiceHit = vendorReceiveInvoiceNumbers(order).some((no) =>
        no.toLowerCase().includes(q)
      );
      const matchesSearch =
        !searchTerm ||
        order.poNo.toLowerCase().includes(q) ||
        order.vendorName.toLowerCase().includes(q) ||
        invoiceHit;
      const pendingQty = order.totalQty - (order.receivedQty ?? 0);
      const isInboundPending =
        order.apiStatus === "in_transit" && pendingQty === order.totalQty && order.totalQty > 0;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "Pending" && isInboundPending) ||
        (statusFilter !== "Pending" && order.status === statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter, startDate, endDate]);

  const canOpenGoodsReceived = (order: VendorPO) => {
    const pending = order.totalQty - (order.receivedQty ?? 0);
    if (pending <= 0) return false;
    const a = order.apiStatus;
    return a === "in_transit" || a === "goods_partially_received" || (a === "goods_received" && pending > 0);
  };

  const canProcess = (order: VendorPO) => {
    const a = order.apiStatus;
    if (a !== "goods_partially_received" && a !== "goods_received") return false;
    const lots = order.rawPurchaseOrder?.receivedLotDetails;
    return !!(lots && lots.some((l) => l.lotNumber?.trim() && Number(l.numberOfBoxes) > 0));
  };

  const processPath = (orderId: string) => `/vendor-po/purchase-management/purchase-order-received/process/${orderId}`;

  const handleProcess = async (order: VendorPO) => {
    const raw = order.rawPurchaseOrder;
    if (!raw) {
      toast.error("Missing PO data");
      return;
    }
    const lots = raw.receivedLotDetails;
    if (!lots?.length) {
      toast.error("Record goods received (with invoice details) before processing.");
      return;
    }
    setProcessingId(order.id);
    try {
      const full = await vendorPurchaseOrderService.getById(order.id);
      const lotDetails = lotDetailsForBulkBoxes(full.vpoNumber, full.receivedLotDetails);
      if (lotDetails.length === 0) {
        toast.error("No valid invoices (invoice number + number of boxes).");
        return;
      }
      const existing = await vendorBoxService.list({
        vpoNumber: full.vpoNumber,
        page: 1,
        limit: 500,
      });
      const existingCount = Array.isArray(existing)
        ? existing.length
        : (existing as { results?: unknown[] }).results?.length ?? 0;
      if (existingCount === 0) {
        await vendorBoxService.bulkCreate({
          vpoNumber: full.vpoNumber,
          lotDetails,
        });
        const totalBoxes = lotDetails.reduce((s, l) => s + l.numberOfBoxes, 0);
        toast.success(`${totalBoxes} box(es) created`);
      } else {
        toast.success("Boxes already exist for this PO");
      }
      router.push(processPath(order.id));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to start process");
    } finally {
      setProcessingId(null);
    }
  };

  const goodsReceivable = useMemo(
    () => filteredOrders.filter(canOpenGoodsReceived),
    [filteredOrders]
  );

  const handleReceiveAgainstPO = () => {
    if (goodsReceivable.length === 0) return;
    if (goodsReceivable.length === 1) {
      const raw = goodsReceivable[0].rawPurchaseOrder;
      if (raw) setGoodsModalPo(raw);
      return;
    }
    document.getElementById("receive-table")?.scrollIntoView({ behavior: "smooth" });
  };

  const selectCls =
    "bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1.5 pr-7 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer max-w-[200px]";

  if (permLoading) {
    return (
      <div className="main-content flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="main-content">
        <Seo title="Vendor Purchase Order Received" />
        <div className="box">
          <div className="box-body text-center py-12">
            <p className="text-gray-500 mb-4">You don&apos;t have permission to access Vendor Purchase Order Received.</p>
            <Link href="/vendor-po/purchase-management" className="ti-btn ti-btn-primary ti-btn-sm">
              Back to Purchase Management
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Seo title="Vendor Purchase Order Received" />
      <VendorPOPurchaseListLayout
        listTitle="Vendor Purchase Order Received"
        count={loading ? 0 : filteredOrders.length}
        searchPlaceholder="Search PO, vendor, or invoice…"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClearDates={() => {
          setStartDate(getDefaultStartDate());
          setEndDate(getDefaultEndDate());
        }}
        headerActions={
          <button
            type="button"
            onClick={handleReceiveAgainstPO}
            disabled={goodsReceivable.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              goodsReceivable.length === 0
                ? "No POs with pending quantity to receive"
                : goodsReceivable.length === 1
                  ? `Goods received — ${goodsReceivable[0].poNo}`
                  : "Scroll to table to choose a PO"
            }
          >
            <i className="ri-inbox-archive-line text-xs" />
            Goods received
          </button>
        }
        filterSlot={
          <>
            <select
              className={selectCls}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | "Pending" | VendorPOStatus)}
            >
              {RECEIVE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white text-gray-600 text-[10px] font-bold rounded border border-gray-200 hover:border-purple-300"
            >
              <i className="ri-download-line text-xs" />
              Export
            </button>
          </>
        }
      >
        <div id="receive-table">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-inbox-line text-xl text-gray-200" />
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              <p className="text-[11px] text-gray-500 max-w-md">
                {searchTerm || statusFilter
                  ? "No orders match your criteria."
                  : "No POs in transit or with receipt activity."}
              </p>
            </div>
          ) : (
            <VendorReceiveOrdersTable
              orders={filteredOrders}
              detailsOpen={detailsOpen}
              detailsOrderId={detailsOrder?.id}
              processingId={processingId}
              canOpenGoodsReceived={canOpenGoodsReceived}
              canProcess={canProcess}
              onViewDetails={(order) => {
                setDetailsOrder(order);
                setDetailsOpen(true);
              }}
              onGoodsReceived={setGoodsModalPo}
              onProcess={(order) => void handleProcess(order)}
            />
          )}
        </div>
      </VendorPOPurchaseListLayout>

      <VendorGoodsReceivedModal
        isOpen={!!goodsModalPo}
        purchaseOrder={goodsModalPo}
        onClose={() => setGoodsModalPo(null)}
        onSaved={() => void loadOrders()}
      />

      <VendorPODetailsDrawer
        isOpen={detailsOpen && !!detailsOrder}
        summary={detailsOrder}
        showReceivedLotDetails
        onClose={() => {
          setDetailsOpen(false);
          setDetailsOrder(null);
        }}
      />
    </>
  );
};

export default VendorPOReceivePage;
