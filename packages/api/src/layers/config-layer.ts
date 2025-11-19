/**
 * @fileoverview Environment Configuration
 *
 * This module defines all environment configuration using Effect's Config system.
 * It provides type-safe configuration management with validation and defaults.
 */

import type { LogFormat, LogLevel } from "../effects/core";
import type { AppConfig } from "./main-layer";

import { LOG_LEVELS, LOG_FORMATS } from "../effects/core";

import { Config, Effect, Redacted } from "effect";

// =============================================================================
// Config Components
// =============================================================================

const unwrapRedacted = (config: Config.Config<Redacted.Redacted>) =>
  config.pipe(Config.map(Redacted.value));

const makeDatabaseConfig = (defaultUrl?: string) =>
  Config.all({
    url: unwrapRedacted(
      Config.redacted(Config.string("DATABASE_URL")).pipe(
        defaultUrl ? Config.withDefault(Redacted.make(defaultUrl)) : (c) => c
      )
    ),
    maxConnections: Config.integer("DB_MAX_CONNECTIONS").pipe(
      Config.withDefault(10)
    ),
    connectionTimeout: Config.integer("DB_CONNECTION_TIMEOUT").pipe(
      Config.withDefault(5000)
    ),
  });

const makeAuthConfig = (defaults?: {
  sessionTimeout?: number;
  refreshTokenExpiry?: number;
}) =>
  Config.all({
    jwtSecret: unwrapRedacted(
      Config.redacted(Config.string("JWT_SECRET")).pipe(
        Config.withDefault(
          Redacted.make("your-secret-key-change-in-production")
        )
      )
    ),
    sessionTimeout: Config.integer("SESSION_TIMEOUT").pipe(
      Config.withDefault(defaults?.sessionTimeout ?? 3600)
    ),
    refreshTokenExpiry: Config.integer("REFRESH_TOKEN_EXPIRY").pipe(
      Config.withDefault(defaults?.refreshTokenExpiry ?? 604800)
    ),
  });

const makeServerConfig = (defaults?: {
  port?: number;
  host?: string;
  environment?: "production" | "development" | "test";
}) =>
  Config.all({
    port: Config.integer("PORT").pipe(
      Config.withDefault(defaults?.port ?? 3001)
    ),
    host: Config.string("HOST").pipe(
      Config.withDefault(defaults?.host ?? "0.0.0.0")
    ),
    cors: Config.all({
      origins: Config.string("CORS_ORIGINS").pipe(
        Config.withDefault("http://localhost:3000"),
        Config.map((origins) => origins.split(","))
      ),
      credentials: Config.boolean("CORS_CREDENTIALS").pipe(
        Config.withDefault(false)
      ),
    }),
    environment: Config.string("NODE_ENV").pipe(
      Config.withDefault(defaults?.environment ?? "development"),
      Config.map((env) => env as "production" | "development" | "test")
    ),
    version: Config.string("VERSION").pipe(Config.withDefault("unknown")),
  });

const makeLoggingConfig = (defaults?: {
  level?: LogLevel;
  format?: LogFormat;
  enableCorrelationId?: boolean;
}) =>
  Config.all({
    level: Config.string("LOG_LEVEL").pipe(
      Config.withDefault(defaults?.level ?? LOG_LEVELS.info),
      Config.map((level) => level as LogLevel)
    ),
    format: Config.string("LOG_FORMAT").pipe(
      Config.withDefault(defaults?.format ?? LOG_FORMATS.pretty),
      Config.map((format) => format as LogFormat)
    ),
    enableCorrelationId: Config.boolean("ENABLE_CORRELATION_ID").pipe(
      Config.withDefault(defaults?.enableCorrelationId ?? true)
    ),
  });

const PaymentConfig = Config.all({
  paystackSecretKey: unwrapRedacted(
    Config.redacted(Config.string("PAYSTACK_SECRET_KEY")).pipe(
      Config.withDefault(Redacted.make(""))
    )
  ),
  flutterwaveSecretKey: unwrapRedacted(
    Config.redacted(Config.string("FLUTTERWAVE_SECRET_KEY")).pipe(
      Config.withDefault(Redacted.make(""))
    )
  ),
});

