# What We Built Compared to the Original Proposal  
**Addon Holdings — Client-friendly summary**  
*Updated: April 2026*

---

## What this document is for

The original proposal described **five main areas**: Catalog, Replenishment, Manufacturing, Warehouse, and a **B2B order website** for buyers.

During development we delivered those themes, but we also built **additional products and deeper workflows** that were **not spelled out as separate chapters** in that document. This note explains, in **plain business language**:

1. **What was added that the proposal did not list as its own module**  
2. **What was added on top of the proposal inside each area**  
3. **How the “buyer website” part compares** to what is in the system today  
4. **What is still pending, unclear, or depends on UAT / integrations** compared to the proposal text  

*A technical list of every screen appears at the end for your IT partner.*

---

## Read this first: work that goes **beyond** the proposal

### Entirely new **product areas** (not named as standalone modules in the proposal)

These are **major additions**. They support the same business (manufacturing, warehouse, orders) but were **not called out as separate modules** in the original scope document.

| What we built | In simple terms | Why it matters |
|---------------|-----------------|----------------|
| **Vendor PO (outsourced production)** | A full track for work you give to **outside vendors**: vendor list, raising and receiving orders, quality checks, counting, washing, boarding, branding, final checking, dispatch, and **GRN** (goods receipt). | The proposal talked about **in-house** manufacturing steps. This is a **parallel, vendor-specific** production pipeline. |
| **Yarn Management (its own section in the app)** | Yarn dashboard, purchase requisitions and purchase orders, goods inward, **yarn QC**, **yarn storage**, issuing yarn to production, returns, plus masters (brand, type, count/size, colour, blend) and yarn cataloguing. | The proposal mentioned yarn under **manufacturing**. We built a **dedicated yarn operations** area, not only a short mention inside factory floors. |
| **Analytics & reporting hub** | Views for performance across **stores**, **cities**, **products**, **brands**, sales trends, monthly sales, MRP distribution, discount impact, tax-related views, and consolidated sales data. | The proposal briefly mentioned **reports for orders**. This is a **much wider** management reporting surface for retail and sales. |
| **Stores (store master)** | Maintain your **retail / outlet** locations as master data. | The proposal focused on a **B2B buyer** story, not a **multi-store retail** setup. |
| **File Manager** | Central place to work with **files** inside the system. | Not described in the proposal as a named deliverable. |
| **Users & access control** | User management plus **fine control** over which menu sections each user can see. | Essential for operations; the proposal did not detail this level of **menu-level security**. |
| **Dashboard** | Executive / landing views after login. | Standard for an ERP-style product; not a separate line item in the proposal text. |

---

### Extra capability **inside** areas that *were* in the proposal

**Master Catalog (was in the proposal)**  
The proposal listed categories, raw materials, processes, machines, and products with BOM links. **On top of that**, the system includes:

- **Attributes** — extra structured data on products and related masters.  
- **Style codes** and **style code pairs** — design/article coding and pairing; supports BOM-style templates where relevant.  
- **Needle configuration** — ties to machine / knitting planning.  
- **Team master** — teams used on the shop floor.  
- **Containers master** — container / handling units for operations.  
- **Yarn cataloguing** and **yarn master** screens also reachable from the catalog side of the menu — so yarn is both under manufacturing-style flows and under **master data**.

**Manufacturing / production floors (was in the proposal)**  
The proposal described knitting, checking, washing, boarding, final checking, dispatch, etc. **Additionally** named **floor apps** include:

- **Linking**  
- **Silicon**  
- **Secondary checking**  
- **Branding**  

There are also **machine floor** and **warehouse floor** screens in the product; they may be **hidden from the default menu** and used only when you enable them.

**Warehouse (WHMS) (was in the proposal)**  
Beyond generic inward, pick, and dispatch ideas, the app includes:

- **Clients** (customer / party master for warehouse context)  
- **Warehouse layout**  
- **Stock** overview  
- **Warehouse reports**  
- Under **orders**: **approvals**, **consolidation**, **gap report**, and a dedicated **order inward** path  

These give **clearer operational control** than a single “orders” bullet in the proposal.

