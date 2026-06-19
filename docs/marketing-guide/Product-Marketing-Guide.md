# Chapter 1 — What Addon Is, In One Page

**Addon** is one system that runs an entire manufacturing business — from the raw yarn that arrives at the gate, through every production floor, into the warehouse, and out to the customer — with built-in AI that answers questions and forecasts demand in plain language.

Today, a factory like this is held together by a patchwork: Excel sheets for the catalog, a separate tool for purchase orders, WhatsApp groups for the production floor, a different app for the warehouse, an accountant's ledger for stock value, and a sales register that nobody trusts. Numbers never match. Nobody can answer a simple question like *"Where is order #4471 right now and why is it late?"* without three phone calls.

Addon replaces that 20–30 tool stack with **one connected system**. The same product you define once in the catalog is the same product the floor knits, the warehouse picks, and the customer buys. Every yarn cone, every garment, every box carries a barcode or QR code, so the system always knows what exists, where it is, and what state it is in.

**The big idea has two halves:**

1. **One system, not thirty.** Every department works on the same live data. When the floor scans a finished batch, the warehouse sees it, the stock value updates, and the sales team knows it can be sold — instantly, with no re-typing.

2. **AI does the heavy lifting.** Instead of digging through reports, you *ask*. Addon ships with a built-in AI agent you can talk to like a coworker — "What are the top products in Mumbai?", "Next month's forecast for this style?" — and a forecasting engine that predicts demand and recommends what to re-order before you run out.

**Who it's for:** manufacturers — specifically textile and apparel/knitwear factories — that make physical products through multiple stages and sell them to retailers or B2B buyers. (Addon was built for exactly this kind of operation.)

**The product name** used throughout this guide is **Addon**, exactly as it appears in the software.

---

## How Addon Maps To "The Modern Business Operating System"

A modern AI-native business OS is often described as covering nine areas. Here is an honest map of what Addon actually contains today, grounded in the real software — not a wish-list.

