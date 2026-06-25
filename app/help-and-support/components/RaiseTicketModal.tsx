'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FileUploadService } from '@/shared/services/fileUploadService';
import type {
  CreateTicketPayload,
  TicketAttachment,
  TicketCategory,
  TicketPriority,
} from '@/shared/types/helpSupport';
import AttachmentUploader from './AttachmentUploader';

interface RaiseTicketModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTicketPayload) => Promise<void>;
}

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'New Feature Request' },
  { value: 'how_to', label: 'How To' },
  { value: 'data_issue', label: 'Data Issue' },
  { value: 'access', label: 'Access' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

/**
 * Modal form to raise a new support ticket, including multi-file attachments.
 */
export default function RaiseTicketModal({ open, onClose, onSubmit }: RaiseTicketModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('other');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [points, setPoints] = useState<string[]>(['']);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entered, setEntered] = useState(false);

  // Drives the slide-in transition once the drawer is mounted.
  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  const reset = () => {
    setTitle('');
    setDescription('');
    setCategory('other');
    setPriority('medium');
    setPoints(['']);
    setAttachments([]);
  };

  /** Best-effort cleanup of orphaned S3 uploads when the user cancels. */
  const cleanupOrphans = async () => {
    await Promise.all(
      attachments
        .filter((a) => a.key)
        .map((a) => FileUploadService.deleteFile(a.key as string).catch(() => undefined))
    );
  };

  const handleClose = async () => {
    if (submitting || uploading) return;
    await cleanupOrphans();
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (uploading) {
      toast.error('Please wait for uploads to finish');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        pointsToBeCovered: points.map((p) => p.trim()).filter(Boolean),
        ...(attachments.length ? { attachments } : {}),
      });
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to raise ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="raise-ticket-title">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close raise ticket drawer"
        onClick={handleClose}
        className={`absolute inset-0 cursor-default bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer panel */}
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <i className="ri-customer-service-2-line text-xl" aria-hidden />
            </span>
            <div>
              <h2 id="raise-ticket-title" className="text-base font-bold text-gray-800">
                Raise Support Ticket
              </h2>
              <p className="text-xs text-gray-500">Describe your issue and attach any documents</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close raise ticket drawer"
          >
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ticket-category" className="mb-1 block text-xs font-semibold text-gray-600">
                Category
              </label>
              <select
                id="ticket-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ticket-priority" className="mb-1 block text-xs font-semibold text-gray-600">
                Priority
              </label>
              <select
                id="ticket-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="ticket-title" className="mb-1 block text-xs font-semibold text-gray-600">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="ticket-title"
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Brief summary of the issue"
            />
          </div>

          <div>
            <label htmlFor="ticket-description" className="mb-1 block text-xs font-semibold text-gray-600">
              Description
            </label>
            <textarea
              id="ticket-description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[9.75rem] w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Additional details, steps to reproduce, expected behaviour..."
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-gray-600">Points to be covered</legend>
            <div className="space-y-2">
              {points.map((point, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => {
                      const next = [...points];
                      next[idx] = e.target.value;
                      setPoints(next);
                    }}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder={`Point ${idx + 1}`}
                    aria-label={`Point to cover ${idx + 1}`}
                  />
                  {points.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPoints(points.filter((_, i) => i !== idx))}
                      className="rounded-lg border border-gray-300 px-2.5 text-gray-500 transition hover:bg-gray-50 hover:text-red-500"
                      aria-label={`Remove point ${idx + 1}`}
                    >
                      <i className="ri-subtract-line" aria-hidden />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPoints([...points, ''])}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                + Add point
              </button>
            </div>
          </fieldset>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Attachments</label>
            <AttachmentUploader
              value={attachments}
              onChange={setAttachments}
              onUploadingChange={setUploading}
              disabled={submitting}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-3.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting || uploading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting || uploading || !title.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <i className={submitting ? 'ri-loader-4-line animate-spin' : 'ri-send-plane-line'} aria-hidden />
            {submitting ? 'Submitting...' : uploading ? 'Uploading...' : 'Raise Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}
