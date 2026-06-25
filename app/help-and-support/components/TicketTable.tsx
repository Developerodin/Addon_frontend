'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { HelpSupportTicket, TicketStatus } from '@/shared/types/helpSupport';
import { humanizeDuration, liveDurationMs } from '@/shared/utils/duration.util';
import {
  avatarColor,
  CATEGORY_LABELS,
  DISPOSITION_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_DOT,
  STATUS_LABELS,
  userDisplayName,
  userInitials,
} from '../helpSupportConstants';

/** Shape of the list filter state. */
export interface TicketFilters {
  status: string;
  priority: string;
  disposition: string;
  category: string;
  search: string;
}

interface TicketTableProps {
  tickets: HelpSupportTicket[];
  loading?: boolean;
  isAgent: boolean;
  canDelete?: boolean;
  onDeleteTicket?: (ticket: HelpSupportTicket) => void;
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  filters: TicketFilters;
  onFilterChange: (key: keyof TicketFilters, value: string) => void;
  onResetFilters: () => void;
}

const PAGE_SIZES = [10, 15, 25, 50, 100];

/**
 * Builds a compact page-number list with ellipses around the current page.
 * @param current - Current page (1-based)
 * @param total - Total page count
 * @returns Array of page numbers and '…' separators
 */
function buildPageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

const selectClass =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

/** Compact avatar + name cell for a populated user. */
function UserCell({
  user,
  emptyLabel = 'Unassigned',
}: {
  user?: { name?: string; email?: string } | string | null;
  emptyLabel?: string;
}) {
  const name = userDisplayName(user);
  const email = typeof user === 'object' && user ? user.email : undefined;
  if (name === '—') {
    return (
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] text-gray-400"
          aria-hidden
        >
          <i className="ri-user-line" />
        </span>
        <span className="text-xs font-medium text-gray-500">{emptyLabel}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarColor(name)}`}
        aria-hidden
      >
        {userInitials(user)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-700">{name}</p>
        {email && email !== name && <p className="truncate text-[11px] text-gray-400">{email}</p>}
      </div>
    </div>
  );
}

/**
 * Paginated ticket list with filters.
 */
export default function TicketTable({
  tickets,
  loading,
  isAgent,
  canDelete = false,
  onDeleteTicket,
  page,
  limit,
  totalPages,
  totalResults,
  onPageChange,
  onLimitChange,
  filters,
  onFilterChange,
  onResetFilters,
}: TicketTableProps) {
  const [, tick] = useState(0);
  const [jump, setJump] = useState('');

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const goToJump = () => {
    const target = Number(jump);
    if (!Number.isNaN(target) && target >= 1 && target <= totalPages) {
      onPageChange(target);
    }
    setJump('');
  };

  const currentStatusAge = (ticket: HelpSupportTicket) => {
    const base = ticket.timeInStatus?.[ticket.status] || 0;
    const live = liveDurationMs(ticket.currentStatusEnteredAt);
    return humanizeDuration(base + live);
  };

  const hasActiveFilters =
    filters.status || filters.priority || filters.disposition || filters.category || filters.search;

  // Ticket + Raised by + Status + Priority + Disposition + (Assignee) + Age + Created + (Actions)
  const colSpan = (isAgent ? 8 : 7) + (canDelete ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 p-2.5">
        <div className="relative min-w-[180px] flex-1">
          <i
            className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            placeholder="Search by title, description or number..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            aria-label="Search tickets"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filters.priority}
          onChange={(e) => onFilterChange('priority', e.target.value)}
          className={selectClass}
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className={selectClass}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {isAgent && (
          <select
            value={filters.disposition}
            onChange={(e) => onFilterChange('disposition', e.target.value)}
            className={selectClass}
            aria-label="Filter by disposition"
          >
            <option value="">All dispositions</option>
            {Object.entries(DISPOSITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <i className="ri-close-line" aria-hidden /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" aria-label="Support tickets">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-100 text-left text-[11px] font-bold uppercase tracking-wide text-gray-700">
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Raised by</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Disposition</th>
                {isAgent && <th className="px-4 py-3">Assignee</th>}
                <th className="px-4 py-3">Age in status</th>
                <th className="px-4 py-3">Created</th>
                {canDelete && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-gray-400">
                    <i className="ri-loader-4-line mr-1 animate-spin" aria-hidden />
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-12 text-center">
                    <i className="ri-inbox-line text-3xl text-gray-300" aria-hidden />
                    <p className="mt-1 text-sm text-gray-400">No tickets found</p>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="transition hover:bg-indigo-50/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/help-and-support/${ticket.id}`}
                        className="font-mono text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        {ticket.ticketNumber}
                      </Link>
                      <div className="mt-0.5 max-w-[240px] truncate text-sm font-medium text-gray-800">
                        {ticket.title}
                      </div>
                      {ticket.category && (
                        <span className="mt-1 inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                          {CATEGORY_LABELS[ticket.category] || ticket.category}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <UserCell user={ticket.raisedBy as { name?: string; email?: string }} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${STATUS_COLORS[ticket.status as TicketStatus]}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[ticket.status as TicketStatus]}`}
                          aria-hidden
                        />
                        {STATUS_LABELS[ticket.status as TicketStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_COLORS[ticket.priority]}`}
                      >
                        {PRIORITY_LABELS[ticket.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {DISPOSITION_LABELS[ticket.disposition]}
                    </td>
                    {isAgent && (
                      <td className="px-4 py-3">
                        <UserCell
                          user={ticket.assignedTo as { name?: string; email?: string }}
                          emptyLabel="Developer"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs font-medium text-gray-600">
                      {currentStatusAge(ticket)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '—'}
                    </td>
                    {canDelete && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteTicket?.(ticket)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ticket ${ticket.ticketNumber}`}
                        >
                          <i className="ri-delete-bin-line text-sm" aria-hidden />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>
            {totalResults === 0
              ? 'No results'
              : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, totalResults)} of ${totalResults}`}
          </span>
          <label className="flex items-center gap-1.5">
            <span className="text-gray-400">Rows</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none"
              aria-label="Rows per page"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        {totalPages > 1 && (
          <nav className="flex items-center gap-1" aria-label="Ticket pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <i className="ri-arrow-left-s-line" aria-hidden />
            </button>
            {buildPageList(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-gray-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition ${
                    p === page
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <i className="ri-arrow-right-s-line" aria-hidden />
            </button>

            {totalPages > 10 && (
              <div className="ml-2 flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jump}
                  onChange={(e) => setJump(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      goToJump();
                    }
                  }}
                  placeholder="Go"
                  className="h-8 w-14 rounded-lg border border-gray-300 px-2 text-center text-xs text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  aria-label="Go to page"
                />
                <button
                  type="button"
                  onClick={goToJump}
                  className="inline-flex h-8 items-center rounded-lg border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Go
                </button>
              </div>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
