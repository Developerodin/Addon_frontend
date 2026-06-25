'use client';

import React from 'react';
import type { HelpSupportTicket } from '@/shared/types/helpSupport';

interface DeleteTicketConfirmModalProps {
  open: boolean;
  ticket: HelpSupportTicket | null;
  deleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation modal before permanently removing a support ticket.
 */
export default function DeleteTicketConfirmModal({
  open,
  ticket,
  deleting = false,
  onConfirm,
  onCancel,
}: DeleteTicketConfirmModalProps) {
  if (!open || !ticket) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-ticket-title"
      aria-describedby="delete-ticket-desc"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <i className="ri-delete-bin-line text-xl" aria-hidden />
            </span>
            <div>
              <h2 id="delete-ticket-title" className="text-base font-bold text-gray-900">
                Delete ticket?
              </h2>
              <p id="delete-ticket-desc" className="mt-1 text-sm text-gray-600">
                This will remove{' '}
                <span className="font-mono font-semibold text-gray-800">{ticket.ticketNumber}</span> —{' '}
                <span className="font-medium text-gray-800">{ticket.title}</span>. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <i className={deleting ? 'ri-loader-4-line animate-spin' : 'ri-delete-bin-line'} aria-hidden />
            {deleting ? 'Deleting...' : 'Delete ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}
