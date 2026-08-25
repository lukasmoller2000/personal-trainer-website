import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma"
);

execSync(`"${bin}" generate`, {
  stdio: "inherit",
  env: process.env,
  cwd: root,
  shell: true,
});
