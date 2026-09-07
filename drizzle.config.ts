import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load .env so drizzle-kit (run locally) can read the connection string.
// On Vercel these come from the platform env, not this file.
config({ path: ".env" });

// Prefer the direct connection for migrations when available; fall back to
// the pooled URL. Note: generating SQL (`db:generate`) needs no DB access at
// all — only `db:push` connects.
const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
  verbose: true,
  strict: true,
});
