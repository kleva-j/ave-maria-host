// Domain Repository Interfaces
// Abstract interfaces for data persistence - no implementation details

import { Data } from "effect";

export type { TransactionRepository } from "./transaction-repository";
export type { WithdrawalRepository } from "./withdrawal-repository";
export type { SavingsRepository } from "./savings-repository";
export type { UserRepository } from "./user-repository";
export type {
  WalletTransactionSummary,
  WalletRepository,
  Wallet,
} from "./wallet-repository";

/**
 * Repository error class
 */
export interface RepositoryErrorProps {
  readonly operation: string;
  readonly entity: string;
  readonly cause?: unknown;
}

export class RepositoryError extends Data.TaggedError(
  "RepositoryError"
)<RepositoryErrorProps> {
  constructor(params: RepositoryErrorProps) {
    super(params);
    this.message = `Repository error in ${params.operation} for ${params.entity}${
      params.cause ? `: ${params.cause}` : ""
    }`;
  }

  /**
   * Create a new RepositoryError
   */
  static create(
    operation: string,
    entity: string,
    cause?: unknown
  ): RepositoryError {
    return new RepositoryError({ operation, entity, cause });
  }
}
