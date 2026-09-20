import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { ComponentProps } from "react";
import type { AdminDashboard } from "../components/admin/AdminDashboard";
import {
  ADMIN_BOOKING_KEYS,
  ADMIN_CLIP_CARD_KEYS,
  ADMIN_DATA_CACHE_CONTROL,
  ADMIN_DATA_FORBIDDEN_KEYS,
  ADMIN_DATA_HEADERS,
  ADMIN_ORDER_KEYS,
  collectObjectKeys,
  handleAdminDataGet,
  loadAdminDashboardData,
  toAdminDashboardData,
  type AdminBookingSource,
  type AdminClipCardSource,
  type AdminDashboardData,
  type AdminDataClient,
  type AdminOrderSource,
} from "./admin-data";
import {
  canConfirmSessionInquiry,
  canRejectSessionBooking,
  canResendPaymentLink,
} from "./booking-payment";
import { canShowAdminRefund } from "./refund-policy";

type DashboardProps = ComponentProps<typeof AdminDashboard>;
const _dashboardAcceptsMinimalData: DashboardProps = {
  bookings: [],
  orders: [],
  clipCards: [],
} satisfies AdminDashboardData;
void _dashboardAcceptsMinimalData;

function objectKeys(value: object) {
  return Object.keys(value).sort();
}

function expectedKeys(keys: readonly string[]) {
  return [...keys].sort();
}

function bookingSource(overrides: Partial<AdminBookingSource> = {}): AdminBookingSource {
  return {
    id: "bk_1",
    name: "Anna Test",
    email: "anna@example.com",
    phone: "11223344",
    productId: "session",
    date: "2099-06-02",
    time: "07:00",
    status: "inquiry",
    ...overrides,
  };
}

function orderSource(overrides: Partial<AdminOrderSource> = {}): AdminOrderSource {
  return {
    id: "ord_1",
    productId: "session",
    status: "paid",
    amountOre: 30000,
    chargedAmountOre: 27000,
    customerName: "Bo Test",
    customerEmail: "bo@example.com",
    customerPhone: "55667788",
    stripeCheckoutSessionId: "cs_test_secret_session",
    stripePaymentIntentId: "pi_test_secret_intent",
    ...overrides,
  };
}

function clipSource(overrides: Partial<AdminClipCardSource> = {}): AdminClipCardSource {
  return {
    id: "clip_1",
    name: "Clara Test",
    email: "clara@example.com",
    remaining: 5,
    totalSessions: 5,
    status: "active",
    orderId: "ord_pack",
    ...overrides,
  };
}

const leakedSource = {
  ...bookingSource(),
  goal: "Vægttab og notes-lignende mål",
  notes: "Fulde interne noter med PII",
  orderId: "ord_hidden",
  clipCardId: "clip_hidden",
  createdAt: "2026-01-01T00:00:00.000Z",
  holdUntil: "2026-01-02T00:00:00.000Z",
  cancelledAt: null,
  accessToken: "clip-access-token",
  client_secret: "pi_secret_should_never_leak",
  BOOKING_PAY_SECRET: "hmac-booking-secret",
  paymentUrl: "https://example.com/pay?token=signed-hmac",
  paymentToken: "signed-hmac-token",
  metadata: { stripe: "raw" },
  webhook: { type: "checkout.session.completed" },
  webhookPayload: { data: { object: { id: "evt_1" } } },
  vfgMemberId: "member-42",
  birthYear: 1990,
  ADMIN_PASSWORD: "super-secret",
  membershipKey: "vfg-api-secret",
  MEMBERSHIP_API_SECRET: "vfg-api-secret",
};

function fakeStore(seed: {
  bookings?: AdminBookingSource[];
  orders?: AdminOrderSource[];
  clipCards?: AdminClipCardSource[];
} = {}): AdminDataClient {
  return {
    booking: {
      async findMany() {
        return seed.bookings ?? [];
      },
    },
    order: {
      async findMany() {
        return seed.orders ?? [];
      },
    },
    clipCard: {
      async findMany() {
        return seed.clipCards ?? [];
      },
    },
  };
}

