import { Data } from "effect";

/**
 * Database configuration interface defining connection parameters and limits.
 *
 * @example
 * ```typescript
 * const dbConfig: DatabaseConfig = {
 *   url: "postgresql://user:pass@localhost:5432/db",
 *   maxConnections: 20,
 *   connectionTimeout: 5000
 * };
 * ```
 */
export interface DatabaseConfig {
  /** Database connection URL (e.g., PostgreSQL connection string) */
  readonly url: string;
  /** Maximum number of concurrent database connections */
  readonly maxConnections: number;
  /** Connection timeout in milliseconds */
  readonly connectionTimeout: number;
}

/**
 * Authentication configuration interface for JWT and session management.
 *
 * @example
 * ```typescript
 * const authConfig: AuthConfig = {
 *   jwtSecret: "your-secret-key",
 *   sessionTimeout: 3600, // 1 hour
 *   refreshTokenExpiry: 604800 // 7 days
 * };
 * ```
 */
export interface AuthConfig {
  /** Secret key used for JWT token signing and verification */
  readonly jwtSecret: string;
  /** Session timeout duration in seconds */
  readonly sessionTimeout: number;
  /** Refresh token expiry duration in seconds */
  readonly refreshTokenExpiry: number;
}

/**
 * HTTP server configuration interface including CORS settings.
 *
 * @example
 * ```typescript
 * const serverConfig: ServerConfig = {
 *   port: 3000,
 *   host: "0.0.0.0",
 *   cors: {
 *     origins: ["http://localhost:3000", "https://myapp.com"],
 *     credentials: true
 *   }
 *   environment: "developement" | "production" | "test",
 * };
 * ```
 */
export interface ServerConfig {
  /** Port number for the HTTP server */
  readonly port: number;
  /** Host address to bind the server to */
  readonly host: string;
  /** CORS (Cross-Origin Resource Sharing) configuration */
  readonly cors: {
    /** List of allowed origins for CORS requests */
    readonly origins: readonly string[];
    /** Whether to allow credentials in CORS requests */
    readonly credentials: boolean;
  };
  /** Node Environment Configuration */
  readonly environment: "production" | "development" | "test";
  /** Version of the application */
  readonly version: string;
}

/**
 * Logging configuration interface for application-wide logging settings.
 *
 * @example
 * ```typescript
 * const loggingConfig: LoggingConfig = {
 *   level: "info",
 *   format: "json",
 *   enableCorrelationId: true
 * };
 * ```
 */
export interface LoggingConfig {
  /** Minimum log level to output */
  readonly level: keyof typeof LOG_LEVELS;
  /** Log output format */
  readonly format: keyof typeof LOG_FORMATS;
  /** Whether to include correlation IDs in log entries */
  readonly enableCorrelationId: boolean;
}

export const LOG_LEVELS = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
} as const;

export const LOG_FORMATS = {
  json: "json",
  pretty: "pretty",
} as const;

export type LogFormat = LoggingConfig["format"];
export type LogLevel = LoggingConfig["level"];

export interface RedisConfig {
  /** Redis Url */
  readonly url: string;
}

/**
 * Payment configuration interface for payment processing settings.
 *
 * @example
 * ```typescript
 * const paymentConfig: PaymentConfig = {
 *   paystackSecretKey: "your-paystack-secret-key",
 *   flutterwaveSecretKey: "your-flutterwave-secret-key"
 * };
 * ```
 */
export interface PaymentConfig {
  /** Paystack Secret Key */
  readonly paystackSecretKey: string;
  /** Flutterwave Secret Key */
  readonly flutterwaveSecretKey: string;
}

/**
 * Tagged error class for configuration-related failures.
 * Used when configuration validation fails or required configuration is missing.
 *
 * @example
 * ```typescript
 * // Throw configuration error
 * throw new ConfigError({
 *   message: "Invalid database URL format",
 *   field: "database.url"
 * });
 *
 * // Handle configuration error
 * Effect.catchTag("ConfigError", (error) => {
 *   console.error(`Config error in ${error.field}: ${error.message}`);
 *   return Effect.fail(new ValidationError({ ... }));
 * })
 * ```
 */
export class ConfigError extends Data.TaggedError("ConfigError")<{
  /** Human-readable error message describing the configuration issue */
  readonly message: string;
  /** Optional field name that caused the configuration error */
  readonly field?: string;
}> {}

// Auth error types
export const AuthErrorTypes = {
  InvalidToken: "InvalidToken",
  SessionExpired: "SessionExpired",
  UserNotFound: "UserNotFound",
  InvalidCredentials: "InvalidCredentials",
} as const;

export type AuthErrorType = keyof typeof AuthErrorTypes;