const RedisConfig = Config.all({
  url: unwrapRedacted(
    Config.redacted(Config.string("REDIS_URL")).pipe(
      Config.withDefault(Redacted.make("redis://localhost:6379"))
    )
  ),
});

// =============================================================================
// App Configs
// =============================================================================

/**
 * Combined configuration effect that loads all config values
 */
export const AppConfigEffect = Config.all({
  database: makeDatabaseConfig("postgresql://localhost:5432/host"),
  auth: makeAuthConfig(),
  server: makeServerConfig(),
  logging: makeLoggingConfig(),
  payment: PaymentConfig,
  redis: RedisConfig,
});

/**
 * Development-specific configuration with overrides
 */
export const DevAppConfigEffect = Config.all({
  database: Config.all({
    url: unwrapRedacted(
      Config.redacted(Config.string("DATABASE_URL")).pipe(
        Config.withDefault(
          Redacted.make("postgresql://localhost:5432/host_dev")
        )
      )
    ),
    // Dev specific overrides
    maxConnections: Config.succeed(5),
    connectionTimeout: Config.succeed(10000),
  }),
  auth: makeAuthConfig({
    sessionTimeout: 86400,
    refreshTokenExpiry: 604800,
  }),
  server: Config.all({
    port: Config.integer("PORT").pipe(Config.withDefault(3001)),
    host: Config.succeed("localhost"),
    cors: Config.all({
      origins: Config.string("CORS_ORIGINS").pipe(
        Config.withDefault("http://localhost:3000"),
        Config.map((origins) => origins.split(","))
      ),
      credentials: Config.boolean("CORS_CREDENTIALS").pipe(
        Config.withDefault(false)
      ),
    }),
    environment: Config.succeed("development" as const),
    version: Config.succeed("1.0.0"),
  }),
  logging: Config.succeed({
    format: LOG_FORMATS.pretty as LogFormat,
    level: LOG_LEVELS.debug as LogLevel,
    enableCorrelationId: true,
  }),
  payment: PaymentConfig,
  redis: RedisConfig,
});

/**
 * Production-specific configuration with validation
 */
export const ProdAppConfigEffect = Config.all({
  database: makeDatabaseConfig(), // No default URL, required
  auth: makeAuthConfig(),
  server: Config.all({
    port: Config.integer("PORT").pipe(Config.withDefault(3001)),
    host: Config.string("HOST").pipe(Config.withDefault("0.0.0.0")),
    cors: Config.all({
      origins: Config.string("CORS_ORIGINS").pipe(
        Config.withDefault("http://localhost:3000"),
        Config.map((origins) => origins.split(","))
      ),
      credentials: Config.boolean("CORS_CREDENTIALS").pipe(
        Config.withDefault(false)
      ),
    }),
    environment: Config.succeed("production" as const),
    version: Config.succeed("1.0.0"),
  }),
  logging: makeLoggingConfig({
    format: LOG_FORMATS.json,
    enableCorrelationId: true,
  }),
  payment: PaymentConfig,
  redis: RedisConfig,
});

/**
 * Test-specific configuration with minimal setup
 */
export const TestAppConfigEffect = Effect.succeed({
  database: {
    url: "postgresql://localhost:5432/test_db",
    maxConnections: 2,
    connectionTimeout: 1000,
  },
  auth: {
    jwtSecret: "test-secret-key",
    sessionTimeout: 300,
    refreshTokenExpiry: 3600,
  },
  server: {
    port: 0,
    host: "localhost",
    cors: { origins: ["http://localhost:3000"], credentials: false },
    environment: "test",
    version: "1.0.0",
  },
  payment: { paystackSecretKey: "", flutterwaveSecretKey: "" },
  redis: { url: "" },
  logging: {
    level: LOG_LEVELS.error,
    format: LOG_FORMATS.pretty,
    enableCorrelationId: false,
  },
} satisfies AppConfig);