**Orders / sales (proposal: B2B portal)**  
We built strong **internal** tools: **Sales**, **Master Sales**, and the warehouse order flows above. The **external buyer-facing website** (separate login for customers, public catalogue, cart) is **not the same product** as this internal app—see the next section.

---

## The five proposal modules — simple view

| # | Module in proposal | Plain-English intent | What you have today (summary) |
|---|-------------------|----------------------|-------------------------------|
| 1 | **Catalog** | All master data: categories, materials, processes, machines, products, BOM. | Full catalog screens; Excel import/export on key masters; **extra masters** listed above. |
| 2 | **Replenishment** | Replenishment / inventory replenishment agent. | **Replenishment Agent** screen is present; detailed rules (alerts, automation) are best confirmed in a live demo with your team. |
| 3 | **Manufacturing** | Yarn inward, testing, planning, knitting, quality, washing, finishing, dispatch. | Production orders and **multiple floor apps**; **full Yarn Management** as its own area; **extra floors** (linking, silicon, etc.). |
| 4 | **Warehouse (WMS)** | Receive, store, pick, dispatch, packing, integration ideas. | **WHMS**: orders (with approvals, consolidation, gap report, inward), inward, clients, pick & pack, layout, stock, reports. |
| 5 | **B2B order website** | Buyers place orders online; admin manages them. | **Internal** sales and warehouse tools are strong; treat **customer-facing portal** as separate or to be confirmed—see below. |

---

## Buyer website vs internal system (important)

| Idea in proposal | What to tell stakeholders |
|------------------|---------------------------|
| Buyers log in on their own and browse a catalogue like a shop | This internal application is built for **your staff** (warehouse, production, merchandising, admin). A **separate buyer portal** may exist elsewhere or be planned—**confirm with your vendor** before promising it to customers. |
| Your team approves orders, allocates stock, picks, dispatches | **Yes** — supported through **warehouse orders** (including approvals and related flows) and **Sales / Master Sales**. |
| SMS / email notifications | **Confirm** with implementation team; not something we describe in business terms from screens alone. |
| Link to billing / ERP | **Confirm** with implementation team for live integrations. |

---

## Pending vs the original proposal (what to close out next)

This section maps **directly to the proposal wording**. Items here are either **not clearly covered in the staff application alone**, **need a live walkthrough (UAT)** to mark complete, or **depend on hardware / another system** (ERP, SMS gateway, buyer-facing site).

**Legend**

- **UAT** — confirm with business users in a demo: is the behaviour there end-to-end?  
- **Integration** — needs connected software or devices, not only screens.  
- **Gap** — proposal asked for something that is still a **separate product or phase** (especially the external buyer website).

---

### 1. Catalog (masters & BOM)

| Proposal topic | Status | Notes |
|----------------|--------|--------|
| Categories, raw materials, processes, machines, products, BOM linking | **Largely delivered** | Core screens and Excel on key masters are in place. |
| **Machinery: usage and maintenance schedules** | **UAT** | Proposal called out maintenance tracking; confirm how much is live in your deployment. |
| **Process: time, cost, resources, multistage dependencies** | **UAT** | Masters exist; depth of sequencing/rules should be signed off with production. |
| **Auto unit cost, cost sheet, real-time cost sheet for planning** | **UAT / Integration** | May rely on formulas and backend; confirm with finance / IT. |

---

### 2. Replenishment

| Proposal topic | Status | Notes |
|----------------|--------|--------|
| Replenishment agent / automation | **UAT** | There is a **Replenishment Agent** area; proposal also mentioned **minimum stock alerts** and **reorder** logic—confirm these match your SOP in UAT. |

---

### 3. Manufacturing & yarn (proposal scope)

