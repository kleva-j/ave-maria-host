import { AuthContextSchema, AuthMethodSchema } from "./auth-schemas";
import { PermissionSchema, RoleSchema } from "./roles-schemas";
import { Schema } from "effect";

import {
  TransactionTypeSchema,
  CurrencyCodeSchema,
  KycTierSchema,
} from "./enum-schemas";

import {
  AuditEventIdSchema,
  DeviceIdSchema,
  SessionIdSchema,
  UserIdSchema,
} from "./id-schemas";

import {
  UserAgentSchema,
  IpAddressSchema,
  AmountSchema,
  EmailSchema,
  DateSchema,
} from "./common-schemas";

import {
  BIOMETRIC_EVENT_TYPE,
  SECURITY_EVENT_TYPE,
  AUDIT_LOG_STATUS,
  AUDIT_RESOURCES,
  AUDIT_SEVERITY,
  AUDIT_CATEGORY,
  KYC_EVENT_TYPE,
} from "../constant";

/**
 * Audit Category Schema
 */
export const AuditCategorySchema = Schema.Literal(
  ...Object.values(AUDIT_CATEGORY)
)
  .pipe(Schema.brand("AuditCategory"))
  .annotations({
    message: () => "Invalid Audit Category",
    description: "Audit Category",
  });

/**
 * Audit Severity Schema
 */
export const AuditSeveritySchema = Schema.Literal(
  ...Object.values(AUDIT_SEVERITY)
)
  .pipe(Schema.brand("AuditSeverity"))
  .annotations({
    message: () => "Invalid Audit Severity",
    description: "Audit Severity",
  });

/**
 * Audit Log Status Schema
 */
export const AuditLogStatusSchema = Schema.Literal(
  ...Object.values(AUDIT_LOG_STATUS)
)
  .pipe(Schema.brand("AuditLogStatus"))
  .annotations({
    message: () => "Invalid Audit Log Status",
    description: "Audit Log Status",
  });

/**
 * Biometric Event Type Schema
 */
export const BiometricEventTypeSchema = Schema.Literal(
  ...Object.values(BIOMETRIC_EVENT_TYPE)
)
  .pipe(Schema.brand("BiometricEventType"))
  .annotations({
    message: () => "Invalid Biometric Event Type",
    description: "Biometric Event Type",
  });

/**
 * Security Event Type Schema
 */
export const SecurityEventTypeSchema = Schema.Literal(
  ...Object.values(SECURITY_EVENT_TYPE)
)
  .pipe(Schema.brand("SecurityEventType"))
  .annotations({
    message: () => "Invalid Security Event Type",
    description: "Security Event Type",
  });

/**
 * Kyc Event Type Schema
 */
export const KycEventTypeSchema = Schema.Literal(
  ...Object.values(KYC_EVENT_TYPE)
)
  .pipe(Schema.brand("KycEventType"))
  .annotations({
    message: () => "Invalid Kyc Event Type",
    description: "Kyc Event Type",
  });

/**
 * Audit Resource Schema
 */
export const AuditResourceSchema = Schema.Literal(
  ...Object.values(AUDIT_RESOURCES)
)
  .pipe(Schema.brand("AuditResource"))
  .annotations({
    message: () => "Invalid Audit Resource",
    description: "Audit Resource",
  });

/**
 * Audit Event Schema
 */
export const AuditEventSchema = Schema.Struct({
  id: AuditEventIdSchema,
  timestamp: DateSchema,
  category: AuditCategorySchema,
  severity: AuditSeveritySchema,
  action: Schema.String,
  userId: Schema.NullOr(UserIdSchema),
  userEmail: Schema.optional(Schema.NullOr(EmailSchema)),
  ipAddress: Schema.optional(Schema.NullOr(IpAddressSchema)),
  userAgent: Schema.optional(Schema.NullOr(UserAgentSchema)),
  resource: Schema.optional(Schema.NullOr(Schema.String)),
  resourceId: Schema.optional(Schema.NullOr(Schema.String)),
  status: AuditLogStatusSchema,
  details: Schema.optional(
    Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Any }))
  ),
  metadata: Schema.optional(
    Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Any }))
  ),
});

