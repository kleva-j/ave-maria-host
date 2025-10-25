import { Layer } from "effect";

import { AuthServiceLive } from "./auth-service-live.js";
import { AuthService } from "./auth-service.js";

/**
 * Main authentication layer that provides all auth services
 */
export const AuthLayer = AuthServiceLive;

/**
 * Type alias for all authentication service dependencies
 */
export type AuthServices = typeof AuthService.Service;

/**
 * Test layer for authentication services (for testing purposes)
 */
export const AuthTestLayer = Layer.succeed(AuthService, {
  validateToken: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
  validateSession: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
  createSession: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
  revokeSession: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
  revokeAllUserSessions: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
  login: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
  register: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
  getUserById: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
  getUserByEmail: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
  updateUser: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
  checkPermission: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
  refreshSession: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
  getUserSessions: () => {
    throw new Error("Mock implementation - should be overridden in tests");
  },
} as AuthService);
