import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { PgMigrator } from "@effect/sql-pg";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Effect } from "effect";

import { PgLive } from "../database";

NodeRuntime.runMain(
  Effect.gen(function* () {
    yield* Effect.log("Running migrations");

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
      yield* Effect.log("No migrations to run");
    } else {
      yield* Effect.log(`Applied ${migrations.length} migrations`);
      for (const [id, name] of migrations) {
        yield* Effect.log(`- ${id.toString().padStart(4, "0")}: ${name}`);
      }
    }
  }).pipe(Effect.provide([NodeContext.layer, PgLive]))
);
