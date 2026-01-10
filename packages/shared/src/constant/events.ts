/**
 * Audit event category
 */
export const AUDIT_CATEGORY = {
  USER_MANAGEMENT: "user_management",
  AUTHENTICATION: "authentication",
  AUTHORIZATION: "authorization",
  DATA_ACCESS: "data_access",
  COMPLIANCE: "compliance",
  FINANCIAL: "financial",
  SECURITY: "security",
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
 * KYC event type
 */
export const KYC_EVENT_TYPE = {
  SUBMIT: "submit",
  APPROVE: "approve",
  REJECT: "reject",
} as const;

export const AUDIT_RESOURCES = {
  KYC_VERIFICATION: "kyc_verification",
  SAVINGS_PLAN: "savings_plan",
  TRANSACTION: "transaction",
  ANALYTICS: "analytics",
  WALLET: "wallet",
  SYSTEM: "system",
  GROUP: "group",
  USER: "user",
};

/**
 * Auth method
 */
export const AUTH_METHOD = {
  BIOMETRIC: "biometric",
  PASSWORD: "password",
  REFRESH: "refresh",
  TOKEN: "token",
} as const;
