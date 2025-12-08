import { DateTime, Effect } from "effect";

import { AnalyticsError } from "./analytics-rpc";

/**
 * Safely create DateTime from Date with fallback to current time
 */
export const safeDateTimeFromDate = (date: Date | null | undefined) =>
  date
    ? DateTime.make(date).pipe(Effect.orElseSucceed(() => DateTime.unsafeNow()))
    : Effect.succeed(DateTime.unsafeNow());

/**
 * Safely create DateTime from Date or return null if not present
 */
export const safeDateTimeOrNull = (date: Date | null | undefined) =>
  date
    ? DateTime.make(date).pipe(Effect.orElseSucceed(() => DateTime.unsafeNow()))
    : Effect.succeed(null);

/**
 * Map error to AnalyticsError
 */
export const mapToAnalyticsError =
  (operation: string, message: string) => (error: unknown) => {
    return new AnalyticsError({
      operation,
      message: (error as any)._tag || message || (error as any).message,
      cause: error,
    });
  };
