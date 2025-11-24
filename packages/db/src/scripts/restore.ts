import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Config, Redacted } from "effect";
import { access } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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

interface RestoreConfig {
  databaseUrl: string;
  backupFile: string;
}

// Parse DATABASE_URL to extract connection details
const parseDatabaseUrl = (url: string) => {
  const urlObj = new URL(url);
  return {
    host: urlObj.hostname,
    port: urlObj.port || "5432",
    database: urlObj.pathname.slice(1),
    username: urlObj.username,
    password: urlObj.password,
  };
};

// Safety check to prevent accidental destructive operations
const checkRestoreConfirmation = () =>
  Effect.gen(function* () {
    const DB_RESTORE_CONFIRM = yield* Config.redacted("DB_RESTORE_CONFIRM");
    const restoreConfirmationValue = Redacted.value(DB_RESTORE_CONFIRM);

    if (restoreConfirmationValue !== "1") {
      yield* Effect.logError("❌ Database restore requires confirmation.");
      yield* Effect.logError(
        "Set DB_RESTORE_CONFIRM=1 environment variable to proceed."
      );
      yield* Effect.logError(
        "Example: DB_RESTORE_CONFIRM=1 bun run src/scripts/restore.ts <backup-file>"
      );

      return yield* Effect.die("Restore confirmation not provided");
    }
  });

const checkRestoreAllowProduction = () =>
  Effect.gen(function* () {
    const NODE_ENV = yield* Config.redacted("NODE_ENV");
    const DB_RESTORE_ALLOW_PRODUCTION = yield* Config.redacted(
      "DB_RESTORE_ALLOW_PRODUCTION"
    );
    const restoreAllowProductionValue = Redacted.value(
      DB_RESTORE_ALLOW_PRODUCTION
    );
    const nodeEnvValue = Redacted.value(NODE_ENV);

    if (restoreAllowProductionValue !== "1" && nodeEnvValue === "production") {
      yield* Effect.logError(
        "❌ Database restore is blocked in production environment."
      );
      yield* Effect.logError(
        "Set DB_RESTORE_ALLOW_PRODUCTION=1 if you really need to restore production data."
      );
      return yield* Effect.die("Production restore not allowed");
    }
  });

// Check if backup file exists
const checkBackupFile = (filePath: string) =>
  Effect.tryPromise({
    try: async () => {
      await access(filePath);
      return filePath;
    },
    catch: () => new Error(`Backup file not found: ${filePath}`),
  });

// Decompress backup if needed
const decompressBackup = (filePath: string) =>
  Effect.gen(function* () {
    if (filePath.endsWith(".gz")) {
      yield* Effect.log("Decompressing backup...");
      const decompressedFile = filePath.replace(/\.gz$/, "");

      yield* Effect.tryPromise({
        try: () => execAsync(`gunzip -c "${filePath}" > "${decompressedFile}"`),
        catch: (error) => new Error(`Decompression failed: ${error}`),
      });

      yield* Effect.log("✓ Backup decompressed");
      return decompressedFile;
    }

    return filePath;
  });

// Restore database from backup
const restoreDatabase = (config: RestoreConfig) =>
  Effect.gen(function* () {
    const dbConfig = parseDatabaseUrl(config.databaseUrl);

    yield* Effect.log(`Restoring database from: ${config.backupFile}`);
    yield* Effect.logWarning(
      "⚠️  WARNING: This will replace all data in the database!"
    );

    // Decompress if needed
    const backupFile = yield* decompressBackup(config.backupFile);

    // Set PGPASSWORD environment variable for psql
    const env = {
      ...process.env,
      PGPASSWORD: dbConfig.password,
    };

    // Restore using psql
    const restoreCommand = [
      "psql",
      `-h ${dbConfig.host}`,
      `-p ${dbConfig.port}`,
      `-U ${dbConfig.username}`,
      `-d ${dbConfig.database}`,
      `< "${backupFile}"`,
    ].join(" ");

    yield* Effect.log("Restoring database...");
    yield* Effect.tryPromise({
      try: () => execAsync(restoreCommand, { env, shell: "/bin/bash" }),
      catch: (error) => new Error(`Restore failed: ${error}`),
    });

    yield* Effect.log("✓ Database restored successfully");

    // Clean up decompressed file if it was created
    if (backupFile !== config.backupFile) {
      yield* Effect.tryPromise({
        try: () => execAsync(`rm "${backupFile}"`),
        catch: () => Effect.void,
      });
    }
  });

// Main restore program
const restoreDatabaseBackup = Effect.gen(function* () {
  yield* Effect.log("🔄 Starting database restore...");
  yield* Effect.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Safety checks
  yield* checkRestoreConfirmation();
  yield* checkRestoreAllowProduction();

  // Get backup file from command line arguments
  const backupFile = process.argv[2];

  if (!backupFile) {
    yield* Effect.logError("❌ No backup file specified");
    yield* Effect.logError("Usage: bun run src/scripts/restore.ts <backup-file>");
    yield* Effect.logError(
      "Example: bun run src/scripts/restore.ts ./backups/avdaily_backup_2024-01-01_12-00-00.sql.gz"
    );
    return yield* Effect.die("No backup file specified");
  }

  // Check if backup file exists
  yield* checkBackupFile(backupFile);

  // Get database URL
  const databaseUrl = yield* Config.redacted("DATABASE_URL");

  const config: RestoreConfig = {
    databaseUrl: Redacted.value(databaseUrl),
    backupFile,
  };

  // Restore database
  yield* restoreDatabase(config);

  yield* Effect.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  yield* Effect.log("✅ Restore completed successfully!");
  yield* Effect.log("");
  yield* Effect.log("The database has been restored from the backup.");
  yield* Effect.log("You may want to run migrations to ensure schema is up to date:");
  yield* Effect.log("  bun run src/scripts/migrator.ts");
});

// Run the restore script
NodeRuntime.runMain(
  restoreDatabaseBackup.pipe(Effect.provide(NodeContext.layer))
);
