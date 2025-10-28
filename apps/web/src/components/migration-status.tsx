/**
 * @fileoverview Migration Status Dashboard
 *
 * This component shows the current migration status and allows developers
 * to monitor which endpoints are using @effect/rpc vs oRPC.
 */

import { FEATURE_FLAGS, shouldUseEffectRpc } from "@/utils/feature-flags";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface EndpointStatus {
  name: string;
  client: "oRPC" | "@effect/rpc";
  enabled: boolean;
}

export function MigrationStatus() {
  const [isVisible, setIsVisible] = useState(false);
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>([]);

  useEffect(() => {
    // Only show in development
    if (import.meta.env.DEV) {
      setIsVisible(true);

      const endpointStatus: EndpointStatus[] = [
        {
          name: "Health Check",
          client: shouldUseEffectRpc("HEALTH_CHECK") ? "@effect/rpc" : "oRPC",
          enabled: shouldUseEffectRpc("HEALTH_CHECK"),
        },
        {
          name: "Todos",
          client: shouldUseEffectRpc("TODOS") ? "@effect/rpc" : "oRPC",
          enabled: shouldUseEffectRpc("TODOS"),
        },
        {
          name: "Authentication",
          client: shouldUseEffectRpc("AUTH") ? "@effect/rpc" : "oRPC",
          enabled: shouldUseEffectRpc("AUTH"),
        },
      ];

      setEndpoints(endpointStatus);
    }
  }, []);

  if (!isVisible || !import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Migration Status
        </h3>
        <Button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ×
        </Button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Global: {FEATURE_FLAGS.USE_EFFECT_RPC ? "@effect/rpc" : "oRPC"}
        </div>

        {endpoints.map((endpoint) => (
          <div
            key={endpoint.name}
            className="flex items-center justify-between text-xs"
          >
            <span className="text-gray-700 dark:text-gray-300">
              {endpoint.name}
            </span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                endpoint.client === "@effect/rpc"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              }`}
            >
              {endpoint.client}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Logging: {FEATURE_FLAGS.LOG_MIGRATION_USAGE ? "ON" : "OFF"}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Debug: {FEATURE_FLAGS.DEBUG_RPC_CALLS ? "ON" : "OFF"}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to get migration statistics
 */
export function useMigrationStats() {
  const totalEndpoints = Object.keys(FEATURE_FLAGS.EFFECT_RPC_ENDPOINTS).length;
  const migratedEndpoints = Object.values(
    FEATURE_FLAGS.EFFECT_RPC_ENDPOINTS
  ).filter(Boolean).length;
  const migrationPercentage = (migratedEndpoints / totalEndpoints) * 100;

  return {
    totalEndpoints,
    migratedEndpoints,
    migrationPercentage,
    isFullyMigrated:
      FEATURE_FLAGS.USE_EFFECT_RPC || migrationPercentage === 100,
    isPartiallyMigrated: migrationPercentage > 0 && migrationPercentage < 100,
  };
}
