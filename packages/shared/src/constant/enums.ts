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
 * Payment Destination Enum
 */
export const PaymentDestinationEnum = {
  WALLET: "wallet",
  BANK: "bank",
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

/**
 * Payment Status Enum
 */
export const PaymentStatusEnum = {
  SUCCESS: "success",
  PENDING: "pending",
  FAILED: "failed",
  ERROR: "error",
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
  VOICE: "voice",
  IRIS: "iris",
} as const;

// ==============================
// Rewards Tier Enumerations
// ==============================

/**
 * Rewards Tier Enum
 */
export const RewardsTierEnum = {
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
  PLATINUM: "platinum",
  DIAMOND: "diamond",
} as const;

/**
 * Rewards Tier Threshold Enum
 */
export const RewardsTierThresholdEnum = {
  [RewardsTierEnum.BRONZE]: 0,
  [RewardsTierEnum.SILVER]: 500,
  [RewardsTierEnum.GOLD]: 1000,
  [RewardsTierEnum.PLATINUM]: 2500,
  [RewardsTierEnum.DIAMOND]: 5000,
} as const;

/**
 * Rewards Badge Type Enum
 */
export const RewardsBadgeTypeEnum = {
  FIRST_CONTRIBUTION: "first_contribution",
  WEEK_STREAK: "week_streak",
  MONTH_STREAK: "month_streak",
  QUARTER_STREAK: "quarter_streak",
  YEAR_STREAK: "year_streak",
  FIRST_PLAN_COMPLETED: "first_plan_completed",
  FIVE_PLANS_COMPLETED: "five_plans_completed",
  TEN_PLANS_COMPLETED: "ten_plans_completed",
  SAVINGS_CHAMPION: "savings_champion",
  CONSISTENT_SAVER: "consistent_saver",
  GOAL_CRUSHER: "goal_crusher",
  EARLY_BIRD: "early_bird",
  NIGHT_OWL: "night_owl",
} as const;

/**
 * Fee Type Enum
 */
export const FeeTypeEnum = {
  FIXED: "fixed",
  HYBRID: "hybrid",
  PERCENTAGE: "percentage",
} as const;
