"use client";
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import yarnGrnService, { YarnGrn } from '@/shared/services/yarnGrnService';
import { printGrnDocument } from '@/shared/utils/grnPrint';
import GrnHeaderEditor from './GrnHeaderEditor';

interface GrnDetailDrawerProps {
  grn: YarnGrn | null;
  onClose: () => void;
  /**
   * Optional callback the parent uses to refresh its list/state when the GRN
   * header is edited in-place. Receives the freshly-patched GRN so the list
   * row can update without a round-trip refetch.
   */
  onUpdated?: (updated: YarnGrn) => void;
}

type Tab = 'overview' | 'lots' | 'items' | 'revisions';

const fmtDate = (value?: string | Date | null): string => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const fmtINR = (n: number, digits = 2) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * Slide-over drawer that previews a single GRN. Tabs:
 *  - Overview: header (vendor, dates, gross/net weight totals, quantity totals, discrepancy)
 *  - Lots: subtable matching what gets printed
 *  - Items: line items snapshot
 *  - Revisions: full chain (only fetched when tab is opened)
 */
const GrnDetailDrawer: React.FC<GrnDetailDrawerProps> = ({ grn, onClose, onUpdated }) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [revisions, setRevisions] = useState<YarnGrn[] | null>(null);
  const [loadingRevs, setLoadingRevs] = useState(false);
  // Local mirror of the prop so in-place edits show immediately without
  // waiting for the parent to refetch the list. Re-syncs when prop changes.
  const [current, setCurrent] = useState<YarnGrn | null>(grn);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setTab('overview');
    setRevisions(null);
    setCurrent(grn);
    setEditing(false);
  }, [grn?.id, grn]);

  useEffect(() => {
    let cancelled = false;
    if (tab !== 'revisions' || !grn?.id || revisions !== null) return;
    setLoadingRevs(true);
    yarnGrnService
      .getRevisions(grn.id)
      .then((res) => { if (!cancelled) setRevisions(res.results || []); })
      .catch((err) => {
        if (!cancelled) toast.error(err?.message || 'Failed to load revisions');
      })
      .finally(() => { if (!cancelled) setLoadingRevs(false); });
    return () => { cancelled = true; };
  }, [tab, grn?.id, revisions]);

  if (!grn || !current) return null;

  const handlePrint = async () => {
    try {
      await printGrnDocument(current);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to print GRN';
      toast.error(message);
    }
  };

  const handleHeaderSaved = (updated: YarnGrn) => {
    setCurrent(updated);
    setEditing(false);
    onUpdated?.(updated);
  };

  const totalBoxes = (current.lots || []).reduce((s, l) => s + (l.numberOfBoxes || 0), 0);
  const totalCones = (current.lots || []).reduce((s, l) => s + (l.numberOfCones || 0), 0);
  const totalGrossWeight = (current.lots || []).reduce((s, l) => s + (l.totalWeight || 0), 0);
  const totalNetWeight = (current.lots || []).reduce((s, l) => s + (Number(l.netWeight) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="GRN details">
      <button type="button" className="flex-1 bg-black/40" onClick={onClose} aria-label="Close drawer" />
      <aside className="w-full md:w-[720px] bg-white shadow-2xl flex flex-col">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              {current.grnNumber}
              {current.revisionNo > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                  R{current.revisionNo}
                </span>
              )}
              {current.status === 'superseded' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">
                  Superseded
                </span>
              )}
            </h2>
            <p className="text-[11px] text-gray-500">PO {current.poNumber} · {fmtDate(current.grnDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Edit is hidden for superseded GRNs — the active revision is the
                source of truth. Editing a superseded doc would be confusing. */}
            {current.status === 'active' && (
              <button
                type="button"
                onClick={() => {
                  setTab('overview');
                  setEditing((v) => !v);
                }}
                className={`px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${
                  editing
                    ? 'bg-purple-100 border-purple-300 text-purple-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                aria-label={editing ? 'Cancel editing' : 'Edit GRN header'}
                aria-pressed={editing}
                title="Edit vendor invoice & discrepancy details"
              >
                <i className="ri-edit-2-line mr-1" aria-hidden />
                {editing ? 'Editing' : 'Edit'}
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-[11px] font-bold text-white rounded bg-indigo-600 hover:bg-indigo-700 transition-colors"
              aria-label="Print GRN"
            >
              <i className="ri-printer-line mr-1" aria-hidden /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700"
              aria-label="Close"
            >
              <i className="ri-close-line text-xl" aria-hidden />
            </button>
          </div>
        </header>

        <nav className="flex border-b border-gray-100 px-5" aria-label="GRN sections">
          {(['overview', 'lots', 'items', 'revisions'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
                tab === t ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              aria-current={tab === t ? 'page' : undefined}
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-[12px] text-gray-700">
          {tab === 'overview' && (
            <section className="space-y-4">
              {editing && (
                <GrnHeaderEditor
                  grn={current}
                  onSaved={handleHeaderSaved}
                  onCancel={() => setEditing(false)}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Supplier</h3>
                  <p className="font-bold text-gray-800">{current.supplier?.name || '—'}</p>
                  <p className="text-[11px] text-gray-500">{current.supplier?.address || ''}</p>
                  <p className="text-[11px] text-gray-500">GST: {current.supplier?.gstNo || '—'}</p>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Vendor Invoice</h3>
                  <p className="font-bold text-gray-800">{current.vendorInvoiceNo || '—'}</p>
                  <p className="text-[11px] text-gray-500">Date: {fmtDate(current.vendorInvoiceDate)}</p>
                  {!current.vendorInvoiceNo && !editing && current.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="mt-1 text-[10px] font-bold text-purple-700 hover:underline"
                    >
                      <i className="ri-add-line" aria-hidden /> Add invoice details
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Total Lots</p>
                  <p className="text-base font-bold text-gray-800">{(current.lots || []).length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Total Boxes</p>
                  <p className="text-base font-bold text-gray-800">{totalBoxes}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Total Cones</p>
                  <p className="text-base font-bold text-gray-800">{totalCones}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Gross weight</p>
                  <p className="text-base font-bold text-gray-800">{fmtINR(totalGrossWeight)} kg</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Net weight</p>
                  <p className="text-base font-bold text-gray-800">{fmtINR(totalNetWeight)} kg</p>
                </div>
              </div>

              {current.discrepancyDetails ? (
                <div className="bg-amber-50 border border-amber-100 rounded p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Discrepancy</p>
                      <p className="text-[11px] text-amber-800 whitespace-pre-wrap">{current.discrepancyDetails}</p>
                    </div>
                    {!editing && current.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="text-[10px] font-bold text-amber-700 hover:underline shrink-0 ml-2"
                        aria-label="Edit discrepancy details"
                      >
                        <i className="ri-edit-line" aria-hidden /> Edit
                      </button>
                    )}
                  </div>
                </div>
              ) : !editing && current.status === 'active' ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="block w-full text-center text-[11px] text-gray-500 border border-dashed border-gray-300 rounded p-3 hover:border-purple-300 hover:text-purple-700 transition-colors"
                >
                  <i className="ri-add-line mr-1" aria-hidden />
                  Add discrepancy details
                </button>
              ) : null}

              {current.revisionReason && (
                <div className="bg-purple-50 border border-purple-100 rounded p-3">
                  <p className="text-[10px] font-bold text-purple-700 uppercase mb-1">Revision Reason</p>
                  <p className="text-[11px] text-purple-800">{current.revisionReason}</p>
                </div>
              )}
            </section>
          )}

          {tab === 'lots' && (
            <table className="w-full text-[11px] border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-2 text-left font-bold text-gray-600 border-b border-gray-200">Lot No</th>
                  <th className="px-2 py-2 text-right font-bold text-gray-600 border-b border-gray-200">Cones</th>
                  <th className="px-2 py-2 text-right font-bold text-gray-600 border-b border-gray-200">Gross (kg)</th>
                  <th className="px-2 py-2 text-right font-bold text-gray-600 border-b border-gray-200">Net (kg)</th>
                  <th className="px-2 py-2 text-right font-bold text-gray-600 border-b border-gray-200">Boxes</th>
                  <th className="px-2 py-2 text-left font-bold text-gray-600 border-b border-gray-200">Lines</th>
                </tr>
              </thead>
              <tbody>
                {(current.lots || []).map((lot) => (
                  <tr key={lot.lotNumber} className={lot.voided ? 'line-through text-gray-400' : ''}>
                    <td className="px-2 py-2 font-bold border-b border-gray-100">{lot.lotNumber}{lot.voided ? ' (voided)' : ''}</td>
                    <td className="px-2 py-2 text-right border-b border-gray-100">{fmtINR(lot.numberOfCones, 0)}</td>
                    <td className="px-2 py-2 text-right border-b border-gray-100">{fmtINR(lot.totalWeight)}</td>
                    <td className="px-2 py-2 text-right border-b border-gray-100">{fmtINR(Number(lot.netWeight) || 0)}</td>
                    <td className="px-2 py-2 text-right border-b border-gray-100">{fmtINR(lot.numberOfBoxes, 0)}</td>
                    <td className="px-2 py-2 border-b border-gray-100 text-gray-500">{(lot as { poItems?: unknown[] }).poItems?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'items' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[11px] border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-2 text-left font-bold text-gray-600 border-b border-gray-200">Yarn</th>
                    <th className="px-2 py-2 text-left font-bold text-gray-600 border-b border-gray-200">Size</th>
                    <th className="px-2 py-2 text-left font-bold text-gray-600 border-b border-gray-200">Shade</th>
                    <th className="px-2 py-2 text-left font-bold text-gray-600 border-b border-gray-200">HSN</th>
                    <th className="px-2 py-2 text-right font-bold text-gray-600 border-b border-gray-200">Qty</th>
                    <th className="px-2 py-2 text-right font-bold text-gray-600 border-b border-gray-200">Rate</th>
                    <th className="px-2 py-2 text-right font-bold text-gray-600 border-b border-gray-200">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(current.items || []).map((it, i) => (
                    <tr key={i}>
                      <td className="px-2 py-2 font-bold border-b border-gray-100">{it.yarnName || '—'}</td>
                      <td className="px-2 py-2 border-b border-gray-100">{it.sizeCount || '—'}</td>
                      <td className="px-2 py-2 border-b border-gray-100">{it.shadeCode || '—'}</td>
                      <td className="px-2 py-2 border-b border-gray-100">{it.hsnCode || '—'}</td>
                      <td className="px-2 py-2 text-right border-b border-gray-100">{fmtINR(it.quantity)}</td>
                      <td className="px-2 py-2 text-right border-b border-gray-100">{fmtINR(it.rate)}</td>
                      <td className="px-2 py-2 text-right border-b border-gray-100 font-bold">{fmtINR(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'revisions' && (
            <div className="space-y-3">
              {loadingRevs ? (
                <p className="text-[11px] text-gray-500">Loading revisions…</p>
              ) : !revisions || revisions.length === 0 ? (
                <p className="text-[11px] text-gray-500">No revisions yet — this is the original.</p>
              ) : (
                revisions.map((rev) => (
                  <article key={rev.id} className="border border-gray-200 rounded p-3">
                    <header className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-[12px] font-bold text-gray-800">
                          {rev.grnNumber}
                          {rev.status === 'active' && (
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 uppercase">Active</span>
                          )}
                          {rev.status === 'superseded' && (
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">Superseded</span>
                          )}
                        </h3>
                        <p className="text-[10px] text-gray-500">{fmtDate(rev.grnDate)} · {rev.createdBy?.username || '—'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => printGrnDocument(rev).catch((e) => toast.error(e?.message || 'Print failed'))}
                        className="px-2 py-1 text-[10px] font-bold text-purple-700 hover:bg-purple-50 rounded"
                        aria-label={`Print revision ${rev.grnNumber}`}
                      >
                        <i className="ri-printer-line" aria-hidden />
                      </button>
                    </header>
                    {rev.revisionReason && (
                      <p className="text-[11px] text-purple-700 italic mb-2">"{rev.revisionReason}"</p>
                    )}
                    {(rev.revisionDiff || []).length > 0 && (
                      <table className="w-full text-[10px] border border-gray-100">
                        <thead>
                          <tr className="bg-gray-50/60">
                            <th className="px-2 py-1 text-left font-bold text-gray-500">Field</th>
                            <th className="px-2 py-1 text-left font-bold text-gray-500">Before</th>
                            <th className="px-2 py-1 text-left font-bold text-gray-500">After</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(rev.revisionDiff || []).map((d, i) => (
                            <tr key={i}>
                              <td className="px-2 py-1 border-t border-gray-100 font-bold">{d.field}</td>
                              <td className="px-2 py-1 border-t border-gray-100 text-gray-500 line-through">{String(d.before)}</td>
                              <td className="px-2 py-1 border-t border-gray-100 text-purple-700 font-bold">{String(d.after)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </article>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default GrnDetailDrawer;
