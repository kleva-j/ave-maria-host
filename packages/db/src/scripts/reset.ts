import { SqlClient, SqlSchema } from "@effect/sql";
import { Effect, Schema } from "effect";

import { PgLive } from "../database";
import { NodeRuntime } from "@effect/platform-node";

NodeRuntime.runMain(
  Effect.gen(function* () {
    const client = yield* SqlClient.SqlClient;

    const schemaList = ["public", "drizzle"];

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
  }).pipe(Effect.provide(PgLive))
);
