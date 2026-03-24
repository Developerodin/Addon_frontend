/**
 * Layout tokens aligned with yarn `PurchaseForm` (compact purchase UI).
 */
export const VPO_FORM = {
  section: "border-t pt-4",
  sectionTitle: "text-xs font-bold text-gray-800 mb-3",
  grid2: "grid grid-cols-1 md:grid-cols-2 gap-4",
  labelRequired: "text-xs font-medium text-gray-600 mb-1 block",
  labelOptional: "text-xs font-medium text-gray-600 mb-1 block",
  table: "min-w-full border border-gray-300 bg-white",
  thead: "bg-gray-50/30",
  th: "border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider",
  thRight: "border border-gray-300 px-2 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider",
  td: "border border-gray-300 px-2 py-1.5 text-xs text-gray-900",
} as const;
