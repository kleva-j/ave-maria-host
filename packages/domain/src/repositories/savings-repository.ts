import type { SavingsPlan } from "../entities/savings-plan";
import type { PlanId, UserId } from "../value-objects";
import type { RepositoryError, Repository } from ".";
import type { PlanStatus } from "@host/shared";
import type { Effect } from "effect";

import { Context } from "effect";

/**
 * Repository interface for SavingsPlan entity
 */
export interface SavingsRepository
  extends Repository<SavingsPlan, PlanId, RepositoryError> {
  /**
   * Find a savings plan by its ID
   */
  readonly findById: (
    id: PlanId
  ) => Effect.Effect<SavingsPlan | null, RepositoryError>;

  /**
   * Save a new savings plan
   */
  readonly save: (
    plan: SavingsPlan
  ) => Effect.Effect<SavingsPlan | null, RepositoryError>;

  /**
   * Update an existing savings plan
   */
  readonly update: (
    plan: SavingsPlan
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

/**
 * @description
 * Context type for SavingsRepository.
 *
 * This type represents an implementation of the SavingsRepository interface,
 *
 * @see SavingsRepository
 */
export const SavingsRepository = Context.GenericTag<SavingsRepository>(
  "@domain/SavingsRepository"
);
