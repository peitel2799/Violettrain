# Gateway contracts

Provider documentation changes. Re-check the linked official documentation before implementation or certification.

## VNPay Payment Gateway 2.1.0

Official documentation: <https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html>

- Generate the payment URL on the server.
- Sort request parameter names as required by the current specification and sign with the merchant hash secret.
- The current 2.1.0 guidance uses HMAC-SHA512; do not copy MD5/SHA256 legacy samples.
- VNPay represents the amount as VND multiplied by 100 in gateway parameters. Compare the normalized VND amount with the stored order total.
- `vnp_TxnRef` is the merchant transaction reference and must satisfy VNPay uniqueness requirements.
- The browser receives `vnp_ReturnUrl`; use it only to render a pending/success/failure message after checksum validation.
- The server receives the IPN. Validate checksum first, then order existence, amount, current status, response code, and transaction status.
- Return exactly the documented `RspCode`/`Message` behavior so VNPay knows whether to stop or retry. Duplicate already-applied IPNs are successful idempotent acknowledgements, not errors.
- Store `vnp_TransactionNo`, bank code/card type when operationally useful, response code, transaction status, pay date, and redacted event data.

## MoMo Payment API

Official documentation: <https://developers.momo.vn/v3/vi/docs/payment/api/collection-link/> and <https://developers.momo.vn/v3/vi/docs/payment/api/result-handling/notification/>

- Generate request ID, order ID, `redirectUrl`, `ipnUrl`, amount, and HMAC-SHA256 signature on the server using the exact documented field order for the chosen MoMo product.
- Do not assume signing fields are identical across MoMo products. Implement the selected contract explicitly and lock it with test vectors.
- The browser redirect is presentation-only. The IPN is a JSON POST to the server.
- Validate IPN signature and match `partnerCode`, `orderId`, `requestId`, amount, and stored payment before applying a transition.
- For the documented notification contract, respond with HTTP 204 within 15 seconds. Keep the handler short; queue non-critical email/analytics work after the authoritative transaction.
- Normalize `resultCode = 0` as success for ordinary payment. Handle `9000` only according to the selected product's authorization/confirmation contract; do not treat every nonzero code as final without checking current official result-code guidance.
- MoMo supports idempotency guidance for POST requests. Reuse stable merchant keys on safe retries and deduplicate incoming events locally.

## Shared reconciliation

- Schedule queries for payments left pending beyond their expected window and for callback processing failures.
- Never overwrite a paid state with a later ambiguous/failed event without provider-specific evidence.
- Track mismatch categories: missing callback, amount mismatch, invalid signature, unknown transaction, late success, refund mismatch.
- Manual resolution records actor, evidence, reason, previous state, new state, and provider query timestamp.