| The 9 expected areas | What Addon actually has | Status |
|---|---|---|
| 1. Communication & Storage | **File Manager** (folders, upload/download, cloud storage). No built-in chat/email. | Partial — storage yes, messaging no [verify] |
| 2. Content & Marketing | Not a dedicated module. Branding/labels are handled on the production "Branding" floor. | Absent as a marketing module |
| 3. Sales & CRM | **Sales** (records + import), **Stores** master, and **Warehouse Clients** (B2B buyers + orders). | Present (sales-led, light CRM) |
| 4. Teams & Project | **Users & Permissions**, **Team Master**, floor/role assignment, **Activity Logs**. | Present (team & access; not task-style project mgmt) |
| 5. HR & Payroll | Operators and supervisors are tracked for production, but there is no payroll/salary module. | Absent [verify] |
| 6. Finance & Accounting | Costing/BOM, PO values, GRN financial adjustments, billing hand-off — but no full ledger/accounting. | Partial |
| 7. Product Lifecycle | **Master Catalog** (items, BOM, processes, style codes) + **Production Planning** (the floors). | Present (this is Addon's core strength) |
| 8. Warehouse & Inventory | **WHMS** warehouse + **Yarn Management** + **Vendor PO** outsourced production. | Present (very deep) |
| 9. Replenishment & Analytics | **Replenishment Agent** (forecasting + AI chat) + **Analytics** dashboards. | Present |

**The honest takeaway for a marketer:** Addon is not a generic "everything app." It is a *deep, AI-assisted manufacturing operating system*. Its centre of gravity is making and moving physical product — catalog, production, yarn, warehouse, vendors — wrapped with sales, analytics, and an AI agent. Sell it on that strength. Where a buyer needs full HR/payroll or full accounting, position Addon as the operational system of record that those tools plug into, and mark those areas as on the roadmap.

> **Source files (Chapter 1):** `shared/layout-components/sidebar/nav.tsx` (the live menu), `ProjectPraposal.txt`, `PRODUCTION_SYSTEM_SPECIFICATION.md`, `app/replenishment/components/AgentChat.tsx`.


# Chapter 2 — How It Works, Without The Jargon

Think of Addon as a **factory run by a very organised digital team** that never sleeps, never loses a piece of paper, and remembers everything.

## The one-line mental model

> Everything physical gets a barcode. Every action gets scanned. The system always knows the truth. And an AI sits on top that you can simply *talk to*.

## The agentic layer, explained with a simple analogy

Imagine you hire a brilliant new operations assistant. You don't teach them to code; you just *message them* like a coworker:

1. **You message it.** In the **Replenishment Agent**, you type (or even *speak*, using the microphone) a normal question: *"What are the top products in Mumbai?"* or *"Next month's sales forecast for PE Mens Full Rib Navy in Mumbai?"*

2. **It plans and fetches.** The agent figures out what you're really asking, then goes and reads the right live data — sales, forecasts, inventory, raw materials — and comes back with an answer, a table, or a chart. A "thinking" animation shows it working, just like a person taking a moment to check.

3. **It does the task.** For the forecasting engine, you click "Generate Forecast" and it analyses your real sales history (using methods like moving and weighted averages) to predict next month's demand, then calculates a recommended re-order quantity for each store and product.

4. **It asks for approval / you stay in control.** Addon doesn't act behind your back. The forecast and re-order suggestions are presented for a human to review and adjust before anything is acted on. You can edit the actual sales figures inline to make the next forecast smarter.

5. **It logs everything.** Every action a user takes in Addon — who did what, when, from where — is written to an **Activity Log** that admins can search and filter. Nothing is off the record.

That is the "agentic" idea in plain English: **message it like a coworker → it plans → it does the work → a human approves → everything is logged.**

## How the "one system" magic actually happens

The reason departments stop arguing about numbers is that they all touch the **same digital objects**:

- A **product** is defined once in the catalog (with its recipe — the Bill of Materials — and its production steps).
- **Yarn** arrives, gets weighed and barcoded, and is tracked cone by cone.
- The **floor** scans each batch as it moves from knitting → linking → checking → washing → boarding → branding → final checking → dispatch.
- The **warehouse** receives the same scanned goods into shelves, then picks and packs them for orders.
- **Sales and analytics** read from the very same data, so a sale, a forecast, and a stock level are always consistent.

No re-typing between systems means no mismatched numbers. That is the whole trick — and it's why the AI on top can be trusted, because it's reading one clean source of truth.

## What "AI does the work" really means here (no over-claiming)

To stay honest in front of a technical buyer: Addon's AI today is **(a) a conversational agent** that answers business questions and pulls up analytics on request, and **(b) a forecasting + replenishment engine** that predicts demand and suggests re-orders for human approval. It is genuinely useful and genuinely AI-assisted. It is *not* an autonomous robot that runs the factory unattended — and you should never imply that. The power is in removing the manual digging, typing, and guesswork.

> **Source files (Chapter 2):** `app/replenishment/components/AgentChat.tsx`, `app/replenishment/components/ReplenishmentDashboard.tsx`, `shared/services/replenishmentService.ts`, `shared/services/userActivityLogService.ts`, `shared/types/userActivityLog.ts`.


# Chapter 3 — Who Buys It: The Customer Personas

These are the people who **pay** for Addon — the decision-makers. Meet them once here; you'll see the same three names in every module chapter under "Which customers care most." Memorise them. They are your buyers.

---

## Rajesh Mehta — The Factory Owner (Managing Director)

*One line: the owner who built the business and now wants to grow it without losing control of it.*

- **Goals:** Grow output and revenue, protect margins, build a business that runs without him micromanaging every order.
- **Daily pains:** No single source of truth. He hears "it's almost done" for a week. Yarn and fabric quietly leak as wastage. Decisions run on gut feel and WhatsApp photos.
- **What convinces him to buy:** "You will finally *see* your whole factory on one screen, and the numbers will be real." Traceability, less leakage, and the confidence that he can step back.
- **Top objections:** "My people won't use software." / "We tried an ERP, it failed." / "This looks complicated."
- **How to sell to him:** Lead with control and visibility, not features. Show one live order moving across floors. Promise gradual rollout, module by module. Speak owner-to-owner about money saved, not screens.

---

## Priya Nair — The Operations Head (COO / Plant Head)

*One line: the person who actually has to ship orders on time, every day.*

- **Goals:** On-time dispatch, smooth flow between floors, fewer surprises, higher throughput from the same machines and people.
- **Daily pains:** Firefighting. Orders get stuck and nobody flags it until it's late. She has no live view of where the bottleneck is right now.
- **What convinces her to buy:** A live floor-by-floor view of every order, automatic hand-offs between stages, and instant defect/quality tracking so problems surface early.
- **Top objections:** "Will this slow my floor down?" / "My supervisors aren't tech people."
- **How to sell to her:** Show the floor supervisor scanning a batch in two taps and the order auto-moving to the next stage. Emphasise speed on the floor and early warnings, not paperwork.

---

## Vikram Shah — The Finance Controller (CFO / Head of Finance)

*One line: the guardian of cost, margin, and what the inventory is actually worth.*

- **Goals:** Accurate inventory valuation, controlled yarn/material wastage, clean PO-to-receipt matching, trustworthy cost sheets.
- **Daily pains:** Stock value is an educated guess. GRNs and POs don't reconcile. Costing is done in a spreadsheet that's already out of date.
- **What convinces him to buy:** Live stock value in rupees, automatic cost sheets from the Bill of Materials, PO/GRN matching with financial adjustments, and a full audit trail.
- **Top objections:** "Can I trust the numbers?" / "How does this fit with my accounting software?"
- **How to sell to him:** Show live inventory value, the BOM-driven cost sheet, and the activity/audit log. Position Addon as the operational source of truth that *feeds* his accounting system.


# Chapter 4 — Who Uses It: The User Personas (+ Adoption Tips)

These are the people **inside the business** who touch Addon every day. They don't sign the cheque, but if they don't adopt it, the sale dies. You'll meet this same cast in every module chapter under "Who uses this module." Each one has a job, a need, and an adoption tip.

---

## Neha — The Master-Data Admin

*Sets up and maintains the "masters": products, categories, BOMs, style codes, machines, and user permissions.*

- **What she does:** Builds the catalog, links each product to its recipe (BOM) and process steps, imports data from Excel, and controls who can see what.
- **What she needs:** Fast bulk import/export, no duplicate data entry, and confidence that one clean setup powers the whole system.
- **Adoption tip:** Win her first — she's the foundation. Show Excel import so she doesn't fear re-typing years of data.

## Deepak — The Procurement Officer

*Buys the yarn: raises purchase orders, watches stock levels, receives goods.*

- **What he does:** Reviews the requisition list (what's below minimum), raises POs to suppliers, and records goods received (GRN).
- **What he needs:** To know what to re-order *before* the floor runs dry, and a clean PO → receipt → GRN trail.
- **Adoption tip:** Show the auto requisition list flagging "Below Minimum." It turns him from firefighter to planner.

## Meena — The Yarn Store Keeper

*Guards the yarn: storage, issuing to production, and returns.*

- **What she does:** Allocates received boxes to long-/short-term storage, generates cones, issues yarn to orders by scanning, and records returns.
- **What she needs:** Barcode scanning so she never counts by hand, and live stock so she's never blamed for a shortage.
- **Adoption tip:** Hand her a scanner. The "weigh-and-scan" flow is faster than her current register and instantly proves its worth.

## Ramesh — The Production Planner

*Decides what gets made, on which machine, with how much yarn.*

- **What he does:** Creates production orders, assigns machines and needle configurations, and estimates yarn needed per article.
- **What he needs:** A clear plan, machine availability, and yarn estimates that match the BOM.
- **Adoption tip:** Show yarn estimation auto-pulling from the BOM — planning that used to take a morning now takes minutes.

## Suresh — The Floor Supervisor

*Runs a production floor (knitting, linking, washing, etc.) and reports output.*

- **What he does:** Updates completed quantities, scans QR-coded batches, and moves work to the next floor.
- **What he needs:** Dead-simple, fast input on a tablet — two taps, not forms. The system auto-passes work onward.
- **Adoption tip:** Big buttons, QR scan, done. Train on the floor, on a real order, in ten minutes. Avoid jargon entirely.

## Anjali — The Quality Supervisor

*Owns quality at checking and final checking.*

- **What she does:** Sorts output into quality grades **M1–M4** (good → repairable → minor → major defects), routes repairs back upstream, and confirms quality before dispatch.
- **What she needs:** Fast defect entry, clear rework routing, and a record that protects her when quality is questioned.
- **Adoption tip:** Frame M1–M4 as *her* tool for proving the floor's quality and catching problems early — not as surveillance.

## Kavita — The Warehouse Manager

*Runs the finished-goods warehouse.*

- **What she does:** Receives finished goods into shelves/bins, generates pick lists, picks and packs orders, and dispatches.
- **What she needs:** A map of where everything is, automatic pick lists, and scan-verified dispatch so the right goods ship.
- **Adoption tip:** Show the warehouse layout map and an auto-generated pick list — it removes the "where is it?" treasure hunt.

## Arun — The Sales & Orders Executive

*Handles customer orders, B2B clients, and reads the sales numbers.*

- **What he does:** Maintains store/client records, enters or imports orders, and uses analytics to see what's selling where.
- **What he needs:** Real-time stock visibility (can I promise this?), easy bulk order upload, and clear dashboards.
- **Adoption tip:** Show him the analytics — top products by city, brand performance — and the AI agent answering "top products in Mumbai" in seconds.


# Chapter 5 — Module: Master Catalog

### 1. In one sentence

The Master Catalog is the single, organised "master list" of everything the factory works with — products, categories, raw materials, manufacturing processes, machines, style codes, teams, and yarn definitions — set up once and used by every other part of Addon.

### 2. The pain it kills

Without it, a factory's "master data" lives in a dozen disconnected spreadsheets and people's heads. The same product is spelled three different ways. Nobody agrees on what a style code means. The recipe (which yarns and steps make a product) is in an old Excel file the production manager keeps on his laptop. Costing is guesswork because no one can total up the materials. Every new order means re-typing the same product details yet again — and every typo becomes a downstream error.

### 3. Key features & how to market them

| Feature | What it does (plain) | The benefit ("so you can…") | How to market it (the hook) |
|---|---|---|---|
| Product/Item master | One clean record per product with codes, category and attributes | …stop arguing about which product is which | "One product, one truth." |
| Bill of Materials (BOM) | Links each product to the exact raw materials & quantities it needs | …know the recipe and the cost of every product instantly | "Every product comes with its recipe — and its price tag." |
| Process sequencing | Defines the ordered steps to make a product (drag-and-drop) | …standardise how each product is made | "Bake the right method into every order." |
| Excel import/export | Bulk-load thousands of items, categories, BOMs from a spreadsheet | …go live without months of re-typing | "Bring your spreadsheets — leave the typing behind." |
| Category hierarchy | Parent/child categories for clean grouping | …find and report on products the way your business thinks | "Organise once, find forever." |
| Style codes & pairs | SKU-like codes with EAN/MRP/brand, including bundled sets | …sell and label products with retail-ready codes | "Factory-floor to shop-shelf, one code." |
| Machines & needle config | Registry of machines, capacity, maintenance and needle setups | …plan production around real machine capability | "Know your machines before you promise a date." |
| Containers master + QR | Reusable bins/boxes with printed QR labels (thermal printer) | …track physical containers as they move | "Every bin has a name and a barcode." |
| Team Master | Registry of floor staff, roles and supervisor teams | …assign the right people to the right floor | "Your org chart, ready for the floor." |

### 4. Use cases with examples

**Example A — Launching a new knitwear style, end to end.**
1. Neha (Master-Data Admin) creates the product "PE Mens Full Rib Navy" under the right category.
2. She links its **BOM** — the exact yarns and quantities — by picking from the yarn catalog.
3. She attaches the **process sequence** (knitting → linking → … → final checking) by drag-and-drop.
4. The moment the BOM is saved, Addon can total the material cost — a live cost sheet instead of a stale spreadsheet.
5. That single definition now powers production, yarn estimation, and warehouse — nobody re-types it.

**Example B — Going live without months of data entry.**
1. Neha downloads the Excel template for items (and separate sheets for BOM, processes, style codes).
2. She pastes in the existing catalog and uploads via bulk import.
3. Addon matches and upserts thousands of records in one go — the factory's whole catalog is live in an afternoon.

**Example C — Preparing machines for a production run.**
1. Ramesh (Planner) checks the **Machines** master for capacity and needle configuration.
2. He confirms which machines are Active vs Under Maintenance before committing to an order date.

### 5. Who uses this module

- **Neha — Master-Data Admin (primary):** builds and maintains everything here. *Adoption tip:* lead with Excel import so she never fears re-typing.
- **Ramesh — Production Planner:** reads machines, BOM and processes to plan. *Adoption tip:* show how a clean BOM auto-feeds his yarn estimates.
- **Vikram — (as a user of cost data):** relies on BOM-driven costing. *Adoption tip:* show the live cost sheet updating as the BOM changes.

### 6. Which customers care most

- **Vikram Shah (CFO):** the BOM is his costing engine and the root of accurate inventory value. This is where margins are won or lost.
- **Rajesh Mehta (Owner):** a clean catalog is the foundation of "one source of truth" — without it, nothing else is trustworthy.

### 7. Where to see it in the product

Sidebar → **Master Catalog** → Items, Categories, Raw Material, Processes, Attributes, Style Codes, Style Code Pairs, Machines, Needle Configuration, Team Master, Containers Master, and **Yarn Cataloguing** (Yarn Master).
`[screenshot: Master Catalog → Items list with import/export buttons]`
`[screenshot: Item edit page showing the BOM table and Process Sequence editor]`

### 8. How to talk about it

**Talking points:** (1) "Set it up once, and the whole factory speaks the same language." (2) "Every product carries its own recipe and cost." (3) "Bring your spreadsheets — bulk import gets you live fast."
**Objection 1:** *"Re-entering all our products will take forever."* → "It doesn't — Excel import loads thousands at once from the sheets you already have."
**Objection 2:** *"Our products are too complex/custom."* → "BOMs, multi-step processes, attributes, style codes and bundles are all built in — complexity is exactly what it's designed for."

### 9. Analogy

The Master Catalog is the **master cookbook** of the factory. Every recipe (product) lists its ingredients (BOM) and method (process steps). Define the recipe once, and every cook (floor, warehouse, sales) makes the same dish the same way — and you always know what it costs.

> **Source files (Chapter 5):** `app/catalog/items/page.tsx`, `app/catalog/items/components/RawMaterialBomTable.tsx`, `app/catalog/items/components/ProcessSequenceEditor.tsx`, `app/catalog/{categories,raw-material,processes,attributes,style-codes,style-code-pairs,machines,needle-configuration,team-master,containers-master}/page.tsx`, `shared/services/productService.ts`, `styleCodeService.ts`, `machinesService.ts`, `teamMasterService.ts`, `containersMasterService.ts`.


# Chapter 6 — Module: Production Planning

### 1. In one sentence

Production Planning runs the factory floor: it turns an order into work, moves each batch through every production stage — knitting, linking, checking, washing, boarding, branding, final checking, dispatch — with QR scanning, live progress, and built-in quality grading.

### 2. The pain it kills

Without it, the factory floor is a black box. Managers ask "how much is done?" and get a guess. Batches sit between stages with no record. Quality problems are caught late, after the defective goods have already moved on. Rework is tracked on scraps of paper. When an order is late, nobody can say *which* floor it's stuck on. Operator output and defect rates are invisible, so there's no way to improve.

### 3. Key features & how to market them

| Feature | What it does (plain) | The benefit ("so you can…") | How to market it (the hook) |
|---|---|---|---|
| Production orders | Turns an order + its articles into trackable work with priority & status | …see exactly what's in production and how urgent | "Every order, visible from minute one." |
| Floor-by-floor flow | Auto-passes work through each stage as quantities are completed | …keep work flowing without manual hand-offs | "Finish a step, the next floor already knows." |
| QR / barcode scanning | Each batch/container is scanned at each floor | …track real goods, not estimates | "Scan it, and the system knows." |
| Quality grading M1–M4 | Sorts output into good / repairable / minor / major defects | …catch and route defects the moment they appear | "Quality, graded — not guessed." |
| Rework vs rejection routing | M2 repairs go back upstream; M3/M4 are managed/marked outward | …recover repairable goods and account for scrap | "Save what's fixable, account for what's not." |
| Live progress & dashboards | Per-article % complete, orders-by-floor, efficiency view | …spot the bottleneck before it becomes a late order | "See the jam before it costs you." |
| Machine & operator assignment | Assign machines, needle configs, and floor teams | …tie output to the machine and team that made it | "Know who and what made every batch." |
| Yarn estimation | Estimates yarn needed per article from the BOM | …issue the right yarn, reduce wastage | "Right yarn, right amount, right order." |
| Full audit logs | Every floor action logged per article and order | …prove what happened, when, and by whom | "Nothing happens off the record." |

### 4. Use cases with examples

**Example A — A knitwear order flowing through the floors (manufacturing).**
1. Ramesh creates a production order for 500 pieces of a navy rib style and assigns machines.
2. Suresh (Knitting supervisor) enters completed quantities; Addon **auto-transfers** finished pieces to the Linking floor — no phone call needed.
3. The batch continues automatically: Linking → Checking → Washing → Boarding → Branding.
4. At **Final Checking**, Anjali grades output: most as **M1 (good)**, a few as **M2 (repairable)**.
5. She sends the M2 pieces back upstream for repair; once fixed they merge back into M1. Only quality-confirmed goods move to **Dispatch** and on to the warehouse.

**Example B — Catching a quality problem early.**
1. On the Checking floor, defect counts spike for one machine's output.
2. Because grading is captured live, Anjali and Suresh see it immediately and pull the machine for adjustment — instead of discovering a full batch of seconds at the end.

**Example C — Accounting for scrap honestly.**
1. Final Checking grades a batch's worst pieces as **M4 (major defects)**.
2. In **M4 Management**, those quantities are tracked across floors and "marked outward" — so scrap is a recorded number, not a mystery shrinkage.

### 5. Who uses this module

- **Suresh — Floor Supervisor (primary):** updates output and moves work. *Adoption tip:* two-tap, QR-first input on a tablet; train on the floor in minutes.
- **Anjali — Quality Supervisor (primary):** owns M1–M4 grading and rework routing. *Adoption tip:* frame grading as her proof of quality, not surveillance.
- **Ramesh — Production Planner:** creates orders, assigns machines, estimates yarn. *Adoption tip:* show yarn estimation pulling straight from the BOM.

### 6. Which customers care most

- **Priya Nair (Operations Head):** this *is* her command centre — live flow, bottleneck spotting, on-time dispatch.
- **Rajesh Mehta (Owner):** end-to-end traceability and quality control across every floor is exactly the "control" he's buying.

### 7. Where to see it in the product

Sidebar → **Production Planning** → Production Orders, then the floors: Knitting, Linking, Checking, Washing, Boarding, Silicon, Secondary Checking, Branding, Re-Boarding, Final Checking, Dispatch; plus **M2 / M3 / M4 Management**.
`[screenshot: Final Checking floor with M1–M4 quantity entry]`
`[screenshot: Floor progression view showing an order moving across stages]`

### 8. How to talk about it

**Talking points:** (1) "Your factory floor, live on one screen." (2) "Defects are caught and routed in real time, not at the end." (3) "Work flows from floor to floor automatically — no chasing." 
**Objection 1:** *"My supervisors aren't computer people."* → "They tap a big button and scan a QR code. It's faster than the register they use now."
**Objection 2:** *"Our finishing process has unusual extra stages."* → "Addon already models many floors — knitting through silicon, re-boarding, secondary checking and dispatch — and grades quality at each."

### 9. Analogy

It's like **flight tracking for your factory**. Every order is a flight; every floor is an airport. You always see where each one is, whether it's on time, and you're alerted the moment one is delayed or has a problem — instead of finding out when the customer calls.

> **Source files (Chapter 6):** `app/production/floor-supervisor/*/page.tsx`, `app/production/supervisor/page.tsx`, `app/production/m2-management/page.tsx`, `m3-management/page.tsx`, `m4-management/page.tsx`, `shared/components/production/*` (FloorSupervisorDashboard, FloorProgression, ArticleQrScanDrawer, TransferModal, RepairTransferModal, YarnEstimationTab, ConfirmQualitySubmitModal), `shared/services/productionService.ts`, `PRODUCTION_SYSTEM_SPECIFICATION.md`.


# Chapter 7 — Module: Yarn Management

### 1. In one sentence

Yarn Management runs the entire raw-material side of the business — defining yarns, buying them, receiving and quality-testing them, storing them cone-by-cone, issuing them to production, taking returns, and showing live stock and value at all times.

### 2. The pain it kills

Without it, yarn — the factory's single biggest material cost — is managed on trust and tally books. Nobody knows the real stock until they physically count. Purchase orders, deliveries and bills don't match. Bags are received without verified weights. Yarn is issued to the floor with no record, so "wastage" is whatever's left unexplained at month-end. Re-orders happen too late (production stops) or too early (cash tied up in dead stock).

### 3. Key features & how to market them

| Feature | What it does (plain) | The benefit ("so you can…") | How to market it (the hook) |
|---|---|---|---|
| Yarn cataloguing | Defines every yarn by type, count/size, colour, blend, brand | …order and track yarn precisely | "Every yarn, precisely defined." |
| Requisition list | Auto-flags yarns "Below Minimum" / "Overblocked" | …re-order at the right time, not too late | "It tells you what to buy, before you run out." |
| Purchase orders | Create, draft, submit, and track POs to suppliers | …control buying with a clean paper trail | "Every rupee of yarn, on the record." |
| Goods receipt (GRN) | Records exactly what arrived, with lots, weights, revisions | …match what you ordered to what you got | "Order, delivery and bill — finally matched." |
| Weight + barcode capture | Weighs and barcodes bags/boxes/cones on arrival | …verify deliveries against the PO automatically | "Trust the scale, not the supplier's word." |
| Quality control (QC) | Pass/fail testing of lots with photos and remarks | …keep bad yarn out of production | "Bad yarn stops at the gate." |
| Long-/short-term storage | Assigns boxes to racks and tracks loose cones by slot | …find any cone and value every shelf | "Know where every cone lives." |
| Yarn issue & return | Scans yarn out to orders and records what comes back | …measure true consumption and wastage | "Issued, returned, reconciled — to the gram." |
| Live inventory & alerts | Real-time stock, value in ₹, low-stock/overblocked alerts | …see what you have and what it's worth, now | "Your yarn stock, live and in rupees." |
| PO & yarn analytics | Spend by supplier/status, consumption and closing trends | …buy smarter and spot leakage | "Buy better with the numbers in front of you." |

### 4. Use cases with examples

**Example A — From "we're low" to yarn on the shelf.**
1. Addon's **requisition list** flags a navy yarn as "Below Minimum."
2. Deepak (Procurement) selects a supplier and raises a **PO** straight from the list.
3. When the delivery arrives, Meena (Store Keeper) **weighs and barcodes** each box; Addon matches the weights to the PO and creates a **GRN**.
4. **QC** approves the lot (with a photo on record). Boxes are allocated to storage and split into barcoded cones.
5. Live inventory updates instantly — stock and rupee value, visible to everyone.

**Example B — Issuing yarn to a production order with zero guesswork.**
1. For the navy-rib order, Meena opens **Yarn Issue**, scans each cone's barcode, and the weight is captured at issue time.
2. The order shows "Partially Issued → Issued"; the issued yarn is "blocked" so it can't be double-counted.
3. Leftover cones are scanned back via **Yarn Return**, and issued-vs-returned is reconciled — true consumption, true wastage.

**Example C — Stopping cash from rotting on the shelf.**
1. Vikram (CFO) opens **Live Inventory** and sees the total yarn value in rupees, plus "overblocked" alerts.
2. **Yarn Analytics** shows which yarns aren't moving — so buying slows on dead stock and cash is freed.

### 5. Who uses this module

- **Deepak — Procurement Officer (primary):** requisitions, POs, GRNs. *Adoption tip:* the auto requisition list is the hook — it makes him proactive.
- **Meena — Yarn Store Keeper (primary):** receiving, weighing, storage, issue, return. *Adoption tip:* hand her a scanner; the weigh-and-scan flow beats her register instantly.
- **Vikram — CFO:** live value, alerts, analytics. *Adoption tip:* show stock value in ₹ and overblocked alerts.

### 6. Which customers care most

- **Vikram Shah (CFO):** yarn is the biggest material cost; live value, PO/GRN matching and wastage control are pure finance wins.
- **Priya Nair (Operations Head):** no yarn shortages means no stalled floors — the requisition list protects her schedule.

### 7. Where to see it in the product

Sidebar → **Yarn Management** → Cataloguing, Purchase Management (Requisition list, All POs, PO Received, Draft POs, PO Return, GRN History, Yarn QC, Yarn Storage), Yarn Issue, Yarn Return, and the Dashboard's Live Inventory & Analytics.
`[screenshot: Live Inventory dashboard with summary cards and alerts]`
`[screenshot: Requisition list highlighting "Below Minimum" yarns]`

### 8. How to talk about it

**Talking points:** (1) "Your biggest cost, finally under control — to the gram and the rupee." (2) "It tells you what to buy before you run out." (3) "Every bag weighed, every cone scanned, every issue recorded."
**Objection 1:** *"We already know our yarn stock."* → "Do you know it live, in rupees, with overblocked alerts — without a physical count? Addon does."
**Objection 2:** *"Scanning every cone sounds slow."* → "It's faster than counting and writing, and it's what makes wastage measurable for the first time."

### 9. Analogy

Yarn Management is the **fuel gauge and logbook** for your factory's fuel. It shows exactly how much yarn you have and what it's worth, warns you before the tank runs dry, and logs every drop that goes in and comes out — so unexplained "leaks" finally have an explanation.

> **Source files (Chapter 7):** `app/yarn-management/{cataloguing,purchase-management,yarn-issue,yarn-return,grn,dashboard}/**`, `shared/services/yarnCatalogService.ts`, `yarnPurchaseOrderService.ts`, `yarnReceivingService.ts`, `yarnGrnService.ts`, `yarnBoxService.ts`, `yarnConeService.ts`, `yarnTrackerService.ts`, `yarnEstimationService.ts`, `supplierService.ts`, `shared/components/grn/*`.


# Chapter 8 — Module: Vendor PO (Outsourced Production)

### 1. In one sentence

Vendor PO lets the factory send work to outside vendors (job-workers) and track it through the very same finishing-and-quality pipeline as in-house production — raising vendor purchase orders, receiving goods, grading quality, branding, final checking, dispatch, and handling returns.

### 2. The pain it kills

Most factories can't make everything in-house, so they send work out — and then lose sight of it completely. Goods go to a vendor and come back weeks later with no record of quantity, quality, or what got rejected. Vendor bills are disputed from memory. Defective returns are handled on trust. There's no single view that combines in-house and outsourced production, so the "real" status of an order is always part-guess.

### 3. Key features & how to market them

| Feature | What it does (plain) | The benefit ("so you can…") | How to market it (the hook) |
|---|---|---|---|
| Vendor master | Registry of vendors with contacts, GSTIN, linked products | …manage job-workers like a proper supply base | "Your vendors, organised." |
| Vendor purchase orders | Raise, approve and track POs sent to vendors | …control outsourced work with a paper trail | "Send work out — keep the receipt." |
| Receive & GRN | Count and record goods returning from the vendor | …match what you sent to what came back | "Sent 500, got 500 — proven." |
| Same finishing pipeline | Vendor goods flow through secondary checking → branding → final checking → dispatch | …treat in-house and outsourced work identically | "One quality standard, inside or outside." |
| Quality grading M1–M4 | Grade vendor goods just like in-house output | …reject bad work and account for it | "Hold vendors to your quality bar." |
| Container-gated transfers | Physical containers scanned between floors | …track real goods, not paperwork | "Every handoff is scanned." |
| PO returns & challans | Return defective/rejected goods with a challan document | …reclaim or re-work bad goods cleanly | "Returns with a proper document, every time." |
| M2/M3/M4 management | Route repairs, rework, and scrap from vendor goods | …recover value and record losses | "Even outsourced scrap is on the books." |

### 4. Use cases with examples

**Example A — Outsourcing finishing for a big order (manufacturing).**
1. A rush order exceeds in-house capacity, so Ramesh raises a **vendor PO** for the finishing work.
2. Goods come back; Kavita's team **counts and records** them against the PO and creates a **GRN**.
3. The goods enter **Secondary Checking**, where they're graded **M1–M4** — exactly like in-house output.
4. They flow through **Branding → Final Checking → Dispatch**, scanned container by container.
5. The order's true status now includes the outsourced portion — one combined view.

**Example B — Holding a vendor accountable for quality.**
1. At Secondary Checking, a vendor batch shows heavy **M4 (major defects)**.
2. Those quantities are managed in **M4 Management** and returned to the vendor with a **PO Return Challan** — a real document, not a phone argument.

### 5. Who uses this module

- **Ramesh — Production Planner (primary):** raises vendor POs and balances in-house vs outsourced. *Adoption tip:* show one combined order view spanning both.
- **Kavita — Warehouse Manager / receiving:** counts and GRNs vendor goods. *Adoption tip:* emphasise scan-to-receive against the PO.
- **Anjali — Quality Supervisor:** grades vendor goods to the same standard. *Adoption tip:* "same M1–M4 tool you already use."

### 6. Which customers care most

- **Priya Nair (Operations Head):** outsourcing is how she flexes capacity; this gives her visibility she never had.
- **Vikram Shah (CFO):** vendor PO matching, returns and scrap tracking stop disputed bills and silent losses.

### 7. Where to see it in the product

Sidebar → **Vendor PO** → Purchase Management (Vendor List, Vendor PO Raise/Receive, GRN, PO Return), Secondary Checking, Branding, Final Checking, Dispatch, and M2/M3/M4 Management.
`[screenshot: Vendor PO raise screen with line items]`
`[screenshot: Vendor Secondary Checking floor with M1–M4 grading]`

### 8. How to talk about it

**Talking points:** (1) "See your outsourced work as clearly as your own floor." (2) "Hold every vendor to your quality standard." (3) "No more disputed vendor bills — it's all matched and scanned."
**Objection 1:** *"Our vendors won't use software."* → "They don't have to. Your team scans goods in and out; the vendor just delivers."
**Objection 2:** *"We only outsource occasionally."* → "Then it's there when you need it, using the same quality flow your staff already know."

### 9. Analogy

Vendor PO is like a **courier tracking number for work you send out**. The job leaves your building, but you still see every checkpoint, confirm it came back complete and correct, and have a record if anything's missing — instead of just hoping.

> **Source files (Chapter 8):** `app/vendor-po/**` (vendor-list, purchase-management, secondary-checking, branding, final-checking, dispatch, grn, m2/m3/m4-management, po-return), `shared/services/vendorManagementService.ts`, `vendorPurchaseOrderService.ts`, `vendorProductionFlowService.ts`, `vendorGrnService.ts`, `vendorM2M3M4ManagementService.ts`, `vendorPoReturnChallanService.ts`, `app/vendor-po/vendor-production-flow-frontend-api.md`.


# Chapter 9 — Module: Warehouse Management (WHMS)

### 1. In one sentence

WHMS is the finished-goods warehouse: it receives completed products into mapped shelves and bins, holds B2B customer orders, generates pick lists, guides scan-verified picking and packing, and dispatches the right goods to the right buyer.

### 2. The pain it kills

Without it, the warehouse is organised chaos. Finished goods pile up with no fixed home, so finding an item is a treasure hunt. Pickers work from handwritten lists and pick the wrong styles. Orders ship short or wrong, and the customer finds out before you do. Nobody knows true finished-goods stock, so sales over-promise. There's no map, no scan, no proof of what shipped.

### 3. Key features & how to market them

| Feature | What it does (plain) | The benefit ("so you can…") | How to market it (the hook) |
|---|---|---|---|
| Warehouse layout map | Maps racks, shelves, zones and slots with barcodes | …give every item a fixed, findable home | "Every product has an address." |
| Inward receiving | Scans finished goods (in-house or vendor) into storage | …know stock the moment it lands | "Goods in, stock updated — instantly." |
| B2B client master | Records buyers by type (Store/Trade/Ecom) | …manage who you sell to properly | "Your buyers, on file." |
| Customer orders | Enter or bulk-import orders, with approval & consolidation | …handle order volume without chaos | "From order to dispatch, one track." |
| Auto pick lists | Generates picking lists from pending orders | …pick fast and in the right order | "The list writes itself." |
| Scan-verified picking | Pickers scan as they pick against the list | …ship the right goods, every time | "Scanned right, shipped right." |
| Packing lists & stickers | Generates packing slips and barcode labels | …pack and label professionally | "Retail-ready packing, automatically." |
| Stock & fulfilment reports | Live stock, rack utilisation, order fulfilment % | …run the warehouse on facts | "The warehouse, by the numbers." |

### 4. Use cases with examples

**Example A — From finished goods to a shipped B2B order.**
1. Suresh's floor dispatches finished navy-rib pieces; Kavita **scans them inward** into mapped shelves — stock updates live.
2. A retailer's order arrives (entered or bulk-imported) for several styles.
3. Addon generates a **pick list**; a picker **scans each item** as they pick, so wrong picks are caught instantly.
4. Goods are packed, a **packing list and barcode stickers** print, and the order is **dispatched** — verified and recorded.

**Example B — Never over-promising stock.**
1. Arun (Sales) checks live finished-goods **stock** before confirming a big order.
2. Because inward scanning keeps stock real-time, he promises only what's truly available.

**Example C — Finding the bottleneck in the warehouse.**
1. Kavita opens **Reports** → rack utilisation and order fulfilment %.
2. She sees which orders are lagging and which zones are jammed, and re-balances before dispatch slips.

### 5. Who uses this module

- **Kavita — Warehouse Manager (primary):** inward, layout, pick/pack, dispatch, reports. *Adoption tip:* lead with the layout map and auto pick list — it kills the treasure hunt.
- **Arun — Sales & Orders Executive:** checks stock, raises/imports orders. *Adoption tip:* show live stock so he can promise with confidence.

### 6. Which customers care most

- **Priya Nair (Operations Head):** on-time, accurate dispatch is her scoreboard — this is where it's won.
- **Rajesh Mehta (Owner):** scan-verified dispatch and live finished-goods stock close the loop on his "control" promise.

### 7. Where to see it in the product

Sidebar → **WHMS** → Orders, Inward, Clients, Pick & Pack, Layout, Stock, Reports.
`[screenshot: Warehouse layout map with racks and zones]`
`[screenshot: Pick & Pack screen with an auto-generated pick list]`

### 8. How to talk about it

**Talking points:** (1) "Every product has an address — no more hunting." (2) "Pick lists write themselves, and scanning guarantees the right goods ship." (3) "Live finished-goods stock means sales never over-promise."
**Objection 1:** *"Our warehouse staff won't learn software."* → "They scan barcodes against a list the system builds for them — it's simpler than the clipboard."
**Objection 2:** *"We already have a stock register."* → "A register tells you a number once a month; WHMS tells you location and quantity, live, and proves what shipped."

### 9. Analogy

WHMS is the **GPS and checkout of your warehouse**. Every item has an address you can navigate to, and nothing leaves without being scanned at the till — so you always know what's in stock and exactly what went out the door.

> **Source files (Chapter 9):** `app/warehouse-management/{clients,inward,orders,pick-pack,layout,stock,reports}/**`, `shared/services/whmsService.ts`, `whmsWarehouseClientService.ts`, `whmsWarehouseOrderService.ts`, `storageSlotService.ts`.


# Chapter 10 — Module: Sales & Stores

### 1. In one sentence

Sales & Stores is the commercial side of Addon — a master list of the stores/outlets you sell through and a record of every sale (quantity, price, discount, tax) that feeds directly into the analytics and forecasting engines.

### 2. The pain it kills

Without it, sales data lives in exports nobody trusts and reconciles late. Store details are scattered, so reporting "by city" or "by outlet" means manual sorting every time. Discounts and taxes aren't tracked cleanly, so margin analysis is impossible. Worst of all, the sales history is disconnected from forecasting — so demand planning runs on opinion instead of evidence.

### 3. Key features & how to market them

| Feature | What it does (plain) | The benefit ("so you can…") | How to market it (the hook) |
|---|---|---|---|
| Store master | One record per outlet (city, contact, credit rating) | …report and plan by store and city | "Every outlet, on the map." |
| Sales records | Captures each sale: qty, MRP, discount, tax, net value | …know exactly what sold and at what margin | "Every sale, fully detailed." |
| Bulk Excel import | Loads sales history and store lists from spreadsheets | …onboard years of data without re-typing | "Bring your history with you." |
| Credit rating on stores | Grades outlets (A+ to F) | …manage risk on who you supply | "Know your buyer's risk at a glance." |
| Feeds analytics & forecasts | Sales flow straight into dashboards and the AI agent | …plan demand on real evidence | "Today's sales become tomorrow's forecast." |

### 4. Use cases with examples

**Example A — Loading and trusting the numbers.**
1. Arun downloads the **import template**, pastes in the monthly sales export, and bulk-uploads.
2. Each record carries store, product, quantity, MRP, discount and tax — clean and consistent.
3. The moment it's in, the analytics dashboards and the AI agent can answer questions about it.

**Example B — Reporting by city and outlet.**
1. Because every sale is tied to a **store** (with its city), Arun instantly sees performance by Mumbai vs Delhi, or by individual outlet — no manual sorting.

**Example C — Managing supply risk.**
1. Before extending stock to a new outlet, Arun checks its **credit rating** on the store master.

### 5. Who uses this module

- **Arun — Sales & Orders Executive (primary):** maintains stores and sales, reads the numbers. *Adoption tip:* show bulk import plus instant analytics — data in, insight out.
- **Neha — Master-Data Admin:** sets up the store master cleanly. *Adoption tip:* clean store data is what makes city/outlet reporting effortless.

### 6. Which customers care most

- **Rajesh Mehta (Owner):** wants to know what's selling where — this is his revenue lens.
- **Vikram Shah (CFO):** discount and tax captured per sale make margin analysis real.

### 7. Where to see it in the product

Sidebar → **Sales** (All Sales, Master Sales) and **Stores**. The data surfaces in **Analytics** and the **Replenishment Agent**.
`[screenshot: Sales list with the import button and filters]`
`[screenshot: Stores master with credit rating column]`

### 8. How to talk about it

**Talking points:** (1) "Every sale captured in full — quantity, discount, tax, net value." (2) "Report by city or outlet in one click." (3) "Your sales history powers the forecasts automatically."
**Objection 1:** *"We already export sales from our billing system."* → "Import them here once and they instantly power analytics and AI forecasting — exports alone can't do that."
**Objection 2:** *"This isn't a full CRM."* → "Correct — it's sales intelligence built for a manufacturer: stores, orders and the numbers that drive production planning."

### 9. Analogy

Sales & Stores is the **scoreboard and address book** of your commercial side. It remembers every point scored (sale) and every player (store) — and hands those numbers straight to the coach (the forecasting engine) to plan the next game.

> **Source files (Chapter 10):** `app/sales/**`, `app/stores/**`, `shared/services/salesService.ts`, `salesImportService.ts`, `storeService.ts`, `app/stores/STORE_API_DOCUMENTATION.md`.


# Chapter 11 — Module: Analytics

### 1. In one sentence

Analytics turns Addon's live sales data into ready-made business dashboards — by city, store, product, brand, discount, tax and trend — so anyone can see what's happening without building a single report.

### 2. The pain it kills

Without it, "insight" means someone exporting raw data into Excel and wrestling with pivot tables for a day — by which time the answer is stale. Different people build the same chart different ways and reach different conclusions. Questions like "which brand is growing?" or "is our discounting eating margin?" go unanswered because nobody has the time to dig.

### 3. Key features & how to market them

| Feature | What it does (plain) | The benefit ("so you can…") | How to market it (the hook) |
|---|---|---|---|
| KPI dashboard | Headline numbers: quantity, net sales, avg discount, top SKU, tax | …see the health of the business at a glance | "Your numbers, the moment you log in." |
| City & store performance | Ranks and compares cities and outlets | …spot your best and worst locations | "See which cities and stores are winning." |
| Brand & product performance | Aggregates sales by brand and product | …back your bestsellers, cut the dead weight | "Know your winners and your laggards." |
| Discount impact | Shows how discounting affects net value over time | …protect margin from over-discounting | "See what your discounts really cost." |
| Tax & MRP analytics | Tax collected over time and product spread by price band | …understand your pricing and tax picture | "Pricing and tax, made visible." |
| Drill-down analysis | Click into a single product or store for detail | …investigate without exporting anything | "From overview to detail in one click." |
| One-click export | Download any dashboard to CSV | …share with anyone, anywhere | "Take the answer with you." |

### 4. Use cases with examples

**Example A — The Monday morning review.**
1. Rajesh opens **Analytics** and immediately sees total quantity, net sales, average discount and top SKU for the period.
2. He switches to **city performance** and sees Mumbai pulling ahead of Delhi — a five-second insight that used to take a day.

**Example B — Catching margin leakage.**
1. Vikram opens **Discount Impact** and sees one brand's discounts climbing while net value flattens.
2. He drills into that **product**, confirms the squeeze, and changes the pricing policy — with evidence, not a hunch.

**Example C — Backing the bestsellers.**
1. Arun checks **brand and product performance**, identifies the fastest-growing styles, and feeds that into the next production plan.

### 5. Who uses this module

- **Arun — Sales & Orders Executive (primary):** lives in product/store/brand dashboards. *Adoption tip:* show city and brand views — instant credibility with his boss.
- **Rajesh — Owner & Vikram — CFO (as users):** headline KPIs and discount/tax views. *Adoption tip:* the at-a-glance KPI strip is the daily hook.

### 6. Which customers care most

- **Rajesh Mehta (Owner):** this is his business-health cockpit.
- **Vikram Shah (CFO):** discount, tax and margin visibility are his early-warning system.

### 7. Where to see it in the product

Sidebar → **Analytics** → all-cities-performance, all-stores-performance, brand-performance, discount-impact, tax-analytics, mrp-distribution, product-performance, store-performance, sales-trends, monthly-sales, plus per-product and per-store deep dives.
`[screenshot: Analytics KPI dashboard with summary cards and charts]`
`[screenshot: City performance comparison chart]`

### 8. How to talk about it

**Talking points:** (1) "Insight without effort — the reports are already built." (2) "Everyone sees the same numbers, so debates end." (3) "From headline to detail in one click, then export."
**Objection 1:** *"We have Excel."* → "Excel is yesterday's data rebuilt by hand. These dashboards are today's data, ready the second you open them."
**Objection 2:** *"Will it match our real sales?"* → "It reads the exact sales records in Addon — one source, no re-keying."

### 9. Analogy

Analytics is the **dashboard of your car**. You don't pop the hood and measure things — you glance down and instantly know your speed, fuel and temperature. Addon's dashboards do the same for your business, in real time.

> **Source files (Chapter 11):** `app/analytics/**`, `shared/services/analyticsService.ts`, `analyticsCompleteService.ts`, `shared/components/analytics/*` (AnalyticsKPIs, AnalyticsCharts, AnalyticsTables, ExploreDataTable), `app/analytics/ANALYTICS_APIS_COMPLETE_REFERENCE.md`.


# Chapter 12 — Module: Replenishment Agent (The AI Layer)

### 1. In one sentence

The Replenishment Agent is Addon's AI brain — a forecasting engine that predicts demand and recommends what to re-order for each store and product, paired with a chat assistant you can talk to (or speak to) in plain language to get answers, analytics and forecasts on demand.

### 2. The pain it kills

Without it, demand planning is a guess and stock decisions are reactive: you re-order after you've already run out, or you over-buy and tie up cash. Getting an answer means knowing which report to open and how to read it. The data exists, but it sits there silently — nobody has time to interrogate it, so the business flies blind into next month.

### 3. Key features & how to market them

| Feature | What it does (plain) | The benefit ("so you can…") | How to market it (the hook) |
|---|---|---|---|
| Demand forecasting | Predicts next-period demand from real sales history (moving/weighted average) | …plan production and buying ahead of demand | "Know what you'll need, before you need it." |
| Replenishment suggestions | Calculates a recommended re-order quantity per store/product | …re-order the right amount at the right time | "It tells you what to re-order, and how much." |
| Accuracy tracking | Compares forecast vs actual and scores accuracy | …trust the forecast and improve it over time | "Forecasts that grade themselves and get smarter." |
| Inline actuals editing | Update real sales to sharpen the next forecast | …make the AI learn from reality | "Correct it once, it learns forever." |
| Conversational AI agent | Ask business questions in plain English and get answers/charts | …get insight without hunting through reports | "Just ask — like messaging a colleague." |
| Voice input | Speak your question instead of typing | …get answers hands-free on the floor | "Talk to your factory." |
| Guided suggestions & commands | Suggested questions and slash-commands speed you up | …get value from day one, no training | "It even suggests what to ask." |
| Human-in-the-loop | Suggestions are reviewed and approved by a person | …keep control while the AI does the legwork | "The AI advises; you decide." |

### 4. Use cases with examples

**Example A — Planning next month without guessing.**
1. Ramesh opens the **Replenishment** dashboard and clicks **Generate Forecast** for a key style and store.
2. Addon analyses real sales history and predicts next month's demand, then suggests a **re-order quantity** considering current stock.
3. Ramesh reviews, adjusts, and approves — planning grounded in evidence, not opinion.

**Example B — Asking the agent like a coworker.**
1. Arun opens the **Agent** tab and types (or speaks): *"What are the top products in Mumbai?"*
2. The agent shows a thinking animation, fetches the live data, and replies with the answer.
3. He follows up: *"Next month's sales forecast for PE Mens Full Rib Navy in Mumbai?"* — and gets a forecast on the spot.

**Example C — Making the forecast smarter over time.**
1. When real sales land, Arun edits the **actuals** inline in the table.
2. Addon scores how accurate the last forecast was and uses the correction to sharpen the next one.

### 5. Who uses this module

- **Ramesh — Production Planner (primary):** generates forecasts and re-order suggestions. *Adoption tip:* show the one-click forecast — it replaces a morning of guesswork.
- **Arun — Sales & Orders Executive:** uses the chat agent for instant answers. *Adoption tip:* let him *speak* a question in the demo — the "wow" moment.
- **Rajesh — Owner:** asks the agent high-level questions. *Adoption tip:* frame it as "your analyst on call, 24/7."

### 6. Which customers care most

- **Rajesh Mehta (Owner):** the AI agent is the headline "future-proof" story — and the easiest thing to fall in love with in a demo.
- **Vikram Shah (CFO):** forecasting and right-sized re-orders directly protect cash and cut dead stock.
- **Priya Nair (Operations Head):** demand foresight means fewer stockouts and smoother production.

### 7. Where to see it in the product

Sidebar → **Replenishment Agent** → two tabs: **Replenishment** (forecast dashboard, accuracy, suggestions) and **Agent** (the AI chat, with voice and suggested questions).
`[screenshot: Replenishment dashboard with forecast vs actual chart]`
`[screenshot: Agent chat answering "top products in Mumbai" with the microphone visible]`

### 8. How to talk about it

**Talking points:** (1) "Stop guessing demand — forecast it, and re-order the right amount." (2) "Get answers by simply asking, even by voice." (3) "The AI advises; your team stays in control, and everything is logged."
**Objection 1:** *"Can I trust an AI forecast?"* → "It shows its accuracy score and learns from real sales — and a human always approves before you act."
**Objection 2:** *"Is this just a chatbot gimmick?"* → "No — it reads your live sales, inventory and forecasts to give real answers, and the forecasting engine drives actual re-order decisions. Be clear it advises rather than acting unattended."

### 9. Analogy

The Replenishment Agent is the **experienced planner who never goes home**. Ask it anything in plain words and it answers instantly; left to its job, it watches the trends and tells you what to re-order before you run short — but it always checks with you before anything is ordered.

> **Source files (Chapter 12):** `app/replenishment/page.tsx`, `app/replenishment/components/AgentChat.tsx`, `ReplenishmentDashboard.tsx`, `shared/services/replenishmentService.ts`, `shared/hooks/useReplenishment.ts`, `app/replenishment/README.md`.


# Chapter 13 — Module: Users, Access & File Manager

### 1. In one sentence

This is Addon's control room and shared cabinet — it decides who can see and do what (roles and permissions), logs every action for accountability, and provides secure cloud file storage with folders, upload and download.

### 2. The pain it kills

Without it, everyone either sees everything (a security and confusion nightmare) or important screens are locked behind one overworked admin. There's no record of who changed what, so mistakes become blame games. And critical documents — designs, certificates, reports — live in personal email and random drives, impossible to find and easy to lose.

### 3. Key features & how to market them

| Feature | What it does (plain) | The benefit ("so you can…") | How to market it (the hook) |
|---|---|---|---|
| Users & roles | Create users and assign roles (admin, accounts, user, super-admin) | …give people the right access, no more | "The right doors for the right people." |
| Granular menu permissions | Show/hide each module and floor per user | …tailor the system to each job | "Everyone sees only their job." |
| Team Master | Register floor staff, roles and supervisor teams | …organise who works where | "Your floor org chart, digital." |
| Activity / audit logs | Records who did what, when, from where | …hold the team accountable and trace issues | "Nothing happens off the record." |
| File Manager | Folders, upload/download, secure cloud (S3) storage | …keep documents organised and safe | "One place for every file." |
| Secure login | Password rules, token-based sessions, protected routes | …keep the business data locked down | "Locked by default." |

### 4. Use cases with examples

**Example A — Onboarding a floor supervisor safely.**
1. Neha creates a user for Suresh and grants only the **Knitting floor** permission.
2. Suresh logs in and sees a clean, focused menu — just his floor, nothing to get lost in.

**Example B — Tracing a mistake without a witch-hunt.**
1. A production figure looks wrong. An admin opens the **Activity Logs**, filters by resource and date, and sees exactly which user changed what and when.
2. The fix is fast and factual — no finger-pointing.

**Example C — Keeping documents findable.**
1. A lab certificate and a customer spec are uploaded into the **File Manager** under the right folders.
2. Anyone with access finds them in seconds, instead of digging through email.

### 5. Who uses this module

- **Neha — Master-Data Admin (primary):** creates users, sets permissions, manages files. *Adoption tip:* show per-module permissions — she controls the whole rollout from here.
- **Every user (indirectly):** their tailored menu and login come from here. *Adoption tip:* "you only see what you need" reduces training time across the board.
- **Rajesh / Vikram (oversight):** rely on audit logs for accountability. *Adoption tip:* the searchable log is the trust-builder.

### 6. Which customers care most

- **Rajesh Mehta (Owner):** access control and audit logs are the backbone of the "control" he's buying.
- **Vikram Shah (CFO):** a full audit trail is essential for financial trust and clean processes.

### 7. Where to see it in the product

Sidebar → **Users** (and Team Master under Master Catalog) for people and permissions; **File Manager** for documents. Login/sign-up via the auth screens.
`[screenshot: Users list with role and permission controls]`
`[screenshot: File Manager with folders and upload]`

### 8. How to talk about it

**Talking points:** (1) "Everyone sees only their job — secure and simple." (2) "Every action is logged, so you always know who did what." (3) "All your documents in one safe place."
**Objection 1:** *"Setting up permissions sounds like work."* → "It's a one-time setup per role, and it makes the system simpler for everyone afterwards."
**Objection 2:** *"Is our data secure?"* → "Access is role-controlled, logins are protected, files sit in secure cloud storage, and every action is auditable."

### 9. Analogy

This module is the **security desk and filing room** of the building. It issues each person a keycard that opens only the doors they need, keeps a log of every entry, and runs a tidy filing room where every important document has its place.

> **Source files (Chapter 13):** `app/users/**`, `shared/services/userService.ts`, `userActivityLogService.ts`, `shared/types/userActivityLog.ts`, `app/auth/**`, `middleware.ts`, `app/filemanager/**`, `shared/services/fileManagerService.ts`, `fileUploadService.ts`, `s3Service.ts`, `shared/layout-components/sidebar/nav.tsx`.


# Chapter 14 — Glossary (Every Term in Plain English)

A quick reference for every technical or industry term in this guide. When in doubt on a call, glance here.

- **Addon** — the product this guide is about: one connected, AI-assisted system that runs a manufacturing business end to end.
- **Agent / AI Agent** — the chat assistant inside the Replenishment module that you ask questions in plain language (by typing or voice) to get answers, analytics and forecasts.
- **Agentic layer** — the AI part of Addon: you message it, it plans, it does the task, a human approves, and everything is logged.
- **Article** — a single product line within a production order (e.g., one style/colour being made).
- **Attributes** — descriptive properties of a product (e.g., needle size) used to define and filter it.
- **Audit log / Activity log** — an automatic record of who did what, when, and from where.
- **B2B buyer / Client** — a business customer (a store, trade buyer, or e-commerce seller) that orders finished goods.
- **Barcode / QR code** — a scannable label on physical items so the system can identify and track them.
- **BOM (Bill of Materials)** — the "recipe" of a product: the exact raw materials and quantities needed to make it.
- **Boarding / Re-boarding** — finishing floors where garments are shaped/set; "re-boarding" is a repeat pass.
- **Branding** — the production floor where brand labels and stickers are applied.
- **Catalog / Master Catalog** — the central master list of products, materials, processes, machines and codes.
- **Challan** — an official document accompanying goods being sent or returned (e.g., a return challan).
- **Cone** — a unit of yarn wound onto a cone; Addon tracks yarn down to individual cones.
- **Containers Master** — the registry of reusable bins/boxes, each with a printed QR label.
- **Cost sheet** — the calculated cost of a product, derived automatically from its BOM.
- **Credit rating** — a grade (A+ to F) on a store/outlet indicating supply risk.
- **DHU (Defects per Hundred Units)** — a standard quality measure: how many defects per 100 pieces.
- **Dispatch** — the final step where finished goods leave for the customer/warehouse.
- **EAN code** — a standard retail barcode number attached to a style code.
- **Final Checking** — the last quality inspection floor before goods are dispatched.
- **Floor** — a production stage (knitting, linking, washing, etc.); work moves from floor to floor.
- **Forecast** — a prediction of future demand, generated from past sales (e.g., moving/weighted average).
- **GRN (Goods Receipt Note)** — the record of what was actually received against a purchase order, with lots and weights.
- **GSV / NSV** — Gross Sales Value / Net Sales Value (sales before and after discounts).
- **HSN code** — a tax classification code for a product or material.
- **Knitting** — the first production floor where fabric/garment panels are made.
- **Linking** — the floor where knitted parts are joined.
- **Lot** — a grouped batch of received yarn (e.g., several bags grouped and tagged with supplier info).
- **M1 / M2 / M3 / M4** — quality grades for output: M1 = good, M2 = repairable, M3 = minor defects, M4 = major defects. M2 can be sent back for repair; M3/M4 are managed/marked outward (scrap or return).
- **Master data** — the foundational records (products, stores, vendors, etc.) that everything else relies on.
- **MRP** — Maximum Retail Price printed on a product.
- **Needle configuration** — the needle setup of a knitting machine, matched to what's being produced.
- **Overblocked** — when more yarn is reserved/issued than is healthy, flagged as an inventory alert.
- **PO (Purchase Order)** — an order placed on a supplier (for yarn) or a vendor (for outsourced work).
- **Pick list** — the list, auto-generated from orders, telling warehouse staff what to pick.
- **Process / Process sequence** — the ordered manufacturing steps a product goes through.
- **Replenishment** — re-ordering stock to the right level at the right time, based on forecasts.
- **Requisition list** — the auto-generated list of materials that are below minimum and need re-ordering.
- **Rework vs Rejection** — rework = a defect that can be fixed (kept in count); rejection = scrapped (removed from count).
- **Secondary Checking** — an additional quality-check floor, used especially for vendor/outsourced goods.
- **Silicon (floor)** — a specialised finishing floor in the production flow.
- **Style code / Style code pair** — a retail-style SKU (with EAN, MRP, brand); a "pair" bundles multiple style codes.
- **Team Master** — the registry of floor staff, their roles, and supervisor teams.
- **Vendor / Job-worker** — an outside party the factory sends production work to.
- **WHMS** — Warehouse Management System: Addon's finished-goods warehouse module.
- **Yarn** — the raw material thread used to knit products; Addon's largest material cost to control.


# Chapter 15 — The Marketer's Cheat Sheet

Everything you need on one spread. For each module: the one-line pitch, the top 3 benefits, and the key persona to aim it at.

---

**Master Catalog**
- *Pitch:* "Set up your products, recipes and codes once — and the whole factory speaks one language."
- *Top 3 benefits:* Single source of truth · BOM-driven instant costing · Bulk Excel import to go live fast.
- *Key persona:* Vikram Shah (CFO) — costing; Neha (Master-Data Admin) — owner.

**Production Planning**
- *Pitch:* "Your entire factory floor, live on one screen — with quality caught in real time."
- *Top 3 benefits:* Live floor-by-floor visibility · Auto hand-offs between stages · M1–M4 quality grading & rework routing.
- *Key persona:* Priya Nair (Operations Head).

**Yarn Management**
- *Pitch:* "Your biggest cost, under control to the gram and the rupee — and it tells you what to buy before you run out."
- *Top 3 benefits:* Live stock value in ₹ · Auto requisition alerts · Weigh-and-scan receiving with true consumption tracking.
- *Key persona:* Vikram Shah (CFO); Deepak (Procurement) — daily user.

**Vendor PO (Outsourced Production)**
- *Pitch:* "See your outsourced work as clearly as your own floor — held to the same quality standard."
- *Top 3 benefits:* Vendor PO matching (no disputed bills) · Same M1–M4 quality flow · Returns with proper challans.
- *Key persona:* Priya Nair (Operations Head); Vikram Shah (CFO).

**Warehouse Management (WHMS)**
- *Pitch:* "Every product has an address, pick lists write themselves, and nothing ships unscanned."
- *Top 3 benefits:* Mapped storage (no hunting) · Auto pick lists + scan-verified picking · Live finished-goods stock.
- *Key persona:* Priya Nair (Operations Head); Kavita (Warehouse Manager) — owner.

**Sales & Stores**
- *Pitch:* "Every sale captured in full — and your history powers the forecasts automatically."
- *Top 3 benefits:* Full sale detail (qty/discount/tax/net) · Report by city or outlet in a click · Feeds analytics & AI.
- *Key persona:* Rajesh Mehta (Owner); Arun (Sales Exec) — owner.

**Analytics**
- *Pitch:* "Insight without effort — the reports are already built and always current."
- *Top 3 benefits:* At-a-glance KPIs · City/store/brand/discount/tax views · One-click drill-down and export.
- *Key persona:* Rajesh Mehta (Owner); Vikram Shah (CFO).

**Replenishment Agent (AI)**
- *Pitch:* "Stop guessing demand — forecast it, right-size your re-orders, and just *ask* for any answer (even by voice)."
- *Top 3 benefits:* Demand forecasting + re-order suggestions · Self-scoring, self-improving accuracy · Conversational AI with human approval.
- *Key persona:* Rajesh Mehta (Owner) — demo wow; Vikram Shah (CFO) — cash impact.

**Users, Access & File Manager**
- *Pitch:* "Everyone sees only their job, every action is logged, and every document has a home."
- *Top 3 benefits:* Granular role-based access · Full audit trail · Secure cloud file storage.
- *Key persona:* Rajesh Mehta (Owner); Neha (Master-Data Admin) — owner.

---

### The 30-second whole-product pitch

> "Addon replaces the twenty-odd disconnected tools a factory limps along on with **one connected system** — from the yarn at the gate, through every production floor, into the warehouse, and out to the customer. Everything physical is barcoded and scanned, so the numbers are always real. And it's **AI-native**: a forecasting engine plans your demand and re-orders, and a built-in agent answers any business question the moment you ask — by voice if you like. One source of truth, with AI doing the heavy lifting."

### Things marked [verify] / honest caveats (don't over-claim)

- **No HR/Payroll module** and **no dedicated Content & Marketing module** today — position these as roadmap / out of scope.
- **Finance & Accounting is partial** — Addon does costing, PO/GRN values and billing hand-off, but is **not** a full accounting ledger; it feeds the customer's accounting tool.
- **Communication is storage-only** — File Manager stores documents; there's no built-in chat/email.
- **The AI agent advises; it does not run the factory unattended** — it answers questions and forecasts; humans approve actions. Never imply autonomy.
- A few production floors (Silicon, Secondary Checking, Re-Boarding) and some yarn sub-views are present in the software and noted **[verify]** for exact business use in your specific deployment.
