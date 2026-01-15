import { BooleanSchema, DateSchema } from "./common-schemas";
import { Schema } from "effect";
import {
  PermissionIdSchema,
  ResourceIdSchema,
  ActionIdSchema,
  RoleIdSchema,
  UserIdSchema,
} from "./id-schemas";

export const PermissionSchema = Schema.Struct({
  id: PermissionIdSchema,
  name: Schema.String,
  description: Schema.optional(Schema.String),
  resource: Schema.String,
  action: Schema.String,
});

export const RoleSchema = Schema.Struct({
  id: RoleIdSchema,
  name: Schema.String,
  description: Schema.optional(Schema.String),
  permissions: Schema.Array(PermissionSchema),
  isSystem: BooleanSchema,
});

export const UserRoleSchema = Schema.Struct({
  id: RoleIdSchema,
  userId: UserIdSchema,
  roleId: RoleIdSchema,
  assignedBy: UserIdSchema,
  assignedAt: DateSchema,
  expiresAt: Schema.optional(DateSchema),
});

export const UserPermissionSchema = Schema.Struct({
  id: PermissionIdSchema,
  userId: UserIdSchema,
  permissionId: PermissionIdSchema,
  assignedBy: UserIdSchema,
  assignedAt: DateSchema,
  expiresAt: Schema.optional(DateSchema),
});

export const ResourceSchema = Schema.Struct({
  id: ResourceIdSchema,
  name: Schema.String,
  description: Schema.optional(Schema.String),
});

export const ActionSchema = Schema.Struct({
  id: ActionIdSchema,
  name: Schema.String,
  description: Schema.optional(Schema.String),
});
