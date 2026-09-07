import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Drizzle client backed by postgres.js, using the Supabase Transaction pooler
 * (DATABASE_URL, port 6543). On Vercel serverless we want a small connection
 * footprint and no prepared statements (pgBouncer transaction mode doesn't
 * support them), hence `prepare: false` and `max: 1`.
 *
 * The client is cached on globalThis so hot-reloaded dev and reused serverless
 * containers don't open a new pool on every import.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Fail loudly at import time rather than silently returning bad data.
  throw new Error(
    "DATABASE_URL is not set. Add it in Vercel env settings (and locally in .env)."
  );
}

const globalForDb = globalThis as unknown as {
  _pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb._pgClient ??
  postgres(connectionString, {
    prepare: false, // required for pgBouncer transaction pooling
    max: 1,
    // Supabase's pooler requires TLS. postgres.js won't negotiate it
    // automatically from a plain "postgresql://" URL, so request it
    // explicitly; `require` still validates the cert chain.
    ssl: "require",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb._pgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
