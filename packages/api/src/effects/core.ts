import { Context, Data } from "effect";

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
  readonly level: "debug" | "info" | "warn" | "error";
  /** Log output format */
  readonly format: "json" | "pretty";
  /** Whether to include correlation IDs in log entries */
  readonly enableCorrelationId: boolean;
}

/**
 * Complete application configuration combining all subsystem configurations.
 * This is the root configuration interface used throughout the application.
 * 
 * @example
 * ```typescript
 * const appConfig: AppConfig = {
 *   database: { url: "postgresql://...", maxConnections: 10, connectionTimeout: 5000 },
 *   auth: { jwtSecret: "secret", sessionTimeout: 3600, refreshTokenExpiry: 604800 },
 *   server: { port: 3000, host: "0.0.0.0", cors: { origins: ["*"], credentials: false } },
 *   logging: { level: "info", format: "json", enableCorrelationId: true }
 * };
 * ```
 */
export interface AppConfig {
  /** Database connection and pool configuration */
  readonly database: DatabaseConfig;
  /** Authentication and JWT configuration */
  readonly auth: AuthConfig;
  /** HTTP server and CORS configuration */
  readonly server: ServerConfig;
  /** Application logging configuration */
  readonly logging: LoggingConfig;
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

/**
 * Effect.ts service context tag for application configuration dependency injection.
 * Use this tag to access application configuration in Effect computations.
 * 
 * @example
 * ```typescript
 * // Access configuration in an Effect
 * const useConfig = Effect.gen(function* (_) {
 *   const config = yield* _(AppConfigService);
 *   console.log(`Server running on port ${config.server.port}`);
 *   return config.database.url;
 * });
 * 
 * // Provide configuration to an Effect
 * const program = Effect.provide(
 *   useConfig,
 *   Layer.succeed(AppConfigService, myAppConfig)
 * );
 * ```
 */
export const AppConfigService = Context.GenericTag<AppConfig>("AppConfig");

// Auth error types
export const AuthErrorTypes = {
  InvalidToken: "InvalidToken",
  SessionExpired: "SessionExpired",
  UserNotFound: "UserNotFound",
  InvalidCredentials: "InvalidCredentials",
} as const;

export type AuthErrorType = keyof typeof AuthErrorTypes;
