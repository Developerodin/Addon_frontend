import { toast } from "react-hot-toast";
import type {
  WarehouseOrderStyleCodeMultiPairRow,
  WarehouseOrderStyleCodeSinglePairRow,
} from "@/shared/services/whmsWarehouseOrderService";

/**
 * Client + line ids are stored for the API but not shown in the UI — block submit if missing.
 */
export function validateWarehouseOrderBeforeSubmit(
  mode: "create" | "edit",
  clientId: string,
  single: WarehouseOrderStyleCodeSinglePairRow[],
  multi: WarehouseOrderStyleCodeMultiPairRow[],
): boolean {
  if (mode === "create" && !clientId.trim()) {
    toast.error("Select a client name from the list.");
    return false;
  }
  for (const row of single) {
    if (!row.styleCodeId?.trim()) {
      toast.error('Use “Pick style code” on each single-pair row (required).');
      return false;
    }
  }
  for (const row of multi) {
    if (!row.styleCodeMultiPairId?.trim()) {
      toast.error('Use “Pick pair” on each multi-pair row (required).');
      return false;
    }
  }
  return true;
}
