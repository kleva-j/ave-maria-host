import type {
  FINANCIAL_TRANSACTION_TYPE,
  KYC_VERIFICATION_STATUS,
  TRANSACTION_LIMIT_TYPE,
  BIOMETRIC_EVENT_TYPE,
  SECURITY_EVENT_TYPE,
  DATA_ACCESS_ACTION,
  AUDIT_LOG_STATUS,
  KYC_EVENT_TYPE,
  AUDIT_SEVERITY,
  AUDIT_CATEGORY,
} from "../constants/enums";

/**
 * Audit event categories
 */
export type AuditCategory =
  (typeof AUDIT_CATEGORY)[keyof typeof AUDIT_CATEGORY];
export type AuditSeverity =
  (typeof AUDIT_SEVERITY)[keyof typeof AUDIT_SEVERITY];
export type AuditLogStatus =
  (typeof AUDIT_LOG_STATUS)[keyof typeof AUDIT_LOG_STATUS];
export type DataAccessAction =
  (typeof DATA_ACCESS_ACTION)[keyof typeof DATA_ACCESS_ACTION];
export type SecurityEventType =
  (typeof SECURITY_EVENT_TYPE)[keyof typeof SECURITY_EVENT_TYPE];
export type BiometricEventType =
  (typeof BIOMETRIC_EVENT_TYPE)[keyof typeof BIOMETRIC_EVENT_TYPE];
export type KYCVerificationStatus =
  (typeof KYC_VERIFICATION_STATUS)[keyof typeof KYC_VERIFICATION_STATUS];
export type TransactionLimitType =
  (typeof TRANSACTION_LIMIT_TYPE)[keyof typeof TRANSACTION_LIMIT_TYPE];
export type FinancialTransactionType =
  (typeof FINANCIAL_TRANSACTION_TYPE)[keyof typeof FINANCIAL_TRANSACTION_TYPE];

export type KYCEventType = (typeof KYC_EVENT_TYPE)[keyof typeof KYC_EVENT_TYPE];
