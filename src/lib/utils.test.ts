import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getSiteUrl } from "./utils";

const KEYS = [
  "APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "NODE_ENV",
] as const;

const env = process.env as Record<string, string | undefined>;
const saved = Object.fromEntries(KEYS.map((key) => [key, env[key]]));

function writeEnv(key: string, value: string | undefined) {
  if (value === undefined) delete env[key];
  else env[key] = value;
}

function setEnv(overrides: Partial<Record<(typeof KEYS)[number], string | undefined>>) {
  for (const key of KEYS) {
    writeEnv(key, key in overrides ? overrides[key] : undefined);
  }
}

afterEach(() => {
  for (const key of KEYS) writeEnv(key, saved[key]);
});

describe("getSiteUrl", () => {
  it("prefers APP_URL over NEXT_PUBLIC_SITE_URL", () => {
    setEnv({
      APP_URL: "http://localhost:3001",
      NEXT_PUBLIC_SITE_URL: "https://lukasmoller.dk",
      NODE_ENV: "development",
    });
    assert.equal(getSiteUrl(), "http://localhost:3001");
  });

  it("uses NEXT_PUBLIC_SITE_URL when APP_URL is empty", () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: "https://lukasmoller.dk",
      NODE_ENV: "development",
    });
    assert.equal(getSiteUrl(), "https://lukasmoller.dk");
  });

  it("never returns localhost in production when env is empty", () => {
    setEnv({ NODE_ENV: "production" });
    assert.equal(getSiteUrl(), "https://lukasmoller.dk");
  });

  it("ignores a localhost APP_URL in production", () => {
    setEnv({
      APP_URL: "http://localhost:3001",
      NODE_ENV: "production",
    });
    assert.equal(getSiteUrl(), "https://lukasmoller.dk");
  });

  it("ignores localhost APP_URL on Vercel production", () => {
    setEnv({
      APP_URL: "http://127.0.0.1:3000",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3001",
      VERCEL: "1",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    });
    assert.equal(getSiteUrl(), "https://lukasmoller.dk");
  });

  it("keeps an explicit public APP_URL in production", () => {
    setEnv({
      APP_URL: "https://www.lukasmoller.dk",
      NODE_ENV: "production",
    });
    assert.equal(getSiteUrl(), "https://www.lukasmoller.dk");
  });

  it("falls back to localhost:3000 in development when unset", () => {
    setEnv({ NODE_ENV: "development" });
    assert.equal(getSiteUrl(), "http://localhost:3000");
  });
});
