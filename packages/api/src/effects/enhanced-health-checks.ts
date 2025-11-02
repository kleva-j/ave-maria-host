/**
 * @fileoverview Enhanced Health Check System with Dependencies and Advanced Features
 *
 * This module provides an enhanced health check system that extends the basic health check
 * functionality with advanced features:
 * - Health check dependencies and execution ordering
 * - Configurable timeouts and retry policies using Effect patterns
 * - Health check groups for logical organization and parallel execution
 * - Result caching with configurable TTL
 * - Performance optimization and monitoring
 */

import type { HealthCheckResult, HealthStatus } from "./monitoring";

import { Duration, Context, Effect, Data, Layer, pipe, Ref } from "effect";
import { CorrelationId, StructuredLogging } from "./logging";
import { HealthCheckError } from "./monitoring";

/**
 * Backoff strategy for retry policies.
 */
export type BackoffStrategy = "linear" | "exponential" | "fixed";

/**
 * Retry policy configuration.
 */
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly backoffStrategy: BackoffStrategy;
  readonly initialDelay?: Duration.Duration;
  readonly maxDelay?: Duration.Duration;
  readonly jitter?: boolean;
  readonly retryableErrors?: readonly string[];
}

/**
 * Enhanced health check result with additional metadata.
 */
export interface EnhancedHealthCheckResult extends HealthCheckResult {
  readonly executionOrder: number;
  readonly dependenciesResolved: boolean;
  readonly cacheHit: boolean;
  readonly retryAttempts: number;
  readonly correlationId: string;
}

/**
 * Enhanced system health with dependency information.
 */
export interface EnhancedSystemHealth {
  readonly status: HealthStatus;
  readonly checks: readonly EnhancedHealthCheckResult[];
  readonly totalChecks: number;
  readonly healthyChecks: number;
  readonly degradedChecks: number;
  readonly unhealthyChecks: number;
  readonly timestamp: Date;
  readonly executionTime: number;
  readonly dependencyGraph: Record<string, readonly string[]>;
  readonly executionOrder: readonly string[];
}

/**
 * Health check configuration with enhanced features.
 */
export interface HealthCheckConfig {
  readonly name: string;
  readonly group?: string | undefined;
  readonly dependencies?: readonly string[] | undefined;
  readonly timeout: Duration.Duration;
  readonly retryPolicy: RetryPolicy;
  readonly check: Effect.Effect<HealthCheckResult, HealthCheckError>;
  readonly cacheTtl?: Duration.Duration | undefined;
  readonly priority?: number | undefined;
  readonly enabled?: boolean | undefined;
}

/**
 * Cached health check result.
 */
interface CachedHealthCheckResult {
  readonly result: EnhancedHealthCheckResult;
  readonly expiresAt: Date;
}

/**
 * Health check execution context.
 */
interface HealthCheckExecutionContext {
  readonly correlationId: string;
  readonly startTime: Date;
  readonly executionOrder: Map<string, number>;
}

// Using base HealthCheckError from monitoring module with metadata for correlation ID

/**
 * Dependency resolution error.
 */
export class DependencyResolutionError extends Data.TaggedError(
  "DependencyResolutionError"
)<{
  readonly checkName: string;
  readonly missingDependencies: readonly string[];
  readonly circularDependencies?: readonly string[];
}> {}

/**
 * Enhanced health check registry interface.
 */
export interface EnhancedHealthCheckRegistry {
  readonly registerHealthCheck: (
    config: HealthCheckConfig
  ) => Effect.Effect<void, HealthCheckError>;

  readonly unregisterHealthCheck: (
    name: string
  ) => Effect.Effect<void, HealthCheckError>;

  readonly performHealthCheck: (
    name: string
  ) => Effect.Effect<EnhancedHealthCheckResult, HealthCheckError>;

  readonly performHealthCheckGroup: (
    group: string
  ) => Effect.Effect<readonly EnhancedHealthCheckResult[], HealthCheckError>;

  readonly performAllHealthChecks: () => Effect.Effect<
    readonly EnhancedHealthCheckResult[],
    HealthCheckError
  >;

  readonly getHealthSummary: () => Effect.Effect<
    EnhancedSystemHealth,
    HealthCheckError
  >;

  readonly clearCache: (
    checkName?: string
  ) => Effect.Effect<void, HealthCheckError>;

