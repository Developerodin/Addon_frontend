# Yarn Module — CEO Command Dashboard
### End‑to‑end analysis, KPI specification, and high‑performance build plan

> **Target route:** `/yarn-management` (replaces the current 8‑tile grid with hardcoded zeros in `app/yarn-management/page.tsx`)
> **Status:** Planning / brainstorming document. No code written yet.
> **Audience:** CEO + COO + Yarn Purchase Head + Store Manager.
> **Core promise:** *One page tells the CEO how much yarn he owns, what it cost, where it physically is, how fast it's being consumed, and what is about to go wrong.*
> **Companion doc:** `app/vendor-po/docs/VENDOR_DASHBOARD_PLAN.md` — same architecture, same API envelope, same caching strategy. Read both before building either.

---

## Table of contents

1. [Why this dashboard exists](#1-why-this-dashboard-exists)
2. [What already exists (and what we reuse)](#2-what-already-exists-and-what-we-reuse)
3. [Complete yarn module map](#3-complete-yarn-module-map)
4. [End‑to‑end lifecycle of one kilogram](#4-end-to-end-lifecycle-of-one-kilogram)
5. [The 14 questions a CEO actually asks](#5-the-14-questions-a-ceo-actually-asks)
6. [Dashboard information architecture](#6-dashboard-information-architecture)
7. [Section‑by‑section KPI specification](#7-section-by-section-kpi-specification)
8. [Chart & visualisation catalogue](#8-chart--visualisation-catalogue)
9. [Exception / alert engine](#9-exception--alert-engine)
10. [Global filters, time model and drill‑down contract](#10-global-filters-time-model-and-drill-down-contract)
11. [Performance architecture — how we make it fast](#11-performance-architecture--how-we-make-it-fast)
12. [Proposed API surface](#12-proposed-api-surface)
13. [New data models (rollups)](#13-new-data-models-rollups)
14. [Frontend architecture & component tree](#14-frontend-architecture--component-tree)
15. [Responsive layout spec](#15-responsive-layout-spec)
16. [RBAC & data masking](#16-rbac--data-masking)
17. [Data‑quality gaps found during analysis](#17-data-quality-gaps-found-during-analysis)
18. [Phased delivery plan](#18-phased-delivery-plan)
19. [Open questions for the business](#19-open-questions-for-the-business)

---

## 1. Why this dashboard exists

The yarn module is **the largest and most mature module in the system** — 46 backend services (~19,000 LOC), 21 models, 12 route files, ~30 frontend screens. It is also where the **working capital actually sits**: yarn is bought in kg, stored in 392 physical slots, issued to machines, partly returned, partly consumed, and partly sent back to suppliers.

But the numbers are scattered across three separate analytics surfaces:

| Existing surface | What it shows | What it misses |
|------------------|---------------|----------------|
| `/yarn-management/dashboard` (Live Inventory) | 8 stock cards + a live inventory table | No money, no trend, no consumption, no supplier view |
| `/yarn-management/dashboard/analytics` | PO analytics + yarn analytics, 2 tabs, date‑filtered | No stock position, no storage, no issue/return, no alerts |
| `/yarn-management/dashboard/report` | Yarn stock report with snapshot controls | Tabular only, one purpose |

And **`/yarn-management` itself — the URL the CEO lands on — shows four hardcoded zeros**:

```tsx
<div className="text-2xl font-bold text-blue-600">0</div>
<div className="text-sm text-gray-600">Total Yarn Types</div>
// …3 more, all hardcoded 0
```

That tile grid also links to `/yarn-management/inventory`, **a route that does not exist** — the directory is absent, so the tile 404s.

This dashboard replaces that landing page with a single, real, fast command view — and *links out to* the three existing analytics screens rather than duplicating them.

---

## 2. What already exists (and what we reuse)

This is a genuine head start over the vendor module. **Do not rebuild these — extend them.**

| Asset | Location | Reuse plan |
|-------|----------|-----------|
| **Daily closing snapshot** | `YarnDailyClosingSnapshot` model + `yarnDailySnapshot.cron.js` (runs in `Asia/Kolkata`, idempotent) | ✅ Already gives per‑yarn closing kg per day. **Extend** the doc with money + bucket split rather than creating a parallel collection. |
| **PO analytics service** | `yarnReportAnalytics.service.js` → `getPoAnalytics`, `getPoAnalyticsLines`, `getYarnClosingTrend`, `getTransactionAnalytics` | ✅ Reuse the *outputs*. ⚠️ **Rewrite the internals** — see §11.1, it loads every matching PO into memory and loops in JS. |
| **Inventory summary** | `getYarnInventoriesSummary` → LT / ST / unallocated / blocked kg + cone counts | ✅ Reuse directly for Zone A stock cards |
| **Snapshot bounds** | `yarnSnapshotBounds.service.js`, `GET /yarn-report/snapshot-bounds` | ✅ Tells the UI the valid trend date range |
| **Physical kg engine** | `physicalKgPerYarn.js` → `computePhysicalKgMap`, `getYarnIdsWithPhysicalStock` | ✅ Single source of truth for "what do we physically hold" |
| **Storage slot generator** | `storageSlot.model.js` — ST `B7-01` (50×4=200 slots), LT `B7-02..05` (4×12×4=192 slots) | ✅ Gives an exact denominator for **slot occupancy %** — a KPI no screen shows today |
| **Estimation summary** | `getYarnEstimationSummary` — issued vs returned per production order | ✅ Powers consumption / wastage KPIs |
| **Chart infrastructure** | `SafeChart.tsx` (ApexCharts, dynamic, `ssr:false`, error boundary) | ✅ Same as vendor plan — one chart library only |
| **Analytics UI patterns** | `YarnAnalyticsKpiSection`, `YarnPoAnalyticsCharts`, `PoDrillDownDrawer`, `SearchPickerDrawer` | ✅ Lift the card and drawer patterns wholesale |

---

## 3. Complete yarn module map

### 3.1 Frontend routes

| # | Route | Purpose | In sidebar? |
|---|-------|---------|-------------|
| 1 | `/yarn-management` | Tile grid, **4 hardcoded zeros** | ✅ parent |
| 2 | `/yarn-management/cataloguing` (+ `add`, `edit`) | Yarn catalog CRUD — type, subtype, count/size, blend, colour, pantone, HSN, GST, minQuantity | ✅ |
| 3 | `/yarn-management/yarn-master/{brand,yarn-type,count-size,color,blend}` | 5 master‑data screens | ✅ |
| 4 | `…/purchase-management/requisition-list` | Auto‑generated reorder requisitions, staging for draft POs | ✅ |
| 5 | `…/purchase-management/purchase` | All POs | ✅ |
| 6 | `…/purchase-management/draft-pos` | Draft POs, merge staged requisition lines | ✅ |
| 7 | `…/purchase-management/purchase-order-received` | PO receiving pipeline: in‑transit → lots → barcodes → box details → QC | ✅ |
| 8 | `…/purchase-management/yarn-qc` (+ `process`) | Box‑level QC approve/reject with media | ✅ |
| 9 | `…/purchase-management/yarn-storage` (+ `process`) | Slot allocation, box transfer LT↔ST, cone generation | ✅ |
| 10 | `…/purchase-management/yarn-to-vendor` | Send boxes to a processor, receive back (`YarnVendorShipment`) | ✅ |
| 11 | `…/purchase-management/po-return` | Vendor return session — scan cones/boxes | ✅ |
| 12 | `…/purchase-management/po-return-challan` | Return challan issue + print | ✅ |
| 13 | `/yarn-management/grn` (+ `[grnId]`) | GRN history + printable GRN with full tax breakdown | ✅ |
| 14 | `/yarn-management/yarn-issue` (+ `add`, `edit`) | Issue for orders — machine assignment driven | ✅ |
| 15 | `/yarn-management/yarn-issue/linking-sampling` (+ `linking`, `sampling`) | Floor issue batches | ✅ |
| 16 | `/yarn-management/yarn-return` | Cone return from production floors | ✅ |
| 17 | `/yarn-management/dashboard` (+ `full-inventory`) | Live inventory | ✅ |
| 18 | `/yarn-management/dashboard/report` | Yarn stock report | ✅ |
| 19 | `/yarn-management/dashboard/analytics?tab=purchase-orders\|yarn` | PO + yarn analytics | ✅ |
| — | `/yarn-management/inventory` | **404 — linked from tile grid, directory does not exist** | ❌ |

### 3.2 Backend models

| Model | Key analytics fields |
|-------|---------------------|
| `YarnCatalog` | `yarnName`, embedded `yarnType`/`yarnSubtype`/`countSize`/`blend`/`colorFamily`, `pantonShade`, `pantonName`, `season`, `gst`, `hsnCode`, **`minQuantity`** (reorder point), `linking`, `sampling`, `status` |
| `Supplier` | `brandName`, contact, `city`/`state`/`gstNo`, `yarnDetails[]` (which yarns they supply, with `tearweight`), `status` |
| `YarnPurchaseOrder` | `poNumber`, `supplier`, `poItems[{yarnCatalogId, sizeCount, shadeCode, rate, quantity, gstRate, estimatedDeliveryDate, sourceRequisitionId}]`, `subTotal/gst/total`, `creditDays`, `estimatedOrderDeliveryDate`, `goodsReceivedDate`, **10 statuses**, `statusLogs[]`, `receivedLotDetails[{lotNumber, numberOfCones, totalWeight, netWeight, numberOfBoxes, status}]`, `packListDetails[]`, `grnHistory[]`, `returnChallanHistory[]`, `linkedReplacementPoNumber`; timestamps as **`createDate`/`lastUpdateDate`** |
| `YarnRequisition` | `yarnCatalogId`, `minQty`, `availableQty`, `blockedQty`, `alertStatus(below_minimum\|overbooked)`, `poSent`, `draftForPo`, `preferredSupplierId`, `dismissed`, `linkedPurchaseOrderId`, `attachedDraftPoId`; timestamps as **`created`/`lastUpdated`** |
| `YarnBox` | `boxId`, `barcode`, `poNumber`, `lotNumber`, `yarnCatalogId`, `shadeCode`, `boxWeight`, **`initialBoxWeight`** (locked first weight), `grossWeight`, `tearweight`, `numberOfCones`, `storageLocation`, `storedStatus`, `qcData{status, date, mediaUrl}`, `coneData{conesIssued, numberOfCones}`, `returnedToVendorAt`, `atVendorAt`, `vendorShipmentId` |
| `YarnCone` | `barcode`, `boxId`, `poNumber`, `yarnCatalogId`, `coneWeight`, `tearWeight`, `issueStatus(issued\|not_issued\|used\|returned_to_vendor)`, `issueDate`, `issueWeight`, `returnStatus`, `returnDate`, `returnWeight`, `coneStorageId`, `orderId`, `articleId` |
| `YarnInventory` | `yarnCatalogId` (unique), `totalInventory`/`longTermInventory`/`shortTermInventory` buckets, `blockedNetWeight`, `inventoryStatus`, `overbooked` — **⚠️ see gap #1, this is NOT what the live screens read** |
| `YarnTransaction` | **9 types**: `yarn_issued`, `yarn_issued_linking`, `yarn_issued_sampling`, `yarn_blocked`, `yarn_stocked`, `internal_transfer`, `yarn_returned`, `yarn_sent_to_vendor`, `yarn_received_from_vendor`; weights, cone count, `orderId`/`articleId`/`machineId`, `fromStorageLocation`/`toStorageLocation`, `issueBatchId`, `issuedByEmail` — **the single richest analytics collection in the module** |
| `YarnGrn` | `grnNumber`, `revisionNo`, `status(active\|superseded\|voided)`, `lots[]`, `items[]`, `adjustments{discountPercent, freightAmount, freightGstPercent, roundOff}`, `totals{subTotal, discountAmount, taxableValue, freightAmount, freightGst, itemGst, sgst, cgst, igst, grandTotal, totalQty}`, `vendorInvoiceNo/Date` — **full landed cost** |
| `YarnPoVendorReturn` | `status(pending_session\|completed\|cancelled)`, `cancellationIntent(partial\|full_po)`, `lines[]` (cones), `boxLines[]`, `totalNetWeight`, `boxCount`, `coneCount` |
| `YarnPoReturnChallan` | `challanNumber`, consignor/supplier parties, `lines[{lineType: cone\|box}]`, `totals{boxCount, coneCount, totalNetWeight, totalGrossWeight}`, `transport{}` |
| `YarnVendorShipment` | `shipmentNumber`, `supplierId`, `status(open\|closed\|voided)`, `sentAt`, `boxLines[]`, `boxCount`, `totalNetWeight`, `receives[{receiveNumber, toStorageLocation, receivedAt}]` |
| `YarnFloorIssueBatch` | `issueBatchId`, `floor(linking\|sampling)`, `issuedByEmail` |
| `YarnDailyClosingSnapshot` | `snapshotDate` (YYYY‑MM‑DD), `yarnCatalogId`, `closingKg` — **already exists** |
| `StorageSlot` | `zoneCode(LT\|ST)`, `sectionCode`, `shelfNumber`, `floorNumber`, `label`, `barcode`, `isActive` — **392 slots total** |

### 3.3 Physical storage topology (exact, from `storageSlot.model.js`)

```
ST zone — B7-01            1 section × 50 shelves × 4 floors  = 200 slots
LT zone — B7-02..B7-05     4 sections × 12 shelves × 4 floors = 192 slots
                                                        TOTAL = 392 slots
Label format: <section>-S0001-F01   e.g. B7-03-S0007-F02
```

A box is "long term" when `storageLocation` matches `^(LT-|B7-02-|B7-03-|B7-04-|B7-05-)` (case‑insensitive, legacy `LT-*` prefix still honoured).

### 3.4 Backend API surface

```
/v1/yarn-management/yarn-catalogs        catalog CRUD
/v1/yarn-management/suppliers            supplier CRUD + yarnDetails
/v1/yarn-management/{colors,count-sizes,blends,yarn-types}   master data
/v1/yarn-management/yarn-requisitions    reorder queue, draft staging
/v1/yarn-management/yarn-purchase-orders PO CRUD
/v1/yarn-management/yarn-receiving       receiving pipeline (in-transit → lots → barcodes → QC)
/v1/yarn-management/yarn-boxes           box CRUD, QC, storage, transfer
/v1/yarn-management/yarn-cones           cone CRUD, floor-issue-batch, return, relocate
/v1/yarn-management/yarn-transactions    ledger
/v1/yarn-management/yarn-inventories     /  /summary  /yarn/:yarnId
/v1/yarn-management/yarn-grns            GRN list / revisions
/v1/yarn-management/po-return-challans   challans
/v1/yarn-management/yarn-vendor-jobs     send/receive boxes to processor
/v1/yarn-management/yarn-estimation      per order/article estimate vs actual
/v1/yarn-management/yarn-report          /  /po-analytics  /po-analytics/lines
                                         /yarn-closing-trend  /transaction-analytics
                                         /snapshot-bounds  /po-short-term/:po  /po-audit/:po
/v1/storage                              storage slots
```

---

## 4. End‑to‑end lifecycle of one kilogram

```
┌─ DEMAND SIGNAL ──────────────────────────────────────────────────────────┐
│ YarnCatalog.minQuantity  vs  live availableQty                           │
│   └─> YarnRequisition auto-created, alertStatus = below_minimum          │
│        │ (or overbooked when blockedQty > availableQty)                  │
│        └─> staged (draftForPo) → merged onto a Draft PO per supplier     │
└──────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─ PROCUREMENT ────────────────────────────────────────────────────────────┐
│ YarnPurchaseOrder                                                        │
│   draft → submitted_to_supplier → in_transit                             │
│   → goods_partially_received → goods_received → qc_pending               │
│   → po_accepted / po_accepted_partially / po_rejected                    │
│   → returned_to_vendor                                                   │
│   (poItems: yarnCatalogId, sizeCount, shadeCode, rate ₹/kg, qty kg, ETA) │
└──────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─ INWARD ─────────────────────────────────────────────────────────────────┐
│ packListDetails[] → receivedLotDetails[] (lot, cones, gross kg, net kg)  │
│   └─> YarnBox docs per box (barcode, boxWeight, initialBoxWeight locked) │
│   └─> lot status: lot_pending → lot_qc_pending → lot_accepted/rejected   │
│                                          → lot_returned_to_vendor        │
│   └─> YarnGrn issued: full tax stack (discount, freight, GST, roundoff)  │
└──────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─ QC ─────────────────────────────────────────────────────────────────────┐
│ Box-level qcData.status = qc_approved | qc_rejected  (+ media evidence)  │
│   rejected → PO Return path                                              │
└──────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─ STORAGE ────────────────────────────────────────────────────────────────┐
│ Unallocated (QC-approved, no slot)                                       │
│      │                                                                   │
│      ├──► LT zone (B7-02..05)  — whole boxes                            │
│      │       └─ post-save hook auto-writes a `yarn_stocked` transaction  │
│      │          ONLY when: LT slot + storedStatus + qc_approved + weight │
│      │                                                                   │
│      └──► ST zone (B7-01) — cones generated from a box                  │
│              (a box "opened" into cones moves LT kg → ST kg)             │
└──────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─ CONSUMPTION ────────────────────────────────────────────────────────────┐
│ yarn_blocked   → reserved against a production order (not yet physical)  │
│ yarn_issued    → cone leaves ST to a machine (issueStatus = issued)      │
│ yarn_issued_linking / yarn_issued_sampling → floor batches               │
│ internal_transfer → slot-to-slot move (no stock change, location change) │
│                                                                          │
│ yarn_returned  → cone comes back (returnWeight < issueWeight = consumed) │
│ issueStatus = used → fully consumed, never returns                       │
└──────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─ OUTWARD / REVERSE ──────────────────────────────────────────────────────┐
│ yarn_sent_to_vendor  → YarnVendorShipment (processor: dyeing etc.)       │
│ yarn_received_from_vendor → shipment.receives[] back into a slot         │
│                                                                          │
│ PO Return session → YarnPoReturnChallan → cones/boxes back to supplier   │
│   (partial, or full_po which sets PO → returned_to_vendor)               │
└──────────────────────────────────────────────────────────────────────────┘
```

**The kg identity that must always hold:**

```
Ordered kg
  = Received (net) kg  +  In-transit kg  +  Short-supplied kg

Received (net) kg
  = LT kg + ST kg + Unallocated kg          (on hand)
  + Blocked/Issued kg                        (out on machines)
  + At-vendor kg                             (open YarnVendorShipment)
  + Returned-to-supplier kg                  (challans)
  + Consumed kg                              (issued − returned, on used cones)
  + UNACCOUNTED                              ← must be ≈ 0
```

---

## 5. The 14 questions a CEO actually asks

| # | Question | Zone |
|---|----------|------|
| 1 | How many kg of yarn do I own right now, and what is it worth? | A |
| 2 | Where is it physically — LT, ST, unallocated, on a machine, at a processor? | A + C |
| 3 | How full is my warehouse? Am I about to run out of slots? | C |
| 4 | How much yarn am I consuming per day/week, and is that rising? | D |
| 5 | Which yarns are below reorder point right now? | E + K |
| 6 | Which yarns are dead stock — bought, never issued? | J |
| 7 | How much money is committed in open POs, and how much is overdue? | B + H |
| 8 | Which supplier is reliable and which is not? | F |
| 9 | What is my real landed cost per kg after freight, discount and GST? | B |
| 10 | How much yarn is issued but never returned — is there leakage? | G |
| 11 | What is my QC rejection rate by supplier and by yarn? | F + G |
| 12 | How long does yarn sit before it's used (ageing / obsolescence risk)? | I |
| 13 | Am I overbooked — promised more yarn to production than I hold? | E + K |
| 14 | What needs my decision **today**? | Zone 0 + K |

---

## 6. Dashboard information architecture

```
╔══════════════════════════════════════════════════════════════════════════╗
║  HEADER  Yarn Command Center                                             ║
║  [Date range ▾] [Yarn ▾] [Supplier ▾] [Zone ▾] [Refresh]  Live ●         ║
║  Last updated 14:32  ·  [Export PDF] [Export Excel]                      ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ⓘ ZONE 0 — ALERT RIBBON                                                 ║
║  🔴 9 yarns below reorder  🔴 3 overbooked  🟠 6 POs overdue  🟡 92% LT  ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ZONE A — STOCK & MONEY STRIP (8 cards)                                  ║
║  Total kg On Hand │ Stock Value ₹ │ LT kg │ ST kg                        ║
║  Unallocated kg   │ Blocked kg    │ Open PO Value │ Consumption/day      ║
╠═══════════════════════════════════╦══════════════════════════════════════╣
║  ZONE B — PROCUREMENT FUNNEL      ║  ZONE C — WAREHOUSE OCCUPANCY        ║
║  Ordered→InTransit→Received→QC    ║  392 slots · LT/ST heatmap · fill %  ║
║  →Stored, kg + ₹ landed cost      ║  Unallocated backlog                 ║
╠═══════════════════════════════════╬══════════════════════════════════════╣
║  ZONE D — FLOW TREND (30/90d)     ║  ZONE E — STOCK HEALTH               ║
║  Inward vs Issued vs Returned kg  ║  Below-reorder / overbooked / cover  ║
║  + closing-stock line (snapshot)  ║  days-of-cover distribution          ║
╠═══════════════════════════════════╩══════════════════════════════════════╣
║  ZONE F — SUPPLIER SCORECARD (top 10 + view all)                         ║
║  Supplier │POs│ ₹ │Ordered kg│OTIF│QC Reject%│Return%│LeadTime│Score│▲▼   ║
╠═══════════════════════════════════╦══════════════════════════════════════╣
║  ZONE G — CONSUMPTION & LEAKAGE   ║  ZONE H — PO AGEING & OUTSTANDING    ║
║  Issued/Returned/Consumed, per    ║  0-7/8-15/16-30/30+ days late        ║
║  order & floor, wastage %         ║  outstanding kg + ₹ per bucket       ║
╠═══════════════════════════════════╬══════════════════════════════════════╣
║  ZONE I — STOCK AGEING            ║  ZONE J — YARN MIX & DEAD STOCK      ║
║  0-30/31-60/61-90/90+ days in     ║  Top yarns by value; treemap by      ║
║  store, kg + ₹ at risk            ║  type/blend/colour; never-issued     ║
╠═══════════════════════════════════╩══════════════════════════════════════╣
║  ZONE K — EXCEPTION WORKLIST (tabbed, virtualised)                       ║
║  [Below Reorder][Overbooked][Overdue POs][QC Rejected][Unallocated >72h] ║
║  [At Vendor >30d][Pending Returns][Idle Cones][Weight Mismatch]          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ZONE L — RECONCILIATION LEDGER (collapsed)                              ║
║  Ordered = Received + InTransit + Short                                  ║
║  Received = OnHand + Blocked + AtVendor + Returned + Consumed + Unacc.   ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 7. Section‑by‑section KPI specification

> All weights in **kg**. `net = weight − tearweight` everywhere. Money in ₹.

### ZONE A — Stock & money strip (8 cards)

| # | KPI | Formula | Source |
|---|-----|---------|--------|
| A1 | **Total kg on hand** | `longTermKg + shortTermKg + unallocatedKg` | `getYarnInventoriesSummary().totals.grandNetKgAllBuckets` |
| A2 | **Stock value ₹** | `Σ per yarn (onHandKg × weightedAvgRate)` where `weightedAvgRate = Σ(poItem.rate × qty) / Σ qty` over `po_accepted*` POs for that `yarnCatalogId` | YarnPO + inventory |
| A3 | **LT kg** | `totals.longTermKg` — boxes in `B7-02..05` / `LT-*`, `storedStatus=true`, `qc_approved` | boxes |
| A4 | **ST kg** | `totals.shortTermKg` — cones with `coneStorageId` in ST slots, `issueStatus ∉ {issued, used, returned_to_vendor}` | cones |
| A5 | **Unallocated kg** | `totals.unallocatedKg` — QC‑approved boxes with **no** slot. *This is a queue, not a store — it should trend to zero.* | boxes |
| A6 | **Blocked / issued kg** | `totals.blockedKg` — cones with `issueStatus='issued'` (out on machines, not yet returned) | cones |
| A7 | **Open PO value ₹** | `Σ YarnPurchaseOrder.total WHERE currentStatus ∈ {submitted_to_supplier, in_transit, goods_partially_received}` | YarnPO |
| A8 | **Consumption / day** | `(Σ yarn_issued* netWeight − Σ yarn_returned netWeight) / days in range` | YarnTransaction |

Each card: value · delta vs previous period · sparkline from `YarnDailyClosingSnapshot` · click → drill.

### ZONE B — Procurement funnel (kg + ₹)

| Stage | Formula |
|-------|---------|
| Ordered | `Σ poItems.quantity` |
| In transit | `Σ poItems.quantity` for `currentStatus='in_transit'` minus received |
| Received (gross) | `Σ receivedLotDetails.totalWeight` |
| Received (net) | `Σ receivedLotDetails.netWeight` |
| GRN'd | `Σ YarnGrn.totals.totalQty` where `status='active'` |
| QC approved | `Σ net weight of boxes with qcData.status='qc_approved'` |
| Stored | `Σ net weight of boxes with storedStatus=true` |

**Landed cost panel** (this is the money KPI nobody has today):

```
basic value      = Σ YarnGrn.totals.subTotal
− discount       = Σ totals.discountAmount
= taxable        = Σ totals.taxableValue
+ freight        = Σ totals.freightAmount + totals.freightGst
+ GST            = Σ totals.itemGst  (split sgst/cgst/igst)
± round-off      = Σ totals.roundOff
= GRAND TOTAL    = Σ totals.grandTotal
─────────────────────────────────────────────
Landed ₹/kg      = grandTotal / Σ totals.totalQty
Freight as % of  = freight / taxable × 100
Effective disc % = discountAmount / subTotal × 100
```

Compare **landed ₹/kg vs PO rate ₹/kg** — the gap is the true cost of buying, and it is invisible on every current screen.

### ZONE C — Warehouse occupancy

| Metric | Formula |
|--------|---------|
| LT slots used | `distinct(YarnBox.storageLocation where LT pattern AND storedStatus=true)` |
| LT slots total | **192** (constant from `storageSlot.model.js`, cross‑check `StorageSlot.countDocuments({zoneCode:'LT', isActive:true})`) |
| LT occupancy % | used / total |
| ST slots used | `distinct(YarnCone.coneStorageId in ST barcodes)` |
| ST slots total | **200** |
| ST occupancy % | used / total |
| Boxes per LT slot | avg + max — reveals over‑stuffing |
| Unallocated backlog | count of QC‑approved boxes with no slot, + oldest age |
| Section heatmap | 5 sections × 12 (or 50) shelves × 4 floors, colour = fill |

**Why this matters:** at >85% occupancy the receiving team starts double‑stacking and slot discipline collapses. This is a leading indicator of stock‑location errors.

### ZONE D — Flow trend

Stacked/combo chart over 30 d (daily) / 90 d (weekly) / 12 m (monthly):

| Series | Source |
|--------|--------|
| Inward kg (bar, +) | `YarnTransaction type='yarn_stocked'` net weight, or `receivedLotDetails.netWeight` by `goodsReceivedDate` |
| Issued kg (bar, −) | `yarn_issued` + `yarn_issued_linking` + `yarn_issued_sampling` |
| Returned kg (bar, +) | `yarn_returned` |
| Sent to vendor (bar, −) | `yarn_sent_to_vendor` |
| Received from vendor (bar, +) | `yarn_received_from_vendor` |
| **Closing stock kg** (line) | `Σ YarnDailyClosingSnapshot.closingKg` per date — **already available, zero extra cost** |
| Net movement (line) | inward − outward |

### ZONE E — Stock health

| Metric | Formula |
|--------|---------|
| Yarns below reorder | `count(YarnRequisition where alertStatus='below_minimum' AND dismissed=false)` |
| Yarns overbooked | `count(alertStatus='overbooked' AND dismissed=false)` |
| Total shortfall kg | `Σ max(0, minQty − availableQty)` |
| Requisitions not actioned | `count(poSent=false AND draftForPo=false AND dismissed=false)` + oldest age |
| Requisitions staged | `count(draftForPo=true)` |
| **Days of cover** | per yarn: `onHandKg / avgDailyConsumptionKg(last 30d)`. Distribution histogram: `<7 / 7–15 / 15–30 / 30–60 / 60+ days` |
| Yarns at risk | count with cover `< 7 days` **and** no open PO |
| Stock‑out events | count of yarns that hit `onHandKg = 0` during the period (from snapshots) |

**Days of cover is the single best stock KPI for a CEO** — it converts "500 kg" (meaningless) into "4 days left" (actionable).

### ZONE F — Supplier scorecard

| Column | Formula |
|--------|---------|
| Supplier | `Supplier.brandName` + city |
| POs | `count` in period |
| Value ₹ | `Σ YarnPurchaseOrder.total` |
| Ordered kg | `Σ poItems.quantity` |
| Received kg | `Σ receivedLotDetails.netWeight` |
| **Fulfilment %** | received / ordered × 100 |
| **OTIF %** | `count(actualReceipt ≤ estimatedOrderDeliveryDate) / count(received)`; `actualReceipt = goodsReceivedDate ?? max(statusLogs[goods_received*].updatedAt)` |
| **Avg lead time** | `avg(actualReceipt − createDate)` days |
| **Lead‑time variance** | stddev — consistency beats speed |
| **QC reject %** | `Σ net kg of boxes with qcData.status='qc_rejected' / Σ received net kg × 100` |
| **Lot reject %** | `count(lot_rejected + lot_returned_to_vendor) / count(all lots)` |
| **Return %** | `Σ YarnPoVendorReturn.totalNetWeight (completed) / Σ received net kg × 100` |
| **Weight variance %** | `(Σ receivedLotDetails.netWeight − Σ ordered qty) / ordered × 100` — catches short‑weighing |
| **Landed ₹/kg** | `Σ YarnGrn.totals.grandTotal / Σ totals.totalQty` for that supplier |
| **Composite score** | below |

**Composite supplier score (0–100), proposed weights — business must sign off:**

```
score = 30 × OTIF_norm
      + 25 × (1 − qcReject_norm)
      + 20 × (1 − weightVariance_norm)
      + 15 × fulfilment_norm
      + 10 × (1 − leadTimeVariance_norm)
```
Min‑max normalised across suppliers active in the period. Suppliers with `< 3 POs` marked **"insufficient data"** and excluded from ranking.

Bands: ≥80 **Preferred** · 60–79 **Watch** · <60 **Review**.

### ZONE G — Consumption & leakage

| Metric | Formula |
|--------|---------|
| Issued kg (period) | `Σ yarn_issued* transactionNetWeight` |
| Returned kg | `Σ yarn_returned transactionNetWeight` |
| **Consumed kg** | issued − returned |
| **Return rate %** | returned / issued × 100 |
| Issued by channel | orders vs `linking` vs `sampling` (from `transactionType` + `YarnFloorIssueBatch.floor`) |
| **Cones out, never returned** | `count(YarnCone where issueStatus='issued' AND issueDate < now − 30d)` + their kg |
| **Estimate vs actual** | per production order: estimated kg (`yarnEstimation`) vs `issued − returned`; **variance %** |
| Top 10 over‑consuming orders | ranked by variance kg |
| Wastage kg | `Σ (issueWeight − returnWeight)` on cones with `returnStatus='returned'`, minus legitimate consumption — *needs a business rule, see Q6* |
| At vendor kg | `Σ YarnVendorShipment.totalNetWeight where status='open'` |
| At vendor > 30 d | count + kg — processor holding our material too long |

### ZONE H — PO ageing & outstanding

| Metric | Formula |
|--------|---------|
| Outstanding kg | `Σ (poItems.quantity − received) for open POs` |
| Outstanding ₹ | `Σ outstanding kg × poItem.rate` |
| Overdue buckets | `now − estimatedOrderDeliveryDate` → `0–7 / 8–15 / 16–30 / 30+`, count + kg + ₹ |
| Avg days in each status | consecutive `statusLogs[].updatedAt` deltas across the 10 statuses |
| Stuck in `qc_pending` | count + oldest age — a very common real bottleneck |
| Draft POs ageing | `count(currentStatus='draft')` by age bucket |
| POs with replacement | `count(linkedReplacementPoNumber ≠ null)` — rework of a failed PO |

### ZONE I — Stock ageing

Per box, age = `now − (qcData.date ?? receivedDate ?? createdAt)`.

| Bucket | Shows |
|--------|-------|
| 0–30 d | kg + ₹ |
| 31–60 d | kg + ₹ |
| 61–90 d | kg + ₹ |
| **90+ d** | kg + ₹ — **obsolescence provision candidate** |

Plus: **oldest 20 boxes** table (boxId, yarn, kg, days, slot) and **ageing by season** (`YarnCatalog.season`) — last season's yarn still in stock is a direct write‑down risk.

### ZONE J — Yarn mix & dead stock

- **Treemap** of on‑hand ₹ by `yarnType → blend → colorFamily`.
- **Top 20 yarns by value**, with days‑of‑cover badge.
- **Dead stock**: yarns with `onHandKg > 0` and **zero** `yarn_issued*` transactions in 90 days. Show kg + ₹ + oldest box age. This is the write‑off list.
- **Shade concentration**: top 10 `pantonShade` by kg — over‑concentration in one shade is a demand‑risk signal.
- **Catalog hygiene**: `count(YarnCatalog where status='active')` vs count with any stock or any PO in 12 months — dead catalog entries inflate every dropdown in the system.

### ZONE K — Exception worklist (tabbed, ≤50 rows/tab, virtualised)

| Tab | Query |
|-----|-------|
| **Below reorder** | `YarnRequisition alertStatus='below_minimum', dismissed=false, poSent=false` |
| **Overbooked** | `alertStatus='overbooked', dismissed=false` |
| **Overdue POs** | `estimatedOrderDeliveryDate < now AND currentStatus ∈ {submitted_to_supplier, in_transit, goods_partially_received}` |
| **QC rejected** | boxes `qcData.status='qc_rejected'` not yet returned |
| **Unallocated > 72 h** | QC‑approved boxes, no `storageLocation`, `qcData.date < now − 72h` |
| **At vendor > 30 d** | `YarnVendorShipment status='open' AND sentAt < now − 30d` |
| **Pending return sessions** | `YarnPoVendorReturn status='pending_session'` |
| **Idle issued cones** | `YarnCone issueStatus='issued' AND issueDate < now − 30d` |
| **Weight mismatch** | boxes where `abs(initialBoxWeight − (boxWeight + Σ cone weights)) > tolerance` — **`initialBoxWeight` exists exactly for this check and nothing uses it today** |
| **Stuck in qc_pending** | POs in `qc_pending` > 7 days |

### ZONE L — Reconciliation ledger

```
IDENTITY 1 — procurement
  Σ poItems.quantity
   = Σ receivedLotDetails.netWeight
   + in-transit kg
   + short-supplied kg (closed POs with received < ordered)

IDENTITY 2 — physical
  Σ receivedLotDetails.netWeight
   = LT kg + ST kg + unallocated kg      (on hand)
   + blocked/issued kg                    (on machines)
   + at-vendor kg                         (open shipments)
   + Σ YarnPoReturnChallan.totals.totalNetWeight
   + consumed kg                          (issued − returned on used cones)
   + UNACCOUNTED   ← target ≈ 0
```

Show **Unaccounted** as kg, as % of received, and a red/green chip. Threshold >0.5% → investigation. This one row is what makes the CEO trust the other 40 numbers.

---

## 8. Chart & visualisation catalogue

Library: **ApexCharts via `react-apexcharts`** (`^3.49.1`), wrapped in the existing `shared/components/SafeChart.tsx`. **No second chart library.**

| Zone | Chart | Apex type | Note |
|------|-------|-----------|------|
| A | Sparkline ×8 | `line` | `sparkline.enabled`, 12 pts, fed from `YarnDailyClosingSnapshot` |
| B | Funnel | `bar` horizontal | kg and ₹ toggle |
| B | Landed cost waterfall | `bar` stacked | transparent base series (Apex has no native waterfall) |
| C | Occupancy heatmap | **CSS grid, no chart** | 392 cells — a chart here would be slower and uglier than divs |
| C | Fill gauge ×2 | `radialBar` | LT and ST |
| D | Combo | `line` mixed | 5 bar series + 1 closing‑stock line, dual axis |
| E | Histogram | `bar` | days‑of‑cover buckets |
| F | Table | none | sortable + inline mini‑bars |
| G | Grouped bars + donut | `bar`, `donut` | issue channels |
| H | Grouped bars | `bar` | ageing buckets, kg + ₹ |
| I | Stacked bars | `bar` | ageing by bucket, coloured by zone |
| J | Treemap | `treemap` | native support |
| K/L | Tables | none | virtualised |

**Hard performance rules (identical to the vendor plan):** `animations.enabled = false`; `redrawOnParentResize = false` with a 250 ms debounced manual resize; **max 60 points per series** (server pre‑buckets); every chart `next/dynamic({ssr:false})` behind a fixed‑height skeleton; below‑the‑fold charts mount on `IntersectionObserver`.

---

## 9. Exception / alert engine

Same typed shape as the vendor dashboard so the ribbon component is shared:

```ts
type YarnAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'stock' | 'procurement' | 'quality' | 'storage' | 'consumption' | 'reconciliation';
  title: string;         // "9 yarns below reorder point"
  value: number;
  valueLabel: string;    // "1,240 kg short"
  href: string;
  since?: string;
};
```

| Rule | Severity | Threshold (proposed, configurable) |
|------|----------|-----------------------------------|
| Yarn below reorder, **no open PO** | critical | any |
| Yarn below reorder, PO placed | warning | any |
| Overbooked (`blockedQty > availableQty`) | critical | any |
| Days of cover | critical | `< 7 days` |
| Days of cover | warning | `7–15 days` |
| LT or ST occupancy | critical | `> 90%` |
| LT or ST occupancy | warning | `> 80%` |
| Unallocated backlog | warning | `> 20 boxes` **or** any box `> 72 h` |
| PO overdue | critical | `> 15 days` |
| QC reject rate (period) | critical | `> 1.5 ×` trailing 90‑day average |
| At‑vendor shipment open | warning | `> 30 days` |
| Issued cone not returned | warning | `> 30 days` |
| Stock ageing | warning | any box `> 90 days` |
| Dead stock value | info | `> ₹X` (business to set) |
| Unaccounted kg | critical | `> 0.5%` of received |
| Supplier concentration | info | one supplier `> 40%` of open PO value |

All thresholds live in **one config module**, never inline.

---

## 10. Global filters, time model and drill‑down contract

### 10.1 Filters (URL‑synced)

| Filter | Values | Default |
|--------|--------|---------|
| Date range | Today · 7d · 30d · 90d · FY · Custom | 30d |
| Compare to | Previous period · Same period last year · None | Previous period |
| Date mode | `created` \| `received` (mirrors the existing analytics screen) | received |
| Yarn | searchable multi‑select (catalog) | All |
| Yarn type / blend / colour | multi‑select | All |
| Supplier | multi‑select | All |
| Zone | LT · ST · Unallocated · At vendor | All |
| Include drafts | toggle (mirrors existing PO analytics) | off |

URL: `/yarn-management?from=…&to=…&supplier=…&yarn=…&zone=LT&mode=received&cmp=prev`

### 10.2 The time‑model trap

Exactly as in the vendor dashboard, and even more important here because yarn people think in "closing stock":

| Kind | Under a date filter | Examples |
|------|--------------------|----------|
| **Flow** | Filtered by range | Issued kg, received kg, POs raised, GRN value, consumption/day |
| **Stock** | **Not** filtered — "as of now" | On‑hand kg, LT/ST split, occupancy %, below‑reorder count, open PO value |

Every stock card carries an explicit `as of <time>` label and a live dot; the date picker visually does not apply to it. The API enforces this by returning `kind: "flow" | "stock"` on every metric.

**One exception worth building:** because `YarnDailyClosingSnapshot` exists, the dashboard *can* honestly answer "what was on hand on 31 July". Offer that as an explicit **"As‑of date"** control in Zone A rather than overloading the range picker.

### 10.3 Drill‑down contract

No click creates a second dashboard. Each click either opens a lazy drawer with row‑level evidence, or navigates to the existing screen with params pre‑applied. The analytics page already reads `?yarn_catalog_id=` / `?yarn_id=` / `?tab=`, and the live‑inventory page already reads `?yarn_name=` — extend the same pattern to `?supplier=`, `?po=`, `?zone=`, `?alert=`.

---

## 11. Performance architecture — how we make it fast

### 11.1 What's slow today (from the code, measured not guessed)

| # | Anti‑pattern | Where | Impact |
|---|-------------|-------|--------|
| 1 | **`YarnCatalog` post‑find hook does up to 5 `findById` calls *per document*, sequentially, inside a `for` loop** — for `yarnType`, `countSize`, `blend`, `colorFamily`, `yarnSubtype` | `yarnCatalog.model.js` post `['find','findOne','findOneAndUpdate']` | Classic N+1 → N×5. Loading 300 catalog rows can fire **1,500 sequential queries**. This fires on *every* catalog read anywhere in the app. |
| 2 | `getPoAnalytics` loads **every matching PO** with `.find().lean()` and aggregates in a JS `for` loop | `yarnReportAnalytics.service.js:248` | Full scan + full deserialisation into Node heap; grows linearly forever |
| 3 | Live inventory **recomputes from `YarnBox` + `YarnCone` on every request** via `aggregateInventoryFromStorage`; the `YarnInventory` collection is not read | `yarnInventory.service.js:366` | 4+ aggregations over the two largest collections per page load |
| 4 | That aggregation groups by **`yarnName` string**, then does a case‑insensitive lookup by **iterating the whole map per catalog row** | `yarnInventory.service.js:594` | O(n²) in JS |
| 5 | `queryYarnInventories` allows `limit` up to **100000** | `yarnInventory.service.js:741` | One bad call can serialise the entire inventory |
| 6 | `computePhysicalKgMap` does `YarnBox.find({boxWeight:{$gt:0}})` — **all boxes, no pagination** | `physicalKgPerYarn.js` | Fine nightly in cron, fatal on a page load |
| 7 | No caching layer anywhere (`compression` + `express-rate-limit` only, **no Redis**) | backend | Every refresh re‑scans |

If the dashboard naively calls the existing services, it will be the slowest page in the app. It must not.

### 11.2 The three‑tier read model

```
┌─ TIER 1 — SNAPSHOTS (cron, nightly) ────────────────────────────────────┐
│ ✅ yarn_daily_closing_snapshots        ALREADY EXISTS (closingKg/yarn)   │
│ 🆕 yarn_dashboard_daily_snapshots      one doc per (date) + per (date,   │
│                                        supplier) — money, flows, QC     │
│ 🆕 yarn_dashboard_yarn_snapshots       one doc per (date, yarnCatalogId) │
│                                        — bucket split, value, cover days │
│ → Serves EVERY trend and every "vs last period" delta.                  │
│ → Query cost: range scan over small docs. Sub-10 ms.                    │
└─────────────────────────────────────────────────────────────────────────┘
┌─ TIER 2 — LIVE $facet (cached 60 s) ────────────────────────────────────┐
│ 7 pipelines under Promise.all, each one collection, each $facet.        │
│ → Serves on-hand kg, occupancy, reorder alerts, exception counts.       │
└─────────────────────────────────────────────────────────────────────────┘
┌─ TIER 3 — ON-DEMAND ────────────────────────────────────────────────────┐
│ Exception rows, supplier "view all", drill drawers. Paginated, ≤50.     │
└─────────────────────────────────────────────────────────────────────────┘
```

**The seven live pipelines:**

| # | Collection | Serves |
|---|-----------|--------|
| 1 | `YarnBox` | LT kg, unallocated kg, QC split, box ageing, LT slot occupancy, at‑vendor kg, weight‑mismatch count |
| 2 | `YarnCone` | ST kg, blocked kg, ST slot occupancy, idle issued cones |
| 3 | `YarnPurchaseOrder` | Open value, status funnel, OTIF, ageing, outstanding kg, ordered/received, supplier rollup |
| 4 | `YarnTransaction` | Issued / returned / stocked / transfer flows by type, by channel, by day |
| 5 | `YarnRequisition` | Below‑reorder, overbooked, unactioned queue |
| 6 | `YarnGrn` | Landed cost stack, GST split, freight %, revision count |
| 7 | `YarnVendorShipment` + `YarnPoVendorReturn` + `YarnPoReturnChallan` | At‑vendor, returns, leakage |

**Rules:**
- `$match` first, must hit an index.
- **`.lean()` is not enough — bypass the `YarnCatalog` post‑find hook entirely.** Use `YarnCatalog.collection.find()` (native driver) or an `aggregate()` pipeline for any dashboard catalog read. Mongoose middleware does not run on `aggregate`, which sidesteps gap #1 completely. *This single change is probably the largest speedup available in the whole module.*
- Group by **`yarnCatalogId`**, never by `yarnName` (gap #4). Resolve names in one `$in` query afterwards and join in JS with a `Map`.
- `$project` before `$facet` to drop `qcData.mediaUrl`, `statusLogs[]`, `revisionDiff[]`, `boxLines[]`, `lines[]` — these arrays dominate document size.
- Never `$lookup` inside `$facet`.
- Hard‑cap every list endpoint at `limit ≤ 100`.

### 11.3 Indexes required (migration script)

```js
// YarnBox  (existing: {storageLocation,storedStatus}, {yarnName,storageLocation}, {boxId},
//           {poNumber,returnedToVendorAt}, {atVendorAt}, {vendorShipmentId},
//           {vendorSupplierId,atVendorAt})
{ yarnCatalogId: 1, storedStatus: 1, 'qcData.status': 1 }
{ 'qcData.status': 1, 'qcData.date': -1 }
{ storedStatus: 1, storageLocation: 1, boxWeight: 1 }
{ createdAt: -1 }
{ receivedDate: -1 }

// YarnCone (existing: {coneStorageId,issueStatus}, {yarnName,coneStorageId}, {boxId,coneStorageId},
//           {yarnCatalogId,coneStorageId,issueStatus}, {poNumber,returnedToVendorAt})
{ issueStatus: 1, issueDate: -1 }
{ yarnCatalogId: 1, issueStatus: 1 }
{ orderId: 1, issueStatus: 1 }     // sparse

// YarnPurchaseOrder — currently NO analytics indexes
{ currentStatus: 1, createDate: -1 }
{ supplier: 1, createDate: -1 }
{ estimatedOrderDeliveryDate: 1, currentStatus: 1 }
{ goodsReceivedDate: -1 }
{ 'poItems.yarnCatalogId': 1 }

// YarnTransaction (existing: {transactionType,transactionDate},
//                  {issueBatchId,yarnCatalogId,transactionType},
//                  {issueBatchId,transactionDate}, {orderId,transactionDate})
{ yarnCatalogId: 1, transactionDate: -1 }
{ transactionDate: -1 }

// YarnRequisition — already well indexed; add:
{ alertStatus: 1, dismissed: 1, lastUpdated: -1 }

// YarnGrn — already well indexed ({grnDate:-1}, {status:1}, {purchaseOrder,status}) ✅
{ status: 1, grnDate: -1 }         // compound, replaces two single-field scans

// YarnVendorShipment — already good ({status,sentAt}, {supplierId,status,sentAt}) ✅

// YarnCatalog
{ status: 1 }
{ 'yarnType.name': 1 }
{ 'blend.name': 1 }

// StorageSlot
{ zoneCode: 1, isActive: 1 }
{ barcode: 1 }                     // likely exists via unique

// New snapshot collections
{ snapshotDate: -1 } unique                          // global daily
{ snapshotDate: -1, supplier: 1 } unique             // per supplier
{ snapshotDate: -1, yarnCatalogId: 1 } unique        // per yarn
```

`explain('executionStats')` on every dashboard pipeline before merge. **A `COLLSCAN` on a dashboard query is a blocker.**

### 11.4 Caching (no Redis)

Identical strategy to the vendor plan, so the implementation is shared:

- **In‑process TTL Map** keyed by a hash of the normalised filter object.
  TTLs: summary 60 s · trends 15 min · exceptions 120 s · supplier scorecard 5 min · occupancy 120 s.
- HTTP validators: `ETag` + `Cache-Control: private, max-age=30, stale-while-revalidate=120`. With `compression()` already on, a 60 KB payload ships as ~8 KB.
- **Caveat stated plainly:** PM2 clustering (`ecosystem.config.json` is present) makes an in‑process cache per‑worker — N workers, N cold misses. With >2 workers, prefer a **`yarn_dashboard_cache` collection with a TTL index** instead: shared, survives restarts, no new infra, ~5 ms.
- **Cache‑stampede guard:** single‑flight promise map so 10 concurrent misses trigger one computation, not ten.

### 11.5 Frontend performance

| Technique | Detail |
|-----------|--------|
| **4 loading waves** | W1 `/summary`+`/alerts` (paint <500 ms) → W2 `/trends`,`/stock-health`,`/suppliers` → W3 on‑scroll `/mix`,`/reconciliation` → W4 on‑click `/exceptions` |
| Fixed‑height skeletons | zero CLS |
| `IntersectionObserver` mount | charts below the fold don't execute |
| `next/dynamic({ssr:false})` | via existing `SafeChart` |
| Virtualised tables | ≤50 rows rendered |
| `AbortController` everywhere | filter changes must cancel in‑flight or a stale response wins the race |
| 350 ms filter debounce | the existing analytics page already uses `FILTER_DEBOUNCE_MS = 380` — match it |
| One shared `Intl.NumberFormat` | module‑scoped; a per‑cell instance in a 500‑cell table is a real cost |
| No client aggregation | if the dashboard has a `.reduce()` over 500 rows, the API is wrong |
| Payload budget | summary ≤40 KB · trends ≤30 KB · exceptions ≤60 KB · **first paint <100 KB** |
| Polling | optional 60 s, **paused on `document.hidden`**. Not sockets. |

### 11.6 Performance budget (acceptance criteria)

| Metric | Target |
|--------|--------|
| First KPI painted | **< 800 ms** cached / < 1.5 s cold |
| Fully interactive | **< 2.5 s** |
| `/summary` server time, cache hit | < 20 ms |
| `/summary` server time, cache miss | < 500 ms |
| First‑paint JSON | < 100 KB |
| CLS | < 0.05 |
| Filter change → repaint | < 600 ms |

---

## 12. Proposed API surface

New router `AddOn_backend/src/routes/v1/yarn/yarnDashboard.route.js`, mounted at
**`/v1/yarn-management/dashboard`**.

| Endpoint | Returns | TTL |
|----------|---------|-----|
| `GET /dashboard/summary` | Zones A, B, C — stock, money, funnel, occupancy | 60 s |
| `GET /dashboard/trends` | Zone D — from snapshots | 15 min |
| `GET /dashboard/stock-health` | Zone E — reorder, overbooked, days‑of‑cover distribution | 120 s |
| `GET /dashboard/suppliers` | Zone F — scorecard, `?limit=10&sortBy=score:desc` | 5 min |
| `GET /dashboard/consumption` | Zone G — issue/return/consumed, estimate vs actual | 120 s |
| `GET /dashboard/ageing` | Zones H + I — PO ageing + stock ageing | 5 min |
| `GET /dashboard/mix` | Zone J — treemap, top yarns, dead stock | 5 min |
| `GET /dashboard/alerts` | Zone 0 | 120 s |
| `GET /dashboard/exceptions?type=&page=&limit=` | Zone K, one tab | 120 s |
| `GET /dashboard/reconciliation` | Zone L | 5 min |
| `GET /dashboard/export?format=xlsx\|pdf` | full snapshot | none |

**Shared query params:** `from`, `to`, `dateMode`, `yarn[]`, `yarnType[]`, `blend[]`, `supplier[]`, `zone[]`, `includeDraft`, `compare`, `asOf`.

**Shared envelope — identical to the vendor dashboard so the frontend hook is reused verbatim:**

```jsonc
{
  "meta": {
    "generatedAt": "2026-08-22T09:02:11.481Z",
    "cached": true, "cacheAgeMs": 12400,
    "range": { "from": "2026-07-23", "to": "2026-08-22" },
    "compareRange": { "from": "2026-06-23", "to": "2026-07-22" },
    "asOf": "2026-08-22T09:02:11.481Z",
    "durationMs": 18
  },
  "data": { /* section payload */ },
  "warnings": [ "14 boxes have no yarnCatalogId — matched by name" ]
}
```

Every metric:
```jsonc
{ "value": 18432.5, "previous": 16120.0, "deltaPct": 14.3, "unit": "kg", "kind": "stock" }
```

---

## 13. New data models (rollups)

### 13.1 Extend, don't duplicate

`YarnDailyClosingSnapshot` already stores `{snapshotDate, yarnCatalogId, closingKg}` and is written nightly. **Add two new collections beside it** rather than changing its shape (the report screen and `yarnSnapshotBounds.service.js` depend on it).

### 13.2 `yarn_dashboard_daily_snapshots` (one doc per day)

```js
{
  snapshotDate: '2026-08-21',
  stock: { totalKg, ltKg, stKg, unallocatedKg, blockedKg, atVendorKg, valueInr },
  storage: { ltSlotsUsed, ltSlotsTotal: 192, stSlotsUsed, stSlotsTotal: 200 },
  flows: { inwardKg, issuedKg, issuedLinkingKg, issuedSamplingKg,
           returnedKg, sentToVendorKg, receivedFromVendorKg, consumedKg },
  po:    { raised, raisedValue, open, openValue, receivedKg, orderedKg,
           overdueCount, overdueValue },
  grn:   { count, grandTotal, taxableValue, freight, itemGst, totalQty, landedRatePerKg },
  qc:    { approvedKg, rejectedKg, rejectRatePct },
  alerts:{ belowReorder, overbooked, deadStockValue, unaccountedKg },
  createdAt, updatedAt
}
```

### 13.3 `yarn_dashboard_yarn_snapshots` (one doc per day per yarn)

```js
{
  snapshotDate: '2026-08-21',
  yarnCatalogId: ObjectId,
  yarnName: 'Cotton 30s Combed',
  ltKg, stKg, unallocatedKg, blockedKg, onHandKg,
  valueInr, weightedAvgRate,
  issuedKg, returnedKg, inwardKg,
  avgDailyConsumption30d, daysOfCover,
  minQuantity, belowReorder: true,
  oldestBoxAgeDays: 47,
  createdAt
}
```

### 13.4 `yarn_dashboard_supplier_snapshots` (one doc per day per supplier)

```js
{
  snapshotDate: '2026-08-21', supplier: ObjectId, supplierName,
  poCount, poValue, orderedKg, receivedKg,
  onTimeCount, lateCount, avgLeadTimeDays, leadTimeStdDev,
  qcApprovedKg, qcRejectedKg,
  lotsAccepted, lotsRejected, lotsReturned,
  returnedKg, landedRatePerKg, score,
  createdAt
}
```

### 13.5 Cron

`AddOn_backend/src/cron/yarnDashboardSnapshot.cron.js` — a **sibling** of the existing `yarnDailySnapshot.cron.js`, ideally chained to run right after it (both need the same physical‑kg computation, so compute once and write both).

- Schedule `30 0 * * *` `Asia/Kolkata` (15 min after the existing closing‑stock job).
- Idempotent upsert on `snapshotDate`.
- Accepts `{ snapshotDate }` for backfill, with the **same honest caveat the existing yarn cron documents**: a backfill stamps *current* values under a past label — an ops repair, not forensic history.
- **Backfill script:** flow metrics (issued, returned, received, GRN value, POs) *are* reconstructable from `transactionDate` / `goodsReceivedDate` / `grnDate` for 12+ months. Stock buckets and occupancy are **not** — leave them `null` for historical dates and render a dashed "no data" segment rather than a misleading zero. Note `YarnDailyClosingSnapshot` may already cover part of the stock history; use `snapshot-bounds` to find how far back it goes and splice.

### 13.6 Optional `yarn_dashboard_cache`

```js
{ key: '<sha1>', section: 'summary', payload: {…}, expiresAt: Date }
// TTL index { expiresAt: 1 }, expireAfterSeconds: 0
```
Use when PM2 runs >2 workers.

---

## 14. Frontend architecture & component tree

```
app/yarn-management/
├── page.tsx                          ← becomes the dashboard shell
├── command/
│   ├── YarnCommandClient.tsx         ← "use client", filters + fetch waves
│   ├── types.ts                      ← mirrors the API envelope
│   ├── services/yarnDashboardService.ts
│   ├── hooks/
│   │   ├── useDashboardFilters.ts    ← URL sync, 350 ms debounce
│   │   ├── useDashboardSection.ts    ← fetch + cache + abort + retry (SHARED with vendor)
│   │   └── useVisibleOnce.ts
│   ├── components/
│   │   ├── DashboardHeader.tsx
│   │   ├── AlertRibbon.tsx           ← Zone 0   (shared with vendor)
│   │   ├── StockMoneyStrip.tsx       ← Zone A
│   │   ├── ProcurementFunnel.tsx     ← Zone B
│   │   ├── LandedCostWaterfall.tsx   ← Zone B
│   │   ├── WarehouseOccupancy.tsx    ← Zone C  (CSS grid heatmap + 2 gauges)
│   │   ├── FlowTrend.tsx             ← Zone D
│   │   ├── StockHealth.tsx           ← Zone E
│   │   ├── SupplierScorecard.tsx     ← Zone F
│   │   ├── ConsumptionPanel.tsx      ← Zone G
│   │   ├── PoAgeing.tsx              ← Zone H
│   │   ├── StockAgeing.tsx           ← Zone I
│   │   ├── YarnMix.tsx               ← Zone J
│   │   ├── ExceptionWorklist.tsx     ← Zone K  (shared shell with vendor)
│   │   ├── ReconciliationLedger.tsx  ← Zone L  (shared shell)
│   │   └── skeletons/
│   └── utils/{formatters,deepLinks,alertConfig}.ts
└── dashboard/ , analytics/ , report/   ← UNCHANGED; the command page links into them
```

**Shared with the vendor dashboard** (build once, in `shared/components/dashboard/`): `AlertRibbon`, `KpiCard`, `ExceptionWorklist` shell, `ReconciliationLedger` shell, `useDashboardSection`, `useDashboardFilters`, `formatters`, the skeleton set, and the API envelope types. Roughly **40% of the frontend work is common** to both modules — build the yarn one second and it costs far less than the first.

---

## 15. Responsive layout spec

Tailwind 12‑column, matching the app's `grid grid-cols-12 gap-6` convention.

| Breakpoint | KPI strip | Charts | Occupancy heatmap | Tables |
|-----------|-----------|--------|-------------------|--------|
| `<640` mobile | 1/row, snap carousel | full width `h=220` | collapse to 2 gauges + "view slots" link | card list |
| `640–1024` tablet | 2/row | 1/row `h=260` | 2 sections/row | h‑scroll, sticky first col |
| `1024–1440` laptop | 4/row | 2/row `h=300` | all 5 sections | full |
| `>1440` desktop | 4/row, `max-w-[1800px]` | 2–3/row `h=340` | all 5 + legend | full |

Extras: **TV/war‑room mode** (`?tv=1`) for the store office display; **print/PDF stylesheet**; **dark mode** via CSS‑variable chart palettes (never hardcoded hex).

---

## 16. RBAC & data masking

The permission tree already has `'Yarn Management' → 'Dashboard'` as a boolean (`navigationContext.tsx:52`). **Reuse that key** — no schema change needed. Add a sidebar entry as the first child of the Yarn Management group pointing at `/yarn-management`.

**Financial masking.** The yarn module has no equivalent of `vendorPurchaseOrderRoleAccess.js`, so there is currently no rate‑masking precedent here. Recommend matching the vendor rule for consistency:

| Role | Sees |
|------|------|
| `super_admin`, `admin` | Everything |
| `accounts` | Everything, read‑only |
| `user` | All kg / storage / consumption / QC metrics; **₹ values hidden** — A2 stock value, A7 open PO value, landed cost panel, Zone F value + landed ₹/kg, Zone I ₹ at risk, dead‑stock ₹ |

Applied **server‑side** in the dashboard controller. Never send a value the client is supposed to hide.

> This is a decision, not an existing rule — flag it to the business (Q8).

---

## 17. Data‑quality gaps found during analysis

Each one distorts a specific KPI. Decide before that KPI ships.

| # | Gap | Effect | Handling |
|---|-----|--------|----------|
| 1 | **`YarnInventory` collection is not the live source.** The dashboard/report screens recompute from `YarnBox` + `YarnCone` every request (`aggregateInventoryFromStorage`); `YarnInventory` is synced only by scripts (`sync-*.js` in the repo root) | Reading `YarnInventory` for the dashboard would show stale numbers that disagree with the live inventory screen | **Compute from boxes+cones** (same source as the live screen) so the two never disagree. Treat `YarnInventory` as legacy. Consider a separate ticket to either retire it or make it authoritative — having both is the root risk. |
| 2 | **`YarnCatalog` post‑find hook = N×5 sequential `findById`** | Any catalog read is pathologically slow | Dashboard must use `aggregate()` or the native `.collection` driver, which bypass Mongoose middleware. Separately worth fixing at source. |
| 3 | **Inventory aggregation groups by `yarnName` string, not `yarnCatalogId`** | Two catalog rows with the same trimmed name merge; a renamed yarn splits its own history | Group by `yarnCatalogId` in all new code. Emit a `warnings[]` entry counting boxes/cones with a null `yarnCatalogId` so the gap is visible, not hidden. |
| 4 | Case‑insensitive name lookup iterates the whole map per row → **O(n²)** | Slow at scale | Pre‑build a lowercase‑keyed `Map` once |
| 5 | **`YarnPurchaseOrder` uses `createDate`/`lastUpdateDate`; `YarnRequisition` uses `created`/`lastUpdated`** — neither uses the standard `createdAt`/`updatedAt` | A copy‑pasted date filter silently matches **nothing** and the KPI shows zero, not an error | One constant per model for the timestamp field name; assert in a unit test |
| 6 | **No `rate` on `YarnBox` or `YarnCone`** — physical stock carries no cost | Stock value must be *derived* via weighted‑average PO rate per yarn | State the method on the card tooltip. It is an estimate, not a ledger value — say so. |
| 7 | **`yarn_stocked` transaction only fires for LT boxes** (post‑save hook requires LT slot + `storedStatus` + `qc_approved` + weight). ST cone stocking writes no such row | "Inward kg" from transactions **undercounts**; from `receivedLotDetails` it doesn't | Use `receivedLotDetails.netWeight` for inward, not `yarn_stocked`. Document why. |
| 8 | `initialBoxWeight` is captured and locked but **nothing reads it** | A real weight‑reconciliation check exists in the data and is unused | Ship it as the "Weight mismatch" exception tab (Zone K) — high value, low effort |
| 9 | **`yarn_blocked` vs `issueStatus='issued'`** are two different notions of "blocked" | Double counting if both are summed | Pick one: use `issueStatus='issued'` (physical) for A6, and reserve `yarn_blocked` for the requisition `blockedQty`/overbooked logic only |
| 10 | Cone `issueStatus='used'` never returns; `returnWeight` may be absent | Consumption = `issued − returned` overstates when `used` cones lack a return row | Compute consumed as `Σ issueWeight` on `used` cones **+** `Σ(issueWeight − returnWeight)` on returned cones. Do not just subtract totals. |
| 11 | GRN `status` can be `superseded`/`voided`; lots can be `voided: true` | Summing all GRNs double‑counts revisions | **Always** filter `status:'active'` and `lots.voided:false` |
| 12 | `YarnPoVendorReturn` `pending_session` rows linger | Return totals overstate | Count only `status:'completed'`; surface `pending_session` as an exception |
| 13 | **`/yarn-management/inventory` is linked from the tile grid but the route does not exist** | Dead link on the landing page today | Fixed by definition when the tile grid is replaced; note it so nobody re‑adds the link |
| 14 | Mongoose **5.7.7** | `$setWindowFields` / `$dateTrunc` may be unavailable depending on server version | Verify with `db.version()`. The `$facet`+`$group` plan avoids them. |
| 15 | `queryYarnInventories` permits `limit: 100000` | One call can serialise everything | Cap dashboard endpoints at 100; consider capping the existing endpoint too |
| 16 | `YarnCatalog.minQuantity` is optional | Days‑of‑cover and below‑reorder are undefined for yarns without it | Show `count(active yarns with no minQuantity)` as a **data‑hygiene alert** — the CEO should know how much of the catalog is unmonitored |

---

## 18. Phased delivery plan

Assumes the vendor dashboard shared components exist. If yarn is built **first**, add ~3 days for the shared layer.

| Phase | Scope | Effort | Ships value? |
|-------|-------|--------|--------------|
| **0 — Foundation** | Indexes (§11.3), route/controller/service skeleton, envelope + `types.ts`, catalog‑hook bypass helper, sidebar entry | 1–2 d | Unblocks everything; the hook bypass alone speeds up existing screens |
| **1 — Stock & money** | Pipelines 1–3, `/summary` + `/alerts`, Zones 0, A, B, C. In‑process cache + single‑flight. | 3–4 d | ✅ **Answers 6 of the 14 questions on day one** |
| **2 — Trends** | Extend the existing cron, 2 new snapshot models, backfill script, `/trends`, Zone D | 2–3 d | ✅ Trend + "vs last month" (partly free — closing snapshot exists) |
| **3 — Stock health & suppliers** | Pipelines 4–6, `/stock-health` + `/suppliers`, Zones E, F | 2–3 d | ✅ Reorder discipline + supplier accountability |
| **4 — Consumption & ageing** | `/consumption` + `/ageing`, Zones G, H, I | 2–3 d | ✅ Leakage + obsolescence |
| **5 — Mix, exceptions, reconciliation** | Pipeline 7, `/mix` + `/exceptions` + `/reconciliation`, Zones J, K, L | 2–3 d | ✅ Daily action list + trust |
| **6 — Polish & hardening** | Export PDF/Excel, TV mode, print CSS, dark mode, `explain()` audit, 10× load test, Lighthouse | 2 d | Keeps it fast as data grows |

**Total ≈ 14–20 working days** (≈ 11–16 if the vendor shared layer already exists). Phase 1 is independently shippable — put it in front of the CEO in week one.

---

## 19. Open questions for the business

1. **Stock valuation method** — weighted‑average PO rate (proposed), latest PO rate, or landed cost from GRN? Each gives a materially different ₹. Landed cost is most accurate but only exists where a GRN was raised.
2. **Days‑of‑cover window** — 30‑day trailing average consumption, or 90‑day? Seasonal yarn behaves very differently under each.
3. **Supplier score weights** (§7 Zone F) — 30/25/20/15/10 proposed. Confirm.
4. **Fiscal year start** — April or January?
5. **Currency display** — ₹ in lakhs/crores or full rupees? Lakhs reads better on cards.
6. **Wastage definition** (Zone G) — is `issueWeight − returnWeight` on a returned cone all "consumed", or is some of it wastage? Without a business rule, the dashboard can only report consumption, not wastage.
7. **Dead‑stock threshold** — 90 days no issue (proposed), or a different window? And what ₹ threshold triggers the alert?
8. **Financial masking for the `user` role** (§16) — apply the vendor‑module rule, or is yarn cost visible to everyone?
9. **Occupancy alert thresholds** — 80% warning / 90% critical proposed. Store manager should confirm against real double‑stacking practice.
10. **Retention** — how long do we keep the 3 new snapshot collections? Per‑yarn daily × 2 years is the biggest one; still only a few hundred MB at most. Suggest keeping everything.
11. **Should `YarnInventory` be retired or made authoritative?** (gap #1) Out of scope for the dashboard, but it is the module's biggest structural risk and someone should own the decision.

---

## Appendix A — Master KPI list

| # | KPI | Zone | Kind | Source |
|---|-----|------|------|--------|
| 1 | Total kg on hand | A | stock | boxes + cones |
| 2 | Stock value ₹ | A | stock | derived (PO rate × kg) |
| 3 | LT kg | A/C | stock | YarnBox |
| 4 | ST kg | A/C | stock | YarnCone |
| 5 | Unallocated kg | A | stock | YarnBox |
| 6 | Blocked / issued kg | A | stock | YarnCone |
| 7 | At‑vendor kg | A/G | stock | YarnVendorShipment |
| 8 | Open PO value ₹ | A/H | stock | YarnPurchaseOrder |
| 9 | Consumption per day | A/G | flow | YarnTransaction |
| 10 | Procurement funnel (7 stages) | B | mixed | PO + GRN + boxes |
| 11 | Landed ₹/kg + full tax stack | B | flow | YarnGrn |
| 12 | Freight % of taxable | B | flow | YarnGrn |
| 13 | LT / ST slot occupancy % | C | stock | boxes, cones, StorageSlot |
| 14 | Boxes per slot (avg/max) | C | stock | YarnBox |
| 15 | Unallocated backlog + oldest age | C/K | stock | YarnBox |
| 16 | Inward / issued / returned trend | D | flow | snapshots |
| 17 | Closing stock trend | D | stock | YarnDailyClosingSnapshot ✅ |
| 18 | Yarns below reorder | E/K | stock | YarnRequisition |
| 19 | Yarns overbooked | E/K | stock | YarnRequisition |
| 20 | Total shortfall kg | E | stock | YarnRequisition |
| 21 | Days‑of‑cover distribution | E | derived | inventory + transactions |
| 22 | Stock‑out events | E | flow | snapshots |
| 23 | Supplier scorecard (14 cols) | F | mixed | multi |
| 24 | Issued by channel (orders/linking/sampling) | G | flow | YarnTransaction |
| 25 | Return rate % | G | flow | YarnTransaction |
| 26 | Estimate vs actual per order | G | flow | yarnEstimation + transactions |
| 27 | Cones issued > 30 d unreturned | G/K | stock | YarnCone |
| 28 | PO outstanding kg + ₹ | H | stock | YarnPurchaseOrder |
| 29 | PO overdue buckets | H/K | stock | YarnPurchaseOrder |
| 30 | Avg days in each PO status | H | flow | statusLogs |
| 31 | Stock ageing buckets (kg + ₹) | I | stock | YarnBox |
| 32 | Ageing by season | I | stock | YarnBox + YarnCatalog |
| 33 | Yarn mix treemap (₹) | J | stock | inventory + catalog |
| 34 | Dead stock (90 d no issue) | J/K | stock | inventory + transactions |
| 35 | Shade concentration | J | stock | catalog |
| 36 | Catalog hygiene (unused active yarns) | J | stock | catalog |
| 37 | QC reject % (by supplier, by yarn) | F/G | flow | YarnBox.qcData |
| 38 | Lot status split | B/F | flow | receivedLotDetails |
| 39 | Weight mismatch exceptions | K | stock | initialBoxWeight |
| 40 | Reconciliation identity + unaccounted % | L | stock | multi |

---

## Appendix B — Files that will be touched

**New (backend)**
```
src/routes/v1/yarn/yarnDashboard.route.js
src/controllers/yarnManagement/yarnDashboard.controller.js
src/services/yarnManagement/yarnDashboard.service.js
src/services/yarnManagement/yarnDashboardPipelines.js       // the 7 $facet pipelines
src/services/yarnManagement/yarnDashboardSnapshot.service.js
src/services/yarnManagement/yarnCatalogFast.js              // hook-bypassing catalog reader
src/models/yarnReq/yarnDashboardDailySnapshot.model.js
src/models/yarnReq/yarnDashboardYarnSnapshot.model.js
src/models/yarnReq/yarnDashboardSupplierSnapshot.model.js
src/cron/yarnDashboardSnapshot.cron.js
src/validations/yarnDashboard.validation.js
src/scripts/add-yarn-dashboard-indexes.js
src/scripts/backfill-yarn-dashboard-snapshots.js
```

**Modified (backend)**
```
src/routes/v1/index.js            // mount /yarn-management/dashboard
src/index.js                      // register the cron
src/models/index.js               // export the 3 new models
```

**New (frontend)** — the `app/yarn-management/command/` tree from §14, plus `shared/components/dashboard/` if yarn is built first.

**Modified (frontend)**
```
app/yarn-management/page.tsx                       // tile grid → dashboard
shared/layout-components/sidebar/nav.tsx           // "Dashboard" as first Yarn Management child
app/yarn-management/dashboard/**, analytics/**, report/**
                                                   // accept URL filter params for drill-down
```

---

*Document version 1.0 · 2026‑08‑22 · Analysis based on a full read of the yarn module: ~30 frontend routes, 21 backend models, 46 backend services (~19,000 LOC), 12 route files, and the existing analytics/report/inventory surfaces.*
