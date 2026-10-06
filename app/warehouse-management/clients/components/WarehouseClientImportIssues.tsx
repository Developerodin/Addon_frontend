"use client";

type WarehouseClientImportIssuesProps = {
  errors: string[];
  onDismiss: () => void;
};

/**
 * Lists spreadsheet rows that blocked a warehouse-client import.
 */
export default function WarehouseClientImportIssues({ errors, onDismiss }: WarehouseClientImportIssuesProps) {
  if (!errors.length) return null;
  const shown = errors.slice(0, 40);
  const hidden = errors.length - shown.length;

  return (
    <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold text-red-800">Import stopped. Nothing was saved.</p>
          <p className="mt-1 text-[11px] text-red-700">
            Fix {errors.length === 1 ? "this row" : `these ${errors.length} rows`} in the Excel file, then upload it again.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss import errors"
          className="shrink-0 rounded px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100"
        >
          Dismiss
        </button>
      </div>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {shown.map((error, index) => (
          <li key={`${index}-${error}`} className="text-[11px] leading-snug text-red-900">
            {error}
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <p className="mt-2 text-[11px] font-medium text-red-700">And {hidden} more row(s) with the same kind of problem.</p>
      ) : null}
    </div>
  );
}
