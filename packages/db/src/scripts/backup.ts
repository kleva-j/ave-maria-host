#!/usr/bin/env bun

import {
  type DatabaseConfig,
  decodePostgresUrl,
} from "../config/postgres-url-schema";

import { PlatformConfigProvider, FileSystem, Command } from "@effect/platform";
import { Config, Effect, Layer, Redacted, Console } from "effect";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { generateTimestamp } from "../shared/utils";

/**
 * Database Backup Script
 *
 * This script creates a backup of the PostgreSQL database using pg_dump.
 * Backups are stored in the backups/ directory with timestamps.
 *
 * Usage:
 *   bun run src/scripts/backup.ts
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   BACKUP_DIR - Optional custom backup directory (default: ./backups)
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface BackupConfig {
  databaseUrl: string;
  backupDir: string;
  timestamp: string;
}

export const PROJECT_ROOT = Effect.sync(() =>
  join(dirname(fileURLToPath(import.meta.url)), "../../")
);

// ============================================================================
// Backup Operations
// ============================================================================

const ensureBackupDirectory = (backupDir: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    yield* Console.log(`📁 Ensuring backup directory exists: ${backupDir}\n`);

    yield* fs
      .exists(backupDir)
      .pipe(
        Effect.flatMap((exists) =>
          exists
            ? Console.log("✓ Backup directory exists\n")
            : fs
                .makeDirectory(backupDir, { recursive: true })
                .pipe(
                  Effect.zipRight(Console.log("✓ Created backup directory\n"))
                )
        )
      );
  });

const createBackupFile = (config: BackupConfig, dbConfig: DatabaseConfig) =>
  Effect.gen(function* () {
    const backupFileName = `avdaily_backup_${config.timestamp}.sql`;
    const backupFilePath = join(config.backupDir, backupFileName);

    yield* Console.log(`\n🔄 Creating backup: ${backupFileName}\n`);

    const args: string[] = [
      "-h", // Host
      dbConfig.host,
      "-p", // Port
      dbConfig.port,
      "-U", // Username
      dbConfig.username,
      "-d", // Database
      dbConfig.database,
      `--file=${backupFilePath}`,
      "--format=plain", // Format
      "--no-owner", // No owner
      "--no-acl", // No ACL
      "--clean", // Clean
      "--if-exists", // If exists
    ];

    yield* Console.log(`Executing "pg_dump" command...\n`);

    yield* Command.make("pg_dump", ...args).pipe(
      Command.env({ PGPASSWORD: dbConfig.password }),
      Command.exitCode,
      Effect.flatMap((exitCode) =>
        exitCode === 0
          ? Effect.void
          : Effect.fail(new Error(`pg_dump failed with exit code ${exitCode}`))
      ),
      Effect.mapError((error) => new Error(`Backup creation failed: ${error}`))
    );

    yield* Console.log("✓ Backup created successfully\n");

    return backupFilePath;
  });

const compressBackup = (backupFilePath: string) =>
  Effect.gen(function* () {
    yield* Console.log("\n📦 Compressing backup...\n");

    yield* Command.exitCode(Command.make("gzip", backupFilePath)).pipe(
      Effect.flatMap((exitCode) =>
        exitCode === 0
          ? Effect.void
          : Effect.fail(new Error(`gzip failed with exit code ${exitCode}`))
      ),
      Effect.mapError((error) => new Error(`Compression failed: ${error}`))
    );

    const compressedFile = `${backupFilePath}.gz`;

    yield* Console.log(`✓ Backup compressed: ${compressedFile}\n`);

    return compressedFile;
  });

const getFileSizeMB = (filePath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const info = yield* fs
      .stat(filePath)
      .pipe(Effect.catchAll(() => Effect.succeed({ size: 0 })));

    const sizeInBytes = "size" in info ? info.size : 0;
    const sizeInMB = (Number(sizeInBytes) / (1024 * 1024)).toFixed(2);

    return `${sizeInMB} MB`;
  });

// ============================================================================
// Main Backup Program
// ============================================================================

const program = Effect.gen(function* () {
  yield* Console.log("🗄️  Starting database backup...\n");
  yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const envConfig = yield* Config.all({
    DATABASE_URL: Config.redacted("DATABASE_URL"),
    BACKUP_DIR: Config.string("BACKUP_DIR").pipe(
      Config.withDefault("./backups")
    ),
  });

  const config: BackupConfig = {
    databaseUrl: Redacted.value(envConfig.DATABASE_URL),
    backupDir: join(yield* PROJECT_ROOT, envConfig.BACKUP_DIR),
    timestamp: generateTimestamp(),
  };

  const dbConfig = decodePostgresUrl(config.databaseUrl);

  yield* ensureBackupDirectory(config.backupDir); // Ensure backup directory exists
  const backupFile = yield* createBackupFile(config, dbConfig); // Create backup
  const compressedFile = yield* compressBackup(backupFile); // Compress backup
  const fileSize = yield* getFileSizeMB(compressedFile); // Get file size

  // Display summary
  yield* Console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  yield* Console.log("✅ Backup completed successfully!\n");
  yield* Console.log(`📁 File: ${compressedFile}\n`);
  yield* Console.log(`📊 Size: ${fileSize}\n`);
  yield* Console.log("\n");
  yield* Console.log("To restore this backup, run:\n");
  yield* Console.log(`  bun run src/scripts/restore.ts ${compressedFile}\n`);
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Console.log("\n❌ Backup failed!\n");
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
// program.pipe(Effect.provide([NodeContext.layer, NodeTerminal.layer]))
