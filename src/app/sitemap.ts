import type { MetadataRoute } from "next";

/** Public origin only. Do not read env here — missing/invalid SITE_URL 500s /sitemap.xml. */
const SITEMAP_ORIGIN = "https://www.lukasmoller.dk";

const SITEMAP_PATHS = [
  "/",
  "/ydelser",
  "/booking",
  "/om",
  "/faq",
  "/kontakt",
  "/vilkaar",
  "/privatliv",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_PATHS.map((path) => ({
    url: path === "/" ? SITEMAP_ORIGIN : `${SITEMAP_ORIGIN}${path}`,
    lastModified: "2026-09-01",
    changeFrequency: path === "/" || path === "/booking" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/booking" ? 0.9 : 0.7,
  }));
}
