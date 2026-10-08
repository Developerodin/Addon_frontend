"use client";

import { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { whmsWarehouseOrders } from "@/shared/services/whmsWarehouseOrderService";
import { whmsWarehouseClients } from "@/shared/services/whmsWarehouseClientService";
import {
  downloadWarehouseOrdersBulkTemplate,
  fetchAllWarehouseClientsForReference,
  parseWarehouseOrdersBulkImportFile,
} from "./warehouseOrderBulkImport";
import {
  downloadStoreOrderTemplate,
  parseSimpleStoreOrderSheet,
  parseStorePickupSheet,
} from "./warehouseOrderStoreTemplate";

/**
 * Template downloads and bulk import for the warehouse orders list.
 * @param onImported - Reload the list after a successful import attempt
 */
export function useWarehouseOrderExcel(onImported: () => Promise<void>) {
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isDownloadingStoreTemplate, setIsDownloadingStoreTemplate] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  /**
   * Download the generic order template, including a client reference sheet when the list loads.
   */
  const downloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const clients = await fetchAllWarehouseClientsForReference(whmsWarehouseClients.listByType);
      downloadWarehouseOrdersBulkTemplate(clients);
      toast.success(
        clients.length
          ? `Template downloaded (${clients.length} clients in ClientReference sheet)`
          : "Template downloaded",
      );
    } catch (e) {
      console.error(e);
      downloadWarehouseOrdersBulkTemplate([]);
      toast.error(e instanceof Error ? e.message : "Could not load client list; template downloaded without reference");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  /**
   * Download the flat store template: client, date, style code, addon order id, qty.
   */
  const downloadStoreTemplate = async () => {
    setIsDownloadingStoreTemplate(true);
    try {
      const clients = await fetchAllWarehouseClientsForReference(whmsWarehouseClients.listByType);
      const stores = clients.filter((client) => client.type === "Store" && (client.status ?? "active") === "active");
      downloadStoreOrderTemplate(stores);
      toast.success(
        stores.length
          ? `Store template downloaded (${stores.length} stores)`
          : "Store template downloaded (no active stores)",
      );
    } catch (e) {
      console.error(e);
      downloadStoreOrderTemplate([]);
      toast.error(e instanceof Error ? e.message : "Could not load stores; template downloaded without store columns");
    } finally {
      setIsDownloadingStoreTemplate(false);
    }
  };

  /**
   * Import a generic order sheet or a store pickup sheet through the same bulk-import API.
   * @param e - File input change
   */
  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const simpleParsed = parseSimpleStoreOrderSheet(buf);
      const storeParsed = simpleParsed ?? parseStorePickupSheet(buf);
      const { orders, errors: parseErrors } = storeParsed ?? parseWarehouseOrdersBulkImportFile(buf);

      if (parseErrors.length) {
        parseErrors.slice(0, 5).forEach((msg) => toast.error(msg, { duration: 6000 }));
        if (parseErrors.length > 5) toast(`+${parseErrors.length - 5} parse error(s)`, { icon: "⚠️" });
      }

      if (!orders.length) {
        if (!parseErrors.length) {
          toast.error(
            simpleParsed
              ? "No store orders. Fill client, style code, and a qty above 0."
              : storeParsed
                ? "No store orders in this sheet. Enter a style code and a refill quantity above 0."
                : "No valid orders parsed. Fill clientType + clientId (or clientName) on header rows.",
          );
        }
        return;
      }

      const summary = await whmsWarehouseOrders.bulkImport({ orders });
      if (summary.created > 0) toast.success(`${summary.created} order(s) created successfully`);
      if (summary.failed > 0) toast.error(`${summary.failed} order(s) failed`);
      if (summary.errors?.length) {
        summary.errors.slice(0, 5).forEach((err) => {
          const msg = err.reason || err.error || "Unknown error";
          const prefix = err.row != null ? `Order ${err.row}: ` : err.index != null ? `Order ${err.index + 1}: ` : "";
          toast.error(`${prefix}${msg}`, { duration: 8000 });
        });
        if (summary.errors.length > 5) toast(`+${summary.errors.length - 5} more error(s)`, { icon: "⚠️" });
      }
      await onImported();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Bulk import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return {
    isImporting,
    isDownloadingTemplate,
    isDownloadingStoreTemplate,
    importRef,
    downloadTemplate,
    downloadStoreTemplate,
    handleBulkImport,
  };
}
