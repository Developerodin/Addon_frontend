'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import Seo from '@/shared/layout-components/seo/seo';
import { helpSupportService } from '@/shared/services/helpSupportService';
import type { HelpSupportTicket, TicketDisposition, TicketStatus } from '@/shared/types/helpSupport';
import { humanizeDuration } from '@/shared/utils/duration.util';
import {
  DISPOSITION_LABELS,
  isHelpSupportAgent,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_DOT,
  STATUS_LABELS,
  userDisplayName,
} from '../helpSupportConstants';
import type { TicketAttachment } from '@/shared/types/helpSupport';
import StatusTimeline from '../components/StatusTimeline';
import TimeInStatusCard from '../components/TimeInStatusCard';
import StatusChangeControl from '../components/StatusChangeControl';
import AttachmentList from '../components/AttachmentList';
import ConversationDrawer from '../components/ConversationDrawer';

interface TicketDetailPageProps {
  params: { ticketId: string };
}

/** Small labelled stat tile for the header meta row. */
function StatTile({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
        <i className={`${icon} text-sm`} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600">{label}</p>
        <p className="truncate text-xs font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

/**
 * Ticket detail view with timeline, comments, and agent controls.
 */
export default function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { ticketId } = params;
  const user = useSelector(
    (state: { auth?: { user?: { role?: string; email?: string; id?: string } } }) => state.auth?.user
  );
  const isAgent = isHelpSupportAgent(user?.role, user?.email);

  const [ticket, setTicket] = useState<HelpSupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState<TicketAttachment[]>([]);
  const [commentUploading, setCommentUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await helpSupportService.getTicket(ticketId);
      setTicket(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() && commentAttachments.length === 0) return;
    if (commentUploading) {
      toast.error('Please wait for uploads to finish');
      return;
    }
    setSubmitting(true);
    try {
      await helpSupportService.addComment(ticketId, comment.trim(), {
        isInternal: isAgent && internalNote,
        attachments: commentAttachments,
      });
      setComment('');
      setInternalNote(false);
      setCommentAttachments([]);
      toast.success('Comment added');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (status: TicketStatus, note?: string) => {
    await helpSupportService.updateStatus(ticketId, status, note);
    toast.success('Status updated');
    load();
  };

  const handleDisposition = async (disposition: TicketDisposition, note?: string) => {
    await helpSupportService.updateDisposition(ticketId, disposition, note);
    toast.success('Disposition updated');
    load();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-xl bg-gray-100" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-64 rounded-xl bg-gray-100 lg:col-span-2" />
            <div className="h-64 rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-6xl p-4">
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <i className="ri-error-warning-line text-4xl text-red-400" aria-hidden />
          <p className="mt-2 text-sm font-medium text-gray-600">Ticket not found</p>
          <Link
            href="/help-and-support"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <i className="ri-arrow-left-line" aria-hidden /> Back to tickets
          </Link>
        </div>
      </div>
    );
  }

  const visibleComments = (ticket.comments || []).filter((c) => isAgent || !c.isInternal);

  return (
    <>
      <Seo title={`${ticket.ticketNumber} — Help & Support`} />
      <div className="mx-auto max-w-6xl space-y-4 p-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500" aria-label="Breadcrumb">
          <Link href="/help-and-support" className="font-semibold text-gray-600 hover:text-indigo-600">
            Help & Support
          </Link>
          <i className="ri-arrow-right-s-line text-gray-400" aria-hidden />
          <span className="font-bold text-gray-800">{ticket.ticketNumber}</span>
        </nav>

        {/* Header card */}
        <header className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-[11px] font-bold text-gray-700">
                    <i className="ri-hashtag" aria-hidden />
                    {ticket.ticketNumber}
                  </span>
                  <span className="text-[11px] font-medium text-gray-500">
                    Opened {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}
                  </span>
                </div>
                <h1 className="text-lg font-bold leading-snug text-gray-900">{ticket.title}</h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConversationOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                  aria-label="Open conversation"
                >
                  <i className="ri-chat-3-line" aria-hidden />
                  Conversation
                  <span className="rounded-full bg-blue-600 px-1.5 py-px text-[10px] font-bold text-white">
                    {visibleComments.length}
                  </span>
                </button>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLORS[ticket.status]}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[ticket.status]}`} aria-hidden />
                  {STATUS_LABELS[ticket.status]}
                </span>
                <span
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase ${PRIORITY_COLORS[ticket.priority]}`}
                >
                  {PRIORITY_LABELS[ticket.priority]}
                </span>
                <span className="rounded-md bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                  {DISPOSITION_LABELS[ticket.disposition]}
                </span>
              </div>
            </div>
          </div>

          {/* Meta stat row */}
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
            <StatTile
              icon="ri-user-line"
              label="Raised by"
              value={userDisplayName(ticket.raisedBy as { name?: string; email?: string })}
            />
            <StatTile
              icon="ri-user-star-line"
              label="Assignee"
              value={(() => {
                const name = userDisplayName(ticket.assignedTo as { name?: string; email?: string });
                return name === '—' ? 'Developer' : name;
              })()}
            />
            <StatTile icon="ri-time-line" label="Lifetime" value={humanizeDuration(ticket.totalLifetimeMs)} />
            <StatTile
              icon="ri-timer-flash-line"
              label="Active time"
              value={humanizeDuration(ticket.totalActiveTimeMs)}
            />
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-4 lg:col-span-2">
            {/* Description + points */}
            <section className="rounded-xl border border-gray-300 bg-white shadow-sm">
              <header className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                  <i className="ri-file-text-line text-sm" aria-hidden />
                </span>
                <h2 className="text-sm font-bold text-gray-900">Details</h2>
              </header>
              <div className="space-y-4 p-4">
                {ticket.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                    {ticket.description}
                  </p>
                ) : (
                  <p className="text-sm italic text-gray-500">No description provided.</p>
                )}

                {ticket.pointsToBeCovered && ticket.pointsToBeCovered.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-600">
                      Points to cover
                    </h3>
                    <ul className="space-y-1.5">
                      {ticket.pointsToBeCovered.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <i className="ri-checkbox-circle-line mt-0.5 shrink-0 text-indigo-400" aria-hidden />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {ticket.attachments && ticket.attachments.length > 0 && (
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-600">
                      <i className="ri-attachment-2" aria-hidden />
                      Attachments ({ticket.attachments.length})
                    </h3>
                    <AttachmentList attachments={ticket.attachments} />
                  </div>
                )}
              </div>
            </section>

            {isAgent && (
              <StatusChangeControl
                allowedStatuses={ticket.allowedNextStatuses || []}
                currentDisposition={ticket.disposition}
                onStatusChange={handleStatus}
                onDispositionChange={handleDisposition}
              />
            )}
          </div>

          {/* Right rail */}
          <div className="space-y-4">
            <TimeInStatusCard timeInStatus={ticket.timeInStatus} currentStatus={ticket.status} />
            <section className="rounded-xl border border-gray-300 bg-white shadow-sm">
              <header className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                  <i className="ri-history-line text-sm" aria-hidden />
                </span>
                <h2 className="text-sm font-bold text-gray-900">Status Timeline</h2>
              </header>
              <div className="p-4">
                <StatusTimeline history={ticket.statusHistory || []} />
              </div>
            </section>
          </div>
        </div>
      </div>

      <ConversationDrawer
        open={conversationOpen}
        onClose={() => setConversationOpen(false)}
        comments={visibleComments}
        isAgent={isAgent}
        comment={comment}
        onCommentChange={setComment}
        internalNote={internalNote}
        onInternalNoteChange={setInternalNote}
        commentAttachments={commentAttachments}
        onCommentAttachmentsChange={setCommentAttachments}
        commentUploading={commentUploading}
        onCommentUploadingChange={setCommentUploading}
        submitting={submitting}
        onSubmit={handleComment}
      />
    </>
  );
}
