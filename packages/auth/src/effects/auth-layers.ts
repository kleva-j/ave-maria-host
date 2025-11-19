import type { AuthService } from "./auth-service";

import { AuthServiceLive } from "./auth-service-live";

/**
 * Main authentication layer that provides all auth services
 */
export const AuthLayer = AuthServiceLive;

/**
 * Type alias for all authentication service dependencies
 */
export type AuthServices = typeof AuthService.Service;
