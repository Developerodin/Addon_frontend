'use client';

import React from 'react';
import { FileUploadService } from '@/shared/services/fileUploadService';
import type { TicketAttachment } from '@/shared/types/helpSupport';
import { attachmentIcon } from '../helpSupportConstants';

interface AttachmentListProps {
  attachments?: TicketAttachment[];
  /** Compact variant for inline use inside comments. */
  compact?: boolean;
}

/**
 * Read-only list of ticket/comment attachments with preview + download links.
 */
export default function AttachmentList({ attachments, compact = false }: AttachmentListProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <ul className={compact ? 'mt-2 space-y-1' : 'grid gap-2 sm:grid-cols-2'}>
      {attachments.map((att, idx) => {
        const isImage = (att.mimeType || '').startsWith('image/');
        return (
          <li
            key={`${att.key || att.url || att.fileName}-${idx}`}
            className="group flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 transition hover:border-indigo-300 hover:shadow-sm"
          >
            {isImage && att.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={att.url}
                alt={att.fileName || 'attachment'}
                className="h-9 w-9 shrink-0 rounded object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-gray-50 text-gray-500">
                <i className={`${attachmentIcon(att.mimeType)} text-base`} aria-hidden />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-gray-700">{att.fileName || 'Attachment'}</p>
              <p className="text-[11px] text-gray-400">
                {att.size ? FileUploadService.formatFileSize(att.size) : ''}
              </p>
            </div>
            {att.url && (
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                download={att.fileName}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                aria-label={`Download ${att.fileName || 'attachment'}`}
              >
                <i className="ri-download-2-line" aria-hidden />
                {!compact && 'Download'}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