/**
 * Audit Query Filters Schema
 */
export const AuditQueryFiltersSchema = Schema.Struct({
  userId: Schema.optional(UserIdSchema),
  action: Schema.optional(Schema.String),
  resource: Schema.optional(Schema.String),
  status: Schema.optional(AuditLogStatusSchema),
  category: Schema.optional(AuditCategorySchema),
  severity: Schema.optional(AuditSeveritySchema),
  startDate: Schema.optional(DateSchema),
  endDate: Schema.optional(DateSchema),
  limit: Schema.optional(Schema.Number),
  offset: Schema.optional(Schema.Number),
});

/**
 * Authorization Event Schema
 */
export const AuthorizationEventSchema = Schema.Struct({
  authContext: AuthContextSchema,
  action: Schema.String,
  resource: AuditResourceSchema,
  status: AuditLogStatusSchema,
  reason: Schema.optional(Schema.String),
});

/**
 * Authentication Event Schema
 */
export const AuthenticationEventSchema = Schema.Struct({
  userId: UserIdSchema,
  action: Schema.String,
  status: AuditLogStatusSchema,
  details: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});

/**
 * User Management Event Schema
 */
export const UserManagementEventSchema = Schema.Struct({
  userId: UserIdSchema,
  action: Schema.String,
  status: AuditLogStatusSchema,
  details: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});

/**
 * Financial Event Schema
 */
export const FinancialEventSchema = Schema.Struct({
  authContext: AuthContextSchema,
  transactionType: TransactionTypeSchema,
  amount: AmountSchema,
  currency: CurrencyCodeSchema,
  status: AuditLogStatusSchema,
  details: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});

/**
 * Kyc Event Schema
 */
export const KycEventSchema = Schema.Struct({
  userId: UserIdSchema,
  action: Schema.String,
  kycTier: KycTierSchema,
  status: AuditLogStatusSchema,
  details: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});

/**
 * Security Event Schema
 */
export const SecurityEventSchema = Schema.Struct({
  eventType: SecurityEventTypeSchema,
  severity: AuditSeveritySchema,
  userId: Schema.optional(UserIdSchema),
  details: Schema.optional(
    Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Any }))
  ),
});

/**
 * Biometric Event Schema
 */
export const BiometricEventSchema = Schema.Struct({
  userId: UserIdSchema,
  action: BiometricEventTypeSchema,
  deviceId: DeviceIdSchema,
  status: AuditLogStatusSchema,
  details: Schema.optional(
    Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Any }))
  ),
});

/**
 * System Event Schema
 */
export const SystemEventSchema = Schema.Struct({
  action: Schema.String,
  status: AuditLogStatusSchema,
  details: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
})

/**
 * Audit Event
 */
export type AuthenticationEvent = typeof AuthenticationEventSchema.Type;
export type UserManagementEvent = typeof UserManagementEventSchema.Type;
export type AuthorizationEvent = typeof AuthorizationEventSchema.Type;
export type FinancialEvent = typeof FinancialEventSchema.Type;
export type BiometricEvent = typeof BiometricEventSchema.Type;
export type SecurityEvent = typeof SecurityEventSchema.Type;
export type SystemEvent = typeof SystemEventSchema.Type;
export type AuditEvent = typeof AuditEventSchema.Type;
export type KycEvent = typeof KycEventSchema.Type;

/**
 * Audit Event Type
 */
export type BiometricEventType = typeof BiometricEventTypeSchema.Type;
export type SecurityEventType = typeof SecurityEventTypeSchema.Type;

/**
 * Audit Query Filters
 */
export type AuditQueryFilters = typeof AuditQueryFiltersSchema.Type;

/**
 * Audit Enums
 */
export type AuditLogStatus = typeof AuditLogStatusSchema.Type;
export type AuditCategory = typeof AuditCategorySchema.Type;
export type AuditResource = typeof AuditResourceSchema.Type;
export type AuditSeverity = typeof AuditSeveritySchema.Type;
export type KycEventType = typeof KycEventTypeSchema.Type;
