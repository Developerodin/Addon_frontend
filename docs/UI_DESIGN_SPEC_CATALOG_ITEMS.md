# UI Design Spec – Catalog Items Page (reusable for CRM tables)

Extracted from `app/catalog/items/page.tsx`. Use these tokens in your other CRM for the same look.

---

## 1. Colors

| Token | Value | Usage |
|-------|--------|--------|
| **Primary** | `#845ADF` (purple) | Main actions, links, active states, accent bar |
| **Primary hover** | `#6D28D9` (purple-700) | Buttons, links on hover |
| **Text primary** | `#323251` (gray-900) | Body/table content |
| **Text secondary** | `#495057` | Labels, select text, pagination |
| **Text muted** | `#949EB7` (gray-500), `#7987A1` (gray-600) | Placeholders, disabled, “empty” |
| **Border default** | `#E6EAEB` (gray-300), `#F2F4F5` (gray-200) | Table borders, inputs, cards |
| **Border light** | `#F9FAFB` (gray-100) | Card outline, divider |
| **Background page** | `rgb(240 241 247)` (--body-bg) | Page background |
| **Background card** | `#FFFFFF` | Content card |
| **Background header** | `rgba(249,250,251,0.3)` (gray-50/30) | Table thead |
| **Background hover row** | `rgba(249,250,251,0.5)` (gray-50/50) | Table row hover |
| **Background hover input** | `#F9FAFB` (gray-50) | Input/select hover |
| **Success / Add** | `#059669` (emerald-600), hover `#047857` | Add, Edit, success actions |
| **Danger / Delete** | `#DC2626` (red-600), bg `#FEF2F2` (red-50), border `#FEE2E2` (red-100) | Delete, destructive |
| **Info / View** | `#2563EB` (blue), bg `#EFF6FF` (blue-50), border `#DBEAFE` (blue-100) | View, info actions |
| **Warning / Amber** | bg `#FFFBEB` (amber-50), text `#B45309` (amber-700), border `#FDE68A` (amber-200) | Process Excel, caution |
| **Neutral secondary** | bg `#F9FAFB` (gray-50), text `#4B5563` (gray-600), border `#E5E7EB` (gray-200) | Template, secondary buttons |

---

## 2. Typography

| Element | Font size | Weight | Color | Other |
|---------|------------|--------|--------|--------|
| Page title | `0.875rem` (14px) | bold | gray-800 | — |
| Badge (count) | `10px` | bold | gray-500 | px-1.5 py-0.5 |
| Table header | `11px` | bold | #495057 | uppercase, tracking-wider |
| Table cell | `12px` | medium/bold (context) | gray-900 / gray-600 / gray-400 | — |
| Buttons | `11px` | bold | by variant | — |
| Inputs / Select | `11px` | medium | #495057 | placeholder: gray-400 |
| Pagination text | `11px` | bold | gray-400 / gray-600 on hover | — |
| Pagination ellipsis | `10px` | — | gray-300 | — |
| Loading label | `10px` | bold | gray-400 | uppercase, tracking-[0.2em] |
| Empty state title | `12px` | bold | gray-400 | — |
| Modal title | `14px` | bold | gray-800 | — |
| Help content headings | `1.125rem` (18px) | semibold | — | mb-2 |
| Help body | — | — | gray-700 | — |

---

## 3. Spacing & layout

- **Main content padding:** `10px` (e.g. `p-[10px]`, `!p-[10px]` on main-content).
- **Card:** `bg-white shadow-sm border border-gray-100 overflow-hidden`.
- **Header block:** `flex flex-wrap items-center justify-between gap-4 mb-6`.
- **Title strip:** left accent bar `3px × 20px`, purple-600, rounded-full; gap-2 to title.
- **Table container:** `overflow-x-auto min-h-[300px]`.
- **Table cell padding:** header `px-1.5 py-3`, body `px-1.5 py-2.5`; first column `pl-[10px]`, last column `pr-[10px]`.
- **Pagination bar:** `p-[10px] pt-4`, `border-t border-gray-100 bg-white`, flex wrap, justify-between, gap-4.

---

## 4. Table

- **Table:** `w-full border-collapse border border-gray-200`.
- **thead tr:** `bg-gray-50/30`.
- **th:** `px-1.5 py-3` (or pl/pr 10px for edges), `text-left` (or `text-right` for Actions), `text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200`.
- **tbody tr:** `hover:bg-gray-50/50 transition-colors group`.
- **td:** `px-1.5 py-2.5 border border-gray-200`; same edge padding as th for first/last column.
- **Checkbox column:** width ~40px; checkbox `rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5`.
- **Link in cell:** `text-purple-600 hover:text-purple-700 transition-colors`.

---

## 5. Buttons

**Base (shared):**  
`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded transition-colors`

- **Primary (main CTA):**  
  `bg-purple-600 text-white hover:bg-purple-700 shadow-sm`  
  e.g. Add Product, Export, Close in modal.

- **Secondary (outline):**  
  `bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm`  
  e.g. Template, Export dropdown trigger.

- **Success / Add:**  
  `bg-emerald-600 text-white hover:bg-emerald-700`  
  e.g. Import Excel.

- **Danger:**  
  `bg-red-50 text-red-600 border border-red-100 hover:bg-red-100`  
  e.g. Bulk Delete.

