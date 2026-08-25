"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  listMachineOrderAssignments,
  type MachineOrderAssignment,
} from "@/shared/services/machineOrderAssignmentService";
import { machinesService, type Machine } from "@/shared/services/machinesService";
import {
  productionService,
  type KnittingPendingBucketsResponse,
} from "@/shared/services/productionService";

/** Rows per request while paging. Every page is followed until exhausted. */
const PAGE_SIZE = 200;

/** Hard stop so a bad totalPages can never spin forever. */
const MAX_PAGES = 100;

export interface NeedleWiseData {
  machines: Machine[];
  assignments: MachineOrderAssignment[];
  /** Bucket totals from the backend, or null when the endpoint is unavailable. */
  buckets: KnittingPendingBucketsResponse | null;
  isLoading: boolean;
  /** True when paging stopped at {@link MAX_PAGES} and data may be incomplete. */
  truncated: boolean;
  refetch: () => Promise<void>;
}

/** Ensures every machine has a usable `id`, since the API may return `_id`. */
function normalizeMachines(results: Machine[]): Machine[] {
  return results
    .map((machine) => ({
      ...machine,
      id: String(machine.id ?? (machine as { _id?: string })._id ?? ""),
    }))
    .filter((machine) => machine.id);
}

/**
 * Follows every page of a paginated endpoint.
 *
 * Replaces the previous single request capped at 1000 rows, which silently
 * dropped machines and queues once the factory grew past that.
 *
 * @param fetchPage Loads one page
 * @returns All rows, and whether paging hit the safety limit
 */
async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<{ results: T[]; totalPages: number }>,
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const data = await fetchPage(page, PAGE_SIZE);
    rows.push(...(data.results ?? []));
    totalPages = Number(data.totalPages) || 1;
    page += 1;
  } while (page <= totalPages && page <= MAX_PAGES);

  return { rows, truncated: totalPages > MAX_PAGES };
}

/**
 * Loads everything the Needle Wise report needs: the machine catalog, every
 * machine queue, and the backend knitting-pending buckets that let the tab
 * reconcile against the Production Order Summary.
 */
export function useNeedleWiseData(refreshTrigger?: number): NeedleWiseData {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [assignments, setAssignments] = useState<MachineOrderAssignment[]>([]);
  const [buckets, setBuckets] = useState<KnittingPendingBucketsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [machinePages, assignmentPages, bucketsResponse] = await Promise.all([
        fetchAllPages<Machine>(async (page, limit) => {
          const res = await machinesService.getMachines(page, limit, "");
          return { results: res.results ?? [], totalPages: res.totalPages ?? 1 };
        }),
        fetchAllPages<MachineOrderAssignment>(async (page, limit) => {
          const res = await listMachineOrderAssignments({ page, limit });
          return { results: res.results ?? [], totalPages: res.totalPages ?? 1 };
        }),
        productionService.getKnittingPendingBuckets(),
      ]);

      setMachines(normalizeMachines(machinePages.rows));
      setAssignments(assignmentPages.rows);
      setTruncated(machinePages.truncated || assignmentPages.truncated);

      if (bucketsResponse.success && bucketsResponse.data) {
        setBuckets(bucketsResponse.data);
      } else {
        // Non-fatal: the needle table still renders from the machine queues.
        setBuckets(null);
        toast.error(
          bucketsResponse.error?.message || "Could not load pending buckets; unplanned qty is hidden",
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load needle wise planning data");
      setMachines([]);
      setAssignments([]);
      setBuckets(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData, refreshTrigger]);

  return { machines, assignments, buckets, isLoading, truncated, refetch: fetchData };
}
