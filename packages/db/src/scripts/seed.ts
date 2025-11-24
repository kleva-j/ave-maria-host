import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Terminal } from "@effect/platform";
import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

import {
  getTransactions,
  getAjoGroups,
  getAnalytics,
  permissions,
  getPlans,
  roles,
  users,
} from "../data/seed";

import { PgLive } from "../database";

/**
 * Database Seeding Script
 *
 * This script populates the database with initial data for development and testing.
 * It creates:
 * - System roles and permissions
 * - Test users with different KYC tiers
 * - Sample savings plans
 * - Sample Ajo groups
 * - Sample transactions
 * - Notification preferences
 */

// ============================================================================
// Type Definitions
// ============================================================================

type User = { id: string; email: string; role: string };
type Plan = { id: string; user_id: string };
type Group = { id: string; organizer_id: string };

// ============================================================================
// Seeding Functions
// ============================================================================

const seedRoles = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* Effect.log("Seeding system roles...");

  for (const role of roles) {
    yield* sql`
      INSERT INTO roles (name, display_name, description, is_system)
      VALUES (${role.name}, ${role.display_name}, ${role.description}, ${role.is_system})
      ON CONFLICT (name) DO NOTHING
    `;
  }

  yield* Effect.log(`✓ Seeded ${roles.length} roles`);
});

