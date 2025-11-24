import { NodeContext, NodeRuntime, NodeTerminal } from "@effect/platform-node";
import { Config, Effect, Layer, Redacted } from "effect";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  PlatformConfigProvider,
  FileSystem,
  Terminal,
  Command,
  Path,
} from "@effect/platform";

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

interface DatabaseConfig {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

// ============================================================================
// Configuration Parsing
// ============================================================================

const parseDatabaseUrl = (url: string): DatabaseConfig => {
  const urlObj = new URL(url);
  return {
    host: urlObj.hostname,
    port: urlObj.port || "5432",
    database: urlObj.pathname.slice(1),
    username: urlObj.username,
    password: urlObj.password,
  };
};

const generateTimestamp = (): string => {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .split("T")
    .join("_")
    .split(".")[0] as string;
};

// ============================================================================
// Backup Operations
// ============================================================================

const ensureBackupDirectory = (backupDir: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const terminal = yield* Terminal.Terminal;

    yield* terminal.display(
      `📁 Ensuring backup directory exists: ${backupDir}\n`
    );

    const exists = yield* fs.exists(backupDir);

    if (!exists) {
      yield* fs.makeDirectory(backupDir, { recursive: true });
      yield* terminal.display("✓ Created backup directory\n");
    } else {
      yield* terminal.display("✓ Backup directory exists\n");
    }
  });

const createBackupFile = (config: BackupConfig, dbConfig: DatabaseConfig) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const terminal = yield* Terminal.Terminal;

    const backupFileName = `avdaily_backup_${config.timestamp}.sql`;
    const backupFile = path.join(config.backupDir, backupFileName);

    yield* terminal.display(`\n🔄 Creating backup: ${backupFileName}\n`);

    const args: string[] = [
      "-h",
      dbConfig.host,
      "-p",
      dbConfig.port,
      "-U",
      dbConfig.username,
      "-d",
      dbConfig.database,
      `--file=${backupFile}`,
      "--format=plain",
      "--no-owner",
      "--no-acl",
      "--clean",
      "--if-exists",
    ];

    // Build pg_dump command
    const pgDumpCommand = Command.make("pg_dump", args.join(" "));

    // Set PGPASSWORD environment variable
    const commandWithEnv = Command.env(pgDumpCommand, {
      PGPASSWORD: dbConfig.password,
    });

    // Execute pg_dump
    yield* Command.exitCode(commandWithEnv).pipe(
      Effect.flatMap((exitCode) =>
        exitCode === 0
          ? Effect.void
          : Effect.fail(new Error(`pg_dump failed with exit code ${exitCode}`))
      ),
      Effect.mapError((error) => new Error(`Backup creation failed: ${error}`))
    );

    yield* terminal.display("✓ Backup created successfully\n");

    return backupFile;
  });

const compressBackup = (backupFile: string) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;

    yield* terminal.display("\n📦 Compressing backup...\n");

    const gzipCommand = Command.make("gzip", backupFile);

    yield* Command.exitCode(gzipCommand).pipe(
      Effect.flatMap((exitCode) =>
        exitCode === 0
          ? Effect.void
          : Effect.fail(new Error(`gzip failed with exit code ${exitCode}`))
      ),
      Effect.mapError((error) => new Error(`Compression failed: ${error}`))
    );

    const compressedFile = `${backupFile}.gz`;
    yield* terminal.display(`✓ Backup compressed: ${compressedFile}\n`);

    return compressedFile;
  });

const getFileSize = (filePath: string) =>
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

const backupDatabase = Effect.gen(function* () {
  const terminal = yield* Terminal.Terminal;
  const path = yield* Path.Path;

  yield* terminal.display("🗄️  Starting database backup...\n");
  yield* terminal.display("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Load configuration
  const databaseUrl = yield* Config.redacted("DATABASE_URL");
  const backupDirConfig = yield* Config.string("BACKUP_DIR").pipe(
    Config.withDefault("./backups")
  );

  const timestamp = generateTimestamp();

  // Resolve backup directory path relative to project root
  const projectRoot = path.join(
    path.dirname(yield* path.fromFileUrl(new URL(import.meta.url))),
    "../../"
  );
  const backupDir = path.join(projectRoot, backupDirConfig);

  const config: BackupConfig = {
    databaseUrl: Redacted.value(databaseUrl),
    backupDir,
    timestamp,
  };

  const dbConfig = parseDatabaseUrl(config.databaseUrl);

  // Ensure backup directory exists
  yield* ensureBackupDirectory(config.backupDir);

  // Create backup
  const backupFile = yield* createBackupFile(config, dbConfig);

  // Compress backup
  const compressedFile = yield* compressBackup(backupFile);

  // Get file size
  const fileSize = yield* getFileSize(compressedFile);

  // Display summary
  yield* terminal.display("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  yield* terminal.display("✅ Backup completed successfully!\n");
  yield* terminal.display(`📁 File: ${compressedFile}\n`);
  yield* terminal.display(`📊 Size: ${fileSize}\n`);
  yield* terminal.display("\n");
  yield* terminal.display("To restore this backup, run:\n");
  yield* terminal.display(
    `  bun run src/scripts/restore.ts ${compressedFile}\n`
  );
});

// ============================================================================
// Error Handling & Script Entry Point
// ============================================================================

const program = backupDatabase.pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      const terminal = yield* Terminal.Terminal;
      yield* terminal.display("\n❌ Backup failed!\n");
      yield* terminal.display(`Error: ${error}\n`);
      return yield* Effect.fail(error);
    })
  )
);

const CombinedLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeTerminal.layer,
  PlatformConfigProvider.layerDotEnv(
    join(
      fileURLToPath(new URL(".", import.meta.url)),
      "../../../apps/server/.env"
    )
  )
);

NodeRuntime.runMain(
  program.pipe(Effect.provide(CombinedLayer))
  // program.pipe(Effect.provide([NodeContext.layer, NodeTerminal.layer]))
);
