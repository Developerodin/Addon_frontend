# Vendor PO – API Integration Guide

This document describes the **current implementation** (mock data + sessionStorage) for **Vendor List** and **Vendor PO Raise**, and how to integrate with the backend API later **without changing UI or flows**. No code changes are required until you are ready to connect the API.

---

## 1. Overview

| Module           | Current data source              | Persistence                         |
|-----------------|-----------------------------------|-------------------------------------|
| **Vendor List**  | In-page mock + sessionStorage     | New vendor from Add page → sessionStorage key `vendor-po-new-vendor` |
| **Vendor PO Raise** | Mock list + sessionStorage   | POs → sessionStorage key `vendor-po-orders`; vendors/articles for form → mock + same new-vendor key |

**API base URL** (when you integrate): `shared/data/utilities/api.ts` → `API_BASE_URL` (e.g. `https://addon-api.theodin.in/v1`). Use this base for all vendor/PO endpoints below.

---

## 2. Vendor List

### 2.1 Current behaviour

- **List screen** (`app/vendor-po/vendor-list/page.tsx`): Renders vendors from in-page `MOCK_VENDORS`. On mount, reads `sessionStorage.getItem("vendor-po-new-vendor")` and, if present, merges that one vendor into the list and removes the key.
- **Add Vendor** (`app/vendor-po/vendor-list/add/page.tsx`): On submit, builds a vendor object, assigns a client-generated `id`, saves it to `sessionStorage` under `"vendor-po-new-vendor"`, then redirects to the list. No API call.
- **Edit** (VendorFormModal): Updates in-memory list only; no persistence besides sessionStorage for the “new vendor” from Add.
- **View**: Read-only modal; data from current list state.
- **Disable/Enable**: Toggles `status` in local state only.

### 2.2 Data shapes (TypeScript)

Defined in `app/vendor-po/vendor-list/types.ts`:

```ts
interface Vendor {
  id: string;
  vendorCode: string;
  vendorName: string;
  contactPerson: string;
  phone: string;
  city?: string;
  status: 'active' | 'inactive';
  email?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

type VendorFormData = Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>;
```

Add Vendor page uses an extended form (e.g. contacts array); the payload sent to “create” is built from that and mapped to `VendorFormData` (primary contact → `contactPerson`, `phone`, `email`).

### 2.3 Where to plug in the API

| Action            | Current behaviour                    | Integration point (replace with API) |
|-------------------|--------------------------------------|----------------------------------------|
| Load list         | `useState(MOCK_VENDORS)` + merge from sessionStorage | Call `GET /vendors` (or your list endpoint), set state from response. |
| Create vendor     | Build object → `sessionStorage.setItem("vendor-po-new-vendor", ...)` | Call `POST /vendors` with `VendorFormData` (or backend’s create DTO). Use response as the created vendor (id, createdAt, etc.). |
| Update vendor     | In-memory only (VendorFormModal)      | Call `PATCH /vendors/:id` or `PUT /vendors/:id` with form data. Then refetch list or update list state from response. |
| Disable/Enable    | Toggle `status` in state              | Call `PATCH /vendors/:id` with `{ status: 'active' \| 'inactive' }` (or your backend’s field name). |

### 2.4 Suggested backend API contract (Vendor List)

- **List:**  
  `GET /vendors`  
  Query (optional): `?status=active|inactive`, `?search=...`  
  Response: `{ data: Vendor[] }` or `Vendor[]` where each item matches `Vendor` (or map backend fields to `Vendor` in the client).

- **Create:**  
  `POST /vendors`  
  Body: Same as `VendorFormData` (vendorCode, vendorName, contactPerson, phone, status, email?, city?, address?).  
  Response: Created `Vendor` (include `id`, `createdAt`, `updatedAt` if backend returns them).

- **Get one:**  
  `GET /vendors/:id`  
  Response: Single `Vendor` (for View/Edit prefill if needed).

- **Update:**  
  `PATCH /vendors/:id` or `PUT /vendors/:id`  
  Body: Partial or full `VendorFormData` (and/or `status` for disable/enable).  
  Response: Updated `Vendor`.

- **Delete (optional):**  
  If backend supports soft delete, you can keep “Disable” as status toggle; if it uses hard delete, add `DELETE /vendors/:id` and remove the vendor from list on success.

### 2.5 SessionStorage key to remove

- `vendor-po-new-vendor` – used only for “create and show on list” without API. Remove once create goes through `POST /vendors` and list is loaded from API.

---

## 3. Vendor PO Raise

### 3.1 Current behaviour

