/** 50×70mm — matches `KNITTING_CONTAINER_LABEL_QZ_SETTINGS` in knitting page */
const PAPER_W_MM = 50;
const PAPER_H_MM = 70;

export interface KnittingContainerLabelPrintPayload {
  /** QR payload — production article QR (`PA|orderId|articleId`). */
  qrPayload: string;
  articleNumber: string;
  orderNumber?: string;
}

/**
 * Escape user-provided strings before embedding in HTML.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build browser print HTML for a knitting container label.
 * Layout mirrors QZ Tray: QR = order+article ids, text = article number.
 */
export function buildKnittingContainerLabelBrowserPrintHTML(
  payload: KnittingContainerLabelPrintPayload
): string {
  const qrPayload = (payload.qrPayload || "").trim();
  const articleNumber = (payload.articleNumber || "").trim() || "—";
  const orderNumber = (payload.orderNumber || "").trim();
  const safeQr = escapeHtml(qrPayload);
  const safeArticle = escapeHtml(articleNumber);
  const safeOrder = escapeHtml(orderNumber);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Test Print — Knitting Article Label</title>
    <style>
      @page { size: ${PAPER_W_MM}mm ${PAPER_H_MM}mm; margin: 0; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, Helvetica, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .screen-toolbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: #1f2937;
        color: #f9fafb;
        font-size: 13px;
      }
      .screen-toolbar button {
        border: none;
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }
      .screen-toolbar .print-btn { background: #7c3aed; color: #fff; }
      .screen-toolbar .close-btn { background: #374151; color: #fff; }
      .screen-info {
        flex: 1;
        min-width: 220px;
        font-size: 11px;
        line-height: 1.4;
        color: #d1d5db;
      }
      .screen-info strong { color: #fff; }
      .preview-wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 72px 16px 24px;
        background: #f3f4f6;
      }
      .page {
        width: ${PAPER_W_MM}mm;
        height: ${PAPER_H_MM}mm;
        background: #fff;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        overflow: hidden;
        page-break-after: always;
      }
      .label {
        width: 100%;
        height: 100%;
        padding: 4mm 3mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 2mm;
      }
      .qr-wrap {
        width: 38mm;
        height: 38mm;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .qr-wrap canvas {
        width: 100% !important;
        height: auto !important;
        max-height: 100%;
      }
      .article {
        width: 100%;
        font-size: 14pt;
        font-weight: 700;
        line-height: 1.15;
        word-break: break-word;
      }
      .order {
        width: 100%;
        font-size: 9pt;
        color: #444;
        line-height: 1.1;
      }
      @media print {
        .screen-toolbar { display: none !important; }
        .preview-wrap {
          min-height: auto;
          padding: 0;
          background: #fff;
        }
        .page { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <div class="screen-toolbar">
      <button type="button" class="print-btn" onclick="window.print()">Print</button>
      <button type="button" class="close-btn" onclick="window.close()">Close</button>
      <div class="screen-info">
        <strong>Browser test label</strong> — same data as QZ Tray.
        QR encodes order + article ids: <strong>${safeQr}</strong>.
        Text: <strong>${safeArticle}</strong>${safeOrder ? ` · order ${safeOrder}` : ""}.
      </div>
    </div>
    <div class="preview-wrap">
      <div class="page">
        <div class="label">
          <div class="qr-wrap"><canvas id="knitting-container-qr" aria-label="Production article QR code"></canvas></div>
          <div class="article">${safeArticle}</div>
          ${safeOrder ? `<div class="order">${safeOrder}</div>` : ""}
        </div>
      </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
    <script>
      (function () {
        var qrPayload = ${JSON.stringify(qrPayload)};
        var canvas = document.getElementById("knitting-container-qr");
        if (!canvas || !qrPayload) return;
        QRCode.toCanvas(canvas, qrPayload, {
          width: 320,
          margin: 1,
          errorCorrectionLevel: "M"
        }).catch(function (err) {
          console.error("QR render failed:", err);
        });
      })();
    </script>
  </body>
</html>`;
}

/**
 * Open a browser print preview for the knitting article label (no QZ Tray required).
 * @returns true if the preview window opened
 */
export function openKnittingContainerLabelBrowserPrint(
  payload: KnittingContainerLabelPrintPayload
): boolean {
  const qrPayload = (payload.qrPayload || "").trim();
  if (!qrPayload) return false;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  printWindow.document.write(buildKnittingContainerLabelBrowserPrintHTML(payload));
  printWindow.document.close();
  return true;
}
