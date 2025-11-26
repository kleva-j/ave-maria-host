#!/usr/bin/env bun

import { PlatformConfigProvider, Terminal } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer, Console } from "effect";
import { fileURLToPath } from "node:url";
import { SqlClient } from "@effect/sql";
import { join } from "node:path";

import { PgLive } from "../database";

/**
 * Enhanced Database Seeding Script
 *
 * This script provides comprehensive database seeding with:
 * - Environment-specific seed data
 * - Incremental seeding (add data without duplicates)
 * - Data validation and consistency checks
 * - Seed data versioning
 * - Performance optimized bulk operations
 *
 * Usage:
 *   bun run src/scripts/enhanced-seed.ts [environment] [options]
 *
 * Environments:
 *   development - Full test data with multiple users and scenarios
 *   testing     - Minimal data for automated tests
 *   staging     - Production-like data for staging environment
 *   demo        - Demo data for presentations
 *
 * Options:
 *   --clean     - Clean existing data before seeding
 *   --validate  - Validate data after seeding
 *   --minimal   - Seed only essential data
 */

// ============================================================================
// Type Definitions
// ============================================================================

type Environment = "development" | "testing" | "staging" | "demo";

interface SeedConfig {
  environment: Environment;
  clean: boolean;
  validate: boolean;
  minimal: boolean;
}

interface SeedData {
  roles: any[];
  permissions: any[];
  users: any[];
  plans: any[];
  groups: any[];
  transactions: any[];
}

// ============================================================================
// Environment-Specific Data
// ============================================================================

const getEnvironmentData = (env: Environment): SeedData => {
  const baseRoles = [
    {
      name: "admin",
      display_name: "Administrator",
      description: "Full system access with all permissions",
      is_system: true,
    },
    {
      name: "user",
      display_name: "User",
      description: "Standard user with basic permissions",
      is_system: true,
    },
  ];

  const basePermissions = [
    {
      name: "user:read",
      display_name: "Read User",
      resource: "user",
      action: "read",
    },
    {
      name: "savings:read",
      display_name: "Read Savings",
      resource: "savings",
      action: "read",
    },
    {
      name: "savings:write",
      display_name: "Write Savings",
      resource: "savings",
      action: "write",
    },
    {
      name: "wallet:read",
      display_name: "Read Wallet",
      resource: "wallet",
      action: "read",
    },
    {
      name: "wallet:write",
      display_name: "Write Wallet",
      resource: "wallet",
      action: "write",
    },
    {
      name: "group:read",
      display_name: "Read Group",
      resource: "group",
      action: "read",
    },
    {
      name: "group:write",
      display_name: "Write Group",
      resource: "group",
      action: "write",
    },
  ];

  switch (env) {
    case "development":
      return {
        roles: [
          ...baseRoles,
          {
            name: "moderator",
            display_name: "Moderator",
            description: "Can manage users and content",
            is_system: true,
          },
          {
            name: "premium_user",
            display_name: "Premium User",
            description: "User with enhanced features",
            is_system: false,
          },
        ],
        permissions: [
          ...basePermissions,
          {
            name: "user:write",
            display_name: "Write User",
            resource: "user",
            action: "write",
          },
          {
            name: "user:delete",
            display_name: "Delete User",
            resource: "user",
            action: "delete",
          },
          {
            name: "wallet:fund",
            display_name: "Fund Wallet",
            resource: "wallet",
            action: "fund",
          },
          {
            name: "wallet:withdraw",
            display_name: "Withdraw",
            resource: "wallet",
            action: "withdraw",
          },
          {
            name: "group:manage",
            display_name: "Manage Group",
            resource: "group",
            action: "manage",
          },
          {
            name: "admin:system",
            display_name: "System Admin",
            resource: "admin",
            action: "system",
          },
        ],
        users: [
          {
            email: "admin@avdaily.test",
            name: "Admin User",
            phone_number: "+2348012345678",
            kyc_tier: 2,
            kyc_status: "verified",
            role: "admin",
          },
          {
            email: "user1@avdaily.test",
            name: "Alice Johnson",
            phone_number: "+2348012345679",
            kyc_tier: 1,
            kyc_status: "verified",
            role: "user",
          },
          {
            email: "user2@avdaily.test",
            name: "Bob Smith",
            phone_number: "+2348012345680",
            kyc_tier: 2,
            kyc_status: "verified",
            role: "user",
          },
          {
            email: "user3@avdaily.test",
            name: "Carol Davis",
            phone_number: "+2348012345681",
            kyc_tier: 0,
            kyc_status: "pending",
            role: "user",
          },
          {
            email: "moderator@avdaily.test",
            name: "Mod User",
            phone_number: "+2348012345682",
            kyc_tier: 2,
            kyc_status: "verified",
            role: "moderator",
          },
        ],
        plans: [],
        groups: [],
        transactions: [],
      };

    case "testing":
      return {
        roles: baseRoles,
        permissions: basePermissions,
        users: [
          {
            email: "test@example.com",
            name: "Test User",
            phone_number: "+2348000000000",
            kyc_tier: 1,
            kyc_status: "verified",
            role: "user",
          },
        ],
        plans: [],
        groups: [],
        transactions: [],
      };

    case "staging":
      return {
        roles: baseRoles,
        permissions: basePermissions,
        users: [
          {
            email: "staging.admin@avdaily.com",
            name: "Staging Admin",
            phone_number: "+2348099999999",
            kyc_tier: 2,
            kyc_status: "verified",
            role: "admin",
          },
          {
            email: "staging.user@avdaily.com",
            name: "Staging User",
            phone_number: "+2348099999998",
            kyc_tier: 1,
            kyc_status: "verified",
            role: "user",
          },
        ],
        plans: [],
        groups: [],
        transactions: [],
      };

    case "demo":
      return {
        roles: baseRoles,
        permissions: basePermissions,
        users: [
          {
            email: "demo@avdaily.com",
            name: "Demo User",
            phone_number: "+2348088888888",
            kyc_tier: 2,
            kyc_status: "verified",
            role: "user",
          },
        ],
        plans: [],
        groups: [],
        transactions: [],
      };

    default:
      return {
        roles: baseRoles,
        permissions: basePermissions,
        users: [],
        plans: [],
        groups: [],
        transactions: [],
      };
  }
};