- **List** (`app/vendor-po/raise/page.tsx`): Initial list from `MOCK_VENDOR_POS` in `app/vendor-po/raise/data.ts`. On mount, reads `getStoredOrders()` (sessionStorage `"vendor-po-orders"`); if present, replaces list with that. Approve/Close update list and call `setStoredOrders(orders)` so changes persist in sessionStorage.
- **Create PO** (`app/vendor-po/raise/add/page.tsx`): Builds a `VendorPO` from form data, generates `id` and `poNo` client-side, then `setStoredOrders([...existing, po])` and redirects to list. Vendors for dropdown come from `getVendors()` (mock + sessionStorage new vendor); articles from `MOCK_ARTICLES`.
- **Edit PO** (`app/vendor-po/raise/edit/[id]/page.tsx`): Loads PO by `id` from `getStoredOrders() ?? MOCK_VENDOR_POS`, renders form; on Save Draft/Approve, updates that PO in the same list and calls `setStoredOrders(next)`.
- **Vendor dropdown (Create/Edit):** `getVendors()` in `data.ts` – mock vendors plus optional single vendor from `vendor-po-new-vendor`.  
- **Article dropdown:** `MOCK_ARTICLES` in `data.ts`.

### 3.2 Data shapes (TypeScript)

Defined in `app/vendor-po/raise/types.ts`:

```ts
type VendorPOStatus =
  | "Draft"
  | "Approved"
  | "Partially Received"
  | "Fully Received"
  | "Closed";

type VendorPOPriority = "High" | "Medium" | "Low" | "Urgent";

interface VendorPOLineItem {
  id: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  orderedQty: number;
  lineRemarks?: string;
}

interface VendorPOArticle {
  id: string;
  code: string;
  name: string;
}

interface VendorPO {
  id: string;
  poNo: string;
  poDate: string;
  vendorId: string;
  vendorName: string;
  priority: VendorPOPriority;
  totalQty: number;
  receivedQty: number;
  status: VendorPOStatus;
  articleSummary?: string;
  remarks?: string;
  lineItems?: VendorPOLineItem[];
  createdAt?: string;
  updatedAt?: string;
}

interface VendorPOFormData {
  vendorId: string;
  priority: VendorPOPriority;
  remarks: string;
  lineItems: VendorPOLineItem[];
}
```

### 3.3 Where to plug in the API

| Action              | Current behaviour                                      | Integration point |
|---------------------|--------------------------------------------------------|-------------------|
| Load PO list        | `MOCK_VENDOR_POS` + `getStoredOrders()` on mount      | Call `GET /vendor-pos` (or similar) with filters (status, date range, vendor, etc.). Set list state from response. |
| Create PO (Draft)   | Build PO → `setStoredOrders([...existing, po])`       | Call `POST /vendor-pos` with body derived from `VendorPOFormData` + `status: "Draft"`. Backend can generate `id`, `poNo`, `poDate`. Redirect and refetch list (or add response to list). |
| Create PO (Approve) | Same as draft but `status: "Approved"`                 | Same `POST /vendor-pos` with `status: "Approved"` (or separate “submit & approve” endpoint if backend has one). |
| Edit PO (Save Draft)| Update item in list → `setStoredOrders(next)`          | `PATCH /vendor-pos/:id` or `PUT` with form data + `status: "Draft"`. Refetch or update list from response. |
| Edit PO (Approve)   | Update item in list, set status Approved              | `PATCH /vendor-pos/:id` with `status: "Approved"` (and possibly line items if backend allows). |
| Approve (from list) | In-memory + `setStoredOrders`                         | `PATCH /vendor-pos/:id` with `{ status: "Approved" }`. Refresh list or update state. |
| Close (from list)   | In-memory + `setStoredOrders`                         | `PATCH /vendor-pos/:id` with `{ status: "Closed" }`. |
| Load one PO (Edit)  | `getStoredOrders() ?? MOCK_VENDOR_POS` then find by id | `GET /vendor-pos/:id` for edit page; map response to `VendorPO` (and to `VendorPOFormData` for the form). |
| Vendors for dropdown | `getVendors()` (mock + new vendor)                   | Replace with `GET /vendors` (reuse same contract as Vendor List). |
| Articles for dropdown | `MOCK_ARTICLES`                                    | Replace with `GET /articles` (or your catalog endpoint). Map to `VendorPOArticle[]`. |

### 3.4 Suggested backend API contract (Vendor PO)

- **List:**  
  `GET /vendor-pos`  
  Query: `status`, `priority`, `vendorId`, `startDate`, `endDate`, `search` (PO No / Vendor / Article).  
  Response: `{ data: VendorPO[] }` or `VendorPO[]` with same shape as above (map if backend uses different names).

- **Create:**  
  `POST /vendor-pos`  
  Body: `VendorPOFormData` + optional `status: "Draft" | "Approved"`. Backend returns full `VendorPO` (with `id`, `poNo`, `poDate`, `totalQty`, `articleSummary`, etc.).

