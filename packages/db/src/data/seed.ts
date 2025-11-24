export const roles = [
  {
    name: "admin",
    display_name: "Administrator",
    description: "Full system access with all permissions",
    is_system: true,
  },
  {
    name: "moderator",
    display_name: "Moderator",
    description: "Can manage users and content",
    is_system: true,
  },
  {
    name: "user",
    display_name: "User",
    description: "Standard user with basic permissions",
    is_system: true,
  },
  {
    name: "premium_user",
    display_name: "Premium User",
    description: "User with enhanced features and limits",
    is_system: false,
  },
];

export const permissions = [
  // User permissions
  {
    name: "user:read",
    display_name: "Read User",
    resource: "user",
    action: "read",
  },
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

  // Savings permissions
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
    name: "savings:delete",
    display_name: "Delete Savings",
    resource: "savings",
    action: "delete",
  },

  // Wallet permissions
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
    name: "wallet:fund",
    display_name: "Fund Wallet",
    resource: "wallet",
    action: "fund",
  },
  {
    name: "wallet:withdraw",
    display_name: "Withdraw from Wallet",
    resource: "wallet",
    action: "withdraw",
  },

  // Group permissions
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
  {
    name: "group:delete",
    display_name: "Delete Group",
    resource: "group",
    action: "delete",
  },
  {
    name: "group:manage",
    display_name: "Manage Group",
    resource: "group",
    action: "manage",
  },

  // Admin permissions
  {
    name: "admin:users",
    display_name: "Manage Users",
    resource: "admin",
    action: "users",
  },
  {
    name: "admin:system",
    display_name: "Manage System",
    resource: "admin",
    action: "system",
  },
  {
    name: "admin:reports",
    display_name: "View Reports",
    resource: "admin",
    action: "reports",
  },
];

export const users = [
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
    name: "Test User 1",
    phone_number: "+2348012345679",
    kyc_tier: 1,
    kyc_status: "verified",
    role: "user",
  },
  {
    email: "user2@avdaily.test",
    name: "Test User 2",
    phone_number: "+2348012345680",
    kyc_tier: 2,
    kyc_status: "verified",
    role: "user",
  },
  {
    email: "user3@avdaily.test",
    name: "Test User 3",
    phone_number: "+2348012345681",
    kyc_tier: 0,
    kyc_status: "pending",
    role: "user",
  },
];

export const getPlans = (users: Array<{ id: string; email: string }>) => [
  {
    user_id: users[1]?.id ?? "",
    plan_name: "Emergency Fund",
    daily_amount: 100,
    cycle_duration: 90,
    target_amount: 9000,
    current_amount: 3000,
    auto_save_enabled: true,
    status: "active",
  },
  {
    user_id: users[1]?.id ?? "",
    plan_name: "Vacation Savings",
    daily_amount: 200,
    cycle_duration: 60,
    target_amount: 12000,
    current_amount: 5000,
    auto_save_enabled: false,
    status: "active",
  },
  {
    user_id: users[2]?.id ?? "",
    plan_name: "Business Capital",
    daily_amount: 500,
    cycle_duration: 120,
    target_amount: 60000,
    current_amount: 15000,
    auto_save_enabled: true,
    status: "active",
  },
];

export const getTransactions = (
  users: Array<{ id: string; email: string }>,
  plans: Array<{ id: string; user_id: string }>
) => [
  {
    user_id: users[1]?.id ?? "",
    plan_id: plans[0]?.id ?? "",
    amount: 100,
    type: "contribution",
    status: "completed",
    reference: `TXN-${Date.now()}-1`,
    description: "Daily contribution",
  },
  {
    user_id: users[1]?.id ?? "",
    plan_id: plans[1]?.id ?? "",
    amount: 200,
    type: "contribution",
    status: "completed",
    reference: `TXN-${Date.now()}-2`,
    description: "Daily contribution",
  },
  {
    user_id: users[2]?.id ?? "",
    plan_id: plans[2]?.id ?? "",
    amount: 500,
    type: "contribution",
    status: "completed",
    reference: `TXN-${Date.now()}-3`,
    description: "Daily contribution",
  },
  {
    user_id: users[1]?.id ?? "",
    plan_id: null,
    amount: 5000,
    type: "deposit",
    status: "completed",
    reference: `TXN-${Date.now()}-4`,
    description: "Wallet funding",
  },
];

export const getAjoGroups = (users: Array<{ id: string; email: string }>) => [
  {
    organizer_id: users[2]?.id ?? "",
    group_name: "Market Women Ajo",
    description: "Daily savings group for market traders",
    member_count: 10,
    current_member_count: 3,
    contribution_amount: 1000,
    contribution_frequency: "daily",
    rotation_order: "sequential",
    status: "recruiting",
  },
  {
    organizer_id: users[1]?.id ?? "",
    group_name: "Friends Esusu",
    description: "Weekly savings among friends",
    member_count: 5,
    current_member_count: 5,
    contribution_amount: 5000,
    contribution_frequency: "weekly",
    rotation_order: "random",
    status: "active",
  },
];

export const getAnalytics = (users: Array<{ id: string; email: string }>) => [
  {
    user_id: users[1]?.id ?? "",
    total_saved: 8000,
    current_streak: 15,
    total_contributions: 45,
  },
  {
    user_id: users[2]?.id ?? "",
    total_saved: 15000,
    current_streak: 30,
    total_contributions: 90,
  },
];
