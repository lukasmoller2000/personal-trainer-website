import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { verifyAdminPassword } from "./admin-auth";

const original = process.env.ADMIN_PASSWORD;

afterEach(() => {
  if (original === undefined) {
    delete process.env.ADMIN_PASSWORD;
  } else {
    process.env.ADMIN_PASSWORD = original;
  }
});

test("admin login trims input and env before timing-safe compare", () => {
  process.env.ADMIN_PASSWORD = "  SecretPass12  ";
  assert.equal(verifyAdminPassword("SecretPass12"), true);
  assert.equal(verifyAdminPassword("  SecretPass12  "), true);
  assert.equal(verifyAdminPassword("SecretPass12\n"), true);
  assert.equal(verifyAdminPassword("wrong"), false);
});
