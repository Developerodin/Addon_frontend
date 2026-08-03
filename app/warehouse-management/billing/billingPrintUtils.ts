import type { WhmsInvoice } from "@/shared/services/whmsFulfilmentService";

/**
 * Opens a print window for an invoice payload (same layout as billing list Print action).
 * @param invoice - Invoice print payload
 */
export function printInvoiceDocument(invoice: WhmsInvoice & { generatedAt?: string }) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) {
    throw new Error("Popup blocked — allow popups to print");
  }

  const rows = (invoice.items || [])
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.styleCode}</td>
        <td>${item.size || ""}</td>
        <td>${item.shade || ""}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">${item.rate ?? ""}</td>
        <td style="text-align:right">${item.amount ?? ""}</td>
      </tr>`,
    )
    .join("");

  win.document.write(`<!doctype html><html><head><title>${invoice.invoiceNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 24px; }
      h2 { margin-bottom: 2px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #999; padding: 5px 8px; }
      th { background: #f2f2f2; text-align: left; }
      .meta { color: #444; margin: 2px 0; }
      .totals { margin-top: 10px; font-weight: bold; }
    </style></head><body>
    <h2>Invoice ${invoice.invoiceNumber}</h2>
    <p class="meta">Order: ${invoice.orderNumber || ""}</p>
    <p class="meta">Client: ${invoice.clientName || ""}</p>
    <table>
      <thead><tr><th>#</th><th>Style Code</th><th>Size</th><th>Shade</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="totals">Total Quantity: ${invoice.totalQuantity}</p>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
  win.document.close();
}
