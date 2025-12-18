import type { AccountId, UserId } from "@host/shared";
import type { Repository, RepositoryError } from ".";
import type { Account } from "../entities/account";
import type { Effect } from "effect";

/**
 * Repository interface for managing Account entities
 */
export interface AccountRepository
  extends Repository<Account, AccountId, RepositoryError> {
  /**
   * Find an Account by ProviderID and AccountID
   * @param providerId
   * @param accountId
   */
  findByProvider(
    providerId: string,
    accountId: string
  ): Effect.Effect<Account | null, RepositoryError>;

  /**
   * Find Accounts by User ID
   * @param userId
   */
  findByUserId(userId: UserId): Effect.Effect<Account[], RepositoryError>;
}
