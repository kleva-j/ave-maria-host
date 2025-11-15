// Common Validation Schemas using Effect Schema
// Reusable schemas and validation patterns used across the application

import { Schema } from "effect";

// ============================================================================
// Common Value Objects
// ============================================================================

/**
 * Schema for Money value object
 * Represents monetary amounts with currency (ISO_4217_CODES)
 */
export const CURRENCY_CODES = ["NGN", "USD", "EUR", "GBP"] as const;

export const CurrencyCodeSchema = Schema.Literal(...CURRENCY_CODES).pipe(
  Schema.brand("CurrencyCode")
);

export const DEFAULT_CURRENCY = CurrencyCodeSchema.make("NGN");

export type CurrencyCode = typeof CurrencyCodeSchema.Type;

/**
 * Schema for Money validation
 */
export class MoneySchema extends Schema.Class<MoneySchema>("MoneySchema")({
  value: Schema.Number.pipe(
    Schema.nonNegative({ message: () => "Amount cannot be negative" })
  ),
  currency: CurrencyCodeSchema,
}).annotations({
  description: "Money value object representing monetary amounts with currency",
}) {}

export type Money = typeof MoneySchema.Type;

/**
 * Schema for amount validation
 */
export const Amount = Schema.BigInt.pipe(
  Schema.filter((n) => n >= 0n, {
    message: () => "Amount must be non-negative",
  }),
  Schema.filter((n) => n <= BigInt("9007199254740991"), {
    message: () => "Amount exceeds safe BigInt limit",
  })
);

/**
 * Schema for pagination parameters
 */
export class PaginationSchema extends Schema.Class<PaginationSchema>(
  "PaginationSchema"
)({
  limit: Schema.optional(
    Schema.Number.pipe(
      Schema.int(),
      Schema.between(1, 100, {
        message: () => "Limit must be between 1 and 100",
      })
    )
  ),
  offset: Schema.optional(
    Schema.Number.pipe(
      Schema.int(),
      Schema.nonNegative({ message: () => "Offset must be non-negative" })
    )
  ),
}) {}

export type Pagination = typeof PaginationSchema.Type;

/**
 * Schema for date range filters
 */
export const DateRangeSchema = Schema.Struct({
  startDate: Schema.DateTimeUtc,
  endDate: Schema.DateTimeUtc,
}).pipe(
  Schema.filter((data) => {
    if (data.startDate >= data.endDate) {
      return {
        message: "Start date must be before end date",
        path: ["startDate"],
      };
    }
    return true;
  })
);

export type DateRange = typeof DateRangeSchema.Type;

/**
 * Schema for API response wrapper
 */
export const ApiResponseSchema = <A, I, R>(
  dataSchema: Schema.Schema<A, I, R>
) =>
  Schema.Struct({
    success: Schema.Boolean,
    data: Schema.optional(dataSchema),
    error: Schema.optional(
      Schema.Struct({
        code: Schema.String,
        message: Schema.String,
        details: Schema.optional(
          Schema.Record({ key: Schema.String, value: Schema.Unknown })
        ),
      })
    ),
    timestamp: Schema.DateTimeUtc,
  });

/**
 * Schema for paginated response wrapper
 */
export const PaginatedResponseSchema = <A, I, R>(
  itemSchema: Schema.Schema<A, I, R>
) =>
  Schema.Struct({
    items: Schema.Array(itemSchema),
    total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    limit: Schema.Number.pipe(Schema.int(), Schema.positive()),
    offset: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
    hasMore: Schema.Boolean,
  });

/**
 * Schema for UUID validation
 */
export const UuidSchema = Schema.UUID.annotations({
  message: () => "Invalid UUID format",
});

/**
 * Schema for phone number validation (international format)
 */
export const PhoneNumberSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\+?[1-9]\d{1,14}$/, {
    message: () =>
      "Invalid phone number format. Use international format (e.g., +2348012345678)",
  })
);

/**
 * Schema for email validation
 */
export const EmailSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: () => "Invalid email format",
  })
);

/**
 * Schema for Nigerian Bank Verification Number (BVN)
 */
export const BvnSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\d{11}$/, {
    message: () => "BVN must be exactly 11 digits",
  })
);

/**
 * Schema for Nigerian bank account number
 */
export const NigerianAccountNumberSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\d{10}$/, {
    message: () => "Account number must be exactly 10 digits",
  })
);

/**
 * Schema for Nigerian bank code
 */
export const NigerianBankCodeSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\d{3}$/, {
    message: () => "Bank code must be exactly 3 digits",
  })
);

/**
 * Schema for time in HH:MM format
 */
export const TimeSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: () => "Invalid time format. Use HH:MM (e.g., 09:00)",
  })
);

