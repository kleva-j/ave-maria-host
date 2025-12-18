import type {
  FinancialTransactionTypeEnum,
  KycVerificationStatusEnum,
  TransactionLimitTypeEnum,
  BiometricEventTypeEnum,
  SecurityEventTypeEnum,
  DataAccessActionEnum,
  AuditLogStatusEnum,
  AuditCategoryEnum,
  AuditSeverityEnum,
  KYCEventTypeEnum,
} from "../constants/enums";

/**
 * Audit event categories
 */
export type AuditCategory =
  (typeof AuditCategoryEnum)[keyof typeof AuditCategoryEnum];
export type AuditSeverity =
  (typeof AuditSeverityEnum)[keyof typeof AuditSeverityEnum];
export type AuditLogStatus =
  (typeof AuditLogStatusEnum)[keyof typeof AuditLogStatusEnum];
export type BiometricEventType =
  (typeof BiometricEventTypeEnum)[keyof typeof BiometricEventTypeEnum];
export type SecurityEventType =
  (typeof SecurityEventTypeEnum)[keyof typeof SecurityEventTypeEnum];
export type FinancialTransactionType =
  (typeof FinancialTransactionTypeEnum)[keyof typeof FinancialTransactionTypeEnum];
export type KYCEventType =
  (typeof KYCEventTypeEnum)[keyof typeof KYCEventTypeEnum];
export type KycVerificationStatus =
  (typeof KycVerificationStatusEnum)[keyof typeof KycVerificationStatusEnum];
export type DataAccessAction =
  (typeof DataAccessActionEnum)[keyof typeof DataAccessActionEnum];
export type TransactionLimitType =
  (typeof TransactionLimitTypeEnum)[keyof typeof TransactionLimitTypeEnum];
