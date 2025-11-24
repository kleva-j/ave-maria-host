import {
  type DatabaseConfig,
  decodePostgresUrl,
} from "../config/postgres-url-schema";

import { PlatformConfigProvider, FileSystem, Command } from "@effect/platform";
import { Config, Effect, Layer, Redacted, Console, pipe } from "effect";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import {
  requireRestoreConfirmation as checkRestoreConfirmation,
  blockProductionRestore as checkRestoreAllowProduction,
} from "../shared/safety-checks";

/**
 * Database Restore Script
 *
 * This script restores a PostgreSQL database from a backup file.
 *
 * Usage:
 *   bun run src/scripts/restore.ts <backup-file>
 *   bun run src/scripts/restore.ts ./backups/avdaily_backup_2024-01-01_12-00-00.sql.gz
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   DB_RESTORE_CONFIRM - Must be set to "1" to proceed
 *   DB_RESTORE_ALLOW_PRODUCTION - Must be set to "1" to restore in production
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface RestoreConfig {
  databaseUrl: string;
  backupFile: string;
}

// ============================================================================
// Restore Operations
// ============================================================================

const checkBackupFile = (filePath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    return pipe(
      Console.log(`\n📁 Checking backup file: ${filePath}\n`),
      Effect.flatMap(() => fs.exists(filePath)),
      Effect.flatMap((exists) =>
        exists
          ? Console.log("✓ Backup file exists\n")
          : Effect.fail(new Error(`Backup file not found: ${filePath}`))
      ),
      Effect.map(() => filePath)
    );
  });

const decompressBackup = (filePath: string) =>
  Effect.gen(function* () {
    yield* Console.log("\n📦 Decompressing backup...\n");

    const file = filePath.replace(/\.gz$/, "");

    yield* Command.exitCode(
      Command.make("sh", ...["-c", `gunzip -c "${filePath}" > "${file}"`])
    ).pipe(
      Effect.flatMap((exitCode) =>
        exitCode === 0
          ? Effect.void
          : Effect.fail(new Error(`gunzip failed with exit code ${exitCode}`))
      ),
      Effect.mapError((error) => new Error(`Decompression failed: ${error}`))
    );

    yield* Console.log("✓ Backup decompressed\n");
    return file;
  });

const restoreDatabaseFromFile = (
  config: RestoreConfig,
  dbConfig: DatabaseConfig
) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    yield* Console.log(`\n🔄 Restoring database from: ${config.backupFile}\n`);
    yield* Console.log(
      "⚠️  WARNING: This will replace all data in the database!\n"
    );

    // Decompress if needed
    const backupFile = !config.backupFile.endsWith(".gz")
      ? config.backupFile
      : yield* decompressBackup(config.backupFile);

    yield* Console.log("\n📥 Restoring database...\n");

    const args: string[] = [
      "-c",
      `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} < "${backupFile}"`,
    ];

    // Restore using psql with stdin redirection
    yield* Command.make("sh", ...args).pipe(
      Command.env({ PGPASSWORD: dbConfig.password }),
      Command.exitCode,
      Effect.flatMap((exitCode) =>
        exitCode === 0
          ? Effect.void
          : Effect.fail(new Error(`psql failed with exit code ${exitCode}`))
      ),
      Effect.mapError((error) => new Error(`Restore failed: ${error}`))
    );

    yield* Console.log("✓ Database restored successfully\n");

    // Clean up decompressed file if it was created
    if (backupFile !== config.backupFile) {
      yield* fs.remove(backupFile).pipe(Effect.catchAll(() => Effect.void));
    }
  });

// ============================================================================
// Main Restore Program
// ============================================================================

const restoreDatabaseBackup = (config: RestoreConfig) =>
  Effect.gen(function* () {
    yield* Console.log("🔄 Starting database restore...\n");
    yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Safety checks
    yield* checkRestoreConfirmation;
    yield* checkRestoreAllowProduction;

    // Check if backup file exists
    yield* checkBackupFile(config.backupFile);

    // Restore database
    yield* restoreDatabaseFromFile(
      config,
      decodePostgresUrl(config.databaseUrl)
    );

    // Display summary
    yield* Console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    yield* Console.log("✅ Restore completed successfully!\n");
    yield* Console.log("\n");
    yield* Console.log("The database has been restored from the backup.\n");
    yield* Console.log(
      "You may want to run migrations to ensure schema is up to date:\n"
    );
    yield* Console.log("  bun run src/scripts/migrator.ts\n");
  });

// ============================================================================
// Error Handling & Script Entry Point
// ============================================================================

const program = pipe(
  Effect.gen(function* () {
    const config = {
      databaseUrl: Redacted.value(
        yield* Config.redacted(Config.string("DATABASE_URL")).pipe(
          Config.withDefault(Redacted.make(""))
        )
      ),
      backupFile: process.argv[2],
    };

    if (!config.backupFile) {
      yield* Console.log("❌ No backup file specified\n");
      yield* Console.log(
        "Usage: bun run src/scripts/restore.ts <backup-file>\n"
      );
      yield* Console.log(
        "Example: bun run src/scripts/restore.ts ./backups/avdaily_backup_2024-01-01_12-00-00.sql.gz\n"
      );
      return yield* Effect.fail(new Error("No backup file specified"));
    }

    yield* restoreDatabaseBackup(config as RestoreConfig);
  }),
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Console.log("\n❌ Restore failed!\n");
      yield* Console.log(`Error: ${error}\n`);
      return yield* Effect.fail(error);
    })
  )
);

const ConfigLayer = PlatformConfigProvider.layerDotEnv(
  join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../apps/server/.env"
  )
);

NodeRuntime.runMain(
  program.pipe(
    Effect.provide(
      Layer.mergeAll(NodeContext.layer, ConfigLayer).pipe(
        Layer.provide(NodeContext.layer)
      )
    )
  )
);
