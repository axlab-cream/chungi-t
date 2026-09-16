# T16 — INIAPI sandbox adapter

- Official INIAPI v2 integration should hash the *exact single serialization* of `data`: `SHA-512(INIAPIKey + mid + type + timestamp + dataJson)`.
- A provider adapter must not mutate orders or persist financial/refund state. It should return gateway evidence only; durable intent, dual approval, and reconciliation belong to the refund workflow.
- Model timeout separately from failure. A known gateway duplicate cancellation (`500626`) is terminal evidence, not permission to retry or mark a refund successful.
- Keep production network unavailable by requiring an injected sandbox transport in the adapter. This enables request-shape tests without a real TID, PG call, or secret in tests.
