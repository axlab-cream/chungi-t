# Research Report - Paid-Report Entitlement Architecture and INICIS Checkout Binding

## 1. Scope
- Task id: task-022
- Topic: Paid-report entitlement hardening, admin production QA payment flows, legacy order resource binding migration, and INICIS standard checkout integration
- Research time: 2026-09-16T07:20:23Z

## 2. Key Findings
- Finding: Unconditional admin email bypass prevents production checkout QA and creates latent security and auditing risks. A naive query-string flag (`?qa=pay`) introduces high risks of parameter tampering, cached/logged sensitive URLs, and unintentional test execution.
- Evidence: OWASP Top 10 (A01:2021 - Broken Access Control) highlights that client-controlled parameters altering business logic or entitlement without server-side validation are prime attack vectors. URL parameters leak through server access logs, browser history, reverse proxy logs, and HTTP `Referer` headers. In financial flows, relying on a query string can cause desynchronization between initial page load and asynchronous Payment Gateway (PG) postbacks (e.g., INICIS `returnUrl` and `notiUrl`).
- Impact: Privileged users cannot verify live PG integrations, webhooks, or receipt generation without code modifications. If QA bypasses are implemented naively via query params, external attackers or non-privileged users may exploit edge cases to bypass paywalls or alter checkout states.

- Finding: Entitlement lookups falling back to unbound orders (`reportId IS NULL` or empty string matching any report of the same `productKey`) create an accidental "infinite lifetime subscription" from a single one-off payment.
- Evidence: In relational entitlement models, `WHERE product_key = :pk AND (report_id = :id OR report_id IS NULL)` evaluates to `TRUE` for all current and future reports under `product_key` as long as a single unbound historical order exists. This common anti-pattern conflates SKU-level entitlement with resource-instance entitlement.
- Impact: Complete revenue leakage for subsequent digital goods within the same category. Users who purchased a single reading once gain unauthorized access to all future readings published under that product key.

- Finding: KG INICIS Standard Checkout (웹표준결제) delegates state tracking and double-purchase prevention entirely to the merchant system, enforcing uniqueness only on the merchant order ID (`oid`).
- Evidence: KG INICIS developer documentation specifies that `oid` must be unique per merchant transaction (duplicate `oid` triggers rejection code `0101`). Custom application data passed via `merchantData` (PC web) or `P_NOTI` (mobile) is echoed back in the approval response and asynchronous notification (`notiUrl`), but maximum length limits (typically 500–1024 bytes) and character encoding constraints apply. INICIS does not check whether a user already owns a product or resource.
- Impact: If the merchant system does not enforce strict pre-checkout validation and idempotency keys tied to `(userId, productKey, reportId)`, users can initiate and complete duplicate transactions for resources they already own.

- Finding: Migration from product-level to resource-level binding requires handling legacy unbound orders through explicit transition strategies, each with distinct failure modes:
  - *Lazy Backfill on First Open*: High risk of race conditions during concurrent requests and accidental consumption via link unfurling or web crawlers.
  - *Upfront Batch Backfill*: Risk of incorrect attribution due to absent or truncated access logs.
  - *Time-Boxed Legacy Sunset*: Risk of customer support surges upon window expiration and scope leakage if new reports are released before the cutoff.