const seedPermissions = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* Effect.log("Seeding system permissions...");

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
      ON CONFLICT (name) DO NOTHING
    `;
  }

  yield* Effect.log(`✓ Seeded ${permissions.length} permissions`);
});

const seedRolePermissions = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* Effect.log("Assigning permissions to roles...");

  const [adminRole, userRole, allPermissions, userPermissions] =
    yield* Effect.all([
      sql<{ id: string }>`SELECT id FROM roles WHERE name = 'admin' LIMIT 1`,
      sql<{ id: string }>`SELECT id FROM roles WHERE name = 'user' LIMIT 1`,
      sql<{ id: string }>`SELECT id FROM permissions`,
      sql<{ id: string }>`
      SELECT id FROM permissions 
      WHERE name IN (
        'user:read', 'savings:read', 'savings:write', 
        'wallet:read', 'wallet:write', 'wallet:fund', 'wallet:withdraw',
        'group:read', 'group:write'
      )
    `,
    ]);

  // Assign all permissions to admin
  if (adminRole.length > 0) {
    const adminRoleId = adminRole[0]?.id;

    if (!adminRoleId) throw new Error("Admin role not found");

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

  // Assign user permissions to user role
  if (userRole.length > 0) {
    const userRoleId = userRole[0]?.id;

    if (!userRoleId) throw new Error("User role not found");

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

  yield* Effect.log("✓ Assigned permissions to roles");
});

const seedUsers = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* Effect.log("Seeding test users...");

  const createdUsers: User[] = [];

  for (const user of users) {
    const { name, email, phone_number, kyc_status, kyc_tier } = user;

    const result = yield* sql<{ id: string }>`
      INSERT INTO "user" (email, name, phone_number, email_verified, phone_verified, kyc_tier, kyc_status)
      VALUES (
        ${email},
        ${name},
        ${phone_number},
        true,
        true,
        ${kyc_tier},
        ${kyc_status}
      )
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        phone_number = EXCLUDED.phone_number,
        kyc_tier = EXCLUDED.kyc_tier,
        kyc_status = EXCLUDED.kyc_status
      RETURNING *
    `;

    if (result.length > 0) {
      const resultId = result[0];

      if (!resultId) throw new Error("User not found");

      createdUsers.push({ id: resultId.id, email, role: user.role });
    }
  }

  yield* Effect.log(`✓ Seeded ${createdUsers.length} users`);
  return createdUsers;
});

const seedUserRoles = (users: User[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Effect.log("Assigning roles to users...");

    for (const user of users) {
      const role = yield* sql<{ id: string }>`
        SELECT id FROM roles WHERE name = ${user.role} LIMIT 1
      `;

      if (role.length > 0) {
        const roleId = role[0]?.id;

        if (!roleId) throw new Error("Role not found");

        yield* sql`
          INSERT INTO user_roles (user_id, role_id)
          VALUES (${user.id}, ${roleId})
          ON CONFLICT (user_id, role_id) DO NOTHING
        `;
      }
    }

    yield* Effect.log("✓ Assigned roles to users");
  });

const seedWallets = (users: User[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Effect.log("Seeding wallets...");

    const walletBalances = [5000, 10000, 2500, 1000];

    for (let i = 0; i < users.length; i++) {
      yield* sql`
        INSERT INTO wallets (user_id, balance, currency)
        VALUES (${users[i].id}, ${walletBalances[i]}, 'NGN')
        ON CONFLICT (user_id) DO UPDATE SET
          balance = EXCLUDED.balance
      `;
    }

    yield* Effect.log(`✓ Seeded ${users.length} wallets`);
  });

const seedSavingsPlans = (users: User[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Effect.log("Seeding savings plans...");

    const plans = yield* Effect.sync(() => getPlans(users));
    const createdPlans: Plan[] = [];

    for (const plan of plans) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.cycle_duration);

      const result = yield* sql<{ id: string }>`
        INSERT INTO savings_plans (
          user_id, plan_name, daily_amount, cycle_duration, target_amount,
          current_amount, auto_save_enabled, status, start_date, end_date
        )
        VALUES (
          ${plan.user_id},
          ${plan.plan_name},
          ${plan.daily_amount},
          ${plan.cycle_duration},
          ${plan.target_amount},
          ${plan.current_amount},
          ${plan.auto_save_enabled ?? false},
          ${plan.status},
          ${startDate.toISOString().split("T")[0]},
          ${endDate.toISOString().split("T")[0]}
        )
        RETURNING id
      `;

      if (result.length > 0) {
        createdPlans.push({ id: result[0].id, user_id: plan.user_id });
      }
    }

    yield* Effect.log(`✓ Seeded ${createdPlans.length} savings plans`);
    return createdPlans;
  });

const seedTransactions = (users: User[], plans: Plan[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Effect.log("Seeding transactions...");

    const transactions = yield* Effect.sync(() =>
      getTransactions(users, plans)
    );

    for (const txn of transactions) {
      yield* sql`
        INSERT INTO transactions (
          user_id, plan_id, amount, type, status, reference, description, completed_at
        )
        VALUES (
          ${txn.user_id},
          ${txn.plan_id},
          ${txn.amount},
          ${txn.type},
          ${txn.status},
          ${txn.reference},
          ${txn.description},
          ${new Date().toISOString()}
        )
        ON CONFLICT (reference) DO NOTHING
      `;
    }

    yield* Effect.log(`✓ Seeded ${transactions.length} transactions`);
  });

const seedAjoGroups = (users: User[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Effect.log("Seeding Ajo groups...");

    const groups = yield* Effect.sync(() => getAjoGroups(users));
    const createdGroups: Group[] = [];

    for (const group of groups) {
      const startDate = new Date();
      const inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const result = yield* sql<{ id: string }>`
        INSERT INTO ajo_groups (
          organizer_id, group_name, description, member_count, current_member_count,
          contribution_amount, contribution_frequency, rotation_order, status,
          start_date, invite_code
        )
        VALUES (
          ${group.organizer_id},
          ${group.group_name},
          ${group.description},
          ${group.member_count},
          ${group.current_member_count},
          ${group.contribution_amount},
          ${group.contribution_frequency},
          ${group.rotation_order},
          ${group.status},
          ${startDate.toISOString().split("T")[0]},
          ${inviteCode}
        )
        RETURNING id
      `;

      if (result.length > 0) {
        createdGroups.push({
          id: result[0].id,
          organizer_id: group.organizer_id,
        });
      }
    }

    yield* Effect.log(`✓ Seeded ${createdGroups.length} Ajo groups`);
    return createdGroups;
  });

const seedGroupMembers = (users: User[], groups: Group[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Effect.log("Seeding group members...");

    // Add organizers as members
    for (const group of groups) {
      yield* sql`
        INSERT INTO group_members (group_id, user_id, role, position, status)
        VALUES (${group.id}, ${group.organizer_id}, 'organizer', 1, 'active')
        ON CONFLICT (group_id, user_id) DO NOTHING
      `;
    }

    // Add other members to second group
    if (groups.length > 1) {
      const otherUsers = users
        .filter((u) => u.id !== groups[1].organizer_id)
        .slice(0, 4);

      for (let i = 0; i < otherUsers.length; i++) {
        yield* sql`
          INSERT INTO group_members (group_id, user_id, role, position, status)
          VALUES (${groups[1].id}, ${otherUsers[i].id}, 'member', ${i + 2}, 'active')
          ON CONFLICT (group_id, user_id) DO NOTHING
        `;
      }
    }

    yield* Effect.log("✓ Seeded group members");
  });

const seedNotificationPreferences = (users: User[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Effect.log("Seeding notification preferences...");

    for (const user of users) {
      yield* sql`
        INSERT INTO notification_preferences (user_id)
        VALUES (${user.id})
        ON CONFLICT (user_id) DO NOTHING
      `;
    }

    yield* Effect.log(`✓ Seeded ${users.length} notification preferences`);
  });

const seedUserAnalytics = (users: User[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    yield* Effect.log("Seeding user analytics...");

    const analytics = yield* Effect.sync(() => getAnalytics(users));

    for (const analytic of analytics) {
      yield* sql`
        INSERT INTO user_analytics (
          user_id, total_saved, current_streak, total_contributions, active_plans
        )
        VALUES (
          ${analytic.user_id},
          ${analytic.total_saved},
          ${analytic.current_streak},
          ${analytic.total_contributions},
          1
        )
        ON CONFLICT (user_id) DO UPDATE SET
          total_saved = EXCLUDED.total_saved,
          current_streak = EXCLUDED.current_streak,
          total_contributions = EXCLUDED.total_contributions
      `;
    }

    yield* Effect.log(`✓ Seeded ${analytics.length} user analytics records`);
  });

// ============================================================================
// Interactive Helpers
// ============================================================================

const confirm = (message: string) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;
    yield* terminal.display(`\n${message} (y/n): `);
    const input = yield* terminal.readLine;
    yield* terminal.display(`\ninput: ${input}\n`);
    return input.trim().toLowerCase() === "y";
  });

type SeedStep<T = void> = {
  emoji: string;
  message: string;
  effect: Effect.Effect<T, unknown, SqlClient.SqlClient>;
  skipMessage: string;
};

const executeSeedStep = <T>(step: SeedStep<T>) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;

    if (yield* confirm(`${step.emoji} ${step.message}`)) {
      return yield* Effect.asSome(step.effect);
    }
    yield* terminal.display(`⏭️  ${step.skipMessage}\n`);
    return yield* Effect.succeedNone;
  });

// ============================================================================
// Main Seeding Program
// ============================================================================

const seedDatabase = Effect.gen(function* () {
  const terminal = yield* Terminal.Terminal;

  yield* terminal.display("🌱 Starting database seeding...\n");
  yield* terminal.display("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Seed roles
  yield* executeSeedStep({
    emoji: "📋",
    message: "Seed system roles?",
    effect: seedRoles,
    skipMessage: "Skipped seeding roles",
  });

  // Seed permissions
  yield* executeSeedStep({
    emoji: "🔐",
    message: "Seed system permissions?",
    effect: seedPermissions,
    skipMessage: "Skipped seeding permissions",
  });

  // Seed role permissions
  yield* executeSeedStep({
    emoji: "🔗",
    message: "Assign permissions to roles?",
    effect: seedRolePermissions,
    skipMessage: "Skipped assigning role permissions",
  });

  // Seed users
  const maybeUsers = yield* executeSeedStep({
    emoji: "👥",
    message: "Seed test users?",
    effect: seedUsers,
    skipMessage: "Skipped seeding users",
  });

  const newUsers = Effect.runSync(
    yield* Effect.match(maybeUsers, {
      onFailure: () => {
        return Effect.gen(function* () {
          yield* terminal.display(
            "⚠️  Warning: Skipping users will prevent subsequent operations\n"
          );
          return [] as User[];
        });
      },
      onSuccess: (users) => Effect.succeed(users),
    })
  );

  // Only proceed with user-dependent operations if users were created
  if (newUsers.length === 0) {
    yield* terminal.display("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    yield* terminal.display("⚠️  Seeding stopped: No users created\n");
    return;
  }

  // Seed user roles
  yield* executeSeedStep({
    emoji: "👤",
    message: "Assign roles to users?",
    effect: seedUserRoles(newUsers),
    skipMessage: "Skipped assigning user roles",
  });

  // Seed wallets
  yield* executeSeedStep({
    emoji: "💰",
    message: "Seed user wallets?",
    effect: seedWallets(newUsers),
    skipMessage: "Skipped seeding wallets",
  });

  // Seed savings plans
  const maybePlans = yield* executeSeedStep({
    emoji: "📊",
    message: "Seed savings plans?",
    effect: seedSavingsPlans(newUsers),
    skipMessage: "Skipped seeding savings plans",
  });

  const plans = Effect.runSync(
    yield* Effect.match(maybePlans, {
      onFailure: () => Effect.succeed([]),
      onSuccess: (plans) => Effect.succeed(plans),
    })
  );

  // Seed transactions (requires plans)
  if (plans.length > 0) {
    yield* executeSeedStep({
      emoji: "💳",
      message: "Seed transactions?",
      effect: seedTransactions(newUsers, plans),
      skipMessage: "Skipped seeding transactions",
    });
  }

  // Seed Ajo groups
  const maybeGroups = yield* executeSeedStep({
    emoji: "👨‍👩‍👧‍👦",
    message: "Seed Ajo groups?",
    effect: seedAjoGroups(newUsers),
    skipMessage: "Skipped seeding Ajo groups",
  });

  const groups = Effect.runSync(
    yield* Effect.match(maybeGroups, {
      onFailure: () => Effect.succeed([]),
      onSuccess: (groups) => Effect.succeed(groups),
    })
  );

  // Seed group members (requires groups)
  if (groups.length > 0) {
    yield* executeSeedStep({
      emoji: "👥",
      message: "Seed group members?",
      effect: seedGroupMembers(newUsers, groups),
      skipMessage: "Skipped seeding group members",
    });
  }

  // Seed notification preferences
  yield* executeSeedStep({
    emoji: "🔔",
    message: "Seed notification preferences?",
    effect: seedNotificationPreferences(newUsers),
    skipMessage: "Skipped seeding notification preferences",
  });

  // Seed user analytics
  yield* executeSeedStep({
    emoji: "📈",
    message: "Seed user analytics?",
    effect: seedUserAnalytics(newUsers),
    skipMessage: "Skipped seeding user analytics",
  });

  yield* terminal.display("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  yield* terminal.display("✅ Database seeding completed successfully!\n");
  yield* terminal.display("\n");
  yield* terminal.display("Test Users:\n");
  yield* terminal.display("  - admin@avdaily.test (Admin, KYC Tier 2)\n");
  yield* terminal.display("  - user1@avdaily.test (User, KYC Tier 1)\n");
  yield* terminal.display("  - user2@avdaily.test (User, KYC Tier 2)\n");
  yield* terminal.display(
    "  - user3@avdaily.test (User, KYC Tier 0 - Unverified)\n"
  );
});

// ============================================================================
// Script Entry Point
// ============================================================================

NodeRuntime.runMain(
  seedDatabase.pipe(Effect.provide([NodeContext.layer, PgLive]))
);
