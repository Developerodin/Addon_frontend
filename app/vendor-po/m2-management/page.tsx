"use client";

import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import vendorM2M3M4ManagementService, {
  type VendorM2EntryRow,
  type VendorM2Statistics,
} from "@/shared/services/vendorM2M3M4ManagementService";
import EntriesTab from "./components/EntriesTab";
import LogsTab from "./components/LogsTab";
import M2ResolveDrawer, { type M2ResolveAction } from "./components/M2ResolveDrawer";

type M2Tab = "entries" | "logs";

/**
 * Vendor M2 Management — track and resolve M2 repair entries from vendor QC floors.
 */
export default function VendorM2ManagementPage() {
  const [activeTab, setActiveTab] = useState<M2Tab>("entries");
  const [stats, setStats] = useState<VendorM2Statistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [resolveEntry, setResolveEntry] = useState<VendorM2EntryRow | null>(null);
  const [resolveAction, setResolveAction] = useState<M2ResolveAction>("merge");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const statsRes = await vendorM2M3M4ManagementService.getM2Statistics();
      setStats(statsRes);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load M2 statistics");
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats, refreshKey]);

  const openResolve = (entry: VendorM2EntryRow, action: M2ResolveAction) => {
    setResolveEntry(entry);
    setResolveAction(action);
  };

  const handleResolveSubmit = async (quantity: number, remarks: string) => {
    if (!resolveEntry) return;
    setIsSubmitting(true);
    try {
      if (resolveAction === "merge") {
        await vendorM2M3M4ManagementService.mergeM2ToM1(resolveEntry.entryId, { quantity, remarks });
      } else if (resolveAction === "m3") {
        await vendorM2M3M4ManagementService.transferM2ToM3(resolveEntry.entryId, { quantity, remarks });
      } else {
        await vendorM2M3M4ManagementService.transferM2ToM4(resolveEntry.entryId, { quantity, remarks });
      }
      toast.success("M2 entry updated");
      setResolveEntry(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Seo title="Vendor M2 Management" />
      <div className="main-content !p-[10px]">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-[10px]">
          <header className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-3">
            <div className="w-1 h-8 bg-yellow-500 rounded" aria-hidden="true" />
            <div>
              <h1 className="text-sm font-bold text-gray-900">Vendor M2 Management</h1>
              <p className="text-[10px] text-gray-500">
                Resolve repairable M2 from Secondary Checking / Final Checking — merge cascades through Dispatch
              </p>
            </div>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              { label: "Open entries", value: stats?.openEntryCount ?? "—" },
              { label: "Partial", value: stats?.partialEntryCount ?? "—" },
              { label: "Open qty", value: stats?.totalOpenQuantity ?? "—" },
              { label: "Resolved", value: stats?.resolvedEntryCount ?? "—" },
            ].map((tile) => (
              <div key={tile.label} className="rounded border-2 border-yellow-200 bg-yellow-50/50 p-2">
                <div className="text-[10px] font-bold text-gray-600 uppercase">{tile.label}</div>
                <div className="text-lg font-bold text-gray-900">
                  {isLoadingStats ? "…" : tile.value}
                </div>
              </div>
            ))}
          </div>

          <div className="flex border-b border-gray-300 mb-3">
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 ${activeTab === "entries" ? "border-yellow-600 text-yellow-800" : "border-transparent text-gray-500"}`}
              onClick={() => setActiveTab("entries")}
            >
              Open entries
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-[11px] font-bold border-b-2 ${activeTab === "logs" ? "border-yellow-600 text-yellow-800" : "border-transparent text-gray-500"}`}
              onClick={() => setActiveTab("logs")}
            >
              Logs
            </button>
          </div>

          {activeTab === "entries" ? (
            <EntriesTab refreshKey={refreshKey} onResolve={openResolve} />
          ) : (
            <LogsTab refreshKey={refreshKey} />
          )}
        </div>
      </div>

      {resolveEntry && (
        <M2ResolveDrawer
          entry={resolveEntry}
          action={resolveAction}
          isSubmitting={isSubmitting}
          onClose={() => setResolveEntry(null)}
          onSubmit={handleResolveSubmit}
        />
      )}
    </>
  );
}
