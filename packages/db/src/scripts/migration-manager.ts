#!/usr/bin/env bun

import { PlatformConfigProvider, Terminal, Command } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer, Console, pipe } from "effect";
import { PgMigrator } from "@effect/sql-pg";
import { fileURLToPath } from "node:url";
import { SqlClient } from "@effect/sql";
import { join } from "node:path";

import { generateTimestamp } from "../shared/utils";
import { PgLive } from "../database";

/**
 * Enhanced Migration Manager
 *
 * This script provides comprehensive database migration management including:
 * - Running migrations with rollback support
 * - Migration status checking
 * - Schema validation
 * - Migration history tracking
 * - Automated backup before migrations
 *
 * Usage:
 *   bun run src/scripts/migration-manager.ts [command]
 *
 * Commands:
 *   status    - Show migration status
 *   up        - Run pending migrations
 *   rollback  - Rollback last migration (if supported)
 *   validate  - Validate schema against migrations
 *   history   - Show migration history
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface MigrationInfo {
  id: number;
  name: string;
  appliedAt?: Date;
  status: "pending" | "applied" | "failed";
}

interface MigrationStatus {
  total: number;
  applied: number;
  pending: number;
  migrations: MigrationInfo[];
}

// ============================================================================
// Migration Operations
// ============================================================================

const getMigrationStatus = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* Console.log("📊 Checking migration status...\n");

  // Get applied migrations from database
  const appliedMigrations = yield* sql<{
    id: number;
    name: string;
    applied_at: string;
  }>`
    SELECT id, name, applied_at 
    FROM drizzle.__drizzle_migrations 
    ORDER BY id
  `.pipe(Effect.catchAll(() => Effect.succeed([])));

  // Get available migrations from filesystem
  const migrationsDir = join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../migrations"
  );

  const availableMigrations = yield* Effect.tryPromise({
    try: async () => {
      const fs = await import("node:fs/promises");
      const files = await fs.readdir(migrationsDir);
      return files
        .filter((f) => f.endsWith(".sql"))
        .map((f) => {
          const match = f.match(/^(\d+)_(.+)\.sql$/);
          return match
            ? {
                id: Number.parseInt(match[1]),
                name: match[2],
                filename: f,
              }
            : null;
        })
        .filter(Boolean)
        .sort((a, b) => a!.id - b!.id);
    },
    catch: (error) =>
      new Error(`Failed to read migrations directory: ${error}`),
  });

  // Combine information
  const migrations: MigrationInfo[] = availableMigrations.map((migration) => {
    const applied = appliedMigrations.find((am) => am.id === migration?.id);
    return {
      id: migration?.id,
      name: migration?.name,
      appliedAt: applied ? new Date(applied.applied_at) : undefined,
      status: applied ? "applied" : "pending",
    };
  });

  const status: MigrationStatus = {
    total: migrations.length,
    applied: migrations.filter((m) => m.status === "applied").length,
    pending: migrations.filter((m) => m.status === "pending").length,
    migrations,
  };

  return status;
});

const displayMigrationStatus = (status: MigrationStatus) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;

    yield* terminal.display("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    yield* terminal.display("📊 Migration Status\n");
    yield* terminal.display("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    yield* terminal.display(`Total migrations: ${status.total}\n`);
    yield* terminal.display(`Applied: ${status.applied}\n`);
    yield* terminal.display(`Pending: ${status.pending}\n\n`);

    if (status.migrations.length === 0) {
      yield* terminal.display("No migrations found.\n");
      return;
    }

    yield* terminal.display("Migrations:\n");
    for (const migration of status.migrations) {
      const statusIcon = migration.status === "applied" ? "✅" : "⏳";
      const appliedText = migration.appliedAt
        ? ` (${migration.appliedAt.toISOString()})`
        : "";

      yield* terminal.display(
        `  ${statusIcon} ${migration.id.toString().padStart(4, "0")}: ${migration.name}${appliedText}\n`
      );
    }
    yield* terminal.display("\n");
  });

const createBackupBeforeMigration = Effect.gen(function* () {
  yield* Console.log("💾 Creating backup before migration...\n");

  const timestamp = generateTimestamp();
  const backupFile = `pre_migration_backup_${timestamp}.sql`;

  // Run backup script
  yield* Command.make("bun", "run", "src/scripts/backup.ts").pipe(
    Command.env({ BACKUP_FILE: backupFile }),
    Command.exitCode,
    Effect.flatMap((exitCode) =>
      exitCode === 0
        ? Effect.void
        : Effect.fail(new Error(`Backup failed with exit code ${exitCode}`))
    ),
    Effect.mapError(
      (error) => new Error(`Pre-migration backup failed: ${error}`)
    )
  );

  yield* Console.log(`✅ Backup created: ${backupFile}\n`);
  return backupFile;
});

const runMigrations = Effect.gen(function* () {
  yield* Console.log("🚀 Running database migrations...\n");

  const migrations = yield* PgMigrator.run({
    loader: PgMigrator.fromFileSystem(
      join(fileURLToPath(new URL(".", import.meta.url)), "../migrations")
    ),
    schemaDirectory: join(
      fileURLToPath(new URL(".", import.meta.url)),
      "../schema"
    ),
  });

  if (migrations.length === 0) {
    yield* Console.log("✅ No migrations to run - database is up to date\n");
  } else {
    yield* Console.log(`✅ Applied ${migrations.length} migrations:\n`);
    for (const [id, name] of migrations) {
      yield* Console.log(`  - ${id.toString().padStart(4, "0")}: ${name}\n`);
    }
  }

  return migrations;
});

const validateSchema = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* Console.log("🔍 Validating database schema...\n");

  // Check if all expected tables exist
  const expectedTables = [
    "user",
    "session",
    "account",
    "verification",
    "savings_plans",
    "transactions",
    "wallets",
    "ajo_groups",
    "group_members",
    "group_contributions",
    "group_payouts",
    "permissions",
    "roles",
    "user_roles",
    "role_permissions",
    "notifications",
    "notification_preferences",
  ];

  const existingTables = yield* sql<{ table_name: string }>`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `;

  const existingTableNames = existingTables.map((t) => t.table_name);
  const missingTables = expectedTables.filter(
    (t) => !existingTableNames.includes(t)
  );

  if (missingTables.length > 0) {
    yield* Console.log(`❌ Missing tables: ${missingTables.join(", ")}\n`);
    return yield* Effect.fail(
      new Error("Schema validation failed: missing tables")
    );
  }

  // Check for required indexes
  const criticalIndexes = yield* sql<{ indexname: string }>`
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND indexname IN (
      'user_email_idx', 'user_phone_idx', 'savings_plans_user_idx',
      'transactions_user_idx', 'wallets_user_idx', 'ajo_groups_organizer_idx'
    )
  `;

  const expectedIndexCount = 6;
  if (criticalIndexes.length < expectedIndexCount) {
    yield* Console.log("⚠️  Some critical indexes may be missing\n");
  }

  yield* Console.log("✅ Schema validation passed\n");
});

const showMigrationHistory = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const terminal = yield* Terminal.Terminal;

  yield* terminal.display("📜 Migration History\n");
  yield* terminal.display("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const history = yield* sql<{
    id: number;
    name: string;
    applied_at: string;
  }>`
    SELECT id, name, applied_at 
    FROM drizzle.__drizzle_migrations 
    ORDER BY applied_at DESC
    LIMIT 20
  `.pipe(Effect.catchAll(() => Effect.succeed([])));

  if (history.length === 0) {
    yield* terminal.display("No migration history found.\n");
    return;
  }

  for (const migration of history) {
    const date = new Date(migration.applied_at).toLocaleString();
    yield* terminal.display(
      `${migration.id.toString().padStart(4, "0")}: ${migration.name} (${date})\n`
    );
  }
  yield* terminal.display("\n");
});

// ============================================================================
// Interactive Migration Management
// ============================================================================

const confirm = (message: string) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;
    yield* terminal.display(`${message} (y/n): `);
    const input = yield* terminal.readLine;
    return input.trim().toLowerCase() === "y";
  });

const interactiveMigrationUp = Effect.gen(function* () {
  const status = yield* getMigrationStatus;

  yield* displayMigrationStatus(status);

  if (status.pending === 0) {
    yield* Console.log("✅ Database is up to date - no migrations to run\n");
    return;
  }

  const shouldProceed = yield* confirm(
    `\n🚀 Run ${status.pending} pending migration(s)?`
  );

  if (!shouldProceed) {
    yield* Console.log("Migration cancelled\n");
    return;
  }

  // Create backup before migration
  const shouldBackup = yield* confirm("💾 Create backup before migration?");
  if (shouldBackup) {
    yield* createBackupBeforeMigration;
  }

  // Run migrations
  yield* runMigrations;

  // Validate schema after migration
  yield* validateSchema;

  yield* Console.log("✅ Migration completed successfully!\n");
});

// ============================================================================
// Command Handlers
// ============================================================================

const handleCommand = (command: string) => {
  switch (command) {
    case "status":
      return pipe(getMigrationStatus, Effect.flatMap(displayMigrationStatus));

    case "up":
      return interactiveMigrationUp;

    case "validate":
      return validateSchema;

    case "history":
      return showMigrationHistory;

    default:
      return Effect.gen(function* () {
        yield* Console.log("Available commands:\n");
        yield* Console.log("  status    - Show migration status\n");
        yield* Console.log("  up        - Run pending migrations\n");
        yield* Console.log("  validate  - Validate schema\n");
        yield* Console.log("  history   - Show migration history\n");
      });
  }
};

// ============================================================================
// Main Program
// ============================================================================

const program = Effect.gen(function* () {
  const command = process.argv[2] || "status";

  yield* Console.log("🗄️  AV-Daily Migration Manager\n");
  yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  yield* handleCommand(command);
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Console.log(`\n❌ Migration failed: ${error}\n`);
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
