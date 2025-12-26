import { BankAccountIdSchema, UserIdSchema } from "./id-schemas";
import { BooleanSchema, DateSchema } from "./common-schemas";
import { Schema } from "effect";

/**
 * Schema for Nigerian bank account name
 */
export const AccountNameSchema = Schema.String.pipe(
  Schema.minLength(1, { message: () => "Account name is required" }),
  Schema.maxLength(100, {
    message: () => "Account name must not exceed 100 characters",
  }),
  Schema.trimmed()
).annotations({ description: "Bank account name" });

/**
 * Schema for Nigerian bank account number
 */
export const AccountNumberSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\d{10}$/, {
    message: () => "Account number must be exactly 10 digits",
  })
).annotations({ description: "Bank account number" });

/**
 * Schema for Nigerian bank code
 */
export const BankCodeSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\d{3}$/, {
    message: () => "Bank code must be exactly 3 digits",
  })
).annotations({ description: "Bank code" });

/**
 * Schema for Nigerian bank name
 */
export const BankNameSchema = Schema.String.pipe(
  Schema.pattern(/^\w+$/, {
    message: () => "Bank name must be a valid name",
  })
).annotations({ description: "Bank name" });

/**
 * Schema for bank account details
 */
export class BankAccountSchema extends Schema.Class<BankAccountSchema>(
  "BankAccountSchema"
)({
  id: BankAccountIdSchema,
  userId: UserIdSchema,
  bankCode: BankCodeSchema,
  bankName: BankNameSchema,
  accountNumber: AccountNumberSchema,
  accountName: AccountNameSchema,
  isVerified: BooleanSchema,
  isPrimary: BooleanSchema,
  createdAt: DateSchema,
  updatedAt: DateSchema,
}).annotations({ description: "Bank account entity" }) {}

export type BankAccount = typeof BankAccountSchema.Type;
