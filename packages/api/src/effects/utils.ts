import { Effect, pipe } from "effect";
import {
  type ApplicationError,
  ValidationError,
  DatabaseError,
  NetworkError,
} from "./errors";

/**
 * Convert a Promise-returning function to an Effect with error mapping.
 * This is the primary utility for migrating Promise-based code to Effect.ts.
 * 
 * @param promise - Function that returns a Promise
 * @param mapError - Optional function to map caught errors to ApplicationError
 * @returns Effect that represents the Promise operation
 * 
 * @example
 * ```typescript
 * // Basic Promise conversion
 * const fetchUser = fromPromise(
 *   () => fetch('/api/user').then(r => r.json())
 * );
 * 
 * // With custom error mapping
 * const fetchUserWithMapping = fromPromise(
 *   () => fetch('/api/user').then(r => r.json()),
 *   (error) => new NetworkError({
 *     message: `Failed to fetch user: ${error}`,
 *     url: '/api/user',
 *     cause: error
 *   })
 * );
 * 
 * // File system operations
 * const readFile = fromPromise(
 *   () => fs.readFile('config.json', 'utf8'),
 *   (error) => new ValidationError({
 *     message: 'Failed to read config file',
 *     field: 'config',
 *     value: 'config.json'
 *   })
 * );
 * ```
 */
export const fromPromise = <A>(
  promise: () => Promise<A>,
  mapError?: (error: unknown) => ApplicationError
): Effect.Effect<A, ApplicationError> => {
  return Effect.tryPromise({
    try: promise,
    catch: (error) => {
      if (mapError) {
        return mapError(error);
      }

      // Default error mapping
      if (error instanceof Error) {
        return new NetworkError({
          message: error.message,
          url: "unknown",
          cause: error,
        });
      }

      return new NetworkError({
        message: "Unknown error occurred",
        url: "unknown",
        cause: error,
      });
    },
  });
};

/**
 * Convert a Promise-returning function to an Effect with a specific error mapper.
 * This provides more control over error handling than the generic `fromPromise`.
 * 
 * @param promise - Function that returns a Promise
 * @param errorMapper - Function to map any caught error to a specific ApplicationError type
 * @returns Effect with the specified error type
 * 
 * @example
 * ```typescript
 * // Map all errors to ValidationError
 * const parseConfig = fromPromiseWith(
 *   () => JSON.parse(configString),
 *   (error) => new ValidationError({
 *     message: `Invalid JSON config: ${error}`,
 *     field: 'config',
 *     value: configString
 *   })
 * );
 * 
 * // Map all errors to DatabaseError
 * const queryUser = fromPromiseWith(
 *   () => db.user.findUnique({ where: { id } }),
 *   (error) => new DatabaseError({
 *     message: `Query failed: ${error}`,
 *     operation: 'findUser',
 *     cause: error
 *   })
 * );
 * ```
 */
export const fromPromiseWith = <A, E extends ApplicationError>(
  promise: () => Promise<A>,
  errorMapper: (error: unknown) => E
): Effect.Effect<A, E> => {
  return Effect.tryPromise({
    try: promise,
    catch: errorMapper,
  });
};

// Convert database Promise operations
export const fromDatabasePromise = <A>(
  promise: () => Promise<A>,
  operation: string
): Effect.Effect<A, DatabaseError> => {
  return fromPromiseWith(
    promise,
    (error) =>
      new DatabaseError({
        message:
          error instanceof Error ? error.message : "Database operation failed",
        operation,
        cause: error,
      })
  );
};

// Convert network Promise operations
export const fromNetworkPromise = <A>(
  promise: () => Promise<A>,
  url: string
): Effect.Effect<A, NetworkError> => {
  return fromPromiseWith(promise, (error) => {
    if (error instanceof Error && "status" in error) {
      return new NetworkError({
        message: error.message,
        url,
        status: error.status as number,
        cause: error,
      });
    }

    return new NetworkError({
      message:
        error instanceof Error ? error.message : "Network request failed",
      url,
      cause: error,
    });
  });
};

// Validation utilities
export const validateInput = <T>(
  input: unknown,
  validator: (input: unknown) => input is T,
  field: string
): Effect.Effect<T, ValidationError> => {
  if (validator(input)) {
    return Effect.succeed(input);
  }

  return Effect.fail(
    new ValidationError({
      message: `Invalid input for field: ${field}`,
      field,
      value: input,
    })
  );
};

