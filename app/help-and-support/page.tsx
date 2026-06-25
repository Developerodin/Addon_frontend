'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import Seo from '@/shared/layout-components/seo/seo';
import { helpSupportService } from '@/shared/services/helpSupportService';
import type { HelpSupportTicket } from '@/shared/types/helpSupport';
import { isHelpSupportAgent, canDeleteHelpSupportTickets } from './helpSupportConstants';
import RaiseTicketModal from './components/RaiseTicketModal';
import TicketTable, { TicketFilters } from './components/TicketTable';
import AnalyticsTab from './components/AnalyticsTab';
import DeleteTicketConfirmModal from './components/DeleteTicketConfirmModal';

type Tab = 'tickets' | 'analytics';

/**
 * Help & Support main page with Tickets and Analytics tabs.
 */
export default function HelpAndSupportPage() {
  const user = useSelector((state: { auth?: { user?: { role?: string; email?: string } } }) => state.auth?.user);
  const isAgent = isHelpSupportAgent(user?.role, user?.email);
  const canDelete = canDeleteHelpSupportTickets(user?.email);

  const [activeTab, setActiveTab] = useState<Tab>('tickets');
  const [tickets, setTickets] = useState<HelpSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [filters, setFilters] = useState<TicketFilters>({
    status: '',
    priority: '',
    disposition: '',
    category: '',
    search: '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<HelpSupportTicket | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await helpSupportService.listTickets({
        page,
        limit,
        ...(filters.status && { status: filters.status as HelpSupportTicket['status'] }),
        ...(filters.priority && { priority: filters.priority as HelpSupportTicket['priority'] }),
        ...(filters.disposition && {
          disposition: filters.disposition as HelpSupportTicket['disposition'],
        }),
        ...(filters.category && { category: filters.category as NonNullable<HelpSupportTicket['category']> }),
        ...(filters.search.trim() && { search: filters.search.trim() }),
        sortBy: 'createdAt:desc',
      });
      setTickets(res.results);
      setTotalPages(res.totalPages);
      setTotalResults(res.totalResults);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  const handleFilterChange = (key: keyof TicketFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ status: '', priority: '', disposition: '', category: '', search: '' });
    setPage(1);
  };

  useEffect(() => {
    if (activeTab === 'tickets') loadTickets();
  }, [activeTab, loadTickets]);

  const handleCreate = async (payload: Parameters<typeof helpSupportService.createTicket>[0]) => {
    await helpSupportService.createTicket(payload);
    toast.success('Ticket raised successfully');
    setPage(1);
    loadTickets();
  };

  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;
    setDeleting(true);
    try {
      await helpSupportService.deleteTicket(ticketToDelete.id);
      toast.success(`Ticket ${ticketToDelete.ticketNumber} deleted`);
      setTicketToDelete(null);
      if (tickets.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadTickets();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete ticket');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Seo title="Help & Support" />
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <i className="ri-customer-service-2-line text-xl" aria-hidden />
              </span>
              <div>
                <h1 className="text-base font-bold text-gray-800">Help &amp; Support</h1>
                <p className="text-xs text-gray-500">
                  {isAgent ? 'Manage all support tickets' : 'View and raise your support tickets'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              aria-label="Raise new support ticket"
            >
              <i className="ri-add-line text-sm" aria-hidden />
              Raise Ticket
            </button>
          </div>

          <div
            className="flex gap-1 border-b mb-4"
            role="tablist"
            aria-label="Help and support sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'tickets'}
              onClick={() => setActiveTab('tickets')}
              className={`-mb-px border-b-2 px-4 py-2 text-xs font-bold ${
                activeTab === 'tickets'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tickets
            </button>
            {isAgent && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'analytics'}
                onClick={() => setActiveTab('analytics')}
                className={`-mb-px border-b-2 px-4 py-2 text-xs font-bold ${
                  activeTab === 'analytics'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Analytics
              </button>
            )}
          </div>

          {activeTab === 'tickets' ? (
            <TicketTable
              tickets={tickets}
              loading={loading}
              isAgent={isAgent}
              canDelete={canDelete}
              onDeleteTicket={setTicketToDelete}
              page={page}
              limit={limit}
              totalPages={totalPages}
              totalResults={totalResults}
              onPageChange={setPage}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
            />
          ) : (
            <AnalyticsTab />
          )}
        </div>
      </div>

      <RaiseTicketModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreate} />

      <DeleteTicketConfirmModal
        open={Boolean(ticketToDelete)}
        ticket={ticketToDelete}
        deleting={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleting && setTicketToDelete(null)}
      />
    </>
  );
}
