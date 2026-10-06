"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "react-hot-toast";
import { whmsWarehouseClients } from "@/shared/services/whmsWarehouseClientService";
import {
  parseWarehouseClientStoreImportFile,
  parseWarehouseClientTradeImportFile,
} from "./warehouseClientBulkImport";
import {
  humanizeWarehouseClientApiError,
  summarizeWarehouseClientImportErrors,
} from "./warehouseClientImportApiError";

type ImportParseResult = {
  items: Parameters<typeof whmsWarehouseClients.bulkImport>[0]["items"];
  errors: string[];
};

/**
 * Spreadsheet import for warehouse clients. Stops the upload when any row is invalid
 * and keeps the row-level messages on screen.
 */
export function useWarehouseClientImport(reload: () => Promise<void>) {
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const storeBulkInputRef = useRef<HTMLInputElement>(null);
  const tradeBulkInputRef = useRef<HTMLInputElement>(null);

  /**
   * Show the blocking row list and a short toast.
   */
  const showImportIssues = (errors: string[]) => {
    const lines = summarizeWarehouseClientImportErrors(errors);
    setImportIssues(lines);
    toast.error(
      lines.length === 1
        ? lines[0]
        : `${lines.length} rows need a fix. Nothing was imported.`,
    );
  };

  /**
   * Parse a file, refuse the upload when any row is invalid, otherwise create the clients.
   */
  const importFile = async (
    file: File | undefined,
    parse: (buf: ArrayBuffer) => ImportParseResult,
    successLabel: (count: number) => string,
  ) => {
    if (!file) return;
    setIsBulkImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const { items, errors } = parse(buf);
      if (errors.length) {
        showImportIssues(errors);
        return;
      }
      if (!items.length) {
        toast.error("No valid rows to import");
        return;
      }
      await whmsWarehouseClients.bulkImport({ items });
      setImportIssues([]);
      toast.success(successLabel(items.length));
      await reload();
    } catch (err) {
      showImportIssues(
        humanizeWarehouseClientApiError(err instanceof Error ? err.message : "Bulk import failed"),
      );
    } finally {
      setIsBulkImporting(false);
    }
  };

  return {
    isBulkImporting,
    importIssues,
    dismissImportIssues: () => setImportIssues([]),
    storeBulkInputRef,
    tradeBulkInputRef,
    openStoreImport: () => storeBulkInputRef.current?.click(),
    openTradeImport: () => tradeBulkInputRef.current?.click(),
    handleStoreBulkFile: (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      return importFile(
        file,
        parseWarehouseClientStoreImportFile,
        (count) => `Imported ${count} Store row(s)`,
      );
    },
    handleTradeBulkFile: (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      return importFile(
        file,
        parseWarehouseClientTradeImportFile,
        (count) => `Imported ${count} row(s)`,
      );
    },
  };
}
