/**
 * @fileoverview Audit Logging Middleware
 *
 * This module provides comprehensive audit logging for security compliance.
 * It tracks all sensitive operations, authorization decisions, and financial
 * transactions for regulatory compliance and security monitoring.
 */

import type {
  UserManagementEvent,
  AuthenticationEvent,
  AuthorizationEvent,
  DataAccessAction,
  AuditLogStatus,
  FinancialEvent,
  BiometricEvent,
  SecurityEvent,
  AuditCategory,
  AuditSeverity,
  AuditEventId,
  SystemEvent,
  AuthContext,
  AuditEvent,
  KycEvent,
  UserId,
} from "@host/shared";

import { eq, and, desc, count, gte, lte, sql, isNotNull } from "drizzle-orm";
import { DatabaseService, auditLog } from "@host/db";
import { Effect, Context, Layer } from "effect";
import {
  AuditLogStatusSchema,
  AuditCategorySchema,
  AuditSeveritySchema,
  AuditEventIdSchema,
  DATA_ACCESS_ACTION,
  AUDIT_LOG_STATUS,
  AUDIT_SEVERITY,
  AUDIT_CATEGORY,
  LoggerService,
} from "@host/shared";

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

  readonly logUserManagementEvent: (
    event: UserManagementEvent
  ) => Effect.Effect<void>;

  readonly logSystemEvent: (event: SystemEvent) => Effect.Effect<void>;

  /**
   * Log authentication event
   */
  readonly logAuthentication: (
    event: AuthenticationEvent
  ) => Effect.Effect<void>;

  /**
   * Log authorization event
   */
  readonly logAuthorization: (event: AuthorizationEvent) => Effect.Effect<void>;

  /**
   * Log financial transaction
   */
  readonly logFinancialTransaction: (
    event: FinancialEvent
  ) => Effect.Effect<void>;

  /**
   * Log KYC event
   */
  readonly logKycEvent: (event: KycEvent) => Effect.Effect<void>;

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
  readonly logBiometricEvent: (event: BiometricEvent) => Effect.Effect<void>;

  /**
   * Log security event
   */
  readonly logSecurityEvent: (event: SecurityEvent) => Effect.Effect<void>;

  /**
   * Query audit events with filters
   */
  readonly queryEvents: (filters: {
    userId?: UserId;
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
      readonly totalEvents: number;
      readonly successfulEvents: number;
      readonly failedEvents: number;
      readonly deniedEvents: number;
      readonly eventsByCategory: Record<AuditCategory, number>;
      readonly eventsBySeverity: Record<AuditSeverity, number>;
      readonly highRiskEvents: number;
      readonly topUsers: Array<{ userId: string; eventCount: number }>;
      readonly topActions: Array<{ action: string; eventCount: number }>;
    },
    never
  >;
}

export const AuditService = Context.GenericTag<AuditService>(
  "@infrastructure/AuditService"
);

// ============================================================================
// Audit Service Implementation
// ============================================================================

export const AuditServiceLive: Layer.Layer<
  AuditService,
  never,
  LoggerService | DatabaseService
