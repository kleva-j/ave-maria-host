// Ajo/Esusu Group Validation Schemas using Effect Schema
// Input/output schemas for all group-related API operations

import { Schema } from "effect";

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for creating a new Ajo/Esusu group
 * Validates group configuration and membership rules
 */
export class CreateGroupSchema extends Schema.Class<CreateGroupSchema>(
  "CreateGroupSchema"
)({
  groupName: Schema.Trimmed.pipe(
    Schema.minLength(1, { message: () => "Group name is required" }),
    Schema.maxLength(100, {
      message: () => "Group name must not exceed 100 characters",
    })
  ),
  memberCount: Schema.Number.pipe(
    Schema.int({ message: () => "Member count must be a whole number" }),
    Schema.between(2, 50, {
      message: () => "Member count must be between 2 and 50",
    })
  ),
  contributionAmount: Schema.Number.pipe(
    Schema.positive({
      message: () => "Contribution amount must be positive",
    }),
    Schema.lessThanOrEqualTo(1000000, {
      message: () => "Contribution amount cannot exceed 1,000,000",
    })
  ),
  contributionFrequency: Schema.Literal("daily", "weekly", "monthly").pipe(
    Schema.annotations({
      description: "How often members contribute to the group",
    })
  ),
  rotationOrder: Schema.Literal("manual", "random", "sequential").pipe(
    Schema.annotations({
      description: "How payout order is determined",
    })
  ),
  description: Schema.optional(
    Schema.String.pipe(
      Schema.maxLength(500, {
        message: () => "Description must not exceed 500 characters",
      })
    )
  ),
  isPrivate: Schema.optional(Schema.Boolean),
}) {}

export type CreateGroupInput = typeof CreateGroupSchema.Type;

/**
 * Schema for joining an existing group
 */
export class JoinGroupSchema extends Schema.Class<JoinGroupSchema>(
  "JoinGroupSchema"
)({
  groupId: Schema.UUID.annotations({
    message: () => "Invalid group ID format",
  }),
  inviteCode: Schema.optional(
    Schema.Trimmed.pipe(
      Schema.pattern(/^[A-Z0-9]{6}$/, {
        message: () => "Invalid invite code format",
      })
    )
  ),
}) {}

export type JoinGroupInput = typeof JoinGroupSchema.Type;

/**
 * Schema for making a group contribution
 */
export class MakeGroupContributionSchema extends Schema.Class<MakeGroupContributionSchema>(
  "MakeGroupContributionSchema"
)({
  groupId: Schema.UUID.annotations({
    message: () => "Invalid group ID format",
  }),
  amount: Schema.Number.pipe(
    Schema.positive({
      message: () => "Contribution amount must be positive",
    })
  ),
}) {}

export type MakeGroupContributionInput =
  typeof MakeGroupContributionSchema.Type;

/**
 * Schema for updating group settings (organizer only)
 */
export class UpdateGroupSchema extends Schema.Class<UpdateGroupSchema>(
  "UpdateGroupSchema"
)({
  groupId: Schema.UUID.annotations({
    message: () => "Invalid group ID format",
  }),
  groupName: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))
  ),
  description: Schema.optional(Schema.String.pipe(Schema.maxLength(500))),
  isPrivate: Schema.optional(Schema.Boolean),
}) {}

export type UpdateGroupInput = typeof UpdateGroupSchema.Type;

/**
 * Schema for setting rotation order (organizer only)
 */
export class SetRotationOrderSchema extends Schema.Class<SetRotationOrderSchema>(
  "SetRotationOrderSchema"
)({
  groupId: Schema.UUID.annotations({
    message: () => "Invalid group ID format",
  }),
  memberOrder: Schema.Array(
    Schema.UUID.annotations({ message: () => "Invalid member ID" })
  ).pipe(
    Schema.minItems(2, {
      message: () => "At least 2 members required for rotation",
    })
  ),
}) {}

export type SetRotationOrderInput = typeof SetRotationOrderSchema.Type;

/**
 * Schema for leaving a group
 */
export class LeaveGroupSchema extends Schema.Class<LeaveGroupSchema>(
  "LeaveGroupSchema"
)({
  groupId: Schema.UUID.annotations({
    message: () => "Invalid group ID format",
  }),
  reason: Schema.optional(
    Schema.String.pipe(
      Schema.maxLength(200, {
        message: () => "Reason must not exceed 200 characters",
      })
    )
  ),
}) {}

export type LeaveGroupInput = typeof LeaveGroupSchema.Type;

/**
 * Schema for getting group details
 */
export class GetGroupDetailsSchema extends Schema.Class<GetGroupDetailsSchema>(
  "GetGroupDetailsSchema"
)({
  groupId: Schema.UUID.annotations({
    message: () => "Invalid group ID format",
  }),
}) {}

export type GetGroupDetailsInput = typeof GetGroupDetailsSchema.Type;

/**
 * Schema for listing groups with filters
 */
export class ListGroupsSchema extends Schema.Class<ListGroupsSchema>(
  "ListGroupsSchema"
)({
  status: Schema.optional(
    Schema.Literal("recruiting", "active", "completed", "cancelled")
  ),
  role: Schema.optional(Schema.Literal("organizer", "member")),
  limit: Schema.optional(
    Schema.Number.pipe(
      Schema.int(),
      Schema.between(1, 100, {
        message: () => "Limit must be between 1 and 100",
      })
    )
  ),
  offset: Schema.optional(
    Schema.Number.pipe(
      Schema.int(),
      Schema.nonNegative({ message: () => "Offset must be non-negative" })
    )
  ),
}) {}

