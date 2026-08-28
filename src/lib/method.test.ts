import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { methodSteps } from "./method";

describe("method", () => {
  it("uses a 5-step flow in Lukas's voice", () => {
    assert.equal(methodSteps.length, 5);
    assert.deepEqual(
      methodSteps.map((step) => step.title),
      ["Mål", "Plan", "Træning", "Opfølgning", "Resultater"]
    );
    const blob = methodSteps.map((step) => `${step.title} ${step.text}`).join(" ");
    assert.equal(blob.includes("Trust"), false);
    assert.equal(/garanti|garanterer/i.test(blob), false);
  });
});