> = Layer.effect(
  AuditService,
  Effect.gen(function* (_) {
    const logger: LoggerService = yield* _(LoggerService);
    const db: DatabaseService = yield* _(DatabaseService);

    const logEvent = (event: Omit<AuditEvent, "id" | "timestamp">) =>
      Effect.gen(function* (_) {
        const auditEvent: AuditEvent = {
          id: AuditEventIdSchema.make(`audit-${crypto.randomUUID()}`),
          timestamp: new Date(),
          ...event,
        };

        // Log to console/logger
        yield* _(
          logger.logAudit(
            `[${auditEvent.category.toUpperCase()}] ${auditEvent.action}`,
            auditEvent.userId || "system",
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

        // Persist to database
        yield* _(
          db
            .withDrizzle(async (drizzle) => {
              await drizzle.insert(auditLog).values({
                id: auditEvent.id,
                timestamp: auditEvent.timestamp,
                category: auditEvent.category,
                severity: auditEvent.severity,
                action: auditEvent.action,
                userId: auditEvent.userId,
                userEmail: auditEvent.userEmail,
                ipAddress: auditEvent.ipAddress,
                userAgent: auditEvent.userAgent,
                resource: auditEvent.resource,
                resourceId: auditEvent.resourceId,
                status: auditEvent.status,
                details: auditEvent.details,
                metadata: auditEvent.metadata,
              });
            })
            .pipe(
              Effect.catchAll((error) =>
                // Log error but don't fail the effect to avoid breaking main flow
                logger.logError("Failed to persist audit log", error)
              )
            )
        );
      });

    return AuditService.of({
      logEvent,

      logUserManagementEvent: (event) =>
        logEvent({
          category: AuditCategorySchema.make(AUDIT_CATEGORY.USER_MANAGEMENT),
          severity: AuditSeveritySchema.make(
            event.status === AUDIT_LOG_STATUS.FAILURE
              ? AUDIT_SEVERITY.HIGH
              : AUDIT_SEVERITY.MEDIUM
          ),
          action: event.action,
          userId: event.userId,
          status: event.status,
          details: event.details,
          userEmail: null,
          ipAddress: null,
          userAgent: null,
          resource: null,
          resourceId: null,
          metadata: null,
        }),

      logSystemEvent: (event) =>
        logEvent({
          category: AuditCategorySchema.make(AUDIT_CATEGORY.SYSTEM),
          severity: AuditSeveritySchema.make(
            event.status === AUDIT_LOG_STATUS.FAILURE
              ? AUDIT_SEVERITY.HIGH
              : AUDIT_SEVERITY.LOW
          ),
          action: event.action,
          userId: null,
          status: event.status,
          details: event.details,
          userEmail: null,
          ipAddress: null,
          userAgent: null,
          resource: "system",
          resourceId: null,
          metadata: null,
        }),

      logAuthentication: (event) =>
        logEvent({
          category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHENTICATION),
          severity: AuditSeveritySchema.make(
            event.status === AUDIT_LOG_STATUS.FAILURE
              ? AUDIT_SEVERITY.HIGH
              : AUDIT_SEVERITY.LOW
          ),
          action: event.action,
          userId: event.userId,
          status: event.status,
          details: event.details,
          userEmail: null,
          ipAddress: null,
          userAgent: null,
          resource: null,
          resourceId: null,
          metadata: null,
        }),

      logAuthorization: (event) =>
        logEvent({
          category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHORIZATION),
          severity: AuditSeveritySchema.make(
            event.status === AUDIT_LOG_STATUS.FAILURE
              ? AUDIT_SEVERITY.HIGH
              : AUDIT_SEVERITY.LOW
          ),
          action: event.action,
          userId: event.authContext.user.id,
          userEmail: event.authContext.user.email,
          resource: event.resource,
          status: event.status,
          details: {
            kycTier: event.authContext.user.kycTier,
            reason: event.reason,
          },
          ipAddress: null,
          userAgent: null,
          resourceId: null,
          metadata: null,
        }),

      logFinancialTransaction: (event: FinancialEvent) =>
        logEvent({
          category: AuditCategorySchema.make(AUDIT_CATEGORY.FINANCIAL),
          severity: AuditSeveritySchema.make(AUDIT_SEVERITY.HIGH),
          action: event.transactionType,
          userId: event.authContext.user.id,
          userEmail: event.authContext.user.email,
          status: event.status,
          details: {
            amount: event.amount,
            currency: event.currency,
            ...event.details,
          },
          ipAddress: null,
          userAgent: null,
          resource: null,
          resourceId: null,
          metadata: null,
        }),

      logKycEvent: (event: KycEvent) =>
        logEvent({
          category: AuditCategorySchema.make(AUDIT_CATEGORY.KYC),
          severity: AuditSeveritySchema.make(AUDIT_SEVERITY.HIGH),
          action: event.action,
          userId: event.userId,
          status: event.status,
          details: { tier: event.kycTier, ...event.details },
          userEmail: null,
          ipAddress: null,
          userAgent: null,
          resource: null,
          resourceId: null,
          metadata: null,
        }),

      logDataAccess: (authContext, resource, resourceId, action) =>
        logEvent({
          category: AuditCategorySchema.make(AUDIT_CATEGORY.DATA_ACCESS),
          severity: AuditSeveritySchema.make(
            action === DATA_ACCESS_ACTION.DELETE
              ? AUDIT_SEVERITY.MEDIUM
              : AUDIT_SEVERITY.LOW
          ),
          action: `${action}_${resource}`,
          userId: authContext.user.id,
          userEmail: authContext.user.email,
          resource,
          resourceId,
          status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
          details: {},
          ipAddress: null,
          userAgent: null,
          metadata: null,
        }),

      logBiometricEvent: (event: BiometricEvent) =>
        logEvent({
          category: AuditCategorySchema.make(AUDIT_CATEGORY.AUTHENTICATION),
          severity: AuditSeveritySchema.make(
            event.status === AUDIT_LOG_STATUS.FAILURE
              ? AUDIT_SEVERITY.HIGH
              : AUDIT_SEVERITY.MEDIUM
          ),
          action: `biometric_${event.action}`,
          userId: event.userId,
          status: event.status,
          details: { deviceId: event.deviceId, ...event.details },
          userEmail: null,
          ipAddress: null,
          userAgent: null,
          resource: null,
          resourceId: null,
          metadata: null,
        }),

      logSecurityEvent: (event: SecurityEvent) =>
        logEvent({
          category: AuditCategorySchema.make(AUDIT_CATEGORY.SYSTEM),
          severity: AuditSeveritySchema.make(AUDIT_SEVERITY.HIGH),
          action: event.eventType,
          userId: event.userId || null, // Ensure string | null
          status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.WARNING),
          details: event.details || {},
          userEmail: null,
          ipAddress: null,
          userAgent: null,
          resource: null,
          resourceId: null,
          metadata: null,
        }),

      queryEvents: (filters) =>
        Effect.gen(function* (_) {
          return yield* _(
            db
              .withDrizzle(async (drizzle) => {
                const conditions = [];

                if (filters.userId) {
                  conditions.push(eq(auditLog.userId, filters.userId));
                }
                if (filters.category) {
                  conditions.push(eq(auditLog.category, filters.category));
                }
                if (filters.severity) {
                  conditions.push(eq(auditLog.severity, filters.severity));
                }
                if (filters.startDate) {
                  conditions.push(gte(auditLog.timestamp, filters.startDate));
                }
                if (filters.endDate) {
                  conditions.push(lte(auditLog.timestamp, filters.endDate));
                }

                const results = await drizzle
                  .select()
                  .from(auditLog)
                  .where(and(...conditions))
                  .orderBy(desc(auditLog.timestamp))
                  .limit(filters.limit || 100)
                  .offset(filters.offset || 0);

                // Map Drizzle results to AuditEvent
                return results.map((row) => ({
                  id: row.id as AuditEventId,
                  timestamp: row.timestamp,
                  category: row.category as AuditCategory,
                  severity: row.severity as AuditSeverity,
                  action: row.action,
                  userId: row.userId as UserId,
                  userEmail: row.userEmail,
                  ipAddress: row.ipAddress,
                  userAgent: row.userAgent,
                  resource: row.resource,
                  resourceId: row.resourceId,
                  status: row.status as AuditLogStatus,
                  details: row.details as Record<string, unknown>,
                  metadata:
                    (row.metadata as Record<string, unknown> | null) ?? null,
                }));
              })
              .pipe(
                Effect.catchAll(
                  (error) => Effect.die(error) // Fail on query error
                )
              )
          );
        }),

      getAuditStatistics: (startDate, endDate) =>
        Effect.gen(function* (_) {
          return yield* _(
            db
              .withDrizzle(async (drizzle) => {
                // Parallel queries for stats
                const [
                  total,
                  successful,
                  failed,
                  denied,
                  byCategory,
                  bySeverity,
                  highRisk,
                  topUsers,
                  topActions,
                ] = await Promise.all([
                  // Total events
                  drizzle
                    .select({ count: count() })
                    .from(auditLog)
                    .where(
                      and(
                        gte(auditLog.timestamp, startDate),
                        lte(auditLog.timestamp, endDate)
                      )
                    )
                    .then((res) => res[0]?.count || 0),

                  // Successful events
                  drizzle
                    .select({ count: count() })
                    .from(auditLog)
                    .where(
                      and(
                        gte(auditLog.timestamp, startDate),
                        lte(auditLog.timestamp, endDate),
                        eq(auditLog.status, AUDIT_LOG_STATUS.SUCCESS)
                      )
                    )
                    .then((res) => res[0]?.count || 0),

                  // Failed events
                  drizzle
                    .select({ count: count() })
                    .from(auditLog)
                    .where(
                      and(
                        gte(auditLog.timestamp, startDate),
                        lte(auditLog.timestamp, endDate),
                        eq(auditLog.status, AUDIT_LOG_STATUS.FAILURE)
                      )
                    )
                    .then((res) => res[0]?.count || 0),

                  // Denied events (Authorization failure)
                  drizzle
                    .select({ count: count() })
                    .from(auditLog)
                    .where(
                      and(
                        gte(auditLog.timestamp, startDate),
                        lte(auditLog.timestamp, endDate),
                        eq(auditLog.category, AUDIT_CATEGORY.AUTHORIZATION),
                        eq(auditLog.status, AUDIT_LOG_STATUS.FAILURE)
                      )
                    )
                    .then((res) => res[0]?.count || 0),

                  // By Category
                  drizzle
                    .select({ category: auditLog.category, count: count() })
                    .from(auditLog)
                    .where(
                      and(
                        gte(auditLog.timestamp, startDate),
                        lte(auditLog.timestamp, endDate)
                      )
                    )
                    .groupBy(auditLog.category)
                    .then((res) =>
                      res.reduce(
                        (acc, curr) => ({
                          ...acc,
                          [curr.category]: curr.count,
                        }),
                        {} as Record<AuditCategory, number>
                      )
                    ),

                  // By Severity
                  drizzle
                    .select({ severity: auditLog.severity, count: count() })
                    .from(auditLog)
                    .where(
                      and(
                        gte(auditLog.timestamp, startDate),
                        lte(auditLog.timestamp, endDate)
                      )
                    )
                    .groupBy(auditLog.severity)
                    .then((res) =>
                      res.reduce(
                        (acc, curr) => ({
                          ...acc,
                          [curr.severity]: curr.count,
                        }),
                        {} as Record<AuditSeverity, number>
                      )
                    ),

                  // High Risk Events (Warning/Failure or High/Critical severity)
                  drizzle
                    .select({ count: count() })
                    .from(auditLog)
                    .where(
                      and(
                        gte(auditLog.timestamp, startDate),
                        lte(auditLog.timestamp, endDate),
                        // High severity or critical
                        sql`${auditLog.severity} IN ('high', 'critical')`
                      )
                    )
                    .then((res) => res[0]?.count || 0),

                  // Top Users
                  drizzle
                    .select({ userId: auditLog.userId, eventCount: count() })
                    .from(auditLog)
                    .where(
                      and(
                        gte(auditLog.timestamp, startDate),
                        lte(auditLog.timestamp, endDate),
                        isNotNull(auditLog.userId)
                      )
                    )
                    .groupBy(auditLog.userId)
                    .orderBy(desc(count()))
                    .limit(5)
                    .then((res) =>
                      // Ensure userId is treated as string since we filtered out nulls
                      res.map((r) => ({
                        userId: r.userId as string,
                        eventCount: r.eventCount,
                      }))
                    ),

                  // Top Actions
                  drizzle
                    .select({ action: auditLog.action, eventCount: count() })
                    .from(auditLog)
                    .where(
                      and(
                        gte(auditLog.timestamp, startDate),
                        lte(auditLog.timestamp, endDate)
                      )
                    )
                    .groupBy(auditLog.action)
                    .orderBy(desc(count()))
                    .limit(5),
                ]);

                return {
                  totalEvents: Number(total),
                  successfulEvents: Number(successful),
                  failedEvents: Number(failed),
                  deniedEvents: Number(denied),
                  eventsByCategory: byCategory,
                  eventsBySeverity: bySeverity,
                  highRiskEvents: Number(highRisk),
                  topUsers,
                  topActions,
                };
              })
              .pipe(Effect.catchAll((error) => Effect.die(error)))
          );
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
              category: AuditCategorySchema.make(category),
              severity: AuditSeveritySchema.make(AUDIT_SEVERITY.MEDIUM),
              action,
              userId: authContext.user.id,
              userEmail: authContext.user.email,
              status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.SUCCESS),
              details: getDetails(result),
            })
          ),
          Effect.tapError((error) =>
            audit.logEvent({
              category,
              severity: AuditSeveritySchema.make(AUDIT_SEVERITY.HIGH),
              action,
              userId: authContext.user.id,
              userEmail: authContext.user.email,
              status: AuditLogStatusSchema.make(AUDIT_LOG_STATUS.FAILURE),
              details: { error: String(error) },
            })
          )
        )
      );

      return result;
    });
