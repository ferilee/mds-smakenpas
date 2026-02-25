import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const maxConnections = Number(process.env.DB_MAX_CONNECTIONS || "5");

type DbClient = Sql<Record<string, unknown>>;

const globalForDb = globalThis as typeof globalThis & {
  __mdsDbClient?: DbClient;
};

const client =
  globalForDb.__mdsDbClient ||
  postgres(connectionString, {
    prepare: false,
    max: Number.isFinite(maxConnections) ? Math.max(1, maxConnections) : 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__mdsDbClient = client;
}

export const db = drizzle(client, { schema });
