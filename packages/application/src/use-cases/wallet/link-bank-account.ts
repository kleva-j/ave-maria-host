import type {
  LinkBankAccountOutput,
  LinkBankAccountInput,
  FinancialError,
} from "@host/shared";
import type {
  BankAccountRepository,
  RepositoryError,
  PaymentError,
} from "@host/domain";

import { PaymentService, BankAccount, UserId } from "@host/domain";
import { Effect, Context, Layer, Schema } from "effect";
import {
  LinkBankAccountOutputSchema,
  BankAccountSchema,
  ValidationError,
} from "@host/shared";

export interface LinkBankAccountUseCase {
  readonly execute: (
    input: LinkBankAccountInput
  ) => Effect.Effect<
    LinkBankAccountOutput,
    PaymentError | FinancialError | RepositoryError
  >;
}

/**
 * Link bank account use case
 */
export const LinkBankAccountUseCase =
  Context.GenericTag<LinkBankAccountUseCase>("@app/LinkBankAccountUseCase");

/**
 * Link bank account use case implementation
 */
export const LinkBankAccountUseCaseLive = Layer.effect(
  LinkBankAccountUseCase,
  Effect.gen(function* () {
    const bankAccountRepo = yield* Effect.serviceOption(
      Context.GenericTag<BankAccountRepository>("@domain/BankAccountRepository")
    );
    const paymentServiceOption = yield* Effect.serviceOption(PaymentService);

    if (
      bankAccountRepo._tag === "None" ||
      paymentServiceOption._tag === "None"
    ) {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message:
            "Required dependencies (BankAccountRepository, PaymentService) not available",
        })
      );
    }

    const bankAccountRepository = bankAccountRepo.value;
    const paymentService = paymentServiceOption.value;

    return {
      execute: (input: LinkBankAccountInput) =>
        Effect.gen(function* () {
          // Resolve bank account details from payment provider
          const resolvedAccount = yield* paymentService.resolveBankAccount(
            input.accountNumber,
            input.bankCode
          );

          // Create domain entity
          const bankAccount = BankAccount.create({
            id: crypto.randomUUID(),
            userId: UserId.fromString(input.userId),
            bankCode: resolvedAccount.bankCode,
            bankName: resolvedAccount.bankName,
            accountNumber: resolvedAccount.accountNumber,
            accountName: resolvedAccount.accountName,
            isPrimary: input.isPrimary ?? false,
            isVerified: true,
          });

          // Save to repository
          const savedAccount = yield* bankAccountRepository.save(bankAccount);

          // Decode to BankAccountSchema
          const decodeSchema = Schema.decodeUnknownSync(BankAccountSchema);

          // Validate and return decoded account
          const account = decodeSchema(savedAccount);

          // Build output
          return LinkBankAccountOutputSchema.make({
            status: "success",
            message: "Bank account linked successfully",
            account,
          });
        }),
    };
  })
);
