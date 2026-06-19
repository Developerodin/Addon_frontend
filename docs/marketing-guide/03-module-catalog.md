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
