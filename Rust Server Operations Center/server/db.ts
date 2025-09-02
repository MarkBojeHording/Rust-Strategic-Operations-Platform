import { Pool, neonConfig, neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set. Using default development database URL.");
  // For development, use a mock database URL if not provided
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/rustops?sslmode=disable';
  const sql = neon(databaseUrl);
  export const db = drizzle(sql, { schema });
} else {
  const sql = neon(process.env.DATABASE_URL);
  export const db = drizzle(sql, { schema });
}