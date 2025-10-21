import { PlatformConfigProvider } from "@effect/platform";
import { identity, Config, Effect, Layer } from "effect";
import { NodeContext } from "@effect/platform-node";
import { PgClient } from "@effect/sql-pg";

import * as EffectString from "effect/String";
import * as path from "node:path";

const pgConfig = {
  transformQueryNames: EffectString.camelToSnake,
  transformResultNames: EffectString.snakeToCamel,
  // - 114: JSON (return as string instead of parsed object)
  // - 1082: DATE
  // - 1114: TIMESTAMP WITHOUT TIME ZONE
  // - 1184: TIMESTAMP WITH TIME ZONE
  // - 3802: JSONB (return as string instead of parsed object)
  types: {
    114: {
      to: 25,
      from: [114],
      parse: identity,
      serialize: identity,
    },
    1082: {
      to: 25,
      from: [1082],
      parse: identity,
      serialize: identity,
    },
    1114: {
      to: 25,
      from: [1114],
      parse: identity,
      serialize: identity,
    },
    1184: {
      to: 25,
      from: [1184],
      parse: identity,
      serialize: identity,
    },
    3802: {
      to: 25,
      from: [3802],
      parse: identity,
      serialize: identity,
    },
  },
};

export const PgLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    return PgClient.layer({
      url: yield* Config.redacted("DATABASE_URL"),
      ...pgConfig,
    });
  })
).pipe(
  Layer.provide(
    PlatformConfigProvider.layerDotEnv(
      path.join(process.cwd(), "../../apps/server/.env")
    )
  ),
  Layer.provide(NodeContext.layer)
);
