'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  syncReviewService,
  type ConflictHistoryRow,
} from '@/shared/services/syncReviewService';
import { friendlyDecisionLabel } from '../utils/conflictLabels';

interface DecisionLogTableProps {
  serverSiteId: string | null;
  refreshKey: number;
}

export default function DecisionLogTable({ serverSiteId, refreshKey }: DecisionLogTableProps) {
  const [rows, setRows] = useState<ConflictHistoryRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState('');
  const [aggregateId, setAggregateId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [entityInput, setEntityInput] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => {
      setAggregateId(searchInput);
      setPage(1);
    }, 200);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setEntityType(entityInput);
      setPage(1);
    }, 200);
    return () => window.clearTimeout(t);
  }, [entityInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await syncReviewService.listConflictHistory({
        page,
        limit: 20,
        aggregateId,
        entityType,
      });
      setRows(res.results);
      setTotalPages(res.totalPages);
      setTotalResults(res.totalResults);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load decision log');
    } finally {
      setLoading(false);
    }
  }, [page, aggregateId, entityType]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section aria-label="Decision log">
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search aggregate id…"
            className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded w-48 min-w-[120px]"
          />
          <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        </div>
        <input
          type="text"
          value={entityInput}
          onChange={(e) => setEntityInput(e.target.value)}
          placeholder="Entity type"
          className="bg-white border border-gray-200 px-3 py-1.5 text-[11px] rounded w-36"
        />
        <span className="text-[10px] text-gray-500 self-center">{totalResults} recorded</span>
      </div>

      {error && (
        <p role="alert" className="text-[11px] text-red-600 mb-2">
          {error}
        </p>
      )}

      <div className="overflow-x-auto border border-gray-100 rounded">
        <table className="min-w-full text-left text-[11px]">
          <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Decision</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Aggregate</th>
              <th className="px-3 py-2">Changed keys</th>
              <th className="px-3 py-2">Note</th>
              <th className="px-3 py-2">By</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                  No decisions recorded yet.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                    {row.resolution.recordedAt
                      ? new Date(row.resolution.recordedAt).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {friendlyDecisionLabel(row.resolution.decision, serverSiteId)}
                  </td>
                  <td className="px-3 py-2">{row.entityType}</td>
                  <td className="px-3 py-2 font-mono text-[10px] max-w-[140px] truncate" title={row.aggregateId}>
                    {row.aggregateId}
                  </td>
                  <td className="px-3 py-2 text-[10px]">{row.changedKeys.join(', ') || '—'}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate" title={row.resolution.note}>
                    {row.resolution.note || '—'}
                  </td>
                  <td className="px-3 py-2 text-[10px] text-gray-500">
                    {row.resolution.recordedByUserId || row.resolution.recordedBySiteId || '—'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 text-[10px] font-bold border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-[10px] text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 text-[10px] font-bold border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
