import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.log("Skipping prisma migrate deploy (DATABASE_URL er ikke sat — e-mail-only).");
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma"
);

execSync(`"${bin}" migrate deploy`, {
  stdio: "inherit",
  env: process.env,
  cwd: root,
  shell: true,
});
