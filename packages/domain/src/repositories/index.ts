// Domain Repository Interfaces
// Abstract interfaces for data persistence - no implementation details

import { type Effect, Data } from "effect";

export type { PhoneVerificationRepository } from "./phone-verification-repository";
export type { KycVerificationRepository } from "./kyc-verification-repository";
export type { BiometricAuthRepository } from "./biometric-auth-repository";
export type { VerificationRepository } from "./verification-repository";
export type { TransactionRepository } from "./transaction-repository";
export type { PermissionRepository } from "./permission-repository";
export type { SessionRepository } from "./session-repository";
export type { SavingsRepository } from "./savings-repository";
export type { AccountRepository } from "./account-repository";
export type { UserRepository } from "./user-repository";
export type { RoleRepository } from "./role-repository";
export type {
  WithdrawalHistoryEntry,
  WithdrawalRepository,
} from "./withdrawal-repository";
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

/**
 * Base generic repository interface defining common CRUD operations.
 * @template T The entity type.
 * @template Id The entity ID type.
 * @template E The error type, defaults to Error.
 */
export interface Repository<T, Id, E = Error> {
  /**
   * Create a new entity.
   * @param entity The entity to create.
   */
  create?: (
    entity: Omit<T, "id" | "createdAt" | "updatedAt">
  ) => Effect.Effect<T | null, E>;

  /**
   * Find an entity by its ID.
   * @param id The ID of the entity to find.
   */
  findById?: (id: Id) => Effect.Effect<T | null, E>;

  /**
   * Find single entity by criteria
   * @param criteria
   */
  findOne?: (criteria?: Partial<T>) => Effect.Effect<T | null, E>;

  /**
   * Find entities with pagination, optional filtering and ordering
   * @param criteria
   */
  findMany?: (
    criteria?: FindManyOptions<T>
  ) => Effect.Effect<PaginatedResult<T>, E>;

  /**
   * Find all entities with optional filtering and ordering
   * @param options
   */
  findAll?: (options?: FindAllOptions<T>) => Effect.Effect<T[], E>;

  /**
   * Update an existing entity.
   * @param entity The entity to update.
   */
  update?: (entity: T) => Effect.Effect<T | null, E>;

  /**
   * Delete an entity by its ID.
   * @param id The ID of the entity to delete.
   */
  delete?: (id: Id) => Effect.Effect<void, E>;

  /**
   * Check if an entity exists by its ID.
   * @param id The ID of the entity to check.
   */
  exists?: (id: Id) => Effect.Effect<boolean, E>;

  /**
   * Count the number of entities that match the given criteria.
   * @param criteria The criteria to match.
   */
  count?: (criteria?: Partial<T>) => Effect.Effect<number, E>;
}

/**
 * Options for findAll operation
 */
export interface FindAllOptions<T> {
  where?: Partial<T>;
  orderBy?: Array<{
    field: keyof T;
    direction: "asc" | "desc";
  }>;
  limit?: number;
}

/**
 * Options for findMany operation with pagination
 */
export interface FindManyOptions<T> extends FindAllOptions<T> {
  offset?: number;
  limit: number;
}

/**
 * Paginated result structure
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}
