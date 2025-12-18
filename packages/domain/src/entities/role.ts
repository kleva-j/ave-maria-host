import type { RoleId } from "@host/shared";

import { RoleIdSchema } from "@host/shared";
import { Schema } from "effect";

/**w
 * Role entity representing a user role in the system
 */
export class Role extends Schema.Class<Role>("Role")({
  id: RoleIdSchema.annotations({
    description: "Unique identifier for the role",
  }),
  name: Schema.String.annotations({
    description: "Unique name of the role (e.g., 'admin', 'user')",
  }),
  displayName: Schema.String.annotations({
    description: "Human-readable name of the role",
  }),
  description: Schema.NullOr(Schema.String).annotations({
    description: "Description of the role",
  }),
  isSystem: Schema.Boolean.annotations({
    description: "Whether this is a system role that cannot be deleted",
  }),
  createdAt: Schema.Date.annotations({
    description: "When the role was created",
  }),
  updatedAt: Schema.Date.annotations({
    description: "When the role was last updated",
  }),
}) {
  /**
   * Create a new Role instance
   */
  static create(params: {
    id: RoleId;
    name: string;
    displayName: string;
    description?: string | null;
    isSystem?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): Role {
    return new Role({
      id: params.id,
      name: params.name,
      displayName: params.displayName,
      description: params.description ?? null,
      isSystem: params.isSystem ?? false,
      createdAt: params.createdAt ?? new Date(),
      updatedAt: params.updatedAt ?? new Date(),
    });
  }
}
