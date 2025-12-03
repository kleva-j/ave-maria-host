import type { UserRepository } from "@host/domain";

import { Schema, Effect, Context, Layer } from "effect";
import { User, UserId } from "@host/domain";

import {
  type FinancialError,
  UserNotFoundError,
  ValidationError,
  DatabaseError,
} from "@host/shared";

/**
 * Input for suspending a user account
 */
export const SuspendUserAccountInput = Schema.Struct({
  userId: Schema.UUID,
  reason: Schema.String.pipe(Schema.minLength(10)),
  adminUserId: Schema.UUID, // Admin performing the suspension
});

export type SuspendUserAccountInput = typeof SuspendUserAccountInput.Type;

/**
 * Output from suspending a user account
 */
export interface SuspendUserAccountOutput {
  readonly user: User;
  readonly suspendedAt: Date;
  readonly reason: string;
}

/**
 * Use case for suspending a user account
 * Includes audit trail and validation
 */
export interface SuspendUserAccountUseCase {
  readonly execute: (
    input: SuspendUserAccountInput
  ) => Effect.Effect<SuspendUserAccountOutput, FinancialError>;
}

export const SuspendUserAccountUseCase =
  Context.GenericTag<SuspendUserAccountUseCase>(
    "@app/SuspendUserAccountUseCase"
  );

/**
 * Live implementation of SuspendUserAccountUseCase
 */
export const SuspendUserAccountUseCaseLive = Layer.effect(
  SuspendUserAccountUseCase,
  Effect.gen(function* () {
    const userRepo = yield* Effect.serviceOption(
      Context.GenericTag<UserRepository>("@domain/UserRepository")
    );

    if (userRepo._tag === "None") {
      return yield* Effect.fail(
        new ValidationError({
          field: "dependencies",
          message: "UserRepository not available",
        })
      );
    }

    const userRepository = userRepo.value;

    return {
      execute: (input: SuspendUserAccountInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            SuspendUserAccountInput
          )(input).pipe(
            Effect.mapError(
              (error) =>
                new ValidationError({
                  field: "input",
                  message: `Invalid input: ${error}`,
                  value: input,
                })
            )
          );

          // Create value object
          const userId = UserId.fromString(validatedInput.userId);

          // Retrieve the user
          const user = yield* userRepository.findById(userId).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "findById",
                  table: "user",
                  message: error.message || "Failed to fetch user",
                })
            )
          );

          if (!user) {
            return yield* Effect.fail(
              new UserNotFoundError({
                userId: validatedInput.userId,
              })
            );
          }

          // Business rule: Cannot suspend already suspended account
          if (user.isSuspended) {
            return yield* Effect.fail(
              new ValidationError({
                field: "userId",
                message: "User account is already suspended",
                value: validatedInput.userId,
              })
            );
          }

          // Business rule: Cannot suspend inactive account
          if (!user.isActive) {
            return yield* Effect.fail(
              new ValidationError({
                field: "userId",
                message: "Cannot suspend inactive account",
                value: validatedInput.userId,
              })
            );
          }

          const suspendedAt = new Date();

          // Create suspended user
          const suspendedUser = new User({
            ...user,
            isSuspended: true,
            suspendedAt,
            suspensionReason: validatedInput.reason,
            updatedAt: new Date(),
          });

          // Update the user
          yield* userRepository.update(suspendedUser).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "update",
                  table: "user",
                  message: error.message || "Failed to suspend user account",
                })
            )
          );

          // TODO: Revoke all active sessions
          // This would typically be done through the AuthService
          // await authService.revokeAllUserSessions(validatedInput.userId)

          // TODO: Send notification to user
          // This would typically be done through a notification service or event
          // await notificationService.sendAccountSuspendedEmail(user.email, validatedInput.reason)

          // TODO: Create audit log entry
          console.log(
            `Account suspended by admin ${validatedInput.adminUserId}: User ${validatedInput.userId} - Reason: ${validatedInput.reason}`
          );

          return {
            user: suspendedUser,
            suspendedAt,
            reason: validatedInput.reason,
          };
        }),
    };
  })
);
