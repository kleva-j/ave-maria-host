/**
 * @fileoverview Environment Configuration
 *
 * This module defines all environment configuration using Effect's Config system.
 * It provides type-safe configuration management with validation and defaults.
 *
 * ## Key Features:
 * - **Type-Safe Configuration**: Compile-time and runtime type validation
 * - **Redacted Secrets**: Sensitive values are automatically redacted in logs
 * - **Environment-Specific Configs**: Different configurations for dev/prod/test
 * - **Validation**: Automatic validation with clear error messages
 *
 * ## Quick Start:
 * ```typescript
 * import { AppConfigEffect, DatabaseUrlConfig } from "./effects/config";
 *
 * // Load all configuration
 * const config = yield* _(AppConfigEffect);
 *
 * // Load specific config value
 * const dbUrl = yield* _(DatabaseUrlConfig);
 * ```
 */

import type { AppConfig, LoggingConfig } from "@host/api";

import { LOG_LEVELS, LOG_FORMATS } from "@host/api";
import { Config, Effect, Redacted } from "effect";

// Define basic types
export type LogFormat = LoggingConfig["format"];
export type LogLevel = LoggingConfig["level"];

/**
 * Database configuration
 */
export const DatabaseUrlConfig = Config.redacted(
  Config.string("DATABASE_URL")
).pipe(Config.withDefault(Redacted.make("postgresql://localhost:5432/host")));

export const DbMaxConnectionsConfig = Config.integer("DB_MAX_CONNECTIONS").pipe(
  Config.withDefault(10)
);

export const DbConnectionTimeoutConfig = Config.integer(
  "DB_CONNECTION_TIMEOUT"
).pipe(Config.withDefault(5000));

/**
 * Authentication configuration
 */
export const JwtSecretConfig = Config.redacted(
  Config.string("JWT_SECRET")
).pipe(
  Config.withDefault(Redacted.make("your-secret-key-change-in-production"))
);

export const SessionTimeoutConfig = Config.integer("SESSION_TIMEOUT").pipe(
  Config.withDefault(3600) // 1 hour
);

export const RefreshTokenExpiryConfig = Config.integer(
  "REFRESH_TOKEN_EXPIRY"
).pipe(
  Config.withDefault(604800) // 7 days
);

/**
 * Server configuration
 */
export const PortConfig = Config.integer("PORT").pipe(Config.withDefault(3001));

export const HostConfig = Config.string("HOST").pipe(
  Config.withDefault("0.0.0.0")
);

export const CorsOriginsConfig = Config.string("CORS_ORIGINS").pipe(
  Config.withDefault("http://localhost:3000"),
  Config.map((origins) => origins.split(","))
);

export const CorsCredentialsConfig = Config.boolean("CORS_CREDENTIALS").pipe(
  Config.withDefault(false)
);

/**
 * Logging configuration
 */
export const LogLevelConfig = Config.string("LOG_LEVEL").pipe(
  Config.withDefault(LOG_LEVELS.info),
  Config.map((level) => level as LogLevel)
);

export const LogFormatConfig = Config.string("LOG_FORMAT").pipe(
  Config.withDefault(LOG_FORMATS.pretty),
  Config.map((format) => format as LogFormat)
);

export const EnableCorrelationIdConfig = Config.boolean(
  "ENABLE_CORRELATION_ID"
).pipe(Config.withDefault(true));

/**
 * Version configuration
 */
export const VersionConfig = Config.string("VERSION").pipe(
  Config.withDefault("unknown")
);

/**
 * Combined configuration effect that loads all config values
 */
export const AppConfigEffect = Effect.gen(function* (_) {
  const databaseUrl = Redacted.value(yield* _(DatabaseUrlConfig));
  const jwtSecret = Redacted.value(yield* _(JwtSecretConfig));

  const enableCorrelationId = yield* _(EnableCorrelationIdConfig);
  const refreshTokenExpiry = yield* _(RefreshTokenExpiryConfig);
  const connectionTimeout = yield* _(DbConnectionTimeoutConfig);
  const corsCredentials = yield* _(CorsCredentialsConfig);
  const maxConnections = yield* _(DbMaxConnectionsConfig);
  const sessionTimeout = yield* _(SessionTimeoutConfig);
  const corsOrigins = yield* _(CorsOriginsConfig);
  const logFormat = yield* _(LogFormatConfig);
  const logLevel = yield* _(LogLevelConfig);
  const port = yield* _(PortConfig);
  const host = yield* _(HostConfig);

  return {
    logging: { level: logLevel, format: logFormat, enableCorrelationId },
    database: { url: databaseUrl, maxConnections, connectionTimeout },
    auth: { jwtSecret, sessionTimeout, refreshTokenExpiry },
    server: {
      port,
      host,
      cors: {
        origins: corsOrigins,
        credentials: corsCredentials,
      },
    },
  } satisfies AppConfig;
});

