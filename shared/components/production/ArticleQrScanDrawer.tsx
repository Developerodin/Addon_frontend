"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

export interface ArticleQrScanFeedback {
  type: "success" | "error" | "info";
  message: string;
}

export interface ArticleQrScanDrawerProps {
  open: boolean;
  floorLabel: string;
  onClose: () => void;
  /** Called with raw scanner input (Enter or Find). Return message to show in drawer. */
  onScan: (raw: string) => Promise<ArticleQrScanFeedback | void> | ArticleQrScanFeedback | void;
  loading?: boolean;
  feedback?: ArticleQrScanFeedback | null;
}

/**
 * Right drawer dedicated to scanning production article label QR codes.
 */
export default function ArticleQrScanDrawer({
  open,
  floorLabel,
  onClose,
  onScan,
  loading = false,
  feedback = null,
}: ArticleQrScanDrawerProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setValue("");
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    const raw = value.trim();
    if (!raw || loading) return;
    await onScan(raw);
  }, [value, loading, onScan]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[80]"
        onClick={handleClose}
        aria-hidden
      />
      <div
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-[90] flex flex-col overflow-hidden animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-qr-scan-title"
      >
        <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
          <h3 id="article-qr-scan-title" className="text-sm font-bold text-gray-800">
            Scan label QR
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 p-1"
            aria-label="Close scan drawer"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-[10px] space-y-3">
          <p className="text-[11px] text-gray-600 leading-relaxed">
            Scan or paste the value from the knitting label QR (format{" "}
            <code className="text-[10px] bg-gray-100 px-1 rounded">PA|orderId|articleId</code>
            ). If the article is on <strong>{floorLabel}</strong>, it will be highlighted in
            Article view.
          </p>

          <label className="block text-[11px] font-semibold text-[#495057]" htmlFor="article-qr-scan-input">
            QR value
          </label>
          <input
            id="article-qr-scan-input"
            ref={inputRef}
            type="text"
            placeholder="PA|…|… or scan with gun"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmit();
            }}
            className="w-full border border-gray-300 rounded px-3 py-2.5 text-[12px] font-mono focus:ring-1 focus:ring-purple-300 focus:border-purple-500 placeholder:text-gray-400"
            aria-label="Production article QR scan value"
            autoComplete="off"
          />

          {feedback ? (
            <div
              role="alert"
              className={`rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${
                feedback.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : feedback.type === "error"
                    ? "bg-red-50 border-red-200 text-red-800"
                    : "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          <button
            type="button"
            disabled={!value.trim() || loading}
            onClick={() => void handleSubmit()}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm w-full disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
            ) : (
              <i className="ri-qr-scan-2-line text-xs" aria-hidden />
            )}
            Find article
          </button>
        </div>
      </div>
    </>
  );
}
