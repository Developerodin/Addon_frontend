import React, { useId, useRef } from 'react';
import { taskFocusRing, taskLabelClass } from '../taskChrome';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
  /** Tone classes applied when this option is chosen. */
  activeClass?: string;
}

interface SegmentedChoiceProps<T extends string> {
  label: string;
  name: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

/**
 * A short set of choices shown at once instead of hidden in a select.
 * ARIA radiogroup: one tab stop, arrow keys move and select.
 */
export function SegmentedChoice<T extends string>({ label, name, value, options, onChange, disabled }: SegmentedChoiceProps<T>) {
  const labelId = `${name}-label`;
  const groupRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step || disabled) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  };

  return (
    <div className={`min-w-0 ${disabled ? 'opacity-60' : ''}`}>
      <span id={labelId} className={taskLabelClass}>{label}</span>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        className="mt-1.5 grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-[var(--tk-sunken)] p-1 ring-1 ring-inset ring-[var(--tk-line)]"
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              data-value={option.value}
              tabIndex={checked ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-lg px-2 text-center text-[13px] font-semibold transition-colors disabled:cursor-not-allowed ${taskFocusRing} ${
                checked
                  ? `${option.activeClass || 'bg-[var(--tk-surface)] text-[var(--tk-ink)]'} shadow-[var(--tk-shadow)] ring-1 ring-[var(--tk-line)]`
                  : 'text-[var(--tk-ink-2)] hover:bg-[var(--tk-surface)] hover:text-[var(--tk-ink)]'
              }`}
            >
              {option.icon && <i className={option.icon} aria-hidden />}
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface FilePickerProps {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  icon: string;
  disabled?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * File input styled as a drop target button, with the chosen files listed and removable one by one.
 */
export function FilePicker({ label, files, onChange, accept, icon, disabled }: FilePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (list: FileList | null) => {
    const next = Array.from(list || []);
    if (next.length) onChange([...files, ...next]);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="min-w-0">
      <label
        htmlFor={inputId}
        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--tk-line-strong)] bg-[var(--tk-surface)] px-3 py-2.5 text-sm font-medium text-[var(--tk-ink-2)] transition-colors hover:border-[var(--tk-accent)] hover:text-[var(--tk-accent-ink)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--tk-accent)] ${
          disabled ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        <i className={`${icon} text-base`} aria-hidden />
        <span className="flex-1">{label}</span>
        <i className="ri-add-line" aria-hidden />
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          onChange={(event) => add(event.target.files)}
          className="sr-only"
        />
      </label>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1" aria-label={`${label}, ${files.length} chosen`}>
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-2 rounded-lg bg-[var(--tk-sunken)] py-1 pl-3 pr-1 text-xs text-[var(--tk-ink-2)]"
            >
              <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
              <span className="shrink-0 tabular-nums text-[var(--tk-ink-3)]">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                aria-label={`Remove ${file.name}`}
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-[var(--tk-line)] ${taskFocusRing}`}
              >
                <i className="ri-close-line" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
