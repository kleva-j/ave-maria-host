/**
 * @fileoverview Migration Status Dashboard (Native)
 * 
 * This component shows the current migration status for React Native
 * and allows developers to monitor which endpoints are using @effect/rpc vs oRPC.
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';

import { FEATURE_FLAGS, shouldUseEffectRpc } from '../utils/feature-flags';

interface EndpointStatus {
  name: string;
  client: 'oRPC' | '@effect/rpc';
  enabled: boolean;
}

export function MigrationStatus() {
  const [isVisible, setIsVisible] = useState(false);
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>([]);

  useEffect(() => {
    // Only show in development
    if (__DEV__) {
      setIsVisible(true);
      
      const endpointStatus: EndpointStatus[] = [
        {
          name: 'Health Check',
          client: shouldUseEffectRpc('HEALTH_CHECK') ? '@effect/rpc' : 'oRPC',
          enabled: shouldUseEffectRpc('HEALTH_CHECK'),
        },
        {
          name: 'Todos',
          client: shouldUseEffectRpc('TODOS') ? '@effect/rpc' : 'oRPC',
          enabled: shouldUseEffectRpc('TODOS'),
        },
        {
          name: 'Authentication',
          client: shouldUseEffectRpc('AUTH') ? '@effect/rpc' : 'oRPC',
          enabled: shouldUseEffectRpc('AUTH'),
        },
      ];
      
      setEndpoints(endpointStatus);
    }
  }, []);

  if (!isVisible || !__DEV__) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Migration Status</Text>
        <TouchableOpacity
          onPress={() => setIsVisible(false)}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.globalStatus}>
          Global: {FEATURE_FLAGS.USE_EFFECT_RPC ? '@effect/rpc' : 'oRPC'}
        </Text>
        
        {endpoints.map((endpoint) => (
          <View key={endpoint.name} style={styles.endpointRow}>
            <Text style={styles.endpointName}>{endpoint.name}</Text>
            <View
              style={[
                styles.clientBadge,
                endpoint.client === '@effect/rpc' ? styles.effectBadge : styles.orpcBadge
              ]}
            >
              <Text
                style={[
                  styles.clientText,
                  endpoint.client === '@effect/rpc' ? styles.effectText : styles.orpcText
                ]}
              >
                {endpoint.client}
              </Text>
            </View>
          </View>
        ))}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Logging: {FEATURE_FLAGS.LOG_MIGRATION_USAGE ? 'ON' : 'OFF'}
        </Text>
        <Text style={styles.footerText}>
          Debug: {FEATURE_FLAGS.DEBUG_RPC_CALLS ? 'ON' : 'OFF'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    maxWidth: 250,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: '#6B7280',
  },
  content: {
    marginBottom: 12,
  },
  globalStatus: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  endpointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  endpointName: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  clientBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  effectBadge: {
    backgroundColor: '#D1FAE5',
  },
  orpcBadge: {
    backgroundColor: '#DBEAFE',
  },
  clientText: {
    fontSize: 10,
    fontWeight: '500',
  },
  effectText: {
    color: '#065F46',
  },
  orpcText: {
    color: '#1E40AF',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
});

/**
 * Hook to get migration statistics
 */
export function useMigrationStats() {
  const totalEndpoints = Object.keys(FEATURE_FLAGS.EFFECT_RPC_ENDPOINTS).length;
  const migratedEndpoints = Object.values(FEATURE_FLAGS.EFFECT_RPC_ENDPOINTS).filter(Boolean).length;
  const migrationPercentage = (migratedEndpoints / totalEndpoints) * 100;
  
  return {
    totalEndpoints,
    migratedEndpoints,
    migrationPercentage,
    isFullyMigrated: FEATURE_FLAGS.USE_EFFECT_RPC || migrationPercentage === 100,
    isPartiallyMigrated: migrationPercentage > 0 && migrationPercentage < 100,
  };
}
