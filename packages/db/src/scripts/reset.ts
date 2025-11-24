import { Config, Effect, Redacted, Schema } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import { SqlClient, SqlSchema } from "@effect/sql";

import { PgLive } from "../database";

// Safety check to prevent accidental destructive operations

const checkResetConfirmation = () =>
  Effect.gen(function* () {
    const DB_RESET_CONFIRM = yield* Config.redacted("DB_RESET_CONFIRM");
    const resetConfirmationValue = Redacted.value(DB_RESET_CONFIRM);

    if (resetConfirmationValue !== "1") {
      yield* Effect.logError("❌ Database reset requires confirmation.");
      yield* Effect.logError(
        "Set DB_RESET_CONFIRM=1 environment variable to proceed."
      );
      yield* Effect.logError(
        "Example: DB_RESET_CONFIRM=1 bun run src/scripts/reset.ts"
      );

      return yield* Effect.die("Reset confirmation not provided");
    }
  });

const checkResetAllowProduction = () =>
  Effect.gen(function* () {
    const NODE_ENV = yield* Config.redacted("NODE_ENV");
    const DB_RESET_ALLOW_PRODUCTION = yield* Config.redacted(
      "DB_RESET_ALLOW_PRODUCTION"
    );
    const resetAllowProductionValue = Redacted.value(DB_RESET_ALLOW_PRODUCTION);
    const nodeEnvValue = Redacted.value(NODE_ENV);

    if (resetAllowProductionValue !== "1" && nodeEnvValue === "production") {
      yield* Effect.logError(
        "❌ Database reset is blocked in production environment."
      );
      yield* Effect.logError(
        "Set DB_RESET_ALLOW_PRODUCTION=1 if you really need to reset production data."
      );
      return yield* Effect.die("Production reset not allowed");
    }
  });

const program = Effect.gen(function* () {
  yield* checkResetConfirmation();
  yield* checkResetAllowProduction();

  const client = yield* SqlClient.SqlClient;

  const schemaList = ["public", "drizzle"];

  yield* Effect.logWarning(
    "⚠️  WARNING: This will DROP ALL TABLES and TYPES from the database!"
  );
  yield* Effect.logWarning(`📊 Target schemas: ${schemaList.join(", ")}`);
  yield* Effect.logWarning(
    "✅ Safety checks passed - proceeding with database reset..."
  );

  const getTypes = SqlSchema.findAll({
    Request: Schema.Void,
    Result: Schema.Struct({
      typname: Schema.String,
      schemaname: Schema.String,
    }),
    execute: () => client`
      SELECT
        t.typname,
        n.nspname AS schemaname
      FROM
        pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE
        t.typtype = 'e'
        AND n.nspname IN ${client.in(schemaList)}
    `,
  });

  const getTables = SqlSchema.findAll({
    Request: Schema.Void,
    Result: Schema.Struct({
      tableName: Schema.String,
      schemaName: Schema.String,
    }),
    execute: () => client`
      SELECT
        table_name,
        table_schema AS schema_name
      FROM
        information_schema.tables
      WHERE
        table_schema IN ${client.in(schemaList)}
        AND table_type = 'BASE TABLE'
    `,
  });

  const types = yield* getTypes();
  const tables = yield* getTables();

  yield* client.withTransaction(
    Effect.gen(function* () {
      yield* Effect.log("Starting database reset");

      if (types.length > 0) {
        yield* Effect.log("Dropping types");

        for (const type of types) {
          yield* client`DROP TYPE IF EXISTS ${client(type.schemaname)}.${client(type.typname)} CASCADE;`;
        }
        yield* Effect.log("Dropped types");
      } else yield* Effect.log("No types to drop");

      if (tables.length > 0) {
        yield* Effect.log(
          `Tables to drop: ${tables.map((table) => `${table.schemaName}.${table.tableName}`).join(",\n          ")}`
        );
        yield* Effect.log("Dropping tables");

        for (const table of tables) {
          yield* client`DROP TABLE IF EXISTS ${client(table.schemaName)}.${client(table.tableName)} CASCADE`;
        }
        yield* Effect.log("Dropped tables");
      } else yield* Effect.log("No tables to drop");

      yield* Effect.log("Finished database reset");
    })
  );
}).pipe(Effect.provide(PgLive));

NodeRuntime.runMain(program);
