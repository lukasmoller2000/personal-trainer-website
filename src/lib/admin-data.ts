import { effectiveClipCardStatus } from "@/lib/commerce";
import { canShowAdminRefund, refundAmountOre } from "@/lib/refund-policy";

export const ADMIN_DATA_CACHE_CONTROL = "private, no-store, no-cache, must-revalidate";

export const ADMIN_DATA_HEADERS = {
  "Cache-Control": ADMIN_DATA_CACHE_CONTROL,
  Pragma: "no-cache",
} as const;

export const ADMIN_BOOKING_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  productId: true,
  date: true,
  time: true,
  status: true,
} as const;

export const ADMIN_ORDER_SELECT = {
  id: true,
  productId: true,
  status: true,
  amountOre: true,
  chargedAmountOre: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  stripeCheckoutSessionId: true,
  stripePaymentIntentId: true,
} as const;

export const ADMIN_CLIP_CARD_SELECT = {
  id: true,
  name: true,
  email: true,
  remaining: true,
  totalSessions: true,
  status: true,
  orderId: true,
  createdAt: true,
} as const;

export type AdminBookingRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  productId: string;
  date: string | null;
  time: string | null;
  status: string;
};

export type AdminOrderRow = {
  id: string;
  productId: string;
  status: string;
  amountOre: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  canRefund: boolean;
};

export type AdminClipCardRow = {
  id: string;
  name: string;
  email: string;
  remaining: number;
  totalSessions: number;
  status: string;
};

export type AdminDashboardData = {
  bookings: AdminBookingRow[];
  orders: AdminOrderRow[];
  clipCards: AdminClipCardRow[];
};

export const ADMIN_BOOKING_KEYS = [
  "id",
  "name",
  "email",
  "phone",
  "productId",
  "date",
  "time",
  "status",
] as const;

export const ADMIN_ORDER_KEYS = [
  "id",
  "productId",
  "status",
  "amountOre",
  "customerName",
  "customerEmail",
  "customerPhone",
  "canRefund",
] as const;

export const ADMIN_CLIP_CARD_KEYS = [
  "id",
  "name",
  "email",
  "remaining",
  "totalSessions",
  "status",
] as const;

export type AdminBookingSource = {
  id: string;
  name: string;
  email: string;
  phone: string;
  productId: string;
  date: string | null;
  time: string | null;
  status: string;
};

export type AdminOrderSource = {
  id: string;
  productId: string;
  status: string;
  amountOre: number;
  chargedAmountOre?: number | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
};

export type AdminClipCardSource = {
  id: string;
  name: string;
  email: string;
  remaining: number;
  totalSessions: number;
  status: string;
  orderId: string;
  createdAt?: Date | string | null;
  expiresAt?: Date | string | null;
};

export type AdminDataClient = {
  booking: { findMany: (args: object) => Promise<AdminBookingSource[]> };
  order: { findMany: (args: object) => Promise<AdminOrderSource[]> };
  clipCard: { findMany: (args: object) => Promise<AdminClipCardSource[]> };
};

export type AdminDataAuth =
  | { ok: true }
  | { ok: false; status: 401 | 404; error: string };

export function resolveAdminDataAuth(input: {
  configured: boolean;
  cookieValid: boolean;
}): AdminDataAuth {
  if (!input.configured) return { ok: false, status: 404, error: "Ikke fundet" };
  if (!input.cookieValid) return { ok: false, status: 401, error: "Ikke logget ind" };
  return { ok: true };
}

export function toAdminBookingRow(row: AdminBookingSource): AdminBookingRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    productId: row.productId,
    date: row.date,
    time: row.time,
    status: row.status,
  };
}

export function toAdminOrderRow(
  row: AdminOrderSource,
  clipCard: AdminClipCardSource | null
): AdminOrderRow {
  return {
    id: row.id,
    productId: row.productId,
    status: row.status,
    amountOre: refundAmountOre(row),
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    canRefund: canShowAdminRefund(row, clipCard),
  };
}

export function toAdminClipCardRow(row: AdminClipCardSource): AdminClipCardRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    remaining: row.remaining,
    totalSessions: row.totalSessions,
    status: effectiveClipCardStatus(row),
  };
}

export function toAdminDashboardData(input: {
  bookings: AdminBookingSource[];
  orders: AdminOrderSource[];
  clipCards: AdminClipCardSource[];
}): AdminDashboardData {
  const clipByOrderId = new Map(input.clipCards.map((card) => [card.orderId, card]));
  return {
    bookings: input.bookings.map(toAdminBookingRow),
    orders: input.orders.map((order) =>
      toAdminOrderRow(order, clipByOrderId.get(order.id) ?? null)
    ),
    clipCards: input.clipCards.map(toAdminClipCardRow),
  };
}

export async function loadAdminDashboardData(
  prisma: AdminDataClient | null
): Promise<AdminDashboardData> {
  if (!prisma) {
    return { bookings: [], orders: [], clipCards: [] };
  }

  const [bookings, orders, clipCards] = await Promise.all([
    prisma.booking.findMany({
      orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "desc" }],
      take: 200,
      select: ADMIN_BOOKING_SELECT,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: ADMIN_ORDER_SELECT,
    }),
    prisma.clipCard.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: ADMIN_CLIP_CARD_SELECT,
    }),
  ]);

  return toAdminDashboardData({ bookings, orders, clipCards });
}

export async function handleAdminDataGet(input: {
  configured: boolean;
  cookieValid: boolean;
  prisma: AdminDataClient | null;
}): Promise<{
  status: number;
  body: AdminDashboardData | { error: string };
  headers: typeof ADMIN_DATA_HEADERS;
}> {
  const auth = resolveAdminDataAuth(input);
  if (!auth.ok) {
    return { status: auth.status, body: { error: auth.error }, headers: ADMIN_DATA_HEADERS };
  }

  return {
    status: 200,
    body: await loadAdminDashboardData(input.prisma),
    headers: ADMIN_DATA_HEADERS,
  };
}

export const ADMIN_DATA_FORBIDDEN_KEYS = [
  "client_secret",
  "BOOKING_PAY_SECRET",
  "accessToken",
  "stripeCheckoutSessionId",
  "stripePaymentIntentId",
  "stripeSecret",
  "secret_key",
  "webhook",
  "webhookPayload",
  "metadata",
  "notes",
  "goal",
  "healthConsentAt",
  "healthConsentVersion",
  "vfgMemberId",
  "birthYear",
  "paymentUrl",
  "paymentToken",
  "holdUntil",
  "cancelledAt",
  "clipCardId",
  "orderId",
  "createdAt",
  "ADMIN_PASSWORD",
  "adminPassword",
  "membershipKey",
  "MEMBERSHIP_API_SECRET",
] as const;

export function collectObjectKeys(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectObjectKeys(item, into);
    return into;
  }
  if (!value || typeof value !== "object") return into;
  for (const [key, nested] of Object.entries(value)) {
    into.add(key);
    collectObjectKeys(nested, into);
  }
  return into;
}
