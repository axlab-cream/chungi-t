# T17 refund dual-control

Use a database transaction with `FOR UPDATE` over the paid order plus active refund intents to enforce aggregate refund reservations. Application-side sum-and-insert is not concurrency safe.

Keep refund intent and independent approval durable before any PG call. A gateway adapter must not revoke access or mark a refund successful; unknown outcomes require reconciliation.
