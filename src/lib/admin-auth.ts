import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "nf_admin";

function adminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() || "";
}

export function isAdminConfigured() {
  return adminPassword().length >= 8;
}

function expectedToken() {
  const password = adminPassword();
  if (!password) return "";
  return createHmac("sha256", password).update("nordic-fit-admin-v1").digest("hex");
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    const dummy = createHmac("sha256", "length-mismatch").update(a).digest();
    timingSafeEqual(dummy, dummy);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function verifyAdminPassword(input: string) {
  const password = adminPassword();
  if (!password) return false;
  return safeEqual(input, password);
}

export function adminCookieValue() {
  return expectedToken();
}

export function isValidAdminCookie(value: string | undefined) {
  if (!value || !isAdminConfigured()) return false;
  return safeEqual(value, expectedToken());
}

export function newCsrfNonce() {
  return randomBytes(16).toString("hex");
}
