/**
 * @fileoverview Audit Logging Middleware
 *
 * This module provides comprehensive audit logging for security compliance.
 * It tracks all sensitive operations, authorization decisions, and financial
 * transactions for regulatory compliance and security monitoring.
 */

import type { AuthContext } from "@host/auth";
import type { DeviceId } from "@host/shared";
import type {
  BiometricEventType,
  SecurityEventType,
  DataAccessAction,
  AuditLogStatus,
  AuditCategory,
  AuditSeverity,
} from "../types";

import { Effect, Context, Layer } from "effect";
import { LoggerService } from "./logging";
import {
  DataAccessActionEnum,
  AuditLogStatusEnum,
  AuditCategoryEnum,
  AuditSeverityEnum,
} from "../constants/enums";

// ============================================================================
// Audit Event Types
// ============================================================================

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
  readonly status: AuditLogStatus;
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
    status: AuditLogStatus,
    details: Record<string, unknown>
  ) => Effect.Effect<void>;

  /**
   * Log authorization event
   */
  readonly logAuthorization: (
    authContext: AuthContext,
    action: string,
    resource: string,
    status: AuditLogStatus,
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
    status: AuditLogStatus,
    details: Record<string, unknown>
  ) => Effect.Effect<void>;

  /**
   * Log KYC event
   */
  readonly logKycEvent: (
    userId: string,
    action: string,
    tier: number,
    status: AuditLogStatus,
    details: Record<string, unknown>
  ) => Effect.Effect<void>;

  /**
   * Log data access event
   */
  readonly logDataAccess: (
    authContext: AuthContext,
    resource: string,
    resourceId: string,
    action: DataAccessAction
  ) => Effect.Effect<void>;

  /**
   * Log biometric authentication event
   */
  readonly logBiometricEvent: (
    userId: string,
    action: BiometricEventType,
    deviceId: DeviceId,
    status: AuditLogStatus,
    details: Record<string, unknown>
  ) => Effect.Effect<void>;

  /**
   * Log security event
   */
  readonly logSecurityEvent: (
    eventType: SecurityEventType,
    severity: AuditSeverity,
    userId?: string,
    details?: Record<string, unknown>
  ) => Effect.Effect<void>;

  /**
   * Query audit events with filters
   */
  readonly queryEvents: (filters: {
    userId?: string;
    category?: AuditCategory;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) => Effect.Effect<AuditEvent[], never>;

  /**
   * Get audit statistics
   */
  readonly getAuditStatistics: (
    startDate: Date,
    endDate: Date
  ) => Effect.Effect<
    {
      totalEvents: number;
      eventsByCategory: Record<AuditCategory, number>;
      eventsBySeverity: Record<AuditSeverity, number>;
      highRiskEvents: number;
    },
    never
  >;
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
            category: AuditCategoryEnum.AUTHENTICATION,
            severity:
              status === AuditLogStatusEnum.FAILURE
                ? AuditSeverityEnum.HIGH
                : AuditSeverityEnum.LOW,
            action,
            userId,
            status,
            details,
          }),

        logAuthorization: (authContext, action, resource, status, reason) =>
          logEvent({
            category: AuditCategoryEnum.AUTHORIZATION,
            severity:
              status === AuditLogStatusEnum.FAILURE
                ? AuditSeverityEnum.HIGH
                : AuditSeverityEnum.LOW,
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
            category: AuditCategoryEnum.FINANCIAL,
            severity: AuditSeverityEnum.HIGH,
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
            category: AuditCategoryEnum.KYC,
            severity: AuditSeverityEnum.HIGH,
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
            category: AuditCategoryEnum.DATA_ACCESS,
            severity:
              action === DataAccessActionEnum.DELETE
                ? AuditSeverityEnum.MEDIUM
                : AuditSeverityEnum.LOW,
            action: `${action}_${resource}`,
            userId: authContext.user.id,
            userEmail: authContext.user.email,
            resource,
            resourceId,
            status: AuditLogStatusEnum.SUCCESS,
            details: {},
          }),

        logBiometricEvent: (userId, action, deviceId, status, details) =>
          logEvent({
            category: AuditCategoryEnum.AUTHENTICATION,
            severity:
              status === AuditLogStatusEnum.FAILURE
                ? AuditSeverityEnum.HIGH
                : AuditSeverityEnum.MEDIUM,
            action: `biometric_${action}`,
            userId,
            status,
            details: {
              deviceId,
              ...details,
            },
          }),

        logSecurityEvent: (eventType, severity, userId, details) =>
          logEvent({
            category: AuditCategoryEnum.SYSTEM,
            severity,
            action: eventType,
            userId: userId || "system",
            status: AuditLogStatusEnum.WARNING,
            details: details || {},
          }),

        queryEvents: (filters) =>
          Effect.sync(() => {
            // In production, this would query a database
            // For now, return empty array as placeholder
            return [];
          }),

        getAuditStatistics: (startDate, endDate) =>
          Effect.sync(() => {
            // In production, this would calculate real statistics
            return {
              totalEvents: 0,
              eventsByCategory: {} as Record<AuditCategory, number>,
              eventsBySeverity: {} as Record<AuditSeverity, number>,
              highRiskEvents: 0,
            };
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
              severity: AuditSeverityEnum.MEDIUM,
              action,
              userId: authContext.user.id,
              userEmail: authContext.user.email,
              status: AuditLogStatusEnum.SUCCESS,
              details: getDetails(result),
            })
          ),
          Effect.tapError((error) =>
            audit.logEvent({
              category,
              severity: AuditSeverityEnum.HIGH,
              action,
              userId: authContext.user.id,
              userEmail: authContext.user.email,
              status: AuditLogStatusEnum.FAILURE,
              details: {
                error: String(error),
              },
            })
          )
        )
      );

      return result;
    });
