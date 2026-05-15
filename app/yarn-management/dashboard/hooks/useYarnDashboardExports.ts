import { useCallback, useState } from "react";
import yarnBoxService from "@/shared/services/yarnBoxService";
import {
  yarnInventoryService,
  type YarnInventoryQueryParams,
} from "../services/yarnInventoryService";
import {
  buildUnallocatedBoxExportRows,
  downloadCsvFile,
  rowsToCsv,
} from "../utils/csvHelpers";

/**
 * Live inventory CSV export + unallocated box-level report (PO / lot / QC).
 */
export function useYarnDashboardExports(
  searchTerm: string,
  statusFilter: string
) {
  const [exporting, setExporting] = useState(false);
  const [exportingUnallocated, setExportingUnallocated] = useState(false);

  const handleExportExcel = useCallback(async () => {
    try {
      setExporting(true);

      const invParams: Omit<YarnInventoryQueryParams, "limit" | "page"> = {};
      if (searchTerm.trim()) {
        invParams.yarn_name = searchTerm.trim();
      }
      if (statusFilter !== "all") {
        if (statusFilter === "Low Stock") {
          invParams.inventory_status = "low_stock";
        } else if (statusFilter === "In Stock") {
          invParams.inventory_status = "in_stock";
        }
      }

      const allInventory = await yarnInventoryService.getAllYarnInventories(invParams);

      const exportData = allInventory.map((item) => {
        const totalWeight =
          item.longTermStorage.totalWeight + item.shortTermStorage.totalWeight;
        const totalNetWeight =
          item.longTermStorage.netWeight + item.shortTermStorage.netWeight;
        const unallocatedWeight = item.unallocatedStorage?.totalWeight || 0;
        const blockedQty = item.blockedQty || 0;
        const availableQty = Math.max(0, totalNetWeight - blockedQty);

        let status = "In Stock";
        if (
          item.inventoryStatus === "low_stock" ||
          item.inventoryStatus === "soon_to_be_low"
        ) {
          status = "Low Stock";
        } else if (totalWeight === 0) {
          status = "Out of Stock";
        }

        return {
          "Yarn Name": item.yarnName,
          "LTS (kg)": item.longTermStorage.totalWeight,
          "STS (kg)": item.shortTermStorage.totalWeight,
          "Unallocated (kg)": unallocatedWeight,
          Cones: item.shortTermStorage.numberOfCones,
          "Blocked Qty (kg)": blockedQty,
          "Available Qty (kg)": availableQty,
          Status: status,
        };
      });

      if (exportData.length === 0) {
        alert("No data to export");
        return;
      }

      downloadCsvFile(
        `yarn-inventory-${new Date().toISOString().split("T")[0]}.csv`,
        rowsToCsv(exportData)
      );
    } catch (err) {
      console.error("Error exporting inventory:", err);
      alert("Failed to export inventory. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [searchTerm, statusFilter]);

  const handleExportUnallocatedReport = useCallback(async () => {
    try {
      setExportingUnallocated(true);
      const yarnNameFilter = searchTerm.trim() || undefined;

      let boxes = await yarnBoxService.getBoxesWithoutStorageLocation(
        yarnNameFilter ? { yarnName: yarnNameFilter } : {}
      );

      if (statusFilter !== "all") {
        const invParams: Pick<
          YarnInventoryQueryParams,
          "yarn_name" | "inventory_status"
        > = {};
        if (yarnNameFilter) invParams.yarn_name = yarnNameFilter;
        if (statusFilter === "Low Stock") {
          invParams.inventory_status = "low_stock";
        } else if (statusFilter === "In Stock") {
          invParams.inventory_status = "in_stock";
        }

        const allInv = await yarnInventoryService.getAllYarnInventories(invParams);
        const allowedNames = new Set(
          allInv
            .filter((item) => {
              const ua =
                item.unallocatedStorage?.netWeight ??
                item.unallocatedStorage?.totalWeight ??
                0;
              return Number(ua) > 0;
            })
            .map((item) => (item.yarnName || "").trim())
            .filter(Boolean)
        );
        boxes = boxes.filter((b) => allowedNames.has((b.yarnName || "").trim()));
      }

      const rows = buildUnallocatedBoxExportRows(boxes);
      if (rows.length === 0) {
        alert(
          "No unallocated boxes match the current filters. Try clearing search or status."
        );
        return;
      }

      const tag =
        yarnNameFilter || statusFilter !== "all" ? "-filtered" : "";
      downloadCsvFile(
        `unallocated-yarn-report${tag}-${new Date().toISOString().split("T")[0]}.csv`,
        rowsToCsv(rows)
      );
    } catch (err) {
      console.error("Error exporting unallocated report:", err);
      alert("Failed to export unallocated report. Please try again.");
    } finally {
      setExportingUnallocated(false);
    }
  }, [searchTerm, statusFilter]);

  return {
    exporting,
    exportingUnallocated,
    handleExportExcel,
    handleExportUnallocatedReport,
  };
}
