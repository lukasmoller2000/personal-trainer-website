import assert from "node:assert/strict";
import { describe, it } from "node:test";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { pageSeo, siteJsonLd } from "./seo";
import { siteConfig, socialInstagramHref } from "./utils";

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
    assert.equal(socialInstagramHref(), siteConfig.links.instagramPersonal);
    assert.equal(socialInstagramHref(false), siteConfig.links.instagram);
    assert.ok(json.includes("workLocation"));
    assert.equal(json.includes("parentOrganization"), false);
    assert.equal(json.includes("worksFor"), false);

    const business = data["@graph"].find((node) => node["@type"] === "LocalBusiness") as {
      address?: { streetAddress?: string };
    };
    const gym = data["@graph"].find((node) => node["@type"] === "HealthClub");
    assert.match(String(business.address?.streetAddress), /Hedevænget 95/);
    assert.doesNotMatch(String(business.address?.streetAddress), /Falkevej/);
    assert.ok(JSON.stringify(gym).includes("Falkevej 16B"));
    assert.doesNotMatch(JSON.stringify(gym), /Hedevænget/);
    assert.equal(json.includes("CVR"), false);
  });

  it("lists only public www canonical pages in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    assert.deepEqual(urls, [
      "https://www.lukasmoller.dk",
      "https://www.lukasmoller.dk/ydelser",
      "https://www.lukasmoller.dk/booking",
      "https://www.lukasmoller.dk/om",
      "https://www.lukasmoller.dk/faq",
      "https://www.lukasmoller.dk/kontakt",
      "https://www.lukasmoller.dk/vilkaar",
      "https://www.lukasmoller.dk/privatliv",
    ]);
    assert.equal(
      urls.some((url) => /\/(admin|api\/|dev\/|booking\/betaling)/.test(url)),
      false
    );
  });

  it("keeps /dev out of the public robots file", () => {
    const rules = robots().rules;
    const disallow = Array.isArray(rules) ? rules[0]?.disallow : rules.disallow;
    assert.ok(Array.isArray(disallow));
    assert.ok(disallow.includes("/dev"));
    assert.ok(disallow.includes("/api/"));
    assert.ok(disallow.includes("/admin"));
    assert.ok(disallow.includes("/booking/betaling"));
  });
});