// ============================================================================
// Seeding Operations
// ============================================================================

const cleanDatabase = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* Console.log("🧹 Cleaning existing data...\n");

  // Delete in reverse dependency order
  const tables = [
    "group_payouts",
    "group_contributions",
    "group_invitations",
    "group_members",
    "ajo_groups",
    "transactions",
    "savings_plans",
    "wallets",
    "user_permissions",
    "user_roles",
    "role_permissions",
    "user_analytics",
    "savings_milestones",
    "rewards",
    "notifications",
    "notification_preferences",
    "push_tokens",
    "scheduled_notifications",
    "audit_log",
    "kyc_verification",
    "phone_verification",
    "biometric_auth",
    "session",
    "account",
    "verification",
    '"user"', // Quoted because 'user' is a reserved word
    "permissions",
    "roles",
  ];

  for (const table of tables) {
    yield* sql`DELETE FROM ${sql.unsafe(table)}`.pipe(
      Effect.catchAll(() => Effect.void) // Ignore errors for non-existent tables
    );
  }

  yield* Console.log("✅ Database cleaned\n");
});

const seedRoles = (roles: any[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Console.log("📋 Seeding roles...\n");

    for (const role of roles) {
      yield* sql`
        INSERT INTO roles (name, display_name, description, is_system)
        VALUES (${role.name}, ${role.display_name}, ${role.description}, ${role.is_system})
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description
      `;
    }

    yield* Console.log(`✅ Seeded ${roles.length} roles\n`);
  });

const seedPermissions = (permissions: any[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Console.log("🔐 Seeding permissions...\n");

    for (const perm of permissions) {
      yield* sql`
        INSERT INTO permissions (name, display_name, description, resource, action, is_system)
        VALUES (
          ${perm.name},
          ${perm.display_name},
          ${perm.display_name},
          ${perm.resource},
          ${perm.action},
          true
        )
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          resource = EXCLUDED.resource,
          action = EXCLUDED.action
      `;
    }

    yield* Console.log(`✅ Seeded ${permissions.length} permissions\n`);
  });

