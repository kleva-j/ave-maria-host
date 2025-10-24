/**
 * @fileoverview Effect.ts Usage Examples
 * 
 * This file demonstrates practical usage patterns for the Effect.ts integration library.
 * These examples show how to combine different utilities for real-world scenarios.
 */

import { Effect, pipe } from "effect";
import {
  ValidationError,
  DatabaseError,
  NetworkError,
  withFallback,
  fromPromise,
  parseNumber,
  parseJSON,
  withRetry,
} from "./index";

/**
 * Example: Basic Effect program with error handling and validation.
 * Demonstrates JSON parsing, number validation, and error recovery.
 * 
 * @param input - Raw input to validate as user data
 * @returns Effect that produces validated user data or validation error
 * 
 * @example
 * ```typescript
 * // Valid input
 * const result = await Effect.runPromise(
 *   validateUserInput({ name: "John", age: "25" })
 * );
 * // Result: { name: "John", age: 25 }
 * 
 * // Invalid input
 * const result = await Effect.runPromiseExit(
 *   validateUserInput({ name: "John", age: "invalid" })
 * );
 * // Result: Failure with ValidationError
 * ```
 */
export const validateUserInput = (input: unknown) => {
  return pipe(
    parseJSON<{ name: string; age: string }>(JSON.stringify(input)),
    Effect.flatMap(({ name, age }) =>
      pipe(
        parseNumber(age, "age"),
        Effect.map((parsedAge) => ({ name, age: parsedAge }))
      )
    ),
    Effect.catchTag("ValidationError", (error) =>
      Effect.fail(
        new ValidationError({
          message: `User input validation failed: ${error.message}`,
          field: error.field,
          value: error.value,
        })
      )
    )
  );
};

/**
 * Example: Database operation with retry logic and fallback.
 * Demonstrates Promise-to-Effect conversion, retry mechanisms, and graceful degradation.
 * 
 * @param userId - ID of the user to fetch
 * @returns Effect that produces user data, never fails due to fallback
 * 
 * @example
 * ```typescript
 * // Successful fetch
 * const user = await Effect.runPromise(fetchUserFromDatabase("user-123"));
 * // Result: { id: "user-123", name: "John Doe", email: "john@example.com" }
 * 
 * // Failed fetch with fallback
 * const user = await Effect.runPromise(fetchUserFromDatabase("invalid-id"));
 * // Result: { id: "invalid-id", name: "Unknown", email: "unknown@example.com" }
 * ```
 */
export const fetchUserFromDatabase = (userId: string) => {
  const databaseOperation = () =>
    Promise.resolve({
      id: userId,
      name: "John Doe",
      email: "john@example.com",
    });

  return pipe(
    fromPromise(
      databaseOperation,
      (error) =>
        new DatabaseError({
          message: "Failed to fetch user",
          operation: "fetchUser",
          cause: error,
        })
    ),
    withRetry({ maxRetries: 3 }),
    withFallback({ id: userId, name: "Unknown", email: "unknown@example.com" })
  );
};

/**
 * Example: Network request with error handling and retry logic.
 * Demonstrates external API integration with structured error handling.
 * 
 * @param url - URL to fetch data from
 * @returns Effect that produces external data or error response
 * 
 * @example
 * ```typescript
 * // Successful API call
 * const data = await Effect.runPromise(
 *   fetchExternalData("https://api.example.com/data")
 * );
 * 
 * // Failed API call with error handling
 * const result = await Effect.runPromise(
 *   fetchExternalData("https://invalid-api.com/data")
 * );
 * // Result: { error: "Service unavailable" }
 * ```
 */
export const fetchExternalData = (url: string) => {
  const networkRequest = () => fetch(url).then((res) => res.json());

  return pipe(
    fromPromise(
      networkRequest,
      (error) =>
        new NetworkError({
          message: "External API request failed",
          url,
          cause: error,
        })
    ),
    withRetry({ maxRetries: 2 }),
    Effect.catchTag("NetworkError", (error) => {
      console.error("Network request failed:", error.message);
      return Effect.succeed({ error: "Service unavailable" });
    })
  );
};

/**
 * Example: Composing multiple Effect programs in parallel.
 * Demonstrates how to combine multiple Effects and process their results together.
 * 
 * @param userId - ID of the user to fetch
 * @param externalUrl - URL to fetch external data from
 * @returns Effect that produces combined user and external data
 * 
 * @example
 * ```typescript
 * // Fetch and combine data from multiple sources
 * const result = await Effect.runPromise(
 *   processUserData("user-123", "https://api.example.com/data")
 * );
 * // Result: {
 * //   user: { id: "user-123", name: "John Doe", email: "john@example.com" },
 * //   externalData: { ... },
 * //   processedAt: "2024-01-01T12:00:00.000Z"
 * // }
 * ```
 */
export const processUserData = (userId: string, externalUrl: string) => {
  return pipe(
    Effect.all([fetchUserFromDatabase(userId), fetchExternalData(externalUrl)]),
    Effect.map(([user, externalData]) => ({
      user,
      externalData,
      processedAt: new Date().toISOString(),
    }))
  );
};
