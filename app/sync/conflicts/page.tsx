'use client';

import { useCallback, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import Seo from '@/shared/layout-components/seo/seo';
import { API_BASE_URL } from '@/shared/data/utilities/api';

/**
 * Sync conflict review. Lists open same-field conflicts (Base / Factory / Cloud) and records an admin decision.
 * The decision is intent only: the backend does not apply it to orders, floors, PO, GRN, or any business data.
 * API: GET/POST `${API_BASE_URL}/sync-review/conflicts` (Bearer, manageUsers).
 */

type Decision = 'KEEP_LOCAL' | 'KEEP_REMOTE' | 'MANUAL';

type ReviewConflict = {
  id: string;
  entityType: string;
  aggregateId: string;
  aggregateVersion: number | null;
  reason: string;
  base: Record<string, unknown>;
  factory: Record<string, unknown>;
  cloud: Record<string, unknown>;
  factorySiteId: string | null;
  cloudSiteId: string | null;
  changedKeys: string[];
  nonOverlappingKeys: string[];
  createdAt: string;
};

type ReviewQueue = {
  openConflicts: number;
  rebased: number;
  inboxPending: number;
  inboxProbe: number;
  inboxLive: number;
  outboxPending: number;
};

const HIDDEN_UNLESS_CHANGED = new Set(['base', 'probe', 'flowId']);

const DECISIONS: { value: Decision; label: string; help: string }[] = [
  { value: 'KEEP_LOCAL', label: 'Keep local', help: 'Record that this server’s version should win' },
  { value: 'KEEP_REMOTE', label: 'Keep remote', help: 'Record that the other site’s version should win' },
  { value: 'MANUAL', label: 'Manual', help: 'Record that someone will fix this by hand' },
];

const REVIEW_BASE = `${API_BASE_URL}/sync-review/conflicts`;

function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    return Cookies.get('accessToken') || localStorage.getItem('token');
  } catch {
    return null;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error('No access token found. Please login again.');
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || `Request failed (HTTP ${res.status})`);
  return body as T;
}

/** Display value for one payload key. `undefined` means the key is absent on that side. */
function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'base')
      .map(([key, item]) => `${key}: ${formatValue(item)}`)
      .join(', ');
  }
  return JSON.stringify(value);
}

