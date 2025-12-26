import type { FinancialError } from "@host/shared";
import type { BankAccount } from "@host/domain";

import { BankAccountRepository, UserId } from "@host/domain";
import { BankAccountOperationError } from "@host/shared";
import { Effect, Schema, Context, Layer } from "effect";

/**
 * Input for getting linked accounts
 */
export const GetLinkedAccounts = Schema.Struct({ userId: UserId });

export type GetLinkedAccounts = typeof GetLinkedAccounts.Type;

export interface GetLinkedAccountsOutput {
  readonly bankAccounts: BankAccount[];
}

export interface GetLinkedAccountsUseCase {
  readonly execute: (
    input: GetLinkedAccounts
  ) => Effect.Effect<GetLinkedAccountsOutput, FinancialError>;
}

export const GetLinkedAccountsUseCase =
  Context.GenericTag<GetLinkedAccountsUseCase>("@app/GetLinkedAccountsUseCase");

/**
 * Live implementation of GetLinkedAccountsUseCase
 */
export const GetLinkedAccountsUseCaseLive = Layer.effect(
  GetLinkedAccountsUseCase,
  Effect.gen(function* () {
    const bankAccountRepo = yield* BankAccountRepository;

    return {
      execute: ({ userId }: GetLinkedAccounts) =>
        Effect.gen(function* () {
          const bankAccounts = yield* bankAccountRepo
            .findByUserId(UserId.fromString(userId))
            .pipe(
              Effect.mapError(
                (error) =>
                  new BankAccountOperationError({
                    operation: "get-linked-accounts",
                    reason: error.message,
                  })
              )
            );
          return { bankAccounts };
        }),
    };
  })
);
