"use client";

import React, { useCallback, useId, useRef, useState } from "react";
import { FileUploadService } from "@/shared/services/fileUploadService";

const MAX_SIZE_MB = 5;

export interface ProductImageUploadFieldProps {
  /** Current product image URL (existing S3 URL or empty). */
  value?: string;
  /** Called with the S3 URL after a successful upload, or empty string when cleared. */
  onChange: (url: string) => void;
  disabled?: boolean;
}

/**
 * Product image picker — uploads to S3 via POST /v1/common/upload and returns the public URL.
 */
export default function ProductImageUploadField({
  value = "",
  onChange,
  disabled = false,
}: ProductImageUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validates and uploads a single image file to S3.
   */
  const uploadImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file (PNG, JPG, GIF, or WebP).");
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Image must be ${MAX_SIZE_MB}MB or smaller.`);
        return;
      }

      setError(null);
      setUploading(true);
      try {
        const uploaded = await FileUploadService.uploadFile(file);
        onChange(uploaded.url);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to upload image";
        setError(message);
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const onFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await uploadImage(file);
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadImage(file);
  };

  const clearImage = () => {
    setError(null);
    onChange("");
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        aria-label="Upload product image"
        aria-disabled={disabled || uploading}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled && !uploading) inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => void onDrop(e)}
        onClick={() => {
          if (!disabled && !uploading) inputRef.current?.click();
        }}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
          dragOver ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
        } ${disabled || uploading ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => void onFileInput(e)}
          aria-describedby={`${inputId}-hint`}
        />
        {uploading ? (
          <div className="flex flex-col items-center py-2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-2" />
            <p className="text-sm text-gray-600">Uploading to S3…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <i className="ri-upload-cloud-2-line text-4xl text-gray-400 mb-2" aria-hidden />
            <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
            <p id={`${inputId}-hint`} className="text-xs text-gray-400">
              PNG, JPG, GIF or WebP (max {MAX_SIZE_MB}MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Product preview"
            className="max-w-xs rounded-lg shadow-sm border border-gray-200"
          />
          <button
            type="button"
            onClick={clearImage}
            disabled={disabled || uploading}
            className="absolute top-2 right-2 ti-btn ti-btn-danger ti-btn-sm"
            aria-label="Remove product image"
          >
            <i className="ri-delete-bin-line" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
