# INIAPI Sandbox Query and Cancel Adapter Implementation Plan

> **For agentic workers:** Execute inline with test-first changes. Do not invoke an actual PG endpoint, change an order, or create a refund record in this task.

**Goal:** Provide an official-contract-derived, transport-injected INIAPI v2 sandbox adapter for transaction inquiry and full-cancel simulation.

**Architecture:** `src/payment/inicis.ts` remains the sole payment-provider boundary. It will construct deterministic INIAPI v2 JSON requests, including the documented SHA-512 input, but it will accept a caller-supplied transport instead of calling global `fetch`; production use is rejected. The adapter returns normalized gateway evidence only. T17 owns durable refund intent, approval separation, retries, and all order/financial-event mutations.

**Tech Stack:** Node 24, TypeScript, Node test runner, KG Inicis INIAPI v2 official manual.

## Global Constraints

- Only `https://stginiapi.inicis.com/v2/pg/inquiry` and `/v2/pg/refund` may be represented; no live `iniapi.inicis.com` call is permitted.
- The INIAPI Key is server-only and never added to browser code, responses, logs, fixtures, or documents.
- No Express route is added and no `PaymentOrder`, `financial_events`, or future refund state is mutated.
- A timeout or inconclusive response must remain distinct from a successful response; a known already-cancelled response is returned as a terminal duplicate result.
- Contract evidence: inquiry uses `type=inquiry`, request body `data` with exactly one of `tid` or `oid`, SHA-512 of `INIAPIKey + mid + type + timestamp + data`; refund uses `type=refund`, `data={tid,msg}`, and the same v2 hash shape. Source: KG Inicis [transaction inquiry](https://manual.inicis.com/pay/etc-inquiry.html) and [cancellation](https://manual.inicis.com/inipaypro/cancel.html) manuals.

### Task 1: Contract-bound sandbox request builder

**Files:**
- Modify: `src/payment/inicis.ts`
- Create: `tests/unit/inicis-adapter.test.ts`

- [ ] Write failing tests for KST 14-digit timestamps, inquiry payload/hash, cancellation payload/hash, endpoint restriction, and zero global network calls.
- [ ] Add `createInicisSandboxAdapter({ mid, iniApiKey, clientIp, transport, now })` with `inquire` and `cancel` methods.
- [ ] Serialize `data` once in insertion order before hashing, use SHA-512, enforce exactly one inquiry key, and bound the supplied timeout.
- [ ] Return normalized raw result evidence without order/state persistence.

### Task 2: Failure semantics and operational evidence

**Files:**
- Modify: `tests/unit/inicis-adapter.test.ts`
- Modify: `docs/admin-ops/20-HANDOFF.md`

- [ ] Add test transports for timeout, gateway duplicate (`500626`), and gateway success followed by an intentionally failing persistence callback outside the adapter.
- [ ] Verify the adapter does not reinterpret a successful gateway response as a storage outcome and does not issue a second request for the duplicate evidence case.
- [ ] Record the contract table, mocked outputs, and unresolved production requirements: production INIAPI Key/egress approval plus T17 dual-control persistence flow.

### Task 3: Verification and rollout record

**Files:**
- Modify: `plan.md`
- Modify: `status.md`

- [ ] Run `npx tsx --test --test-concurrency=1 tests/unit/inicis-adapter.test.ts tests/unit/payment.test.ts` and `npm run typecheck`.
- [ ] Run `npm run vercel-build`; deploy only after all checks pass, then verify the existing production admin page without calling an INIAPI endpoint.
- [ ] Record verified reusable knowledge in CreamWIKI/KMS and update the task status to DONE.
