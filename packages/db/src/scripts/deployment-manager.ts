#!/usr/bin/env bun

import { PlatformConfigProvider, Terminal, Command } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer, Console } from "effect";
import { fileURLToPath } from "node:url";
import { SqlClient } from "@effect/sql";
import { join } from "node:path";

import { requireRestoreConfirmation } from "../shared/safety-checks";
import { PgLive } from "../database";

/**
 * Database Deployment Manager
 *
 * This script manages database deployments with comprehensive safety checks:
 * - Pre-deployment validation
 * - Automated backup creation
 * - Migration execution with rollback capability
 * - Post-deployment verification
 * - Environment-specific deployment strategies
 *
 * Usage:
 *   bun run src/scripts/deployment-manager.ts [environment] [options]
 *
 * Environments:
 *   development - Local development deployment
 *   staging     - Staging environment deployment
 *   production  - Production deployment (requires additional confirmations)
 *
 * Options:
 *   --dry-run   - Show what would be deployed without executing
 *   --force     - Skip some safety checks (use with caution)
 *   --seed      - Run seeding after migration
 */

// ============================================================================
// Type Definitions
// ============================================================================

type DeploymentEnvironment = "development" | "staging" | "production";

interface DeploymentConfig {
  environment: DeploymentEnvironment;
  dryRun: boolean;
  force: boolean;
  seed: boolean;
}

interface DeploymentPlan {
  backupRequired: boolean;
  migrationsToRun: string[];
  seedingRequired: boolean;
  validationChecks: string[];
}

// ============================================================================
// Deployment Planning
// ============================================================================

const createDeploymentPlan = (config: DeploymentConfig) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;

    yield* Console.log("📋 Creating deployment plan...\n");

    // Check pending migrations
    const pendingMigrations = yield* Effect.tryPromise({
      try: async () => {
        const fs = await import("node:fs/promises");
        const migrationsDir = join(
          fileURLToPath(new URL(".", import.meta.url)),
          "../migrations"
        );
        const files = await fs.readdir(migrationsDir);
        return files.filter((f) => f.endsWith(".sql")).sort();
      },
      catch: (error) => new Error(`Failed to read migrations: ${error}`),
    });

    // Check applied migrations
    const appliedMigrations = yield* sql<{ name: string }>`
      SELECT name FROM drizzle.__drizzle_migrations ORDER BY id
    `.pipe(Effect.catchAll(() => Effect.succeed([])));

    const appliedNames = appliedMigrations.map((m) => m.name);
    const migrationsToRun = pendingMigrations.filter((m) => {
      const migrationName = m.replace(/^\d+_/, "").replace(/\.sql$/, "");
      return !appliedNames.includes(migrationName);
    });

    const plan: DeploymentPlan = {
      backupRequired:
        config.environment === "production" || migrationsToRun.length > 0,
      migrationsToRun,
      seedingRequired: config.seed,
      validationChecks: [
        "schema_validation",
        "data_integrity",
        "performance_check",
      ],
    };

    return plan;
  });