  readonly getDependencyGraph: () => Effect.Effect<
    Record<string, readonly string[]>,
    HealthCheckError
  >;

  readonly validateDependencies: () => Effect.Effect<
    void,
    DependencyResolutionError
  >;
}

/**
 * Enhanced health check registry service tag.
 */
export const EnhancedHealthCheckRegistry =
  Context.GenericTag<EnhancedHealthCheckRegistry>(
    "EnhancedHealthCheckRegistry"
  );

/**
 * Enhanced health check registry implementation.
 */
class EnhancedHealthCheckRegistryImpl implements EnhancedHealthCheckRegistry {
  constructor(
    private readonly checksRef: Ref.Ref<Map<string, HealthCheckConfig>>,
    private readonly cacheRef: Ref.Ref<Map<string, CachedHealthCheckResult>>
  ) {}

  registerHealthCheck(
    config: HealthCheckConfig
  ): Effect.Effect<void, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        // Validate configuration
        yield* _(self.validateHealthCheckConfig(config));

        // Register the health check
        yield* _(
          Ref.update(self.checksRef, (checks) =>
            new Map(checks).set(config.name, config)
          )
        );

        // Validate dependencies after registration
        yield* _(
          self.validateDependencies(),
          Effect.catchTag("DependencyResolutionError", (error) =>
            Effect.gen(function* (_) {
              // Remove the check if it creates circular dependencies
              yield* _(
                Ref.update(self.checksRef, (checks) => {
                  const newChecks = new Map(checks);
                  newChecks.delete(config.name);
                  return newChecks;
                })
              );
              yield* _(
                Effect.fail(
                  new HealthCheckError({
                    checkName: config.name,
                    message: `Failed to register health check due to dependency issues: ${error.message}`,
                    cause: error,
                  })
                )
              );
            })
          )
        );