describe("GET /api/admin/data auth", () => {
  it("returns 401 for an unauthenticated session", async () => {
    const result = await handleAdminDataGet({
      configured: true,
      cookieValid: false,
      prisma: fakeStore({ bookings: [bookingSource()] }),
    });
    assert.equal(result.status, 401);
    assert.deepEqual(result.body, { error: "Ikke logget ind" });
    assert.equal(result.headers["Cache-Control"], ADMIN_DATA_CACHE_CONTROL);
    assert.match(result.headers["Cache-Control"], /no-store/);
    assert.match(result.headers["Cache-Control"], /no-cache/);
    assert.match(result.headers["Cache-Control"], /private/);
  });

  it("hides the endpoint when admin is not configured", async () => {
    const result = await handleAdminDataGet({
      configured: false,
      cookieValid: true,
      prisma: fakeStore({ bookings: [bookingSource()] }),
    });
    assert.equal(result.status, 404);
    assert.deepEqual(result.body, { error: "Ikke fundet" });
    assert.equal(result.headers["Cache-Control"], ADMIN_DATA_CACHE_CONTROL);
  });
});

describe("GET /api/admin/data shape", () => {
  it("returns only the fields the dashboard reads", async () => {
    const pack = orderSource({
      id: "ord_pack",
      productId: "pack-5",
      amountOre: 135000,
      chargedAmountOre: 135000,
    });
    const result = await handleAdminDataGet({
      configured: true,
      cookieValid: true,
      prisma: fakeStore({
        bookings: [bookingSource()],
        orders: [orderSource(), pack],
        clipCards: [clipSource()],
      }),
    });

    assert.equal(result.status, 200);
    assert.equal(result.headers["Cache-Control"], ADMIN_DATA_CACHE_CONTROL);
    assert.deepEqual(result.headers, ADMIN_DATA_HEADERS);

    const body = result.body as AdminDashboardData;
    assert.deepEqual(objectKeys(body), ["bookings", "clipCards", "orders"].sort());
    assert.deepEqual(objectKeys(body.bookings[0]), expectedKeys(ADMIN_BOOKING_KEYS));
    assert.deepEqual(objectKeys(body.orders[0]), expectedKeys(ADMIN_ORDER_KEYS));
    assert.deepEqual(objectKeys(body.clipCards[0]), expectedKeys(ADMIN_CLIP_CARD_KEYS));

    assert.equal(body.bookings[0].name, "Anna Test");
    assert.equal(body.bookings[0].email, "anna@example.com");
    assert.equal(body.bookings[0].phone, "11223344");
    assert.equal(body.orders[0].amountOre, 27000);
    assert.equal(body.orders[0].canRefund, true);
    assert.equal(body.orders[1].canRefund, true);
    assert.equal(body.clipCards[0].remaining, 5);
  });

  it("strips unused and sensitive source fields", () => {
    const data = toAdminDashboardData({
      bookings: [leakedSource],
      orders: [
        {
          ...orderSource(),
          ...leakedSource,
          id: "ord_1",
          customerName: "Bo Test",
          customerEmail: "bo@example.com",
          customerPhone: "55667788",
        },
      ],
      clipCards: [
        {
          ...clipSource(),
          ...leakedSource,
          id: "clip_1",
          orderId: "ord_1",
        },
      ],
    });

    const keys = collectObjectKeys(data);
    for (const forbidden of ADMIN_DATA_FORBIDDEN_KEYS) {
      assert.equal(keys.has(forbidden), false, `leaked key ${forbidden}`);
    }

    const json = JSON.stringify(data);
    for (const needle of [
      "client_secret",
      "pi_secret_should_never_leak",
      "BOOKING_PAY_SECRET",
      "hmac-booking-secret",
      "cs_test_secret_session",
      "pi_test_secret_intent",
      "clip-access-token",
      "signed-hmac",
      "checkout.session.completed",
      "vfg-api-secret",
      "member-42",
      "Fulde interne noter",
      "sk_live",
      "sk_test",
      "whsec_",
    ]) {
      assert.equal(json.includes(needle), false, `leaked value ${needle}`);
    }
  });

  it("computes refund visibility server-side so Stripe ids stay off the client", () => {
    const paid = orderSource();
    const unusedPack = orderSource({
      id: "ord_pack",
      productId: "pack-5",
      amountOre: 135000,
      chargedAmountOre: 135000,
    });
    const usedClip = clipSource({ remaining: 4, orderId: "ord_pack" });
    const pending = orderSource({ id: "ord_pending", status: "pending" });

    const data = toAdminDashboardData({
      bookings: [],
      orders: [paid, unusedPack, pending],
      clipCards: [usedClip],
    });

    assert.equal(data.orders[0].canRefund, canShowAdminRefund(paid, null));
    assert.equal(data.orders[1].canRefund, canShowAdminRefund(unusedPack, usedClip));
    assert.equal(data.orders[1].canRefund, false);
    assert.equal(data.orders[2].canRefund, false);
    assert.equal("stripePaymentIntentId" in data.orders[0], false);
    assert.equal("stripeCheckoutSessionId" in data.orders[0], false);
  });
});