/**
 * Development-specific configuration with overrides
 */
export const DevAppConfigEffect = Effect.gen(function* (_) {
  const databaseUrl = yield* _(
    Config.redacted(Config.string("DATABASE_URL")).pipe(
      Config.withDefault(Redacted.make("postgresql://localhost:5432/host_dev"))
    )
  );
  const jwtSecret = Redacted.value(yield* _(JwtSecretConfig));
  const corsCredentials = yield* _(CorsCredentialsConfig);
  const corsOrigins = yield* _(CorsOriginsConfig);
  const port = yield* _(PortConfig);

  return {
    database: {
      url: Redacted.value(databaseUrl),
      maxConnections: 5, // Lower connection limit for development
      connectionTimeout: 10000, // Longer timeout for debugging
    },
    auth: {
      sessionTimeout: 86400, // 24 hours for development convenience
      refreshTokenExpiry: 604800, // 7 days
      jwtSecret,
    },
    server: {
      port,
      host: "localhost",
      cors: {
        origins: corsOrigins,
        credentials: corsCredentials,
      },
    },
    logging: {
      format: LOG_FORMATS.pretty as LogFormat,
      level: LOG_LEVELS.debug as LogLevel,
      enableCorrelationId: true,
    },
  } satisfies AppConfig;
});

/**
 * Production-specific configuration with validation
 */
export const ProdAppConfigEffect = Effect.gen(function* (_) {
  // Use required configs that will fail if not provided
  const databaseUrl = yield* _(Config.redacted(Config.string("DATABASE_URL")));
  const jwtSecret = yield* _(Config.redacted(Config.string("JWT_SECRET")));

  const corsOrigins = yield* _(
    Config.string("CORS_ORIGINS").pipe(
      Config.map((origins) => origins.split(","))
    )
  );

  const maxConnections = yield* _(
    Config.integer("DB_MAX_CONNECTIONS").pipe(Config.withDefault(20))
  );

  const connectionTimeout = yield* _(
    Config.integer("DB_CONNECTION_TIMEOUT").pipe(Config.withDefault(5000))
  );

  const sessionTimeout = yield* _(
    Config.integer("SESSION_TIMEOUT").pipe(Config.withDefault(3600))
  );

  const refreshTokenExpiry = yield* _(
    Config.integer("REFRESH_TOKEN_EXPIRY").pipe(Config.withDefault(604800))
  );

  const port = yield* _(Config.integer("PORT").pipe(Config.withDefault(3001)));
  const host = yield* _(
    Config.string("HOST").pipe(Config.withDefault("0.0.0.0"))
  );
  const corsCredentials = yield* _(
    Config.boolean("CORS_CREDENTIALS").pipe(Config.withDefault(false))
  );
  const logLevel = yield* _(
    Config.string("LOG_LEVEL").pipe(
      Config.withDefault("info"),
      Config.map((level) => level as LogLevel)
    )
  );

  return {
    database: {
      url: Redacted.value(databaseUrl),
      connectionTimeout,
      maxConnections,
    },
    auth: {
      jwtSecret: Redacted.value(jwtSecret),
      refreshTokenExpiry,
      sessionTimeout,
    },
    server: {
      port,
      host,
      cors: {
        credentials: corsCredentials,
        origins: corsOrigins,
      },
    },
    logging: {
      level: logLevel,
      format: LOG_FORMATS.json, // Always use JSON in production
      enableCorrelationId: true,
    },
  } satisfies AppConfig;
});

/**
 * Test-specific configuration with minimal setup
 */
export const TestAppConfigEffect = Effect.succeed({
  database: {
    url: "postgresql://localhost:5432/test_db",
    maxConnections: 2, // Minimal connections for tests
    connectionTimeout: 1000, // Short timeout for tests
  },
  auth: {
    jwtSecret: "test-secret-key",
    sessionTimeout: 300, // 5 minutes for tests
    refreshTokenExpiry: 3600, // 1 hour for tests
  },
  server: {
    port: 0, // Let the system assign a port for tests
    host: "localhost",
    cors: {
      origins: ["http://localhost:3000"],
      credentials: false,
    },
  },
  logging: {
    level: "error" as LogLevel, // Minimal logging in tests
    format: "pretty" as LogFormat,
    enableCorrelationId: false,
  },
} satisfies AppConfig);
