import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { persistCreatedBooking } from "./bookings";
import {
  BookingPersistenceError,
  bookingPersistenceTarget,
  persistBooking,
} from "./db";

const ENV_KEYS = ["NODE_ENV", "VERCEL_ENV", "DATABASE_URL"] as const;

function withEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>, run: () => void | Promise<void>) {
  const env = process.env as Record<string, string | undefined>;
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, env[key]]));
  const work = async () => {
    for (const key of ENV_KEYS) {
      const value = values[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
    await run();
  };
  return work().finally(() => {
    for (const key of ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  });
}

const sample = {
  id: "booking_test",
  productId: "session",
  type: "session" as const,
  name: "Test",
  email: "test@example.com",
  phone: "25890453",
  goal: "Styrke",
  createdAt: "2026-09-11T10:00:00.000Z",
};

describe("booking persistence", () => {
  it("uses Prisma on the production path", async () => {
    await withEnv({ NODE_ENV: "production", VERCEL_ENV: "production" }, () => {
      assert.equal(bookingPersistenceTarget(), "prisma");
    });
  });

  it("may skip persistence in development without a database", async () => {
    await withEnv({ NODE_ENV: "development", VERCEL_ENV: "development" }, () => {
      assert.equal(bookingPersistenceTarget(), "none");
    });
  });

  it("writes the booking to the database client on the production path", async () => {
    const created: unknown[] = [];
    await withEnv({ NODE_ENV: "production", VERCEL_ENV: "production" }, async () => {
      const result = await persistBooking(sample, {
        booking: {
          create: async ({ data }) => {
            created.push(data);
            return data;
          },
        },
      });
      assert.equal(result.persisted, true);
      assert.equal(result.target, "prisma");
      assert.equal(created.length, 1);
      assert.equal((created[0] as { id: string }).id, "booking_test");
    });
  });

  it("does not use a local bookings.json file", () => {
    const sources = [
      "src/lib/db.ts",
      "src/lib/bookings.ts",
      "src/app/api/bookings/route.ts",
    ].map((file) => readFileSync(file, "utf8"));

    for (const source of sources) {
      assert.equal(source.includes("bookings.json"), false);
      assert.equal(source.includes("writeFile"), false);
      assert.equal(source.includes("data/bookings"), false);
    }
  });

  it("fails the production booking if the database write fails", async () => {
    await withEnv({ NODE_ENV: "production", VERCEL_ENV: "production" }, async () => {
      await assert.rejects(
        () => persistBooking(sample, null),
        BookingPersistenceError
      );
      await assert.rejects(() => persistCreatedBooking(sample), BookingPersistenceError);
    });
  });
});
