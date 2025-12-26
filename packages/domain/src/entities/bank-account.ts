import type { UserId } from "../value-objects";

import { Schema } from "effect";
import {
  AccountNumberSchema,
  BankAccountIdSchema,
  AccountNameSchema,
  BankCodeSchema,
  BankNameSchema,
  BooleanSchema,
  UserIdSchema,
  DateSchema,
} from "@host/shared";

/**
 * Bank Account entity representing a user's potentially linked bank account
 */
export class BankAccount extends Schema.Class<BankAccount>("BankAccount")({
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
}) {
  /**
   * Create a new BankAccount
   */
  static create(params: {
    id: string;
    userId: UserId;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    isVerified?: boolean;
    isPrimary?: boolean;
  }): BankAccount {
    return new BankAccount({
      id: BankAccountIdSchema.make(params.id),
      userId: params.userId.value,
      bankCode: BankCodeSchema.make(params.bankCode),
      bankName: BankNameSchema.make(params.bankName),
      accountNumber: AccountNumberSchema.make(params.accountNumber),
      accountName: AccountNameSchema.make(params.accountName),
      isVerified: params.isVerified ?? false,
      isPrimary: params.isPrimary ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
