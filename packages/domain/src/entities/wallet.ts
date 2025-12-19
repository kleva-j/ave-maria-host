import { Schema } from "effect";
import {
  WalletIdSchema,
  UserIdSchema,
  MoneySchema,
  DateSchema,
} from "@host/shared";

/**
 * Wallet entity schema for repository operations
 */
export class Wallet extends Schema.Class<Wallet>("Wallet")({
  id: WalletIdSchema.annotations({
    description: "Unique identifier for the wallet",
  }),
  userId: UserIdSchema.annotations({
    description: "User ID associated with the wallet",
  }),
  balance: MoneySchema.annotations({
    description: "Current balance of the wallet",
  }),
  isActive: Schema.Boolean.annotations({
    description: "Whether the wallet is active",
  }),
  createdAt: Schema.NullOr(DateSchema).annotations({
    description: "When the wallet was created",
  }),
  updatedAt: Schema.NullOr(DateSchema).annotations({
    description: "When the wallet was last updated",
  }),
}) {}

/**
 * Wallet transaction summary schema
 */
export class WalletTransactionSummary extends Schema.Class<WalletTransactionSummary>(
  "WalletTransactionSummary"
)({
  totalCredits: MoneySchema.annotations({
    description: "This is the total amount of credits in the wallet",
  }),
  totalDebits: MoneySchema.annotations({
    description: "This is the total amount of debits in the wallet",
  }),
  transactionCount: Schema.Number.annotations({
    description: "This is the total number of transactions done on this wallet",
  }),
  netChange: MoneySchema.annotations({
    description: "This is the net change in the wallet",
  }),
}) {}