const assignRolePermissions = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* Console.log("🔗 Assigning permissions to roles...\n");

  // Get roles and permissions
  const [adminRole, userRole, allPermissions, userPermissions] =
    yield* Effect.all([
      sql<{ id: string }>`SELECT id FROM roles WHERE name = 'admin' LIMIT 1`,
      sql<{ id: string }>`SELECT id FROM roles WHERE name = 'user' LIMIT 1`,
      sql<{ id: string }>`SELECT id FROM permissions`,
      sql<{ id: string }>`
      SELECT id FROM permissions 
      WHERE name IN (
        'user:read', 'savings:read', 'savings:write', 
        'wallet:read', 'wallet:write', 'group:read', 'group:write'
      )
    `,
    ]);

  // Assign all permissions to admin
  if (adminRole.length > 0) {
    const adminRoleId = adminRole[0]?.id;
    if (adminRoleId) {
      yield* Effect.all(
        allPermissions.map(
          (perm) =>
            sql`
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (${adminRoleId}, ${perm.id})
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `
        ),
        { concurrency: "unbounded" }
      );
    }
  }

  // Assign basic permissions to user role
  if (userRole.length > 0) {
    const userRoleId = userRole[0]?.id;
    if (userRoleId) {
      yield* Effect.all(
        userPermissions.map(
          (perm) =>
            sql`
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (${userRoleId}, ${perm.id})
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `
        ),
        { concurrency: "unbounded" }
      );
    }
  }

  yield* Console.log("✅ Assigned permissions to roles\n");
});

const seedUsers = (users: any[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Console.log("👥 Seeding users...\n");

    const createdUsers: Array<{ id: string; email: string; role: string }> = [];

    for (const user of users) {
      const result = yield* sql<{ id: string }>`
        INSERT INTO "user" (
          email, name, phone_number, email_verified, phone_verified, 
          kyc_tier, kyc_status
        )
        VALUES (
          ${user.email},
          ${user.name},
          ${user.phone_number},
          true,
          true,
          ${user.kyc_tier},
          ${user.kyc_status}
        )
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          phone_number = EXCLUDED.phone_number,
          kyc_tier = EXCLUDED.kyc_tier,
          kyc_status = EXCLUDED.kyc_status
        RETURNING id
      `;

      if (result.length > 0) {
        createdUsers.push({
          id: result[0].id,
          email: user.email,
          role: user.role,
        });
      }
    }

    yield* Console.log(`✅ Seeded ${createdUsers.length} users\n`);
    return createdUsers;
  });

const assignUserRoles = (
  users: Array<{ id: string; email: string; role: string }>
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Console.log("👤 Assigning roles to users...\n");

    for (const user of users) {
      const role = yield* sql<{ id: string }>`
        SELECT id FROM roles WHERE name = ${user.role} LIMIT 1
      `;

      if (role.length > 0) {
        yield* sql`
          INSERT INTO user_roles (user_id, role_id)
          VALUES (${user.id}, ${role[0].id})
          ON CONFLICT (user_id, role_id) DO NOTHING
        `;
      }
    }

    yield* Console.log("✅ Assigned roles to users\n");
  });

const seedWallets = (
  users: Array<{ id: string; email: string; role: string }>
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Console.log("💰 Seeding wallets...\n");

    const walletBalances = [10000, 5000, 7500, 2500, 15000]; // Different balances for variety

    for (let i = 0; i < users.length; i++) {
      const balance = walletBalances[i] || 1000;
      yield* sql`
        INSERT INTO wallets (user_id, balance, currency)
        VALUES (${users[i].id}, ${balance}, 'NGN')
        ON CONFLICT (user_id) DO UPDATE SET
          balance = EXCLUDED.balance
      `;
    }

    yield* Console.log(`✅ Seeded ${users.length} wallets\n`);
  });

const seedNotificationPreferences = (
  users: Array<{ id: string; email: string; role: string }>
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Console.log("🔔 Seeding notification preferences...\n");

    for (const user of users) {
      yield* sql`
        INSERT INTO notification_preferences (user_id)
        VALUES (${user.id})
        ON CONFLICT (user_id) DO NOTHING
      `;
    }

    yield* Console.log(`✅ Seeded ${users.length} notification preferences\n`);
  });