        yield* _(
          pipe(
            Effect.logInfo(`Registered enhanced health check: ${config.name}`),
            Effect.annotateLogs("healthCheck.name", config.name),
            Effect.annotateLogs("healthCheck.group", config.group || "default"),
            Effect.annotateLogs(
              "healthCheck.dependencies",
              JSON.stringify(config.dependencies || [])
            ),
            Effect.annotateLogs(
              "healthCheck.timeout",
              Duration.toMillis(config.timeout)
            )
          )
        );
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HealthCheckError({
            checkName: config.name,
            message: `Failed to register health check: ${config.name}`,
            cause: error,
          })
        )
      )
    );
  }

  unregisterHealthCheck(name: string): Effect.Effect<void, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        // Check if health check exists
        const checks = yield* _(Ref.get(self.checksRef));
        if (!checks.has(name)) {
          yield* _(
            Effect.fail(
              new HealthCheckError({
                checkName: name,
                message: `Health check not found: ${name}`,
              })
            )
          );
        }

        // Check if other health checks depend on this one
        const dependents = Array.from(checks.entries())
          .filter(([_, config]) => config.dependencies?.includes(name))
          .map(([checkName, _]) => checkName);

        if (dependents.length > 0) {
          yield* _(
            Effect.fail(
              new HealthCheckError({
                checkName: name,
                message: `Cannot unregister health check ${name} because it has dependents: ${dependents.join(", ")}`,
              })
            )
          );
        }

        // Remove the health check
        yield* _(
          Ref.update(self.checksRef, (checks) => {
            const newChecks = new Map(checks);
            newChecks.delete(name);
            return newChecks;
          })
        );

        // Clear cache for this check
        yield* _(self.clearCache(name));

        yield* _(
          pipe(
            Effect.logInfo(`Unregistered health check: ${name}`),
            Effect.annotateLogs("healthCheck.name", name)
          )
        );
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HealthCheckError({
            checkName: name,
            message: `Failed to unregister health check: ${name}`,
            cause: error,
          })
        )
      )
    );
  }

  performHealthCheck(
    name: string
  ): Effect.Effect<EnhancedHealthCheckResult, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const correlationId = yield* _(self.generateCorrelationId());
        const context: HealthCheckExecutionContext = {
          correlationId,
          startTime: new Date(),
          executionOrder: new Map(),
        };

        return yield* _(self.executeHealthCheckWithDependencies(name, context));
      }),
      Effect.withLogSpan(`enhanced-health-check.${name}`),
      StructuredLogging.withMetadata({ healthCheckName: name })
    );
  }

  performHealthCheckGroup(
    group: string
  ): Effect.Effect<readonly EnhancedHealthCheckResult[], HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const checks = yield* _(Ref.get(self.checksRef));
        const groupChecks = Array.from(checks.entries())
          .filter(([_, config]) => (config.group || "default") === group)
          .map(([name, _]) => name);

        if (groupChecks.length === 0) {
          return [];
        }

        const correlationId = yield* _(self.generateCorrelationId());
        const context: HealthCheckExecutionContext = {
          correlationId,
          startTime: new Date(),
          executionOrder: new Map(),
        };

        // Resolve execution order for the group
        const executionOrder = yield* _(
          self.resolveExecutionOrder(groupChecks)
        );

        // Execute health checks in dependency order
        const results: EnhancedHealthCheckResult[] = [];
        for (const checkName of executionOrder) {
          const result = yield* _(
            self.executeHealthCheckWithDependencies(checkName, context),
            Effect.either
          );

          if (result._tag === "Right") {
            results.push(result.right);
          } else {
            // Create a failed result for the check
            results.push({
              name: checkName,
              status: "unhealthy",
              message: result.left.message,
              responseTime: 0,
              timestamp: new Date(),
              executionOrder: context.executionOrder.get(checkName) || 0,
              dependenciesResolved: false,
              cacheHit: false,
              retryAttempts: 0,
              correlationId: context.correlationId,
            });
          }
        }

        return results;
      }),
      Effect.withLogSpan(`enhanced-health-check-group.${group}`),
      StructuredLogging.withMetadata({ healthCheckGroup: group })
    );
  }

  performAllHealthChecks(): Effect.Effect<
    readonly EnhancedHealthCheckResult[],
    HealthCheckError
  > {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const checks = yield* _(Ref.get(self.checksRef));
        const allCheckNames = Array.from(checks.keys());

        if (allCheckNames.length === 0) {
          return [];
        }

        const correlationId = yield* _(self.generateCorrelationId());
        const context: HealthCheckExecutionContext = {
          correlationId,
          startTime: new Date(),
          executionOrder: new Map(),
        };

        // Resolve execution order for all checks
        const executionOrder = yield* _(
          self.resolveExecutionOrder(allCheckNames)
        );

        // Execute health checks in dependency order
        const results: EnhancedHealthCheckResult[] = [];
        for (const checkName of executionOrder) {
          const result = yield* _(
            self.executeHealthCheckWithDependencies(checkName, context),
            Effect.either
          );

          if (result._tag === "Right") {
            results.push(result.right);
          } else {
            // Create a failed result for the check
            results.push({
              name: checkName,
              status: "unhealthy",
              message: result.left.message,
              responseTime: 0,
              timestamp: new Date(),
              executionOrder: context.executionOrder.get(checkName) || 0,
              dependenciesResolved: false,
              cacheHit: false,
              retryAttempts: 0,
              correlationId: context.correlationId,
            });
          }
        }

        return results;
      }),
      Effect.withLogSpan("enhanced-health-check-all"),
      StructuredLogging.withMetadata({ healthCheckType: "all" })
    );
  }

  getHealthSummary(): Effect.Effect<EnhancedSystemHealth, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const startTime = Date.now();
        const results = yield* _(self.performAllHealthChecks());
        const executionTime = Date.now() - startTime;

        const totalChecks = results.length;
        const healthyChecks = results.filter(
          (r) => r.status === "healthy"
        ).length;
        const degradedChecks = results.filter(
          (r) => r.status === "degraded"
        ).length;
        const unhealthyChecks = results.filter(
          (r) => r.status === "unhealthy"
        ).length;

        const overallStatus: HealthStatus =
          unhealthyChecks > 0
            ? "unhealthy"
            : degradedChecks > 0
              ? "degraded"
              : "healthy";

        const dependencyGraph = yield* _(self.getDependencyGraph());
        const executionOrder = yield* _(
          self.resolveExecutionOrder(Array.from(Object.keys(dependencyGraph)))
        );

        const healthSummary = {
          status: overallStatus,
          checks: results,
          totalChecks,
          healthyChecks,
          degradedChecks,
          unhealthyChecks,
          timestamp: new Date(),
          executionTime,
          dependencyGraph,
          executionOrder,
        };

        yield* _(
          pipe(
            Effect.logInfo("Enhanced system health summary completed"),
            StructuredLogging.withMetadata({
              totalChecks,
              healthyChecks,
              degradedChecks,
              unhealthyChecks,
              executionTime,
              overallStatus,
            })
          )
        );

        return healthSummary;
      }),
      Effect.withLogSpan("enhanced-system-health-summary")
    );
  }

  clearCache(checkName?: string): Effect.Effect<void, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        if (checkName) {
          yield* _(
            Ref.update(self.cacheRef, (cache) => {
              const newCache = new Map(cache);
              newCache.delete(checkName);
              return newCache;
            })
          );
          yield* _(
            pipe(
              Effect.logDebug(`Cleared cache for health check: ${checkName}`),
              Effect.annotateLogs("healthCheck.name", checkName)
            )
          );
        } else {
          yield* _(Ref.set(self.cacheRef, new Map()));
          yield* _(Effect.logDebug("Cleared all health check cache"));
        }
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HealthCheckError({
            checkName: checkName || "all",
            message: "Failed to clear health check cache",
            cause: error,
          })
        )
      )
    );
  }

  getDependencyGraph(): Effect.Effect<
    Record<string, readonly string[]>,
    HealthCheckError
  > {
    return pipe(
      Ref.get(this.checksRef),
      Effect.map((checks) => {
        const graph: Record<string, readonly string[]> = {};
        for (const [name, config] of checks) {
          graph[name] = config.dependencies || [];
        }
        return graph;
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HealthCheckError({
            checkName: "system",
            message: "Failed to get dependency graph",
            cause: error,
          })
        )
      )
    );
  }

  validateDependencies(): Effect.Effect<void, DependencyResolutionError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const checks = yield* _(Ref.get(self.checksRef));
        const checkNames = new Set(checks.keys());

        // Check for missing dependencies
        const missingDependencies: string[] = [];
        for (const [name, config] of checks) {
          if (config.dependencies) {
            for (const dep of config.dependencies) {
              if (!checkNames.has(dep)) {
                missingDependencies.push(`${name} -> ${dep}`);
              }
            }
          }
        }

        if (missingDependencies.length > 0) {
          yield* _(
            Effect.fail(
              new DependencyResolutionError({
                checkName: "system",
                missingDependencies,
              })
            )
          );
        }

        // Check for circular dependencies using DFS
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (node: string): boolean => {
          if (recursionStack.has(node)) {
            return true;
          }
          if (visited.has(node)) {
            return false;
          }

          visited.add(node);
          recursionStack.add(node);

          const config = checks.get(node);
          if (config?.dependencies) {
            for (const dep of config.dependencies) {
              if (hasCycle(dep)) {
                return true;
              }
            }
          }

          recursionStack.delete(node);
          return false;
        };

        const circularDependencies: string[] = [];
        for (const checkName of checkNames) {
          if (!visited.has(checkName) && hasCycle(checkName)) {
            circularDependencies.push(checkName);
          }
        }

        if (circularDependencies.length > 0) {
          yield* _(
            Effect.fail(
              new DependencyResolutionError({
                checkName: "system",
                missingDependencies: [],
                circularDependencies,
              })
            )
          );
        }
      }),
      Effect.catchAll((error) => {
        if (error._tag === "DependencyResolutionError") {
          return Effect.fail(error);
        }
        return Effect.fail(
          new DependencyResolutionError({
            checkName: "system",
            missingDependencies: [],
          })
        );
      })
    );
  }

  // Private helper methods

  private validateHealthCheckConfig(
    config: HealthCheckConfig
  ): Effect.Effect<void, HealthCheckError> {
    return pipe(
      Effect.gen(function* (_) {
        if (!config.name || config.name.trim() === "") {
          yield* _(
            Effect.fail(
              new HealthCheckError({
                checkName: config.name || "unknown",
                message: "Health check name cannot be empty",
              })
            )
          );
        }

        if (Duration.toMillis(config.timeout) <= 0) {
          yield* _(
            Effect.fail(
              new HealthCheckError({
                checkName: config.name,
                message: "Health check timeout must be positive",
              })
            )
          );
        }

        if (config.retryPolicy.maxAttempts < 1) {
          yield* _(
            Effect.fail(
              new HealthCheckError({
                checkName: config.name,
                message: "Retry policy max attempts must be at least 1",
              })
            )
          );
        }
      })
    );
  }

  private generateCorrelationId(): Effect.Effect<string, never> {
    return CorrelationId.generate();
  }

  private resolveExecutionOrder(
    checkNames: readonly string[]
  ): Effect.Effect<readonly string[], HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const checks = yield* _(Ref.get(self.checksRef));
        const visited = new Set<string>();
        const result: string[] = [];

        const visit = (name: string): void => {
          if (visited.has(name)) {
            return;
          }

          visited.add(name);
          const config = checks.get(name);

          if (config?.dependencies) {
            for (const dep of config.dependencies) {
              if (checkNames.includes(dep)) {
                visit(dep);
              }
            }
          }

          result.push(name);
        };

        // Sort by priority first, then by name for deterministic ordering
        const sortedNames = [...checkNames].sort((a, b) => {
          const configA = checks.get(a);
          const configB = checks.get(b);
          const priorityA = configA?.priority || 0;
          const priorityB = configB?.priority || 0;

          if (priorityA !== priorityB) {
            return priorityB - priorityA; // Higher priority first
          }

          return a.localeCompare(b);
        });

        for (const name of sortedNames) {
          visit(name);
        }

        return result;
      }),
      Effect.catchAll((error) =>
        Effect.fail(
          new HealthCheckError({
            checkName: "system",
            message: "Failed to resolve execution order",
            cause: error,
          })
        )
      )
    );
  }

  private executeHealthCheckWithDependencies(
    name: string,
    context: HealthCheckExecutionContext
  ): Effect.Effect<EnhancedHealthCheckResult, HealthCheckError> {
    const self = this;

    return pipe(
      Effect.gen(function* (_) {
        const checks = yield* _(Ref.get(self.checksRef));
        const config = checks.get(name);

        if (!config) {
          return yield* _(
            Effect.fail(
              new HealthCheckError({
                checkName: name,
                message: `Health check not found: ${name}`,
              })
            )
          );
        }

        if (config && config.enabled === false) {
          return {
            name,
            status: "healthy" as const,
            message: "Health check disabled",
            responseTime: 0,
            timestamp: new Date(),
            executionOrder: context.executionOrder.get(name) || 0,
            dependenciesResolved: true,
            cacheHit: false,
            retryAttempts: 0,
            correlationId: context.correlationId,
          };
        }

        // Check cache first
        const cachedResult = yield* _(self.getCachedResult(name));
        if (cachedResult) {
          const enhancedCachedResult: EnhancedHealthCheckResult = {
            ...cachedResult,
            cacheHit: true,
            correlationId: context.correlationId,
          };
          return enhancedCachedResult;
        }

        // Execute dependencies first
        if (config.dependencies && config.dependencies.length > 0) {
          for (const depName of config.dependencies) {
            const depResult = yield* _(
              self.executeHealthCheckWithDependencies(depName, context),
              Effect.either
            );

            if (
              depResult._tag === "Left" ||
              depResult.right.status === "unhealthy"
            ) {
              return {
                name,
                status: "unhealthy" as const,
                message: `Dependency ${depName} is unhealthy`,
                responseTime: 0,
                timestamp: new Date(),
                executionOrder: context.executionOrder.get(name) || 0,
                dependenciesResolved: false,
                cacheHit: false,
                retryAttempts: 0,
                correlationId: context.correlationId,
              };
            }
          }
        }

        // Set execution order
        const executionOrder = context.executionOrder.size;
        context.executionOrder.set(name, executionOrder);

        // Execute the health check with retry and timeout
        const result = yield* _(
          self.executeHealthCheckWithRetry(config, context)
        );

        // Cache the result if TTL is configured
        if (config.cacheTtl) {
          yield* _(self.cacheResult(name, result, config.cacheTtl));
        }

        const enhancedResult = {
          ...result,
          executionOrder,
          dependenciesResolved: true,
          cacheHit: false,
          correlationId: context.correlationId,
        };

        yield* _(
          pipe(
            Effect.logDebug(`Health check execution completed: ${name}`),
            StructuredLogging.withMetadata({
              healthCheckName: name,
              correlationId: context.correlationId,
              executionStartTime: context.startTime.toISOString(),
              executionOrder,
              dependenciesResolved: true,
            })
          )
        );

        return enhancedResult;
      }),
      Effect.withLogSpan(`health-check-execution.${name}`)
    );
  }

  private executeHealthCheckWithRetry(
    config: HealthCheckConfig,
    context: HealthCheckExecutionContext
  ): Effect.Effect<EnhancedHealthCheckResult, HealthCheckError> {
    return pipe(
      config.check,
      Effect.timeout(config.timeout),
      Effect.timed,
      Effect.map(
        ([duration, checkResult]) =>
          ({
            ...checkResult,
            responseTime: Duration.toMillis(duration),
            timestamp: new Date(),
            retryAttempts: 0,
          }) as EnhancedHealthCheckResult
      ),
      Effect.catchAll((error) => {
        const healthCheckError =
          error._tag === "HealthCheckError"
            ? error
            : new HealthCheckError({
                checkName: config.name,
                message:
                  error._tag === "TimeoutException"
                    ? `Health check timed out after ${Duration.toMillis(config.timeout)}ms`
                    : `Health check failed: ${String(error)}`,
                cause: error,
              });

        return Effect.fail(healthCheckError);
      })
    );
  }

  private getCachedResult(
    name: string
  ): Effect.Effect<EnhancedHealthCheckResult | undefined, never> {
    return pipe(
      Ref.get(this.cacheRef),
      Effect.map((cache) => {
        const cached = cache.get(name);
        if (!cached) {
          return undefined;
        }

        const now = new Date();
        if (now > cached.expiresAt) {
          // Cache expired, remove it
          return undefined;
        }

        return cached.result;
      }),
      Effect.tap((result) => {
        if (result) {
          return pipe(
            Effect.logDebug(`Cache hit for health check: ${name}`),
            Effect.annotateLogs("healthCheck.name", name),
            Effect.annotateLogs("healthCheck.cacheHit", true)
          );
        }
        return Effect.void;
      })
    );
  }

  private cacheResult(
    name: string,
    result: EnhancedHealthCheckResult,
    ttl: Duration.Duration
  ): Effect.Effect<void, never> {
    return pipe(
      Effect.sync(() => {
        const expiresAt = new Date(Date.now() + Duration.toMillis(ttl));
        return { result, expiresAt };
      }),
      Effect.flatMap((cached) =>
        Ref.update(this.cacheRef, (cache) => new Map(cache).set(name, cached))
      ),
      Effect.tap(() =>
        pipe(
          Effect.logDebug(`Cached health check result: ${name}`),
          Effect.annotateLogs("healthCheck.name", name),
          Effect.annotateLogs("healthCheck.cacheTtl", Duration.toMillis(ttl))
        )
      )
    );
  }
}