| Proposal topic | Status | Notes |
|----------------|--------|--------|
| **Weighing scale on yarn inward; weight vs PO check** | **Integration** | Hardware + integration; not something you “see” as a single menu item. |
| **Bag barcoding tied to scale** | **Integration** | Same as above. |
| **Machine planning: Excel upload, bar/Gantt charts, Terry vs non-Terry** | **UAT** | Confirm needle/planning flows match proposal in your environment. |
| **Article-wise yarn allocation + 10% buffer from BOM** | **UAT** | Validate against planning and yarn issue processes. |
| **Chemical calculation + Excel-based logic** | **UAT / Gap** | Explicit module in proposal; confirm if covered inside washing workflows or still to build. |
| **Mixed bin after washing (multi-article bin)** | **UAT** | Confirm in washing/boarding flows. |
| **Pressing trolley (batch size, overflow handling)** | **UAT / Gap** | Named in proposal; confirm dedicated behaviour vs generic finishing. |
| **Weekly DHU reports per operator** | **UAT** | Defect tracking exists on floors; **reporting format/cadence** should be confirmed. |
| **Custom format uploads for yarn test reports** | **UAT** | Yarn QC exists; confirm document upload meets lab needs. |
| **ROSSO output** (named in proposal) | **UAT** | Intermediate / checking floors exist; align naming and reports with your SOP. |

*Yarn purchase, lots, QC, storage, issue/return are implemented in **Yarn Management**; the rows above are about **proposal extras** (hardware, planning visuals, specific reports) that still need sign-off.*

---

### 4. Warehouse (WMS)

| Proposal topic | Status | Notes |
|----------------|--------|--------|
| Inward, pick lists, scanning, dispatch | **Largely delivered** | WHMS orders, inward, pick & pack, stock, layout, reports. |
| **Orders via Excel upload or online sync** | **UAT** | Manual order flows exist; **Excel/sync** should be confirmed per your integration. |
| **Bulk barcode generation** | **UAT** | Confirm how bulk creation is done in operations. |
| **Semi-finished vs finished stock treatment** | **UAT** | Confirm categorisation rules in stock/inward. |
| **Billing / ERP push after dispatch** | **Integration** | Proposal item; depends on ERP connector and go-live. |
| **Packing lists and stickers after scan** | **UAT** | Confirm print formats and when they trigger. |
| **Trims & packing material inventory (separate section, low stock, reorder)** | **UAT / Gap** | Explicit in proposal; confirm if a dedicated trims area exists or is planned. |
| **Discrepancy alerts during picking** | **UAT** | Pick execution exists; alert behaviour to validate. |

---

### 5. B2B order website & portal (largest “proposal vs product” gap)

| Proposal topic | Status | Notes |
|----------------|--------|--------|
| **Dedicated buyer portal** (buyers log in, browse catalogue, cart, checkout) | **Gap / separate** | This codebase is the **internal** operations app. If buyers use a **different URL or app**, list it separately; otherwise treat as **pending phase**. |
| **Buyer signup, buyer-specific roles** | **Gap** | Unless delivered in another product. |
| **Real-time stock on buyer catalogue** | **Gap / Integration** | Needs WMS link to storefront. |
| **MOQ, delivery timeline, pricing on catalogue** | **Gap** | Buyer-facing display. |
| **Bulk order upload by buyer (Excel)** | **Gap / UAT** | Internal sales may cover part of this; not same as “buyer uploads”. |
| **Past orders, invoices, delivery status for buyer** | **Gap** | Buyer self-service. |
| **Backorder logic at buyer checkout** | **Gap** | |
| **Buyer master & pricing slabs** | **UAT** | May overlap **Clients** / sales masters—confirm pricing engine. |
| **SMS/email notifications on status** | **Integration** | Gateway + templates. |
| **Portal branding (logo, colours)** | **Gap** | For a **buyer** portal, not the staff app theme. |
| **Admin: all items above from buyer side** | **Partial** | Internal order management is strong; **buyer-facing** pieces are the gap. |

*Internal side that **does** align with the proposal: viewing/managing orders, approvals, allocation-style flows via **warehouse orders** and **Sales / Master Sales**—already described earlier.*

---

### 6. Cross-cutting (whole proposal)

| Proposal topic | Status | Notes |
|----------------|--------|--------|
| **Hosting on AWS** | **Infrastructure** | Confirms with DevOps / vendor; not visible inside the app. |
| **Phase 2: deeper interlinking of modules** | **Roadmap** | Proposal described as after Phase 1. |
| **Handheld / RFID** | **Integration + devices** | Where used, confirm device support per site. |

---

### Short list for steering committee

