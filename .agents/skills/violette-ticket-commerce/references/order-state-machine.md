# Order, hold, and inventory state machine

## States

Order states:

`draft -> awaiting_payment -> confirmed -> completed`

Terminal alternatives:

- `draft/awaiting_payment -> expired`
- `draft/awaiting_payment -> cancelled`
- `confirmed -> cancellation_requested -> cancelled`
- `confirmed/completed -> refund_pending -> refunded` only when the commercial policy permits it

Payment states:

`not_started -> pending -> authorized/paid`

Alternatives: `pending -> failed/expired`; `authorized/paid -> refund_pending -> partially_refunded/refunded`.

Hold states are derived from timestamps: active, consumed, released, or expired. Do not keep a free-form hold status that can contradict timestamps.

## Transition rules

- The client requests an order; the server recomputes route, train, product eligibility, price, capacity, and expiry.
- Creating the order and hold is one database transaction.
- A redirect/return page never confirms an order. Only a verified server-to-server payment event or an explicit offline-admin action can do so.
- Consuming a hold, marking payment paid, and confirming the order is one short database transaction.
- Duplicate gateway callbacks return success after observing the already-applied state.
- A late successful callback after hold expiry enters a manual-review state unless inventory can still be atomically secured. Never silently oversell.
- Cancelling or expiring an unpaid order releases its hold. Cancelling a paid order does not imply refund completion.
- Admin overrides require a reason and append-only audit record.

## Concurrency acceptance tests

1. Two clients race for the final standard cabin: one hold succeeds, one receives sold-out.
2. Two identical requests with the same idempotency key return the same order.
3. Payment callback is replayed ten times: one state transition and one receipt email.
4. Hold expires while callback arrives: deterministic confirmed or manual-review outcome, never negative availability.
5. Outbound leg succeeds and return leg is sold out: the entire round-trip hold rolls back.
6. Admin reduces capacity below active holds: reject the change or require an explicit override workflow.