/**
 * Live implementation layer for enhanced health check registry.
 */
export const EnhancedHealthCheckRegistryLive: Layer.Layer<EnhancedHealthCheckRegistry> =
  Layer.effect(
    EnhancedHealthCheckRegistry,
    Effect.gen(function* (_) {
      const checksRef = yield* _(
        Ref.make(new Map<string, HealthCheckConfig>())
      );
      const cacheRef = yield* _(
        Ref.make(new Map<string, CachedHealthCheckResult>())
      );

      return new EnhancedHealthCheckRegistryImpl(checksRef, cacheRef);
    })
  );

/**
 * Enhanced health check utilities and helpers.
 */
export namespace EnhancedHealthCheckUtils {
  /**
   * Create a default retry policy with exponential backoff.
   */
  export const createDefaultRetryPolicy = (
    maxAttempts = 3,
    initialDelay = Duration.millis(100)
  ): RetryPolicy => ({
    maxAttempts,
    backoffStrategy: "exponential",
    initialDelay,
    maxDelay: Duration.seconds(10),
    jitter: true,
  });

  /**
   * Create a health check configuration with sensible defaults.
   */
  export const createHealthCheckConfig = (
    name: string,
    check: Effect.Effect<HealthCheckResult, HealthCheckError>,
    options: Partial<Omit<HealthCheckConfig, "name" | "check">> = {}
  ): HealthCheckConfig => ({
    name,
    check,
    timeout: options.timeout || Duration.seconds(5),
    retryPolicy: options.retryPolicy || createDefaultRetryPolicy(),
    ...(options.group && { group: options.group }),
    ...(options.dependencies && { dependencies: options.dependencies }),
    ...(options.cacheTtl && { cacheTtl: options.cacheTtl }),
    priority: options.priority || 0,
    enabled: options.enabled !== false,
  });