- Evidence: Distributed system migration patterns (e.g., Martin Fowler's Parallel Change / Expand and Contract pattern) show that stateful entitlements require decoupling the schema change from the behavioral enforcement, paired with atomic claim operations.
- Impact: Poorly coordinated migrations will either lock out legitimate past purchasers (causing billing disputes and negative customer sentiment) or prolong infinite access vulnerabilities.

## 3. Project Impact
- Affected files or modules:
  - Entitlement service / authorization middleware (`checkEntitlement(owner, productKey, reportId)`)
  - Order creation and checkout initiation handlers
  - PG callback and webhook processing endpoints (`inicis/return`, `inicis/noti`)
  - Database schema and migration scripts for `orders` and `entitlements`
  - Admin/staff session management and QA tooling
- Risk level: High (Direct impact on revenue, payment compliance, access control, and legacy customer access)
- Recommended direction:
  1. *Admin QA Flow*: Implement a server-verified session toggle (stored in an encrypted session or signed HttpOnly cookie, restricted strictly to an authenticated admin allowlist), rather than an unprotected query string. For INICIS, configure staging/QA to use standard test MIDs (`INIpayTest`) while allowing admins in production to trigger real payments via explicit session-scoped "QA Customer Mode".
  2. *Entitlement Decoupling*: Separate the order table from an explicit `entitlements` table. An order fulfills an entitlement; the entitlement references a concrete `resource_id`.
  3. *Legacy Order Migration*: Treat legacy unbound orders as a legacy credit/token pool with an atomic "Claim to this Report" transaction, or grandfather them strictly to reports created prior to the migration cutoff timestamp (`report.created_at <= MIGRATION_TIMESTAMP`).
  4. *INICIS Order Binding*: Pre-persist orders with status `PENDING` containing `(id, user_id, product_key, report_id, amount)` before opening the INICIS checkout sheet. Verify state and lock the record upon PG return before granting entitlement.

## 4. Implementation Notes For Claude
- Concrete advice:
  - **QA Bypass Architecture**:
    - Do NOT read `?qa=pay` directly in business logic.
    - Implement an endpoint `POST /api/admin/qa-mode` with payload `{ "simulateCustomer": true }`.
    - Enforce dual checks: (1) user email/ID exists in a server-side hardcoded or environment-configured admin list, and (2) user has active admin privileges.
    - Persist the toggle in `session.simulate_customer = true`.
    - In entitlement resolution:
      ```
      if (user.isAdmin && !session.simulate_customer) {
        return true; // standard comp access
      }
      // proceed to database entitlement lookup
      ```
  - **INICIS Order Initiation & Idempotency**:
    - Before rendering `INIStdPay.pay()`, generate a cryptographically random or prefixed order ID (e.g., `ORD_${timestamp}_${nanoId}`) and insert into `orders`:
      - `id`: order ID (`oid` sent to INICIS)
      - `user_id`: buyer ID
      - `product_key`: SKU
      - `report_id`: target resource ID (NOT NULL for all new purchases)
      - `status`: `'PENDING'`
      - `amount`: price
    - Check if an active entitlement already exists for `(user_id, product_key, report_id)`. If yes, abort order creation with HTTP 409 Conflict.
    - Pass `oid` and minimal metadata to INICIS. Echo `order_id` in `merchantData` / `P_NOTI` as a correlation backup.
    - In `returnUrl` and `notiUrl` handlers:
      - Fetch order by `oid` using a row-level lock (`SELECT ... FOR UPDATE`).
      - Verify `P_STATUS == '00'` (success) and `P_AMT == order.amount`.
      - Call INICIS verification/auth API if required by the integration type.
      - Update order status to `'PAID'` and insert a record into `entitlements(user_id, product_key, report_id, order_id, created_at)`.
  - **Migration & Grandfathering Strategy**:
    - **Step 1 (Schema & Invariant Enforcement)**: Add a database constraint or application check that disallows creating new orders without a valid `report_id`.
    - **Step 2 (Legacy Order Segregation)**: Differentiate legacy unbound orders (`report_id IS NULL`) from resource-bound orders.
    - **Step 3 (Atomic Claim Mechanism)**:
      - When a user with an unbound order visits an un-entitled report:
      - Prompt the user with a confirmation modal: "You have 1 unassigned reading pass. Use it to unlock this report?"
      - On confirmation, execute an atomic transaction:
        ```sql
        UPDATE orders
        SET report_id = :targetReportId, claimed_at = NOW()
        WHERE id = (
          SELECT id FROM orders
          WHERE user_id = :userId
            AND product_key = :productKey
            AND report_id IS NULL
            AND status = 'PAID'
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        );
        ```
      - If update succeeds, create the resource entitlement.
- Constraints:
  - INICIS transaction IDs (`tid`) and order IDs (`oid`) must adhere to strict length and character limits (alphanumeric, max 40 chars for `oid`).
  - Webhook handlers (`notiUrl`) must be strictly idempotent; INICIS may retry notifications if the HTTP response code is not 200 or does not return `OK`.
  - Never allow client-submitted `reportId` in the return URL to override the database-persisted `order.report_id`.
- Pitfalls:
  - **The "Prefetch Claim" Trap**: If legacy claim happens automatically on GET without user confirmation, automated link preview bots (Slack, KakaoTalk, iMessage) or browser speculative pre-fetching will trigger the claim on arbitrary reports.
  - **Race Conditions in Dual Callbacks**: INICIS fires both the client-side redirect (`returnUrl`) and server-side webhook (`notiUrl`). Both attempt to verify payment and bind entitlement simultaneously. Ensure database row locking (`FOR UPDATE`) or an atomic status state machine (`PENDING -> PROCESSING -> PAID`) prevents double-processing.
  - **Silent Grandfathering Leakage**: If legacy orders are grandfathered by saying "valid for any report created before date X", ensure date comparison uses database UTC timestamps, not client-provided or mutable timestamps.

## 5. References
- Source: [KG INICIS Developer Manual & Technical Guide (웹표준 결제 / INIStdPay)](https://manual.inicis.com/)
  - Why it matters: Authoritative specification for INICIS parameters (`mid`, `oid`, `price`, `merchantData`, `P_NOTI`), transaction lifecycle, daily test MID batch cancellations, and duplicate order rejection rules.
- Source: [OWASP Top 10 - A01:2021 Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
  - Why it matters: Outlines the risks of relying on user-controlled request attributes (such as query strings or unvalidated role flags) for access decisions and authorization bypasses.
- Source: [Martin Fowler - Branch By Abstraction & Parallel Change](https://martinfowler.com/bliki/ParallelChange.html)
  - Why it matters: Standard industry methodology for migrating critical data models (expanding schema, migrating existing data, contracting legacy fallback) without downtime or data corruption.
- Source: [Stripe API Documentation - Designing Robust Payment Integrations & Idempotency](https://stripe.com/docs/api/idempotent_requests)
  - Why it matters: Defines cross-industry best practices for separating order generation, checkout session initialization, and asynchronous webhook entitlement fulfillment.

## 6. Open Questions
- Question: How many legacy orders with `report_id IS NULL` currently exist in production, and how many distinct reports have their buyers accessed historically?
  - Why it remains uncertain: Requires running read-only analytical queries against the production database and access logs, which is outside the scope of this isolated research context.
- Question: Are reports ephemeral or immutable once generated? Specifically, is `reportId` known prior to checkout initiation, or is the report generated dynamically only *after* payment succeeds?
  - Why it remains uncertain: If reports are generated post-payment, checkout must bind to a `(productKey, reservationId / sessionToken)` tuple and atomically generate/link the `reportId` upon payment fulfillment, rather than requiring an existing `reportId` at checkout start.