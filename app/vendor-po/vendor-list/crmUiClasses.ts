/**
 * CRM table + form tokens aligned with `docs/UI_DESIGN_SPEC_CATALOG_ITEMS.md`
 * and `app/production/floor-supervisor/knitting/page.tsx`.
 */
export const CRM = {
  mainContent: "main-content !p-[10px]",
  titleRow: "flex flex-wrap items-center justify-between gap-4 mb-4",
  titleWithAccent: "flex items-center gap-2",
  titleAccent: "w-[3px] h-5 bg-purple-600 rounded-full shrink-0",
  pageTitle: "text-sm font-bold text-gray-800",
  card: "bg-white shadow-sm border border-gray-100 overflow-hidden rounded",
  cardBody: "p-[10px]",
  /** Primary CTA — purple */
  btnPrimary:
    "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  /** Excel / export (emerald) */
  btnSuccess:
    "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  /** Primary compact — table row Save */
  btnPrimarySm:
    "inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  /** Text link — row Edit */
  linkRowAction: "text-[10px] font-bold text-purple-600 hover:text-purple-800 underline-offset-2 hover:underline",
  /** Inline cell inputs (process / tables) */
  inputTable:
    "w-full border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1 focus:ring-1 focus:ring-purple-300 focus:border-purple-500",
  inputTableNum:
    "w-20 max-w-full text-right border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1 focus:ring-1 focus:ring-purple-300 focus:border-purple-500",
  inputTableNumSm:
    "w-16 max-w-full text-right border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-2 py-1 focus:ring-1 focus:ring-purple-300 focus:border-purple-500",
  /** Outline secondary */
  btnSecondary:
    "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm transition-colors",
  /** Gray neutral */
  btnNeutral:
    "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors",
  btnFilterOn:
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors bg-purple-600 text-white border-purple-600 shadow-sm",
  btnFilterOff:
    "inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors bg-white border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm",
  input:
    "w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-1 focus:ring-purple-300 focus:border-purple-500 placeholder:text-gray-400",
  inputSearch:
    "w-full bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-1 focus:ring-purple-300 focus:border-purple-500 placeholder:text-gray-400 font-medium",
  select:
    "w-full bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 focus:ring-1 focus:ring-purple-300 focus:border-purple-500",
  label: "text-[11px] font-medium text-[#495057] mb-1 block",
  tableWrap: "overflow-x-auto min-h-[200px]",
  table: "w-full border-collapse border border-gray-200",
  theadTr: "bg-gray-50/30",
  th: "px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 first:pl-[10px] last:pr-[10px]",
  thRight:
    "px-1.5 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200 pr-[10px]",
  tbodyTr: "hover:bg-gray-50/50 transition-colors group",
  td: "px-1.5 py-2.5 border border-gray-200 text-[12px] text-[#323251] first:pl-[10px] last:pr-[10px]",
  tdMuted: "text-[#7987A1]",
  /** Icon-only row actions (spec §6) */
  iconView:
    "w-7 h-7 inline-flex items-center justify-center bg-sky-50 text-sky-600 border border-sky-100 rounded hover:bg-sky-100 transition-colors",
  iconEdit:
    "w-7 h-7 inline-flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors",
  iconToggleOff:
    "w-7 h-7 inline-flex items-center justify-center bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 transition-colors",
  iconToggleOn:
    "w-7 h-7 inline-flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors",
  iconDanger:
    "w-7 h-7 inline-flex items-center justify-center bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100 transition-colors",
  rowActions: "flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity",
  paginationBar:
    "flex flex-wrap items-center justify-between gap-4 p-[10px] pt-4 border-t border-gray-100 bg-white",
  paginationSummary: "text-[11px] font-medium text-[#495057] tracking-tight",
  pageNavBtn:
    "px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed",
  loadingWrap: "py-20 flex flex-col items-center justify-center",
  spinner: "animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50 mb-4",
  loadingLabel: "text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase",
  emptyWrap: "py-20 text-center",
  emptyIconWrap: "w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4 mx-auto",
  emptyIcon: "text-xl text-gray-200",
  emptyTitle: "text-xs font-bold text-gray-400 mb-1",
  emptySub: "text-[11px] text-[#7987A1] mb-4",
  badgeActive: "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100",
  badgeInactive: "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200",
  linkAccent: "text-purple-600 hover:text-purple-700 transition-colors",
  modalOverlay: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
  modalPanel: "bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col",
  modalHeader: "flex justify-between items-center p-[10px] border-b border-gray-200",
  modalTitle: "text-sm font-bold text-gray-800",
  modalBody: "p-[10px] overflow-auto border-b border-gray-200 bg-gray-50",
  modalFooter: "flex justify-end gap-2 p-[10px] border-t border-gray-200 bg-gray-50",
  drawerPanel:
    "fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-xl z-[70] flex flex-col border-l border-gray-200",
  /** Wider drawer for vendor view (details + product grid). */
  drawerPanelWide:
    "fixed top-0 right-0 h-full w-full max-w-3xl bg-white shadow-xl z-[70] flex flex-col border-l border-gray-200",
  drawerHeader: "flex-shrink-0 border-b border-gray-200 p-[10px] flex items-start justify-between gap-3 bg-white",
  drawerTitle: "text-sm font-bold text-gray-800",
  drawerFooter: "flex-shrink-0 border-t border-gray-200 p-[10px] flex flex-wrap justify-end gap-2 bg-gray-50",
  /** Production floor–style overlay + right drawers (secondary checking, etc.) */
  drawerBackdrop: "fixed inset-0 bg-black/50 z-40",
  /** Narrow form drawer (create batch, scan, etc.) */
  drawerShellSm:
    "fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right border-l border-gray-200",
  /** Wide edit/process drawer (matches floor supervisor “Update order”) */
  drawerShellLg:
    "fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl z-50 flex flex-col overflow-hidden animate-slide-in-right border-l-2 border-gray-300",
  drawerHeaderBar:
    "flex items-center justify-between px-3 py-2 border-b-2 border-gray-300 bg-gray-50 flex-shrink-0",
  drawerCloseBtn:
    "text-gray-500 hover:text-gray-800 p-1 rounded border-2 border-gray-300 hover:bg-gray-100",
  drawerBodyScroll: "flex-1 overflow-y-auto p-3 bg-gray-50",
  drawerFooterBar: "flex justify-end gap-2 p-3 border-t-2 border-gray-300 bg-gray-50 flex-shrink-0",
  drawerHint:
    "mb-4 px-3 py-2 rounded-md bg-purple-50 border-2 border-purple-200 text-[11px] text-purple-900",
  drawerSection:
    "mb-4 rounded-md border-2 border-gray-300 bg-white overflow-hidden",
  drawerSectionHead:
    "px-3 py-1.5 bg-gray-200 border-b-2 border-gray-300 text-[11px] font-bold text-gray-800 uppercase",
  btnDrawerCancel:
    "inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-gray-300 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-100 shadow-sm",
} as const;