// Safe JSON parsing
export const parseJSON = <T = unknown>(
  jsonString: string,
  field = "json"
): Effect.Effect<T, ValidationError> => {
  return Effect.try({
    try: () => JSON.parse(jsonString) as T,
    catch: (error) =>
      new ValidationError({
        message: `Invalid JSON: ${error instanceof Error ? error.message : "Parse error"}`,
        field,
        value: jsonString,
      }),
  });
};

// Safe number parsing
export const parseNumber = (
  value: string | number,
  field: string
): Effect.Effect<number, ValidationError> => {
  if (typeof value === "number") {
    return Effect.succeed(value);
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return Effect.fail(
      new ValidationError({
        message: `Invalid number: ${value}`,
        field,
        value,
      })
    );
  }

  return Effect.succeed(parsed);
};

// Safe date parsing
export const parseDate = (
  value: string | Date,
  field: string
): Effect.Effect<Date, ValidationError> => {
  if (value instanceof Date) {
    return Effect.succeed(value);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return Effect.fail(
      new ValidationError({
        message: `Invalid date: ${value}`,
        field,
        value,
      })
    );
  }

  return Effect.succeed(parsed);
};

// Array utilities
export const mapEffect = <A, B, E, R>(
  array: readonly A[],
  f: (item: A, index: number) => Effect.Effect<B, E, R>
): Effect.Effect<readonly B[], E, R> => {
  return Effect.all(array.map(f));
};

export const filterEffect = <A, E, R>(
  array: readonly A[],
  predicate: (item: A, index: number) => Effect.Effect<boolean, E, R>
): Effect.Effect<readonly A[], E, R> => {
  return pipe(
    Effect.all(
      array.map((item, index) =>
        Effect.map(predicate(item, index), (keep) => ({ item, keep }))
      )
    ),
    Effect.map((results) =>
      results.filter(({ keep }) => keep).map(({ item }) => item)
    )
  );
};

// Conditional execution
export const when = <A, E, R>(
  condition: boolean,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A | undefined, E, R> => {
  return condition
    ? Effect.map(effect, (a) => a as A | undefined)
    : Effect.succeed(undefined);
};

export const unless = <A, E, R>(
  condition: boolean,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A | undefined, E, R> => {
  return when(!condition, effect);
};

// Tap utilities for side effects
export const tapLog =
  <A, E, R>(message: string) =>
  (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => {
    return pipe(
      effect,
      Effect.tap(() => Effect.sync(() => console.log(message)))
    );
  };

export const tapError =
  <A, E, R>(onError: (error: E) => Effect.Effect<void, never, R>) =>
  (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => {
    return Effect.tapError(effect, onError);
  };

// Resource management helpers
export const bracket = <A, B, E1, E2, R1, R2>(
  acquire: Effect.Effect<A, E1, R1>,
  use: (resource: A) => Effect.Effect<B, E2, R2>,
  release: (resource: A) => Effect.Effect<void, never, R1>
): Effect.Effect<B, E1 | E2, R1 | R2> => {
  return Effect.acquireUseRelease(acquire, use, release);
};

// Memoization (simplified)
export const memoize = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => {
  let cached: A | undefined;
  let hasValue = false;

  return Effect.suspend(() => {
    if (hasValue && cached !== undefined) {
      return Effect.succeed(cached);
    }

    return pipe(
      effect,
      Effect.tap((result) =>
        Effect.sync(() => {
          cached = result;
          hasValue = true;
        })
      )
    );
  });
};

// Debounce effect execution
export const debounce = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  delay: number
): Effect.Effect<A, E, R> => {
  return pipe(
    Effect.sleep(delay),
    Effect.flatMap(() => effect)
  );
};

// Throttle effect execution
export const throttle = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  interval: number
): Effect.Effect<A, E, R> => {
  let lastExecution = 0;

  return Effect.suspend(() => {
    const now = Date.now();
    if (now - lastExecution < interval) {
      return pipe(
        Effect.sleep(interval - (now - lastExecution)),
        Effect.flatMap(() => {
          lastExecution = Date.now();
          return effect;
        })
      );
    }

    lastExecution = Date.now();
    return effect;
  });
};