**Confirm in UAT (screens exist; behaviour must be signed off):**  
Maintenance on machines · replenishment alerts · machine planning charts & Terry/non-Terry · yarn allocation buffer · chemical/mixed bin/pressing specifics · DHU reporting cadence · WHMS Excel/sync · bulk barcodes · trims inventory · packing/labels · picking alerts · buyer pricing if not in a separate portal  

**Depends on integration or hardware:**  
Weighing scale on yarn · ERP/billing push · SMS/email  

**Still open if the commitment is a public buyer website:**  
Buyer login, catalogue, cart, checkout, buyer order history/invoices, backorder at checkout, buyer branding, buyer notifications  

---

## One-page “extra work” summary for management

**Not in the proposal as their own modules, but delivered:**  
Vendor PO track · Yarn Management as a dedicated product area · Analytics hub · Stores master · File Manager · User and menu-level permissions · Dashboard  

**Inside proposal modules, clearly expanded:**  
Extra catalog masters (attributes, styles, needle config, teams, containers, yarn under catalog) · Extra production floors (linking, silicon, secondary checking, branding) · Deeper warehouse order handling (approvals, consolidation, gap report, order inward) · Richer reporting than the short “analytics” mention in the portal section  

**Clarification:**  
Internal operations and warehouse are well covered; **external B2B buyer website** should be confirmed as a separate deliverable or phase if that is still a commitment.

---

## Note for IT / technical readers

- The application is built with **modern React (Next.js)**. The proposal mentioned **MERN**; the **database and API layer** live outside this frontend codebase.  
- Features such as **weighing scales, ERP push, SMS/email** depend on **backend and integrations**—confirm in deployment environment.  
- **Full screen / URL inventory** for audits: see **Appendix A** below.

---

## Appendix A — Technical route index

*Paths are app URLs (for developers and QA). Regenerate after major releases with: `find app -name 'page.tsx' | sort`*

### Root & platform

- `(components)/(contentlayout)/dashboards/main/page.tsx` → `/dashboards/main`
- `page.tsx` → `/`
- `dashboard/page.tsx` → `/dashboard`
- `debug-nav/page.tsx` → `/debug-nav`
- `filemanager/page.tsx` → `/filemanager`
- `auth/login/page.tsx` → `/auth/login`
- `auth/forgot-password/page.tsx` → `/auth/forgot-password`
- `auth/signup/page.tsx` → `/auth/signup`
- `users/page.tsx` → `/users`
- `users/add/page.tsx` → `/users/add`
- `users/edit/[userId]/page.tsx` → `/users/edit/:userId`

### Analytics

- `analytics/page.tsx` → `/analytics`
- `analytics/all-cities-performance/page.tsx`
- `analytics/all-sales-data/page.tsx`
- `analytics/all-stores-performance/page.tsx`
- `analytics/brand-performance/page.tsx`
- `analytics/discount-impact/page.tsx`
- `analytics/monthly-sales/page.tsx`
- `analytics/mrp-distribution/page.tsx`
- `analytics/product-analysis/[productId]/page.tsx`
- `analytics/product-performance/page.tsx`
- `analytics/sales-trends/page.tsx`
- `analytics/store-analysis/[storeId]/page.tsx`
- `analytics/store-performance/page.tsx`
- `analytics/tax-analytics/page.tsx`

### Catalog

- `catalog/attributes/page.tsx`, `add`, `edit/[id]`
- `catalog/categories/page.tsx`, `add`, `edit/[id]`
- `catalog/containers-master/page.tsx`
- `catalog/items/page.tsx`, `add`, `[id]/edit`
- `catalog/machines/page.tsx`, `add`, `edit/[id]`
- `catalog/needle-configuration/page.tsx`
- `catalog/processes/page.tsx`, `add`, `edit/[id]`
- `catalog/raw-material/page.tsx`, `add`, `edit/[id]`
- `catalog/style-code-pairs/page.tsx`, `add`, `[id]/edit`
- `catalog/style-codes/page.tsx`, `add`, `[id]/edit`
- `catalog/team-master/page.tsx`, `add`, `[id]/edit`

### Production

