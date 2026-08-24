# Vendor Module — CEO Command Dashboard
### End‑to‑end analysis, KPI specification, and high‑performance build plan

> **Target route:** `/vendor-po` (replaces the current 7‑tile link grid in `app/vendor-po/page.tsx`)
> **Status:** Planning / brainstorming document. No code written yet.
> **Audience:** CEO + COO + Vendor Ops Head. Secondary: Purchase, QC, Dispatch supervisors.
> **Core promise:** *The CEO opens one page and never has to open a second page to know the health of the vendor business.*

---

## Table of contents

1. [Why this dashboard exists](#1-why-this-dashboard-exists)
2. [Complete vendor module map (as built today)](#2-complete-vendor-module-map-as-built-today)
3. [End‑to‑end lifecycle of one unit](#3-end-to-end-lifecycle-of-one-unit)
4. [The 12 questions a CEO actually asks](#4-the-12-questions-a-ceo-actually-asks)
5. [Dashboard information architecture](#5-dashboard-information-architecture)
6. [Section‑by‑section KPI specification](#6-section-by-section-kpi-specification)
7. [Chart & visualisation catalogue](#7-chart--visualisation-catalogue)
8. [Exception / alert engine](#8-exception--alert-engine)
9. [Global filters, time model and drill‑down contract](#9-global-filters-time-model-and-drill-down-contract)
10. [Performance architecture — how we make it fast](#10-performance-architecture--how-we-make-it-fast)
11. [Proposed API surface](#11-proposed-api-surface)
12. [New data models (rollups)](#12-new-data-models-rollups)
13. [Frontend architecture & component tree](#13-frontend-architecture--component-tree)
14. [Responsive layout spec](#14-responsive-layout-spec)
15. [RBAC & data masking](#15-rbac--data-masking)
16. [Data‑quality gaps found during analysis](#16-data-quality-gaps-found-during-analysis)
17. [Phased delivery plan](#17-phased-delivery-plan)
18. [Open questions for the business](#18-open-questions-for-the-business)

---

## 1. Why this dashboard exists

Today the vendor module has **~18 operational screens**, each of which is a *worker* screen: it loads flows for one floor, one PO list, or one ledger, and it aggregates client‑side. There is:

- **No single place** where the money (PO value), the material (units), the quality (M1–M4) and the time (aging) are shown together.
- **No cross‑floor WIP view** — quantity sitting inside a scanned‑but‑not‑accepted container is invisible on every screen.
- **No vendor scorecard** — nobody can rank vendors by defect rate, OTIF, or return rate.
- **No trend** — every screen shows "now", nothing shows "vs last month".

A CEO cannot run a factory by clicking 18 screens. This dashboard collapses all of it into one page with progressive drill‑down.

**Design principle:** *Summary at the top, exceptions in the middle, evidence at the bottom.* Everything is clickable and deep‑links into the existing operational screen with filters pre‑applied — the dashboard never becomes a second source of truth.

---

## 2. Complete vendor module map (as built today)

### 2.1 Frontend routes

| # | Route | File | Purpose | In sidebar? |
|---|-------|------|---------|-------------|
| 1 | `/vendor-po` | `app/vendor-po/page.tsx` | Static tile grid (58 lines) | ✅ parent |
| 2 | `/vendor-po/purchase-management` | `purchase-management/page.tsx` | Sub‑hub | ✅ |
| 3 | `/vendor-po/vendor-list` | `vendor-list/page.tsx` | Vendor CRM master (+ `add`, `edit/[id]`, bulk Excel import) | ✅ |
| 4 | `/vendor-po/purchase-management/purchase` | re‑export of `raise/page.tsx` | **Vendor PO Raise** — create/edit VPO, packlist modal, PO details drawer | ✅ |
| 5 | `/vendor-po/raise` | `raise/page.tsx` (+ `add`, `edit/[id]`) | Same screen, canonical path | ❌ |
| 6 | `/vendor-po/purchase-management/purchase-order-received` | re‑export of `receive/page.tsx` | **Vendor PO Receive** — goods‑received modal, lot + box creation | ✅ |
| 7 | `/vendor-po/receive/process` | `receive/process/VendorReceiveProcessView.tsx` | Box‑level receive processing, box tables | ❌ |
| 8 | `/vendor-po/grn` (+ `grn/view/[grnNo]`) | `grn/page.tsx` | GRN list + printable GRN with revisions | ✅ |
| 9 | `/vendor-po/purchase-management/po-return` | `po-return/*` (4 components) | Vendor PO return session → VPRC challan → print | ✅ |
| 10 | `/vendor-po/secondary-checking` | `secondary-checking/page.tsx` | Floor 1 — QC split M1/M2/M3/VM4, scan drawer, M1 staging, 3 tabs | ✅ |
| 11 | `/vendor-po/branding` | `branding/page.tsx` | Floor 2 — branding type, style/brand breakdown, staging modal | ✅ |
| 12 | `/vendor-po/re-boarding` | `re-boarding/page.tsx` | Floor 2b — Embroidery‑only detour | ✅ |
| 13 | `/vendor-po/final-checking` | `final-checking/page.tsx` | Floor 3 — QC split M1–M4, dispatch staging | ✅ |
| 14 | `/vendor-po/dispatch` | `dispatch/page.tsx` | Floor 4 — dispatch → WHMS, STN generation + history | ✅ |
| 15 | `/vendor-po/m2-management` | `m2-management/page.tsx` | M2 repair ledger — merge to M1 / send to M3 / M4 | ✅ |
| 16 | `/vendor-po/m3-management` | `m3-management/page.tsx` | M3 outward ledger | ✅ |
| 17 | `/vendor-po/m4-management` | `m4-management/page.tsx` | M4 outward ledger | ✅ |
| 18 | `/vendor-po/checking`, `/counting`, `/final-checking-counting` | local `data.ts` mocks | **Legacy / mock — not in sidebar** | ❌ |
| 19 | `/vendor-po/washing`, `/vendor-po/boarding` | *empty directories* | **Dead** | ❌ |

> ⚠️ **Accuracy note:** items 18–19 are legacy. The dashboard must **not** source anything from `checking/data.ts` or `counting/data.ts` — those are local mock arrays, not API‑backed. Recommend deleting them in a separate cleanup ticket.

### 2.2 Backend models (the real source of truth)

All under `AddOn_backend/src/models/vendorManagement/`:

| Model | Collection | Key fields for analytics |
|-------|-----------|--------------------------|
| `VendorManagement` | `vendormanagements` | `header.{vendorCode,vendorName,status,city,state,gstin}`, `contactPersons[]`, `products[]` |
| `VendorPurchaseOrder` | — | `vpoNumber`, `vendor`, `poItems[{quantity,rate,gstRate,estimatedDeliveryDate}]`, `subTotal/gst/total`, `creditDays`, `estimatedOrderDeliveryDate`, `goodsReceivedDate`, `currentStatus` (9 enums), `statusLogs[]`, `receivedLotDetails[]`, `packListDetails[]`, `grnHistory[]`, `returnChallanHistory[]`, timestamps as `createDate`/`lastUpdateDate` |
| `VendorProductionFlow` | — | `vendor`, `vendorPurchaseOrder`, `product`, `referenceCode`, `brandingType`, `plannedQuantity`, `floorQuantities.{secondaryChecking,branding,reBoarding,finalChecking,dispatch}`, `currentFloorKey`, `finalQualityConfirmed`, `m3Tracking.outwardTotal`, `m4Tracking.outwardTotal`, `startedAt`, `completedAt` |
| `VendorBox` | — | `boxId`, `barcode`, `vpoNumber`, `lotNumber`, `numberOfUnits`, `boxWeight`/`grossWeight`, `secondaryCheckingAccepted(+At)`, `returnedToVendor(+At)`, `storedStatus`, `qcData` |
| `VendorGrn` | — | `grnNumber`, `baseGrnNumber`, `revisionNo`, `status(active/superseded/voided)`, `totals.{expected,verified,variance,m1,m2,m3,m4}`, `lots[].items[]`, `incompleteClassification`, `discrepancyDetails`, `secondaryCheckingCompletedAt` |
| `VendorPoVendorReturn` | — | `status(pending_session/completed/cancelled)`, `cancellationIntent(partial/full_vpo)`, `boxLines[]`, `m4Lines[]`, `articleQtyLines[]`, `totalUnits`, `boxCount`, `m4UnitCount`, `articleQtyCount` |
| `VendorPoReturnChallan` | — | `challanNumber`, `totals.{boxCount,totalUnits,m4UnitCount,articleQtyCount}`, `returnBoxes[]`, `transport{}` |
| `VendorDispatchStockTransferNote` | `vendor_dispatch_stock_transfer_notes` | `stnSerial (V000001)`, `stnDate`, `totalQty`, `totalBoxes`, `lines[]`, `allocations[]`, `status(active/void)` |
| `VendorM2Log` | `vendor_m2_logs` | `type`, `status(OPEN/PARTIAL/RESOLVED)`, `originalQuantity`, `remainingQuantity`, `sourceFloor`, `timestamp` |
| `VendorM3Log` | `vendor_m3_logs` | `type`, `quantity`, `previousOnHand`/`newOnHand`, `outwardTotal`, `timestamp` |
| `VendorM4Log` | `vendor_m4_logs` | same shape, `finalChecking` source only |
| `ContainersMaster` | `containers_masters` | `barcode`, `status`, `activeFloor`, `activeItems[{vendorProductionFlow, quantity, transferItems[]}]` — **holds the invisible in‑transit WIP** |

### 2.3 Backend API surface (mounted at `/v1/vendor-management`)

```
/v1/vendor-management                              CRUD + bulk vendors
/v1/vendor-management/production-flow              list / :id / floors/:floorKey PATCH
                                    /transfer      cross-floor move (container-gated)
                                    /confirm       FC → dispatch
                                    /branding-type
                                    /final-checking/m2-transfer
/v1/vendor-management/purchase-orders              CRUD + bulk + by-number
/v1/vendor-management/boxes                        CRUD + bulk-by-lot
/v1/vendor-management/vendor-grns                  list / by-vpo / by-lot / issue / revisions
/v1/vendor-management/vendor-returns               return sessions
/v1/vendor-management/vendor-po-return-challans    challans + transport + boxes
/v1/vendor-management/m2  /entries /logs /statistics  /entries/:id/{merge-m1,transfer-m3,transfer-m4}
/v1/vendor-management/m3  /flows   /logs /statistics  /flows/:id/outward
/v1/vendor-management/m4  /flows   /logs /statistics  /flows/:id/outward
/v1/vendor-management/dispatch/transfer-notes      list / create / :id / preview / report
```

**Precedent that helps us:** `getM2Statistics()` in `vendorM2Management.service.js` already does a `Promise.all` of `countDocuments` + `$group`. The dashboard follows the same pattern, scaled up with `$facet`.

---

## 3. End‑to‑end lifecycle of one unit

```
┌─ COMMERCIAL ─────────────────────────────────────────────────────────────┐
│ Vendor created (vendor-list)                                             │
│   └─> VPO raised  ── draft → submitted_to_vendor → in_transit            │
│        (poItems: qty, rate, gst, ETA)                                    │
└──────────────────────────────────────────────────────────────────────────┘
                              │  packListDetails[] (courier, challan, boxes)
                              ▼
┌─ INWARD ─────────────────────────────────────────────────────────────────┐
│ Goods Received  → receivedLotDetails[] (lot, boxes, units)               │
│   └─> VendorBox docs generated per box (barcode)                         │
│   └─> VendorProductionFlow created per article (plannedQuantity)         │
│        status → goods_partially_received / goods_received                │
└──────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─ PRODUCTION PIPELINE (container-gated) ──────────────────────────────────┐
│                                                                          │
│  secondaryChecking ──► branding ──► [reBoarding*] ──► finalChecking      │
│        M1/M2/M3/VM4       style/brand    *Embroidery      M1/M2/M3/M4    │
│           │                  only                            │           │
│           │                                                  ▼           │
│           │                                              dispatch        │
│           │                                                  │           │
│  M2 ledger ◄──┬── M2 entries from SC + FC                    │           │
│  M3 ledger ◄──┤   (merge→M1 / →M3 / →M4)                     │           │
│  M4 ledger ◄──┘                                              │           │
│  VM4 (SC) ──► PO Return path                                 │           │
│                                                              ▼           │
│  ⚠ Between every leg quantity sits in a ContainersMaster with            │
│    activeFloor = destination until someone SCANS + ACCEPTS.              │
│    Destination `received` does NOT move until then.                      │
└──────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─ OUTWARD ────────────────────────────────────────────────────────────────┐
│ dispatch → warehouse  (STN V000001, transfer note, allocations)          │
│   └─> WHMS inward                                                        │
└──────────────────────────────────────────────────────────────────────────┘
                              │
┌─ REVERSE FLOWS ──────────────────────────────────────────────────────────┐
│ GRN issued (variance = verified − expected, revisions supersede)         │
│ PO Return session → VPRC challan → boxes physically back to vendor       │
│ M3 / M4 outward → scrap / secondary channel                              │
└──────────────────────────────────────────────────────────────────────────┘
```

**Quality bucket meanings (confirmed from `vendorFloorQuantity.embed.js`):**

| Bucket | Where | Meaning |
|--------|-------|---------|
| **M1** | SC + FC | Good / A‑grade — flows forward |
| **M2** | SC + FC | Repairable — goes to M2 ledger, can merge back to M1 |
| **M3** | SC + FC | Downgrade / seconds — outward via M3 ledger |
| **M4** | FC only | Reject / scrap — outward via M4 ledger |
| **VM4** | SC only | Vendor return / warranty — feeds **PO Return**, *not* M4 Management |

**Critical formulas already enforced by backend (do not re‑derive differently):**

```
remaining        = received − m2Quantity − m4Quantity − transferred − completed   (checking floors)
m1Remaining      = m1Quantity − m1Transferred
branding avail   = completed − transferred
dispatch remaining = received − transferred
pendingToDispatch  = finalChecking.completed − finalChecking.transferred
invariant        : m1Quantity + m2Quantity + m4Quantity ≤ received
```

---

## 4. The 12 questions a CEO actually asks

Every widget on this dashboard must map to one of these. If it doesn't, it doesn't ship.

| # | Question | Answered by section |
|---|----------|--------------------|
| 1 | How much money is committed to vendors right now, and how much is still undelivered? | A — Money |
| 2 | How many units are stuck inside my factory, and where exactly? | C — WIP waterfall |
| 3 | Which POs are late and by how many days? | B — Delivery / OTIF |
| 4 | What is my defect rate, and is it getting worse? | D — Quality |
| 5 | Which vendor is the problem? | E — Vendor scorecard |
| 6 | How much am I shipping out per day vs receiving in? | F — Throughput |
| 7 | What's the value of goods I'm sending back to vendors? | G — Returns & recovery |
| 8 | Where is the bottleneck — which floor is choking? | C + F |
| 9 | Is anything physically lost / unaccounted? | H — Reconciliation |
| 10 | What needs my decision **today**? | I — Exceptions |
| 11 | How does this month compare to last month / last quarter? | Trend strip on every KPI |
| 12 | Which articles/brands are moving and which are dead? | J — Product mix |

---

## 5. Dashboard information architecture

Ten zones, top to bottom. Each zone is an **independently loading, independently cacheable** unit.

```
╔══════════════════════════════════════════════════════════════════════════╗
║  HEADER BAR                                                              ║
║  Vendor Command Center · [Date range ▾] [Vendor ▾] [Brand ▾] [Refresh]   ║
║  Last updated 14:32 · Live ●  ·  [Export PDF] [Export Excel]             ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ⓘ ZONE 0 — ALERT RIBBON  (only renders if count > 0)                    ║
║  🔴 4 POs overdue >15d  🟠 12 containers unscanned >48h  🟡 ₹2.1L M4     ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ZONE A — HEADLINE KPI STRIP (8 cards, 4×2 desktop / 2×4 tab / 1×8 mob)  ║
║  Open PO Value │ Units In Pipeline │ Dispatched MTD │ Defect Rate        ║
║  OTIF %        │ Avg Cycle Time    │ Return Value   │ Active Vendors     ║
╠═══════════════════════════════════╦══════════════════════════════════════╣
║  ZONE B — PIPELINE WATERFALL      ║  ZONE C — FLOOR LOAD HEATSTRIP       ║
║  Ordered→Received→WIP→Dispatched  ║  5 floors × (in / wip / out / aging) ║
╠═══════════════════════════════════╬══════════════════════════════════════╣
║  ZONE D — THROUGHPUT TREND        ║  ZONE E — QUALITY MIX (M1–M4)        ║
║  Dual-axis 30/90d: received vs    ║  Stacked % area over time +          ║
║  dispatched + 7d moving avg       ║  donut of current-period split       ║
╠═══════════════════════════════════╩══════════════════════════════════════╣
║  ZONE F — VENDOR SCORECARD TABLE (sortable, top 10 + "view all")         ║
║  Vendor │ POs │ Value │ OTIF │ Defect% │ Return% │ AvgLead │ Score │ ▲▼   ║
╠═══════════════════════════════════╦══════════════════════════════════════╣
║  ZONE G — PO STATUS FUNNEL        ║  ZONE H — AGING BUCKETS              ║
║  9 statuses, count + value        ║  0-7 / 8-15 / 16-30 / 30+ days       ║
╠═══════════════════════════════════╬══════════════════════════════════════╣
║  ZONE I — RETURNS & LEAKAGE       ║  ZONE J — TOP ARTICLES / BRANDS      ║
║  M3/M4 outward, VM4, challans     ║  Treemap or ranked bars              ║
╠═══════════════════════════════════╩══════════════════════════════════════╣
║  ZONE K — EXCEPTION WORKLIST (tabbed, virtualised, max 50 rows/tab)      ║
║  [Overdue POs] [Stuck Containers] [GRN Variance] [Open M2] [Idle Flows]  ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ZONE L — RECONCILIATION LEDGER (collapsed by default)                   ║
║  Ordered = Received + Short  ·  Received = WIP + Dispatched + Returned   ║
║           + Scrapped + Unaccounted                                       ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 6. Section‑by‑section KPI specification

> Notation: `VPO` = VendorPurchaseOrder, `VPF` = VendorProductionFlow, `FQ` = `floorQuantities`.

### ZONE A — Headline KPI strip (8 cards)

Each card: **big number · delta vs previous equal period · sparkline (12 points) · click → drill**.

| # | KPI | Formula | Source | Drill‑down |
|---|-----|---------|--------|-----------|
| A1 | **Open PO Value** | `Σ VPO.total WHERE currentStatus ∉ {draft, po_rejected, goods_received, po_accepted}` | VPO | `/vendor-po/raise?status=open` |
| A2 | **Undelivered Units** | `Σ poItems.quantity − Σ receivedLotDetails.totalUnits` for open POs | VPO | Receive screen |
| A3 | **Units In Pipeline (WIP)** | `Σ over VPF of (SC.remaining + branding.remaining + reBoarding.remaining + FC.remaining + dispatch.remaining)` **+** `Σ ContainersMaster.activeItems.quantity where activeItems.vendorProductionFlow ≠ null AND status = ACTIVE` | VPF + Containers | Zone C |
| A4 | **Dispatched (period)** | `Σ VendorDispatchStockTransferNote.totalQty WHERE status=active AND stnDate ∈ range` | STN | `/vendor-po/dispatch` |
| A5 | **Defect Rate %** | `(Σ FC.m2Quantity + FC.m3Quantity + FC.m4Quantity) / Σ FC.received × 100` | VPF | Zone E |
| A6 | **OTIF %** | `count(POs where actualReceiptDate ≤ estimatedOrderDeliveryDate) / count(POs received in range) × 100`; `actualReceiptDate` = `goodsReceivedDate` ?? `max(statusLogs[statusCode ∈ {goods_received, goods_partially_received}].updatedAt)` | VPO | Zone G/H |
| A7 | **Avg Cycle Time (days)** | `avg(VPF.completedAt − VPF.startedAt)` over flows completed in range; fall back to `createdAt` when `startedAt` is null | VPF | Zone C |
| A8 | **Return / Leakage Value** | `Σ (M3 outward + M4 outward + VPRC challan units) × weightedAvgRate` where `weightedAvgRate` = `VPO.subTotal / Σ poItems.quantity` for the parent PO | M3/M4 logs, challans, VPO | Zone I |

**Bonus card (replaces A8 when returns are zero):** *Active Vendors* = `count(VendorManagement where header.status='active')` with `count(vendors with ≥1 PO in range)` as sub‑label.

### ZONE B — Pipeline waterfall

Single horizontal waterfall / funnel showing unit conservation:

```
Ordered  →  Dispatched by vendor  →  Received (GRN)  →  QC passed (M1)
   →  Branded  →  Final checked  →  Dispatched to WHMS
```

| Stage | Formula |
|-------|---------|
| Ordered | `Σ VPO.poItems.quantity` |
| Vendor dispatched | `Σ VPO.packListDetails.totalUnits` |
| Received | `Σ VPO.receivedLotDetails.totalUnits` |
| GRN verified | `Σ VendorGrn.totals.verified` (status=active only) |
| SC passed (M1) | `Σ VPF.FQ.secondaryChecking.m1Quantity` |
| Branded out | `Σ VPF.FQ.branding.transferred` |
| FC passed | `Σ VPF.FQ.finalChecking.m1Quantity` |
| Dispatched | `Σ VPF.FQ.dispatch.transferred` |

Each bar shows **absolute + % of Ordered + drop from previous stage in red**. The biggest single red drop is auto‑labelled **"Biggest leak"**.

### ZONE C — Floor load heatstrip

One row per floor: `secondaryChecking · branding · reBoarding · finalChecking · dispatch`

| Column | Formula |
|--------|---------|
| Inbound waiting (in containers) | `Σ ContainersMaster.activeItems.quantity WHERE activeFloor = <floor label> AND status = ACTIVE AND activeItems.vendorProductionFlow ≠ null` |
| Received | `Σ FQ.<floor>.received` |
| WIP / Remaining | `Σ FQ.<floor>.remaining` |
| Completed | `Σ FQ.<floor>.completed` |
| Transferred out | `Σ FQ.<floor>.transferred` |
| Flows on floor | `count(VPF where currentFloorKey = <floor>)` |
| Oldest item age | `now − min(FQ.<floor>.receivedData[].receivedTimestamp)` for flows with `remaining > 0` |
| Repair in | `Σ FQ.<floor>.repairReceived` |

**Bottleneck badge:** floor with the highest `remaining / (completed_last_7d / 7)` ratio → *"~N days of backlog"*. This is the single most valuable number on the page for a factory CEO.

Colour scale: green `<1d` backlog, amber `1–3d`, red `>3d`.

> `activeFloor` string values in `containers_masters` are human labels — confirmed examples: `"Branding"`, `"Final Checking"`. A mapping table `floorKey → activeFloor label` must be built and unit‑tested, because a typo here silently zeroes the in‑transit KPI.

### ZONE D — Throughput trend

- X axis: day (30d) / week (90d) / month (12m), auto‑selected by range length.
- Series 1 (bar): **Units received** — from `VPO.receivedLotDetails` bucketed by `goodsReceivedDate` (fallback `statusLogs` timestamp).
- Series 2 (bar): **Units dispatched** — `STN.totalQty` bucketed by `stnDate`.
- Series 3 (line): **7‑period moving average of dispatched**.
- Series 4 (area, secondary axis): **WIP at end of period** — requires the daily snapshot (§12), because WIP is not historically reconstructable from the live collections.

### ZONE E — Quality mix

Two widgets side by side.

**E1 — Stacked 100% area chart over time**: M1 / M2 / M3 / M4 share, split by source floor (toggle SC ↔ FC).

**E2 — Current period donut + M‑ledger status:**

| Metric | Formula |
|--------|---------|
| M1 % | `Σ FC.m1Quantity / Σ FC.received` |
| M2 % | `Σ FC.m2Quantity / Σ FC.received` |
| M3 % | `Σ FC.m3Quantity / Σ FC.received` |
| M4 % | `Σ FC.m4Quantity / Σ FC.received` |
| Open M2 entries | `VendorM2Log.countDocuments({type:ENTRY, status:{$in:[OPEN,PARTIAL]}})` |
| Open M2 qty | `Σ remainingQuantity` on those |
| M2 recovery rate | `Σ M2 merged-to-M1 qty / Σ M2 original qty` — the % of defects we actually save |
| M3 on hand vs outward | `Σ VPF.FQ.*.m3Quantity − Σ VPF.m3Tracking.outwardTotal` |
| M4 on hand vs outward | `Σ VPF.FQ.finalChecking.m4Quantity − Σ VPF.m4Tracking.outwardTotal` |
| Repair TAT | `avg(M2 RESOLVED.timestamp − matching ENTRY.timestamp)` from `vendor_m2_logs` |

**M2 recovery rate is a strong CEO metric** — it converts a QC number into a money‑saved number.

### ZONE F — Vendor scorecard

Server‑ranked table, top 10 shown, "View all" opens a full paginated modal.

| Column | Formula |
|--------|---------|
| Vendor | `header.vendorName (header.vendorCode)` |
| POs (period) | `count(VPO)` |
| PO Value | `Σ VPO.total` |
| Delivered units | `Σ receivedLotDetails.totalUnits` |
| **OTIF %** | as A6, per vendor |
| **Avg lead time** | `avg(actualReceiptDate − createDate)` in days |
| **Lead time variance** | `stddev` of the above — *consistency matters more than speed* |
| **GRN variance %** | `Σ |VendorGrn.totals.variance| / Σ totals.expected × 100` |
| **Defect % (SC)** | `(Σ SC.m2+m3+vm4) / Σ SC.received × 100` — SC is the *vendor's* fault; FC defects may be ours |
| **Return %** | `Σ VendorPoVendorReturn.totalUnits / Σ receivedLotDetails.totalUnits × 100` |
| **Composite score** | see below |
| Trend | ▲▼ vs previous equal period |

**Composite vendor score (0–100), proposed weights — must be signed off by the business:**

```
score = 30 × OTIF_norm
      + 25 × (1 − defectSC_norm)
      + 20 × (1 − returnRate_norm)
      + 15 × (1 − grnVariance_norm)
      + 10 × (1 − leadTimeVariance_norm)
```
Each `_norm` is min‑max scaled across active vendors in the period. Vendors with `< 3 POs` in the period are marked **"insufficient data"** and excluded from ranking — otherwise one lucky PO makes a new vendor #1.

Colour bands: ≥80 green (**Preferred**), 60–79 amber (**Watch**), <60 red (**Review**).

### ZONE G — PO status funnel

All 9 statuses from `vendorPurchaseOrderStatuses`, each with **count + value + avg days in status**:

`draft → submitted_to_vendor → in_transit → goods_partially_received → goods_received → qc_pending → po_accepted / po_accepted_partially / po_rejected`

`avg days in status` comes from consecutive `statusLogs[].updatedAt` deltas. This exposes *where POs sit* — e.g. "18 POs stuck in `qc_pending` for avg 11 days" is an immediately actionable CEO insight.

### ZONE H — Aging buckets

Two grouped bar charts:

**H1 — Overdue POs** by `now − estimatedOrderDeliveryDate`: `0–7 / 8–15 / 16–30 / 30+ days`, count + value per bucket.

**H2 — Idle WIP** by `now − last floor movement` (`max(FQ.*.receivedData[].receivedTimestamp)` or `VPF.updatedAt`): same buckets, units per bucket. Anything in `30+` is money that has stopped moving.

### ZONE I — Returns & leakage

| Metric | Formula |
|--------|---------|
| Return sessions | `count(VendorPoVendorReturn where status='completed')` |
| Pending sessions | `count(status='pending_session')` — **these are half‑done, a real risk** |
| Boxes returned | `Σ boxCount` / cross‑check `count(VendorBox where returnedToVendor=true)` |
| Units returned | `Σ totalUnits` split into `boxLines` / `m4Lines` / `articleQtyLines` |
| Challans issued | `count(VendorPoReturnChallan)`, `Σ totals.totalUnits` |
| Full‑VPO cancellations | `count(cancellationIntent='full_vpo')` — escalation signal |
| M3 outward (period) | `Σ VendorM3Log.quantity where type=OUTWARD` |
| M4 outward (period) | `Σ VendorM4Log.quantity where type=OUTWARD` |
| **Estimated leakage value** | `(returned + M3 out + M4 out) × weightedAvgRate` |

### ZONE J — Product / brand mix

- **Treemap** of dispatched units by `brand` (from `FQ.dispatch.transferredData[].brand` and `STN.lines[].brand`), drill to `styleCode`.
- **Top 10 articles** by dispatched units, with defect % per article — reveals *which product* is the quality problem, not just which vendor.
- **Branding type split**: Heat Transfer vs Embroidery unit counts + avg cycle time each. Embroidery takes the extra `reBoarding` leg, so this quantifies its true cost.
- **Dead stock**: articles with `FQ.*.remaining > 0` and no movement in 30 days.

### ZONE K — Exception worklist (tabbed)

Server‑side sorted, max 50 rows per tab, virtualised, each row deep‑links.

| Tab | Query | Row shows |
|-----|-------|-----------|
| **Overdue POs** | `estimatedOrderDeliveryDate < now AND currentStatus ∈ {submitted_to_vendor, in_transit, goods_partially_received}` | VPO#, vendor, days late, value, ETA |
| **Stuck containers** | `ContainersMaster` active, has vendor items, `updatedAt < now − 48h` | barcode, floor, qty, hours idle |
| **GRN variance** | `VendorGrn` active with `|totals.variance| > 0` or `incompleteClassification = true` | GRN#, VPO#, expected, verified, variance, discrepancy |
| **Open M2** | `VendorM2Log` ENTRY status OPEN/PARTIAL, oldest first | ref code, VPO#, qty remaining, age, source floor |
| **Idle flows** | `VPF` with any `remaining > 0` and `updatedAt < now − 7d` | ref code, floor, qty, days idle |
| **Pending returns** | `VendorPoVendorReturn.status = 'pending_session'` | VPO#, created, units staged |
| **Unscanned boxes** | `VendorBox` where `secondaryCheckingAccepted = false` and `createdAt < now − 72h` | boxId, VPO#, lot, units |

### ZONE L — Reconciliation ledger (collapsed)

The audit view. Two identities, each with a computed **Unaccounted** residual:

```
IDENTITY 1 (inward)
  Σ poItems.quantity
   = Σ receivedLotDetails.totalUnits          (received)
   + short-supply                              (open balance)
   + cancelled                                 (full_vpo returns)

IDENTITY 2 (internal)
  Σ receivedLotDetails.totalUnits
   = WIP across floors
   + in-transit in containers
   + Σ STN.totalQty                            (out to WHMS)
   + Σ VendorPoReturnChallan.totals.totalUnits (back to vendor)
   + Σ M3Log/M4Log outward                     (scrap / seconds)
   + UNACCOUNTED   ← must be ≈ 0
```

Show **Unaccounted** as an absolute number, a % of received, and a red/green health chip. Anything above ~0.5% deserves an investigation ticket. This one row is the reason a CEO trusts every other number on the page.

---

## 7. Chart & visualisation catalogue

Library: **ApexCharts via `react-apexcharts`**, already a dependency (`^3.49.1`) and already wrapped safely in `shared/components/SafeChart.tsx` (dynamic import, `ssr: false`, error boundary). **Do not add a second chart library.**

| Zone | Chart type | Apex `type` | Notes |
|------|-----------|-------------|-------|
| A | Sparkline | `line` | `sparkline.enabled = true`, 12 points max, no axes |
| B | Waterfall/funnel | `bar` horizontal | Apex has no native waterfall — use stacked bar with a transparent base series |
| C | Heatstrip | *CSS grid, no chart* | Pure divs — far faster than a chart for 5×8 cells |
| D | Combo | `line` with mixed series | Bars + line + area, 2 y‑axes |
| E1 | 100% stacked area | `area` | `stacked: true, stackType: '100%'` |
| E2 | Donut | `donut` | 4 slices only |
| F | Table | *none* | Sortable HTML table + inline mini progress bars |
| G | Funnel | `bar` horizontal | Sorted descending, value labels inside |
| H | Grouped bars | `bar` | 4 buckets × 2 series |
| I | KPI tiles + small bar | `bar` | |
| J | Treemap | `treemap` | Apex supports natively |
| K | Table | *none* | Virtualised rows |
| L | Table | *none* | |

**Hard rules for chart performance:**
- `animations.enabled = false` on every chart. Apex animation on 8+ charts is the #1 cause of a janky dashboard.
- `chart.redrawOnParentResize = false`; handle resize with a debounced (250 ms) manual `ApexCharts.exec('…','updateOptions')`.
- Max **60 data points per series**. Server pre‑buckets; the client never bins raw rows.
- Every chart is `next/dynamic` with `ssr:false` and a fixed‑height skeleton so there is **zero cumulative layout shift**.
- Charts below the fold mount only on `IntersectionObserver` intersection.

---

## 8. Exception / alert engine

Alerts are computed **server‑side** in the same aggregation pass and returned as a typed list. The ribbon renders at most 4; the rest collapse into "+N more".

```ts
type VendorAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'delivery' | 'quality' | 'wip' | 'financial' | 'reconciliation';
  title: string;        // "4 POs overdue by more than 15 days"
  value: number;
  valueLabel: string;   // "₹18.4L at risk"
  href: string;         // deep link with pre-applied filter
  since?: string;       // ISO
};
```

**Default rule set (all thresholds must live in one config file, not scattered in code):**

| Rule | Severity | Threshold (proposed, configurable) |
|------|----------|-----------------------------------|
| PO overdue | critical | `> 15 days` past ETA |
| PO overdue | warning | `1–15 days` past ETA |
| Container unscanned | critical | `> 48 h` on `activeFloor` |
| GRN variance | critical | `|variance| > 2%` of expected |
| Defect rate spike | critical | current period `> 1.5 ×` trailing 90‑day average |
| Open M2 aging | warning | any entry `> 7 days` OPEN |
| Idle WIP | warning | `remaining > 0` and no movement `> 7 days` |
| Pending return session | warning | `status='pending_session'` for `> 24 h` |
| Unaccounted units | critical | `> 0.5%` of received |
| Vendor score drop | warning | score fell `> 15 pts` vs previous period |
| Single‑vendor concentration | info | one vendor `> 40%` of open PO value |

---

## 9. Global filters, time model and drill‑down contract

### 9.1 Filters (all URL‑synced so a CEO can bookmark / share a view)

| Filter | Values | Default |
|--------|--------|---------|
| Date range | Today · 7d · 30d · 90d · FY · Custom | **30d** |
| Compare to | Previous period · Same period last year · None | Previous period |
| Vendor | multi‑select, searchable | All |
| Brand | multi‑select | All |
| Product / article | searchable single | All |
| Floor | multi‑select | All |
| PO status | multi‑select | All |

URL shape: `/vendor-po?from=2026-07-23&to=2026-08-22&vendor=abc,def&brand=Nike&cmp=prev`

### 9.2 The time‑model trap (read this before writing any query)

There are **two fundamentally different kinds of number** on this dashboard and mixing them is the classic source of wrong dashboards:

| Kind | Behaviour under a date filter | Examples |
|------|------------------------------|----------|
| **Flow / period metrics** | Filtered by the date range | Dispatched units, POs raised, GRNs issued, M3/M4 outward, defect rate for the period |
| **Stock / point‑in‑time metrics** | **NOT** filtered by the range — always "as of now" | WIP by floor, open PO value, containers in transit, open M2 balance |

**Rule:** every stock metric card must carry an explicit `as of <timestamp>` label, and the date picker must visually not apply to them (a small "live" dot instead). Without this the CEO will select "Last 7 days", see WIP drop, and conclude something happened that didn't.

### 9.3 Drill‑down contract

Nothing on the dashboard opens a new dashboard page. Every click either:
1. Expands a drawer with the row‑level evidence (fetched lazily, on demand), **or**
2. Navigates to the existing operational screen with query params pre‑applied.

Required query‑param support to add to existing screens: `?vendor=`, `?vpo=`, `?status=`, `?flow=`, `?highlight=`. Several screens already support `highlightFlowId` / `highlightVpoId` internally — expose them via URL.

---

## 10. Performance architecture — how we make it fast

### 10.1 What's slow today (measured from the code, not guessed)

| Anti‑pattern | Where | Impact |
|--------------|-------|--------|
| `limit: 500` + **3 parallel full list calls**, merged in a `Map` client‑side | `receive/page.tsx` → `fetchInboundPurchaseOrders()` | 3 round trips, ~MBs of JSON, all parsing on the main thread |
| `limit: 100` full‑document fetch per floor screen | `utils/vendorPoProductionFlowList.ts` | Ships every `receivedData[]` / `transferredData[]` sub‑array the UI never reads |
| Every list call uses `populate` of vendor + PO + product | `queryVendorProductionFlows` | 3 extra collection lookups per page |
| All aggregation done in React `useMemo` | every floor page | O(n) JS work on every keystroke of the search box |
| No caching layer anywhere | backend | Every refresh re‑scans Mongo |

If the dashboard follows the same pattern with 10 zones, it will take 15+ seconds. It must not.

### 10.2 The three‑tier read model

```
┌─ TIER 1 — PRE-AGGREGATED SNAPSHOTS (cron) ──────────────────────────────┐
│ vendor_dashboard_daily_snapshots   one doc per (date, vendor)           │
│ vendor_dashboard_floor_snapshots   one doc per (date, floorKey)         │
│ Written nightly 00:15 IST by a CronJob, same pattern as the existing    │
│ yarnDailySnapshot.cron.js. Idempotent upsert by date key.               │
│ → Serves ALL trend charts (Zone D, E1) and all "vs last period" deltas. │
│ → Query cost: a range scan over ≤ 400 tiny docs. Sub-10 ms.             │
└─────────────────────────────────────────────────────────────────────────┘
┌─ TIER 2 — LIVE $facet AGGREGATION (cached 60 s) ────────────────────────┐
│ One aggregation per collection, each using $facet to compute many       │
│ KPIs in a single collection scan. 6 pipelines run under Promise.all.    │
│ → Serves current WIP, open PO value, floor load, exception counts.      │
└─────────────────────────────────────────────────────────────────────────┘
┌─ TIER 3 — ON-DEMAND DETAIL ─────────────────────────────────────────────┐
│ Exception worklist rows, vendor scorecard "view all", drill drawers.    │
│ Fetched only when the user opens the tab/drawer. Paginated, 50 max.     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why a snapshot at all?** WIP and floor balances are *destructively overwritten* — `FQ.branding.remaining` today tells you nothing about what it was on 1 August. Historical trend for WIP is **impossible** without a snapshot. Ledger‑style metrics (dispatched, received) *can* be reconstructed from timestamps, but doing so on every page load is a full‑collection scan. Snapshot both.

### 10.3 `$facet` pattern (one scan → many KPIs)

Instead of 20 separate queries, group KPIs by the collection they read:

```js
// Pipeline 1 of 6 — VendorProductionFlow
VendorProductionFlow.aggregate([
  { $match: matchStage },                    // uses index, narrows first
  { $project: { /* ONLY the numeric fields — never receivedData[] */ } },
  { $facet: {
      wipByFloor:      [ { $group: { _id: '$currentFloorKey', remaining: { $sum: ... }, flows: { $sum: 1 } } } ],
      qualityTotals:   [ { $group: { _id: null, m1: {$sum:'$floorQuantities.finalChecking.m1Quantity'}, /* … */ } } ],
      cycleTime:       [ { $match: { completedAt: { $ne: null } } }, { $group: { _id: null, avgMs: { $avg: { $subtract: ['$completedAt','$startedAt'] } } } } ],
      idleFlows:       [ { $match: { updatedAt: { $lt: sevenDaysAgo } } }, { $count: 'n' } ],
      brandingSplit:   [ { $group: { _id: '$brandingType', qty: { $sum: '$plannedQuantity' } } } ],
      m3m4OnHand:      [ { $group: { _id: null, m3Out: {$sum:'$m3Tracking.outwardTotal'}, m4Out: {$sum:'$m4Tracking.outwardTotal'} } } ],
  }},
])
```

**Rules:**
- `$match` **first**, always, and it must hit an index.
- `$project` before `$facet` to strip `receivedData[]` / `transferredData[]` / `statusLogs[]`. These arrays are the bulk of the document size and none of the summary KPIs need them. This alone can cut the working set by 5–10×.
- Never `$lookup` inside `$facet`. Resolve vendor names in a **second tiny query** (`VendorManagement.find({_id:{$in:[…]}}).select('header.vendorName header.vendorCode').lean()`) and join in JS.
- Use `{ allowDiskUse: true }` only as an escape hatch — if it's needed, the pipeline is wrong.

**The six pipelines:**

| # | Collection | Serves |
|---|-----------|--------|
| 1 | `VendorProductionFlow` | WIP, floor load, quality totals, cycle time, idle flows, branding split |
| 2 | `VendorPurchaseOrder` | Open value, status funnel, OTIF, aging, ordered/received units, vendor value rollup |
| 3 | `VendorDispatchStockTransferNote` | Dispatch throughput, boxes, brand mix |
| 4 | `VendorGrn` | Variance, revision count, exceptions |
| 5 | `vendor_m2_logs` + `m3` + `m4` | Ledger balances, recovery rate, repair TAT |
| 6 | `ContainersMaster` + `VendorPoVendorReturn` + `VendorPoReturnChallan` | In‑transit WIP, returns, leakage |

All six under one `Promise.all`. Target: **< 400 ms** total server time on a warm cache miss.

### 10.4 Indexes required (add via a migration script)

```js
// VendorPurchaseOrder
{ currentStatus: 1, createDate: -1 }
{ vendor: 1, createDate: -1 }
{ estimatedOrderDeliveryDate: 1, currentStatus: 1 }
{ goodsReceivedDate: -1 }

// VendorProductionFlow  (existing: {vendor,createdAt}, {vendorPurchaseOrder})
{ currentFloorKey: 1, updatedAt: -1 }
{ completedAt: -1 }
{ createdAt: -1 }
// partial indexes — tiny, and they make the exception queries instant
{ 'floorQuantities.finalChecking.remaining': 1 }
   partialFilterExpression: { 'floorQuantities.finalChecking.remaining': { $gt: 0 } }
// …repeat per floor

// VendorGrn  (existing: {vpoNumber,status}, {lots.lotNumber})
{ grnDate: -1, status: 1 }
{ status: 1, 'totals.variance': 1 }

// VendorBox  (existing: {vpoNumber,lotNumber})
{ secondaryCheckingAccepted: 1, createdAt: -1 }
{ returnedToVendor: 1, returnedToVendorAt: -1 }

// STN  (existing: {stnDate:-1}, {categoryLabel})
{ status: 1, stnDate: -1 }

// ContainersMaster
{ activeFloor: 1, status: 1 }
{ 'activeItems.vendorProductionFlow': 1 }

// M2/M3/M4 logs — mostly covered; add:
{ type: 1, status: 1, timestamp: -1 }   // m2 (partially exists)
{ type: 1, timestamp: -1 }              // m3, m4 (exists)

// New snapshot collections
{ snapshotDate: -1, vendor: 1 }  unique
{ snapshotDate: -1, floorKey: 1 } unique
```

Run `explain('executionStats')` on every dashboard pipeline before merging; **`COLLSCAN` on any dashboard query is a blocker, not a nit.**

### 10.5 Caching (no Redis in this stack)

The backend has **no Redis / node‑cache dependency** — `compression` and `express-rate-limit` only. Two options:

**Option A (recommended, zero new infra):** in‑process LRU + HTTP validators.
```js
// tiny Map-based TTL cache, keyed by a hash of the normalised filter object
const KEY = hash({ from, to, vendors, brands, section });
// TTL: summary 60 s · trends 15 min · exceptions 120 s · scorecard 5 min
```
Plus response headers:
```
ETag: "<sha1 of payload>"
Cache-Control: private, max-age=30, stale-while-revalidate=120
```
The browser then serves an instant `304` on refresh. With `compression()` already enabled, a 60 KB JSON payload goes over the wire at ~8 KB.

> Caveat to state plainly: with PM2 clustering (`ecosystem.config.json` is present), an in‑process cache is **per worker**. With N workers you get N cold misses instead of 1. That's acceptable at this scale; if it isn't, add Redis in phase 3.

**Option B:** persist computed summaries into a `vendor_dashboard_cache` collection with a TTL index. Shared across workers, survives restarts, no new infra. Slightly slower than in‑process but still ~5 ms. **Recommended if PM2 runs more than 2 workers.**

### 10.6 Frontend performance

| Technique | Detail |
|-----------|--------|
| **Section‑wise progressive load** | Zone A fires first and paints in < 500 ms. Zones B–J fire in a second wave. Zone K/L only on interaction. Never one giant blocking request. |
| **Skeletons with exact final height** | Prevents CLS. Reserve pixel heights per zone. |
| **`IntersectionObserver` mounting** | Charts below the fold don't mount until scrolled to. Cuts initial JS execution roughly in half. |
| **`next/dynamic({ ssr: false })`** for every chart | ApexCharts must never SSR — reuse `SafeChart`. |
| **Virtualised tables** | Zone K/F render max 50 rows; use windowing if that ever grows. |
| **AbortController on every fetch** | Rapid filter changes must cancel in‑flight requests or the last response can lose the race and render stale data. |
| **Debounce filters at 350 ms** | Don't fire on every keystroke. |
| **`useMemo` only over already‑small arrays** | All heavy aggregation is server‑side. If the dashboard has a `.reduce()` over 500 items, the API is wrong. |
| **Payload budget** | Summary ≤ 40 KB · Trends ≤ 30 KB · Exceptions ≤ 60 KB · **total first paint < 100 KB** |
| **Polling** | Optional 60 s auto‑refresh, **paused when `document.hidden`**. Not sockets — the data doesn't need sub‑minute freshness and sockets are a whole new failure mode. |
| **Number formatting** | One shared `Intl.NumberFormat` instance module‑scoped. Creating one per cell in a 500‑cell table is a real, measurable cost. |

### 10.7 Performance budget (acceptance criteria)

| Metric | Target |
|--------|--------|
| Time to first KPI painted | **< 800 ms** (cached) / < 1.5 s (cold) |
| Full page interactive | **< 2.5 s** |
| Server time, summary endpoint (cache hit) | < 20 ms |
| Server time, summary endpoint (cache miss) | < 400 ms |
| Total JSON transferred, first paint | < 100 KB |
| Lighthouse CLS | < 0.05 |
| Filter change → repaint | < 600 ms |

---

## 11. Proposed API surface

New router: `AddOn_backend/src/routes/v1/vendorDashboard.route.js`, mounted at
`/v1/vendor-management/dashboard` (registered **before** `/:vendorManagementId` in `vendorManagement.route.js`, same as the existing sub‑routers).

| Endpoint | Returns | Cache TTL |
|----------|---------|-----------|
| `GET /dashboard/summary` | Zones A, B, C, G — all headline + WIP + funnel numbers | 60 s |
| `GET /dashboard/trends` | Zones D, E1 — from snapshot collections | 15 min |
| `GET /dashboard/quality` | Zone E2 — M1–M4 mix + ledger balances | 120 s |
| `GET /dashboard/vendors` | Zone F — scorecard, `?limit=10&sortBy=score:desc` | 5 min |
| `GET /dashboard/alerts` | Zone 0 — alert list | 120 s |
| `GET /dashboard/exceptions?type=<tab>&page=&limit=` | Zone K — one tab at a time | 120 s |
| `GET /dashboard/mix` | Zone J — brand/article treemap | 5 min |
| `GET /dashboard/reconciliation` | Zone L | 5 min |
| `GET /dashboard/export?format=xlsx\|pdf` | Full snapshot export | no cache |

**Shared query params** on every endpoint: `from`, `to`, `vendor[]`, `brand[]`, `product`, `floor[]`, `status[]`, `compare`.

**Shared response envelope:**

```jsonc
{
  "meta": {
    "generatedAt": "2026-08-22T09:02:11.481Z",
    "cached": true,
    "cacheAgeMs": 12400,
    "range": { "from": "2026-07-23", "to": "2026-08-22" },
    "compareRange": { "from": "2026-06-23", "to": "2026-07-22" },
    "asOf": "2026-08-22T09:02:11.481Z",   // for stock metrics
    "durationMs": 18
  },
  "data": { /* section payload */ },
  "warnings": [ "3 flows have no linked vendorPurchaseOrder" ]
}
```

Every numeric KPI is returned as:
```jsonc
{ "value": 184320, "previous": 161200, "deltaPct": 14.3, "unit": "units", "kind": "flow" }
```
`kind` is `"flow"` or `"stock"` so the UI knows whether to apply the date‑range label or the "as of" label — this is what enforces §9.2 in code rather than in a comment.

---

## 12. New data models (rollups)

### 12.1 `vendor_dashboard_daily_snapshots`

One document per `(snapshotDate, vendor)`. Written by cron; ~`activeVendors` docs/day (tens, not thousands).

```js
{
  snapshotDate: '2026-08-21',           // YYYY-MM-DD, Asia/Kolkata
  vendor: ObjectId,
  vendorCode: 'VND001',

  po:      { raised: 4, raisedValue: 812000, open: 11, openValue: 2140000,
             receivedOnTime: 3, receivedLate: 1, avgLeadTimeDays: 9.4 },
  units:   { ordered: 12000, received: 11400, dispatched: 9800, returned: 240 },
  quality: { scReceived: 11400, scM1: 10800, scM2: 380, scM3: 140, scVm4: 80,
             fcReceived: 10100, fcM1: 9700, fcM2: 220, fcM3: 110, fcM4: 70 },
  grn:     { count: 3, expected: 11400, verified: 11380, variance: -20 },
  ledger:  { m2Open: 410, m2Resolved: 120, m3Outward: 95, m4Outward: 60 },
  wipClosing: 1840,                      // point-in-time, ONLY obtainable via snapshot
  createdAt, updatedAt
}
```
Index: `{ snapshotDate: -1, vendor: 1 }` unique.

### 12.2 `vendor_dashboard_floor_snapshots`

One document per `(snapshotDate, floorKey)` — 5 docs/day.

```js
{
  snapshotDate: '2026-08-21',
  floorKey: 'branding',
  received: 4200, completed: 3900, transferred: 3850,
  remaining: 610, repairReceived: 40,
  inTransitInbound: 320,                 // from ContainersMaster
  flowCount: 84,
  oldestItemAgeHours: 96,
  createdAt, updatedAt
}
```

### 12.3 Cron job

`AddOn_backend/src/cron/vendorDailySnapshot.cron.js` — clone the structure of `yarnDailySnapshot.cron.js`:

- Schedule: `15 0 * * *` in `Asia/Kolkata` (after the day closes, before anyone logs in).
- Idempotent upsert keyed on `snapshotDate` → safe to re‑run.
- Accepts `{ snapshotDate }` for manual backfill, with the **same honest caveat the yarn job documents**: a backfill records *current* values under a past label; it is an ops repair, not forensic history.
- Emits a `logger.info` line with row count + duration.
- **Backfill script** for go‑live: reconstruct the last 90 days of *flow* metrics (dispatched, received, GRN) from timestamps. WIP/`wipClosing` **cannot** be backfilled — leave it `null` for historical dates and have the chart render a dashed "no data" segment rather than a misleading zero.

### 12.4 Optional: `vendor_dashboard_cache`

If PM2 runs >2 workers (see §10.5 Option B):
```js
{ key: '<sha1>', section: 'summary', payload: {…}, expiresAt: Date }
// TTL index: { expiresAt: 1 }, expireAfterSeconds: 0
```

---

## 13. Frontend architecture & component tree

```
app/vendor-po/
├── page.tsx                          ← becomes the dashboard (server shell)
├── dashboard/
│   ├── VendorDashboardClient.tsx     ← "use client", orchestrates filters + fetch waves
│   ├── types.ts                      ← mirrors the API envelope exactly
│   ├── services/
│   │   └── vendorDashboardService.ts ← one fn per endpoint, AbortController-aware
│   ├── hooks/
│   │   ├── useDashboardFilters.ts    ← URL <-> state sync, 350 ms debounce
│   │   ├── useDashboardSection.ts    ← generic fetch + cache + abort + retry
│   │   └── useVisibleOnce.ts         ← IntersectionObserver mount gate
│   ├── components/
│   │   ├── DashboardHeader.tsx
│   │   ├── AlertRibbon.tsx           ← Zone 0
│   │   ├── KpiStrip.tsx / KpiCard.tsx← Zone A
│   │   ├── PipelineWaterfall.tsx     ← Zone B
│   │   ├── FloorHeatstrip.tsx        ← Zone C  (CSS grid, no chart)
│   │   ├── ThroughputTrend.tsx       ← Zone D
│   │   ├── QualityMix.tsx            ← Zone E
│   │   ├── VendorScorecard.tsx       ← Zone F
│   │   ├── PoStatusFunnel.tsx        ← Zone G
│   │   ├── AgingBuckets.tsx          ← Zone H
│   │   ├── ReturnsPanel.tsx          ← Zone I
│   │   ├── ProductMix.tsx            ← Zone J
│   │   ├── ExceptionWorklist.tsx     ← Zone K
│   │   ├── ReconciliationLedger.tsx  ← Zone L
│   │   └── skeletons/                ← one fixed-height skeleton per zone
│   └── utils/
│       ├── formatters.ts             ← ONE shared Intl.NumberFormat instance
│       ├── deepLinks.ts              ← builds the drill-down URLs
│       └── alertConfig.ts            ← all thresholds in one place
└── (existing operational pages unchanged, + URL filter param support added)
```

**Loading waves:**
```
Wave 1 (immediate, blocking paint):  /summary  +  /alerts
Wave 2 (after wave 1 resolves):      /trends, /quality, /vendors
Wave 3 (IntersectionObserver):       /mix, /reconciliation
Wave 4 (user interaction only):      /exceptions?type=…
```

**Reuse, don't rebuild:** `SafeChart`, `Seo`, `HelpIcon`, `CRM` classes from `vendor-list/crmUiClasses.ts`, and the existing `useNavigation()` permission hook.

---

## 14. Responsive layout spec

Tailwind 12‑column grid, matching the existing `grid grid-cols-12 gap-6` convention used across the app.

| Breakpoint | Width | KPI strip | Charts | Tables |
|-----------|-------|-----------|--------|--------|
| `< 640` (mobile) | 1 col | 1 card/row, horizontal snap‑scroll carousel | full width, `height: 220` | card list, not a table |
| `640–1024` (tablet) | 6 col | 2 cards/row | 1 chart/row, `height: 260` | horizontal scroll with sticky first column |
| `1024–1440` (laptop) | 12 col | 4 cards/row | 2 charts/row, `height: 300` | full table |
| `> 1440` (desktop/TV) | 12 col, `max-w-[1800px]` | 4 cards/row | 2–3 charts/row, `height: 340` | full table |

**Extras:**
- **TV / war‑room mode** (`?tv=1`): hides nav + filters, 90 s auto‑rotate through zones, larger type. Factory floor displays are a real use case here.
- **Print / PDF stylesheet**: charts render as static, tables break cleanly across pages, alert ribbon becomes a summary block on page 1.
- **Dark mode**: the app ships a Tailwind theme already — define chart palettes as CSS variables, not hardcoded hex, so Apex picks up the theme.

---

## 15. RBAC & data masking

Add a new sub‑permission key `'Dashboard'` under `'Vendor PO'` in `shared/contextapi/navigationContext.tsx` (the interface at line ~96 and `defaultPermissions` at ~303), plus a sidebar entry in `shared/layout-components/sidebar/nav.tsx` as the **first child** of the Vendor PO group.

**Financial masking — this is not optional.** `vendorPurchaseOrderRoleAccess.js` already establishes that the `user` role gets `rate: 0` and `gstRate: 0` on PO line items. The dashboard must honour the same rule:

| Role | Sees |
|------|------|
| `super_admin`, `admin` | Everything |
| `accounts` | Everything, but read‑only; cannot create POs |
| `user` | **All operational + quality + WIP metrics; all ₹ values hidden** (Zone A cards A1, A8, Zone F "PO Value", Zone I leakage value) |

Masking must be applied **server‑side** in the dashboard controller — never rely on the client hiding a value it already received.

---

## 16. Data‑quality gaps found during analysis

Flagging these now so the dashboard doesn't quietly present wrong numbers. Each needs a decision before the corresponding KPI ships.

| # | Gap | Effect on dashboard | Suggested handling |
|---|-----|--------------------|--------------------|
| 1 | **No invoice / payment model exists.** `creditDays` is on the PO, but there is no vendor invoice or payment collection anywhere in the backend. | Payables aging, "amount due this week", DPO — **cannot be built** | Drop these KPIs from v1. Show PO value only. Raise a separate scoping ticket if the CEO wants payables. |
| 2 | `VendorProductionFlow.startedAt` is optional and may be unset on older rows | Cycle‑time average skews | Fall back to `createdAt`; show `n = X of Y flows` under the KPI so the sample size is visible |
| 3 | **Per‑floor dwell time is not stored.** Derivable only from `FQ.<floor>.receivedData[].receivedTimestamp`, which is an array and absent on legacy rows | Floor‑level TAT is approximate on historical data | Use `min(receivedTimestamp)` where present; label the metric "approx." until the snapshot has 30 days of clean data |
| 4 | `reBoarding` is skipped for Heat Transfer, traversed for Embroidery | A naïve `Σ across all 5 floors` double‑counts nothing, but *averaging* floor counts is meaningless | Always segment cycle time by `brandingType` |
| 5 | **Container in‑transit qty is invisible on every existing screen** | If the dashboard omits it too, Zone L's "Unaccounted" will show a false leak equal to all in‑transit stock | **Must** include `ContainersMaster` in the WIP calculation — this is arguably the single highest‑value new number on the page |
| 6 | `activeFloor` on containers is a **free‑text label** (`"Branding"`, `"Final Checking"`), not the `floorKey` enum | A label typo silently zeroes the in‑transit KPI | Build an explicit `floorKey → label` map with a unit test asserting every key resolves |
| 7 | GRN revisions: `status` can be `superseded`/`voided` | Summing all GRNs double‑counts revised ones | **Always** filter `status: 'active'` |
| 8 | `VendorPoVendorReturn` idempotency key is partial‑unique; `pending_session` rows can linger | Return totals can overstate if pending sessions are counted | Count only `status: 'completed'` in totals; surface `pending_session` as an *exception*, never as a total |
| 9 | Legacy mock pages (`checking/data.ts`, `counting/data.ts`) | Risk of a developer wiring the dashboard to mock data | Delete in a cleanup ticket; add a lint rule banning imports from those paths |
| 10 | `VendorPurchaseOrder` uses `createDate`/`lastUpdateDate`, **not** `createdAt`/`updatedAt` | Every other model uses the standard names — a copy‑pasted date filter will silently match nothing | Centralise the field name in one constant per model |
| 11 | Mongoose is **5.7.7** (old) | Some newer aggregation operators (`$setWindowFields`, `$dateTrunc`) may be unavailable depending on the **server** version | Verify server version with `db.version()` before using window functions; the `$facet` + `$group` plan above avoids them entirely |
| 12 | No `brand` field on `VendorProductionFlow` itself — brand lives inside `transferredData[]` / `receivedData[]` sub‑arrays | Brand filtering requires `$unwind`, which is expensive | Denormalise a `brands: [String]` array onto the flow document on write, **or** restrict brand filtering to the snapshot tier only |
| 13 | `VendorManagement` has no rating, category, tier, or capacity field | Vendor segmentation beyond the computed score isn't possible | Score is computed, not stored. If the business wants a manual tier, that's a schema addition. |

---

## 17. Phased delivery plan

| Phase | Scope | Rough effort | Ships value? |
|-------|-------|-------------|--------------|
| **0 — Foundation** | Add indexes (§10.4), add `Dashboard` permission + nav entry, create route/controller/service skeleton, define the API envelope + `types.ts` | 1–2 d | No, but unblocks everything |
| **1 — Live summary** | Pipelines 1–3, `/summary` + `/alerts`, Zones 0, A, B, C, G. In‑process cache. | 3–4 d | ✅ **Yes — this alone answers 6 of the 12 CEO questions** |
| **2 — Snapshots + trends** | Snapshot models, cron, 90‑day backfill script, `/trends`, Zones D + E1 | 2–3 d | ✅ Trend + "vs last month" |
| **3 — Scorecard + quality** | Pipelines 4–5, `/vendors` + `/quality`, Zones E2, F, H | 2–3 d | ✅ Vendor accountability |
| **4 — Exceptions + returns** | Pipeline 6, `/exceptions` + `/mix`, Zones I, J, K | 2–3 d | ✅ Daily action list |
| **5 — Reconciliation + polish** | Zone L, export (PDF/Excel), TV mode, print CSS, dark mode | 2 d | ✅ Trust + shareability |
| **6 — Hardening** | `explain()` audit on every pipeline, load test at 10× current data, Lighthouse pass, cache‑stampede guard | 1–2 d | Keeps it fast as data grows |

**Total: ~13–19 working days.** Phase 1 is independently shippable and should go to the CEO within the first week for feedback before phases 3–5 are built.

---

## 18. Open questions for the business

These change the design, so answer them before Phase 1 code:

1. **Composite vendor score weights** (§6 Zone F) — are 30/25/20/15/10 right, or does the business weight OTIF higher than quality?
2. **Fiscal year start** — April (Indian FY) or January? Drives the "FY" date preset.
3. **Currency display** — ₹ in lakhs/crores, or full rupees with thousand separators? Lakhs is far more readable on KPI cards.
4. **OTIF definition** — is a *partial* on‑time delivery counted as on‑time, late, or fractional?
5. **Alert thresholds** (§8) — the numbers proposed are placeholders based on typical apparel manufacturing. Ops must confirm.
6. **Does the CEO want payables?** If yes, an invoice/payment model must be scoped separately (gap #1).
7. **Refresh expectation** — is 60 s auto‑refresh right, or is a manual refresh button enough? Auto‑refresh has a real server cost at scale.
8. **Who else gets access?** If vendors themselves ever get a portal view, the scorecard needs a "vendor‑visible" subset defined now, not retrofitted.
9. **Retention** — how many days of daily snapshots do we keep? 730 days is ~1.5 MB; suggest keeping everything.
10. **Is the WHMS side in scope?** The dashboard currently ends at the STN. If the CEO wants "did the warehouse actually receive it", that's a cross‑module join and should be scoped as an extension.

---

## Appendix A — Master KPI list (quick reference)

| # | KPI | Zone | Kind | Source collection |
|---|-----|------|------|-------------------|
| 1 | Open PO value | A | stock | VPO |
| 2 | Undelivered units | A | stock | VPO |
| 3 | Units in pipeline (WIP) | A/C | stock | VPF + Containers |
| 4 | In‑transit in containers | A/C | stock | ContainersMaster |
| 5 | Dispatched units (period) | A/D | flow | STN |
| 6 | Received units (period) | B/D | flow | VPO |
| 7 | Defect rate % | A/E | flow | VPF |
| 8 | OTIF % | A/F | flow | VPO |
| 9 | Avg cycle time | A/C | flow | VPF |
| 10 | Return/leakage value | A/I | flow | Returns + M3/M4 |
| 11 | Active vendors | A | stock | VendorManagement |
| 12 | Pipeline waterfall (8 stages) | B | mixed | VPO + VPF + GRN + STN |
| 13 | Floor load × 8 columns × 5 floors | C | stock | VPF + Containers |
| 14 | Bottleneck floor + days of backlog | C | derived | VPF |
| 15 | Throughput trend (received vs dispatched) | D | flow | Snapshots |
| 16 | WIP trend | D | stock | Snapshots (required) |
| 17 | M1–M4 mix over time | E1 | flow | Snapshots |
| 18 | Open M2 count + qty | E2 | stock | vendor_m2_logs |
| 19 | M2 recovery rate | E2 | flow | vendor_m2_logs |
| 20 | Repair TAT | E2 | flow | vendor_m2_logs |
| 21 | M3/M4 on hand vs outward | E2/I | stock | VPF + logs |
| 22 | Vendor scorecard (11 columns) | F | mixed | multi |
| 23 | PO status funnel + avg days in status | G | mixed | VPO.statusLogs |
| 24 | Overdue PO aging buckets | H | stock | VPO |
| 25 | Idle WIP aging buckets | H | stock | VPF |
| 26 | Return sessions / boxes / units / challans | I | flow | Returns + Challans |
| 27 | Full‑VPO cancellations | I | flow | VendorPoVendorReturn |
| 28 | Brand treemap | J | flow | STN + VPF |
| 29 | Top articles + per‑article defect % | J | mixed | VPF |
| 30 | Heat Transfer vs Embroidery split + cycle time | J | mixed | VPF |
| 31 | Dead stock (no movement 30d) | J/K | stock | VPF |
| 32 | 7 exception worklists | K | stock | multi |
| 33 | Reconciliation identity + unaccounted % | L | stock | multi |
| 34 | GRN variance % + revision count | F/K | flow | VendorGrn |
| 35 | Unscanned boxes > 72 h | K | stock | VendorBox |

---

## Appendix B — Files that will be touched

**New (backend)**
```
src/routes/v1/vendorDashboard.route.js
src/controllers/vendorManagement/vendorDashboard.controller.js
src/services/vendorManagement/vendorDashboard.service.js
src/services/vendorManagement/vendorDashboardPipelines.js      // the 6 $facet pipelines
src/services/vendorManagement/vendorDashboardSnapshot.service.js
src/models/vendorManagement/vendorDashboardDailySnapshot.model.js
src/models/vendorManagement/vendorDashboardFloorSnapshot.model.js
src/cron/vendorDailySnapshot.cron.js
src/validations/vendorDashboard.validation.js
src/scripts/add-vendor-dashboard-indexes.js
src/scripts/backfill-vendor-dashboard-snapshots.js
```

**Modified (backend)**
```
src/routes/v1/vendorManagement.route.js     // mount /dashboard BEFORE /:vendorManagementId
src/index.js                                 // register the cron job
src/models/index.js                          // export the 2 new models
```

**New (frontend)** — the whole `app/vendor-po/dashboard/` tree from §13.

**Modified (frontend)**
```
app/vendor-po/page.tsx                                   // tile grid → dashboard
shared/layout-components/sidebar/nav.tsx                 // add "Dashboard" as first Vendor PO child
shared/contextapi/navigationContext.tsx                  // add 'Dashboard' permission key
app/vendor-po/{raise,receive,secondary-checking,branding,
               re-boarding,final-checking,dispatch,grn,
               m2-management,m3-management,m4-management}/page.tsx
                                                         // accept URL filter params for drill-down
```

---

*Document version 1.0 · 2026‑08‑22 · Analysis based on a full read of the vendor module: 19 frontend routes, 11 backend models, 20 backend services, 6 route files, and 5 existing API contract docs.*
