import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteUrl();
  const routes = ["", "/ydelser", "/booking", "/om", "/faq", "/kontakt", "/privatliv", "/vilkaar"];

  return routes.map((route) => ({
    url: `${origin}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" || route === "/booking" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/booking" ? 0.9 : 0.7,
  }));
}
