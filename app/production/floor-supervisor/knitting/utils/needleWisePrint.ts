import type { NeedleWiseRow, NeedleWiseTotals } from "./needleWiseProduction";

/** Escapes text before it is injected into the print document. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Renders a number with thousands separators, or a dash when null. */
function formatCell(value: number | null): string {
  return value === null ? "-" : value.toLocaleString();
}

/**
 * Opens a print window with the Needle Wise Production Planning table.
 *
 * @throws when the browser blocks the popup.
 */
export function printNeedleWiseTable(
  rows: NeedleWiseRow[],
  totals: NeedleWiseTotals,
  dailyRate: number,
): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Popup blocked. Allow popups to print.");
  }

  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const bodyRows = rows
    .map(
      (row) => `<tr>
        <td class="needle">${escapeHtml(row.needle)}</td>
        <td class="num">${row.inactiveMachines.toLocaleString()}</td>
        <td class="num">${row.activeMachines.toLocaleString()}</td>
        <td class="num">${row.pendingQty.toLocaleString()}</td>
        <td class="num">${formatCell(row.daysRequired)}</td>
        <td>${escapeHtml(row.remarks.map((r) => r.text).join(" · "))}</td>
      </tr>`,
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Needle Wise Production Planning - ${dateStr}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: system-ui, sans-serif; font-size: 10px; }
          .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
          h1 { margin: 0; font-size: 14px; font-weight: bold; }
          .meta { font-size: 10px; color: #444; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; font-size: 9px; text-transform: uppercase; }
          td.num, th.num { text-align: right; }
          td.needle { font-weight: bold; }
          tfoot td { font-weight: bold; background: #f0f0f0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Needle Wise Production Planning</h1>
          <span class="meta">${dailyRate.toLocaleString()} pcs / machine / day &nbsp;·&nbsp; ${dateStr}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Machine Needle</th>
              <th class="num">Inactive Machine</th>
              <th class="num">Active Machine</th>
              <th class="num">Knitting Pending QTY</th>
              <th class="num">No of days</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
          <tfoot>
            <tr>
              <td>Total (${totals.needleCount} needles)</td>
              <td class="num">${totals.inactiveMachines.toLocaleString()}</td>
              <td class="num">${totals.activeMachines.toLocaleString()}</td>
              <td class="num">${totals.pendingQty.toLocaleString()}</td>
              <td class="num">${formatCell(totals.daysRequired)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
