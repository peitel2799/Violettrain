# Daily operations workflow

## 1. Generate and publish departures

1. Choose a date range and service templates.
2. Preview the dated departures that will be inserted, updated, skipped, or cancelled.
3. Validate train/product rules, station times, arrival day offsets, and duplicate business keys.
4. Save drafts with an idempotent upsert.
5. Set cabin capacity and fare by product.
6. Publish only complete rows; public search never reads drafts.

## 2. Edit capacity

Display capacity, active holds, paid/confirmed cabins, blocked cabins, and remaining sellable cabins separately. Do not expose a single editable “available” counter that can contradict orders.

Reject capacity below committed demand. If an authorized override is necessary, require a reason, show affected orders, and place them in an exception queue rather than deleting them.

## 3. Edit price

The editor accepts one-ticket VND fare and previews the four-ticket cabin total live. Save the fare against a clear scope:

- one departure;
- a selected date range of generated departures; or
- a future template default that does not rewrite historical orders.

Existing active holds retain their quoted price until expiry. Confirmed orders always retain their snapshot.

## 4. Booking queue

Recommended queue groups:

- awaiting payment;
- payment review/late callback;
- paid and awaiting fulfillment;
- cancelled/refund requested;
- travel today/tomorrow.

Search by public reference, customer contact, train, departure date, and provider transaction ID. Mask PII in list views and reveal it only to authorized roles.

## 5. Audit and recovery

Every save records actor, timestamp, correlation ID, entity, previous value, new value, and reason when required. Favor status transitions and compensating actions over hard delete. Provide CSV export only through authenticated, logged server routes.

## Acceptance criteria

- Operations can change tomorrow's fare/capacity without redeploying.
- Public search reflects only published changes within the documented cache window.
- Two editors receive a conflict instead of silent last-write-wins.
- VIP2 cannot be assigned to a non-SE19 train or a capacity above one.
- One-ticket and four-ticket cabin values are visible before every price save.
- All list/filter/edit flows work at 768px and 1440px; critical approval flows also work at 390px.
