import type { SavingsPlan } from "../entities/savings-plan";
import type { PlanId, UserId } from "../value-objects";
import type { PlanStatus } from "@host/shared";
import type { RepositoryError } from ".";
import type { Effect } from "effect";

/**
 * Repository interface for SavingsPlan entity
 */
export interface SavingsRepository {
  /**
   * Save a new savings plan
   */
  readonly save: (plan: SavingsPlan) => Effect.Effect<void, RepositoryError>;

  /**
   * Find a savings plan by its ID
   */
  readonly findById: (
    id: PlanId
  ) => Effect.Effect<SavingsPlan | null, RepositoryError>;

  /**
   * Find all savings plans for a user
   */
  readonly findByUserId: (
    userId: UserId
  ) => Effect.Effect<SavingsPlan[], RepositoryError>;

  /**
   * Find active savings plans for a user
   */
  readonly findActiveByUserId: (
    userId: UserId
  ) => Effect.Effect<SavingsPlan[], RepositoryError>;

  /**
   * Update an existing savings plan
   */
  readonly update: (plan: SavingsPlan) => Effect.Effect<void, RepositoryError>;

  /**
   * Delete a savings plan (soft delete)
   */
  readonly delete: (id: PlanId) => Effect.Effect<void, RepositoryError>;

  /**
   * Find plans that are due for auto-save
   */
  readonly findPlansForAutoSave: () => Effect.Effect<
    SavingsPlan[],
    RepositoryError
  >;

  /**
   * Find completed plans that haven't been processed for interest
   */
  readonly findCompletedPlansForInterest: () => Effect.Effect<
    SavingsPlan[],
    RepositoryError
  >;

  /**
   * Get total savings amount for a user
   */
  readonly getTotalSavingsForUser: (
    userId: UserId
  ) => Effect.Effect<number, RepositoryError>;

  /**
   * Find plans by status
   */
  readonly findByStatus: (
    status: PlanStatus
  ) => Effect.Effect<SavingsPlan[], RepositoryError>;
}