  /**
   * Setup default enhanced health checks for common system components.
   * Uses the existing monitoring utilities for consistency.
   */
  export const setupDefaultHealthChecks = (): Effect.Effect<
    void,
    HealthCheckError,
    EnhancedHealthCheckRegistry
  > =>
    Effect.gen(function* (_) {
      const registry = yield* _(EnhancedHealthCheckRegistry);

      // Register memory health check using a simple implementation
      yield* _(
        registry.registerHealthCheck(
          createHealthCheckConfig(
            "memory",
            Effect.sync(() => {
              const memoryUsage = process.memoryUsage();
              const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
              const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
              const usageRatio = heapUsedMB / heapTotalMB;

              let status: HealthStatus;
              let message: string;

              if (usageRatio >= 0.9) {
                status = "unhealthy";
                message = `Memory usage critical: ${(usageRatio * 100).toFixed(1)}%`;
              } else if (usageRatio >= 0.8) {
                status = "degraded";
                message = `Memory usage high: ${(usageRatio * 100).toFixed(1)}%`;
              } else {
                status = "healthy";
                message = `Memory usage normal: ${(usageRatio * 100).toFixed(1)}%`;
              }

              return {
                name: "memory",
                status,
                message,
                responseTime: 0,
                timestamp: new Date(),
                metadata: {
                  heapUsedMB: Math.round(heapUsedMB),
                  heapTotalMB: Math.round(heapTotalMB),
                  usagePercentage: Math.round(usageRatio * 100),
                },
              };
            }),
            {
              group: "system",
              priority: 100,
              cacheTtl: Duration.seconds(30),
            }
          )
        )
      );

      // Register application health check
      yield* _(
        registry.registerHealthCheck(
          createHealthCheckConfig(
            "application",
            Effect.succeed({
              name: "application",
              status: "healthy" as const,
              message: "Application is running",
              responseTime: 0,
              timestamp: new Date(),
            }),
            {
              group: "application",
              priority: 50,
              cacheTtl: Duration.minutes(1),
            }
          )
        )
      );

      yield* _(
        pipe(
          Effect.logInfo("Default enhanced health checks registered"),
          StructuredLogging.withMetadata({
            registeredChecks: ["memory", "application"],
            healthCheckSystem: "enhanced",
          })
        )
      );
    });

