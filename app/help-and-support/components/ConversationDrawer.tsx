'use client';

import React, { useEffect, useState } from 'react';
import type { TicketAttachment, TicketComment } from '@/shared/types/helpSupport';
import { avatarColor, userDisplayName, userInitials } from '../helpSupportConstants';
import AttachmentList from './AttachmentList';
import AttachmentUploader from './AttachmentUploader';

interface ConversationDrawerProps {
  open: boolean;
  onClose: () => void;
  comments: TicketComment[];
  isAgent: boolean;
  comment: string;
  onCommentChange: (value: string) => void;
  internalNote: boolean;
  onInternalNoteChange: (value: boolean) => void;
  commentAttachments: TicketAttachment[];
  onCommentAttachmentsChange: (value: TicketAttachment[]) => void;
  commentUploading: boolean;
  onCommentUploadingChange: (uploading: boolean) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Right-side drawer (50% viewport) for ticket conversation and replies.
 */
export default function ConversationDrawer({
  open,
  onClose,
  comments,
  isAgent,
  comment,
  onCommentChange,
  internalNote,
  onInternalNoteChange,
  commentAttachments,
  onCommentAttachmentsChange,
  commentUploading,
  onCommentUploadingChange,
  submitting,
  onSubmit,
}: ConversationDrawerProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="conversation-drawer-title">
      <button
        type="button"
        aria-label="Close conversation drawer"
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        className={`absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-1/2 ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <i className="ri-chat-3-line text-xl" aria-hidden />
            </span>
            <div>
              <h2 id="conversation-drawer-title" className="text-base font-bold text-gray-900">
                Conversation
              </h2>
              <p className="text-xs font-medium text-gray-600">
                {comments.length} {comments.length === 1 ? 'message' : 'messages'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close conversation drawer"
          >
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <i className="ri-chat-off-line text-3xl text-gray-400" aria-hidden />
              <p className="mt-2 text-sm font-medium text-gray-600">No comments yet</p>
              <p className="text-xs text-gray-500">Start the conversation below</p>
            </div>
          ) : (
            comments.map((c, idx) => {
              const author = c.author as { name?: string; email?: string };
              const seed = userDisplayName(author);
              return (
                <div key={c.id || idx} className="flex gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarColor(seed)}`}
                    aria-hidden
                  >
                    {userInitials(author)}
                  </span>
                  <div
                    className={`min-w-0 flex-1 rounded-lg border px-3 py-2 ${
                      c.isInternal ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-bold text-gray-800">{seed}</span>
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                        {c.isInternal && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-amber-200 px-1 py-px text-[9px] font-bold text-amber-900">
                            <i className="ri-lock-line" aria-hidden /> INTERNAL
                          </span>
                        )}
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-gray-800">{c.body}</p>
                    {c.attachments && c.attachments.length > 0 && (
                      <AttachmentList attachments={c.attachments} compact />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reply form */}
        <form onSubmit={onSubmit} className="space-y-2 border-t border-gray-200 bg-gray-50 p-5">
          <label htmlFor="conversation-reply" className="block text-xs font-bold text-gray-700">
            Write a reply
          </label>
          <textarea
            id="conversation-reply"
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="Type your message..."
            aria-label="Comment body"
          />
          <AttachmentUploader
            value={commentAttachments}
            onChange={onCommentAttachmentsChange}
            onUploadingChange={onCommentUploadingChange}
            maxFiles={5}
            disabled={submitting}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {isAgent ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={internalNote}
                  onChange={(e) => onInternalNoteChange(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                />
                Internal note <span className="text-gray-500">(hidden from requester)</span>
              </label>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={submitting || commentUploading || (!comment.trim() && commentAttachments.length === 0)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className={submitting ? 'ri-loader-4-line animate-spin' : 'ri-send-plane-line'} aria-hidden />
              {submitting ? 'Posting...' : commentUploading ? 'Uploading...' : 'Post Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
