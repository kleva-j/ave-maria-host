import { user } from "./auth";
import {
  timestamp,
  pgTable,
  varchar,
  boolean,
  index,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Bank Accounts table
 */
export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    bankCode: varchar("bank_code", { length: 10 }).notNull(),
    bankName: varchar("bank_name", { length: 100 }).notNull(),
    accountNumber: varchar("account_number", { length: 20 }).notNull(),
    accountName: varchar("account_name", { length: 100 }).notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("bank_name_idx").on(table.bankName),
    index("bank_code_idx").on(table.bankCode),
    index("bank_accounts_user_idx").on(table.userId),
    index("bank_accounts_primary_idx").on(table.userId, table.isPrimary),
    index("bank_accounts_verified_idx").on(table.userId, table.isVerified),
  ]
);
