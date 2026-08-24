# Master Catalog — CEO Command Dashboard
### End‑to‑end analysis, KPI specification, and high‑performance build plan

> **Target route:** `/catalog` — **this route has no `page.tsx`, and the sidebar group has no `path` at all.** "Master Catalog" is a `type: "sub"` node with `children` but no landing URL, so there is literally nowhere to go.
> **Status:** Planning / brainstorming document. No code written yet.
> **Audience:** CEO + COO + Head of Product/Merchandising + Data Owner. Secondary: every module owner, because they all consume this data.
> **Core promise:** *One page tells the CEO whether the factory's reference data is complete, consistent, and actually being used — and exactly which broken records are silently degrading production, yarn, vendor and warehouse.*
> **Companion docs:** `app/vendor-po/docs/VENDOR_DASHBOARD_PLAN.md`, `app/yarn-management/docs/YARN_DASHBOARD_PLAN.md`, `app/production/docs/PRODUCTION_DASHBOARD_PLAN.md`. Same envelope, same caching, same shared component layer.

---

## Table of contents

1. [Why this dashboard is different](#1-why-this-dashboard-is-different)
2. [Complete master catalog map](#2-complete-master-catalog-map)
3. [The dependency graph — who consumes what](#3-the-dependency-graph--who-consumes-what)
4. [The 12 questions a CEO actually asks](#4-the-12-questions-a-ceo-actually-asks)
5. [Dashboard information architecture](#5-dashboard-information-architecture)
6. [Section‑by‑section KPI specification](#6-section-by-section-kpi-specification)
7. [The Catalog Health Score](#7-the-catalog-health-score)
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

## 1. Why this dashboard is different

The other three dashboards measure **flow** — pairs moving, kilograms consumed, rupees committed. Master Catalog has no flow. It is the **reference data layer that every other module reads from**, and it produces exactly one thing: *trust*.

So the KPIs are a different species:

| Vendor / Yarn / Production ask | Master Catalog asks |
|---|---|
| How much moved? | How much **exists**, and is it **correct**? |
| Where's the bottleneck? | Where are the **broken links**? |
| What's it worth? | What's **actually used** vs dead weight? |
| Who's late? | Who **changed** master data, and when? |
| Is quality slipping? | Is **completeness** slipping? |

**Why a CEO should care.** Master data failures are invisible until they aren't. Three concrete, verified examples from this codebase:

1. **A `Product` with an empty `processes[]` breaks production routing.** `article.model.js:733` calls `getFloorOrderFromProduct()`, which throws when processes are missing — and the catch block logs a `console.warn` and **silently falls back** to a linking‑type default route. The article then runs a route nobody chose. Nothing surfaces this.

2. **A `Product` with an empty `bom[]` breaks yarn estimation.** No BOM, no estimate, no requisition signal.

3. **Legacy `Product.styleCodes[]` contain embedded objects instead of ObjectIds.** `product.service.js:240` explicitly refuses to populate them — the comment reads *"intentionally skip forcing styleCodes to avoid casting legacy embedded objects."* Every downstream style lookup on those records is degraded, permanently and quietly.

None of these produce an error anyone sees. They produce *slightly wrong output forever*. That is what this dashboard exists to catch.

**Scope note:** the "Master Catalog" nav group spans two directory trees — `/catalog/*` (11 screens) **and** `/yarn-management/cataloguing` + `/yarn-management/yarn-master/*` (6 screens). The dashboard covers all 17, even though six live under a different URL prefix.

---

## 2. Complete master catalog map

### 2.1 Frontend routes

| # | Route | LOC | Entity | In sidebar? |
|---|-------|-----|--------|-------------|
| — | `/catalog` | — | **No `page.tsx`; nav group has no `path`** | ⚠️ group only |
| 1 | `/catalog/items` (+ `add`, `[id]/edit`) | 2870 / 1564 / 1706 | **`Product`** — the hub | ✅ |
| 2 | `/catalog/categories` (+ `add`, `edit`) | 565 | `Category` (self‑referencing tree) | ✅ |
| 3 | `/catalog/raw-material` (+ `add`, `edit`) | 560 | `RawMaterial` | ✅ |
| 4 | `/catalog/processes` (+ `add`, `edit`) | 589 | `Process` (+ `steps[]` with durations) | ✅ |
| 5 | `/catalog/attributes` (+ `add`, `edit`) | 557 | `ProductAttribute` | ✅ |
| 6 | `/catalog/style-codes` (+ `add`, `[id]/edit`) | 666 | `StyleCode` | ✅ |
| 7 | `/catalog/style-code-pairs` (+ `add`, `[id]/edit`) | 746 | `StyleCodePairs` | ✅ |
| 8 | `/catalog/machines` (+ `add`, `edit/[id]`) | 726 | `Machine` | ✅ |
| 9 | `/catalog/needle-configuration` | 322 | `MachineOrderAssignment` (**not a master — it's live planning data**) | ✅ |
| 10 | `/catalog/team-master` (+ `add`, `[id]/edit`) | 664 | `TeamMaster` | ✅ |
| 11 | `/catalog/containers-master` | 1117 | `ContainersMaster` | ✅ |
| 12 | `/yarn-management/cataloguing` (+ `add`, `edit`) | — | `YarnCatalog` | ✅ (under Master Catalog) |
| 13–17 | `/yarn-management/yarn-master/{brand,yarn-type,count-size,color,blend}` | — | `Supplier` brands, `YarnType`, `CountSize`, `Color`, `Blend` | ✅ (under Master Catalog) |

**~21,600 LOC** across `/catalog` alone.

### 2.2 Backend models

| Model | Fields that matter for governance |
|-------|----------------------------------|
| **`Product`** (146 LOC) | `name`*, `softwareCode` (unique), `internalCode`, **`vendorCode`**, **`factoryCode`**, `knittingCode`, `styleCodes[]`→StyleCode, `productionType(internal\|outsourced)`*, `description`, **`category`***→Category, `image`, **`attributes`** (`Map<String,String>`), **`bom[]`**{yarnCatalogId→YarnCatalog, yarnName, quantity}, **`processes[]`**{processId→Process}, **`rawMaterials[]`**{rawMaterialId→RawMaterial, quantity}, `status(active\|inactive)`, timestamps |
| `Category` (44) | `name`*, `parent`→Category (**self‑referencing tree, no depth limit**), `description`, `image`, `sortOrder`, `status` |
| `RawMaterial` (32) | **15 required string fields**: `name`, `groupName`, `type`, `description`, `brand`, `countSize`, `material`, `color`, `shade`, `unit`, `mrp`, `hsnCode`, `gst`, `articleNo` + optional `image`. **No `status` field** |
| `Process` (69) | `name`*, `type`*, `description`*, `sortOrder`, `status`, `image`, **`steps[]`**{stepTitle*, stepDescription*, **`duration`** (minutes)*} |
| `ProductAttribute` (53) | `name`*, **`attributeType(Manufacturing\|Warehouse)`**, `type(select\|radio\|checkbox\|text\|textarea)`*, `sortOrder`, `optionValues[]`{name*, image, sortOrder} |
| `StyleCode` (52) | `styleCode`* (unique), `eanCode`*, **`mrp`*** (Number), `brand`, `pack` (String), `status`, `bom[]`{rawMaterial→RawMaterial, quantity} |
| `StyleCodePairs` (51) | `pairStyleCode`* (unique), `eanCode`*, `mrp`*, **`pack`* (Number)**, `status`, `styleCodes[]`→StyleCode, `bom[]`{rawMaterial, quantity} |
| `Machine` (163) | `machineCode` (unique), `machineNumber` (unique), **`needleSizeConfig[]`**{needleSize, cutoffQuantity}, `model`, `floor`, `company`, `machineType`, `status(Active\|Under Maintenance\|Idle)`, `assignedSupervisor`→User, **`capacityPerShift`**, **`capacityPerDay`**, `installationDate`, `maintenanceRequirement(1\|3\|6\|12 months)`, `lastMaintenanceDate`, `nextMaintenanceDate`, `maintenanceNotes`, `isActive` |
| `TeamMaster` (97) | `teamMemberName`*, `contactNumber`, **`workingFloor`*** (ProductionFloor enum), `myTeam[]`→TeamMaster, `role(Supervisor\|Team Member)`*, `status(Active\|Inactive)`*, `barcode` (= `_id`), `articleData[]`, `logs[]` (**`Mixed`, unbounded**) |
| `ContainersMaster` (150) | `containerName`, `barcode` (= `_id`), `status(Active\|Inactive)`, `activeFloor` (**free text**), `activeItems[]`{article \| vendorProductionFlow, quantity, transferItems[]}, `type(bag\|bigContainer\|container)`, `tearWeight`, virtual `contentDomain` |
| `YarnCatalog` (677) | `yarnName`, embedded `yarnType`/`yarnSubtype`/`countSize`/`blend`/`colorFamily`, `pantonShade`, `pantonName`, `season`, `gst`, `hsnCode`, **`minQuantity`**, `linking`, `sampling`, `status(active\|inactive\|suspended)` |
| `Supplier` (493) | `brandName`, contacts, `city`/`state`/`gstNo`, `yarnDetails[]`{yarnCatalogId, tearweight}, `status` |
| `YarnType` / `CountSize` / `Color` / `Blend` | `name`, `status(active\|inactive\|deleted)` (+ `colorCode`, `pantoneName` on Color; `subtype`/`countSize` on YarnType) |

`*` = required

### 2.3 Backend API surface

```
/v1/products            /  /:id  /debug  /by-code  /by-factory-codes
                        /style-codes-by-vendor-code
                        /bulk-import  /bulk-upsert  /bulk-export
/v1/categories          /  /:id
/v1/raw-materials       /  /:id
/v1/processes           /  /:id
/v1/product-attributes  /  /:id
/v1/style-codes         /  /:id  /bulk-import  /bulk-sync  /bulk-import-bom
/v1/style-code-pairs    /  /:id  /bulk-import  /bulk-import-bom
/v1/machines            /  /:id  /statistics  /status  /floor  /maintenance-due
                        /supervisor/:id  /:id/{status,maintenance,assign-supervisor}
                        /:id/{usage-analytics,current-status,workload,performance-metrics}
                        /usage-overview  /bulk-import  /bulk-delete
/v1/team-masters        /  /:id  /barcode/:barcode  /:id/active-article[/:articleId]
/v1/containers-masters  /  /:id  /bulk  /naming-patterns  /reset-active
                        /barcode/:barcode[/accept|/clear-active|/with-articles]
                        /by-floor/:activeFloor/with-articles  /:id/with-articles
/v1/yarn-management/{yarn-catalogs,suppliers,yarn-types,count-sizes,colors,blends}
```

**What already exists that we reuse:** `GET /machines/statistics` (total / active / maintenance / idle / maintenance‑due counts) and `GET /machines/usage-overview`. Everything else is new.

---

## 3. The dependency graph — who consumes what

This is the single most important diagram in this document. **Master Catalog is the root of the system.** A defect here propagates everywhere.

```
                        ┌─────────────────┐
                        │    Category     │──self-ref tree
                        └────────┬────────┘
                                 │ required
┌──────────┐  processes[] ┌──────▼──────────────────────────┐
│ Process  │◄─────────────│                                 │
└──────────┘              │                                 │
┌──────────┐ rawMaterials[]│         P R O D U C T           │
│RawMaterial│◄─────────────│         (the hub)               │
└─────┬────┘              │                                 │
      │ bom[]             │  factoryCode ─┐  vendorCode ─┐   │
┌─────▼────┐ styleCodes[] │  softwareCode │  attributes  │   │
│StyleCode │◄─────────────│  bom[] ───────┼──────────┐   │   │
└─────┬────┘              └───────────────┼──────────┼───┼───┘
      │                                   │          │   │
┌─────▼──────────┐              ┌─────────▼───┐      │   │
│ StyleCodePairs │              │ YarnCatalog │◄─────┘   │
└─────┬──────────┘              └──────┬──────┘          │
      │                                │                 │
      ▼                                ▼                 ▼
┌───────────────┐  ┌──────────────────────┐  ┌────────────────────────┐
│     WHMS      │  │    YARN MODULE       │  │    VENDOR MODULE       │
│ warehouse-    │  │ YarnPurchaseOrder    │  │ VendorPurchaseOrder    │
│  Inventory    │  │ YarnBox / YarnCone   │  │ VendorBox / GRN        │
│ pickList      │  │ YarnRequisition      │  │ VendorProductionFlow   │
│ whmsOrder     │  │ YarnTransaction      │  │ VendorManagement       │
│ inwardRecord  │  │ Supplier.yarnDetails │  │ PoReturnChallan        │
└───────────────┘  └──────────────────────┘  └────────────────────────┘

┌──────────┐                    ┌──────────────────┐
│ Machine  │───────────────────►│ PRODUCTION       │
└──────────┘  machineId         │ Article          │
┌──────────┐  workingFloor      │ MachineOrder-    │
│TeamMaster│───────────────────►│   Assignment     │
└──────────┘  floorSupervisorId │ ArticleLog       │
┌──────────────┐ activeItems[]  │ + VENDOR flows   │
│ContainersM.  │───────────────►│ (shared)         │
└──────────────┘                └──────────────────┘

  Product.factoryCode ═══► Article.articleNumber  (production floor ROUTING)
  Product.processes[] ═══► the per-article floor route itself
  Product.bom[]       ═══► yarn estimation & requisition
  Product.vendorCode  ═══► vendor article identification
```

**Verified consumers** (from `ref:` declarations across the model layer):

| Master entity | Referenced by |
|---|---|
| `Product` | 13 models: `sales`, `forecast`, `replenishment`, `whms/inwardRecord`, `whms/whmsOrder`, `whms/warehouseInventory`, and 7 vendorManagement models |
| `StyleCode` | 6 models: `styleCodePairs`, `product`, `whms/pickList`, `whms/pickListBatch`, `whms/warehouseInventory`, `whms/warehouseInventoryLog` |
| `RawMaterial` | 3: `product`, `styleCode`, `styleCodePairs` |
| `Category` | 2: `product`, `category` (self) |
| `Process` | 1: `product` — **but that one reference determines every production floor route** |
| `Machine` | 3: `production/article`, `production/machineOrderAssignment`, `yarnReq/yarnTransaction` |
| `YarnCatalog` | the entire yarn module + `Product.bom` |

**The asymmetry worth putting in front of a CEO:** `Process` is referenced by exactly one field on one model — and that field silently decides which of 12 floors every single pair travels through. Low reference count, maximum blast radius.

---

## 4. The 12 questions a CEO actually asks

| # | Question | Zone |
|---|----------|------|
| 1 | How big is my catalog, and is it growing or bloating? | A + D |
| 2 | Is my master data **complete** — or full of half‑filled records? | B |
| 3 | What's **broken** right now — orphans, dangling references, duplicates? | C + K |
| 4 | Which items are **actually used**, and which are dead weight? | E |
| 5 | Are products correctly wired for production (processes + BOM)? | B + C |
| 6 | Is pricing (MRP) consistent between style codes and pairs? | F |
| 7 | Are my machines configured and maintained? | G |
| 8 | Do I have the right people mapped to the right floors? | H |
| 9 | Who is changing master data, and how often? | I |
| 10 | Is the catalog getting healthier or worse over time? | D + Health Score |
| 11 | Which single fix would unblock the most downstream records? | K |
| 12 | Can I trust the numbers on the other three dashboards? | Health Score |

Question 12 is the real one. **This dashboard is the credibility layer for the other three.**

---

## 5. Dashboard information architecture

```
╔══════════════════════════════════════════════════════════════════════════╗
║  HEADER  Master Catalog Command Center                                   ║
║  [Entity ▾][Category ▾][Status ▾][Date ▾]  As of 14:32 ●  [Export]       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ⓘ ZONE 0 — ALERT RIBBON                                                 ║
║  🔴 84 products have no processes  🔴 12 dangling style refs             ║
║  🟠 31 products no BOM  🟠 7 duplicate EANs  🟡 19 machines no capacity  ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ZONE A — CATALOG SCALE (12 entity count cards + active/inactive split)  ║
║  Products │ StyleCodes │ Pairs │ Categories │ RawMaterials │ Processes   ║
║  Attributes │ Machines │ TeamMembers │ Containers │ YarnCatalog │ Suppl. ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ★ ZONE B — CATALOG HEALTH SCORE (0–100) + 6 completeness gauges         ║
║     Identity · Classification · Production-ready · Yarn-ready ·          ║
║     Commercial-ready · Media                                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ★ ZONE C — INTEGRITY MATRIX  (the broken-links table)                   ║
║  Rule │ Entity │ Broken │ % │ Blast radius │ Severity │ Fix →            ║
╠═══════════════════════════════════╦══════════════════════════════════════╣
║  ZONE D — GROWTH & CHURN TREND    ║  ZONE E — USAGE / DEAD DATA          ║
║  records created/updated per       ║  used vs never-referenced per entity ║
║  entity over time + health trend   ║  "dead catalog" list + last-used     ║
╠═══════════════════════════════════╬══════════════════════════════════════╣
║  ZONE F — COMMERCIAL CONSISTENCY  ║  ZONE G — MACHINE MASTER HEALTH      ║
║  MRP bands, EAN dupes, pack        ║  status mix, capacity filled,        ║
║  mismatch, style↔pair coherence    ║  needle config, maintenance calendar ║
╠═══════════════════════════════════╬══════════════════════════════════════╣
║  ZONE H — PEOPLE & CONTAINERS     ║  ZONE I — CHANGE ACTIVITY            ║
║  team by floor/role, supervisor    ║  who changed what, bulk-import runs, ║
║  coverage; container fleet by type ║  edit heatmap, stale records         ║
╠═══════════════════════════════════╩══════════════════════════════════════╣
║  ZONE J — STRUCTURE EXPLORER                                             ║
║  Category tree (depth, fan-out, empties) · Attribute coverage matrix ·   ║
║  Process step-duration ladder                                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ZONE K — REMEDIATION WORKLIST (tabbed, virtualised, ranked by impact)   ║
║  [No Processes][No BOM][Dangling Refs][Duplicates][Missing Codes]        ║
║  [Orphans][No Category][Attribute Gaps][Machine Config][Stale]           ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ZONE L — CROSS-MODULE READINESS (collapsed)                             ║
║  Can Production route? Can Yarn estimate? Can Vendor identify?           ║
║  Can WHMS pick? — a green/red readiness bar per downstream module        ║
╚══════════════════════════════════════════════════════════════════════════╝
```

Zones B, C and L are the ones that don't exist in any other dashboard. They are the reason to build this one.

---

## 6. Section‑by‑section KPI specification

### ZONE A — Catalog scale (12 cards)

Each card: **total · active / inactive split · Δ vs previous period · sparkline of record count**.

| # | Entity | Count | Extra |
|---|--------|-------|-------|
| A1 | Products | `Product.countDocuments()` | active/inactive; internal vs outsourced split |
| A2 | Style Codes | `StyleCode` | active/inactive; distinct brands |
| A3 | Style Code Pairs | `StyleCodePairs` | avg `pack` size |
| A4 | Categories | `Category` | tree depth, leaf count |
| A5 | Raw Materials | `RawMaterial` | distinct `groupName` |
| A6 | Processes | `Process` | active; total defined steps |
| A7 | Attributes | `ProductAttribute` | Manufacturing vs Warehouse split; total option values |
| A8 | Machines | `Machine where isActive` | Active / Idle / Under Maintenance |
| A9 | Team Members | `TeamMaster` | Supervisors vs Members; Active/Inactive |
| A10 | Containers | `ContainersMaster` | by `type` (bag/bigContainer/container); Active/Inactive |
| A11 | Yarn Catalog | `YarnCatalog` | active/inactive/suspended |
| A12 | Suppliers / Brands | `Supplier` | active; distinct brands |

**Growth vs bloat framing:** show *active* prominently and *inactive* muted. A catalog that grows only in inactive records is bloating, not growing — say so with an explicit "active share %" chip.

### ZONE B — Catalog Health Score + 6 completeness gauges ★

Six radial gauges, each a **% of Products passing** that dimension. See §7 for how they roll into one score.

| Gauge | Passing condition | Why it matters |
|-------|-------------------|----------------|
| **1. Identity** | `name` **and** `softwareCode` **and** (`factoryCode` **or** `internalCode`) present | Without `factoryCode`, production cannot match `Article.articleNumber` to a product |
| **2. Classification** | `category` set **and** resolves to an existing, `active` Category | Required field, but the *reference can still dangle* |
| **3. Production‑ready** | `processes[]` non‑empty **and** every `processId` resolves **and** every process maps to a known floor | **Empty ⇒ silent fallback route** (`article.model.js:787`) |
| **4. Yarn‑ready** | `bom[]` non‑empty **and** every `yarnCatalogId` resolves **and** every `quantity > 0` | Empty ⇒ no yarn estimate, no requisition signal |
| **5. Commercial‑ready** | `styleCodes[]` non‑empty **and** all are ObjectIds that resolve **and** each has `eanCode` + `mrp > 0` | Empty or legacy‑embedded ⇒ WHMS can't pick |
| **6. Media & description** | `image` present **and** `description` non‑empty | Cosmetic, lowest weight — but it's what a buyer sees |

Each gauge is clickable → the matching Zone K tab, pre‑filtered.

**Also in Zone B — a per‑entity completeness bar** (not just Products):

| Entity | Completeness rule |
|--------|-------------------|
| StyleCode | `eanCode` ≠ '' **and** `mrp > 0` **and** `brand` ≠ '' **and** `pack` ≠ '' |
| StyleCodePairs | `styleCodes[]` non‑empty **and** all resolve **and** `pack ≥ 1` |
| RawMaterial | all 14 required strings non‑empty and not placeholder (`'-'`, `'N/A'`, `'0'`) |
| Process | `steps[]` non‑empty **and** every `duration > 0` |
| ProductAttribute | `optionValues[]` non‑empty when `type ∈ {select, radio, checkbox}` |
| Machine | `machineCode` + `machineNumber` + `floor` + `capacityPerDay > 0` + `needleSizeConfig[]` non‑empty |
| TeamMaster | `contactNumber` present; Supervisors have non‑empty `myTeam[]` |
| YarnCatalog | `yarnName` + `hsnCode` + `gst` + **`minQuantity`** present |

> The `RawMaterial` rule needs the placeholder check because **all 14 fields are `required: true`** — so a record can never be *missing* a field, only filled with junk. Required‑field validation gives false confidence; only a content rule finds the real gaps.

### ZONE C — Integrity matrix ★

A single ranked table. Every row is a **machine‑checkable rule**, its violation count, and — crucially — its **blast radius**: how many downstream records are affected.

| # | Rule | Check | Severity | Blast radius |
|---|------|-------|----------|--------------|
| C1 | Product → Category dangling | `category` set but no matching `Category._id` | 🔴 | that product everywhere |
| C2 | Product → Process dangling | any `processes[].processId` unresolvable | 🔴 | **every Article of that product routes on fallback** |
| C3 | Product → RawMaterial dangling | any `rawMaterials[].rawMaterialId` unresolvable | 🟠 | costing |
| C4 | Product → YarnCatalog dangling | any `bom[].yarnCatalogId` unresolvable | 🔴 | yarn estimation + requisition |
| C5 | **Product → StyleCode non‑ObjectId** | `styleCodes[]` element is an embedded object, not an ObjectId | 🔴 | WHMS pick, style lookup — **known legacy issue, see gap #1** |
| C6 | Product → StyleCode dangling | ObjectId present but no matching StyleCode | 🔴 | WHMS |
| C7 | StyleCodePairs → StyleCode dangling | any `styleCodes[]` unresolvable | 🟠 | pack pricing |
| C8 | StyleCode/Pairs → RawMaterial dangling | any `bom[].rawMaterial` unresolvable | 🟠 | costing |
| C9 | Category cycle / orphan parent | `parent` unresolvable, or a cycle in the tree | 🔴 | breaks every tree render |
| C10 | **Duplicate `factoryCode`** | same non‑empty `factoryCode` on 2+ products | 🔴 | **production matches the wrong product** |
| C11 | Duplicate `vendorCode` | same non‑empty `vendorCode` on 2+ products | 🟠 | vendor mis‑identification |
| C12 | Duplicate `eanCode` | across StyleCode ∪ StyleCodePairs | 🔴 | scanning ambiguity in WHMS |
| C13 | Duplicate `internalCode` / `knittingCode` | same non‑empty value on 2+ | 🟡 | search noise |
| C14 | **Attribute key not in master** | a key in `Product.attributes` Map matching no `ProductAttribute.name` | 🟠 | free‑text drift; filters silently miss |
| C15 | Attribute value not in options | value not in that attribute's `optionValues[]` (for select/radio/checkbox) | 🟠 | same |
| C16 | Active product, inactive dependency | `status='active'` but its Category / Process / StyleCode is `inactive` | 🟠 | half‑disabled records |
| C17 | Machine duplicate/missing code | `machineCode` or `machineNumber` empty or duplicated | 🟠 | assignment ambiguity |
| C18 | TeamMaster invalid floor | `workingFloor` not in the `ProductionFloor` enum | 🟡 | supervisor analytics |
| C19 | Container invalid `activeFloor` | free‑text value matching no known floor label | 🟠 | **in‑transit WIP silently drops** on the production & vendor dashboards |
| C20 | Container mixed domain | `activeItems[]` holds both `article` and `vendorProductionFlow` rows | 🔴 | cross‑contamination between modules |
| C21 | Product with zero BOM quantity | `bom[]` rows where `quantity` is 0 or null | 🟠 | estimate = 0 |
| C22 | Process step zero duration | `steps[].duration ≤ 0` | 🟡 | capacity planning |

Each row links to the matching Zone K tab. Sort default: **blast radius × severity**, so the top row is always the single most valuable fix.

### ZONE D — Growth & churn trend

- **Records created per entity per month** (stacked bars, 12 m) — from `createdAt`.
- **Records updated per entity per month** — from `updatedAt`. *Churn without growth = maintenance; growth without churn = a catalog nobody curates.*
- **Health Score trend line** (needs the snapshot, §13) — the single line that says "are we getting better".
- **Bulk‑import events**: count and rows processed, from the `/bulk-import` / `/bulk-upsert` endpoints (**requires an audit record — see gap #6**). Bulk imports are the #1 way bad master data enters a system.
- **Active share %** per entity over time.

### ZONE E — Usage / dead data

This is where the CEO finds money. A record that exists but is never referenced costs storage, dropdown clutter, and decision time.

| Metric | Definition |
|--------|-----------|
| **Products used** | referenced by ≥1 `Article`, `VendorPurchaseOrder.poItems`, `whms/warehouseInventory`, or `sales` |
| **Products never used** | the complement — **"dead catalog"** |
| Last used date | max timestamp across those references |
| Style codes never used | not in any `Product.styleCodes` and not in WHMS inventory/picklist |
| Raw materials never used | not in any `Product.rawMaterials` / `StyleCode.bom` / `StyleCodePairs.bom` |
| Processes never used | not in any `Product.processes` |
| **Attributes never used** | attribute name never appears as a key in any `Product.attributes` |
| Attribute option values never used | per‑attribute, which options nobody ever picks |
| Categories with zero products | leaf categories nobody files under |
| Yarn catalog never purchased | no `YarnPurchaseOrder.poItems.yarnCatalogId` reference ever |
| Machines never assigned | no `MachineOrderAssignment` and no `Article.machineId` ever |
| Containers never used | no `activeItems` history |
| Team members never logged | `TeamMaster._id` never appears as `ArticleLog.floorSupervisorId` |

Present as a **used vs unused stacked bar per entity**, plus a "Top 50 dead records by age" table.

> **Nuance to state in the UI:** *never used* ≠ *delete me*. A newly created product is legitimately unused. Always pair with **age**: "unused **and** older than 180 days" is the actionable set. Make the age threshold a visible control, not a hidden constant.

### ZONE F — Commercial consistency

| Metric | Formula / check |
|--------|-----------------|
| MRP distribution | histogram of `StyleCode.mrp`; flag `mrp = 0` and outliers beyond p99 |
| **Pair MRP coherence** | `StyleCodePairs.mrp` vs `Σ(member StyleCode.mrp)` — flag when the pair costs more than its parts, or is discounted beyond a threshold |
| **Pack count mismatch** | `StyleCodePairs.pack` (Number) vs `styleCodes[].length` — should agree |
| Duplicate EAN | across StyleCode ∪ StyleCodePairs (C12) |
| Missing EAN | `eanCode` empty on either |
| Brand coverage | products/style codes per brand; **unbranded count** |
| MRP not set | `mrp = 0` or null |
| HSN/GST coverage | `RawMaterial.hsnCode`/`gst` and `YarnCatalog.hsnCode`/`gst` — **a compliance exposure, not a nicety** |
| Products by `productionType` | internal vs outsourced split; outsourced products missing `vendorCode` |

> `StyleCode.pack` is a **String** while `StyleCodePairs.pack` is a **Number**. Any comparison must normalise; a naive `===` silently never matches (gap #4).

### ZONE G — Machine master health

Reuses `GET /machines/statistics` for the counts, adds the governance layer.

| Metric | Formula |
|--------|---------|
| Status mix | Active / Idle / Under Maintenance / inactive |
| **Capacity configured %** | `count(capacityPerDay > 0) / total` |
| **Needle config coverage %** | `count(needleSizeConfig[] non-empty) / total` |
| Supervisor assigned % | `count(assignedSupervisor ≠ null) / total` |
| Machines by floor | bar; flag machines with a `floor` value not in the `ProductionFloor` enum |
| Machines by model / company / type | mix bars |
| **Maintenance calendar** | overdue · due ≤7 d · due ≤30 d · scheduled, from `nextMaintenanceDate` |
| **Maintenance schedule missing** | `maintenanceRequirement` or `nextMaintenanceDate` unset |
| Age distribution | `now − installationDate` buckets |
| Needle‑size inventory | distinct needle sizes × machine count — is the plant's needle mix concentrated or fragmented? |
| Total nameplate capacity | `Σ capacityPerDay` over Active machines — **the theoretical ceiling of the whole factory**, and nothing displays it today |

### ZONE H — People & containers

**Team Master:**

| Metric | Formula |
|--------|---------|
| Members by floor | bar across the 12 `ProductionFloor` values |
| Supervisors vs members | count + ratio |
| **Floors with no supervisor** | 🔴 — a floor nobody owns |
| **Span of control** | `myTeam[].length` per supervisor: avg, max, and supervisors with an empty team |
| Members not in any `myTeam` | unmanaged people |
| Contact coverage % | `contactNumber` present |
| Active / Inactive split | |

**Containers Master:**

| Metric | Formula |
|--------|---------|
| Fleet by `type` | bag (1–300) / bigContainer (301–500) / container (501+) |
| Active vs Inactive | |
| **In use vs idle** | `activeItems[]` non‑empty vs empty |
| By `contentDomain` | article / vendor / mixed / empty (uses the existing virtual) |
| **By `activeFloor`** | distribution + **unrecognised floor labels** (C19) |
| Tear‑weight configured % | `tearWeight > 0` |

### ZONE I — Change activity

| Metric | Source |
|--------|--------|
| Records created / updated per entity per week | `createdAt` / `updatedAt` |
| **Edit heatmap** | entity × week, colour = change volume |
| **Stale records** | `updatedAt < now − 365 d` per entity — never reviewed |
| Most‑edited records | top 20 by edit count *(needs an audit trail — gap #6)* |
| **Who changed what** | `UserActivityLog` if it covers catalog routes — otherwise a stated gap |
| Bulk‑import runs | count, rows, created/updated/failed *(gap #6)* |

> Product, Category, RawMaterial, Process, ProductAttribute, StyleCode, StyleCodePairs and Machine have **no `createdBy` / `lastModifiedBy` fields**. Only `ProductionOrder` has them. So "who changed it" is answerable only if `UserActivityLog` middleware covers these routes — verify before promising the KPI (Q5).

### ZONE J — Structure explorer

**J1 — Category tree.** Interactive tree with per‑node product counts. Metrics: max depth, avg fan‑out, leaf count, **empty leaves**, orphaned parents, cycles. The `Category.parent` field has **no depth limit and no cycle guard** — a 40‑level tree or a loop is schema‑legal.

**J2 — Attribute coverage matrix.** Rows = `ProductAttribute` names, columns = coverage %, distinct values used, option values never chosen, and **free‑text values not in the option list**. Because `Product.attributes` is a `Map<String,String>`, *any* key and *any* value is accepted — this matrix is the only place drift becomes visible.

**J3 — Process step ladder.** Per process: step count and `Σ duration` (minutes). Ranked bar of total theoretical process time. Flags: processes with no steps, steps with zero duration, and processes whose `name`/`type` **does not map to any production floor** via `mapProcessToFloor` — those are precisely the ones that trigger the silent fallback route.

### ZONE K — Remediation worklist (tabbed, ≤50 rows, ranked by blast radius)

| Tab | Query | Row shows |
|-----|-------|-----------|
| **No processes** | `Product.processes` empty or all unresolvable | code, name, category, # articles affected |
| **No BOM** | `Product.bom` empty or all `quantity ≤ 0` | code, name, # POs affected |
| **Dangling refs** | any of C1–C8 | entity, id, field, broken target |
| **Legacy style refs** | C5 — `styleCodes[]` element not an ObjectId | product code, raw value |
| **Duplicates** | C10–C13 | code value, colliding record ids |
| **Missing codes** | no `factoryCode` **and** no `internalCode` | name, category |
| **No category** | `category` null or dangling | |
| **Attribute gaps** | C14–C15 | product, key, value, nearest master match |
| **Machine config** | no capacity / no needle config / no floor | machineCode |
| **Maintenance overdue** | `nextMaintenanceDate < now` | machineCode, days overdue |
| **Unsupervised floors** | floors with no `TeamMaster` Supervisor | floor |
| **Dead records** | never referenced **and** older than N days | entity, code, age |
| **Stale records** | `updatedAt < now − 365 d` | entity, code, last touched |

Every row gets a **"Fix →"** deep link into the existing edit screen, and — where the fix is mechanical and unambiguous — an optional **bulk‑fix action** (Q7 gates whether we ship write actions at all).

### ZONE L — Cross‑module readiness (collapsed)

Four readiness bars. Each answers: *of the products this module needs, how many are actually usable?*

| Module | Ready when | Bar shows |
|--------|-----------|-----------|
| **Production can route** | `processes[]` non‑empty, all resolve, all map to a floor | % of products with ≥1 Article |
| **Yarn can estimate** | `bom[]` non‑empty, all `yarnCatalogId` resolve, all `quantity > 0` | % of products in active orders |
| **Vendor can identify** | `vendorCode` present and unique | % of `outsourced` products |
| **WHMS can pick** | `styleCodes[]` non‑empty, all ObjectIds resolve, each has `eanCode` + `mrp > 0` | % of products in warehouse inventory |

> Scope each bar to **products the module actually uses**, not the whole catalog. "60% of all products lack a BOM" is noise if 55% of them are discontinued. "12% of products in active production orders lack a BOM" is an emergency.

---

## 7. The Catalog Health Score

One number, 0–100, on the header. It's what makes the dashboard glanceable and what Zone D trends.

```
Health = 30 × Integrity        (1 − weighted violations ÷ total records)
       + 25 × Completeness     (weighted mean of the 6 Zone-B gauges)
       + 20 × Readiness        (mean of the 4 Zone-L bars)
       + 15 × Freshness        (share of records updated within 365 days)
       + 10 × Utilisation      (share of records referenced at least once)
```

**Integrity sub‑weighting** — a dangling `processId` is not the same as a missing image:

```
critical (🔴) violation = 1.0
major    (🟠)           = 0.4
minor    (🟡)           = 0.1
```

Bands: **≥85 Healthy** (green) · **70–84 Needs attention** (amber) · **<70 At risk** (red).

Beside the score, always show:
- **Δ vs last month** — the direction matters more than the level.
- **"Biggest lever"** — the single rule whose fix would raise the score most, computed as `Δscore per record fixed × record count`. This turns a vanity metric into a work order.

> Weights are a **proposal**. They must be signed off (Q1) — a company mid‑ERP‑migration may rationally weight Completeness above Integrity for a quarter, then flip.

---

## 8. Chart & visualisation catalogue

Library: **ApexCharts via `react-apexcharts`** (`^3.49.1`) through the existing `shared/components/SafeChart.tsx`. **No second chart library.**

| Zone | Chart | Apex type | Note |
|------|-------|-----------|------|
| Header | Health gauge | `radialBar` | single value + band colour |
| A | 12 count cards + sparklines | `line` | `sparkline.enabled`, 12 pts |
| B | 6 completeness gauges | `radialBar` | multi‑series radial, one card |
| B | Per‑entity completeness | `bar` horizontal | 12 entities |
| C | Integrity matrix | **table, no chart** | sortable, severity chips |
| D | Created/updated stacked | `bar` stacked | 12 months × entity |
| D | Health trend | `line` | from snapshot |
| E | Used vs unused | `bar` stacked horizontal | per entity |
| F | MRP histogram | `bar` | with p99 outlier marker |
| F | Pair‑vs‑parts scatter | `scatter` | pair MRP vs Σ member MRP, y=x reference line |
| G | Machine status donut | `donut` | 4 states |
| G | Maintenance calendar | `bar` | 4 urgency buckets |
| G | Needle‑size mix | `bar` | |
| H | Team by floor | `bar` | 12 floors, supervisor overlay |
| H | Container fleet | `donut` + `bar` | type, then activeFloor |
| I | Edit heatmap | `heatmap` | entity × week — Apex native |
| J1 | Category tree | **CSS/SVG tree, no chart** | interactive, counts per node |
| J2 | Attribute matrix | **table** | coverage % bars inline |
| J3 | Process ladder | `bar` horizontal | Σ duration per process |
| K/L | Tables & bars | mostly none | virtualised |

**Hard rules (same as the other three):** `animations.enabled = false`; `redrawOnParentResize = false` with a 250 ms debounced manual resize; **max 60 points per series**; every chart `next/dynamic({ssr:false})` behind a fixed‑height skeleton; below‑the‑fold charts mount on `IntersectionObserver`.

The **category tree and attribute matrix must be plain DOM**, not charts — they're hierarchical/tabular and a chart library would be slower and less accessible.

---

## 9. Exception / alert engine

Same typed shape as the other three, so `AlertRibbon` is the same component:

```ts
type CatalogAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'integrity' | 'completeness' | 'duplication' | 'usage' | 'freshness' | 'compliance';
  title: string;        // "84 products have no production processes"
  value: number;
  valueLabel: string;   // "affects 1,204 articles"
  href: string;
  since?: string;
};
```

| Rule | Severity | Threshold (proposed, configurable) |
|------|----------|-----------------------------------|
| Products with no processes | critical | any, if the product has ≥1 Article |
| Products with no processes | warning | any other |
| Dangling reference (C1–C8) | critical | any |
| Legacy non‑ObjectId style refs (C5) | critical | any |
| Duplicate `factoryCode` (C10) | critical | any |
| Duplicate `eanCode` (C12) | critical | any |
| Category cycle (C9) | critical | any |
| Container mixed domain (C20) | critical | any |
| Unrecognised container `activeFloor` (C19) | warning | any |
| Products with no BOM | critical | if in an active production order |
| **Health Score drop** | critical | fell `> 5 pts` vs last month |
| Completeness gauge | warning | any dimension `< 80%` |
| Machines without capacity | warning | `> 10%` of Active machines |
| Maintenance overdue | critical | any |
| Floor without a supervisor | critical | any |
| Attribute key not in master (C14) | warning | `> 5%` of products |
| Missing HSN/GST | warning | any *(compliance)* |
| Dead records | info | unused **and** `> 180 days` old |
| Stale records | info | `> 365 days` since update |
| Bulk import with failures | warning | any run with `failed > 0` *(gap #6)* |

All thresholds in one `alertConfig.ts`.

---

## 10. Global filters, time model and drill‑down contract

### 10.1 Filters (URL‑synced)

| Filter | Values | Default |
|--------|--------|---------|
| Entity | multi‑select across the 12 entities | All |
| Category | tree‑select (with descendants) | All |
| Status | active / inactive / all | All |
| Production type | internal / outsourced | All |
| Brand | multi‑select | All |
| Date range | applies to **created/updated only** (Zones D, I) | 90d |
| Dead‑record age | 90 / 180 / 365 days | 180 |
| Severity | critical / major / minor | All |

URL: `/catalog?entity=product,styleCode&category=…&status=active&deadAge=180`

### 10.2 The time‑model trap — sharper here than anywhere

Master Catalog is **almost entirely stock**. Only two zones are flow:

| Kind | Under a date filter | Zones |
|------|--------------------|-------|
| **Flow** | Filtered by range | **D** (created/updated per period), **I** (change activity) |
| **Stock** | **Not** filtered — "as of now" | **A, B, C, E, F, G, H, J, K, L** — every count, every violation, every gauge |

Because 10 of 12 zones ignore the date picker, the header should say **"As of 14:32"** with a live dot as the *primary* time label, and scope the date picker visually to Zones D and I only — ideally with the picker rendered inside those two cards rather than in the global header.

Get this wrong and the CEO filters to "last 7 days", sees the product count collapse, and concludes the catalog was deleted. The API enforces it via `kind: "flow" | "stock"` on every metric.

### 10.3 Drill‑down contract

Every violation row links to the **existing edit screen** with the record pre‑opened: `/catalog/items/{id}/edit`, `/catalog/style-codes/{id}/edit`, `/catalog/machines/edit/{id}`, etc. Those routes already exist — only a `?focus=<field>` param needs adding so the page scrolls to and highlights the offending field.

**This is the dashboard's whole value loop:** see the violation → click → fix → the count drops on next refresh. Without the deep link it is a complaint board.

---

## 11. Performance architecture — how we make it fast

### 11.1 What's slow today

| # | Anti‑pattern | Where | Impact |
|---|-------------|-------|--------|
| 1 | **`?limit=100000` on products** | `items/page.tsx:424` | Serialises the entire product collection to the browser |
| 2 | **`?limit=10000` on categories and attributes — repeated 6+ times** in one file | `items/page.tsx:436,437,535,536,612,1422,1423,1673` | Same payload fetched over and over, never memoised |
| 3 | `styleCodeService.list({ limit: 5000 })` on mount | `items/page.tsx:111` | 5,000 records to fill a dropdown |
| 4 | **Unanchored `RegExp` search across 7 product fields, no text index** | `product.service.js:198` | COLLSCAN on every keystroke‑driven search |
| 5 | **StyleCode lookup returns an unbounded `_id` array fed into `$in`** | `product.service.js:187,219` | `$in` can carry thousands of ObjectIds |
| 6 | **`console.log` of filter/options/search on every request** | `product.service.js:141–143` | Log I/O in the hot path |
| 7 | **`getAllMachinesUsageOverview` does one `Article.find` per machine** | `machine.service.js:921` | Textbook N+1 |
| 8 | **`YarnCatalog` post‑find hook: up to 5 sequential `findById` per document** | `yarnCatalog.model.js` | N×5 — inherited by any catalog screen touching yarn (documented in the yarn plan) |
| 9 | **`Product` has no indexes** beyond `softwareCode` unique | `product.model.js` | Every filter on `category`, `status`, `factoryCode`, `vendorCode` is a scan |
| 10 | `TeamMaster.logs` is `[Mixed]`, unbounded | `teamMaster.model.js` | Documents grow without limit |
| 11 | No caching anywhere (**no Redis**) | backend | Every refresh re‑scans |

**Critical scaling insight:** this dashboard's work is fundamentally **O(catalog size)** — it must examine *every* record to count violations, and it cannot filter to a date window the way the other three can. That makes the **nightly snapshot non‑optional here**, not a nice‑to‑have. It is the primary tier, not the trend tier.

### 11.2 The three‑tier read model — inverted for this module

```
┌─ TIER 1 — NIGHTLY INTEGRITY SCAN (cron) ★ PRIMARY ──────────────────────┐
│ 🆕 catalog_health_snapshots        one doc per day (global + per entity)│
│ 🆕 catalog_violations              one doc per (rule, entity, recordId) │
│    — the durable violation register, rebuilt nightly                    │
│ Full pass over every catalog collection, all 22 rules, reference        │
│ resolution done ONCE with in-memory id Sets.                            │
│ → Serves Zones A, B, C, E, J, K, L and the Health Score.                │
│ → Dashboard reads become simple indexed counts. Sub-20 ms.              │
└─────────────────────────────────────────────────────────────────────────┘
┌─ TIER 2 — LIVE COUNTS (cached 5 min) ───────────────────────────────────┐
│ Cheap countDocuments + $group for headline totals, so the page is never │
│ more than 5 minutes stale on record counts even if the cron failed.     │
│ Also machine status (reuse GET /machines/statistics) and container mix. │
└─────────────────────────────────────────────────────────────────────────┘
┌─ TIER 3 — ON-DEMAND ────────────────────────────────────────────────────┐
│ Violation rows (paginated ≤50 from catalog_violations), category tree,  │
│ attribute matrix, drill drawers.                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why the inversion works.** Master data changes slowly — a nightly integrity scan is *semantically* correct, not just a performance compromise. A dangling reference created at 11 a.m. showing up at midnight is fine. Contrast with production WIP, where a 12‑hour‑old number is useless.

**Offer an explicit "Re‑scan now" button** (admin‑gated, rate‑limited to once per 15 min) so a data owner can fix 40 records and see the score move without waiting for midnight. That single affordance is what makes people actually use the dashboard.

### 11.3 The integrity scan algorithm

The naive implementation is `O(n × m)` — for each product, query each reference. That is unshippable. The correct shape is **load id‑sets once, then a single streaming pass**:

```js
// Phase 1 — load every id set ONCE (projection: _id + the 1–2 fields we test)
const categoryIds  = new Set((await Category.find({}, '_id status').lean()).map(…));
const processIds   = new Set(…);   const rawMaterialIds = new Set(…);
const styleCodeIds = new Set(…);   const yarnCatalogIds = new Set(…);
const attributeMap = new Map();    // name → Set(optionValues)
// ~6 queries total, each a covered index scan returning only ids

// Phase 2 — stream products with a cursor; never load all into memory
const cursor = Product.find({}, PROJECTION).lean().cursor();
for await (const p of cursor) {
  // 22 rule checks, all pure in-memory Set lookups — O(1) each
  // accumulate counters + push violation docs into a bulkWrite buffer (1000 at a time)
}

// Phase 3 — duplicates via aggregation, not JS
Product.aggregate([
  { $match: { factoryCode: { $nin: [null, ''] } } },
  { $group: { _id: '$factoryCode', n: { $sum: 1 }, ids: { $push: '$_id' } } },
  { $match: { n: { $gt: 1 } } },
])

// Phase 4 — usage sets: one distinct() per consumer, unioned in memory
Article.distinct('articleNumber')            // → products used in production
VendorPurchaseOrder.distinct('poItems.productId')
WarehouseInventory.distinct('itemId')
// …then Product ids not in the union = dead catalog

// Phase 5 — bulkWrite violations, upsert snapshot, done
```

**Total: ~15 queries and one cursor pass, regardless of catalog size.** Target under 30 seconds for 100k products.

**Rules:**
- `.lean()` + tight projection on every read. Never hydrate a Mongoose document in the scan.
- Use a **cursor**, never `.find()` into an array — memory must stay flat.
- **Bypass the `YarnCatalog` post‑find hook** (gap #8 / yarn plan): use `YarnCatalog.collection.find()` or `aggregate()`. Mongoose middleware doesn't run on either.
- Duplicates and usage sets belong in `aggregate` / `distinct`, never in JS loops.
- `bulkWrite` violations in batches of 1,000 with `{ ordered: false }`.
- Version each scan with a `scanId`; write new violations, then delete the previous `scanId` — so the dashboard never reads a half‑written register.

### 11.4 Indexes required (migration script)

```js
// Product — currently has NO indexes except softwareCode unique. This is the big win.
{ status: 1 }
{ category: 1, status: 1 }
{ factoryCode: 1 }        // duplicate detection + production lookup
{ vendorCode: 1 }         // duplicate detection + vendor lookup
{ internalCode: 1 }
{ knittingCode: 1 }
{ productionType: 1, status: 1 }
{ updatedAt: -1 }
{ createdAt: -1 }
{ 'bom.yarnCatalogId': 1 }
{ 'processes.processId': 1 }
{ styleCodes: 1 }
// TEXT index for search — replaces the 7-field unanchored regex (anti-pattern #4)
{ name: 'text', softwareCode: 'text', internalCode: 'text',
  vendorCode: 'text', factoryCode: 'text', knittingCode: 'text',
  description: 'text' }
// ⚠️ One text index per collection is a hard MongoDB limit. Confirm none exists.

// StyleCode — only styleCode unique today
{ eanCode: 1 }            // duplicate detection
{ status: 1 }
{ brand: 1 }
{ mrp: 1 }
{ updatedAt: -1 }

// StyleCodePairs
{ eanCode: 1 }
{ status: 1 }
{ styleCodes: 1 }

// Category
{ parent: 1, status: 1 }
{ status: 1, sortOrder: 1 }

// RawMaterial
{ groupName: 1 }
{ articleNo: 1 }
{ updatedAt: -1 }

// Process
{ status: 1, sortOrder: 1 }
{ type: 1 }

// ProductAttribute
{ name: 1 }
{ attributeType: 1, sortOrder: 1 }

// Machine
{ status: 1, isActive: 1 }
{ nextMaintenanceDate: 1 }
{ floor: 1, isActive: 1 }
{ assignedSupervisor: 1 }

// TeamMaster — already good ({workingFloor}, {role}, {status}, {barcode},
//   {teamMemberName,workingFloor}, {status,workingFloor}) ✅

// ContainersMaster — already good ({barcode}, {status}, {type}) ✅
{ activeFloor: 1, status: 1 }

// New collections
{ snapshotDate: -1 } unique
{ snapshotDate: -1, entity: 1 } unique
{ scanId: 1, rule: 1 }                       // catalog_violations
{ scanId: 1, entity: 1, severity: 1 }
{ recordId: 1 }
```

`explain('executionStats')` on every dashboard query before merge. **`COLLSCAN` is a blocker.**

### 11.5 Caching (no Redis)

Same as the other three — build once, share:

- **In‑process TTL Map** keyed by a hash of the normalised filter object. TTLs: counts 5 min · health 15 min · violations 5 min · trends 60 min · tree/matrix 30 min. **Longer than the other dashboards** because master data changes slowly.
- `ETag` + `Cache-Control: private, max-age=120, stale-while-revalidate=600`.
- **PM2 caveat:** `ecosystem.config.json` is present, so an in‑process cache is per worker. With >2 workers use a **`catalog_dashboard_cache` collection with a TTL index**.
- Cache‑stampede guard: single‑flight promise map. **Essential here** — a cold `/health` miss triggers real work.
- The "Re‑scan now" button must be **rate‑limited server‑side** (once per 15 min, admin only), or it becomes a self‑inflicted DoS.

### 11.6 Frontend performance

| Technique | Detail |
|-----------|--------|
| **4 loading waves** | W1 `/summary`+`/health`+`/alerts` (paint <500 ms) → W2 `/integrity`,`/completeness` → W3 on‑scroll `/usage`,`/commercial`,`/machines`,`/people`,`/structure` → W4 on‑click `/violations` |
| Fixed‑height skeletons | zero CLS |
| `IntersectionObserver` mounting | ~14 charts — the most of any of the four dashboards |
| `next/dynamic({ssr:false})` | via existing `SafeChart` |
| **Category tree virtualisation** | render collapsed to depth 2; expand on demand. A 500‑node tree rendered flat is a jank source |
| **Attribute matrix** | ≤30 rows visible, paginated |
| Virtualised violation tables | ≤50 rows per tab |
| `AbortController` on every fetch | |
| 350 ms filter debounce | matches the existing yarn analytics page |
| One shared `Intl.NumberFormat` | module‑scoped |
| **Zero client aggregation** | violation counts arrive pre‑counted; the browser never scans records |
| Payload budget | summary ≤35 KB · health ≤20 KB · integrity ≤25 KB · violations ≤60 KB · **first paint <100 KB** |
| Polling | **none.** Master data doesn't change minute to minute. Manual refresh + the re‑scan button only. |

### 11.7 Performance budget (acceptance criteria)

| Metric | Target |
|--------|--------|
| First KPI painted | **< 700 ms** cached / < 1.2 s cold |
| Fully interactive | **< 2.0 s** |
| `/summary` + `/health` server time, cache hit | < 15 ms |
| `/summary` + `/health` server time, cache miss | < 300 ms (snapshot read, not a live scan) |
| **Nightly integrity scan, 100k products** | **< 30 s** |
| First‑paint JSON | < 100 KB |
| CLS | < 0.05 |
| Filter change → repaint | < 500 ms |

---

## 12. Proposed API surface

New router `AddOn_backend/src/routes/v1/catalogDashboard.route.js`, mounted at **`/v1/catalog/dashboard`**.

> There is no existing `/v1/catalog` mount — the catalog entities are mounted individually (`/products`, `/categories`, …). Adding `/catalog` as a new namespace is clean and collides with nothing.

| Endpoint | Returns | TTL |
|----------|---------|-----|
| `GET /catalog/dashboard/summary` | Zone A — 12 entity counts + splits | 5 min |
| `GET /catalog/dashboard/health` | Zone B + Health Score + 6 gauges + "biggest lever" | 15 min |
| `GET /catalog/dashboard/integrity` | Zone C — the 22‑rule matrix with counts + blast radius | 5 min |
| `GET /catalog/dashboard/trends` | Zone D — growth, churn, health trend (from snapshots) | 60 min |
| `GET /catalog/dashboard/usage` | Zone E — used vs dead per entity | 30 min |
| `GET /catalog/dashboard/commercial` | Zone F — MRP, EAN, pack, brand, HSN/GST | 30 min |
| `GET /catalog/dashboard/machines` | Zone G | 15 min |
| `GET /catalog/dashboard/people` | Zone H — team + containers | 30 min |
| `GET /catalog/dashboard/structure` | Zone J — tree, attribute matrix, process ladder | 30 min |
| `GET /catalog/dashboard/readiness` | Zone L — 4 cross‑module bars | 15 min |
| `GET /catalog/dashboard/alerts` | Zone 0 | 5 min |
| `GET /catalog/dashboard/violations?rule=&entity=&page=&limit=` | Zone K — one tab from `catalog_violations` | 5 min |
| `POST /catalog/dashboard/rescan` | Triggers the integrity scan. **Admin only, rate‑limited 1/15 min**, returns `{ scanId, queued: true }` | — |
| `GET /catalog/dashboard/export?format=xlsx\|pdf` | Full violation register — **the format a data‑cleanup team actually works from** | — |

**Shared query params:** `entity[]`, `category`, `status`, `productionType`, `brand[]`, `severity[]`, `deadAge`, `from`, `to` (Zones D/I only), `compare`.

**Shared envelope — byte‑identical to the other three dashboards:**

```jsonc
{
  "meta": {
    "generatedAt": "2026-08-22T09:02:11.481Z",
    "cached": true, "cacheAgeMs": 12400,
    "asOf": "2026-08-22T09:02:11.481Z",
    "lastScanAt": "2026-08-22T00:20:04.000Z",   // catalog-specific
    "scanId": "scan_20260822_0020",
    "scanDurationMs": 21400,
    "durationMs": 12
  },
  "data": { /* section payload */ },
  "warnings": [ "1,204 products skipped: legacy embedded styleCodes" ]
}
```

`lastScanAt` and `scanId` are catalog‑specific additions — **every violation number must be stamped with when it was computed**, or the CEO will not know whether a fix from this morning is reflected.

Every metric:
```jsonc
{ "value": 84, "previous": 112, "deltaPct": -25.0, "unit": "products", "kind": "stock" }
```

---

## 13. New data models (rollups)

### 13.1 `catalog_health_snapshots` (one doc per day)

```js
{
  snapshotDate: '2026-08-21',
  scanId: 'scan_20260821_0020',
  scanDurationMs: 21400,

  healthScore: 78.4,
  components: { integrity: 26.1, completeness: 19.8,
                readiness: 14.2, freshness: 12.9, utilisation: 5.4 },

  counts: {
    product: { total, active, inactive, internal, outsourced },
    styleCode: { total, active, inactive },
    styleCodePairs: {…}, category: {…}, rawMaterial: {…}, process: {…},
    productAttribute: {…}, machine: {…}, teamMaster: {…},
    containersMaster: {…}, yarnCatalog: {…}, supplier: {…}
  },

  completeness: {                      // % of products passing each gauge
    identity: 94.2, classification: 99.1, productionReady: 82.6,
    yarnReady: 71.3, commercialReady: 88.0, media: 45.7
  },

  violations: {                        // count per rule id
    C1: 3, C2: 84, C3: 12, C4: 27, C5: 1204, C6: 9, C7: 4, C8: 6,
    C9: 0, C10: 2, C11: 5, C12: 7, C13: 31, C14: 118, C15: 64,
    C16: 22, C17: 3, C18: 1, C19: 6, C20: 0, C21: 41, C22: 8
  },

  usage: {
    productUsed, productUnused, styleCodeUnused, rawMaterialUnused,
    processUnused, attributeUnused, categoryEmpty, machineUnassigned,
    containerUnused, teamMemberInactive
  },

  readiness: { productionRoutePct, yarnEstimatePct,
               vendorIdentifyPct, whmsPickPct },

  freshness: { updatedWithin90d, updatedWithin365d, stale },

  createdAt, updatedAt
}
```
Index: `{ snapshotDate: -1 }` unique.

### 13.2 `catalog_violations` (the durable register)

One doc per detected violation. Rebuilt every scan, old `scanId` deleted after the new one commits.

```js
{
  scanId: 'scan_20260822_0020',
  rule: 'C2',
  ruleLabel: 'Product → Process dangling or missing',
  severity: 'critical',
  entity: 'Product',
  recordId: ObjectId,
  recordCode: 'SW-10432',          // softwareCode / styleCode / machineCode …
  recordName: 'Ankle Sock Combed 30s',
  field: 'processes',
  detail: { expected: 'non-empty resolvable processes[]', found: [] },
  blastRadius: 47,                 // downstream records affected
  firstSeenAt: ISODate,            // carried forward across scans — AGE of the problem
  detectedAt: ISODate,
  fixHref: '/catalog/items/<id>/edit?focus=processes'
}
```
Indexes: `{ scanId: 1, rule: 1 }`, `{ scanId: 1, entity: 1, severity: 1 }`, `{ recordId: 1 }`.

> **`firstSeenAt` is the highest‑value field here.** Carrying it forward across scans turns the register from a snapshot into an **ageing report**: "this dangling reference has been broken for 94 days" is a far stronger prompt than "this is broken". Implement it as: on each scan, for a `(rule, recordId)` that already exists, preserve the previous `firstSeenAt`.

### 13.3 Cron

`AddOn_backend/src/cron/catalogIntegrityScan.cron.js`, modelled on the existing `yarnDailySnapshot.cron.js`:

- Schedule `20 0 * * *` `Asia/Kolkata` — **first of the four nightly jobs**, since the others' data quality depends on this one's findings.
- Idempotent: re‑running for the same date overwrites that `snapshotDate`.
- Writes `catalog_violations` under a new `scanId`, **then** deletes the prior `scanId` — never leaves the register empty mid‑write.
- Preserves `firstSeenAt` per `(rule, recordId)`.
- Logs rows scanned, violations found, duration.
- Also invocable via `POST /catalog/dashboard/rescan` (admin, rate‑limited) so fixes are verifiable within minutes.
- **Backfill:** unlike the other three modules, historical violations are **genuinely unreconstructable** — you cannot know what was dangling on 1 June. Start the trend from day one and render "no data" before that. Say so plainly in the UI rather than back‑filling a fiction.

### 13.4 Optional `catalog_dashboard_cache`

```js
{ key: '<sha1>', section: 'health', payload: {…}, expiresAt: Date }
// TTL index { expiresAt: 1 }, expireAfterSeconds: 0
```

---

## 14. Frontend architecture & component tree

```
app/catalog/
├── page.tsx                          ← NEW — the route currently has none
├── command/
│   ├── CatalogCommandClient.tsx      ← "use client", filters + fetch waves
│   ├── types.ts                      ← mirrors the API envelope
│   ├── services/catalogDashboardService.ts
│   ├── hooks/
│   │   ├── useDashboardFilters.ts    ← SHARED with the other 3
│   │   ├── useDashboardSection.ts    ← SHARED
│   │   └── useVisibleOnce.ts         ← SHARED
│   ├── components/
│   │   ├── DashboardHeader.tsx       ← incl. HealthScoreGauge + "last scan" chip
│   │   ├── AlertRibbon.tsx           ← Zone 0   (SHARED)
│   │   ├── EntityCountGrid.tsx       ← Zone A   (SHARED KpiCard × 12)
│   │   ├── HealthPanel.tsx           ← Zone B ★ 6 gauges + per-entity bars
│   │   ├── IntegrityMatrix.tsx       ← Zone C ★ the 22-rule table
│   │   ├── GrowthChurnTrend.tsx      ← Zone D
│   │   ├── UsagePanel.tsx            ← Zone E
│   │   ├── CommercialConsistency.tsx ← Zone F
│   │   ├── MachineMasterHealth.tsx   ← Zone G
│   │   ├── PeopleContainersPanel.tsx ← Zone H
│   │   ├── ChangeActivity.tsx        ← Zone I (heatmap)
│   │   ├── StructureExplorer.tsx     ← Zone J (tree + matrix + ladder)
│   │   ├── RemediationWorklist.tsx   ← Zone K  (SHARED shell)
│   │   ├── CrossModuleReadiness.tsx  ← Zone L
│   │   ├── RescanButton.tsx          ← admin-gated, rate-limit aware
│   │   └── skeletons/
│   └── utils/
│       ├── formatters.ts             ← SHARED
│       ├── deepLinks.ts              ← builds ?focus=<field> edit links
│       ├── alertConfig.ts            ← all thresholds
│       └── ruleCatalog.ts            ← the 22 rules: id, label, severity, weight, fix hint
└── items/**, categories/**, …        ← unchanged, + ?focus= param support
```

`ruleCatalog.ts` is the **single source of truth for the rule set**, imported by both frontend and backend (or duplicated with a contract test). Rule ids, labels, severities and score weights must never drift between the scanner and the display.

**Shared layer** (`shared/components/dashboard/`): `AlertRibbon`, `KpiCard`, worklist shell, `useDashboardSection`, `useDashboardFilters`, `useVisibleOnce`, `formatters`, skeletons, envelope types.

**~50% of this dashboard's frontend is common** with the other three — the highest reuse of the four, because Zones A/K/0 are almost entirely shared components.

---

## 15. Responsive layout spec

Tailwind 12‑column, matching the app's `grid grid-cols-12 gap-6`.

| Breakpoint | Entity cards | Health gauges | Integrity matrix | Category tree |
|-----------|--------------|---------------|------------------|---------------|
| `<640` mobile | 2/row (12 cards = 6 rows) | 2/row | card list, not a table | depth‑1 accordion |
| `640–1024` tablet | 3/row | 3/row | h‑scroll, sticky Rule column | depth‑2, h‑scroll |
| `1024–1440` laptop | 4/row | 6 in one row | full table | full, collapsible |
| `>1440` desktop | 6/row, `max-w-[1800px]` | 6 in one row | full + blast‑radius bars | full + side detail |

The **integrity matrix** is the hard element — 22 rows × 7 columns. On tablet, sticky first column + horizontal scroll. On mobile, collapse each rule into a card (rule name, count, severity chip, "Fix →").

Extras: **print/PDF stylesheet** matters more here than elsewhere — the violation register is a document a data‑cleanup team works from offline, so budget real effort for the PDF export. Plus dark mode via CSS‑variable palettes. **TV mode is not needed** — nobody wall‑mounts master data.

---

## 16. RBAC & data masking

The permission tree already has `'Catalog'` with 11 boolean children (`navigationContext.tsx:216`): `Items`, `Categories`, `Raw Material`, `Processes`, `Attributes`, `Style Codes`, `Style Code Pairs`, `Machines`, `Needle Configuration`, `Team Master`, `Containers Master`.

> Note the naming mismatch: the **permission key is `'Catalog'`** while the **nav title is `'Master Catalog'`**. Match the existing key — don't rename it, or every stored permission object breaks.

**Add one key: `'Dashboard'`**, and a sidebar entry as the first child of the Master Catalog group. The group also needs a `path: "/catalog"` added — it currently has none, which is why there is no landing URL.

| Role | Sees |
|------|------|
| `super_admin`, `admin` | Everything, incl. the re‑scan button |
| Data owner / merchandiser | Everything except re‑scan |
| Module owners (production/yarn/vendor leads) | Zones A, B, C, L + the worklist tabs for their module's blocking rules |
| `user` | Counts and health score; **hide MRP distribution and Zone F pricing** if commercial data is sensitive (Q6) |

**Zone F carries the only commercial data** in this module — `StyleCode.mrp`, `RawMaterial.mrp`, pair pricing. Mask it server‑side for the `user` role, consistent with the vendor and yarn dashboards.

---

## 17. Data‑quality gaps found during analysis

Ordered by impact. Several of these are *themselves* the dashboard's subject matter — but a few block the build.

| # | Gap | Effect | Handling |
|---|-----|--------|----------|
| 1 | **`Product.styleCodes[]` contains legacy embedded objects, not ObjectIds.** `product.service.js:240` refuses to populate them: *"intentionally skip forcing styleCodes to avoid casting legacy embedded objects"* | Every style lookup on those products is degraded. A naive `populate` **throws a CastError** | The scan must type‑check each array element before resolving (rule C5). This is likely the **largest single violation count** in the whole register — expect it to dominate the first scan and dwarf everything else. Show it separately so it doesn't mask the other 21 rules. |
| 2 | **`Product.processes[]` empty ⇒ silent production routing fallback.** `article.model.js:787` catches the throw, emits `console.warn`, uses a linking‑type default | Articles run a route nobody chose; nothing surfaces it | Rule C2, **critical severity**, blast radius = article count. This is the highest‑value single finding in this document. |
| 3 | **`Product` has no indexes** except `softwareCode` unique — yet it's referenced by **13 models** | Every category/status/code filter is a COLLSCAN, system‑wide | Phase 0 index migration (§11.4). Benefits every module, not just this dashboard. |
| 4 | **`StyleCode.pack` is `String`; `StyleCodePairs.pack` is `Number`** | Any direct comparison silently never matches | Normalise both sides in rule F/C. Flag as a schema‑harmonisation ticket. |
| 5 | **`RawMaterial` has all 14 fields `required: true` but no `status` field** | Records can't be *missing* data, only filled with junk (`'-'`, `'N/A'`, `'0'`), and can never be soft‑retired | Completeness rule must be a **content** check, not a presence check. Adding `status` is a schema change (Q4). |
| 6 | **No audit trail on any catalog entity.** No `createdBy` / `lastModifiedBy` on Product, Category, RawMaterial, Process, ProductAttribute, StyleCode, StyleCodePairs, Machine — only `timestamps` | Zone I's "who changed what" and bulk‑import history are **not buildable** from the models | Check whether `UserActivityLog` middleware covers these routes (Q5). If not, ship Zone I as *what/when* only and state the limit. Adding `lastModifiedBy` is a cheap, high‑value schema change. |
| 7 | **`Category.parent` has no depth limit and no cycle guard** | A cycle makes every tree render infinite‑loop | Rule C9 must run an explicit cycle detection (visited‑set walk), and the tree component needs a depth cap as a safety net |
| 8 | **`Product.attributes` is `Map<String,String>`** — any key, any value | Free‑text drift; filters silently miss records; `ProductAttribute` masters become decorative | Rules C14/C15 + the Zone J matrix. Expect high counts; this is normal and exactly what the matrix is for. |
| 9 | **`ContainersMaster.activeFloor` is free text**, compared against camelCase floor keys elsewhere | A typo silently zeroes in‑transit WIP on the **production and vendor** dashboards | Rule C19. Reuse the `floorLabelMap` from the production plan — one map, four consumers. |
| 10 | **`TeamMaster.logs` is `[Mixed]`, unbounded** | Documents grow without limit; large docs slow every team query | Flag for a retention decision (Q8). The dashboard must never fetch `logs`. |
| 11 | **`YarnCatalog` post‑find hook = up to N×5 sequential `findById`** | Any catalog screen touching yarn is pathologically slow | Use `aggregate()` / native `.collection` in the scan — Mongoose middleware doesn't run on either. (Documented in full in the yarn plan.) |
| 12 | **`getAllMachinesUsageOverview` is an N+1** (`Article.find` per machine) | Slow machine screens | Don't call it from the dashboard; aggregate once with `$group` on `Article.machineId` |
| 13 | **`console.log` of filter/options/search on every `queryProducts` call** | Log I/O in the hot path of the most‑used endpoint | Remove in Phase 0 |
| 14 | **`/catalog` has no `page.tsx`, and the nav group has no `path`** | No landing URL exists | Fixed by definition when this dashboard ships — but the `path` must be added to `nav.tsx` too |
| 15 | **Frontend fetches `?limit=100000` and `?limit=10000` (6× in one file)** | Huge repeated payloads, no memoisation | Not a dashboard blocker, but the same lookup data the dashboard needs — cache it once in a shared provider and both benefit |
| 16 | **Mongoose 5.7.7** | Some newer aggregation operators may be unavailable depending on server version | Verify `db.version()`. The scan uses only `$group`/`$match`/`distinct`, all long‑supported. |
| 17 | **`/catalog/needle-configuration` is listed under Master Catalog but manages `MachineOrderAssignment` — live planning data, not master data** | Conceptually misplaced; it also appears in the production module's domain | Not a bug. But **exclude it from catalog counts and health scoring** — including live queue data in a master‑data score would corrupt the metric. Note it in the UI. |

---

## 18. Phased delivery plan

Assumes the shared dashboard layer exists from one of the other three builds. If catalog is built **first**, add ~3 days.

| Phase | Scope | Effort | Ships value? |
|-------|-------|--------|--------------|
| **0 — Foundation & index repair** ★ | **Add the ~35 missing indexes, especially the 12 on `Product`** (§11.4); add the text index; remove `console.log` from `queryProducts`; add `path: "/catalog"` to nav; permission key; `ruleCatalog.ts`; route/controller/service skeleton; envelope + `types.ts` | 2–3 d | **Yes — the Product indexes speed up every module in the system**, independent of any new UI |
| **1 — Scan engine + health** | The 5‑phase integrity scanner (§11.3), `catalog_violations` + `catalog_health_snapshots` models, cron, Health Score, `/summary` + `/health` + `/integrity` + `/alerts`, Zones 0, A, B, C | 4–5 d | ✅ **The integrity matrix alone answers 5 of the 12 CEO questions and hands ops a work order** |
| **2 — Worklist + deep links** | `/violations`, Zone K (13 tabs), `?focus=` param on the existing edit screens, `firstSeenAt` ageing, Excel export | 2–3 d | ✅ **Closes the loop — see → click → fix → count drops.** Without this, Phase 1 is a complaint board |
| **3 — Usage & readiness** | `/usage` + `/readiness`, Zones E, L | 2 d | ✅ Dead‑catalog cleanup + per‑module trust bars |
| **4 — Commercial, machines, people** | `/commercial` + `/machines` + `/people`, Zones F, G, H | 2–3 d | ✅ Pricing consistency + machine/team governance |
| **5 — Structure & trends** | `/structure` + `/trends`, Zones J, I, D (trend starts accumulating from Phase 1's first scan) | 2–3 d | ✅ Attribute drift + "are we improving" |
| **6 — Polish & hardening** | Re‑scan button (admin, rate‑limited), PDF/Excel export polish, dark mode, print CSS, `explain()` audit, **scan timing test at 10× catalog size**, Lighthouse | 2 d | Keeps the scan under 30 s as the catalog grows |

**Total ≈ 16–21 working days** (≈ 13–18 if the shared layer exists).

**Where this fits across all four modules.** Recommended overall order: **vendor → yarn → production → catalog**, because catalog has the highest shared‑component reuse (~50%) and benefits most from a mature shared layer.

**But there is a strong argument for doing Phase 0 and Phase 1 *first*, before anything else.** Master Catalog is the root of the dependency graph — its `Product` index migration accelerates every other module, and its integrity findings tell you how much to trust the other three dashboards. A defensible plan: **catalog Phase 0+1 → vendor → yarn → production → catalog Phases 2–6.**

---

## 19. Open questions for the business

1. **Health Score weights** (§7) — 30/25/20/15/10 proposed across Integrity / Completeness / Readiness / Freshness / Utilisation. And the severity multipliers (1.0 / 0.4 / 0.1). Confirm, because this number will be quoted in meetings.
2. **Dead‑record age threshold** — 180 days proposed for "unused and old enough to act on". Does that match how long a seasonal product legitimately sits idle? Apparel seasonality may argue for 365.
3. **Should the dashboard offer bulk fixes, or read‑only?** Some violations are mechanically fixable (assign a default category, deactivate a dead record). Write actions from a dashboard are powerful and dangerous. **Recommendation: read‑only + deep links in v1**, revisit after the register stabilises.
4. **Should `RawMaterial` get a `status` field?** (gap #5) Today a raw material can never be retired — only deleted, which would break every `bom[]` referencing it.
5. **Does `UserActivityLog` cover catalog routes?** (gap #6) Determines whether Zone I can answer "who changed this" or only "what changed when". If not, is adding `lastModifiedBy` to the 8 catalog models acceptable? It is cheap and high value.
6. **Is MRP/pricing (Zone F) visible to all roles**, or masked for `user` like the vendor and yarn dashboards?
7. **Who owns master data?** This dashboard produces a work queue. If no single person or team owns it, the queue will grow and the score will drift down regardless of how good the tooling is. *This is the question that decides whether the project succeeds.*
8. **`TeamMaster.logs` retention** (gap #10) — unbounded `Mixed` array. Cap, archive, or move to its own collection?
9. **Are duplicate `factoryCode` / `vendorCode` ever legitimate?** The scan treats them as critical. If two products can genuinely share a factory code (e.g. a colourway variant), the rule needs a documented exception list rather than a permanent red count.
10. **What is the target Health Score, and by when?** A score with no target is a thermometer. A score with a target is a plan.
11. **Fiscal year start** — April or January? Drives the FY preset (same across all four dashboards; answer once).

---

## Appendix A — Master KPI list

| # | KPI | Zone | Kind | Source |
|---|-----|------|------|--------|
| 1–12 | Record counts × 12 entities (+ active/inactive) | A | stock | all catalog models |
| 13 | **Catalog Health Score (0–100)** | Header | derived | snapshot |
| 14 | Health Score Δ vs last month | Header | derived | snapshot |
| 15 | **"Biggest lever" rule** | Header | derived | violations |
| 16–21 | 6 product completeness gauges | B | stock | Product |
| 22 | Per‑entity completeness bars (12) | B | stock | all |
| 23–44 | **22 integrity rules (C1–C22)** | C | stock | violations register |
| 45 | Blast radius per rule | C | derived | violations |
| 46 | Violation age (`firstSeenAt`) | C/K | derived | violations |
| 47 | Records created per entity per period | D | flow | `createdAt` |
| 48 | Records updated per entity per period | D | flow | `updatedAt` |
| 49 | Active share % over time | D | derived | snapshot |
| 50 | Bulk‑import runs + failure rate | D/I | flow | *needs gap #6* |
| 51 | Products used vs never used | E | stock | cross‑module distinct |
| 52 | Last‑used date per product | E | stock | cross‑module |
| 53–60 | Never‑used counts: style codes, raw materials, processes, attributes, option values, categories, machines, containers, team members | E | stock | cross‑module |
| 61 | MRP distribution + outliers | F | stock | StyleCode |
| 62 | **Pair MRP vs Σ member MRP** | F | stock | StyleCodePairs |
| 63 | Pack count mismatch | F | stock | StyleCodePairs |
| 64 | Duplicate / missing EAN | F/C | stock | StyleCode ∪ Pairs |
| 65 | Brand coverage + unbranded | F | stock | StyleCode |
| 66 | HSN / GST coverage | F | stock | RawMaterial, YarnCatalog |
| 67 | Machine status mix | G | stock | Machine |
| 68 | Capacity configured % | G | stock | Machine |
| 69 | Needle config coverage % | G | stock | Machine |
| 70 | Supervisor assigned % | G | stock | Machine |
| 71 | Maintenance calendar (4 buckets) | G/K | stock | Machine |
| 72 | **Total nameplate capacity/day** | G | stock | Machine |
| 73 | Machine age distribution | G | stock | Machine |
| 74 | Team by floor / role | H | stock | TeamMaster |
| 75 | **Floors with no supervisor** | H/K | stock | TeamMaster |
| 76 | Span of control (avg/max/empty) | H | stock | TeamMaster |
| 77 | Contact coverage % | H | stock | TeamMaster |
| 78 | Container fleet by type / domain / floor | H | stock | ContainersMaster |
| 79 | Containers in use vs idle | H | stock | ContainersMaster |
| 80 | Edit heatmap (entity × week) | I | flow | timestamps |
| 81 | Stale records (>365 d) | I/K | stock | `updatedAt` |
| 82 | Category tree depth / fan‑out / empty leaves | J | stock | Category |
| 83 | **Attribute coverage matrix** | J | stock | Product + ProductAttribute |
| 84 | Process step ladder (Σ duration) | J | stock | Process |
| 85 | Processes not mapping to a floor | J/C | stock | Process + mapper |
| 86–89 | **4 cross‑module readiness bars** | L | stock | multi |

---

## Appendix B — Files that will be touched

**Phase 0 repairs (do regardless — they speed up every module)**
```
src/scripts/add-catalog-indexes.js                 // NEW — ~35 indexes, 12 on Product
src/services/product.service.js                    // remove 3 console.log in the hot path
```

**New (backend)**
```
src/routes/v1/catalogDashboard.route.js
src/controllers/catalogDashboard.controller.js
src/services/catalog/catalogDashboard.service.js
src/services/catalog/catalogIntegrityScan.service.js    // the 5-phase scanner
src/services/catalog/catalogRuleCatalog.js              // 22 rules — shared contract
src/services/catalog/catalogUsageResolver.js            // cross-module distinct() unions
src/models/catalog/catalogHealthSnapshot.model.js
src/models/catalog/catalogViolation.model.js
src/cron/catalogIntegrityScan.cron.js
src/validations/catalogDashboard.validation.js
src/scripts/backfill-catalog-first-seen.js
```

**Modified (backend)**
```
src/routes/v1/index.js              // mount /catalog namespace
src/index.js                        // register the cron
src/models/index.js                 // export the 2 new models
```

**New (frontend)** — `app/catalog/page.tsx` (does not exist today) + the `app/catalog/command/` tree from §14.

**Modified (frontend)**
```
shared/layout-components/sidebar/nav.tsx        // add path: "/catalog" to the group
                                                // + "Dashboard" as its first child
shared/contextapi/navigationContext.tsx         // add 'Dashboard' key to 'Catalog'
app/catalog/items/[id]/edit/page.tsx            // accept ?focus=<field>
app/catalog/{categories,raw-material,processes,attributes,
            style-codes,style-code-pairs,machines,team-master}/**/edit/**
                                                // same ?focus= support
```

---

*Document version 1.0 · 2026‑08‑22 · Analysis based on a full read of the master catalog module: 17 frontend routes (~21,600 LOC in `/catalog` alone), 13 backend models, the product/style/machine services, 11 route files, and the cross‑module reference graph across 20+ consuming models.*
