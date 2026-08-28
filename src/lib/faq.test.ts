import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { faqs } from "./faq";
import { getProduct } from "./products";

describe("faq", () => {
  it("covers objections with prices and facts already on the site", () => {
    const blob = faqs.map((item) => `${item.question} ${item.answer}`).join("\n");
    assert.match(blob, /300/);
    assert.match(blob, /1\.350|1350/);
    assert.match(blob, /799/);
    assert.match(blob, /Falkevej 16B/);
    assert.match(blob, /begyndere/i);
    assert.match(blob, /binding/i);
    assert.match(blob, /ca\. 60 minutter/);
    assert.equal(blob.includes("1.400"), false);
    assert.equal(blob.includes("2.600"), false);
    assert.equal(blob.includes("10 træninger"), false);
  });

  it("only lists online coaching deliverables that exist on the product", () => {
    const online = getProduct("online");
    assert.ok(online);
    const coachingFaq = faqs.find((item) => item.question === "Hvad får jeg i Online Coaching?");
    assert.ok(coachingFaq);
    for (const perk of online.perks) {
      assert.ok(
        coachingFaq.answer.toLowerCase().includes(perk.toLowerCase()) ||
          ["personligt træningsprogram", "kostplan", "ugentlige check-ins", "feedback", "justeringer", "tilpasning"].some(
            (token) => coachingFaq.answer.toLowerCase().includes(token)
          ),
        `missing perk context: ${perk}`
      );
    }
    assert.equal(/app|videoopkald|daglig besked/i.test(coachingFaq.answer), false);
  });
});
