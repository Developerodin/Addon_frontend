'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  syncReviewService,
  type ReviewConflict,
  type ReviewQueue,
  type SyncDecision,
} from '@/shared/services/syncReviewService';
import SyncConflictsShell from './components/SyncConflictsShell';
import QueueSummary from './components/QueueSummary';
import ConflictList from './components/ConflictList';
import ConflictDetailPanel from './components/ConflictDetailPanel';
import ResolveConflictModal from './components/ResolveConflictModal';
import DecisionLogTable from './components/DecisionLogTable';

type TabId = 'open' | 'history';

const OPEN_LIST_LIMIT = 50;

export default function SyncConflictsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('open');
  const [conflicts, setConflicts] = useState<ReviewConflict[]>([]);
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [serverSiteId, setServerSiteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listLimit, setListLimit] = useState(OPEN_LIST_LIMIT);
  const [canLoadMore, setCanLoadMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [debouncedFilter, setDebouncedFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedFilter(filterText.trim().toLowerCase()), 200);
    return () => window.clearTimeout(t);
  }, [filterText]);

  const loadOpen = useCallback(async (limit: number) => {
    setLoading(true);
    setError(null);
    try {
      const body = await syncReviewService.listOpenConflicts(limit);
      const list = body.conflicts || [];
      setConflicts(list);
      setQueue(body.queue || null);
      setServerSiteId(body.siteId);
      setCanLoadMore(list.length >= limit);
      setListLimit(limit);
      setSelectedId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load conflicts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'open') {
      void loadOpen(OPEN_LIST_LIMIT);
    }
  }, [activeTab, loadOpen]);

  const filteredConflicts = useMemo(() => {
    if (!debouncedFilter) return conflicts;
    return conflicts.filter(
      (c) =>
        c.aggregateId.toLowerCase().includes(debouncedFilter) ||
        c.entityType.toLowerCase().includes(debouncedFilter) ||
        c.changedKeys.some((k) => k.toLowerCase().includes(debouncedFilter))
    );
  }, [conflicts, debouncedFilter]);

  const selectedConflict = useMemo(
    () => filteredConflicts.find((c) => c.id === selectedId) ?? conflicts.find((c) => c.id === selectedId) ?? null,
    [filteredConflicts, conflicts, selectedId]
  );

  useEffect(() => {
    if (selectedId && !filteredConflicts.some((c) => c.id === selectedId) && filteredConflicts[0]) {
      setSelectedId(filteredConflicts[0].id);
    }
  }, [filteredConflicts, selectedId]);

  const handleRefresh = () => {
    if (activeTab === 'open') {
      void loadOpen(listLimit);
    } else {
      setHistoryRefreshKey((k) => k + 1);
    }
  };

  const handleConfirmResolve = async (decision: SyncDecision, note: string) => {
    if (!selectedConflict) return;
    setResolveBusy(true);
    try {
      await syncReviewService.resolveConflict(selectedConflict.id, decision, note);
      toast.success('Decision recorded (intent only — nothing applied).');
      setModalOpen(false);
      setConflicts((rows) => {
        const next = rows.filter((r) => r.id !== selectedConflict.id);
        setSelectedId(next[0]?.id ?? null);
        return next;
      });
      setHistoryRefreshKey((k) => k + 1);
      if (queue) {
        setQueue({ ...queue, openConflicts: Math.max(0, queue.openConflicts - 1) });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record decision');
    } finally {
      setResolveBusy(false);
    }
  };

  const openCount = queue?.openConflicts ?? conflicts.length;

  return (
    <>
      <Toaster position="top-right" />
      <SyncConflictsShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        openCount={openCount}
        serverSiteId={serverSiteId}
        onRefresh={handleRefresh}
        refreshing={loading && activeTab === 'open'}
      >
        {activeTab === 'open' && (
          <>
            <div className="mb-3 rounded border border-blue-100 bg-blue-50/60 px-3 py-2 text-[10px] text-blue-900">
              Conflicts appear when the same field was edited on factory and cloud. Choosing an option only saves your
              intent for later — it does not update production data.
            </div>

            <QueueSummary queue={queue} />

            {error && (
              <p role="alert" className="mb-3 text-[11px] text-red-600">
                {error}{' '}
                <button type="button" className="underline font-bold" onClick={() => void loadOpen(listLimit)}>
                  Retry
                </button>
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-3 items-center">
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <input
                  type="search"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filter by aggregate, entity, or field…"
                  className="w-full border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded"
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              </div>
              {loading && <span className="text-[10px] text-gray-500">Loading…</span>}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr]">
              <ConflictList
                conflicts={filteredConflicts}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <ConflictDetailPanel
                conflict={selectedConflict}
                onRecordDecision={() => {
                  if (selectedConflict) setModalOpen(true);
                }}
              />
            </div>

            {canLoadMore && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadOpen(listLimit + OPEN_LIST_LIMIT)}
                  className="text-[11px] font-bold text-purple-600 hover:underline disabled:opacity-50"
                >
                  Load more open conflicts
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <DecisionLogTable serverSiteId={serverSiteId} refreshKey={historyRefreshKey} />
        )}
      </SyncConflictsShell>

      <ResolveConflictModal
        open={modalOpen}
        conflict={selectedConflict}
        serverSiteId={serverSiteId}
        busy={resolveBusy}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmResolve}
      />
    </>
  );
}
