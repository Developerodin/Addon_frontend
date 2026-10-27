/** Shared field, label, and button classes for the task board. Colors come from tasks.css tokens. */
const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tk-accent)]';

export const taskFieldClass =
  'mt-1.5 w-full rounded-xl border border-[var(--tk-line-strong)] bg-[var(--tk-surface)] px-3 py-2.5 text-sm text-[var(--tk-ink)] placeholder:text-[var(--tk-ink-3)] focus:border-[var(--tk-accent)] focus:outline-none focus:ring-2 focus:ring-blue-500/25 disabled:opacity-60 dark:[color-scheme:dark]';

export const taskLabelClass = 'block text-[13px] font-medium text-[var(--tk-ink-2)]';

export const taskHintClass = 'mt-1 text-xs text-[var(--tk-ink-3)]';

export const taskSectionTitle = 'text-[13px] font-semibold text-[var(--tk-ink)]';

export const taskPrimaryButton = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--tk-accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--tk-accent-hover)] active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export const taskSecondaryButton = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--tk-line-strong)] bg-[var(--tk-surface)] px-4 text-sm font-semibold text-[var(--tk-ink)] transition-colors hover:bg-[var(--tk-sunken)] active:bg-[var(--tk-line)] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export const taskQuietButton = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-[var(--tk-ink-2)] transition-colors hover:bg-[var(--tk-sunken)] active:bg-[var(--tk-line)] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

export const taskIconButton = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--tk-ink-2)] transition-colors hover:bg-[var(--tk-sunken)] active:bg-[var(--tk-line)] ${focusRing}`;

export const taskFocusRing = focusRing;

/** Drawer panel: full screen on phones, a right-hand sheet from `sm` up. */
export const taskDrawerPanel =
  'tk-layer tk-drawer-enter fixed inset-y-0 right-0 z-[95] flex w-full flex-col bg-[var(--tk-surface)] text-[var(--tk-ink)] shadow-[var(--tk-shadow-raised)] focus:outline-none sm:w-[min(560px,100vw)] sm:border-l sm:border-[var(--tk-line)]';

export const taskDrawerScrim = 'tk-layer tk-scrim-enter fixed inset-0 z-[94] bg-[var(--tk-scrim)]';