function ConflictCard({
  conflict,
  busy,
  onDecide,
}: {
  conflict: ReviewConflict;
  busy: boolean;
  onDecide: (id: string, decision: Decision) => void;
}) {
  const changed = new Set(conflict.changedKeys);
  const keys = Array.from(
    new Set([
      ...Object.keys(conflict.base || {}),
      ...Object.keys(conflict.factory || {}),
      ...Object.keys(conflict.cloud || {}),
    ])
  )
    .filter((k) => k !== 'base' && (changed.has(k) || !HIDDEN_UNLESS_CHANGED.has(k)))
    .sort((a, b) => Number(changed.has(b)) - Number(changed.has(a)) || a.localeCompare(b));
  const headingId = `conflict-${conflict.id}-title`;

  return (
    <article aria-labelledby={headingId} className="box mb-4">
      <header className="box-header flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id={headingId} className="box-title text-base font-semibold">
            {conflict.entityType} · {conflict.aggregateId}
          </h2>
          <p className="text-xs text-gray-500 dark:text-white/50">
            Version {conflict.aggregateVersion ?? '—'} · opened {new Date(conflict.createdAt).toLocaleString()}
          </p>
        </div>
        <p className="text-xs">
          <span className="font-medium">Changed on both sides:</span>{' '}
          {conflict.changedKeys.length ? conflict.changedKeys.join(', ') : '—'}
        </p>
      </header>

      <div className="box-body overflow-x-auto">
        <table className="min-w-full text-sm" aria-label={`Base, factory and cloud values for ${conflict.aggregateId}`}>
          <thead>
            <tr className="border-b border-defaultborder text-left">
              <th scope="col" className="py-2 pe-4">Field</th>
              <th scope="col" className="py-2 pe-4">Base</th>
              <th scope="col" className="py-2 pe-4">Factory{conflict.factorySiteId ? ` (${conflict.factorySiteId})` : ''}</th>
              <th scope="col" className="py-2 pe-4">Cloud{conflict.cloudSiteId ? ` (${conflict.cloudSiteId})` : ''}</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const isChanged = changed.has(key);
              return (
                <tr
                  key={key}
                  className={`border-b border-defaultborder ${isChanged ? 'bg-warning/10 font-semibold' : ''}`}
                  aria-label={isChanged ? `${key}: changed on both sides` : undefined}
                >
                  <th scope="row" className="py-2 pe-4 text-left font-medium">
                    {key}
                    {isChanged && <span className="sr-only"> (changed on both sides)</span>}
                  </th>
                  <td className="py-2 pe-4 break-all">{formatValue(conflict.base?.[key])}</td>
                  <td className="py-2 pe-4 break-all">{formatValue(conflict.factory?.[key])}</td>
                  <td className="py-2 pe-4 break-all">{formatValue(conflict.cloud?.[key])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="box-footer">
        <div role="group" aria-label={`Decision for ${conflict.aggregateId}`} className="flex flex-wrap gap-2">
          {DECISIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              disabled={busy}
              onClick={() => onDecide(conflict.id, d.value)}
              aria-label={`${d.label} for ${conflict.aggregateId}. ${d.help}. Recorded only, not applied.`}
              title={d.help}
              className="ti-btn ti-btn-primary disabled:opacity-50"
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-white/50">
          The decision is recorded only. No quantity, order, or floor is changed.
        </p>
      </footer>
    </article>
  );
}

export default function SyncConflictsPage() {
  const [conflicts, setConflicts] = useState<ReviewConflict[]>([]);
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await request<{ conflicts: ReviewConflict[]; queue?: ReviewQueue }>(REVIEW_BASE);
      setConflicts(body.conflicts || []);
      setQueue(body.queue || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load conflicts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = useCallback(
    async (id: string, decision: Decision) => {
      setBusyId(id);
      setError(null);
      setMessage(null);
      try {
        await request(`${REVIEW_BASE}/${encodeURIComponent(id)}/resolve`, {
          method: 'POST',
          body: JSON.stringify({ decision }),
        });
        setMessage(`Decision ${decision} recorded. Nothing was applied.`);
        setConflicts((rows) => rows.filter((r) => r.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not record the decision');
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  return (
    <>
      <Seo title="Sync conflicts" />
      <main aria-labelledby="sync-conflicts-title" className="mt-4">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 id="sync-conflicts-title" className="text-lg font-semibold">
              Sync conflicts
            </h1>
            <p className="text-sm text-[#8c9097] dark:text-white/60">
              Only a field changed on both sides is a conflict. A recorded decision does not change a floor, an order, or a quantity.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Reload open conflicts"
            className="ti-btn ti-btn-light disabled:opacity-50"
          >
            Reload
          </button>
        </header>

        <div aria-live="polite" role="status" className="mb-3 text-sm">
          {message && <p className="text-success">{message}</p>}
        </div>
        {error && (
          <p role="alert" className="mb-3 text-sm text-danger">
            {error}
          </p>
        )}

        {queue && (
          <section aria-label="Sync queue" className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="box mb-0 border border-danger/20">
              <div className="box-body">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8c9097]">Open conflicts</p>
                <p className="mt-1 text-2xl font-semibold">{queue.openConflicts}</p>
                <p className="mt-1 text-xs text-[#8c9097] dark:text-white/60">Same field edited on both sides. Decide below.</p>
              </div>
            </article>
            <article className="box mb-0">
              <div className="box-body">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8c9097]">Live inbox</p>
                <p className="mt-1 text-2xl font-semibold">{queue.inboxLive}</p>
                <p className="mt-1 text-xs text-[#8c9097] dark:text-white/60">Real events received and not applied.</p>
              </div>
            </article>
            <article className="box mb-0">
              <div className="box-body">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8c9097]">Waiting to send</p>
                <p className="mt-1 text-2xl font-semibold">{queue.outboxPending}</p>
                <p className="mt-1 text-xs text-[#8c9097] dark:text-white/60">Events this server still has to push.</p>
              </div>
            </article>
            <article className="box mb-0">
              <div className="box-body">
                <p className="text-xs font-medium uppercase tracking-wide text-[#8c9097]">Test leftovers</p>
                <p className="mt-1 text-2xl font-semibold">{queue.inboxProbe}</p>
                <p className="mt-1 text-xs text-[#8c9097] dark:text-white/60">
                  From the local test script. Not factory work. {queue.rebased} rebased row{queue.rebased === 1 ? '' : 's'} stored, not applied.
                </p>
              </div>
            </article>
          </section>
        )}

        <section aria-label="Open conflicts" aria-busy={loading}>
          {loading && <p className="text-sm">Loading…</p>}
          {!loading && !error && conflicts.length === 0 && <p className="text-sm">No open conflicts.</p>}
          {conflicts.map((c) => (
            <ConflictCard key={c.id} conflict={c} busy={busyId === c.id} onDecide={decide} />
          ))}
        </section>
      </main>
    </>
  );
}
