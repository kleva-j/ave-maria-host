/**
 * @fileoverview Audit Logging Middleware
 *
 * This module provides comprehensive audit logging for security compliance.
 * It tracks all sensitive operations, authorization decisions, and financial
 * transactions for regulatory compliance and security monitoring.
 */

import type { AuthContext } from "@host/auth";

import { Effect, Context, Layer } from "effect";
import { LoggerService } from "./logging";

// ============================================================================
// Audit Event Types
// ============================================================================

/**
 * Audit event categories
 */
export type AuditCategory =
  | "authentication"
  | "authorization"
  | "financial"
  | "kyc"
  | "user_management"
  | "data_access"
  | "system";

/**
 * Audit event severity
 */
export type AuditSeverity = "low" | "medium" | "high" | "critical";

/**
 * Audit event structure
 */
export interface AuditEvent {
  readonly id: string;
  readonly timestamp: Date;
  readonly category: AuditCategory;
  readonly severity: AuditSeverity;
  readonly action: string;
  readonly userId: string;
  readonly userEmail?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly resource?: string;
  readonly resourceId?: string;
  readonly status: "success" | "failure" | "pending";
  readonly details: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

// ============================================================================
// Audit Service
// ============================================================================

/**
 * Audit logging service interface
 */
export interface AuditService {
  /**
   * Log an audit event
   */
  readonly logEvent: (
    event: Omit<AuditEvent, "id" | "timestamp">
  ) => Effect.Effect<void>;

  /**
   * Log authentication event
   */
  readonly logAuthentication: (
    userId: string,
    action: string,
    status: "success" | "failure",
    details: Record<string, unknown>
  ) => Effect.Effect<void>;

  /**
   * Log authorization event
   */
  readonly logAuthorization: (
    authContext: AuthContext,
    action: string,
    resource: string,
    status: "success" | "failure",
    reason?: string
  ) => Effect.Effect<void>;

  /**
   * Log financial transaction
   */
  readonly logFinancialTransaction: (
    authContext: AuthContext,
    transactionType: string,
    amount: number,
    currency: string,
    status: "success" | "failure" | "pending",
    details: Record<string, unknown>
  ) => Effect.Effect<void>;

  /**
   * Log KYC event
   */
  readonly logKycEvent: (
    userId: string,
    action: string,
    tier: number,
    status: "success" | "failure",
    details: Record<string, unknown>
  ) => Effect.Effect<void>;

  /**
   * Log data access event
   */
  readonly logDataAccess: (
    authContext: AuthContext,
    resource: string,
    resourceId: string,
    action: "read" | "write" | "delete"
  ) => Effect.Effect<void>;
}

export const AuditService = Context.GenericTag<AuditService>("AuditService");

// ============================================================================
// Audit Service Implementation
// ============================================================================

export const AuditServiceLive: Layer.Layer<AuditService, never, LoggerService> =
  Layer.effect(
    AuditService,
    Effect.gen(function* (_) {
      const logger = yield* _(LoggerService);

      const logEvent = (event: Omit<AuditEvent, "id" | "timestamp">) =>
        Effect.gen(function* (_) {
          const auditEvent: AuditEvent = {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            ...event,
          };

          // Log to console (in production, this would go to a dedicated audit log store)
          yield* _(
            logger.logAudit(
              `[${auditEvent.category.toUpperCase()}] ${auditEvent.action}`,
              auditEvent.userId,
              {
                eventId: auditEvent.id,
                severity: auditEvent.severity,
                status: auditEvent.status,
                resource: auditEvent.resource,
                resourceId: auditEvent.resourceId,
                ...auditEvent.details,
                ...auditEvent.metadata,
              }
            )
          );

          // In production, also store in database for compliance
          // yield* _(storeAuditEvent(auditEvent));
        });

      return AuditService.of({
        logEvent,

        logAuthentication: (userId, action, status, details) =>
          logEvent({
            category: "authentication",
            severity: status === "failure" ? "high" : "low",
            action,
            userId,
            status,
            details,
          }),

        logAuthorization: (authContext, action, resource, status, reason) =>
          logEvent({
            category: "authorization",
            severity: status === "failure" ? "medium" : "low",
            action,
            userId: authContext.user.id,
            userEmail: authContext.user.email,
            resource,
            status,
            details: {
              kycTier: authContext.user.kycTier,
              reason,
            },
          }),

        logFinancialTransaction: (
          authContext,
          transactionType,
          amount,
          currency,
          status,
          details
        ) =>
          logEvent({
            category: "financial",
            severity: "high",
            action: transactionType,
            userId: authContext.user.id,
            userEmail: authContext.user.email,
            status,
            details: {
              amount,
              currency,
              kycTier: authContext.user.kycTier,
              ...details,
            },
          }),

        logKycEvent: (userId, action, tier, status, details) =>
          logEvent({
            category: "kyc",
            severity: "high",
            action,
            userId,
            status,
            details: {
              tier,
              ...details,
            },
          }),

        logDataAccess: (authContext, resource, resourceId, action) =>
          logEvent({
            category: "data_access",
            severity: action === "delete" ? "medium" : "low",
            action: `${action}_${resource}`,
            userId: authContext.user.id,
            userEmail: authContext.user.email,
            resource,
            resourceId,
            status: "success",
            details: {},
          }),
      });
    })
  );

// ============================================================================
// Audit Logging Helpers
// ============================================================================

/**
 * Wrap an effect with audit logging
 */
export const withAuditLog =
  <A, E, R>(
    category: AuditCategory,
    action: string,
    getDetails: (result: A) => Record<string, unknown>
  ) =>
  (authContext: AuthContext) =>
  (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | AuditService> =>
    Effect.gen(function* (_) {
      const audit = yield* _(AuditService);

      // Execute the effect
      const result = yield* _(
        effect.pipe(
          Effect.tap((result) =>
            audit.logEvent({
              category,
              severity: "medium",
              action,
              userId: authContext.user.id,
              userEmail: authContext.user.email,
              status: "success",
              details: getDetails(result),
            })
          ),
          Effect.tapError((error) =>
            audit.logEvent({
              category,
              severity: "high",
              action,
              userId: authContext.user.id,
              userEmail: authContext.user.email,
              status: "failure",
              details: {
                error: String(error),
              },
            })
          )
        )
      );

      return result;
    });
