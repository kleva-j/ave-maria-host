// Common Validation Schemas using Effect Schema
// Reusable schemas and validation patterns used across the application

import { Schema } from "@effect/schema";

// ============================================================================
// Common Value Objects
// ============================================================================

/**
 * Schema for Money value object
 * Represents monetary amounts with currency
 */
export const MoneySchema = Schema.Struct({
  value: Schema.Number.pipe(
    Schema.nonNegative({ message: () => "Amount cannot be negative" })
  ),
  currency: Schema.Literal("NGN", "USD", "EUR", "GBP").pipe(
    Schema.annotations({
      description: "ISO 4217 currency code",
    })
  ),
});

export type Money = Schema.Schema.Type<typeof MoneySchema>;

/**
 * Schema for pagination parameters
 */
export const PaginationSchema = Schema.Struct({
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
});

export type Pagination = Schema.Schema.Type<typeof PaginationSchema>;

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

export type DateRange = Schema.Schema.Type<typeof DateRangeSchema>;

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
export const PhoneNumberSchema = Schema.String.pipe(
  Schema.pattern(/^\+?[1-9]\d{1,14}$/, {
    message: () =>
      "Invalid phone number format. Use international format (e.g., +2348012345678)",
  })
);

/**
 * Schema for email validation
 */
export const EmailSchema = Schema.String.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: () => "Invalid email format",
  })
);

/**
 * Schema for Nigerian Bank Verification Number (BVN)
 */
export const BvnSchema = Schema.String.pipe(
  Schema.pattern(/^\d{11}$/, {
    message: () => "BVN must be exactly 11 digits",
  })
);

/**
 * Schema for Nigerian bank account number
 */
export const NigerianAccountNumberSchema = Schema.String.pipe(
  Schema.pattern(/^\d{10}$/, {
    message: () => "Account number must be exactly 10 digits",
  })
);

/**
 * Schema for Nigerian bank code
 */
export const NigerianBankCodeSchema = Schema.String.pipe(
  Schema.pattern(/^\d{3}$/, {
    message: () => "Bank code must be exactly 3 digits",
  })
);

/**
 * Schema for time in HH:MM format
 */
export const TimeSchema = Schema.String.pipe(
  Schema.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: () => "Invalid time format. Use HH:MM (e.g., 09:00)",
  })
);

/**
 * Schema for percentage (0-100)
 */
export const PercentageSchema = Schema.Number.pipe(
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
export const UrlSchema = Schema.String.pipe(
  Schema.pattern(/^https?:\/\/.+/, {
    message: () => "Invalid URL format. Must start with http:// or https://",
  })
);

/**
 * Schema for ISO country code (2 letters)
 */
export const CountryCodeSchema = Schema.String.pipe(
  Schema.pattern(/^[A-Z]{2}$/, {
    message: () => "Country code must be a 2-letter ISO code (e.g., NG, US)",
  })
);

/**
 * Schema for currency code (3 letters)
 */
export const CurrencyCodeSchema = Schema.String.pipe(
  Schema.pattern(/^[A-Z]{3}$/, {
    message: () => "Currency code must be a 3-letter ISO code (e.g., NGN, USD)",
  })
);

/**
 * Schema for invite code (6 alphanumeric characters)
 */
export const InviteCodeSchema = Schema.String.pipe(
  Schema.pattern(/^[A-Z0-9]{6}$/, {
    message: () => "Invite code must be 6 alphanumeric characters",
  })
);

/**
 * Schema for OTP (6 digits)
 */
export const OtpSchema = Schema.String.pipe(
  Schema.pattern(/^\d{6}$/, {
    message: () => "OTP must be exactly 6 digits",
  })
);

/**
 * Schema for password validation
 */
export const PasswordSchema = Schema.String.pipe(
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

export type TransactionStatus = Schema.Schema.Type<
  typeof TransactionStatusSchema
>;

/**
 * Schema for plan status
 */
export const PlanStatusSchema = Schema.Literal(
  "active",
  "paused",
  "completed",
  "cancelled"
);

export type PlanStatus = Schema.Schema.Type<typeof PlanStatusSchema>;

/**
 * Schema for KYC status
 */
export const KycStatusSchema = Schema.Literal(
  "pending",
  "approved",
  "rejected",
  "under_review"
);

export type KycStatus = Schema.Schema.Type<typeof KycStatusSchema>;

/**
 * Schema for notification channel
 */
export const NotificationChannelSchema = Schema.Literal(
  "sms",
  "push",
  "email",
  "in_app"
);

export type NotificationChannel = Schema.Schema.Type<
  typeof NotificationChannelSchema
>;

/**
 * Schema for payment method
 */
export const PaymentMethodSchema = Schema.Literal(
  "bank_transfer",
  "debit_card",
  "ussd",
  "wallet"
);

export type PaymentMethod = Schema.Schema.Type<typeof PaymentMethodSchema>;

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