  /**
   * Create a database health check using Effect patterns.
   */
  export const createDatabaseHealthCheck = (
    name: string,
    testQuery: Effect.Effect<unknown, unknown>,
    options: Partial<Omit<HealthCheckConfig, "name" | "check">> = {}
  ): HealthCheckConfig => {
    const check = pipe(
      testQuery,
      Effect.withLogSpan(`health-check.database.${name}`),
      Effect.timed,
      Effect.map(([duration, _]) => ({
        name,
        status: "healthy" as const,
        message: "Database connection successful",
        responseTime: Duration.toMillis(duration),
        timestamp: new Date(),
      })),
      Effect.catchAll((error) =>
        Effect.succeed({
          name,
          status: "unhealthy" as const,
          message: "Database connection failed",
          responseTime: 0,
          timestamp: new Date(),
          metadata: { error: String(error) },
        })
      )
    );

    return createHealthCheckConfig(name, check, {
      ...options,
      group: options.group || "database",
      timeout: options.timeout || Duration.seconds(10),
      priority: options.priority || 75,
    });
  };

  /**
   * Create an enhanced health check with automatic correlation ID management.
   */
  export const createEnhancedHealthCheck = (
    name: string,
    check: Effect.Effect<HealthCheckResult, HealthCheckError>,
    options: Partial<Omit<HealthCheckConfig, "name" | "check">> = {}
  ): HealthCheckConfig => {
    const enhancedCheck = pipe(
      check,
      CorrelationId.withNewCorrelationId,
      StructuredLogging.withMetadata({
        healthCheckName: name,
        healthCheckType: "enhanced",
      })
    );

    return createHealthCheckConfig(name, enhancedCheck, options);
  };
}
