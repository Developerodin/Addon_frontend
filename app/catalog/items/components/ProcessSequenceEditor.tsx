'use client';

import React, { useCallback, useRef, useState } from 'react';

export interface ProcessSequenceItem {
  processId: string;
}

export interface ProcessOption {
  id: string;
  name: string;
  type?: string;
  description?: string;
}

interface ProcessSequenceEditorProps {
  items: ProcessSequenceItem[];
  availableProcesses: ProcessOption[];
  onChange: (items: ProcessSequenceItem[]) => void;
  disabled?: boolean;
}

/**
 * Normalize processId when API returns a populated object instead of a string id.
 */
function resolveProcessId(
  processId: string | { id?: string } | null | undefined
): string {
  if (!processId) return '';
  if (typeof processId === 'object' && 'id' in processId) {
    return String((processId as { id: string }).id);
  }
  return String(processId);
}

/**
 * Move one list item from fromIndex to toIndex (inclusive reorder).
 */
function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...list];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
}

/**
 * Serial production process editor with drag-and-drop reorder and insert-between steps.
 */
export function ProcessSequenceEditor({
  items,
  availableProcesses,
  onChange,
  disabled = false,
}: ProcessSequenceEditorProps) {
  const dragFromIndexRef = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const displayItems = items.length > 0 ? items : [{ processId: '' }];

  const handleInsertAt = useCallback(
    (index: number) => {
      const next = [...displayItems];
      next.splice(index, 0, { processId: '' });
      onChange(next);
    },
    [displayItems, onChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      if (displayItems.length <= 1) {
        onChange([{ processId: '' }]);
        return;
      }
      onChange(displayItems.filter((_, i) => i !== index));
    },
    [displayItems, onChange]
  );

  const handleProcessSelect = useCallback(
    (index: number, value: string) => {
      const next = [...displayItems];
      next[index] = { processId: value };
      onChange(next);
    },
    [displayItems, onChange]
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= displayItems.length || fromIndex === toIndex) return;
      onChange(reorderList(displayItems, fromIndex, toIndex));
    },
    [displayItems, onChange]
  );

  const handleDrop = useCallback(
    (toIndex: number) => {
      const from = dragFromIndexRef.current;
      if (from === null || from === toIndex) return;
      onChange(reorderList(displayItems, from, toIndex));
      dragFromIndexRef.current = null;
      setDraggingIndex(null);
    },
    [displayItems, onChange]
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Steps run top to bottom in serial order. Drag a row, use arrows, or{' '}
        <span className="font-medium text-gray-700 dark:text-gray-300">Insert step here</span>{' '}
        to add a process between existing steps.
      </p>

      <div
        className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        role="list"
        aria-label="Production process sequence"
      >
        {displayItems.map((item, index) => {
          const currentProcessId = resolveProcessId(
            item.processId as string | { id?: string }
          );
          const selectedProcess = availableProcesses.find((p) => p.id === currentProcessId);
          const isDragging = draggingIndex === index;
          const canDrag = !disabled && displayItems.length > 1;

          return (
            <React.Fragment key={`process-step-${index}`}>
              {index > 0 && (
                <div className="flex justify-center py-1 bg-gray-50 dark:bg-slate-900/50 border-y border-dashed border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => handleInsertAt(index)}
                    disabled={disabled}
                    className="ti-btn ti-btn-sm ti-btn-ghost text-primary text-xs"
                    aria-label={`Insert new process before step ${index + 1}`}
                  >
                    <i className="ri-add-circle-line me-1" aria-hidden />
                    Insert step here
                  </button>
                </div>
              )}
              <div
                role="listitem"
                draggable={canDrag}
                aria-grabbed={canDrag ? isDragging : undefined}
                onDragStart={(e) => {
                  if (!canDrag) return;
                  dragFromIndexRef.current = index;
                  setDraggingIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(index));
                }}
                onDragEnd={() => {
                  dragFromIndexRef.current = null;
                  setDraggingIndex(null);
                }}
                onDragOver={(e) => {
                  if (dragFromIndexRef.current === null || disabled) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(index);
                }}
                className={`grid grid-cols-12 gap-3 items-center px-3 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                  canDrag ? 'cursor-grab active:cursor-grabbing select-none' : ''
                } ${isDragging ? 'opacity-60 ring-1 ring-primary/30' : ''}`}
              >
                <div className="col-span-1 flex flex-col items-center gap-1">
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold tabular-nums"
                    aria-label={`Step ${index + 1}`}
                  >
                    {index + 1}
                  </span>
                  {canDrag && (
                    <span className="text-gray-400" title="Drag to reorder" aria-hidden>
                      <i className="ri-draggable text-lg" />
                    </span>
                  )}
                </div>

                <div className="col-span-4">
                  <label htmlFor={`process-select-${index}`} className="sr-only">
                    Process for step {index + 1}
                  </label>
                  <select
                    id={`process-select-${index}`}
                    className="form-control"
                    value={currentProcessId}
                    onChange={(e) => handleProcessSelect(index, e.target.value)}
                    disabled={disabled}
                  >
                    <option value="">Select Process</option>
                    {availableProcesses.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <input
                    type="text"
                    className="form-control"
                    value={selectedProcess?.type ?? ''}
                    readOnly
                    placeholder="Type"
                    aria-label={`Type for step ${index + 1}`}
                  />
                </div>

                <div className="col-span-3">
                  <input
                    type="text"
                    className="form-control"
                    value={selectedProcess?.description ?? ''}
                    readOnly
                    placeholder="Description"
                    aria-label={`Description for step ${index + 1}`}
                  />
                </div>

                <div className="col-span-2 flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(index, index - 1)}
                    disabled={disabled || index === 0}
                    className="ti-btn ti-btn-outline-secondary ti-btn-sm"
                    aria-label={`Move step ${index + 1} up`}
                  >
                    <i className="ri-arrow-up-s-line" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, index + 1)}
                    disabled={disabled || index === displayItems.length - 1}
                    className="ti-btn ti-btn-outline-secondary ti-btn-sm"
                    aria-label={`Move step ${index + 1} down`}
                  >
                    <i className="ri-arrow-down-s-line" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    disabled={disabled}
                    className="ti-btn ti-btn-danger ti-btn-sm"
                    aria-label={`Remove step ${index + 1}`}
                  >
                    <i className="ri-delete-bin-line" aria-hidden />
                  </button>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => handleInsertAt(displayItems.length)}
        disabled={disabled}
        className="ti-btn ti-btn-primary"
      >
        <i className="ri-add-line me-1" aria-hidden />
        Add process at end
      </button>
    </div>
  );
}