- **Info / Sky:**  
  `bg-sky-50 text-sky-600 border border-sky-100 hover:bg-sky-100`  
  e.g. Export by Attributes/BOM/Processes.

- **Warning / Amber:**  
  `bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100`  
  e.g. Process Excel.

- **Neutral (gray):**  
  `bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100`  
  e.g. Attributes/BOM/Processes Template.

Icons in buttons: `text-xs` (e.g. Remix: `ri-add-line`, `ri-download-2-line`, `ri-file-download-line`, `ri-delete-bin-line`, `ri-pencil-line`, `ri-eye-line`, `ri-close-line`).

---

## 6. Icon-only action buttons (table row)

- **Size:** `w-7 h-7` (28px).
- **Shape:** `rounded` (not full).
- **Layout:** `flex items-center justify-center`.
- **Edit:** `bg-emerald-50 text-emerald-400 border border-emerald-100 hover:bg-emerald-100`.
- **Delete:** `bg-red-50 text-red-400 border border-red-100 hover:bg-red-100`.
- **View (e.g. style codes):** `bg-blue-50 text-blue-400 border border-blue-100 hover:bg-blue-100`.
- **Container:** `flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity`.

---

## 7. Inputs & selects

- **Text input:**  
  `bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 font-medium transition-all`.

- **Select:**  
  `bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer`.

- **Search icon (inside input):** absolute, `left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs`.  
- **Dropdown chevron (select):** absolute, `right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none`.

---

## 8. Pagination

- **Prev/Next:** `px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed`.
- **Page number button:** `w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded`.  
  - Active: `bg-purple-600 text-white shadow-md`.  
  - Inactive: `text-gray-400 hover:bg-gray-50`.
- **Summary text:** `text-[11px] font-medium text-[#495057] tracking-tight`.

---

## 9. Modal / drawer (centered modal)

- **Overlay:** `fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`.
- **Panel:** `bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col`.
- **Header:** `flex justify-between items-center p-[10px] border-b border-gray-200`; title `text-sm font-bold text-gray-800`; close icon `text-gray-500 hover:text-gray-700 p-1`.
- **Body:** `p-[10px] overflow-auto`. Use same table styles as main table if content is tabular.
- **Footer:** `flex justify-end p-[10px] border-t border-gray-200`. Primary button: `bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 shadow-sm`.

For a **side drawer** instead of centered modal, keep the same overlay and z-50; panel: e.g. `fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl`, same header/body/footer padding and typography.

---

## 10. Loading & empty states

- **Loading:** Centered column, `py-20`. Spinner: `animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50`. Label: `text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase` (“Loading Data”).
- **Empty:** Centered column, `py-20 text-center`. Icon wrapper: `w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4`. Icon: `text-xl text-gray-200`. Title: `text-xs font-bold text-gray-400 mb-1` (“DATA EMPTY”).

---

## 11. Progress bar (import/export)

- **Track:** `w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden flex items-center`.
- **Fill:** `bg-primary` (or purple-600), `h-full transition-all duration-200`, width from state (e.g. `style={{ width: \`${progress}%\` }}`).
- **Label:** `ml-1.5 text-[10px] text-gray-600 font-medium` (e.g. “{progress}%”).

---

## 12. Tailwind config (reference)

- **Gray palette** (from theme): 100 `#f9fafb`, 200 `#f2f4f5`, 300 `#e6eaeb`, 400 `#dbdfe1`, 500 `#949eb7`, 600 `#7987a1`, 700 `#4d5875`, 800 `#383853`, 900 `#323251`.
- **Primary:** use CSS var `rgb(var(--primary))` with `--primary: 132 90 223` (no commas) so Tailwind’s `bg-primary` works with opacity.
- **Border radius:** default `rounded` (0.25rem) is enough for inputs, buttons, table icons; modals `rounded-lg`.

---

## 13. Quick copy – CSS custom properties

```css
:root {
  --body-bg: 240 241 247;
  --primary: 132 90 223;
  --primary-rgb: 132, 90, 223;
}
```

Use `rgb(var(--primary))` for solid primary; `rgb(var(--primary) / 0.1)` for light tints if your stack supports it, or define a separate token.

---

## 14. Summary checklist for “same UI” in another CRM

- [ ] Primary purple `#845ADF` for main actions, links, active pagination, focus ring.
- [ ] Table: gray-200 borders, gray-50/30 header, 11px bold uppercase headers, 12px cells, row hover gray-50/50.
- [ ] Buttons: 11px bold, rounded, px-3 py-1.5; purple primary, emerald success, red danger, sky info, amber warning, gray secondary.
- [ ] Icon buttons in table: 28×28px, rounded, *-50 bg and *-100 border (emerald/red/blue).
- [ ] Inputs/selects: 11px, gray-200 border, purple-300 focus, 10px padding.
- [ ] Modal: 50% black overlay, white rounded-lg shadow-xl, 10px padding, same table/button styles inside.
- [ ] Spacing: 10px content padding, consistent cell padding (1.5 + 2.5 vertical).
- [ ] Font sizes: 10px (badge, loading, progress), 11px (controls, table header, buttons), 12px (table body, empty state).

Use this spec in your other CRM (Tailwind, plain CSS, or design tokens) to match the catalog items table, buttons, drawer/modal, and fonts.