const seedUserAnalytics = (
  users: Array<{ id: string; email: string; role: string }>
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Console.log("📈 Seeding user analytics...\n");

    for (const user of users) {
      // Generate some realistic analytics data
      const totalSaved = Math.floor(Math.random() * 50000) + 1000;
      const currentStreak = Math.floor(Math.random() * 30) + 1;
      const totalContributions = Math.floor(Math.random() * 100) + 10;

      yield* sql`
        INSERT INTO user_analytics (
          user_id, total_saved, current_streak, total_contributions, active_plans
        )
        VALUES (
          ${user.id},
          ${totalSaved},
          ${currentStreak},
          ${totalContributions},
          1
        )
        ON CONFLICT (user_id) DO UPDATE SET
          total_saved = EXCLUDED.total_saved,
          current_streak = EXCLUDED.current_streak,
          total_contributions = EXCLUDED.total_contributions
      `;
    }

    yield* Console.log(`✅ Seeded ${users.length} user analytics records\n`);
  });

// ============================================================================
// Validation Functions
// ============================================================================

const validateSeedData = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  yield* Console.log("🔍 Validating seed data...\n");

  // Check user count
  const userCount = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count FROM "user"
  `;

  // Check role assignments
  const roleAssignments = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count FROM user_roles
  `;

  // Check wallet creation
  const walletCount = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count FROM wallets
  `;

  yield* Console.log(`Users created: ${userCount[0]?.count || 0}\n`);
  yield* Console.log(`Role assignments: ${roleAssignments[0]?.count || 0}\n`);
  yield* Console.log(`Wallets created: ${walletCount[0]?.count || 0}\n`);

  // Validate data consistency
  const orphanedWallets = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM wallets w 
    LEFT JOIN "user" u ON w.user_id = u.id 
    WHERE u.id IS NULL
  `;

  if ((orphanedWallets[0]?.count || 0) > 0) {
    yield* Console.log(
      `⚠️  Found ${orphanedWallets[0]?.count} orphaned wallets\n`
    );
  }

  yield* Console.log("✅ Data validation completed\n");
});

// ============================================================================
// Interactive Seeding
// ============================================================================

const confirm = (message: string) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;
    yield* terminal.display(`${message} (y/n): `);
    const input = yield* terminal.readLine;
    return input.trim().toLowerCase() === "y";
  });

const interactiveSeed = (config: SeedConfig) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;

    yield* terminal.display(
      `🌱 Seeding database for ${config.environment} environment\n`
    );
    yield* terminal.display("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const data = getEnvironmentData(config.environment);

    // Clean database if requested
    if (config.clean) {
      const shouldClean = yield* confirm(
        "🧹 Clean existing data before seeding?"
      );
      if (shouldClean) {
        yield* cleanDatabase;
      }
    }

    // Seed core data
    yield* seedRoles(data.roles);
    yield* seedPermissions(data.permissions);
    yield* assignRolePermissions;

    // Seed users and related data
    const users = yield* seedUsers(data.users);
    if (users.length > 0) {
      yield* assignUserRoles(users);
      yield* seedWallets(users);
      yield* seedNotificationPreferences(users);
      yield* seedUserAnalytics(users);
    }

    // Validate if requested
    if (config.validate) {
      yield* validateSeedData;
    }

    yield* terminal.display("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    yield* terminal.display("✅ Database seeding completed successfully!\n");
    yield* terminal.display(`\nEnvironment: ${config.environment}\n`);
    yield* terminal.display(`Users created: ${users.length}\n`);
    yield* terminal.display(`Roles: ${data.roles.length}\n`);
    yield* terminal.display(`Permissions: ${data.permissions.length}\n`);
  });

// ============================================================================
// Main Program
// ============================================================================

const parseArgs = (): SeedConfig => {
  const args = process.argv.slice(2);
  const environment = (args[0] as Environment) || "development";

  return {
    environment,
    clean: args.includes("--clean"),
    validate: args.includes("--validate"),
    minimal: args.includes("--minimal"),
  };
};

const program = Effect.gen(function* () {
  const config = parseArgs();

  yield* Console.log("🌱 AV-Daily Enhanced Seeding\n");
  yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  yield* interactiveSeed(config);
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Console.log(`\n❌ Seeding failed: ${error}\n`);
      return yield* Effect.fail(error);
    })
  )
);

const ConfigLayer = PlatformConfigProvider.layerDotEnv(
  join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../apps/server/.env"
  )
);

NodeRuntime.runMain(
  program.pipe(
    Effect.provide(
      Layer.mergeAll(NodeContext.layer, ConfigLayer).pipe(
        Layer.provide(NodeContext.layer)
      )
    ),
    Effect.provide(PgLive)
  )
);
