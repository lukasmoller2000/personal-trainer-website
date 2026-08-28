import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pageSeo, siteJsonLd } from "./seo";

describe("seo", () => {
  it("sets canonical and Open Graph url", () => {
    const meta = pageSeo("/ydelser", {
      title: "Ydelser",
      description: "PT og online coaching",
    });

    assert.equal(meta.alternates?.canonical, "/ydelser");
    assert.equal(meta.openGraph?.url, "/ydelser");
    assert.equal(meta.openGraph?.title, "Ydelser");
  });

  it("builds Person, Service and LocalBusiness JSON-LD without ratings", () => {
    const data = siteJsonLd("https://lukasmoller.dk");
    const types = data["@graph"].map((node) => node["@type"]);
    const json = JSON.stringify(data);

    assert.ok(types.includes("Person"));
    assert.ok(types.includes("Service"));
    assert.ok(types.includes("LocalBusiness"));
    assert.equal(json.includes("aggregateRating"), false);
    assert.equal(json.includes("reviewRating"), false);
    assert.ok(json.includes("300"));
    assert.ok(json.includes("1350"));
    assert.ok(json.includes("799"));
    assert.ok(json.includes("Falkevej 16B"));
    assert.ok(json.includes("lukasvmj"));
  });
});