- **Get one:**  
  `GET /vendor-pos/:id`  
  Response: Single `VendorPO` (with `lineItems` for edit form).

- **Update:**  
  `PATCH /vendor-pos/:id` or `PUT /vendor-pos/:id`  
  Body: At least `VendorPOFormData`; optionally `status` for Approve/Close.  
  Response: Updated `VendorPO`.

- **Status actions:**  
  Can be part of update: `PATCH /vendor-pos/:id` with `{ status: "Approved" }` or `{ status: "Closed" }`.

**Articles (for line item dropdown):**

- `GET /articles` (or `/catalog/articles`, etc.)  
  Response: Array of `{ id, code, name }` (or map to `VendorPOArticle`).

### 3.5 SessionStorage keys to remove

- `vendor-po-orders` – used for PO list and edit. Remove once list is loaded from `GET /vendor-pos` and create/update use POST/PATCH.

Vendor dropdown can continue to use the same vendor API as Vendor List; no need for `vendor-po-new-vendor` once Vendor List is on the API.

---

## 4. File reference (no changes required until integration)

| Purpose                    | File(s) |
|---------------------------|--------|
| Vendor types              | `app/vendor-po/vendor-list/types.ts` |
| Vendor list + View/Edit   | `app/vendor-po/vendor-list/page.tsx` |
| Add Vendor form           | `app/vendor-po/vendor-list/add/page.tsx` |
| Vendor PO types           | `app/vendor-po/raise/types.ts` |
| Mock data + getVendors / getStoredOrders / setStoredOrders | `app/vendor-po/raise/data.ts` |
| PO list                   | `app/vendor-po/raise/page.tsx` |
| Create PO                 | `app/vendor-po/raise/add/page.tsx` |
| Edit PO                   | `app/vendor-po/raise/edit/[id]/page.tsx` |
| PO form (header + lines)  | `app/vendor-po/raise/components/VendorPOForm.tsx` |
| API base URL              | `shared/data/utilities/api.ts` |

---

## 5. Integration checklist

Use this when connecting the backend; the UI can stay as-is.

**Vendor List**

- [ ] Add a vendor service (e.g. `shared/services/vendorService.ts`) that uses `API_BASE_URL` and implements:
  - `getVendors(params?)` → `GET /vendors`
  - `createVendor(data: VendorFormData)` → `POST /vendors`
  - `getVendorById(id)` → `GET /vendors/:id`
  - `updateVendor(id, data)` → `PATCH /vendors/:id`
- [ ] In vendor-list page: replace initial state and sessionStorage merge with `getVendors()` (and loading/error state).
- [ ] In add page: replace sessionStorage write with `createVendor(payload)`; use returned vendor and redirect; remove `vendor-po-new-vendor` usage.
- [ ] In edit (VendorFormModal): call `updateVendor(id, payload)` and refresh list or update state.
- [ ] For Disable/Enable: call `updateVendor(id, { status })`.
- [ ] Remove any remaining reads/writes of `vendor-po-new-vendor`.

**Vendor PO Raise**

- [ ] Add a vendor PO service (e.g. `shared/services/vendorPOService.ts`) with:
  - `getVendorPOs(params?)` → `GET /vendor-pos`
  - `getVendorPOById(id)` → `GET /vendor-pos/:id`
  - `createVendorPO(data, status)` → `POST /vendor-pos`
  - `updateVendorPO(id, data)` → `PATCH /vendor-pos/:id`
- [ ] Add articles endpoint usage (e.g. `getArticles()` from catalog API); replace `MOCK_ARTICLES` in `data.ts` or where it’s consumed.
- [ ] In raise list page: load list with `getVendorPOs(filters)`; replace Approve/Close with `updateVendorPO(id, { status })`; remove `getStoredOrders()` / `setStoredOrders()`.
- [ ] In add page: replace `setStoredOrders([...existing, po])` with `createVendorPO(formData, "Draft" | "Approved")`; redirect and optionally refetch list.
- [ ] In edit page: load PO with `getVendorPOById(id)`; replace save with `updateVendorPO(id, formData)` (and status when approving).
- [ ] Replace `getVendors()` in `data.ts` (or in add/edit) with vendor service `getVendors()` so the dropdown uses the same API as Vendor List.
- [ ] Remove `getStoredOrders` / `setStoredOrders` and sessionStorage key `vendor-po-orders`.

**Shared**

- [ ] Keep types in `vendor-list/types.ts` and `raise/types.ts`; add mappers if backend uses different field names (e.g. `snake_case` → `camelCase`).
- [ ] Use `API_BASE_URL` from `shared/data/utilities/api.ts` for all new service calls.

This document is the single reference for integrating Vendor List and Vendor PO Raise with the backend; no code changes are required until you implement the steps above.
