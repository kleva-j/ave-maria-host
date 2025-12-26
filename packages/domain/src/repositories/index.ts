// Domain Repository Interfaces
// Abstract interfaces for data persistence - no implementation details

import { type Effect, Data } from "effect";

export * from "./phone-verification-repository";
export * from "./kyc-verification-repository";
export * from "./biometric-auth-repository";
export * from "./bank-account-repository";
export * from "./verification-repository";
export * from "./transaction-repository";
export * from "./permission-repository";
export * from "./withdrawal-repository";
export * from "./session-repository";
export * from "./savings-repository";
export * from "./account-repository";
export * from "./wallet-repository";
export * from "./user-repository";
export * from "./role-repository";

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
  readonly create?: (
    entity: Omit<T, "id" | "createdAt" | "updatedAt">
  ) => Effect.Effect<T | null, E>;

  /**
   * Find an entity by its ID.
   * @param id The ID of the entity to find.
   */
  readonly findById?: (id: Id) => Effect.Effect<T | null, E>;

  /**
   * Find single entity by criteria
   * @param criteria
   */
  readonly findOne?: (criteria?: Partial<T>) => Effect.Effect<T | null, E>;

  /**
   * Find entities with pagination, optional filtering and ordering
   * @param criteria
   */
  readonly findMany?: (
    criteria?: FindManyOptions<T>
  ) => Effect.Effect<PaginatedResult<T>, E>;

  /**
   * Find all entities with optional filtering and ordering
   * @param options
   */
  readonly findAll?: (options?: FindAllOptions<T>) => Effect.Effect<T[], E>;

  /**
   * Update an existing entity.
   * @param entity The entity to update.
   */
  readonly update?: (entity: T) => Effect.Effect<T | null, E>;

  /**
   * Delete an entity by its ID.
   * @param id The ID of the entity to delete.
   */
  readonly delete?: (id: Id) => Effect.Effect<void, E>;

  /**
   * Check if an entity exists by its ID.
   * @param id The ID of the entity to check.
   */
  readonly exists?: (id: Id) => Effect.Effect<boolean, E>;

  /**
   * Count the number of entities that match the given criteria.
   * @param criteria The criteria to match.
   */
  readonly count?: (criteria?: Partial<T>) => Effect.Effect<number, E>;
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
