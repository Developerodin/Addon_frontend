'use client';

import React, { useCallback, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FileUploadService } from '@/shared/services/fileUploadService';
import type { TicketAttachment } from '@/shared/types/helpSupport';
import { attachmentIcon } from '../helpSupportConstants';

interface AttachmentUploaderProps {
  value: TicketAttachment[];
  onChange: (next: TicketAttachment[]) => void;
  /** Notifies parent when uploads are in-flight so it can disable submit. */
  onUploadingChange?: (uploading: boolean) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const MAX_SIZE_MB = 5;

/**
 * Drag-and-drop multi-file uploader that pushes files to S3 (via /common/upload)
 * and emits ticket attachment metadata. Removing a file also deletes it from S3.
 */
export default function AttachmentUploader({
  value,
  onChange,
  onUploadingChange,
  maxFiles = 8,
  disabled = false,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  const setBusy = useCallback(
    (delta: number) => {
      setUploadingCount((prev) => {
        const next = Math.max(0, prev + delta);
        onUploadingChange?.(next > 0);
        return next;
      });
    },
    [onUploadingChange]
  );

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);

      const remaining = maxFiles - value.length;
      if (remaining <= 0) {
        toast.error(`You can attach up to ${maxFiles} files`);
        return;
      }
      const toUpload = files.slice(0, remaining);
      if (files.length > remaining) {
        toast.error(`Only ${remaining} more file(s) allowed`);
      }

      for (const file of toUpload) {
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          toast.error(`"${file.name}" exceeds the ${MAX_SIZE_MB}MB limit`);
          // eslint-disable-next-line no-continue
          continue;
        }
        setBusy(1);
        try {
          const uploaded = await FileUploadService.uploadFile(file);
          onChange([
            ...value,
            {
              fileName: uploaded.originalName,
              url: uploaded.url,
              key: uploaded.key,
              size: uploaded.size,
              mimeType: uploaded.mimeType,
            },
          ]);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `Failed to upload "${file.name}"`);
        } finally {
          setBusy(-1);
        }
      }
    },
    [maxFiles, onChange, setBusy, value]
  );

  const handleRemove = useCallback(
    async (idx: number) => {
      const target = value[idx];
      onChange(value.filter((_, i) => i !== idx));
      if (target?.key) {
        try {
          await FileUploadService.deleteFile(target.key);
        } catch {
          // Best-effort cleanup; the attachment is already removed from the form.
        }
      }
    },
    [onChange, value]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center transition ${
          dragOver
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50'
        } disabled:cursor-not-allowed disabled:opacity-60`}
        aria-label="Upload attachments"
      >
        <i className="ri-upload-cloud-2-line text-xl text-indigo-500" aria-hidden />
        <span className="text-xs font-medium text-gray-600">
          Drag &amp; drop or <span className="text-indigo-600">browse</span>
        </span>
        <span className="text-[11px] text-gray-400">
          Up to {maxFiles} files, {MAX_SIZE_MB}MB each
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {uploadingCount > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600">
          <i className="ri-loader-4-line animate-spin" aria-hidden />
          Uploading {uploadingCount} file(s)...
        </p>
      )}

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((att, idx) => (
            <li
              key={`${att.key || att.url || att.fileName}-${idx}`}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2"
            >
              <i className={`${attachmentIcon(att.mimeType)} text-base text-gray-500`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-700">{att.fileName}</p>
                <p className="text-[11px] text-gray-400">
                  {att.size ? FileUploadService.formatFileSize(att.size) : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                aria-label={`Remove ${att.fileName}`}
              >
                <i className="ri-delete-bin-line text-sm" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
