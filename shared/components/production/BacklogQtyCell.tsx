import React from "react";

/**
 * Formats a pending qty cell; future days are an em dash.
 * @param value Qty or null
 */
export function formatBacklogCell(value: number | null | undefined): string {
  if (value == null) return "—";
  return Math.round(value).toLocaleString();
}

/**
 * Pending + upcoming combined total; null when pending is a future blank.
 * @param pending On-floor pending
 * @param upcoming Live upcoming qty
 */
export function combinedBacklogTotal(
  pending: number | null | undefined,
  upcoming: number | undefined
): number | null {
  if (pending == null) return null;
  return Math.round(pending) + Math.round(upcoming || 0);
}

export interface BacklogQtyCellProps {
  /** On-floor pending (received − transferred). */
  pending: number | null | undefined;
  /** Live Upcoming qty; only shown when > 0. */
  upcoming?: number;
  /** Bold the pending figure (Total column). */
  emphasize?: boolean;
  /** Accessible name for the pending vs upcoming split. */
  pendingLabel?: string;
}

/**
 * Backlog qty cell: pending, then +upcoming and combined total when Upcoming is present.
 */
export default function BacklogQtyCell({
  pending,
  upcoming = 0,
  emphasize = false,
  pendingLabel = "pending",
}: BacklogQtyCellProps) {
  const hasUpcoming = upcoming > 0;
  const pendingText = formatBacklogCell(pending);
  const combined = combinedBacklogTotal(pending, upcoming);
  const label = hasUpcoming
    ? `${pendingText} ${pendingLabel}, ${upcoming.toLocaleString()} upcoming, ${combined?.toLocaleString()} total`
    : undefined;

  return (
    <td
      className={`px-1.5 py-1.5 text-right tabular-nums border border-gray-300 ${
        emphasize ? "font-bold" : "text-[11px]"
      } ${pending == null ? "text-gray-300" : "text-gray-800"}`}
      aria-label={label}
    >
      <span className={emphasize ? "text-[11px] font-bold" : undefined}>{pendingText}</span>
      {hasUpcoming ? (
        <>
          <span className="block text-[10px] font-medium text-purple-600 leading-tight">
            +{upcoming.toLocaleString()}
          </span>
          <span className="block text-[10px] font-bold text-gray-800 leading-tight">
            {combined?.toLocaleString()}
          </span>
        </>
      ) : null}
    </td>
  );
}
