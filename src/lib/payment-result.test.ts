import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookingCancelQuery,
  customerOrderStatusLabel,
  PAYMENT_CANCEL_QUERY,
  paymentCancelCopy,
  paymentSuccessNextStep,
} from "./payment-result";

describe("payment result copy", () => {
  it("shows customer-facing status labels without internal dumps", () => {
    assert.equal(customerOrderStatusLabel("paid"), "Betalt");
    assert.equal(customerOrderStatusLabel("failed"), "Ikke betalt");
    assert.equal(customerOrderStatusLabel("cancelled"), "Ikke betalt");
    assert.equal(customerOrderStatusLabel("pending"), "Afventer bekræftelse");
    assert.doesNotMatch(customerOrderStatusLabel("paid"), /stripe|session|order/i);
  });

  it("explains pack-5 clip balance as the next step", () => {
    const next = paymentSuccessNextStep({
      productId: "pack-5",
      hasClipCard: true,
      hasTimeslot: false,
    });
    assert.match(next, /klippekortet/);
    assert.match(next, /træninger/);
  });

  it("tells the customer cancel did not mark anything paid", () => {
    const copy = paymentCancelCopy();
    assert.match(copy.title, /ikke gennemført/);
    assert.match(copy.body, /ikke trukket penge/);
    assert.match(copy.body, /ikke.*betalt/);
    assert.match(copy.tryAgain, /Prøv igen/);
    assert.doesNotMatch(`${copy.title} ${copy.body}`, /stripe|webhook|session_id|orderId/i);
    assert.equal(PAYMENT_CANCEL_QUERY, "annulleret");
    assert.match(bookingCancelQuery("pack-5"), /produkt=pack-5/);
    assert.match(bookingCancelQuery("pack-5"), /betaling=annulleret/);
  });
});
