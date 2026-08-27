import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasTestimonials, testimonials } from "./testimonials";

describe("testimonials", () => {
  it("stays empty until real client stories exist", () => {
    assert.equal(testimonials.length, 0);
    assert.equal(hasTestimonials(), false);
  });

  it("only counts entries with a name and quote", () => {
    assert.equal(hasTestimonials([{ name: "Anna", quote: "Klar plan." }]), true);
    assert.equal(hasTestimonials([{ name: " ", quote: "Mangler navn" }]), false);
    assert.equal(hasTestimonials([{ name: "Anna", quote: "  " }]), false);
  });
});
