import { Effect, Config, Console } from "effect";

export const requireRestoreConfirmation = Effect.gen(function* () {
  const confirmed = yield* Config.string("DB_RESTORE_CONFIRM")
    .pipe(Config.withDefault("0"))
    .pipe(Config.map((s) => s === "1"));

  if (!confirmed) {
    yield* Console.error(
      "Restore blocked: Set DB_RESTORE_CONFIRM=1 to proceed"
    );
    return yield* Effect.fail(new Error("Restore not confirmed"));
  }
});

export const blockProductionRestore = Effect.gen(function* () {
  const config = yield* Config.all({
    env: Config.string("NODE_ENV").pipe(Config.withDefault("development")),
    allowed: Config.string("DB_RESTORE_ALLOW_PRODUCTION")
      .pipe(Config.withDefault("0"))
      .pipe(Config.map((s) => s === "1")),
  });

  if (config.env === "production" && !config.allowed) {
    yield* Console.error("Restore blocked in production");
    yield* Console.error("Set DB_RESTORE_ALLOW_PRODUCTION=1 to override");
    return yield* Effect.fail(new Error("Production restore blocked"));
  }
});
