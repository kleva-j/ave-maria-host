// ==============================
// Enumerations
// ==============================

// ==============================
// Kyc Enumerations
// ==============================

/**
 * Kyc Status Enum
 */
export const KycStatusEnum = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  UNDER_REVIEW: "under_review",
} as const;

/**
 * Kyc Id Type Enum
 */
export const KycIdTypeEnum = {
  DRIVERS_LICENSE: "drivers_license",
  NATIONAL_ID: "national_id",
  VOTERS_CARD: "voters_card",
  PASSPORT: "passport",
} as const;

/**
 * Kyc Tier Enum
 */
export const KycTierEnum = {
  UNVERIFIED: 0,
  BASIC: 1,
  FULL: 2,
} as const;

/**
 * Kyc Government Id Type Enum
 */
export const KycGovernmentIdTypeEnum = {
  DRIVERS_LICENSE: "DriversLicense",
  VOTERS_CARD: "VotersCard",
  PASSPORT: "Passport",
  BVN: "BVN",
  NIN: "NIN",
} as const;

// ==============================
// Transaction Enumerations
// ==============================

/**
 * Transaction Status Enum
 */
export const TransactionStatusEnum = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

/**
 * Transaction Type Enum
 */
export const TransactionTypeEnum = {
  CONTRIBUTION: "contribution",
  WITHDRAWAL: "withdrawal",
  INTEREST: "interest",
  PENALTY: "penalty",
  WALLET_FUNDING: "wallet_funding",
  WALLET_WITHDRAWAL: "wallet_withdrawal",
  AUTO_SAVE: "auto_save",
} as const;

// ==============================
// Payment Enumerations
// ==============================

/**
 * Payment Source Enum
 */
export const PaymentSourceEnum = {
  WALLET: "wallet",
  BANK_TRANSFER: "bank_transfer",
  DEBIT_CARD: "debit_card",
  CASH: "cash",
} as const;

/**
 * Payment Method Enum
 */
export const PaymentMethodEnum = {
  DIRECT_DEPOSIT: "direct_deposit",
  BANK_TRANSFER: "bank_transfer",
  DEBIT_CARD: "debit_card",
  WALLET: "wallet",
  USSD: "ussd",
} as const;

// ==============================
// Plan Enumerations
// ==============================

/**
 * Plan Status Enum
 */
export const PlanStatusEnum = {
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const PlanActionEnum = {
  PAUSE: "pause",
  RESUME: "resume",
  CANCEL: "cancel",
  UPDATE_AUTOSAVE: "update_autosave",
} as const;

// ==============================
// Notification Enumerations
// ==============================

/**
 * Notification Channel Enum
 */
export const NotificationChannelEnum = {
  SMS: "sms",
  PUSH: "push",
  EMAIL: "email",
  IN_APP: "in_app",
} as const;

// ==============================
// Biometric Enumerations
// ==============================

/**
 * Biometric Type Enum
 */
export const BiometricTypeEnum = {
  FINGERPRINT: "fingerprint",
  FACE: "face_id",
  IRIS: "iris",
} as const;
