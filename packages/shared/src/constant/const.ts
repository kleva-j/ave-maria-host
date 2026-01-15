import { RESOURCES, DEFAULT_ROLES } from "./enums";

/**
 * Valid actions for each resource type in the system.
 * This acts as the source of truth for the permission system.
 */
export const RESOURCE_ACTIONS = {
  // System, Audit & Analytics
  [RESOURCES.AUDIT_LOG]: ["create", "read", "export"] as const,
  [RESOURCES.ANALYTICS]: ["read", "export"] as const,
  [RESOURCES.MILESTONE]: ["create", "read", "update", "delete"] as const,
  [RESOURCES.REWARDS]: ["create", "read", "update", "delete"] as const,

  // Authentication & Identity
  [RESOURCES.BIOMETRIC]: ["create", "read", "update", "delete", "activate", "deactivate"] as const,
  [RESOURCES.SESSION]: ["create", "read", "update", "delete", "revoke"] as const,
  [RESOURCES.ACCOUNT]: ["create", "read", "update", "delete", "deactivate"] as const,
  [RESOURCES.PHONE]: ["create", "read", "update", "delete", "verify"] as const,
  [RESOURCES.USER]: ["create", "read", "update", "delete", "suspend", "unsuspend"] as const,
  [RESOURCES.KYC]: [
    "create",
    "read",
    "update",
    "delete",
    "submit",
    "review",
    "approve",
    "reject",
  ] as const,

  // Finance & Banking
  [RESOURCES.CONTRIBUTION]: ["create", "read", "update", "delete"] as const,
  [RESOURCES.BANK_ACCOUNT]: ["create", "read", "update", "delete", "verify"] as const,
  [RESOURCES.SAVINGS_PLAN]: ["create", "read", "update", "delete", "pause", "resume"] as const,
  [RESOURCES.TRANSACTION]: ["create", "read", "delete", "export"] as const,
  [RESOURCES.WALLET]: [
    "create",
    "read",
    "update",
    "delete",
    "activate",
    "deactivate",
    "fund",
    "withdraw",
    "transfer",
  ] as const,

  // Authorization, Groups & Roles
  [RESOURCES.PERMISSION]: ["create", "read", "update", "delete"] as const,
  [RESOURCES.GROUP]: [
    "create",
    "read",
    "update",
    "delete",
    "suspend",
    "unsuspend",
    "join",
    "leave",
    "moderate",
  ] as const,
  [RESOURCES.ROLE]: ["create", "read", "update", "delete"] as const,
} as const;

export type ResourceActionMap = typeof RESOURCE_ACTIONS;

/**
 * Default permissions assigned to each system role.
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  [DEFAULT_ROLES.USER]: {
    resources: [
      RESOURCES.USER,
      RESOURCES.KYC,
      RESOURCES.CONTRIBUTION,
      RESOURCES.SAVINGS_PLAN,
      RESOURCES.TRANSACTION,
      RESOURCES.WALLET,
      RESOURCES.ANALYTICS,
      RESOURCES.GROUP,
      RESOURCES.REWARDS,
    ],
    permissions: [
      { resource: RESOURCES.USER, action: "read" },
      { resource: RESOURCES.USER, action: "update" },
      { resource: RESOURCES.KYC, action: "read" },
      { resource: RESOURCES.KYC, action: "submit" },
      { resource: RESOURCES.SAVINGS_PLAN, action: "read" },
      { resource: RESOURCES.SAVINGS_PLAN, action: "create" },
      { resource: RESOURCES.SAVINGS_PLAN, action: "update" },
      { resource: RESOURCES.CONTRIBUTION, action: "create" },
      { resource: RESOURCES.CONTRIBUTION, action: "read" },
      { resource: RESOURCES.TRANSACTION, action: "read" },
      { resource: RESOURCES.WALLET, action: "read" },
      { resource: RESOURCES.WALLET, action: "fund" },
      { resource: RESOURCES.WALLET, action: "withdraw" },
      { resource: RESOURCES.WALLET, action: "transfer" },
      { resource: RESOURCES.ANALYTICS, action: "read" },
      { resource: RESOURCES.GROUP, action: "read" },
      { resource: RESOURCES.GROUP, action: "join" },
      { resource: RESOURCES.GROUP, action: "leave" },
      { resource: RESOURCES.REWARDS, action: "read" },
    ],
  },
  [DEFAULT_ROLES.ADMIN]: {
    resources: Object.values(RESOURCES),
    permissions: [
      { resource: RESOURCES.USER, action: "unsuspend" },
      { resource: RESOURCES.USER, action: "suspend" },
      { resource: RESOURCES.USER, action: "update" },
      { resource: RESOURCES.USER, action: "read" },
      { resource: RESOURCES.KYC, action: "approve" },
      { resource: RESOURCES.KYC, action: "review" },
      { resource: RESOURCES.KYC, action: "reject" },
      { resource: RESOURCES.KYC, action: "read" },
      { resource: RESOURCES.TRANSACTION, action: "export" },
      { resource: RESOURCES.TRANSACTION, action: "read" },
      { resource: RESOURCES.ANALYTICS, action: "export" },
      { resource: RESOURCES.PERMISSION, action: "read" },
      { resource: RESOURCES.AUDIT_LOG, action: "read" },
      { resource: RESOURCES.ANALYTICS, action: "read" },
      { resource: RESOURCES.GROUP, action: "create" },
      { resource: RESOURCES.GROUP, action: "update" },
      { resource: RESOURCES.GROUP, action: "delete" },
      { resource: RESOURCES.GROUP, action: "read" },
      { resource: RESOURCES.ROLE, action: "read" },
    ],
  },
  [DEFAULT_ROLES.KYC_REVIEWER]: {
    resources: [RESOURCES.KYC, RESOURCES.USER],
    permissions: [
      { resource: RESOURCES.KYC, action: "approve" },
      { resource: RESOURCES.KYC, action: "review" },
      { resource: RESOURCES.KYC, action: "reject" },
      { resource: RESOURCES.USER, action: "read" },
      { resource: RESOURCES.KYC, action: "read" },
    ],
  },
  [DEFAULT_ROLES.SUPPORT]: {
    resources: [
      RESOURCES.CONTRIBUTION,
      RESOURCES.SAVINGS_PLAN,
      RESOURCES.TRANSACTION,
      RESOURCES.WALLET,
      RESOURCES.USER,
      RESOURCES.KYC,
    ],
    permissions: [
      { resource: RESOURCES.CONTRIBUTION, action: "read" },
      { resource: RESOURCES.SAVINGS_PLAN, action: "read" },
      { resource: RESOURCES.TRANSACTION, action: "read" },
      { resource: RESOURCES.WALLET, action: "read" },
      { resource: RESOURCES.USER, action: "read" },
      { resource: RESOURCES.KYC, action: "read" },
    ],
  },
} as const;
