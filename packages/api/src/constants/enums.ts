/**
 * Audit event category
 */
export const AUDIT_CATEGORY = {
  USER_MANAGEMENT: "user_management",
  AUTHENTICATION: "authentication",
  AUTHORIZATION: "authorization",
  DATA_ACCESS: "data_access",
  FINANCIAL: "financial",
  SYSTEM: "system",
  KYC: "kyc",
} as const;

/**
 * Audit event severity
 */
export const AUDIT_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

/**
 * Audit log status
 */
export const AUDIT_LOG_STATUS = {
  SUCCESS: "success",
  FAILURE: "failure",
  PENDING: "pending",
  WARNING: "warning",
} as const;

/**
 * Biometric event type
 */
export const BIOMETRIC_EVENT_TYPE = {
  AUTHENTICATE: "authenticate",
  REGISTER: "register",
  DISABLE: "disable",
} as const;

/**
 * Security event type
 */
export const SECURITY_EVENT_TYPE = {
  SUSPICIOUS_ACTIVITY: "suspicious_activity",
  UNAUTHORIZED_ACCESS: "unauthorized_access",
  ACCOUNT_LOCKOUT: "account_lockout",
  DATA_BREACH: "data_breach",
} as const;

/**
 * Financial transaction type
 */
export const FINANCIAL_TRANSACTION_TYPE = {
  WITHDRAWAL: "withdrawal",
  TRANSFER: "transfer",
  DEPOSIT: "deposit",
} as const;

/**
 * KYC event type
 */
export const KYC_EVENT_TYPE = {
  SUBMIT: "submit",
  APPROVE: "approve",
  REJECT: "reject",
} as const;

/**
 * KYC verification status
 */
export const KYC_VERIFICATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  UNDER_REVIEW: "under_review",
} as const;

/**
 * Data access action
 */
export const DATA_ACCESS_ACTION = {
  READ: "read",
  WRITE: "write",
  DELETE: "delete",
} as const;

/**
 * Transaction limit type
 */
export const TRANSACTION_LIMIT_TYPE = {
  DAILY: "daily",
  MONTHLY: "monthly",
  PER_TRANSACTION: "per_transaction",
} as const;
