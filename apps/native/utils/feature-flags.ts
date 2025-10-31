/**
 * @fileoverview Feature Flags for @effect/rpc Migration (Native)
 * 
 * This module provides feature flags to control the gradual rollout
 * of @effect/rpc integration while maintaining backward compatibility.
 */

/**
 * Feature flags configuration for React Native
 */
export const FEATURE_FLAGS = {
  /**
   * Enable @effect/rpc client instead of oRPC
   * When true, uses the new @effect/rpc client
   * When false, uses the existing oRPC client
   */
  USE_EFFECT_RPC: process.env.EXPO_PUBLIC_USE_EFFECT_RPC === 'true' || false,
  
  /**
   * Enable specific endpoint migrations
   * These allow granular control over which endpoints use @effect/rpc
   */
  EFFECT_RPC_ENDPOINTS: {
    TODOS: process.env.EXPO_PUBLIC_EFFECT_RPC_TODOS === 'true' || false,
    AUTH: process.env.EXPO_PUBLIC_EFFECT_RPC_AUTH === 'true' || false,
    HEALTH_CHECK: process.env.EXPO_PUBLIC_EFFECT_RPC_HEALTH === 'true' || false,
  },
  
  /**
   * Development and debugging flags
   */
  DEBUG_RPC_CALLS: process.env.EXPO_PUBLIC_DEBUG_RPC === 'true' || false,
  LOG_MIGRATION_USAGE: process.env.EXPO_PUBLIC_LOG_MIGRATION === 'true' || false,
} as const;

/**
 * Check if a specific feature is enabled
 */
export const isFeatureEnabled = (feature: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[feature] as boolean;
};

/**
 * Check if a specific endpoint should use @effect/rpc
 */
export const shouldUseEffectRpc = (endpoint: keyof typeof FEATURE_FLAGS.EFFECT_RPC_ENDPOINTS): boolean => {
  return FEATURE_FLAGS.USE_EFFECT_RPC || FEATURE_FLAGS.EFFECT_RPC_ENDPOINTS[endpoint];
};

/**
 * Log migration usage for analytics
 */
export const logMigrationUsage = (endpoint: string, client: 'orpc' | 'effect-rpc') => {
  if (FEATURE_FLAGS.LOG_MIGRATION_USAGE) {
    console.log(`[Migration] ${endpoint} using ${client} client`);
  }
};