- `production/supervisor/page.tsx`, `add`, `edit`
- `production/floor-supervisor/knitting/page.tsx`
- `production/floor-supervisor/linking/page.tsx`
- `production/floor-supervisor/checking/page.tsx`
- `production/floor-supervisor/washing/page.tsx`
- `production/floor-supervisor/boarding/page.tsx`
- `production/floor-supervisor/silicon/page.tsx`
- `production/floor-supervisor/secondary-checking/page.tsx`
- `production/floor-supervisor/branding/page.tsx`
- `production/floor-supervisor/final-checking/page.tsx`
- `production/floor-supervisor/dispatch/page.tsx`
- `production/floor-supervisor/machine-floor/page.tsx`
- `production/floor-supervisor/warehouse/page.tsx`

### Replenishment

- `replenishment/page.tsx` → `/replenishment`

### Sales & stores

- `sales/page.tsx`, `add`, `edit/[id]`
- `sales/master/page.tsx`, `add`, `edit/[id]`, `details/[id]`
- `stores/page.tsx`, `add`, `edit/[id]`

### Yarn management

- `yarn-management/page.tsx` → `/yarn-management`
- `yarn-management/dashboard/page.tsx`, `dashboard/full-inventory`, `dashboard/report`
- `yarn-management/cataloguing/page.tsx`, `add`, `edit/[yarnId]`
- `yarn-management/purchase-management/page.tsx`
- `yarn-management/purchase-management/requisition-list/page.tsx`
- `yarn-management/purchase-management/purchase/page.tsx`, `add`, `edit/[purchaseId]`
- `yarn-management/purchase-management/purchase-order-received/page.tsx`, `process/[orderId]`
- `yarn-management/purchase-management/yarn-qc/page.tsx`, `process/[id]`, `process/box/[boxId]`
- `yarn-management/purchase-management/yarn-storage/page.tsx`, `process/[boxId]`
- `yarn-management/yarn-issue/page.tsx`, `add`, `edit/[issueId]`
- `yarn-management/yarn-return/page.tsx`
- `yarn-management/yarn-master/page.tsx` + `brand`, `yarn-type`, `count-size`, `color`, `blend` (each with add/edit)

### Vendor PO

- `vendor-po/page.tsx` → `/vendor-po`
- `vendor-po/purchase-management/page.tsx`
- `vendor-po/vendor-list/page.tsx`, `add`, `edit/[id]`
- `vendor-po/purchase-management/purchase/page.tsx`, `add`, `edit/[id]`
- `vendor-po/purchase-management/purchase-order-received/page.tsx`, `process/[orderId]`
- `vendor-po/raise/page.tsx`, `add`, `edit/[id]`
- `vendor-po/receive/page.tsx`, `process/[orderId]`
- `vendor-po/checking/page.tsx`, `process/[entryId]`
- `vendor-po/secondary-checking/page.tsx`
- `vendor-po/counting/page.tsx`
- `vendor-po/washing/page.tsx`
- `vendor-po/boarding/page.tsx`
- `vendor-po/branding/page.tsx`
- `vendor-po/final-checking/page.tsx`
- `vendor-po/final-checking-counting/page.tsx`
- `vendor-po/dispatch/page.tsx`
- `vendor-po/grn/page.tsx`, `view/[grnNo]`

### Warehouse management (WHMS)

- `warehouse-management/page.tsx` → `/warehouse-management`
- `warehouse-management/orders/page.tsx`, `add`, `edit/[orderId]`
- `warehouse-management/orders/approvals/page.tsx`
- `warehouse-management/orders/consolidation/page.tsx`
- `warehouse-management/orders/gap-report/page.tsx`
- `warehouse-management/orders/inward/page.tsx`, `inward/[id]`
- `warehouse-management/inward/page.tsx`, `[id]`
- `warehouse-management/layout/page.tsx`
- `warehouse-management/clients/page.tsx`, `add`, `edit/[clientId]`, `view/[clientId]`
- `warehouse-management/pick-pack/page.tsx`
- `warehouse-management/stock/page.tsx`
- `warehouse-management/reports/page.tsx`

---

## Appendix B — Git history (optional, for dated evidence)

To list recent changes by area (for your records):

```bash
git log --oneline --since="2024-01-01" -- app/vendor-po app/yarn-management app/warehouse-management app/analytics
```

Use `--format="%h %ad %s" --date=short` if you want dates in the output.
