// Common Validation Schemas using Effect Schema
// Reusable schemas and validation patterns used across the application

import { pipe, Schema } from "effect";

import {
  NotificationChannelEnum,
  KycGovernmentIdTypeEnum,
  PaymentDestinationEnum,
  TransactionStatusEnum,
  TransactionTypeEnum,
  PaymentMethodEnum,
  BiometricTypeEnum,
  PaymentSourceEnum,
  KycIdTypeEnum,
  KycStatusEnum,
  KycTierEnum,
  STATES,
  LGAS,
} from "../constant";

// ============================================================================
// Common Value Objects
// ============================================================================

/**
 * Schema for Money value object
 * Represents monetary amounts with currency (ISO_4217_CODES)
 */
export const CURRENCY_CODES = ["NGN", "USD", "EUR", "GBP"] as const;

/**
 * Default values for common schemas
 */
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
 * Schema for non-empty trimmed string
 */
export const NonEmptyTrimmedString = pipe(
  Schema.String,
  Schema.trimmed(),
  Schema.nonEmptyString({ message: () => "must not be empty" })
);

/**
 * Schema for Base64 string (RFC 4648 §4 – only the standard alphabet)
 */
export const Base64String = NonEmptyTrimmedString.pipe(
  Schema.pattern(
    /^[A-Za-z0-9+/]*={0,2}$/, // allows padding with = or ==
    { message: () => "must be a valid Base64-encoded string" }
  )
).annotations({
  title: "Base64",
  description: "Base64-encoded data (e.g. data URL payload or raw binary)",
  examples: [
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "SGVsbG8gV29ybGQh", // "Hello World!"
  ],
});

export type Base64String = typeof Base64String.Type;

export const UrlStringSchema = NonEmptyTrimmedString.pipe(
  Schema.pattern(
    /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
    { message: () => "must be a valid http(s) URL" }
  )
).annotations({
  title: "URL",
  description: "A valid HTTP(S) URL",
  examples: ["https://example.com/image.png"],
});

export type UrlString = typeof UrlStringSchema.Type;

/**
 * Schema for UUID validation
 */
export const UuidSchema = Schema.UUID.annotations({
  message: () => "Invalid UUID format",
});

/**
 * Schema for Date validation
 */
export const DateSchema = Schema.Date.annotations({
  message: () => "Invalid date format",
});

/**
 * Schema for DateTime validation
 */
export const DateTimeSchema = Schema.DateTimeUtc.annotations({
  message: () => "Invalid date format",
});

/**
 * Schema for UserAgent validation
 */
export const UserAgentSchema = Schema.String.pipe(Schema.minLength(1));

/**
 * Schema for IP Address validation
 */
export const IpAddressSchema = Schema.String.pipe(
  Schema.pattern(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)
).annotations({
  message: () => "Invalid IP address format",
});

/**
 * Schema for Token validation
 */
export const TokenSchema = Schema.String.pipe(Schema.minLength(1)).annotations({
  message: () => "Invalid token format",
});

export type Uuid = typeof UuidSchema.Type;
export type Date = typeof DateSchema.Type;
export type DateTime = typeof DateTimeSchema.Type;
export type UserAgent = typeof UserAgentSchema.Type;
export type IpAddress = typeof IpAddressSchema.Type;
export type Token = typeof TokenSchema.Type;

/**
 * Schema for UserId validation
 */
export const UserIdSchema = Schema.UUID.pipe(Schema.brand("UserId"));
export type UserIdType = typeof UserIdSchema.Type;

/**
 * Schema for SessionId validation
 */
export const SessionIdSchema = Schema.UUID.pipe(Schema.brand("SessionId"));
export type SessionIdType = typeof SessionIdSchema.Type;

/**
 * Schema for RoleId validation
 */
export const RoleIdSchema = Schema.UUID.pipe(Schema.brand("RoleId"));
export type RoleIdType = typeof RoleIdSchema.Type;

/**
 * Schema for PermissionId validation
 */
export const PermissionIdSchema = Schema.UUID.pipe(Schema.brand("PermissionId"));
export type PermissionIdType = typeof PermissionIdSchema.Type;

// ============================================================================
// Branded Type Utilities
// ============================================================================

/**
 * Branded UserId type - ensures type safety when passing user identifiers
 *
 * @example
 * ```typescript
 * function getUser(id: BrandedUserId) { ... }
 * const userId = UserIdSchema.make("uuid-here");
 * getUser(userId); // ✅ Works
 * getUser("plain-string"); // ❌ Type error
 * ```
 */
export type BrandedUserId = typeof UserIdSchema.Type;

/**
 * Branded SessionId type - ensures type safety for session identifiers
 *
 * @example
 * ```typescript
 * function getSession(id: BrandedSessionId) { ... }
 * const sessionId = SessionIdSchema.make("uuid-here");
 * getSession(sessionId); // ✅ Works
 * ```
 */
export type BrandedSessionId = typeof SessionIdSchema.Type;

