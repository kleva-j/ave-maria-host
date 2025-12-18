import type { PermissionIdType } from "@host/shared";

import { PermissionIdSchema } from "@host/shared";
import { Schema } from "effect";

/**
 * Permission entity representing a granular permission in the system
 */
export class Permission extends Schema.Class<Permission>("Permission")({
  id: PermissionIdSchema.annotations({
    description: "Unique identifier for the permission",
  }),
  name: Schema.String.annotations({
    description: "Unique name of the permission (e.g., 'savings:read')",
  }),
  displayName: Schema.String.annotations({
    description: "Human-readable name of the permission",
  }),
  description: Schema.NullOr(Schema.String).annotations({
    description: "Description of the permission",
  }),
  resource: Schema.String.annotations({
    description: "Resource the permission applies to (e.g., 'savings')",
  }),
  action: Schema.String.annotations({
    description: "Action allowed on the resource (e.g., 'read')",
  }),
  isSystem: Schema.Boolean.annotations({
    description: "Whether this is a system permission",
  }),
  createdAt: Schema.Date.annotations({
    description: "When the permission was created",
  }),
  updatedAt: Schema.Date.annotations({
    description: "When the permission was last updated",
  }),
}) {
  /**
   * Create a new Permission instance
   */
  static create(params: {
    id: PermissionIdType;
    name: string;
    displayName: string;
    description?: string | null;
    resource: string;
    action: string;
    isSystem?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): Permission {
    return new Permission({
      id: params.id,
      name: params.name,
      displayName: params.displayName,
      description: params.description ?? null,
      resource: params.resource,
      action: params.action,
      isSystem: params.isSystem ?? false,
      createdAt: params.createdAt ?? new Date(),
      updatedAt: params.updatedAt ?? new Date(),
    });
  }
}
