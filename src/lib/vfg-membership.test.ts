import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { evaluateCheckoutStart } from "./checkout-guard";
import { resolveCheckoutPrice } from "./checkout-price";
import { rememberEventId } from "./commerce";
import { matchStripePaymentToCatalog } from "./stripe-fulfillment";
import {
  createHttpVfgMembershipLookup,
  createStaticVfgMembershipLookup,
  defaultUnverifiedVfgMembershipLookup,
  isActiveVfgMember,
  isTrustedMembershipApiUrl,
  lookupVfgMembership,
  membershipPreviewStatus,
  normalizeMembershipEmail,
  normalizeMembershipPhone,
  vfgPricePreviewMessage,
} from "./vfg-membership";

const PAYMENT_ENV = [
  "PAYMENTS_ENABLED",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_MODE",
  "DATABASE_URL",
  "STRIPE_PRICE_PT_SINGLE",
  "STRIPE_PRICE_PT_5_CLIP",
  "NODE_ENV",
  "VERCEL_ENV",
] as const;

function withPaymentEnv(values: Partial<Record<(typeof PAYMENT_ENV)[number], string>>, run: () => void) {
  const env = process.env as Record<string, string | undefined>;
  const previous = Object.fromEntries(PAYMENT_ENV.map((key) => [key, env[key]]));
  try {
    for (const key of PAYMENT_ENV) {
      const value = values[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
    run();
  } finally {
    for (const key of PAYMENT_ENV) {
      const value = previous[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
}

function mockVfgApi(handler: (request: Request) => Promise<Response> | Response) {
  return createHttpVfgMembershipLookup({
    url: "https://vfg.example.test/api/internal/membership-lookup",
    apiKey: "test-key",
    fetchImpl: (async (input, init) => {
      const request = input instanceof Request ? input : new Request(String(input), init);
      return handler(request);
    }) as typeof fetch,
  });
}

describe("VFG membership lookup", () => {
  it("defaults to unverified / non-member and never fake-verifies", async () => {
    const result = await lookupVfgMembership(
      {
        email: "member@example.com",
        phone: "25890453",
        name: "Member",
      },
      defaultUnverifiedVfgMembershipLookup
    );
    assert.equal(result.verified, false);
    assert.equal(result.active, false);
    assert.equal(result.status, "unverified");
    assert.equal(isActiveVfgMember(result), false);
    assert.equal(membershipPreviewStatus(result), "unverified");
    assert.match(vfgPricePreviewMessage("unverified"), /ikke bekræfte/);
    assert.equal(vfgPricePreviewMessage("member"), "VFG-medlemspris anvendes");
    assert.equal(vfgPricePreviewMessage("standard"), "Standardpris anvendes");

    const fallback = await defaultUnverifiedVfgMembershipLookup.lookup({
      email: "anyone@example.com",
    });
    assert.equal(isActiveVfgMember(fallback), false);
  });

  it("matches email first, phone second, and never name alone", async () => {
    const lookup = createStaticVfgMembershipLookup([
      { email: "active@example.com", phone: "11223344", status: "active", memberId: "m1" },
      { email: "old@example.com", phone: "55667788", status: "inactive" },
    ]);

    const byEmail = await lookupVfgMembership({ email: "Active@example.com", name: "Wrong" }, lookup);
    assert.equal(isActiveVfgMember(byEmail), true);
    assert.equal(byEmail.memberId, "m1");
    assert.equal(membershipPreviewStatus(byEmail), "member");

    const byPhone = await lookupVfgMembership({ phone: "+45 11 22 33 44" }, lookup);
    assert.equal(isActiveVfgMember(byPhone), true);

    const inactive = await lookupVfgMembership({ email: "old@example.com" }, lookup);
    assert.equal(isActiveVfgMember(inactive), false);
    assert.equal(inactive.verified, true);
    assert.equal(membershipPreviewStatus(inactive), "standard");

    const nameOnly = await lookupVfgMembership({ name: "Active Member" }, lookup);
    assert.equal(isActiveVfgMember(nameOnly), false);
    assert.equal(nameOnly.status, "unverified");

    const unknown = await lookupVfgMembership({ email: "unknown@example.com" }, lookup);
    assert.equal(unknown.status, "not_found");
    assert.equal(isActiveVfgMember(unknown), false);
  });

  it("normalizes Danish emails and phones", () => {
    assert.equal(normalizeMembershipEmail("  Foo@Bar.DK "), "foo@bar.dk");
    assert.equal(normalizeMembershipPhone("+45 25 89 04 53"), "25890453");
    assert.equal(normalizeMembershipPhone("4525890453"), "25890453");
  });

  it("treats HTTP lookup failures as unverified / standard price", async () => {
    const lookup = mockVfgApi(async () => {
      throw new Error("network");
    });
    const failed = await lookupVfgMembership({ email: "a@b.dk" }, lookup);
    assert.equal(failed.status, "unverified");
    assert.equal(isActiveVfgMember(failed), false);
    assert.equal(
      resolveCheckoutPrice({ productId: "session", isVfgMember: isActiveVfgMember(failed) })?.amountOre,
      30000
    );

    const notOk = mockVfgApi(async () => new Response("nope", { status: 500 }));
    const errored = await lookupVfgMembership({ email: "a@b.dk" }, notOk);
    assert.equal(errored.status, "unverified");
  });

  it("uses the real VFG { eligible } adapter: active, inactive, case, phone", async () => {
    const seen: Array<{ email?: string; phone?: string; auth?: string | null }> = [];
    const lookup = mockVfgApi(async (request) => {
      assert.equal(request.method, "POST");
      const payload = (await request.json()) as { email?: string; phone?: string };
      seen.push({
        email: payload.email,
        phone: payload.phone,
        auth: request.headers.get("authorization"),
      });
      assert.equal(request.headers.get("authorization"), "Bearer test-key");
      if (payload.email === "active@vfg.dk") {
        return Response.json({
          eligible: true,
          email: "active@vfg.dk",
          phone: "11223344",
          members: [{ email: "should-not-leak" }],
        });
      }
      if (payload.email === "old@vfg.dk") {
        return Response.json({ eligible: false });
      }
      if (!payload.email && payload.phone === "11223344") {
        return Response.json({ eligible: true });
      }
      return Response.json({ eligible: false });
    });

    const active = await lookupVfgMembership({ email: "  Active@VFG.dk " }, lookup);
    assert.equal(isActiveVfgMember(active), true);
    assert.equal(active.memberId ?? null, null);
    assert.equal("email" in active, false);
    assert.equal(
      resolveCheckoutPrice({ productId: "session", isVfgMember: isActiveVfgMember(active) })?.amountOre,
      25000
    );
    assert.equal(
      resolveCheckoutPrice({ productId: "pack-5", isVfgMember: isActiveVfgMember(active) })?.amountOre,
      115000
    );

    const inactive = await lookupVfgMembership({ email: "old@vfg.dk" }, lookup);
    assert.equal(isActiveVfgMember(inactive), false);
    assert.equal(inactive.verified, true);
    assert.equal(
      resolveCheckoutPrice({ productId: "session", isVfgMember: isActiveVfgMember(inactive) })?.amountOre,
      30000
    );
    assert.equal(
      resolveCheckoutPrice({ productId: "pack-5", isVfgMember: isActiveVfgMember(inactive) })?.amountOre,
      135000
    );

    const byPhone = await lookupVfgMembership({ phone: "+45 11 22 33 44" }, lookup);
    assert.equal(isActiveVfgMember(byPhone), true);

    assert.equal(seen[0]?.email, "active@vfg.dk");
    assert.equal(seen[2]?.phone, "11223344");
    assert.equal(seen[2]?.email, undefined);
  });

  it("accepts a legacy status payload and ignores extra PII", async () => {
    const lookup = mockVfgApi(async () =>
      Response.json({
        status: "active",
        memberId: "vfg-1",
        email: "secret@vfg.dk",
        phone: "11223344",
      })
    );
    const member = await lookupVfgMembership({ email: "a@b.dk" }, lookup);
    assert.equal(isActiveVfgMember(member), true);
    assert.equal(member.memberId, "vfg-1");
    assert.equal("email" in member, false);
    assert.equal("phone" in member, false);
  });

  it("does not enumerate members and ignores client isMember / amount", async () => {
    const lookup = mockVfgApi(async () => Response.json({ eligible: true }));
    const membership = await lookupVfgMembership({ email: "a@b.dk" }, lookup);
    assert.ok(!Array.isArray(membership));
    assert.equal("members" in membership, false);

    withPaymentEnv(
      {
        PAYMENTS_ENABLED: "true",
        STRIPE_SECRET_KEY: "sk_test_placeholder_not_live",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder_not_live",
        STRIPE_WEBHOOK_SECRET: "whsec_placeholder_not_live",
        DATABASE_URL: "postgres://placeholder",
        STRIPE_PRICE_PT_SINGLE: "price_test_session",
        STRIPE_PRICE_PT_5_CLIP: "price_test_pack",
      },
      () => {
        const ignored = evaluateCheckoutStart({
          productId: "session",
          clientAmount: 1,
          isMember: true,
          isVfgMember: true,
          priceTier: "vfg_member",
          earlyPerformanceRequested: true,
        });
        assert.equal(ignored.ok, true);
        if (!ignored.ok) return;
        assert.equal(ignored.amountOre, 30000);
        assert.equal(ignored.priceTier, "standard");

        const verified = evaluateCheckoutStart({
          productId: "session",
          clientAmount: 1,
          isMember: false,
          serverVerifiedVfgMember: isActiveVfgMember(membership),
          earlyPerformanceRequested: true,
        });
        assert.equal(verified.ok, true);
        if (!verified.ok) return;
        assert.equal(verified.amountOre, 25000);
      }
    );
  });

  it("keeps webhook / idempotency checks green for member amounts", () => {
    const seen = new Set<string>(["evt_member_1"]);
    assert.equal(rememberEventId(seen, "evt_member_1"), "duplicate");
    assert.equal(rememberEventId(seen, "evt_member_2"), "new");

    const first = matchStripePaymentToCatalog(
      "session",
      { paymentStatus: "paid", amountTotal: 25000, currency: "dkk" },
      { priceTier: "vfg_member", vfgMemberVerified: true, chargedAmountOre: 25000 }
    );
    const replay = matchStripePaymentToCatalog(
      "session",
      { paymentStatus: "paid", amountTotal: 25000, currency: "dkk" },
      { priceTier: "vfg_member", vfgMemberVerified: true, chargedAmountOre: 25000 }
    );
    assert.equal(first.ok, true);
    assert.equal(replay.ok, true);
  });

  it("only trusts https or localhost membership API URLs", () => {
    assert.equal(isTrustedMembershipApiUrl("https://vfg.example/api/internal/membership-lookup"), true);
    assert.equal(isTrustedMembershipApiUrl("http://localhost:3000/api/internal/membership-lookup"), true);
    assert.equal(isTrustedMembershipApiUrl("http://evil.example/api/internal/membership-lookup"), false);
  });

  it("reads the shared secret from PT_MEMBERSHIP_API_KEY", () => {
    const src = readFileSync(new URL("./vfg-membership.ts", import.meta.url), "utf8");
    assert.match(src, /process\.env\.PT_MEMBERSHIP_API_KEY/);
    assert.match(src, /process\.env\.VFG_MEMBERSHIP_API_URL/);
    assert.doesNotMatch(src, /process\.env\.VFG_MEMBERSHIP_API_KEY/);
  });
});