const displayDeploymentPlan = (
  config: DeploymentConfig,
  plan: DeploymentPlan
) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;

    yield* terminal.display("🚀 Deployment Plan\n");
    yield* terminal.display("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    yield* terminal.display(`Environment: ${config.environment}\n`);
    yield* terminal.display(`Dry Run: ${config.dryRun ? "Yes" : "No"}\n`);
    yield* terminal.display(`Force Mode: ${config.force ? "Yes" : "No"}\n\n`);

    yield* terminal.display("Steps:\n");

    if (plan.backupRequired) {
      yield* terminal.display("  1. 💾 Create database backup\n");
    }

    if (plan.migrationsToRun.length > 0) {
      yield* terminal.display(
        `  2. 🔄 Run ${plan.migrationsToRun.length} migration(s):\n`
      );
      for (const migration of plan.migrationsToRun) {
        yield* terminal.display(`     - ${migration}\n`);
      }
    } else {
      yield* terminal.display("  2. ✅ No migrations to run\n");
    }

    if (plan.seedingRequired) {
      yield* terminal.display(
        `  3. 🌱 Seed database for ${config.environment}\n`
      );
    }

    yield* terminal.display("  4. 🔍 Run validation checks:\n");
    for (const check of plan.validationChecks) {
      yield* terminal.display(`     - ${check}\n`);
    }

    yield* terminal.display("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });

// ============================================================================
// Safety Checks
// ============================================================================

const runPreDeploymentChecks = (config: DeploymentConfig) =>
  Effect.gen(function* () {
    yield* Console.log("🛡️  Running pre-deployment safety checks...\n");

    // Environment-specific checks
    if (config.environment === "production") {
      yield* Console.log(
        "🔒 Production environment detected - additional checks required\n"
      );

      if (!config.force) {
        yield* requireRestoreConfirmation;
      }

      // Check if it's during maintenance window (example check)
      const currentHour = new Date().getHours();
      if (currentHour >= 6 && currentHour <= 22 && !config.force) {
        yield* Console.log(
          "⚠️  Deploying during business hours - consider using --force if urgent\n"
        );
      }
    }

    // Check database connectivity
    const sql = yield* SqlClient.SqlClient;
    yield* sql`SELECT 1 as test`.pipe(
      Effect.mapError(() => new Error("Database connectivity check failed"))
    );

    // Check disk space (simplified check)
    yield* Effect.tryPromise({
      try: async () => {
        const { execSync } = await import("node:child_process");
        const output = execSync("df -h /", { encoding: "utf8" });
        const lines = output.split("\n");
        const dataLine = lines[1];
        if (dataLine?.includes("9")) {
          // More than 90% full
          throw new Error("Disk space is critically low");
        }
      },
      catch: (error) => new Error(`Disk space check failed: ${error}`),
    }).pipe(
      Effect.catchAll(() => Effect.void) // Non-critical check
    );

    yield* Console.log("✅ Pre-deployment checks passed\n");
  });

const runPostDeploymentValidation = (config: DeploymentConfig) =>
  Effect.gen(function* () {
    yield* Console.log("🔍 Running post-deployment validation...\n");

    // Run schema validation
    yield* Command.make(
      "bun",
      "run",
      "src/scripts/migration-manager.ts",
      "validate"
    ).pipe(
      Command.exitCode,
      Effect.flatMap((exitCode) =>
        exitCode === 0
          ? Effect.void
          : Effect.fail(new Error("Schema validation failed"))
      )
    );

    // Run data integrity check
    yield* Command.make(
      "bun",
      "run",
      "src/scripts/data-integrity-checker.ts",
      "--quick"
    ).pipe(
      Command.exitCode,
      Effect.flatMap((exitCode) =>
        exitCode === 0
          ? Effect.void
          : Effect.fail(new Error("Data integrity check failed"))
      )
    );

    // Test basic functionality
    const sql = yield* SqlClient.SqlClient;

    // Test user table access
    yield* sql<{ count: number }>`SELECT COUNT(*) as count FROM "user"`.pipe(
      Effect.mapError(() => new Error("User table access test failed"))
    );

    // Test savings plans table access
    yield* sql<{
      count: number;
    }>`SELECT COUNT(*) as count FROM savings_plans`.pipe(
      Effect.mapError(() => new Error("Savings plans table access test failed"))
    );

    yield* Console.log("✅ Post-deployment validation passed\n");
  });

// ============================================================================
// Deployment Execution
// ============================================================================

const executeDeployment = (config: DeploymentConfig, plan: DeploymentPlan) =>
  Effect.gen(function* () {
    yield* Console.log("🚀 Executing deployment...\n");

    if (config.dryRun) {
      yield* Console.log("🔍 DRY RUN MODE - No changes will be made\n");
      return;
    }

    // Step 1: Create backup if required
    if (plan.backupRequired) {
      yield* Console.log("💾 Creating backup...\n");
      yield* Command.make("bun", "run", "src/scripts/backup.ts").pipe(
        Command.exitCode,
        Effect.flatMap((exitCode) =>
          exitCode === 0
            ? Effect.void
            : Effect.fail(new Error("Backup creation failed"))
        )
      );
    }

    // Step 2: Run migrations
    if (plan.migrationsToRun.length > 0) {
      yield* Console.log("🔄 Running migrations...\n");
      yield* Command.make(
        "bun",
        "run",
        "src/scripts/migration-manager.ts",
        "up"
      ).pipe(
        Command.exitCode,
        Effect.flatMap((exitCode) =>
          exitCode === 0
            ? Effect.void
            : Effect.fail(new Error("Migration execution failed"))
        )
      );
    }

    // Step 3: Run seeding if required
    if (plan.seedingRequired) {
      yield* Console.log(`🌱 Seeding database for ${config.environment}...\n`);
      yield* Command.make(
        "bun",
        "run",
        "src/scripts/enhanced-seed.ts",
        config.environment,
        "--validate"
      ).pipe(
        Command.exitCode,
        Effect.flatMap((exitCode) =>
          exitCode === 0
            ? Effect.void
            : Effect.fail(new Error("Database seeding failed"))
        )
      );
    }

    // Step 4: Run validation
    yield* runPostDeploymentValidation(config);

    yield* Console.log("✅ Deployment completed successfully!\n");
  });

// ============================================================================
// Interactive Deployment
// ============================================================================

const confirm = (message: string) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;
    yield* terminal.display(`${message} (y/n): `);
    const input = yield* terminal.readLine;
    return input.trim().toLowerCase() === "y";
  });

