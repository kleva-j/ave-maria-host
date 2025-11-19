import { drizzle } from "drizzle-orm/node-postgres";

// @ts-ignore
export const db = drizzle(process.env.DATABASE_URL || "");

// Export Effect.ts database integration
export * from "./effects";
export * from "./schema";
