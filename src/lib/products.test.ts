import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getProduct, products, trackEventForProduct } from "./products";
import { priceLabel } from "./utils";

describe("products", () => {
  it("exposes PT at 350 and online coaching at 799 without a from-prefix", () => {
    const pt = getProduct("session");
    const online = getProduct("online");

    assert.ok(pt);
    assert.ok(online);
    assert.equal(pt.price, 350);
    assert.equal(online.price, 799);
    assert.equal(online.pricePrefix, undefined);
    assert.equal(products.length, 2);
  });

  it("formats exact prices without Fra", () => {
    const pt = getProduct("session");
    const online = getProduct("online");
    assert.ok(pt);
    assert.ok(online);

    const ptLabel = priceLabel(pt);
    const onlineLabel = priceLabel(online);

    assert.match(ptLabel, /350/);
    assert.doesNotMatch(ptLabel, /^Fra /);
    assert.match(onlineLabel, /799/);
    assert.match(onlineLabel, /md/);
    assert.doesNotMatch(onlineLabel, /^Fra /);
  });

  it("maps product CTAs to track events", () => {
    assert.equal(trackEventForProduct("session"), "pt_cta_clicked");
    assert.equal(trackEventForProduct("online"), "coaching_cta_clicked");
  });
});