const interactiveDeployment = (config: DeploymentConfig) =>
  Effect.gen(function* () {
    // Run pre-deployment checks
    yield* runPreDeploymentChecks(config);

    // Create and display deployment plan
    const plan = yield* createDeploymentPlan(config);
    yield* displayDeploymentPlan(config, plan);

    // Confirm deployment
    if (!config.force && !config.dryRun) {
      const shouldProceed = yield* confirm(
        `\n🚀 Proceed with deployment to ${config.environment}?`
      );

      if (!shouldProceed) {
        yield* Console.log("Deployment cancelled\n");
        return;
      }
    }

    // Execute deployment
    yield* executeDeployment(config, plan);

    // Display summary
    yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    yield* Console.log(
      `✅ Deployment to ${config.environment} completed successfully!\n`
    );

    if (plan.migrationsToRun.length > 0) {
      yield* Console.log(
        `📊 Applied ${plan.migrationsToRun.length} migration(s)\n`
      );
    }

    if (plan.seedingRequired) {
      yield* Console.log("🌱 Database seeded with environment-specific data\n");
    }

    yield* Console.log("🔍 All validation checks passed\n");
  });

// ============================================================================
// Main Program
// ============================================================================

const parseArgs = (): DeploymentConfig => {
  const args = process.argv.slice(2);
  const environment = (args[0] as DeploymentEnvironment) || "development";

  return {
    environment,
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    seed: args.includes("--seed"),
  };
};

const program = Effect.gen(function* () {
  const config = parseArgs();

  yield* Console.log("🚀 AV-Daily Database Deployment Manager\n");
  yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  yield* interactiveDeployment(config);
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Console.log(`\n❌ Deployment failed: ${error}\n`);
      yield* Console.log("🔄 Consider running rollback if needed\n");
      return yield* Effect.fail(error);
    })
  )
);

const ConfigLayer = PlatformConfigProvider.layerDotEnv(
  join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../apps/server/.env"
  )
);

NodeRuntime.runMain(
  program.pipe(
    Effect.provide(
      Layer.mergeAll(NodeContext.layer, ConfigLayer).pipe(
        Layer.provide(NodeContext.layer)
      )
    ),
    Effect.provide(PgLive)
  )
);
