/**
 * Shared utility classes for yarn storage (LT/ST) toolbars and actions.
 * Keeps height, radius, and weight consistent across screens.
 */
export const storageInputClass =
  "h-9 text-sm border border-gray-300 rounded-md bg-white px-3 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500";

export const storageSelectClass =
  "h-9 text-sm border border-gray-300 rounded-md bg-white pl-3 pr-9 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 appearance-none bg-[length:12px_12px] bg-[right_0.5rem_center] bg-no-repeat";

export const storageIconBtnClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/25";

export const storageBtnSecondaryClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/25";

export const storageBtnPrimaryClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-purple-600 bg-purple-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30";

export const storageBtnFilterActiveClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-purple-600 bg-purple-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30";

export const selectChevronBgStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
} as const;

/** Toolbar row directly above grid / filter results (per-page + page nav). */
export const storagePaginationBarClass =
  "flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/90 px-3 py-2.5";

export const storageCompactSelectClass =
  "h-9 min-w-[4.5rem] rounded-md border border-gray-300 bg-white pl-2.5 pr-8 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 appearance-none bg-[length:12px_12px] bg-[right_0.5rem_center] bg-no-repeat";
