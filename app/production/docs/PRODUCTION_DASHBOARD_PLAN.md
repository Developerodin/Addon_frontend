# Production Planning — CEO Command Dashboard
### End‑to‑end analysis, KPI specification, and high‑performance build plan

> **Target route:** `/production` — **this route currently has no `page.tsx` at all.** The directory contains only `layout.tsx`. The sidebar entry is a `type: "sub"` group, so clicking "Production Planning" expands children but the URL itself renders nothing.
> **Status:** Planning / brainstorming document. No code written yet.
> **Audience:** CEO + COO + Production Head + Planning Manager. Secondary: 11 floor supervisors.
> **Core promise:** *One page answers — can we deliver what we promised, where is the line choking, what is quality costing us, and are the machines earning their keep.*
> **Companion docs:** `app/vendor-po/docs/VENDOR_DASHBOARD_PLAN.md` and `app/yarn-management/docs/YARN_DASHBOARD_PLAN.md`. Same envelope, same caching, same shared component layer. Read all three before building.

---

## Table of contents

1. [Why this dashboard exists](#1-why-this-dashboard-exists)
2. [Complete production module map](#2-complete-production-module-map)
3. [End‑to‑end lifecycle of one pair](#3-end-to-end-lifecycle-of-one-pair)
4. [The 15 questions a CEO actually asks](#4-the-15-questions-a-ceo-actually-asks)
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

Production is the **biggest module in the codebase**: ~42,000 lines of frontend across 11 floor screens (several over 2,000 lines each), ~10,000 lines of backend services, 14 models. It is where the factory actually runs.

And it has **no overview page**. Three separate problems compound:

**1 — `/production` renders nothing.** There is no `page.tsx`. Only `layout.tsx`.

**2 — The existing `/production/dashboard` API endpoint returns zeros.** `getProductionDashboard()` in `report.service.js` queries `Article.find({ currentFloor: floorName })` and reads `article.completedQuantity`. **Neither field exists on the Article schema** — `currentFloor` was deliberately removed (`article.model.js:140`, "using flow-based system instead") and quantities moved into `floorQuantities.<floor>.completed`. So every floor returns `totalQuantity: 0, completedQuantity: 0, efficiency: 0`.

**3 — `FloorStatistics` caches those zeros.** `floor.service.js:37` does a `findOneAndUpdate(..., { upsert: true })` with the broken computation, so the wrong numbers get persisted and served on every subsequent request.

The consequence: there is currently **no correct, aggregate view of production anywhere in the system.** A CEO can open 11 floor screens one at a time, and that is it.

This document specifies the page that fixes that — and §16 lists the schema/field bugs that must be fixed first, because a fast dashboard over wrong data is worse than no dashboard.

---

## 2. Complete production module map

### 2.1 Frontend routes

| # | Route | LOC | Purpose | In sidebar? |
|---|-------|-----|---------|-------------|
| — | `/production` | — | **No page.tsx — renders nothing** | ✅ parent (`type: sub`) |
| 1 | `/production/supervisor` (+ `add`, `edit`) | 900 / 1430 / 1866 | **Production Orders** — order CRUD, 4 tabs: Orders · Article View · Yarn Estimation · Upcoming View | ✅ |
| 2 | `/production/floor-supervisor/knitting` | 2829 | Floor 1 — machine view, article view, machine audit logs | ✅ |
| 3 | `…/linking` | 1608 | Floor 2 — skipped for Auto Linking | ✅ |
| 4 | `…/checking` | 2230 | Floor 3 — QC: M1/M2/M3/M4 | ✅ |
| 5 | `…/washing` | 1562 | Floor 4 | ✅ |
| 6 | `…/boarding` | 1305 | Floor 5 | ✅ |
| 7 | `…/silicon` | 1546 | Floor 6 | ✅ |
| 8 | `…/secondary-checking` | 2192 | Floor 7 — QC: M1/M2/M3/M4 | ✅ |
| 9 | `…/branding` | 1896 | Floor 8 — Heat Transfer / Embroidery | ✅ |
| 10 | `…/re-boarding` | 1401 | Floor 9 — Embroidery detour | ✅ |
| 11 | `…/final-checking` | 2676 | Floor 10 — QC + style/brand breakdown + dispatch staging | ✅ |
| 12 | `…/dispatch` | 2110 | Floor 11 — STN, warehouse handoff | ✅ |
| 13 | `…/machine-floor` | 983 | Machine floor view | ❌ **commented out in nav** |
| 14 | `…/warehouse` | — | Warehouse floor | ❌ **commented out in nav** |
| 15 | `/production/m2-management` | — | M2 repair ledger — merge to M1 / →M3 / →M4 | ✅ |
| 16 | `/production/m3-management` | — | M3 outward ledger | ✅ |
| 17 | `/production/m4-management` | — | M4 reject ledger | ✅ |
| 18 | `/production/quality-supervisor` | — | Quality supervisor view | ❌ not in nav |

### 2.2 Backend models

| Model | Collection | Key analytics fields |
|-------|-----------|---------------------|
| `ProductionOrder` | `production_orders` | `orderNumber` (`ORD-000001`), `priority` (4), `status` (6), `articles[]` refs, `currentFloor` (12), `orderNote`, `createdBy`/`lastModifiedBy`, timestamps. **⚠️ No due date, no customer, no planned dates — see gap #2** |
| `Article` | — | `articleNumber` (= `Product.factoryCode`), `orderId`, `knittingCode`, `plannedQuantity`, `linkingType` (3), `priority`, `status`, `progress`, `brandingType`, `machineId`, **`floorQuantities.{knitting,linking,checking,washing,boarding,silicon,secondaryChecking,branding,reBoarding,finalChecking,warehouse,dispatch}`**, `m3Tracking.outwardTotal`, `m4Tracking.outwardTotal`, `finalQualityConfirmed`, `startedAt`, `completedAt` |
| `MachineOrderAssignment` | `machine_order_assignments` | `machine`, `activeNeedle`, `productionOrderItems[{productionOrder, article, status, yarnIssueStatus, yarnReturnStatus, priority}]`, `isActive` — **this is the planning queue** |
| `Machine` | — | `machineCode`, `machineNumber`, `needleSizeConfig[]`, `floor`, `machineType`, `status(Active\|Under Maintenance\|Idle)`, `assignedSupervisor`, **`capacityPerShift`**, **`capacityPerDay`**, `lastMaintenanceDate`, `nextMaintenanceDate`, `maintenanceRequirement(1\|3\|6\|12 months)` |
| `ArticleLog` | — | `action` (**~80 `LogAction` values**), `quantity`, `fromFloor`, `toFloor`, `timestamp`, `userId`, `floorSupervisorId`, `orderId`, `articleId`, `previousValue`/`newValue`, `qualityStatus`, `machineId`, `shiftId`, `batchNumber` — **the richest event stream in the whole system** |
| `MachineOrderAssignmentLog` | — | Queue audit: create/update/priority/transfer‑between‑machines/short‑close |
| `FloorStatistics` | `floor_statistics` | `floor`+`date` unique, `activeOrders`, `completedToday`, `pendingOrders`, `onHoldOrders`, `totalQuantity`, `completedQuantity`, `efficiency`, `averageProcessingTime`, `qualityMetrics{m1..m4, repairCompleted, repairRejected}`, `averageWaitTime`, `peakHour`, `downtime`, `machineUtilization`, `workerProductivity` — **great schema, currently fed garbage (gap #1)** |
| `M2Log` | `m2_logs` | `type(ENTRY\|MERGE_TO_M1\|TRANSFER_TO_M3\|TRANSFER_TO_M4)`, `status(OPEN\|PARTIAL\|RESOLVED)`, `originalQuantity`, `remainingQuantity`, `sourceFloor`, `orderNumber`, `articleNumber`, `cascadeFloors[]`, `timestamp` |
| `M3Log` / `M4Log` | `m3_logs` / `m4_logs` | `type(ENTRY\|OUTWARD)`, `quantity`, on‑hand before/after, `timestamp` |
| `ContainersMaster` | `containers_masters` | `barcode`, `status`, `activeFloor`, `activeItems[{article \| vendorProductionFlow, quantity, transferItems[]}]`, `type(bag\|bigContainer\|container)`, `tearWeight` — **holds in‑transit WIP, invisible on every floor screen** |
| `DispatchStockTransferNote` | — | `stnSerial`, `stnDate`, `lines[{articleId, orderId, articleNumber, sapArticleNo, brand, qtyInPairs}]`, `allocations[]`, `totalQty`, `totalBoxes`, `fromUnit`/`toUnit`, `status` |
| `TeamMaster` | — | `TeamRole(Supervisor\|Team Member)`, `status(Active\|Inactive)` |

### 2.3 Backend API surface (`/v1/production`, 73 routes)

```
/orders                           CRUD + /bulk-create + /:orderId
/floors/:floor/orders             floor-scoped order list (articleView payload option)
/floors/:floor/orders/:orderId/articles/:articleId
/floors/:floor/transfer           cross-floor move
/floors/:floor/statistics         ← currently returns zeros (gap #1)
/floors/:floor/quality/:articleId
/floors/:floor/repair/:orderId/articles/:articleId
/floors/:floor/shift-m2
/floors/final-checking/confirm-quality | forward-to-warehouse
/floors/Dispatch/transfer-notes   list / create / :id / preview / report
/floors/:floor/orders/pending-warehouse-print

/articles/:articleId              + /processes /quality-inspection
                                  /floor-received-data /branding-type
                                  /revert-floor-transfer /fix-corruption

/machine-order-assignments        CRUD, /top-items, /completed-items,
                                  /yarn-issue-pending-summary,
                                  /machines/pending-quantities,
                                  /:id/items, /:id/items/:itemId/status,
                                  /yarn-issue-status, /yarn-return-status,
                                  /:id/reset, /:id/logs

/dashboard                        ← broken (gap #1)
/reports/efficiency | quality | order-tracking/:orderId | article-wise
/logs/article|order|floor|user/:id, /logs/statistics, /logs/audit-trail/:orderId
/m2 /entries /logs /statistics /entries/:id/{merge-to-m1,transfer-to-m3,transfer-to-m4}
/m3 /articles /logs /statistics /articles/:id/outward
/m4 /articles /logs /statistics /articles/:id/outward
/fix-completion-status[/:orderId] , /bulk/update-articles
```

> The presence of `/fix-completion-status`, `/fix-corruption`, `/revert-floor-transfer`, and ~400 lines of `fixFloorDataCorruption` / `fixAllFloorDataInconsistencies` methods inside `article.model.js` is itself a finding: **floor quantity drift is a known, recurring operational problem.** The dashboard should surface it as a first‑class exception (Zone K "Data integrity"), not hide it.

---

## 3. End‑to‑end lifecycle of one pair

**The route is not fixed.** Unlike vendor (5 fixed floors) and yarn (linear), each article's floor sequence is **derived per article** from `Product.processes` (matched by `factoryCode = articleNumber`), with a fallback to a linking‑type default.

```
┌─ PLANNING ───────────────────────────────────────────────────────────────┐
│ ProductionOrder (ORD-000001, priority, status)                           │
│   └─ Article[] (articleNumber = Product.factoryCode, plannedQuantity,    │
│                 linkingType, brandingType, machineId)                     │
│        └─ floor route resolved from Product.processes → mapProcessToFloor│
│           fallback: linkingType default (Auto Linking skips Linking)     │
│                                                                          │
│ MachineOrderAssignment: machine + activeNeedle + queue of (PO, article)  │
│   each row carries status, yarnIssueStatus, yarnReturnStatus, priority   │
│   row auto-removed only when ALL THREE are Completed                     │
└──────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─ THE LINE (up to 11 floors, per-article route) ──────────────────────────┐
│                                                                          │
│  Knitting ─► [Linking*] ─► Checking ─► Washing ─► Boarding ─► Silicon    │
│    (M4)        *skipped      (M1-M4)                                     │
│                for Auto                                                  │
│                Linking                                                   │
│      └─► Secondary Checking ─► Branding ─► [Re-Boarding**] ─►            │
│              (M1-M4)          HT/Embr      **Embroidery only             │
│      └─► Final Checking ─► Dispatch ─► (Warehouse)                       │
│              (M1-M4)         STN                                         │
│                                                                          │
│  Every floor: { received, completed, remaining, transferred }            │
│  QC floors also: { m1..m4, m1Transferred, m1Remaining,                   │
│                    m2Transferred, m2Remaining, repairStatus }            │
│                                                                          │
│  ⚠ Between floors, quantity sits in a ContainersMaster with              │
│    activeFloor = destination until scanned + accepted.                   │
└──────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─ QUALITY LOOPS ──────────────────────────────────────────────────────────┐
│ M1 → forward   M2 → repair loop (back to a previous floor, cascadeFloors)│
│ M3 → seconds ledger (outward)                                            │
│ M4 → reject ledger (outward); knitting has its own m4Quantity            │
│                                                                          │
│ M2 resolution: MERGE_TO_M1 (recovered) | TRANSFER_TO_M3 | TRANSFER_TO_M4 │
└──────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─ OUTWARD ────────────────────────────────────────────────────────────────┐
│ Final Checking → confirm quality → Dispatch → STN → Warehouse/WHMS       │
└──────────────────────────────────────────────────────────────────────────┘

CROSS-MODULE COUPLING
  Yarn module  ──► yarnIssueStatus / yarnReturnStatus on each queue row
                   YarnTransaction.orderId / .articleId
  Vendor module ─► shares ContainersMaster, and mirrors the SC→Branding→
                   Re-Boarding→FC→Dispatch tail with the same M1–M4 semantics
```

**Quality bucket meanings (identical to the vendor module — same `RepairStatus` / `QualityCategory` enums):**

| Bucket | Where | Meaning |
|--------|-------|---------|
| **M1** | Checking, Secondary Checking, Final Checking | Good — flows forward |
| **M2** | same 3 floors | Repairable — goes to M2 ledger, can merge back to M1 |
| **M3** | same 3 floors | Seconds / downgrade — outward via M3 ledger |
| **M4** | 3 QC floors **+ Knitting** | Reject / scrap — outward via M4 ledger |

**Formulas the backend already enforces — reuse, don't re-derive:**

```
remaining      = received − m2Quantity − m4Quantity − transferred − completed   (QC floors)
m1Remaining    = m1Quantity − m1Transferred
m2Remaining    = m2Quantity − m2Transferred
non-QC floor   = received − completed − transferred
invariant      : m1 + m2 + m3 + m4 ≤ received   (on QC floors)
progress       : from floorQuantities virtual, not a stored field
```

---

## 4. The 15 questions a CEO actually asks

| # | Question | Zone |
|---|----------|------|
| 1 | How many pairs are in the factory right now, and where? | A + C |
| 2 | Which floor is the bottleneck? | C |
| 3 | Are we going to hit this month's output number? | A + D |
| 4 | How many orders are late, and whose fault is it? | B + H |
| 5 | What is my first‑pass yield — how much do we get right the first time? | E |
| 6 | What is quality costing me in units and rupees? | E + G |
| 7 | Are my machines actually running, or idle? | F |
| 8 | Which machine is over‑loaded and which is starved? | F |
| 9 | Is yarn holding up production? | I |
| 10 | How long does one order take end to end, and is that improving? | D + J |
| 11 | Which article/style is the problem child? | J |
| 12 | How much finished stock is waiting to be dispatched? | A + C |
| 13 | Which supervisor / shift performs best? | G |
| 14 | Is anything physically lost or unaccounted? | L |
| 15 | What needs my decision **today**? | Zone 0 + K |

---

## 5. Dashboard information architecture

```
╔══════════════════════════════════════════════════════════════════════════╗
║  HEADER  Production Command Center                                       ║
║  [Date ▾][Order ▾][Article ▾][Floor ▾][Machine ▾][Shift ▾]  Live ●       ║
║  Last updated 14:32  ·  [Export PDF][Export Excel]                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ⓘ ZONE 0 — ALERT RIBBON                                                 ║
║  🔴 Knitting 6.2d backlog  🔴 11 orders stalled >7d  🟠 4 machines idle  ║
║  🟠 8 containers unscanned  🟡 M2 open 1,840 pairs  🔴 3 floors drifted  ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ZONE A — HEADLINE KPI STRIP (8 cards)                                   ║
║  WIP Pairs │ Output Today │ Output MTD vs Target │ First-Pass Yield      ║
║  Avg Cycle Time │ Machine Utilisation │ Open Orders │ Ready to Dispatch  ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ZONE B — ORDER FUNNEL & DELIVERY                                        ║
║  6 statuses × count/pairs · aged pipeline · at-risk orders               ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ZONE C — FLOOR LOAD HEATSTRIP  ★ the single most important widget       ║
║  12 floors × [inbound │ received │ WIP │ completed │ out │ backlog-days] ║
║  bottleneck badge · oldest item age · in-container in-transit            ║
╠═══════════════════════════════════╦══════════════════════════════════════╣
║  ZONE D — THROUGHPUT & CYCLE TIME ║  ZONE E — QUALITY (M1–M4)            ║
║  Daily in/out per floor, 7d MA,   ║  FPY, stacked M-mix over time,       ║
║  WIP line, cycle-time trend       ║  per-floor defect Pareto, M2 recovery║
╠═══════════════════════════════════╬══════════════════════════════════════╣
║  ZONE F — MACHINE UTILISATION     ║  ZONE G — PEOPLE & SHIFT             ║
║  capacity vs load, idle/maint,    ║  output per supervisor/shift,        ║
║  queue depth, needle mix          ║  defect rate by supervisor           ║
╠═══════════════════════════════════╬══════════════════════════════════════╣
║  ZONE H — ORDER AGEING            ║  ZONE I — YARN READINESS (cross-mod) ║
║  0-7/8-15/16-30/30+ days          ║  queue rows blocked on yarn issue    ║
╠═══════════════════════════════════╩══════════════════════════════════════╣
║  ZONE J — ARTICLE / STYLE PERFORMANCE                                    ║
║  Top articles by volume · defect % per article · slowest cycle · treemap ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ZONE K — EXCEPTION WORKLIST (tabbed, virtualised)                       ║
║  [Stalled Orders][Bottleneck][Idle Machines][Stuck Containers]           ║
║  [Open M2 Aged][Repair Rejected][Yarn Blocked][Data Integrity]           ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ZONE L — RECONCILIATION LEDGER (collapsed)                              ║
║  Planned = Completed + WIP + M3 out + M4 out + Unaccounted               ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 6. Section‑by‑section KPI specification

> `PO` = ProductionOrder, `A` = Article, `FQ` = `A.floorQuantities`, `MOA` = MachineOrderAssignment.
> All quantities are **pairs** unless stated.

### ZONE A — Headline KPI strip

| # | KPI | Formula | Source |
|---|-----|---------|--------|
| A1 | **WIP pairs** | `Σ over A of Σ over all 12 floors FQ.<floor>.remaining` **+** `Σ ContainersMaster.activeItems.quantity where activeItems.article ≠ null AND status='Active'` | Article + Containers |
| A2 | **Output today** | `Σ FQ.dispatch.transferred` delta today, or preferably `Σ DispatchStockTransferNote.totalQty where stnDate = today` | STN |
| A3 | **Output MTD vs target** | MTD actual from STN; **target requires a new field — see Q1** | STN + config |
| A4 | **First‑pass yield %** | `Σ FQ.finalChecking.m1Quantity / Σ FQ.finalChecking.received × 100` | Article |
| A5 | **Avg cycle time (days)** | `avg(A.completedAt − A.startedAt)` over articles completed in range. **Both fields are declared on Article and do persist** — unlike the order‑level equivalents (gap #3) | Article |
| A6 | **Machine utilisation %** | `count(machines with ≥1 active queue row) / count(Machine where status='Active') × 100` | Machine + MOA |
| A7 | **Open orders** | `count(PO where status ∈ {Pending, In Progress, On Hold})` + their planned pairs | ProductionOrder |
| A8 | **Ready to dispatch** | `Σ FQ.dispatch.remaining` (= received − transferred) — finished goods waiting to move | Article |

Each card: value · delta vs previous equal period · sparkline (12 pts from snapshots) · click → drill.

### ZONE B — Order funnel & delivery

All 6 `OrderStatus` values with count + planned pairs + avg age:

`Pending → In Progress → Completed / On Hold / Short Close / Cancelled`

| Metric | Formula |
|--------|---------|
| Orders by status | `count` + `Σ articles.plannedQuantity` per status |
| Avg age in status | `now − PO.updatedAt` (proxy; see gap #3 — there are no status logs on `ProductionOrder`, unlike vendor/yarn POs) |
| Completion rate % | `completed / (completed + in progress + pending) × 100` |
| **At‑risk orders** | orders whose *projected* completion (WIP ÷ current floor throughput) exceeds a target date — **needs a due date field, see Q2** |
| Short‑closed pairs | `Σ planned − Σ completed` over `Short Close` orders — quantifies broken promises |

### ZONE C — Floor load heatstrip ★

One row per floor across all 12: `Knitting · Linking · Checking · Washing · Boarding · Silicon · Secondary Checking · Branding · Re-Boarding · Final Checking · Dispatch · Warehouse`

| Column | Formula |
|--------|---------|
| **Inbound in transit** | `Σ ContainersMaster.activeItems.quantity WHERE activeFloor = <floor label> AND status='Active' AND activeItems.article ≠ null` |
| Received | `Σ FQ.<floor>.received` |
| **WIP / remaining** | `Σ FQ.<floor>.remaining` |
| Completed | `Σ FQ.<floor>.completed` |
| Transferred out | `Σ FQ.<floor>.transferred` |
| Articles on floor | `count(A where FQ.<floor>.remaining > 0)` |
| Repair inbound | `Σ FQ.<floor>.repairReceived` (non‑QC floors receive M2 rework) |
| **Oldest item age** | `now − min(FQ.<floor>.receivedData[].receivedTimestamp)` among articles with `remaining > 0` |
| **Backlog days** ★ | `remaining ÷ (completed over last 7 days ÷ 7)` |

**Bottleneck badge:** the floor with the highest backlog‑days, labelled *"~N days of work queued"*. Colour: green `<1d`, amber `1–3d`, red `>3d`.

**Why this is the most valuable widget on the page:** a factory has exactly one binding constraint at a time. Every hour spent optimising a non‑bottleneck floor is wasted. This row tells the CEO where to send people, today.

> `activeFloor` on `containers_masters` is a **human‑readable label** (`"Branding"`, `"Final Checking"`), while `floorQuantities` uses camelCase keys (`branding`, `finalChecking`). Build one explicit `floorKey ↔ activeFloor label` map, unit‑tested for all 12 floors. A typo silently zeroes the in‑transit column.

### ZONE D — Throughput & cycle time

**D1 — Flow chart** (daily / weekly / monthly, auto by range):
- Bars: pairs **entering** the line (Knitting received) vs pairs **leaving** (STN dispatched).
- Line: 7‑period moving average of output.
- Area (secondary axis): total WIP at period close — **requires the snapshot (§12)**.

**D2 — Cycle time trend:** median and p90 of `A.completedAt − A.startedAt`, split by `linkingType` (Auto vs Rosso vs Hand) and by `brandingType` (Heat Transfer vs Embroidery — the latter takes the extra Re‑Boarding leg, so this quantifies its real cost).

**D3 — Per‑floor dwell time:** median hours between a floor's `receivedData[].receivedTimestamp` and the article's next floor receipt. This is the true "how long does Washing take" number, and nothing shows it today.

**D4 — Little's Law sanity check:** `avg WIP ÷ avg throughput ≈ avg cycle time`. If the three don't reconcile, one of them is wrong — show the residual.

### ZONE E — Quality

| Metric | Formula |
|--------|---------|
| **First‑pass yield %** | `FC.m1Quantity / FC.received × 100` |
| **Rolled throughput yield** | `(checking FPY) × (secondaryChecking FPY) × (finalChecking FPY)` — the honest number; each floor's individual yield always flatters |
| Defect rate per QC floor | `(m2 + m3 + m4) / received × 100` for `checking`, `secondaryChecking`, `finalChecking` |
| Knitting defect rate | `FQ.knitting.m4Quantity / FQ.knitting.received × 100` |
| M‑mix over time | stacked 100% area, M1/M2/M3/M4, toggle by floor |
| **Defect Pareto** | which floor contributes the most rejects — 80/20 bar + cumulative line |
| Open M2 entries | `M2Log.countDocuments({type:'ENTRY', status:{$in:['OPEN','PARTIAL']}})` |
| Open M2 pairs | `Σ remainingQuantity` on those |
| **M2 recovery rate** | `Σ MERGE_TO_M1 quantity / Σ ENTRY originalQuantity × 100` — the % of defects actually saved. Converts a QC stat into money saved. |
| M2 → M3 / M2 → M4 split | how much repair work ends up downgraded vs scrapped |
| **Repair TAT** | `avg(RESOLVED.timestamp − matching ENTRY.timestamp)` from `m2_logs` |
| Repair rejected | `count(repairStatus = 'Rejected')` across QC floors |
| M3 on hand vs outward | `Σ FQ.*.m3Quantity − Σ A.m3Tracking.outwardTotal` |
| M4 on hand vs outward | `Σ FQ.*.m4Quantity + FQ.knitting.m4Quantity − Σ A.m4Tracking.outwardTotal` |
| **Cost of quality** | `(M3 pairs × downgrade loss/pair) + (M4 pairs × full cost/pair) + (M2 pairs × rework cost/pair)` — **needs three business constants, see Q4** |

### ZONE F — Machine utilisation

| Metric | Formula |
|--------|---------|
| Machines total / Active / Idle / Under Maintenance | `Machine.status` counts |
| **Machines with work** | `count(MOA where isActive AND ∃ item with status ∉ {Completed, On Hold, Cancelled})` |
| **Utilisation %** | machines‑with‑work ÷ Active machines |
| **Capacity vs load** | per machine: `Σ pending knitting pairs in queue` vs `Machine.capacityPerDay` → **days of queue**. Reuse `resolveArticleKnittingPendingQuantity()` from `machinePendingQuantity.service.js` so the dashboard and the queue screen never disagree. |
| **Starved machines** | Active, zero queue rows — idle capacity |
| **Overloaded machines** | queue > N days of capacity (N configurable) |
| Queue depth distribution | histogram of rows per machine |
| Needle‑size mix | pairs queued per `activeNeedle` — reveals whether the needle plan matches demand |
| **Maintenance due** | `count(Machine where nextMaintenanceDate ≤ now + 7d)`; overdue count separately |
| Output per machine | pairs completed at Knitting per machine per day (from `ArticleLog` where `machineId` is set) |

**Capacity vs load is the core "planning" KPI** — it is the difference between a monitoring dashboard and a *planning* dashboard.

### ZONE G — People & shift

Driven by `ArticleLog` (`userId`, `floorSupervisorId`, `shiftId`, `machineId`, `timestamp`) — a stream nothing currently aggregates.

| Metric | Formula |
|--------|---------|
| Output per supervisor | `Σ quantity` on `WORK_COMPLETED` / `QUANTITY_UPDATED` grouped by `floorSupervisorId` |
| Output per shift | same, grouped by `shiftId` |
| **Defect rate by supervisor** | `Σ M2/M3/M4 quantity logged / Σ received` per `floorSupervisorId` |
| Transfers per user | `count` of `TRANSFERRED_TO_*` actions per `userId` |
| **Peak hour** | hour‑of‑day histogram of log volume — reveals whether the line runs evenly or in bursts |
| Data‑integrity actions | `count` of `fix-corruption` / `revert-floor-transfer` per user — high counts mean a training or a UX problem |

> **Interpretation caution to put in the UI:** these are *activity* metrics, not *performance* metrics. A supervisor on a harder floor logs different numbers. Show them ranked within a floor, never across floors.

### ZONE H — Order ageing

| Chart | Buckets |
|-------|---------|
| **Stalled orders** — `now − PO.updatedAt` | `0–7 / 8–15 / 16–30 / 30+ days`, count + planned pairs |
| **Stalled articles** — `now − max(FQ.*.receivedData[].receivedTimestamp)` | same buckets, pairs |
| **Overdue orders** | requires a due date (Q2). Until then, show *stalled* and label it honestly. |

Anything in `30+` is capital that has stopped moving through the line.

### ZONE I — Yarn readiness (cross‑module)

The one place where production and yarn meet. Reuse `yarnIssuePendingSummary.service.js`.

| Metric | Formula |
|--------|---------|
| Queue rows pending yarn issue | `count(MOA items where yarnIssueStatus ≠ 'Completed' AND status ∉ {Completed, On Hold})` |
| Pairs blocked on yarn | `Σ pending knitting quantity` on those rows |
| Rows pending yarn return | `count(yarnReturnStatus ≠ 'Completed' AND status = 'Completed')` — **finished knitting, yarn never returned; the row can never leave the queue** |
| **Yarn‑blocked machines** | Active machines whose entire queue is blocked on yarn issue |
| Yarn shortage risk | queued articles whose BOM yarn has `< 7 days` cover (joins the yarn dashboard's days‑of‑cover) |

**"Pairs blocked on yarn" is a board‑level number** — it converts a stores problem into lost output.

### ZONE J — Article / style performance

- **Top 20 articles** by pairs completed, each with defect % and median cycle time.
- **Slowest articles**: highest median cycle time — candidates for process redesign.
- **Highest‑defect articles**: FC defect % — candidates for spec review.
- **Treemap** of WIP pairs by `brand` → `articleNumber` (brand from `FQ.finalChecking.transferredData[].brand` and `STN.lines[].brand`).
- **Linking‑type mix**: Auto / Rosso / Hand — pairs and cycle time each.
- **Branding‑type mix**: Heat Transfer vs Embroidery — pairs, cycle time, and the Re‑Boarding cost.
- **Route diversity**: `count(distinct resolved floor routes)`. High diversity means planning complexity; it also means the fallback route is probably being used a lot (gap #5).

### ZONE K — Exception worklist (tabbed, ≤50 rows, virtualised)

| Tab | Query |
|-----|-------|
| **Stalled orders** | `PO status ∈ {Pending, In Progress} AND updatedAt < now − 7d` |
| **Bottleneck queue** | articles on the bottleneck floor with `remaining > 0`, oldest first |
| **Idle machines** | `Machine status='Active'` with no active MOA queue row |
| **Overloaded machines** | queue pairs ÷ `capacityPerDay` > threshold |
| **Stuck containers** | `ContainersMaster` active, has article items, `updatedAt < now − 48h` |
| **Open M2 aged** | `M2Log` ENTRY `OPEN`/`PARTIAL`, `timestamp < now − 7d` |
| **Repair rejected** | articles with `repairStatus='Rejected'` on any QC floor |
| **Yarn blocked** | MOA rows `yarnIssueStatus ≠ Completed` older than 48 h |
| **Yarn return pending** | rows `status='Completed'` but `yarnReturnStatus ≠ 'Completed'` |
| **Maintenance due/overdue** | `Machine.nextMaintenanceDate ≤ now + 7d` |
| **Data integrity** ★ | articles failing invariants: `m1+m2+m3+m4 > received`, `completed + transferred > received`, negative `remaining`, `transferred > completed` on non‑QC floors. **This tab exists because the codebase has ~400 lines of corruption‑fixing methods — the drift is real and should be visible, not silently patched.** |

### ZONE L — Reconciliation ledger

```
IDENTITY 1 — per article
  plannedQuantity
   = FQ.dispatch.transferred          (shipped)
   + Σ FQ.<all floors>.remaining      (WIP on floors)
   + in-container in-transit
   + m3Tracking.outwardTotal          (seconds out)
   + m4Tracking.outwardTotal          (rejects out)
   + open M2 remainingQuantity        (in repair loop)
   + UNACCOUNTED                      ← target ≈ 0

IDENTITY 2 — output check
  Σ DispatchStockTransferNote.totalQty  ==  Σ FQ.dispatch.transferred
```

Show **Unaccounted** in pairs, as % of planned, and a red/green chip. Threshold >0.5%. Because overproduction is explicitly supported (`updateCompletedQuantity` has "overproduction support"), the residual can legitimately be **negative** — show signed, and label negative values "overproduction", not "error".

---

## 7. Chart & visualisation catalogue

Library: **ApexCharts via `react-apexcharts`** (`^3.49.1`) through the existing `shared/components/SafeChart.tsx`. **No second chart library.**

| Zone | Chart | Apex type | Note |
|------|-------|-----------|------|
| A | Sparkline ×8 | `line` | `sparkline.enabled`, 12 pts |
| B | Funnel | `bar` horizontal | 6 statuses, count + pairs toggle |
| C | Heatstrip | **CSS grid, no chart** | 12 rows × 9 cols = 108 cells; divs beat a chart on speed *and* legibility |
| D1 | Combo | `line` mixed | 2 bars + MA line + WIP area, dual axis |
| D2 | Box‑ish trend | `rangeArea` + `line` | median line with p10–p90 band |
| D3 | Horizontal bars | `bar` | median dwell hours per floor |
| E | 100% stacked area | `area` | `stackType: '100%'` |
| E | Pareto | `bar` + `line` | defect count bars + cumulative % line |
| F | Grouped bars | `bar` | capacity vs load per machine (top 20) |
| F | Donut | `donut` | machine status split |
| G | Ranked bars | `bar` | per supervisor / shift |
| G | Hour histogram | `bar` | 24 buckets |
| H | Grouped bars | `bar` | 4 ageing buckets |
| I | KPI tiles + bar | `bar` | yarn‑blocked pairs |
| J | Treemap | `treemap` | native |
| K/L | Tables | none | virtualised |

**Hard rules (same as the other two modules):** `animations.enabled = false` on every chart — with 10+ charts this is the #1 cause of jank; `redrawOnParentResize = false` plus a 250 ms debounced manual resize; **max 60 points per series** (server pre‑buckets, client never bins); every chart `next/dynamic({ssr:false})` behind a fixed‑height skeleton (zero CLS); below‑the‑fold charts mount on `IntersectionObserver`.

---

## 8. Exception / alert engine

Same typed shape as the vendor and yarn dashboards so `AlertRibbon` is literally the same component:

```ts
type ProductionAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'throughput' | 'quality' | 'machine' | 'material' | 'delivery' | 'integrity';
  title: string;        // "Knitting has 6.2 days of backlog"
  value: number;
  valueLabel: string;   // "12,400 pairs queued"
  href: string;
  since?: string;
};
```

| Rule | Severity | Threshold (proposed, configurable) |
|------|----------|-----------------------------------|
| Floor backlog | critical | `> 3 days` |
| Floor backlog | warning | `1–3 days` |
| Order stalled | critical | `> 14 days` no movement |
| Order stalled | warning | `7–14 days` |
| Machine idle (Active, empty queue) | warning | `> 24 h` |
| Machine overloaded | warning | queue `> 7 days` of capacity |
| Maintenance overdue | critical | `nextMaintenanceDate < now` |
| Container unscanned | critical | `> 48 h` |
| FPY drop | critical | current period `< 0.9 ×` trailing 90‑day average |
| Defect spike on a floor | critical | `> 1.5 ×` trailing 90‑day average |
| Open M2 aging | warning | any entry `> 7 days` |
| Pairs blocked on yarn | critical | `> X pairs` (business to set) |
| Yarn return pending | warning | `> 48 h` after knitting complete |
| **Data integrity violation** | critical | any article failing an invariant |
| Unaccounted pairs | critical | `> 0.5%` of planned |
| Output vs target | warning | MTD pace `< 90%` of target *(needs Q1)* |

All thresholds in **one config module** (`alertConfig.ts`), never inline.

---

## 9. Global filters, time model and drill‑down contract

### 9.1 Filters (URL‑synced, bookmarkable)

| Filter | Values | Default |
|--------|--------|---------|
| Date range | Today · 7d · 30d · 90d · FY · Custom | 30d |
| Compare to | Previous period · Same period last year · None | Previous period |
| Order | searchable multi‑select (`orderNumber`) | All |
| Article | searchable (`articleNumber`) | All |
| Floor | multi‑select (12) | All |
| Machine | multi‑select | All |
| Linking type | Auto / Rosso / Hand | All |
| Branding type | Heat Transfer / Embroidery | All |
| Priority | Urgent / High / Medium / Low | All |
| Shift | from `ArticleLog.shiftId` | All |

URL: `/production?from=…&to=…&floor=Knitting,Linking&machine=…&priority=Urgent&cmp=prev`

### 9.2 The time‑model trap

Same rule as the other two dashboards, and it bites hardest here because "WIP" and "output" look similar but behave oppositely:

| Kind | Under a date filter | Examples |
|------|--------------------|----------|
| **Flow** | Filtered by range | Output, pairs completed per floor, defects logged, cycle time of completed articles, transfers |
| **Stock** | **Not** filtered — "as of now" | WIP by floor, in‑container transit, open orders, machine queue depth, open M2 balance, ready‑to‑dispatch |

Every stock card carries `as of <time>` and a live dot. The API enforces it by returning `kind: "flow" | "stock"` on every metric. Without this, a CEO selects "Last 7 days", sees WIP fall, and concludes something happened that didn't.

### 9.3 Drill‑down contract

Nothing opens a second dashboard. Each click either opens a lazy evidence drawer, or navigates to the existing floor screen with params pre‑applied.

Required URL params to add to existing screens: `?order=`, `?article=`, `?machine=`, `?highlight=`, `?tab=`. Several floor pages already track `highlightArticleId` / `highlightOrderId` internally — expose them via URL rather than rebuilding.

---

## 10. Performance architecture — how we make it fast

### 10.1 What's slow or wrong today

| # | Problem | Where | Impact |
|---|---------|-------|--------|
| 1 | **`getProductionDashboard` loops 12 floors, each doing `Article.find({currentFloor})` with no projection and no limit** | `report.service.js:10` | 12 unbounded finds per request — *and the field doesn't exist, so all 12 scan and return nothing* |
| 2 | **`FloorStatistics` upserts the broken zeros** | `floor.service.js:37` | Wrong numbers become persisted "truth" |
| 3 | **`Article.distinct('orderId', …)` unbounded**, then `$in` with the whole array | `order.service.js:533` | Can build an `$in` with thousands of ObjectIds |
| 4 | **Post‑filtering after pagination** (`filteredResults`) while keeping mongoose‑paginate totals | `order.service.js:566` | Page counts are wrong by construction, and the comment admits it |
| 5 | **`getFloorOrderFromProduct()` does `Product.findOne({factoryCode}).populate('processes.processId')` per article** | `article.model.js:733` | N+1 across every article whose route is resolved |
| 6 | Order‑number generation does `findOne` + `findOne` in a retry loop | `productionOrder.model.js:130` | Race‑prone under concurrency and 2+ queries per create |
| 7 | Full `getFullFloorOrderPopulate()` joins `machineId` per article | `floorOrdersQuery.helper.js` | Extra collection hit per row |
| 8 | Floor pages are 1,300–2,800 LOC each, aggregating in `useMemo` | frontend | Heavy main‑thread work on every keystroke |
| 9 | No caching anywhere (`compression` + `express-rate-limit` only; **no Redis**) | backend | Every refresh re‑scans |

**A dashboard that naively calls `/production/dashboard` would be both slow and wrong. Phase 0 must fix the field references before any KPI ships.**

### 10.2 The three‑tier read model

```
┌─ TIER 1 — SNAPSHOTS (cron, nightly) ────────────────────────────────────┐
│ 🆕 production_daily_snapshots        one doc per date (global)           │
│ 🆕 production_floor_snapshots        one doc per (date, floor) → 12/day  │
│ 🆕 production_machine_snapshots      one doc per (date, machine)         │
│ ♻️  FloorStatistics — REPAIR the writer, keep the schema; it already has │
│    efficiency / downtime / machineUtilization / peakHour fields          │
│ → Serves every trend and every "vs last period" delta.                   │
└─────────────────────────────────────────────────────────────────────────┘
┌─ TIER 2 — LIVE $facet (cached 60 s) ────────────────────────────────────┐
│ 6 pipelines under Promise.all, one per collection, each using $facet.   │
│ → Serves WIP, floor load, machine load, exception counts, open M2.      │
└─────────────────────────────────────────────────────────────────────────┘
┌─ TIER 3 — ON-DEMAND ────────────────────────────────────────────────────┐
│ Exception rows, machine "view all", drill drawers. Paginated ≤50.       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why snapshots are non‑negotiable here:** `floorQuantities` is destructively overwritten. Today's `FQ.branding.remaining` says nothing about 1 August. WIP history, floor efficiency history, and machine utilisation history are **unreconstructable** without a nightly write. Flow metrics (output, transfers, defects) *can* be rebuilt from `ArticleLog.timestamp` and `STN.stnDate` — but doing so per page load is a full log scan.

### 10.3 The six live pipelines

| # | Collection | Serves |
|---|-----------|--------|
| 1 | `Article` | WIP per floor, quality totals, cycle time, stalled articles, M3/M4 on hand, branding/linking split, data‑integrity violations |
| 2 | `ProductionOrder` | Status funnel, open orders, stalled orders, ageing, priority mix |
| 3 | `MachineOrderAssignment` + `Machine` | Queue depth, capacity vs load, idle/starved/overloaded, needle mix, yarn‑blocked rows, maintenance due |
| 4 | `ArticleLog` | Throughput by day, transfers, per‑supervisor/shift output, peak hour, defect events |
| 5 | `m2_logs` + `m3_logs` + `m4_logs` | Ledger balances, recovery rate, repair TAT |
| 6 | `ContainersMaster` + `DispatchStockTransferNote` | In‑transit WIP, dispatch output, brand mix |

**Rules:**
- `$match` first, must hit an index.
- **`$project` before `$facet`** to strip `receivedData[]`, `transferredData[]`, and the 12 nested floor objects you don't need. `Article` is a **1,922‑line schema** — the documents are large, and projection is the single biggest lever. Fetch only the ~4 scalars per floor you actually sum.
- Never `$lookup` inside `$facet`. Resolve order numbers, article numbers and machine codes in one follow‑up `$in` query, join in JS with a `Map`.
- **Never resolve the per‑article floor route inside a dashboard pipeline.** `getFloorOrderFromProduct()` is an N+1 by design. Pre‑resolve routes once in the nightly snapshot and cache the mapping, or aggregate across all 12 floor keys unconditionally (a floor an article never visits has zeros, which sum harmlessly).
- `ArticleLog` will be the largest collection — always bound it by `timestamp` and consider a **TTL or archival policy** (Q9).

### 10.4 Indexes required (migration script)

```js
// Article (existing: {articleNumber}, {orderId}, {status}, {priority},
//          {machineId}, {createdAt:-1}, {'floorQuantities.knitting.received', orderId})
{ completedAt: -1 }
{ startedAt: -1 }
{ updatedAt: -1 }
{ orderId: 1, status: 1 }
// partial per floor — tiny, and they make WIP + exception queries instant
{ 'floorQuantities.knitting.remaining': 1 }
   partialFilterExpression: { 'floorQuantities.knitting.remaining': { $gt: 0 } }
// …repeat for all 12 floors

// ProductionOrder — already good ({status}, {priority}, {currentFloor},
//   {currentFloor,status,createdAt}, {createdAt:-1}, {orderNumber})
{ status: 1, updatedAt: -1 }              // stalled-order query
// ⚠️ DROP the dead indexes on non-existent fields:
//    { customerId: 1 }, { plannedStartDate: 1 }, { plannedEndDate: 1 }
//    They cost write throughput and index memory for nothing (gap #2).

// MachineOrderAssignment — already well indexed
{ isActive: 1, 'productionOrderItems.status': 1 }
{ isActive: 1, 'productionOrderItems.yarnIssueStatus': 1 }

// Machine
{ status: 1, isActive: 1 }
{ nextMaintenanceDate: 1 }

// ArticleLog (existing: {articleId,date}, {orderId,date}, {action,date},
//             {userId,date}, {fromFloor,toFloor,date})
{ timestamp: -1 }
{ action: 1, timestamp: -1 }
{ floorSupervisorId: 1, timestamp: -1 }
{ machineId: 1, timestamp: -1 }           // sparse
{ shiftId: 1, timestamp: -1 }             // sparse

// m2_logs / m3_logs / m4_logs — already well indexed ✅

// ContainersMaster
{ activeFloor: 1, status: 1 }
{ 'activeItems.article': 1 }

// DispatchStockTransferNote
{ status: 1, stnDate: -1 }

// FloorStatistics — already good ({floor,date} unique, {floor,date:-1}) ✅

// New snapshot collections
{ snapshotDate: -1 } unique
{ snapshotDate: -1, floor: 1 } unique
{ snapshotDate: -1, machine: 1 } unique
```

`explain('executionStats')` on every dashboard pipeline before merge. **`COLLSCAN` on a dashboard query is a blocker.**

### 10.5 Caching (no Redis)

Identical to the vendor and yarn plans — build it once, share it:

- **In‑process TTL Map** keyed by a hash of the normalised filter object. TTLs: summary 60 s · floor load 60 s · trends 15 min · exceptions 120 s · machines 120 s · people 5 min.
- `ETag` + `Cache-Control: private, max-age=30, stale-while-revalidate=120`. With `compression()` on, ~60 KB JSON ships as ~8 KB.
- **PM2 caveat, stated plainly:** `ecosystem.config.json` is present, so an in‑process cache is per worker — N workers, N cold misses. With >2 workers use a **`production_dashboard_cache` collection with a TTL index** instead: shared, restart‑safe, no new infra, ~5 ms.
- **Cache‑stampede guard:** single‑flight promise map, so 10 concurrent misses trigger one computation.

### 10.6 Frontend performance

| Technique | Detail |
|-----------|--------|
| **4 loading waves** | W1 `/summary`+`/alerts` (paint <500 ms) → W2 `/floors`,`/trends`,`/quality` → W3 on‑scroll `/machines`,`/people`,`/articles` → W4 on‑click `/exceptions` |
| Fixed‑height skeletons | zero CLS |
| `IntersectionObserver` mounting | ~10 charts; mounting them all up front is the difference between 1 s and 4 s |
| `next/dynamic({ssr:false})` | via existing `SafeChart` |
| Virtualised tables | ≤50 rows rendered per tab |
| `AbortController` on every fetch | filter changes must cancel in flight, or a stale response wins the race |
| 350 ms filter debounce | matches the yarn analytics page's existing 380 ms |
| One shared `Intl.NumberFormat` | module‑scoped |
| **Zero client aggregation** | the floor heatstrip is 108 cells of pre‑computed numbers, not a reduce over articles |
| Payload budget | summary ≤40 KB · floors ≤25 KB · trends ≤30 KB · exceptions ≤60 KB · **first paint <100 KB** |
| Polling | optional 60 s, **paused on `document.hidden`**. Not sockets. |

### 10.7 Performance budget (acceptance criteria)

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

## 11. Proposed API surface

New router `AddOn_backend/src/routes/v1/productionDashboard.route.js`, mounted at **`/v1/production/dashboard-v2`**.

> Named `dashboard-v2` deliberately: `/v1/production/dashboard` already exists and is broken. Keep it alive returning its current shape (something may consume it), deprecate it in the same PR, and remove it once nothing calls it. Do **not** silently change the old endpoint's contract.

| Endpoint | Returns | TTL |
|----------|---------|-----|
| `GET /dashboard-v2/summary` | Zones A, B — headline + order funnel | 60 s |
| `GET /dashboard-v2/floors` | Zone C — the 12‑floor heatstrip | 60 s |
| `GET /dashboard-v2/trends` | Zone D — from snapshots | 15 min |
| `GET /dashboard-v2/quality` | Zone E — FPY, RTY, M‑mix, Pareto, ledgers | 120 s |
| `GET /dashboard-v2/machines` | Zone F — capacity vs load, status, maintenance | 120 s |
| `GET /dashboard-v2/people` | Zone G — supervisor / shift | 5 min |
| `GET /dashboard-v2/ageing` | Zone H | 5 min |
| `GET /dashboard-v2/yarn-readiness` | Zone I | 120 s |
| `GET /dashboard-v2/articles` | Zone J | 5 min |
| `GET /dashboard-v2/alerts` | Zone 0 | 120 s |
| `GET /dashboard-v2/exceptions?type=&page=&limit=` | Zone K, one tab | 120 s |
| `GET /dashboard-v2/reconciliation` | Zone L | 5 min |
| `GET /dashboard-v2/export?format=xlsx\|pdf` | full snapshot | none |

**Shared query params:** `from`, `to`, `order[]`, `article[]`, `floor[]`, `machine[]`, `linkingType[]`, `brandingType[]`, `priority[]`, `shift[]`, `compare`.

**Shared envelope — byte‑identical to the vendor and yarn dashboards so the frontend hook is reused verbatim:**

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
  "warnings": [ "34 articles resolved their floor route via the linkingType fallback" ]
}
```

Every metric:
```jsonc
{ "value": 18432, "previous": 16120, "deltaPct": 14.3, "unit": "pairs", "kind": "stock" }
```

---

## 12. New data models (rollups)

### 12.1 `production_daily_snapshots` (one doc per day)

```js
{
  snapshotDate: '2026-08-21',
  wip:      { totalPairs, inContainerPairs, byFloor: { knitting: 1200, … } },
  output:   { dispatchedPairs, stnCount, knittingInPairs },
  orders:   { pending, inProgress, completed, onHold, shortClose, cancelled,
              openPlannedPairs, stalledCount },
  quality:  { fcReceived, fcM1, fcM2, fcM3, fcM4,
              scReceived, scM1, scM2, scM3, scM4,
              chkReceived, chkM1, chkM2, chkM3, chkM4,
              knittingM4, fpyPct, rtyPct },
  ledger:   { m2Open, m2OpenPairs, m2MergedToM1, m2ToM3, m2ToM4,
              m3Outward, m4Outward, avgRepairTatHours },
  machines: { total, active, idle, underMaintenance, withWork,
              utilisationPct, maintenanceDue7d },
  cycle:    { medianDays, p90Days, completedArticleCount },
  material: { yarnBlockedRows, yarnBlockedPairs, yarnReturnPendingRows },
  integrity:{ violationCount, unaccountedPairs },
  createdAt, updatedAt
}
```

### 12.2 `production_floor_snapshots` (12 docs/day)

```js
{
  snapshotDate: '2026-08-21', floor: 'Branding',
  inTransitInbound, received, completed, remaining, transferred,
  repairReceived, articleCount,
  m1, m2, m3, m4,                       // null on non-QC floors
  completedLast7dAvg, backlogDays,
  oldestItemAgeHours, medianDwellHours,
  createdAt
}
```

### 12.3 `production_machine_snapshots` (one doc/day/machine)

```js
{
  snapshotDate: '2026-08-21', machine: ObjectId, machineCode, activeNeedle,
  status, capacityPerDay,
  queueRows, queuePendingPairs, daysOfQueue,
  producedPairs, idle: false,
  yarnBlockedRows,
  createdAt
}
```

### 12.4 Repair `FloorStatistics` — don't replace it

The schema is genuinely good (`efficiency`, `averageProcessingTime`, `averageWaitTime`, `peakHour`, `downtime`, `machineUtilization`, `workerProductivity`, `qualityMetrics`). Only the **writer** is broken. Fix `calculateRealTimeStatistics()` to read `floorQuantities.<floorKey>.*` instead of the phantom `currentFloor` / `completedQuantity`, and it becomes a working per‑floor daily store on day one. Keep `production_floor_snapshots` for the richer fields it lacks (in‑transit, backlog days, dwell), or fold them in — either is defensible; **do not maintain two overlapping writers.**

### 12.5 Cron

`AddOn_backend/src/cron/productionDailySnapshot.cron.js`, modelled on the existing `yarnDailySnapshot.cron.js`:

- Schedule `45 0 * * *` `Asia/Kolkata` (after the yarn jobs, so a bad night fails in a predictable order).
- Idempotent upsert on `snapshotDate`.
- Accepts `{ snapshotDate }` for backfill, with the same honest caveat the yarn cron already documents: a backfill stamps *current* values under a past label — ops repair, not forensic history.
- **Backfill:** flow metrics (output, transfers, defect events, cycle time of completed articles) *are* reconstructable from `ArticleLog.timestamp`, `STN.stnDate`, and `Article.completedAt`. WIP, floor balances, and machine queue depth are **not** — leave them `null` for historical dates and render a dashed "no data" segment rather than a misleading zero.

### 12.6 Optional `production_dashboard_cache`

```js
{ key: '<sha1>', section: 'summary', payload: {…}, expiresAt: Date }
// TTL index { expiresAt: 1 }, expireAfterSeconds: 0
```

---

## 13. Frontend architecture & component tree

```
app/production/
├── page.tsx                          ← NEW — the route currently has none
├── command/
│   ├── ProductionCommandClient.tsx   ← "use client", filters + fetch waves
│   ├── types.ts                      ← mirrors the API envelope
│   ├── services/productionDashboardService.ts
│   ├── hooks/
│   │   ├── useDashboardFilters.ts    ← SHARED with vendor + yarn
│   │   ├── useDashboardSection.ts    ← SHARED
│   │   └── useVisibleOnce.ts         ← SHARED
│   ├── components/
│   │   ├── DashboardHeader.tsx
│   │   ├── AlertRibbon.tsx           ← Zone 0   (SHARED)
│   │   ├── KpiStrip.tsx              ← Zone A   (SHARED KpiCard)
│   │   ├── OrderFunnel.tsx           ← Zone B
│   │   ├── FloorHeatstrip.tsx        ← Zone C ★ (CSS grid, 12×9)
│   │   ├── ThroughputTrend.tsx       ← Zone D
│   │   ├── CycleTimeTrend.tsx        ← Zone D
│   │   ├── QualityPanel.tsx          ← Zone E
│   │   ├── MachineUtilisation.tsx    ← Zone F
│   │   ├── PeopleShiftPanel.tsx      ← Zone G
│   │   ├── OrderAgeing.tsx           ← Zone H
│   │   ├── YarnReadiness.tsx         ← Zone I
│   │   ├── ArticlePerformance.tsx    ← Zone J
│   │   ├── ExceptionWorklist.tsx     ← Zone K  (SHARED shell)
│   │   ├── ReconciliationLedger.tsx  ← Zone L  (SHARED shell)
│   │   └── skeletons/
│   └── utils/{formatters,deepLinks,alertConfig,floorLabelMap}.ts
└── floor-supervisor/**, supervisor/**, m*-management/**   ← unchanged
```

**Shared layer** (`shared/components/dashboard/`): `AlertRibbon`, `KpiCard`, `ExceptionWorklist` shell, `ReconciliationLedger` shell, `useDashboardSection`, `useDashboardFilters`, `useVisibleOnce`, `formatters`, skeletons, envelope types.

Roughly **45% of this dashboard's frontend is common** with the vendor and yarn dashboards. Whichever is built first pays for the shared layer; the other two get it free.

`floorLabelMap.ts` is production‑specific and load‑bearing: it maps the 12 `ProductionFloor` enum labels ↔ the `floorQuantities` camelCase keys ↔ the `ContainersMaster.activeFloor` strings. It needs a unit test asserting all 12 round‑trip.

---

## 14. Responsive layout spec

Tailwind 12‑column, matching the app's `grid grid-cols-12 gap-6` convention.

| Breakpoint | KPI strip | Charts | Floor heatstrip | Tables |
|-----------|-----------|--------|-----------------|--------|
| `<640` mobile | 1/row, snap carousel | full width `h=220` | collapse to 12 stacked cards, one per floor | card list |
| `640–1024` tablet | 2/row | 1/row `h=260` | h‑scroll, **sticky floor‑name column** | h‑scroll, sticky first col |
| `1024–1440` laptop | 4/row | 2/row `h=300` | full 12×9 grid | full |
| `>1440` desktop | 4/row, `max-w-[1800px]` | 2–3/row `h=340` | full grid + legend | full |

The floor heatstrip is the hardest responsive element — 12 rows × 9 numeric columns. On tablet, sticky‑column horizontal scroll is correct; do **not** try to squeeze 9 columns into 640 px.

Extras: **TV / war‑room mode** (`?tv=1`) — this is the most likely of the three dashboards to end up on a factory wall display, so budget real time for it: no nav, no filters, 90 s auto‑rotate, oversized type, heatstrip and alert ribbon prioritised. Plus print/PDF stylesheet and dark mode via CSS‑variable chart palettes.

---

## 15. RBAC & data masking

`'Production Planning'` already exists in the permission tree (`navigationContext.tsx:32`) with 17 boolean children. **Add one key: `'Dashboard'`**, and a sidebar entry as the first child of the Production Planning group pointing at `/production`.

| Role | Sees |
|------|------|
| `super_admin`, `admin` | Everything |
| Production Head / Planning Manager | Everything |
| Floor supervisor | Suggest scoping Zone G (people) to **their own floor only** — a cross‑floor supervisor leaderboard visible to all supervisors is a management decision, not a technical default (Q7) |
| `user` | Operational metrics; hide cost‑of‑quality ₹ figures if Q4 introduces them |

There are currently **no ₹ values in the production module at all** — no rate, no cost field anywhere. Money only enters if Q4 (cost‑of‑quality constants) is answered. Until then, masking is only about the people metrics.

---

## 16. Data‑quality gaps found during analysis

These are the reason this document leads with "fix before you build". Ranked by impact.

| # | Gap | Effect | Handling |
|---|-----|--------|----------|
| 1 | **`getProductionDashboard` and `calculateRealTimeStatistics` query `Article.currentFloor` and `article.completedQuantity` — neither field exists.** `currentFloor` was removed (`article.model.js:140`); quantities live in `floorQuantities.<floor>.completed`. `floor.service.js:37` then **upserts the resulting zeros into `FloorStatistics`** | Every floor statistic in the system is `0`. The cached zeros then look authoritative. | **Phase 0 blocker.** Rewrite both to read `floorQuantities.<floorKey>.*`. Consider purging existing `floor_statistics` rows written by the broken code — they are not recoverable, only wrong. |
| 2 | **`ProductionOrder` has no due date, no customer, no planned dates** — yet it indexes `customerId`, `plannedStartDate`, `plannedEndDate`, and `getOrdersByFloor` searches `customerName` / `customerOrderNumber` | **OTIF, on‑time delivery, and "at‑risk orders" cannot be computed.** Three indexes cost write throughput for nothing. | Ship "stalled" (no movement in N days) instead of "overdue", and **label it honestly**. Drop the three dead indexes. Adding a due date is a schema change — see Q2. |
| 3 | **`actualStartDate`, `actualEndDate`, `forwardedToBranding` are assigned in pre‑save hooks and methods but never declared in the schema.** Mongoose `strict: true` (the default) silently discards them | Order‑level cycle time is uncomputable; `forwardToWarehouse()` believes it persisted a flag that vanished | Use **`Article.startedAt` / `Article.completedAt`** (which *are* declared and do persist) for all cycle‑time KPIs. Fixing the schema is a separate ticket. |
| 4 | **`ProductionOrder` has no `statusLogs`** — unlike `VendorPurchaseOrder` and `YarnPurchaseOrder`, which both have them | "Avg days in each status" can't be computed from the order document | Derive from `ArticleLog` (`ARTICLE_STATUS_CHANGED`, `ORDER_*` actions) where present; otherwise use `updatedAt` as a coarse proxy and say so on the tooltip |
| 5 | **Floor route is per‑article from `Product.processes`, with a silent `console.warn` fallback to a linking‑type default** | Two articles in one order can have different routes; if products lack processes, the fallback route is used and nobody is told | Count fallback usages and surface as a `warnings[]` entry: *"N articles resolved via fallback route"*. A high number means the product master is incomplete, which quietly corrupts every route‑dependent KPI. |
| 6 | **~400 lines of `fixFloorDataCorruption` / `fixAllFloorDataInconsistencies` / `fixTransferredQuantityCorruption` in `article.model.js`, plus `/fix-completion-status` and `/fix-corruption` endpoints** | Floor quantity drift is a known recurring problem, currently patched invisibly | Make it visible: the **Data Integrity** exception tab (Zone K). A dashboard that hides its own data problems is worse than none. |
| 7 | **In‑container WIP is invisible on every floor screen** | If the dashboard omits it, Zone L shows a false leak equal to all in‑transit stock | **Must** include `ContainersMaster` in WIP — same finding as the vendor module, same fix |
| 8 | **`ContainersMaster.activeFloor` is free text** (`"Final Checking"`), while `floorQuantities` uses camelCase (`finalChecking`) and the enum uses labels | A label typo silently zeroes the in‑transit column | `floorLabelMap.ts` with a unit test asserting all 12 floors round‑trip |
| 9 | **`ProductionOrder` virtuals (`totalPlannedQuantity`, `totalCompletedQuantity`, `overallProgress`) reduce over `this.articles`, which are ObjectIds unless populated** — and they read `article.completedQuantity`, which doesn't exist | The virtuals return `0` or `NaN` depending on population state | Never use these virtuals for KPIs. Aggregate on `Article` directly. |
| 10 | **Order‑number generation** does `findOne` + existence `findOne` in a retry loop, with a `$regex` sort | Race‑prone under concurrent creates; 2+ queries per order | Not a dashboard blocker, but note it: use an atomic counter like `VendorDispatchStnCounter` already does |
| 11 | **`ARTICLE_VIEW_ARTICLE_SELECT` selects 12 fields that don't exist** (`completedQuantity`, `currentFloor`, `m1Quantity`…`m4Quantity`, `repairStatus`, `qualityConfirmed`, `quantityFromPreviousFloor`) and `ARTICLE_VIEW_ORDER_SELECT` selects 8 that don't (`customerId`, `customerName`, `customerOrderNumber`, `plannedStart/EndDate`, `actualStart/EndDate`, `forwardedToBranding`) | Harmless to Mongo, but it means the floor screens are silently rendering `undefined` for those fields — and it's a trap for anyone copying the select list into new code | Clean up in Phase 0; the dashboard must not copy these constants |
| 12 | **Post‑pagination filtering in `getOrdersByFloor`** keeps mongoose‑paginate's totals while filtering the page's rows | `totalResults` and `totalPages` are wrong; the code comments admit it | The dashboard must compute its own counts via aggregation, never trust that endpoint's totals |
| 13 | **`/production/floor-supervisor/machine-floor` and `/warehouse` exist but are commented out of nav**; `/production/quality-supervisor` exists and was never added | Dead or orphaned screens | Decide: wire up or delete. The dashboard should not link to unreachable pages. |
| 14 | **Mongoose 5.7.7** | `$setWindowFields` / `$dateTrunc` may be unavailable depending on server version | Verify with `db.version()`. The `$facet`+`$group` plan avoids them. |
| 15 | **No shift master.** `ArticleLog.shiftId` is a free string with no referenced collection | Shift analytics (Zone G) depends on operators populating it consistently | Report `count(logs with shiftId)` vs total as a data‑hygiene metric before trusting any shift KPI |
| 16 | **`ArticleLog` will grow unboundedly** — ~80 action types, written on every quantity change across 12 floors | It will become the largest collection and the slowest to aggregate | Bound every query by `timestamp`; decide a retention/archival policy (Q9) |

---

## 17. Phased delivery plan

Assumes the shared dashboard layer exists from the vendor or yarn build. If production is built **first**, add ~3 days.

| Phase | Scope | Effort | Ships value? |
|-------|-------|--------|--------------|
| **0 — Repair & foundation** ★ | **Fix `getProductionDashboard` + `calculateRealTimeStatistics` field references (gap #1)**; purge bad `floor_statistics` rows; drop 3 dead indexes; clean the two phantom select constants; add indexes (§10.4); `floorLabelMap` + test; route/controller/service skeleton; envelope + `types.ts`; permission key + nav entry | 2–3 d | **Yes — it makes existing floor statistics correct for the first time**, independent of any new UI |
| **1 — Headline + floor load** | Pipelines 1–2, `/summary` + `/floors` + `/alerts`, Zones 0, A, B, **C** | 3–4 d | ✅ **The bottleneck badge alone answers 5 of the 15 CEO questions** |
| **2 — Snapshots + trends** | 3 snapshot models, cron, backfill script, repair `FloorStatistics` writer, `/trends`, Zone D | 2–3 d | ✅ Trend, cycle time, "vs last month" |
| **3 — Quality** | Pipeline 5, `/quality`, Zone E (FPY, RTY, Pareto, M2 recovery, repair TAT) | 2–3 d | ✅ First honest yield number the company has had |
| **4 — Machines + people** | Pipelines 3–4, `/machines` + `/people` + `/yarn-readiness`, Zones F, G, I | 3–4 d | ✅ Capacity planning + the cross‑module yarn blocker |
| **5 — Ageing, articles, exceptions** | Pipeline 6, `/ageing` + `/articles` + `/exceptions`, Zones H, J, K | 2–3 d | ✅ Daily action list incl. the Data Integrity tab |
| **6 — Reconciliation + polish** | Zone L, export, **TV mode** (budget properly — factory wall display), print CSS, dark mode | 2–3 d | ✅ Trust + shop‑floor visibility |
| **7 — Hardening** | `explain()` audit, 10× load test, `ArticleLog` retention decision, Lighthouse, cache‑stampede verification | 2 d | Keeps it fast as logs grow |

**Total ≈ 18–25 working days** (≈ 15–22 if the shared layer already exists).

**Recommended build order across all three modules:** vendor → yarn → production. Production is the largest and has the most pre‑work; by the time you reach it the shared layer is mature and the `$facet` + snapshot + cache patterns are proven twice.

Phase 0 is worth doing **immediately regardless of whether the dashboard is approved** — it fixes live wrong data.

---

## 18. Open questions for the business

1. **Is there a production target?** Daily / monthly pairs. Zone A3 ("Output MTD vs Target") and the pace alert both need it. There is no target field anywhere in the schema today.
2. **Do production orders need a due date?** Without one, "overdue", OTIF, and "at‑risk orders" are impossible — the dashboard can only show *stalled*. This is the single highest‑value schema addition available (gap #2). Is the due date on the order, per article, or inherited from a sales order?
3. **Is there a link to a customer or sales order?** `customerId` / `customerOrderNumber` are indexed and selected but do not exist. If production is make‑to‑order, this link is essential and currently missing.
4. **Cost‑of‑quality constants.** To express M2/M3/M4 in rupees we need: rework cost per pair, downgrade loss per pair (M3), and full cost per pair (M4). Without these, quality stays in units only.
5. **Machine capacity semantics.** `capacityPerShift` and `capacityPerDay` exist — are they populated and trustworthy? How many shifts per day, and does that vary by floor? Zone F's "days of queue" depends entirely on this.
6. **Bottleneck definition.** Proposed: `remaining ÷ (7‑day avg completed)`. Does the plant think in days‑of‑backlog, or in absolute queued pairs? The badge should match how supervisors already talk.
7. **Supervisor visibility.** Should a floor supervisor see the cross‑floor people leaderboard (Zone G), or only their own floor? This is a management culture decision.
8. **Alert thresholds** (§8) — all placeholders based on typical apparel manufacturing. The production head must confirm, especially floor‑backlog days and machine‑idle hours.
9. **`ArticleLog` retention.** It grows on every quantity change across 12 floors with ~80 action types. Keep forever, archive after N months, or TTL? This determines whether Zone D/G stay fast in two years.
10. **Overproduction policy.** `updateCompletedQuantity` explicitly supports overproduction, so Zone L's residual can go negative. Is overproduction normal and expected, or should it itself be an alert?
11. **Are `machine-floor`, `warehouse`, and `quality-supervisor` screens alive?** Two are commented out of nav, one was never added (gap #13). Wire up or delete before the dashboard links anywhere.
12. **Fiscal year start** — April or January? Drives the "FY" preset (same question as the other two dashboards; answer once).

---

## Appendix A — Master KPI list

| # | KPI | Zone | Kind | Source |
|---|-----|------|------|--------|
| 1 | WIP pairs (all floors) | A/C | stock | Article |
| 2 | In‑container transit pairs | A/C | stock | ContainersMaster |
| 3 | Output today / MTD | A/D | flow | STN |
| 4 | Output vs target | A | flow | STN + config *(Q1)* |
| 5 | First‑pass yield % | A/E | flow | Article |
| 6 | Rolled throughput yield % | E | flow | Article |
| 7 | Avg / median / p90 cycle time | A/D | flow | Article `startedAt`→`completedAt` |
| 8 | Machine utilisation % | A/F | stock | Machine + MOA |
| 9 | Open orders + planned pairs | A/B | stock | ProductionOrder |
| 10 | Ready to dispatch pairs | A | stock | Article `FQ.dispatch.remaining` |
| 11 | Order status funnel (6) | B | mixed | ProductionOrder |
| 12 | Short‑closed pairs | B | flow | ProductionOrder + Article |
| 13 | Floor load × 9 cols × 12 floors | C | stock | Article + Containers |
| 14 | **Bottleneck floor + backlog days** | C | derived | Article |
| 15 | Oldest item age per floor | C | stock | `receivedData[].receivedTimestamp` |
| 16 | Median dwell time per floor | D | flow | `receivedData` timestamps |
| 17 | Throughput in vs out trend | D | flow | snapshots |
| 18 | WIP trend | D | stock | snapshots (required) |
| 19 | Little's Law residual | D | derived | snapshots |
| 20 | Defect rate per QC floor | E | flow | Article |
| 21 | Knitting M4 rate | E | flow | Article |
| 22 | Defect Pareto by floor | E | flow | Article |
| 23 | Open M2 count + pairs | E | stock | m2_logs |
| 24 | M2 recovery rate | E | flow | m2_logs |
| 25 | M2→M3 / M2→M4 split | E | flow | m2_logs |
| 26 | Repair TAT | E | flow | m2_logs |
| 27 | Repair rejected count | E/K | stock | Article `repairStatus` |
| 28 | M3 / M4 on hand vs outward | E | stock | Article + logs |
| 29 | Cost of quality ₹ | E | flow | derived *(Q4)* |
| 30 | Machines by status (4) | F | stock | Machine |
| 31 | Capacity vs load per machine | F | stock | Machine + MOA |
| 32 | Starved / overloaded machines | F/K | stock | Machine + MOA |
| 33 | Queue depth distribution | F | stock | MOA |
| 34 | Needle‑size mix | F | stock | MOA |
| 35 | Maintenance due / overdue | F/K | stock | Machine |
| 36 | Output per machine | F | flow | ArticleLog |
| 37 | Output per supervisor / shift | G | flow | ArticleLog |
| 38 | Defect rate by supervisor | G | flow | ArticleLog |
| 39 | Peak hour histogram | G | flow | ArticleLog |
| 40 | Data‑integrity actions per user | G/K | flow | ArticleLog |
| 41 | Stalled orders / articles buckets | H/K | stock | ProductionOrder + Article |
| 42 | Rows pending yarn issue + pairs | I/K | stock | MOA |
| 43 | Rows pending yarn return | I/K | stock | MOA |
| 44 | Yarn‑blocked machines | I | stock | MOA + Machine |
| 45 | Top / slowest / highest‑defect articles | J | mixed | Article |
| 46 | Brand & style treemap | J | stock | Article + STN |
| 47 | Linking‑type & branding‑type mix | J | mixed | Article |
| 48 | Fallback‑route article count | J | stock | derived *(gap #5)* |
| 49 | Data‑integrity violations | K | stock | Article invariants |
| 50 | Reconciliation identity + unaccounted | L | stock | multi |

---

## Appendix B — Files that will be touched

**Phase 0 repairs (do these regardless)**
```
src/services/production/report.service.js          // getProductionDashboard field refs
src/services/production/floor.service.js           // calculateRealTimeStatistics field refs
src/services/production/floorOrdersQuery.helper.js // remove 20 phantom select fields
src/models/production/productionOrder.model.js     // drop 3 dead indexes
src/scripts/purge-bad-floor-statistics.js          // NEW — remove cached zeros
```

**New (backend)**
```
src/routes/v1/productionDashboard.route.js
src/controllers/production/productionDashboard.controller.js
src/services/production/productionDashboard.service.js
src/services/production/productionDashboardPipelines.js     // the 6 $facet pipelines
src/services/production/productionDashboardSnapshot.service.js
src/models/production/productionDailySnapshot.model.js
src/models/production/productionFloorSnapshot.model.js
src/models/production/productionMachineSnapshot.model.js
src/cron/productionDailySnapshot.cron.js
src/validations/productionDashboard.validation.js
src/scripts/add-production-dashboard-indexes.js
src/scripts/backfill-production-dashboard-snapshots.js
```

**Modified (backend)**
```
src/routes/v1/production.route.js   // mount /dashboard-v2; deprecate /dashboard
src/index.js                        // register the cron
src/models/production/index.js      // export the 3 new models
```

**New (frontend)** — `app/production/page.tsx` (does not exist today) + the `app/production/command/` tree from §13.

**Modified (frontend)**
```
shared/layout-components/sidebar/nav.tsx           // "Dashboard" as first Production Planning child
shared/contextapi/navigationContext.tsx            // add 'Dashboard' key to 'Production Planning'
app/production/floor-supervisor/*/page.tsx         // accept URL filter params for drill-down
app/production/supervisor/page.tsx                 // same
```

---

*Document version 1.0 · 2026‑08‑22 · Analysis based on a full read of the production module: 18 frontend routes (~42,000 LOC), 14 backend models (~5,600 LOC), 18 backend services (~10,000 LOC), 73 API routes, and the existing (broken) dashboard/statistics services.*
