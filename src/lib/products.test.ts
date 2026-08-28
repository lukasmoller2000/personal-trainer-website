import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getProduct,
  products,
  resolveCheckoutAmountOre,
  trackEventForProduct,
} from "./products";
import { priceLabel } from "./utils";

describe("products", () => {
  it("exposes PT at 300, the 5-pack at 1350, and online coaching at 799", () => {
    const pt = getProduct("session");
    const five = getProduct("pack-5");
    const online = getProduct("online");

    assert.ok(pt);
    assert.ok(five);
    assert.equal(getProduct("pack-10"), undefined);
    assert.ok(online);
    assert.equal(pt.price, 300);
    assert.equal(five.price, 1350);
    assert.equal(five.sessions, 5);
    assert.equal((pt.price ?? 0) * 5 - (five.price ?? 0), 150);
    assert.equal((five.price ?? 0) / five.sessions, 270);
    assert.equal(online.price, 799);
    assert.equal(online.pricePrefix, undefined);
    assert.equal(five.cta, "Send forespørgsel");
    assert.equal(online.cta, "Start online coaching");
    assert.equal(pt.cta, "Book personlig træning");
    assert.equal(products.length, 3);
    assert.equal(products.filter((product) => product.kind === "pack").length, 1);
  });

  it("looks up checkout amount from product id and ignores client price", () => {
    assert.equal(resolveCheckoutAmountOre("session", 1), 30000);
    assert.equal(resolveCheckoutAmountOre("pack-5", 999999), 135000);
    assert.equal(resolveCheckoutAmountOre("pack-10"), null);
    assert.equal(resolveCheckoutAmountOre("online", 799), null);
    assert.equal(resolveCheckoutAmountOre("unknown", 300), null);
  });

  it("formats exact prices without Fra", () => {
    const pt = getProduct("session");
    const online = getProduct("online");
    assert.ok(pt);
    assert.ok(online);

    const ptLabel = priceLabel(pt);
    const onlineLabel = priceLabel(online);

    assert.match(ptLabel, /300/);
    assert.doesNotMatch(ptLabel, /^Fra /);
    assert.match(onlineLabel, /799/);
    assert.match(onlineLabel, /md/);
    assert.doesNotMatch(onlineLabel, /^Fra /);
  });

  it("maps product CTAs to track events", () => {
    assert.equal(trackEventForProduct("session"), "pt_cta_clicked");
    assert.equal(trackEventForProduct("pack-5"), "pt_cta_clicked");
    assert.equal(trackEventForProduct("online"), "coaching_cta_clicked");
  });

  it("keeps online coaching deliverables to the existing product", () => {
    const online = getProduct("online");
    assert.ok(online);
    assert.deepEqual(online.perks, [
      "Personligt træningsprogram",
      "Kostplan",
      "Ugentlige check-ins",
      "Feedback og opfølgning",
      "Løbende justeringer",
      "Tilpasning efter dine resultater og hverdag",
    ]);
  });
});