describe("admin dashboard actions with the minimal payload", () => {
  it("confirm/reject/resend only need bookingId from the response", () => {
    const inquiry = toAdminDashboardData({
      bookings: [bookingSource({ status: "inquiry" })],
      orders: [],
      clipCards: [],
    }).bookings[0];
    const awaiting = toAdminDashboardData({
      bookings: [bookingSource({ id: "bk_pay", status: "awaiting_payment" })],
      orders: [],
      clipCards: [],
    }).bookings[0];

    assert.equal(canConfirmSessionInquiry(inquiry).ok, true);
    assert.equal(canRejectSessionBooking(inquiry).ok, true);
    assert.equal(canResendPaymentLink(awaiting).ok, true);
    assert.deepEqual(
      { bookingId: inquiry.id, action: "confirm" },
      { bookingId: "bk_1", action: "confirm" }
    );
    assert.deepEqual(
      { bookingId: inquiry.id, action: "reject" },
      { bookingId: "bk_1", action: "reject" }
    );
    assert.deepEqual(
      { bookingId: awaiting.id, action: "resend" },
      { bookingId: "bk_pay", action: "resend" }
    );
  });

  it("refund only needs orderId from the response", () => {
    const data = toAdminDashboardData({
      bookings: [],
      orders: [orderSource()],
      clipCards: [],
    });
    assert.equal(data.orders[0].canRefund, true);
    assert.deepEqual({ orderId: data.orders[0].id }, { orderId: "ord_1" });
  });

  it("returns empty collections without a database", async () => {
    const data = await loadAdminDashboardData(null);
    assert.deepEqual(data, { bookings: [], orders: [], clipCards: [] });
  });
});

describe("admin data sources stay minimized", () => {
  it("route and dashboard do not serialize Stripe refs or signed tokens", () => {
    const route = readFileSync("src/app/api/admin/data/route.ts", "utf8");
    const page = readFileSync("src/app/admin/page.tsx", "utf8");
    const dashboard = readFileSync("src/components/admin/AdminDashboard.tsx", "utf8");

    assert.match(route, /handleAdminDataGet/);
    assert.match(route, /headers: result\.headers/);
    assert.match(page, /loadAdminDashboardData/);
    assert.equal(dashboard.includes("stripePaymentIntentId"), false);
    assert.equal(dashboard.includes("stripeCheckoutSessionId"), false);
    assert.equal(dashboard.includes("paymentUrl"), true);
    assert.match(dashboard, /bookingId: row\.id/);
    assert.match(dashboard, /orderId/ );
    assert.match(dashboard, /JSON\.stringify\(\{ orderId \}\)/);
  });
});
