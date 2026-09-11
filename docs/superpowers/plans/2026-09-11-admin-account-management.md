# Admin Account Management Implementation Plan

**Goal:** Allow a signed-in super administrator to create, deactivate, and reset another administrator's password through the real account table.

**Constraints:** All mutations call `executeAdminCommand`; password plaintext never leaves the request handler; mutations require `settings:write`, an `Idempotency-Key`, and expected revision. The actor cannot deactivate their own account.

**Acceptance:** Each operation writes audit `started/succeeded` events, replays identical requests, rejects changed request bodies for the same key, and returns no password hash.
