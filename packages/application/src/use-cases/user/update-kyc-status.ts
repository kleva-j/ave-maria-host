import type { UserRepository } from "@host/domain";
import type { FinancialError, KycStatus, KycTier } from "@host/shared";

import { Effect, Context, Layer } from "effect";
import { User, UserId } from "@host/domain";
import { Schema } from "effect";

import {
  UserNotFoundError,
  ValidationError,
  KycStatusSchema,
  DatabaseError,
  KycStatusEnum,
  KycTierSchema,
  UserIdSchema,
} from "@host/shared";

/**
 * Input for updating KYC status
 */
export const UpdateKycStatusInput = Schema.Struct({
  userId: UserIdSchema,
  tier: KycTierSchema,
  status: KycStatusSchema,
  kycData: Schema.optional(Schema.Unknown),
  adminUserId: UserIdSchema,
});

export type UpdateKycStatusInput = typeof UpdateKycStatusInput.Type;

/**
 * Output from updating KYC status
 */
export interface UpdateKycStatusOutput {
  readonly user: User;
  readonly previousTier: KycTier;
  readonly newTier: KycTier;
  readonly previousStatus: KycStatus;
  readonly newStatus: KycStatus;
}

/**
 * Use case for updating a user's KYC status
 * Enforces tier progression rules and audit trail
 */
export interface UpdateKycStatusUseCase {
  readonly execute: (
    input: UpdateKycStatusInput
  ) => Effect.Effect<UpdateKycStatusOutput, FinancialError>;
}

export const UpdateKycStatusUseCase =
  Context.GenericTag<UpdateKycStatusUseCase>("@app/UpdateKycStatusUseCase");

/**
 * Live implementation of UpdateKycStatusUseCase
 */
export const UpdateKycStatusUseCaseLive = Layer.effect(
  UpdateKycStatusUseCase,
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
      execute: (input: UpdateKycStatusInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            UpdateKycStatusInput
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
              new UserNotFoundError({ userId: validatedInput.userId })
            );
          }

          // Business rule: Cannot downgrade KYC tier
          if (validatedInput.tier < user.kycTier) {
            return yield* Effect.fail(
              new ValidationError({
                field: "tier",
                message: `Cannot downgrade KYC tier from ${user.kycTier} to ${validatedInput.tier}`,
                value: validatedInput.tier,
              })
            );
          }

          // Business rule: Tier progression must be sequential
          if (validatedInput.tier > user.kycTier + 1) {
            return yield* Effect.fail(
              new ValidationError({
                field: "tier",
                message: `Cannot skip KYC tiers. Current tier: ${user.kycTier}, requested: ${validatedInput.tier}`,
                value: validatedInput.tier,
              })
            );
          }

          // Store previous values for audit
          const previousTier = user.kycTier;
          const previousStatus = user.kycStatus;

          // Create updated user
          const updatedUser = new User({
            ...user,
            kycTier: validatedInput.tier,
            kycStatus: validatedInput.status,
            kycData: validatedInput.kycData ?? user.kycData,
            kycVerifiedAt:
              validatedInput.status === KycStatusEnum.APPROVED
                ? new Date()
                : user.kycVerifiedAt,
            updatedAt: new Date(),
          });

          // Update the user
          yield* userRepository.update(updatedUser).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "update",
                  table: "user",
                  message: error.message || "Failed to update KYC status",
                })
            )
          );

          // TODO: Create audit log entry
          // This would typically be done through an event or separate audit service
          console.log(
            `KYC status updated by admin ${validatedInput.adminUserId}: User ${validatedInput.userId} tier ${previousTier}->${validatedInput.tier} status ${previousStatus}->${validatedInput.status}`
          );

          return {
            user: updatedUser,
            previousTier,
            newTier: validatedInput.tier,
            previousStatus,
            newStatus: validatedInput.status,
          };
        }),
    };
  })
);