/**
 * Branded KycTier type - only accepts 0, 1, or 2 with brand
 *
 * @example
 * ```typescript
 * function checkKycTier(tier: BrandedKycTier) { ... }
 * const tier = KycTierSchema.make(1);
 * checkKycTier(tier); // ✅ Works
 * checkKycTier(1); // ❌ Type error
 * ```
 */
export type BrandedKycTier = typeof KycTierSchema.Type;

/**
 * Branded Token type - ensures type safety for authentication tokens
 *
 * @example
 * ```typescript
 * function validateToken(token: BrandedToken) { ... }
 * const token = TokenSchema.make("jwt-token");
 * validateToken(token); // ✅ Works
 * ```
 */
export type BrandedToken = typeof TokenSchema.Type;

/**
 * Schema for phone number validation (international format)
 */
export const PhoneNumberSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\+?[1-9]\d{1,14}$/, {
    message: () =>
      "Invalid phone number format. Use international format (e.g., +2348012345678)",
  })
).annotations({ description: "Phone number" });

/**
 * Schema for Firstname and Lastname
 */
export const FirstNameSchema = Schema.Trimmed.pipe(
  Schema.minLength(1, { message: () => "First name is required" }),
  Schema.maxLength(100, {
    message: () => "First name must not exceed 100 characters",
  })
).annotations({ description: "First name" });

export const LastNameSchema = Schema.Trimmed.pipe(
  Schema.minLength(1, { message: () => "Last name is required" }),
  Schema.maxLength(100, {
    message: () => "Last name must not exceed 100 characters",
  })
).annotations({ description: "Last name" });

/**
 * Schema for email validation
 */
export const EmailSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: () => "Invalid email format",
  })
).annotations({ description: "Email address" });

/**
 * Schema for Physical Address validation
 */
export const AddressSchema = Schema.Trimmed.pipe(
  Schema.minLength(10, {
    message: () => "Address must be at least 10 characters",
  }),
  Schema.maxLength(255, {
    message: () => "Address must not exceed 255 characters",
  })
).annotations({ description: "Physical address" });

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
 * Schema for City validation
 */
export const CitySchema = Schema.Trimmed.pipe(
  Schema.minLength(3, {
    message: () => "City code must be at least 3 characters",
  }),
  Schema.maxLength(10, {
    message: () => "City code must not exceed 10 characters",
  })
);

/**
 * Schema for LGA (Local Government Area) validation
 */

export const LgaSchema = Schema.Literal(...LGAS)
  .pipe(Schema.brand("Lga"))
  .annotations({
    message: () => "Invalid LGA code",
    description: "LGA code",
  });

/**
 * Schema Validator for postal code validation
 */
export const PostalCodeSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\d{6}$/, {
    message: () => "Postal code must be exactly 6 digits",
  })
).annotations({ description: "Postal code" });

/**
 * Schema for Nigerian Bank Verification Number (BVN)
 */
export const BvnSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\d{11}$/, {
    message: () => "BVN must be exactly 11 digits",
  })
).annotations({ description: "Biometric verification number (BVN)" });

/**
 * Schema for Nigerian bank account number
 */
export const NigerianAccountNumberSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\d{10}$/, {
    message: () => "Account number must be exactly 10 digits",
  })
).annotations({ description: "Bank account number" });

/**
 * Schema for Nigerian bank code
 */
export const NigerianBankCodeSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\d{3}$/, {
    message: () => "Bank code must be exactly 3 digits",
  })
).annotations({ description: "Bank code" });

/**
 * Schema for time in HH:MM format
 */
export const TimeSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: () => "Invalid time format. Use HH:MM (e.g., 09:00)",
  })
).annotations({ description: "Time in HH:MM format" });

/**
 * Schema for percentage (0-100)
 */
export const PercentageSchema = Schema.Number.pipe(
  Schema.int({ message: () => "Must be a whole number" }),
  Schema.between(0, 100, {
    message: () => "Percentage must be between 0 and 100",
  })
).annotations({ description: "Percentage (0-100)" });

/**
 * Schema for positive integer
 */
export const PositiveIntSchema = Schema.Number.pipe(
  Schema.int({ message: () => "Must be a whole number" }),
  Schema.positive({ message: () => "Must be positive" })
).annotations({ description: "Positive integer" });

/**
 * Schema for non-negative integer
 */
export const NonNegativeIntSchema = Schema.Number.pipe(
  Schema.int({ message: () => "Must be a whole number" }),
  Schema.nonNegative({ message: () => "Cannot be negative" })
).annotations({ description: "Non-negative integer" });

/**
 * Schema for URL validation
 */
export const UrlSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^https?:\/\/.+/, {
    message: () => "Invalid URL format. Must start with http:// or https://",
  })
).annotations({ description: "URL" });

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
 * Schema for ISO country code (2 letters)
 */
export const CountryCodeSchema = Schema.Trimmed.pipe(
  Schema.brand("CountryCode"),
  Schema.pattern(/^[A-Z]{2}$/, {
    message: () => "Country code must be a 2-letter ISO code (e.g., NG, US)",
  })
).annotations({
  description: "ISO country code (2 letters)",
  defaultValue: "NG",
});

