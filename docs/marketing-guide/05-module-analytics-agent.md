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
