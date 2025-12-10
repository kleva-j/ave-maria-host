import { RewardsBadgeTypeEnum, RewardsTierEnum } from "../constant/enums";
import { Schema } from "effect";

/**
 * Reward Badge Schema
 */
export const RewardBadgeSchema = Schema.Literal(
  ...Object.values(RewardsBadgeTypeEnum)
)
  .pipe(Schema.brand("Badge"))
  .annotations({
    message: () => "Badge type",
    description: "Badge type",
  });

export type RewardBadgeType = typeof RewardBadgeSchema.Type;

/**
 * Badge Schema
 */
export const BadgeSchema = Schema.Struct({
  type: RewardBadgeSchema,
  name: Schema.Trimmed.pipe(Schema.minLength(1), Schema.maxLength(55)),
  description: Schema.Trimmed.pipe(Schema.minLength(1), Schema.maxLength(255)),
  icon: Schema.Trimmed.pipe(Schema.minLength(1), Schema.maxLength(255)),
  earnedDate: Schema.optional(Schema.Date),
});

export type Badge = typeof BadgeSchema.Type;

/**
 * Reward Tier Schema
 */
export const RewardTierSchema = Schema.Literal(
  ...Object.values(RewardsTierEnum)
)
  .pipe(Schema.brand("RewardTier"))
  .annotations({
    message: () => "Reward tier type",
    description: "Reward tier type",
  });

export type RewardTier = typeof RewardTierSchema.Type;
