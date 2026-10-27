import { useEffect, useRef, type RefObject } from 'react';

/** Open dialogs, newest last. Only the top one answers Escape and traps focus. */
const stack: symbol[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogOptions {
  /** When false the panel sits beside the page (wide screens) and nothing is trapped. */
  modal: boolean;
  onEscape: () => void;
}

/**
 * Focus handling for a drawer: moves focus in on open, keeps Tab inside while modal,
 * closes on Escape only when it is the topmost dialog, and returns focus on close.
 */
export function useDialog<T extends HTMLElement>({ modal, onEscape }: DialogOptions): RefObject<T> {
  const ref = useRef<T>(null);
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;
  const modalRef = useRef(modal);
  modalRef.current = modal;

  useEffect(() => {
    const id = Symbol('dialog');
    stack.push(id);
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') || node;
    first?.focus({ preventScroll: true });

    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        escapeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => item.offsetParent !== null
      );
      if (items.length === 0) return;
      const head = items[0];
      const tail = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === head || document.activeElement === ref.current)) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault();
        head.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(id), 1);
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!modal) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [modal]);

  return ref;
}