/**
 * Schema for percentage (0-100)
 */
export const PercentageSchema = Schema.Number.pipe(
  Schema.int({ message: () => "Must be a whole number" }),
  Schema.between(0, 100, {
    message: () => "Percentage must be between 0 and 100",
  })
);

/**
 * Schema for positive integer
 */
export const PositiveIntSchema = Schema.Number.pipe(
  Schema.int({ message: () => "Must be a whole number" }),
  Schema.positive({ message: () => "Must be positive" })
);

/**
 * Schema for non-negative integer
 */
export const NonNegativeIntSchema = Schema.Number.pipe(
  Schema.int({ message: () => "Must be a whole number" }),
  Schema.nonNegative({ message: () => "Cannot be negative" })
);

/**
 * Schema for URL validation
 */
export const UrlSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^https?:\/\/.+/, {
    message: () => "Invalid URL format. Must start with http:// or https://",
  })
);

/**
 * Schema for ISO country code (2 letters)
 */
export const CountryCodeSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^[A-Z]{2}$/, {
    message: () => "Country code must be a 2-letter ISO code (e.g., NG, US)",
  })
);

/**
 * Schema for currency code (3 letters) Might Remove later
 */
// export const CurrencyCodeSchema = Schema.Trimmed.pipe(
//   Schema.pattern(/^[A-Z]{3}$/, {
//     message: () => "Currency code must be a 3-letter ISO code (e.g., NGN, USD)",
//   }),
//   Schema.filter(
//     (s) => {
//       const codes = CURRENCY_CODES as readonly string[];
//       return codes.includes(s);
//     },
//     {
//       message: (s) => `${s} is not a valid ISO 4217 currency code`,
//     }
//   ),
//   Schema.brand("CurrencyCode")
// );

/**
 * Schema for invite code (6 alphanumeric characters)
 */
export const InviteCodeSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^[A-Z0-9]{6}$/, {
    message: () => "Invite code must be 6 alphanumeric characters",
  })
);

/**
 * Schema for OTP (6 digits)
 */
export const OtpSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\d{6}$/, {
    message: () => "OTP must be exactly 6 digits",
  })
);

/**
 * Schema for password validation
 */
export const PasswordSchema = Schema.Trimmed.pipe(
  Schema.minLength(8, {
    message: () => "Password must be at least 8 characters",
  }),
  Schema.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: () => "Password must contain uppercase, lowercase, and number",
  })
);

// ============================================================================
// Common Enums
// ============================================================================

/**
 * Schema for transaction status
 */
export const TransactionStatusSchema = Schema.Literal(
  "pending",
  "completed",
  "failed",
  "cancelled"
);

export type TransactionStatus = typeof TransactionStatusSchema.Type;

/**
 * Schema for plan status
 */
export const PlanStatusSchema = Schema.Literal(
  "active",
  "paused",
  "completed",
  "cancelled"
);

export type PlanStatus = typeof PlanStatusSchema.Type;

/**
 * Schema for KYC status
 */
export const KycStatusSchema = Schema.Literal(
  "pending",
  "approved",
  "rejected",
  "under_review"
);

export type KycStatus = typeof KycStatusSchema.Type;

/**
 * Schema for notification channel
 */
export const NotificationChannelSchema = Schema.Literal(
  "sms",
  "push",
  "email",
  "in_app"
);

export type NotificationChannel = typeof NotificationChannelSchema.Type;

/**
 * Schema for payment method
 */
export const PaymentMethodSchema = Schema.Literal(
  "bank_transfer",
  "debit_card",
  "ussd",
  "wallet"
);

export type PaymentMethod = typeof PaymentMethodSchema.Type;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Helper to create a trimmed string schema with min/max length
 */
export const createTrimmedStringSchema = (
  minLength: number,
  maxLength: number,
  fieldName: string
) =>
  Schema.Trimmed.pipe(
    Schema.minLength(minLength, {
      message: () => `${fieldName} must be at least ${minLength} characters`,
    }),
    Schema.maxLength(maxLength, {
      message: () => `${fieldName} must not exceed ${maxLength} characters`,
    })
  );

/**
 * Helper to create a bounded number schema
 */
export const createBoundedNumberSchema = (
  min: number,
  max: number,
  fieldName: string
) =>
  Schema.Number.pipe(
    Schema.between(min, max, {
      message: () => `${fieldName} must be between ${min} and ${max}`,
    })
  );

/**
 * Helper to create an optional UUID schema
 */
export const OptionalUuidSchema = Schema.optional(UuidSchema);

/**
 * Helper to create a nullable UUID schema
 */
export const NullableUuidSchema = Schema.NullOr(UuidSchema);
