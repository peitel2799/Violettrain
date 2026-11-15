---
name: violette-payment-gateways
description: Design, implement, review, or troubleshoot Violette Train online payments through VNPay or MoMo, including checkout creation, signed return/IPN handling, idempotency, reconciliation, refunds, and payment UX. Use only when payment work is explicitly requested; do not use for unrelated admin accounting or generic booking UI.
---

# Violette Payment Gateways

Treat payment as an asynchronous state machine around a server-owned order. Start in provider sandbox and enable one gateway at a time. Never handle real merchant credentials or production charges unless the user explicitly authorizes that environment.

## Non-negotiable invariants

- The server loads the payable order and amount from Supabase. The browser never supplies an authoritative amount, order status, callback result, or product description.
- Secrets, access keys, hash secrets, and service-role credentials are server-only and never logged or exposed through `NEXT_PUBLIC_*`.
- Create checkout with a unique merchant request/reference and an idempotency key.
- Redirect/return URLs are display-only. A verified provider IPN/webhook or explicit reconciled provider query is the authority for payment state.
- Verify signature/checksum before database lookup side effects, then compare provider, merchant reference, amount, currency, and current state with stored values.
- Store and deduplicate provider events. Replayed callbacks must return the provider's success acknowledgement without sending duplicate emails or consuming inventory twice.
- Confirm payment, consume inventory hold, and confirm the order in one short database transaction. Make external calls before or after that transaction.
- Use timing-safe comparisons where applicable. Redact secrets, signatures, full payload PII, and tokens from logs.
- A late success after hold expiry or an amount mismatch enters manual review; never silently confirm an oversold cabin.

Read [references/gateway-contracts.md](references/gateway-contracts.md) before writing VNPay or MoMo signing/callback code.

## Adapter boundary

Implement one internal interface so the booking domain does not depend on provider field names:

- `createCheckout(order)` returns provider, merchant request ID, expiry, and redirect/deep-link data.
- `verifyCallback(rawRequest)` returns a normalized event only after signature verification.
- `queryTransaction(payment)` supports reconciliation.
- `requestRefund(payment, amount, reason)` records an initiated refund; callback/query establishes the final state.

Keep raw provider codes alongside normalized states. Never collapse “authorized,” “paid,” “failed,” “expired,” “refund pending,” and “refunded” into one boolean.

## Delivery sequence

1. Finalize order/hold/payment tables and idempotent state transitions.
2. Implement fake gateway and automated callback replay tests.
3. Integrate VNPay sandbox as the first recommended Vietnam web gateway.
4. Add reconciliation job and admin payment-review queue.
5. Complete sandbox certification and failure-case evidence.
6. Add MoMo behind the same adapter after VNPay is stable.
7. Enable production through explicit environment configuration and a documented rollback switch.

## Verification

- Test success, cancel, timeout, invalid signature, wrong amount, unknown order, duplicate callback, out-of-order callback, provider 5xx, and late success.
- Replay the same IPN at least ten times; exactly one transition, inventory consumption, receipt, and audit record occur.
- Verify return-page refresh never mutates payment state.
- Reconcile synthetic discrepancies and prove they enter the admin review queue.
- Run type checks, integration tests, build, and end-to-end sandbox flows on mobile and desktop.