/**
 * Schema for invite code (6 alphanumeric characters)
 */
export const InviteCodeSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^[A-Z0-9]{6}$/, {
    message: () => "Invite code must be 6 alphanumeric characters",
  })
).annotations({ description: "Invite code (6 alphanumeric characters)" });

/**
 * Schema for OTP (6 digits)
 */
export const OtpSchema = Schema.Trimmed.pipe(
  Schema.pattern(/^\d{6}$/, {
    message: () => "OTP must be exactly 6 digits",
  })
).annotations({ description: "OTP (6 digits)" });

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
).annotations({ description: "Password" });

/**
 * Schema for KYC status
 */
export const KycStatusSchema = Schema.Literal(...Object.values(KycStatusEnum))
  .pipe(Schema.brand("KycStatus"))
  .annotations({
    message: () => "Invalid KYC status",
    description: "KYC status",
  });

export type KycStatus = typeof KycStatusSchema.Type;

/**
 * Schema for KYC ID type
 */
export const KycIdTypeSchema = Schema.Literal(...Object.values(KycIdTypeEnum))
  .pipe(Schema.brand("KycIdType"))
  .annotations({
    message: () => "Invalid ID type",
    description: "Type of government-issued ID",
  });

export type KycIdType = typeof KycIdTypeSchema.Type;

/**
 * KYC Tier Schemas
 */
export const KycTierSchema = Schema.Literal(...Object.values(KycTierEnum))
  .pipe(Schema.brand("KycTier"))
  .annotations({
    message: () => "Invalid KYC tier. KYC tier must be between 0 and 2",
    description: "KYC tier level",
  });

export const KycGovernmentIdTypeSchema = Schema.Literal(
  ...Object.values(KycGovernmentIdTypeEnum)
)
  .pipe(Schema.brand("KycGovIdType"))
  .annotations({
    message: () => "Invalid ID type",
    description: "Type of government-issued ID",
  });

export type KycGovernmentIdType = typeof KycGovernmentIdTypeSchema.Type;

export const KycGovernmentIdNumberSchema = Schema.String.pipe(
  Schema.minLength(5, { message: () => "ID number is required" }),
  Schema.maxLength(32, {
    message: () => "ID number must not exceed 32 characters",
  })
).annotations({ description: "ID number" });

export type KycGovernmentIdNumber = typeof KycGovernmentIdNumberSchema.Type;

/**
 * Schema for Kyc id number
 */
export const KycIdNumberSchema = Schema.String.pipe(
  Schema.minLength(5, { message: () => "ID number is required" }),
  Schema.maxLength(50, {
    message: () => "ID number must not exceed 50 characters",
  })
).annotations({ description: "ID number" });

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

export type BiometricType = typeof BiometricTypeSchema.Type;

// ============================================================================
// Common Enums
// ============================================================================

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

export type TransactionStatus = typeof TransactionStatusSchema.Type;

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

export type TransactionType = typeof TransactionTypeSchema.Type;

/**
 * Schema for Transaction Reference
 */
export const TransactionReferenceSchema = Schema.String.pipe(
  Schema.minLength(5, { message: () => "Reference is required" }),
  Schema.maxLength(100, {
    message: () => "Reference must not exceed 50 characters",
  })
).annotations({ description: "Transaction Reference" });

export type TransactionReference = typeof TransactionReferenceSchema.Type;

/**
 * Schema for Transaction Description
 */
export const TransactionDescriptionSchema = Schema.String.pipe(
  Schema.minLength(5, { message: () => "Description is required" }),
  Schema.maxLength(100, {
    message: () => "Description must not exceed 100 characters",
  })
).annotations({ description: "Transaction Description" });

export type TransactionDescription = typeof TransactionDescriptionSchema.Type;

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

export type PaymentSource = typeof PaymentSourceSchema.Type;

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

export type PaymentDestination = typeof PaymentDestinationSchema.Type;

/**
 * Interest rate schema
 */
export const InterestRateSchema = Schema.Number.pipe(
  Schema.between(0, 1)
).annotations({
  description: "Interest rate in percentage",
  message: () => "Interest rate must be between 0 and 1",
});

export type InterestRate = typeof InterestRateSchema.Type;

/**
 * Contribution streak schema
 */
export const ContributionStreakSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(0, 365)
).annotations({
  description: "Contribution streak in days",
  message: () => "Contribution streak must be between 0 and 365 days",
});

export type ContributionStreak = typeof ContributionStreakSchema.Type;

/**
 * Total contributions schema
 */
export const TotalContributionsSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(0, 365)
).annotations({
  description: "Total contributions in days",
  message: () => "Total contributions must be between 0 and 365 days",
});

export type TotalContributions = typeof TotalContributionsSchema.Type;

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

export type NotificationChannel = typeof NotificationChannelSchema.Type;

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
