import type { UserRepository } from "@host/domain";
import type { FinancialError } from "@host/shared";

import { Schema, Effect, Context, Layer } from "effect";
import { User, UserId } from "@host/domain";

import {
  UserNotFoundError,
  PhoneNumberSchema,
  ValidationError,
  UrlStringSchema,
  FirstNameSchema,
  DatabaseError,
  DateSchema,
} from "@host/shared";

/**
 * Input for updating a user profile
 */
export const UpdateUserProfileInput = Schema.Struct({
  userId: Schema.UUID,
  name: Schema.optional(FirstNameSchema),
  image: Schema.optional(Schema.NullOr(UrlStringSchema)),
  phoneNumber: Schema.optional(Schema.NullOr(PhoneNumberSchema)),
  dateOfBirth: Schema.optional(Schema.NullOr(DateSchema)),
});

export type UpdateUserProfileInput = typeof UpdateUserProfileInput.Type;

/**
 * Output from updating a user profile
 */
export interface UpdateUserProfileOutput {
  readonly user: User;
  readonly updatedFields: string[];
}

/**
 * Use case for updating a user's profile information
 * Validates updates and applies business rules
 */
export interface UpdateUserProfileUseCase {
  readonly execute: (
    input: UpdateUserProfileInput
  ) => Effect.Effect<UpdateUserProfileOutput, FinancialError>;
}

export const UpdateUserProfileUseCase =
  Context.GenericTag<UpdateUserProfileUseCase>("@app/UpdateUserProfileUseCase");

/**
 * Live implementation of UpdateUserProfileUseCase
 */
export const UpdateUserProfileUseCaseLive = Layer.effect(
  UpdateUserProfileUseCase,
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
      execute: (input: UpdateUserProfileInput) =>
        Effect.gen(function* () {
          // Validate input schema
          const validatedInput = yield* Schema.decodeUnknown(
            UpdateUserProfileInput
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

          // Track updated fields
          const updatedFields: string[] = [];

          // Create updated user with new values
          const updatedUser = new User({
            ...user,
            name:
              validatedInput.name !== undefined
                ? validatedInput.name
                : user.name,
            image:
              validatedInput.image !== undefined
                ? validatedInput.image
                : user.image,
            phoneNumber:
              validatedInput.phoneNumber !== undefined
                ? validatedInput.phoneNumber
                : user.phoneNumber,
            dateOfBirth:
              validatedInput.dateOfBirth !== undefined
                ? validatedInput.dateOfBirth
                : user.dateOfBirth,
            updatedAt: new Date(),
          });

          // Track what changed
          if (validatedInput.name !== undefined) updatedFields.push("name");
          if (validatedInput.image !== undefined) updatedFields.push("image");
          if (validatedInput.phoneNumber !== undefined)
            updatedFields.push("phoneNumber");
          if (validatedInput.dateOfBirth !== undefined)
            updatedFields.push("dateOfBirth");

          // Validate phone number if provided
          if (
            validatedInput.phoneNumber &&
            validatedInput.phoneNumber !== user.phoneNumber
          ) {
            // Check if phone number already exists
            const phoneExists = yield* userRepository
              .phoneNumberExists(validatedInput.phoneNumber)
              .pipe(
                Effect.mapError(
                  (error) =>
                    new DatabaseError({
                      operation: "phoneNumberExists",
                      table: "user",
                      message: error.message || "Failed to check phone number",
                    })
                )
              );

            if (phoneExists) {
              return yield* Effect.fail(
                new ValidationError({
                  field: "phoneNumber",
                  message: "Phone number already in use",
                  value: validatedInput.phoneNumber,
                })
              );
            }

            // Create new user with reset phone verification if phone number changed
            const finalUser = new User({
              ...updatedUser,
              phoneVerified: false,
            });

            // Update the user
            yield* userRepository.update(finalUser).pipe(
              Effect.mapError(
                (error) =>
                  new DatabaseError({
                    operation: "update",
                    table: "user",
                    message: error.message || "Failed to update user",
                  })
              )
            );

            return {
              user: finalUser,
              updatedFields,
            };
          }

          // Update the user
          yield* userRepository.update(updatedUser).pipe(
            Effect.mapError(
              (error) =>
                new DatabaseError({
                  operation: "update",
                  table: "user",
                  message: error.message || "Failed to update user",
                })
            )
          );

          return {
            user: updatedUser,
            updatedFields,
          };
        }),
    };
  })
);
