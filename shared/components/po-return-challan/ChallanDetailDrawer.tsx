"use client";
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import poReturnChallanService, { PoReturnChallan } from '@/shared/services/poReturnChallanService';
import { printChallanDocument, downloadChallanHtml } from '@/shared/utils/poReturnChallanPrint';

interface ChallanDetailDrawerProps {
  challan: PoReturnChallan | null;
  onClose: () => void;
  onUpdated?: (updated: PoReturnChallan) => void;
  /** When true, render inline (deep-link page) instead of overlay drawer. */
  inline?: boolean;
}

type Tab = 'overview' | 'lines' | 'transport';

const fmtDate = (value?: string | Date | null): string => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Detail drawer for a single PO return challan snapshot.
 */
const ChallanDetailDrawer: React.FC<ChallanDetailDrawerProps> = ({
  challan,
  onClose,
  onUpdated,
  inline = false,
}) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [current, setCurrent] = useState<PoReturnChallan | null>(challan);
  const [transportDraft, setTransportDraft] = useState({
    vehicleNo: '',
    driverName: '',
    dispatchDate: '',
    transportNotes: '',
  });
  const [savingTransport, setSavingTransport] = useState(false);

  useEffect(() => {
    setTab('overview');
    setCurrent(challan);
    setTransportDraft({
      vehicleNo: challan?.transport?.vehicleNo || '',
      driverName: challan?.transport?.driverName || '',
      dispatchDate: challan?.transport?.dispatchDate
        ? String(challan.transport.dispatchDate).slice(0, 10)
        : '',
      transportNotes: challan?.transport?.transportNotes || '',
    });
  }, [challan?.id, challan]);

  if (!challan || !current) return null;

  const handlePrint = async () => {
    try {
      await printChallanDocument(current);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Print failed');
    }
  };

  const handleDownload = async () => {
    try {
      await downloadChallanHtml(current);
      toast.success(`${current.challanNumber} downloaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleSaveTransport = async () => {
    setSavingTransport(true);
    try {
      const updated = await poReturnChallanService.patchChallanTransport(current.id, {
        vehicleNo: transportDraft.vehicleNo,
        driverName: transportDraft.driverName,
        dispatchDate: transportDraft.dispatchDate || undefined,
        transportNotes: transportDraft.transportNotes,
      });
      setCurrent(updated);
      onUpdated?.(updated);
      toast.success('Transport details saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingTransport(false);
    }
  };

  const panel = (
    <aside
      className={
        inline
          ? 'w-full bg-white flex flex-col static-challan-detail'
          : 'w-full md:w-[720px] bg-white shadow-2xl flex flex-col'
      }
    >
      <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div>
          <h2 className="text-sm font-bold text-gray-800">{current.challanNumber}</h2>
          <p className="text-[11px] text-gray-500">
            PO {current.poNumber} · {fmtDate(current.challanDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handlePrint()}
            className="px-2 py-1 text-[10px] font-bold border border-gray-200 rounded hover:bg-gray-50"
            aria-label="Print challan"
          >
            Print
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            className="px-2 py-1 text-[10px] font-bold border border-gray-200 rounded hover:bg-gray-50"
            aria-label="Download challan"
          >
            Download
          </button>
          {!inline && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-100"
              aria-label="Close drawer"
            >
              <i className="ri-close-line text-lg" aria-hidden />
            </button>
          )}
        </div>
      </header>

      <div className="flex gap-1 px-5 pt-2 border-b border-gray-100" role="tablist" aria-label="Challan detail tabs">
        {(['overview', 'lines', 'transport'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-[11px] font-bold capitalize rounded-t ${
              tab === t ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600' : 'text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-5 text-[11px]">
        {tab === 'overview' && (
          <dl className="grid grid-cols-2 gap-3">
            <div><dt className="text-gray-500 font-bold uppercase text-[10px]">Supplier</dt><dd>{current.supplier?.name || '—'}</dd></div>
            <div><dt className="text-gray-500 font-bold uppercase text-[10px]">GST</dt><dd>{current.supplier?.gstNo || '—'}</dd></div>
            <div><dt className="text-gray-500 font-bold uppercase text-[10px]">Cones</dt><dd>{current.totals?.coneCount ?? current.lines?.length ?? '—'}</dd></div>
            <div><dt className="text-gray-500 font-bold uppercase text-[10px]">Net (kg)</dt><dd>{current.totals?.totalNetWeight ?? '—'}</dd></div>
            <div><dt className="text-gray-500 font-bold uppercase text-[10px]">Gross (kg)</dt><dd>{current.totals?.totalGrossWeight ?? '—'}</dd></div>
            <div><dt className="text-gray-500 font-bold uppercase text-[10px]">Intent</dt><dd>{current.cancellationIntent || '—'}</dd></div>
            <div className="col-span-2"><dt className="text-gray-500 font-bold uppercase text-[10px]">Remark</dt><dd>{current.remark || '—'}</dd></div>
            <div><dt className="text-gray-500 font-bold uppercase text-[10px]">Prepared by</dt><dd>{current.createdBy?.username || current.createdBy?.email || '—'}</dd></div>
            <div><dt className="text-gray-500 font-bold uppercase text-[10px]">Completed</dt><dd>{fmtDate(current.completedAt || current.challanDate)}</dd></div>
          </dl>
        )}

        {tab === 'lines' && (
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="min-w-full text-[11px]">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase text-gray-600">
                  <th className="px-2 py-1.5 text-left">#</th>
                  <th className="px-2 py-1.5 text-left">Barcode</th>
                  <th className="px-2 py-1.5 text-left">Lot</th>
                  <th className="px-2 py-1.5 text-left">Yarn</th>
                  <th className="px-2 py-1.5 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {(current.lines || []).map((line, i) => (
                  <tr key={`${line.barcode}-${i}`} className="border-t border-gray-100">
                    <td className="px-2 py-1.5">{i + 1}</td>
                    <td className="px-2 py-1.5 font-mono">{line.barcode}</td>
                    <td className="px-2 py-1.5">{line.lotNumber || '—'}</td>
                    <td className="px-2 py-1.5">{line.yarnName || '—'}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{line.netWeight ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'transport' && (
          <form
            className="space-y-3 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveTransport();
            }}
          >
            <div>
              <label htmlFor="transport-vehicle" className="block text-[10px] font-bold text-gray-600 mb-1">Vehicle No</label>
              <input
                id="transport-vehicle"
                type="text"
                className="w-full border border-gray-200 rounded px-2 py-1.5"
                value={transportDraft.vehicleNo}
                onChange={(e) => setTransportDraft((d) => ({ ...d, vehicleNo: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="transport-driver" className="block text-[10px] font-bold text-gray-600 mb-1">Driver Name</label>
              <input
                id="transport-driver"
                type="text"
                className="w-full border border-gray-200 rounded px-2 py-1.5"
                value={transportDraft.driverName}
                onChange={(e) => setTransportDraft((d) => ({ ...d, driverName: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="transport-date" className="block text-[10px] font-bold text-gray-600 mb-1">Dispatch Date</label>
              <input
                id="transport-date"
                type="date"
                className="w-full border border-gray-200 rounded px-2 py-1.5"
                value={transportDraft.dispatchDate}
                onChange={(e) => setTransportDraft((d) => ({ ...d, dispatchDate: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="transport-notes" className="block text-[10px] font-bold text-gray-600 mb-1">Notes</label>
              <textarea
                id="transport-notes"
                rows={3}
                className="w-full border border-gray-200 rounded px-2 py-1.5"
                value={transportDraft.transportNotes}
                onChange={(e) => setTransportDraft((d) => ({ ...d, transportNotes: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              disabled={savingTransport}
              className="px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded disabled:opacity-50"
            >
              {savingTransport ? 'Saving…' : 'Save transport'}
            </button>
          </form>
        )}
      </div>
    </aside>
  );

  if (inline) return panel;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Return challan details">
      <button type="button" className="flex-1 bg-black/40" onClick={onClose} aria-label="Close drawer" />
      {panel}
    </div>
  );
};

export default ChallanDetailDrawer;
