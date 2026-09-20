import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminConfigured, isValidAdminCookie } from "@/lib/admin-auth";
import { handleAdminDataGet, type AdminDataClient } from "@/lib/admin-data";
import { getPrisma } from "@/lib/db";

export async function GET() {
  const jar = await cookies();
  const result = await handleAdminDataGet({
    configured: isAdminConfigured(),
    cookieValid: isValidAdminCookie(jar.get(ADMIN_COOKIE)?.value),
    prisma: getPrisma() as AdminDataClient | null,
  });
  return NextResponse.json(result.body, { status: result.status, headers: result.headers });
}
