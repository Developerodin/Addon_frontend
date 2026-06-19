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
