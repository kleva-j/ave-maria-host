import type { Repository, RepositoryError } from ".";
import type { Session } from "../entities/session";
import type { SessionId } from "@host/shared";
import type { Effect } from "effect";

import { Context } from "effect";

/**
 * Repository interface for managing Session entities
 */
export interface SessionRepository
  extends Repository<Session, SessionId, RepositoryError> {
  /**
   * Find a Session Entity by Token
   * @param token
   */
  findByToken(token: string): Effect.Effect<Session | null, RepositoryError>;
}

/**
 * @description
 * Context type for SessionRepository.
 *
 * This type represents an implementation of the SessionRepository interface,
 *
 * @see SessionRepository
 */
export const SessionRepository = Context.GenericTag<SessionRepository>(
  "@domain/SessionRepository"
);
