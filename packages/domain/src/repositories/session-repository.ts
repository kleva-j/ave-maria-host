import type { Repository, RepositoryError } from ".";
import type { BrandedSessionId } from "@host/shared";
import type { Session } from "../entities/session";
import type { Effect } from "effect";

/**
 * Repository interface for managing Session entities
 */
export interface SessionRepository
  extends Repository<Session, BrandedSessionId, RepositoryError> {
  /**
   * Find a Session Entity by Token
   * @param token
   */
  findByToken(token: string): Effect.Effect<Session | null, RepositoryError>;
}
