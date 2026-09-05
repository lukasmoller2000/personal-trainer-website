import assert from "node:assert/strict";
import { describe, it } from "node:test";
import robots from "../app/robots";
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
    assert.ok(json.includes("Falkevej 16B"));
    assert.ok(json.includes("lukasvmj"));
    assert.ok(json.includes("workLocation"));
    assert.equal(json.includes("parentOrganization"), false);
    assert.equal(json.includes("worksFor"), false);

    const business = data["@graph"].find((node) => node["@type"] === "LocalBusiness") as {
      address?: unknown;
    };
    const gym = data["@graph"].find((node) => node["@type"] === "HealthClub");
    assert.equal(business.address, undefined);
    assert.ok(JSON.stringify(gym).includes("Falkevej 16B"));
    assert.equal(json.includes("CVR"), false);
  });

  it("keeps /dev out of the public robots file", () => {
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? rules[0]?.disallow : rules.disallow;
    assert.ok(Array.isArray(disallow));
    assert.ok(disallow.includes("/dev"));
    assert.ok(disallow.includes("/api/"));
    assert.ok(disallow.includes("/admin"));
  });
});