export type ListGroupsInput = typeof ListGroupsSchema.Type;

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Schema for group member details
 */
export class GroupMemberSchema extends Schema.Class<GroupMemberSchema>(
  "GroupMemberSchema"
)({
  id: Schema.UUID,
  userId: Schema.UUID,
  groupId: Schema.UUID,
  userName: Schema.String,
  role: Schema.Literal("organizer", "member"),
  payoutPosition: Schema.NullOr(Schema.Number.pipe(Schema.int())),
  hasReceivedPayout: Schema.Boolean,
  totalContributions: Schema.Number,
  missedContributions: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  joinedAt: Schema.DateTimeUtc,
}) {}

export type GroupMember = typeof GroupMemberSchema.Type;

/**
 * Schema for group details
 */
export class AjoGroupSchema extends Schema.Class<AjoGroupSchema>(
  "AjoGroupSchema"
)({
  id: Schema.UUID,
  organizerId: Schema.UUID,
  groupName: Schema.String,
  description: Schema.NullOr(Schema.String),
  memberCount: Schema.Number.pipe(Schema.int()),
  currentMemberCount: Schema.Number.pipe(Schema.int()),
  contributionAmount: Schema.Number,
  contributionFrequency: Schema.Literal("daily", "weekly", "monthly"),
  rotationOrder: Schema.Literal("manual", "random", "sequential"),
  currentRound: Schema.Number.pipe(Schema.int()),
  status: Schema.Literal("recruiting", "active", "completed", "cancelled"),
  serviceFeeRate: Schema.Number,
  isPrivate: Schema.Boolean,
  inviteCode: Schema.NullOr(Schema.String),
  startDate: Schema.NullOr(Schema.DateTimeUtc),
  nextPayoutDate: Schema.NullOr(Schema.DateTimeUtc),
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}

export type AjoGroup = typeof AjoGroupSchema.Type;

/**
 * Schema for create group response
 */
export class CreateGroupOutputSchema extends Schema.Class<CreateGroupOutputSchema>(
  "CreateGroupOutputSchema"
)({
  groupId: Schema.UUID,
  inviteCode: Schema.String,
  status: Schema.Literal("success", "error"),
  message: Schema.String,
}) {}

export type CreateGroupOutput = typeof CreateGroupOutputSchema.Type;

/**
 * Schema for join group response
 */
export class JoinGroupOutputSchema extends Schema.Class<JoinGroupOutputSchema>(
  "JoinGroupOutputSchema"
)({
  memberId: Schema.UUID,
  groupId: Schema.UUID,
  status: Schema.Literal("success", "error"),
  message: Schema.String,
}) {}

export type JoinGroupOutput = typeof JoinGroupOutputSchema.Type;

/**
 * Schema for group contribution response
 */
export class MakeGroupContributionOutputSchema extends Schema.Class<MakeGroupContributionOutputSchema>(
  "MakeGroupContributionOutputSchema"
)({
  transactionId: Schema.UUID,
  status: Schema.Literal("success", "pending", "failed"),
  message: Schema.optional(Schema.String),
}) {}

export type MakeGroupContributionOutput =
  typeof MakeGroupContributionOutputSchema.Type;

/**
 * Schema for group details with members
 */
export class GetGroupDetailsOutputSchema extends Schema.Class<GetGroupDetailsOutputSchema>(
  "GetGroupDetailsOutputSchema"
)({
  group: AjoGroupSchema,
  members: Schema.Array(GroupMemberSchema),
  currentMember: Schema.NullOr(GroupMemberSchema),
  totalCollected: Schema.Number,
  userMembership: Schema.NullOr(GroupMemberSchema),
}) {}

export type GetGroupDetailsOutput = typeof GetGroupDetailsOutputSchema.Type;

/**
 * Schema for list groups response
 */
export class ListGroupsOutputSchema extends Schema.Class<ListGroupsOutputSchema>(
  "ListGroupsOutputSchema"
)({
  groups: Schema.Array(AjoGroupSchema),
  total: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  hasMore: Schema.Boolean,
}) {}

export type ListGroupsOutput = typeof ListGroupsOutputSchema.Type;

/**
 * Schema for group contribution history
 */
export class GroupContributionSchema extends Schema.Class<GroupContributionSchema>(
  "GroupContributionSchema"
)({
  id: Schema.UUID,
  groupId: Schema.UUID,
  memberId: Schema.UUID,
  amount: Schema.Number,
  round: Schema.Number.pipe(Schema.int()),
  status: Schema.Literal("pending", "completed", "failed"),
  createdAt: Schema.DateTimeUtc,
}) {}

export type GroupContribution = typeof GroupContributionSchema.Type;

/**
 * Schema for group payout details
 */
export class GroupPayoutSchema extends Schema.Class<GroupPayoutSchema>(
  "GroupPayoutSchema"
)({
  id: Schema.UUID,
  groupId: Schema.UUID,
  recipientId: Schema.UUID,
  amount: Schema.Number,
  serviceFee: Schema.Number,
  netAmount: Schema.Number,
  round: Schema.Number.pipe(Schema.int()),
  status: Schema.Literal("pending", "completed", "failed"),
  paidAt: Schema.NullOr(Schema.DateTimeUtc),
  createdAt: Schema.DateTimeUtc,
}) {}

export type GroupPayout = typeof GroupPayoutSchema.Type;
