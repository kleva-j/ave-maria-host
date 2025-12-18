import type { Account, AccountId } from "../entities/account";
import type { UserIdType } from "@host/shared";
import type { Effect } from "effect";

import type { Repository, RepositoryError } from ".";

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
  findByUserId(userId: UserIdType): Effect.Effect<Account[], RepositoryError>;
}
