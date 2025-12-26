import { Schema } from "effect";
import {
  NotificationChannelEnum,
  KycGovernmentIdTypeEnum,
  PaymentDestinationEnum,
  TransactionStatusEnum,
  TransactionTypeEnum,
  PaymentSourceEnum,
  BiometricTypeEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  CURRENCY_CODES,
  KycIdTypeEnum,
  KycStatusEnum,
  KycTierEnum,
  STATES,
  LGAS,
} from "../constant";

// ============================================================================
// Common Enums
// ============================================================================

/**
 * Default values for common schemas
 */
export const CurrencyCodeSchema = Schema.Literal(...CURRENCY_CODES)
  .pipe(Schema.brand("CurrencyCode"))
  .annotations({
    message: () => "Invalid currency code",
    description: "Currency code",
  });

/**
 * Schema for State validation
 */
export const StateSchema = Schema.Literal(...STATES)
  .pipe(Schema.brand("State"))
  .annotations({
    message: () => "Invalid State code",
    description: "State code",
  });

/**
 * Schema for LGA (Local Government Area) validation
 */

export const LgaSchema = Schema.Literal(...LGAS)
  .pipe(Schema.brand("LGA"))
  .annotations({
    message: () => "Invalid LGA code",
    description: "LGA code",
  });

/**
 * Schema for Country Name
 */
export const CountryNameSchema = Schema.Literal("Nigeria")
  .pipe(Schema.brand("CountryName"))
  .annotations({
    message: () => "Invalid country name",
    description: "Country name",
    defaultValue: "Nigeria",
  });

/**
 * Schema for KYC status
 */
export const KycStatusSchema = Schema.Literal(...Object.values(KycStatusEnum))
  .pipe(Schema.brand("KycStatus"))
  .annotations({
    message: () => "Invalid KYC status",
    description: "KYC status",
  });

/**
 * Schema for KYC ID type
 */
export const KycIdTypeSchema = Schema.Literal(...Object.values(KycIdTypeEnum))
  .pipe(Schema.brand("KycIdType"))
  .annotations({
    message: () => "Invalid ID type",
    description: "Type of government-issued ID",
  });

/**
 * KYC Tier Schemas
 */
export const KycTierSchema = Schema.Literal(...Object.values(KycTierEnum))
  .pipe(Schema.brand("KycTier"))
  .annotations({
    message: () => "Invalid KYC tier. KYC tier must be between 0 and 2",
    description: "KYC tier level",
  });

/**
 * Schema for KYC government ID type
 */
export const KycGovernmentIdTypeSchema = Schema.Literal(
  ...Object.values(KycGovernmentIdTypeEnum)
)
  .pipe(Schema.brand("KycGovIdType"))
  .annotations({
    message: () => "Invalid ID type",
    description: "Type of government-issued ID",
  });

/**
 * Biometric authentication types & schemas
 */
export const BiometricTypeSchema = Schema.Literal(
  ...Object.values(BiometricTypeEnum)
)
  .pipe(Schema.brand("BiometricType"))
  .annotations({
    message: () => "Invalid biometric type",
    description: "Type of biometric verification",
  });

/**
 * Schema for transaction status
 */
export const TransactionStatusSchema = Schema.Literal(
  ...Object.values(TransactionStatusEnum)
)
  .pipe(Schema.brand("TransactionStatus"))
  .annotations({
    message: () => "Invalid transaction status",
    description: "Status of a transaction",
  });

/**
 * Schema for Transaction type
 */
export const TransactionTypeSchema = Schema.Literal(
  ...Object.values(TransactionTypeEnum)
)
  .pipe(Schema.brand("TransactionType"))
  .annotations({
    message: () => "Invalid transaction type",
    description: "Type of a transaction",
  });

/**
 * Schema for Payment Source
 */
export const PaymentSourceSchema = Schema.Literal(
  ...Object.values(PaymentSourceEnum)
)
  .pipe(Schema.brand("PaymentSource"))
  .annotations({
    message: () => "Invalid payment source",
    description: "Source of payment",
  });

/**
 * Schema for Payment Destination
 */
export const PaymentDestinationSchema = Schema.Literal(
  ...Object.values(PaymentDestinationEnum)
)
  .pipe(Schema.brand("PaymentDestination"))
  .annotations({
    message: () => "Invalid payment destination",
    description: "Destination of payment",
  });

/**
 * Schema for notification channel
 */
export const NotificationChannelSchema = Schema.Literal(
  ...Object.values(NotificationChannelEnum)
)
  .pipe(Schema.brand("NotificationChannel"))
  .annotations({
    message: () => "Invalid notification channel",
    description: "Notification channel",
  });

/**
 * Schema for payment method
 */
export const PaymentMethodSchema = Schema.Literal(
  ...Object.values(PaymentMethodEnum)
)
  .pipe(Schema.brand("PaymentMethod"))
  .annotations({
    message: () => "Invalid payment method",
    description: "Payment method",
  });

/**
 * Schema for payment status
 */
export const PaymentStatusSchema = Schema.Literal(
  ...Object.values(PaymentStatusEnum)
)
  .pipe(Schema.brand("PaymentStatus"))
  .annotations({
    message: () => "Invalid payment status",
    description: "Payment Status",
  });

export type LGA = typeof LgaSchema.Type;
export type State = typeof StateSchema.Type;
export type KycTier = typeof KycTierSchema.Type;
export type KycStatus = typeof KycStatusSchema.Type;
export type KycIdType = typeof KycIdTypeSchema.Type;
export type CountryName = typeof CountryNameSchema.Type;
export type CurrencyCode = typeof CurrencyCodeSchema.Type;
export type BiometricType = typeof BiometricTypeSchema.Type;
export type PaymentSource = typeof PaymentSourceSchema.Type;
export type PaymentMethod = typeof PaymentMethodSchema.Type;
export type PaymentStatus = typeof PaymentStatusSchema.Type;
export type TransactionType = typeof TransactionTypeSchema.Type;
export type TransactionStatus = typeof TransactionStatusSchema.Type;
export type PaymentDestination = typeof PaymentDestinationSchema.Type;
export type NotificationChannel = typeof NotificationChannelSchema.Type;
export type KycGovernmentIdType = typeof KycGovernmentIdTypeSchema.Type;
