# Article-wise Box Creation on Goods Received — Implementation Plan

**Status:** Implemented (2026-06-19) — pending manual verification
**Date:** 2026-06-19
**Owner:** Vendor PO / Receive flow

> **Implementation note:** All changes in §4 are done. Backend files syntax-checked and
> add zero net-new lint errors; frontend files are type-clean (`tsc --noEmit`). One
> addition beyond the original plan: per-article **Boxes** are now editable on already-saved
> invoices in the Goods Received modal (invoice # and qty stay locked), so legacy POs whose
> per-article box counts were never captured can be corrected and then re-synced.

---

## 1. Problem

When goods are received against a vendor PO, the operator enters an invoice, picks
articles, and enters received quantity + boxes per article. Boxes are then created so
each physical box can be barcoded, QC'd and stored.

**Bug:** When an invoice contains **more than one article** (e.g. a lot with 2 articles
and 3 boxes total), the system creates **all** boxes against the **first article only**.

Live example: PO `6a34d53edcad853b290f977d` shows 2 boxes both tagged to vendor code
`PXC2009`, even though the invoice received two different articles.

### Where it breaks

The data model is fine — each invoice already stores boxes **per article**:

```
VendorPurchaseOrder.receivedLotDetails[]
  ├─ lotNumber           (invoice number)
  ├─ numberOfBoxes       (lot-level total — currently a separate manual input)
  └─ poItems[]
       ├─ poItem          (PO line / article id)
       ├─ receivedQuantity
       └─ receivedBoxes   ← per-article box count (already captured!)
```

Two places collapse this to the first article:

1. **Frontend** — `app/vendor-po/utils/vendorPoFlow.ts` → `lotDetailsForBulkBoxes()`
   maps each invoice to **one** row:
   ```ts
   {
     lotNumber: l.lotNumber,
     numberOfBoxes: Number(l.numberOfBoxes),   // lot-level total
     vendorPoItemId: l.poItems?.[0]?.poItem,    // ⚠️ FIRST article only
   }
   ```
   The per-article `receivedBoxes` data is thrown away.

2. **Backend** — `src/services/vendorManagement/vendorBox.service.js`
   → `bulkCreateVendorBoxes()`. It only expands per-article when the incoming
   `numberOfBoxes` *exactly equals* the sum of all articles' `receivedBoxes`
   (`shouldExpandAllPoItemsForLot`). Because the modal has **two independent box
   inputs** (lot-level total + per-article), they rarely match, so it falls into the
   single-article branch and creates every box against `poItems[0]`.

### Root design flaw

The Goods Received modal collects boxes **twice**:
- a lot-level **"Number of boxes"** (required ≥ 1), and
- a per-article **"Boxes"** column.

Nothing keeps them consistent, and downstream box creation can't tell which to trust.

---

## 2. Approved decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Source of truth for box count | **Per-article `receivedBoxes` is authoritative.** Lot-level "Number of boxes" becomes a read-only auto-sum. |
| 2 | Box ↔ article binding | **Fixed at creation.** Each box is created bound to exactly one PO line (article + vendor code). No per-box article dropdown. |
| 3 | Existing / wrong boxes | **Add a re-sync action** to delete & recreate a lot's boxes from the corrected invoice data (only for lots not yet scanned/stored). |

> **"Article vs vendor code" note:** In this PO model, vendor code is an attribute of
> the PO line (article). One PO line = one article = one vendor code. So creating boxes
> **per PO line** is simultaneously "per article" and "per vendor code" — no separate
> concept needed.

---

## 3. Target behaviour

For an invoice with articles `A` (3 boxes) and `B` (2 boxes):

- The modal shows boxes **per article**; the lot total auto-computes to **5** (read-only).
- Box creation produces **3 boxes bound to article A** and **2 boxes bound to article B**,
  each carrying the correct `vendorPoItemId`, `productId`, `productName`, and vendor code.
- The process page groups boxes by invoice and shows each box's correct article.
- An invoice's total boxes = `Σ receivedBoxes` over its articles.

---

## 4. Changes

### 4.1 Frontend — Goods Received modal (per-article authoritative)

**Files:**
- `app/vendor-po/components/VendorGoodsReceivedModal.tsx`
- `app/vendor-po/components/vendorGoodsReceivedModalHelpers.ts`

Changes:
1. Make the per-article **"Boxes"** column the single box input.
2. Replace the editable lot-level **"Number of boxes"** input with a **read-only computed
   value** = `Σ lineBoxes` for that invoice. Keep persisting it to
   `receivedLotDetails[].numberOfBoxes` (so existing readers/printers keep working), but
   derive it instead of accepting manual entry.
3. Update `draftsToReceivedLotDetails()` so `numberOfBoxes = Σ receivedBoxes`.
4. Update `validateVendorLotDrafts()`:
   - For each article with `receivedQuantity > 0`, require `receivedBoxes ≥ 1`.
   - Require the invoice's total boxes (sum) ≥ 1.
   - Drop the old "lot-level numberOfBoxes ≥ 1" standalone rule (now derived).

### 4.2 Frontend — bulk box payload (stop collapsing to first article)

**File:** `app/vendor-po/utils/vendorPoFlow.ts` → `lotDetailsForBulkBoxes()`

Emit **one row per article** instead of one row per invoice:

```ts
export function lotDetailsForBulkBoxes(vpoNumber, lots) {
  if (!lots?.length) return [];
  return lots.flatMap((l) =>
    (l.poItems || [])
      .filter((p) => p.poItem && Number(p.receivedBoxes) > 0)
      .map((p) => ({
        lotNumber: l.lotNumber.trim(),
        numberOfBoxes: Number(p.receivedBoxes),
        vendorPoItemId: p.poItem,           // bind to the actual article
      }))
  );
}
```

This already matches the backend validation schema
(`lotDetails[]` accepts `{ lotNumber, numberOfBoxes, vendorPoItemId, productId }`),
and the existing `existingCount` per-(lot, vendorPoItemId) guard prevents duplicates.

### 4.3 Backend — make per-article creation deterministic

**File:** `src/services/vendorManagement/vendorBox.service.js` → `bulkCreateVendorBoxes()`

Once the FE sends one row per article, the fragile `shouldExpandAllPoItemsForLot`
heuristic (match-by-total) is no longer needed and is the source of the
"all boxes to first article" fallback. Plan:

1. **Primary path:** when a row has an explicit `vendorPoItemId`, create exactly
   `numberOfBoxes` boxes bound to that PO line. Resolve `productId` from the PO line.
2. **Auto-expand path (defensive):** when a row has **no** `vendorPoItemId` but the lot's
   `receivedLotDetails.poItems` carries per-article `receivedBoxes`, expand into one
   creation group per article (existing `shouldExpandAllPoItemsForLot` logic), but make
   it independent of whether the totals match.
3. **Never** silently dump a multi-article lot onto `poItems[0]`. If the product can't be
   resolved for a row, throw a clear error (keep current behaviour) rather than guessing.
4. Keep the per-(lot, vendorPoItemId) `existingCount` skip so re-runs are idempotent.

### 4.4 Backend + Frontend — re-sync / fix action for existing boxes

Goal: fix POs whose boxes were already created wrong (like `6a34d53e…`).

**Backend** (`vendorBox.service.js` + controller + route + validation):
- Add `resyncVendorLotBoxes({ vpoNumber, lotNumber })`:
  - Guard: only proceed if **no** box in that lot is `secondaryCheckingAccepted`,
    `storedStatus`, or `returnedToVendor` (don't destroy in-flight inventory).
  - Reverse production-flow units for the boxes being removed (mirror
    `syncBoxToProductionFlow` with a negative delta), delete those boxes, then call
    the per-article creation path for that lot.
  - Return `{ deletedCount, createdCount }`.
- Expose as `POST /v1/vendor-boxes/resync-lot` (follow existing route/controller style).

**Frontend** (`VendorReceiveProcessView.tsx` / `VendorReceiveProcessBoxTables.tsx`):
- Per-invoice **"Re-create boxes from invoice"** button, enabled only when that lot has
  no scanned/stored/returned boxes.
- Confirmation dialog ("This deletes N boxes and recreates them per article"), then call
  the new endpoint and `load()`.

### 4.5 Process page display

**File:** `app/vendor-po/receive/process/VendorReceiveProcessBoxTables.tsx`

- Stop defaulting every box to `opts[0]`. Resolve each box's article from its own
  persisted `vendorPoItemId` / `productName` (now correct after the fix).
- Keep grouping by invoice; show correct article + vendor code per box row.
- (No per-box article dropdown — per decision #2.)

---

## 5. Files touched (summary)

**Frontend**
- `app/vendor-po/components/VendorGoodsReceivedModal.tsx` — per-article boxes, read-only lot total
- `app/vendor-po/components/vendorGoodsReceivedModalHelpers.ts` — derive total, validation
- `app/vendor-po/utils/vendorPoFlow.ts` — `lotDetailsForBulkBoxes` one-row-per-article
- `app/vendor-po/receive/process/VendorReceiveProcessView.tsx` — re-sync action wiring
- `app/vendor-po/receive/process/VendorReceiveProcessBoxTables.tsx` — per-box article from own data + re-sync button
- `shared/services/vendorBoxService.ts` — add `resyncLot()` call

**Backend**
- `src/services/vendorManagement/vendorBox.service.js` — deterministic creation + `resyncVendorLotBoxes`
- `src/controllers/vendorManagement/vendorBox.controller.js` — resync controller
- `src/routes/v1/...` vendor box route — `POST /resync-lot`
- `src/validations/vendorBox.validation.js` — resync validation

---

## 6. Edge cases & guards

- Article received with qty > 0 but 0 boxes → blocked at validation (must enter boxes).
- Article with 0 qty → no boxes (skipped).
- Re-running "Create boxes" → idempotent via existing per-(lot, vendorPoItemId) skip.
- Re-sync blocked when any box in the lot is already scanned / stored / returned.
- Single-article POs → unchanged behaviour (one row, one article).
- Production-flow unit sync must be reversed before deleting boxes during re-sync.

## 7. Verification

1. **New multi-article receipt:** PO with articles A (qty/3 boxes) + B (qty/2 boxes) →
   confirm 3 boxes bound to A and 2 to B, correct vendor codes, lot total = 5.
2. **Idempotency:** click "Create boxes" twice → no duplicates.
3. **Existing wrong PO** `6a34d53edcad853b290f977d`: run re-sync → boxes split correctly
   across both vendor codes; production-flow units stay consistent.
4. **Guard:** re-sync refused once a box in the lot is scanned/stored.
5. **Regression:** single-article PO still creates boxes correctly.

## 8. Out of scope

- Per-box manual article reassignment dropdown (decision #2 = fixed at creation).
- Changes to QC / secondary-checking / dispatch flows beyond unit-sync reversal on re-sync.
