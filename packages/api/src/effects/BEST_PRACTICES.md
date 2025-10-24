# Effect.ts Best Practices and Troubleshooting Guide

This guide provides comprehensive best practices for Effect.ts development, performance optimization patterns, debugging techniques, resource management strategies, and production deployment considerations.

## Table of Contents

- [Development Best Practices](#development-best-practices)
- [Performance Optimization Patterns](#performance-optimization-patterns)
- [Debugging and Troubleshooting](#debugging-and-troubleshooting)
- [Resource Management and Cleanup](#resource-management-and-cleanup)
- [Production Deployment Considerations](#production-deployment-considerations)
- [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
- [Monitoring and Observability](#monitoring-and-observability)
- [Security Considerations](#security-considerations)

## Development Best Practices

### 1. Effect Program Structure

#### Use Effect.gen for Complex Logic

```typescript
// ✅ Good: Use Effect.gen for readable async logic
const processUserOrder = (userId: string, orderData: OrderData) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    const auth = yield* _(AuthService);
    const logger = yield* _(LoggingService);
    
    // Validate user
    const user = yield* _(db.queryOne<User>(
      "SELECT * FROM users WHERE id = ?", 
      [userId]
    ));
    
    if (!user) {
      yield* _(Effect.fail(new NotFoundError({
        message: "User not found",
        resource: "User",
        id: userId
      })));
    }
    
    // Process order
    const order = yield* _(createOrder(user, orderData));
    
    // Log success
    yield* _(logger.info("Order processed", { 
      userId, 
      orderId: order.id 
    }));
    
    return order;
  });

// ❌ Avoid: Deeply nested pipe chains for complex logic
const processUserOrderBad = (userId: string, orderData: OrderData) =>
  pipe(
    DatabaseService,
    Effect.flatMap(db => db.queryOne<User>("SELECT * FROM users WHERE id = ?", [userId])),
    Effect.flatMap(user => 
      user 
        ? createOrder(user, orderData)
        : Effect.fail(new NotFoundError({ message: "User not found", resource: "User", id: userId }))
    ),
    Effect.tap(order => 
      LoggingService.pipe(
        Effect.flatMap(logger => logger.info("Order processed", { userId, orderId: order.id }))
      )
    )
  );
```

#### Prefer Composition Over Large Functions

```typescript
// ✅ Good: Break down into composable functions
const validateOrderData = (orderData: OrderData) =>
  Effect.gen(function* (_) {
    if (!orderData.items || orderData.items.length === 0) {
      yield* _(Effect.fail(new ValidationError({
        message: "Order must contain at least one item",
        field: "items",
        value: orderData.items
      })));
    }
    
    for (const item of orderData.items) {
      if (item.quantity <= 0) {
        yield* _(Effect.fail(new ValidationError({
          message: "Item quantity must be positive",
          field: "quantity",
          value: item.quantity
        })));
      }
    }
    
    return orderData;
  });

const checkInventory = (items: OrderItem[]) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    
    for (const item of items) {
      const product = yield* _(db.queryOne<Product>(
        "SELECT inventory FROM products WHERE id = ?",
        [item.productId]
      ));
      
      if (!product || product.inventory < item.quantity) {
        yield* _(Effect.fail(new BusinessLogicError({
          message: "Insufficient inventory",
          code: "INSUFFICIENT_INVENTORY",
          context: { productId: item.productId, available: product?.inventory || 0 }
        })));
      }
    }
  });

const processOrder = (userId: string, orderData: OrderData) =>
  Effect.gen(function* (_) {
    const validatedData = yield* _(validateOrderData(orderData));
    yield* _(checkInventory(validatedData.items));
    
    const order = yield* _(createOrderInDatabase(userId, validatedData));
    yield* _(updateInventory(validatedData.items));
    
    return order;
  });
```

### 2. Error Handling Best Practices

#### Use Specific Error Types

```typescript
// ✅ Good: Specific error types with context
const parseUserInput = (input: unknown) =>
  Effect.gen(function* (_) {
    if (typeof input !== 'object' || input === null) {
      yield* _(Effect.fail(new ValidationError({
        message: "Input must be an object",
        field: "input",
        value: input
      })));
    }
    
    const data = input as Record<string, unknown>;
    
    if (typeof data.email !== 'string' || !data.email.includes('@')) {
      yield* _(Effect.fail(new ValidationError({
        message: "Invalid email format",
        field: "email",
        value: data.email
      })));
    }
    
    return data as UserInput;
  });

// ❌ Avoid: Generic errors without context
const parseUserInputBad = (input: unknown) =>
  Effect.gen(function* (_) {
    if (typeof input !== 'object') {
      yield* _(Effect.fail(new Error("Invalid input")));
    }
    
    return input as UserInput;
  });
```

#### Handle Errors at Appropriate Levels

```typescript
// ✅ Good: Handle errors at the right abstraction level
const userService = {
  // Service level: Convert technical errors to domain errors
  findUser: (id: string) =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      
      const user = yield* _(db.queryOne<User>(
        "SELECT * FROM users WHERE id = ?",
        [id]
      ).pipe(
        Effect.catchTag("DatabaseError", (error) => {
          console.error("Database error in findUser:", error);
          return Effect.fail(new NotFoundError({
            message: "User not found",
            resource: "User",
            id
          }));
        })
      ));
      
      return user;
    }),
    
  // Application level: Handle business logic
  getUserProfile: (id: string) =>
    Effect.gen(function* (_) {
      const user = yield* _(userService.findUser(id));
      
      if (!user) {
        yield* _(Effect.fail(new NotFoundError({
          message: "User profile not found",
          resource: "User",
          id
        })));
      }
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        profileUrl: `/users/${user.id}`
      };
    })
};

// API level: Convert to HTTP responses
const handleUserRequest = (userId: string) =>
  Effect.gen(function* (_) {
    const profile = yield* _(userService.getUserProfile(userId));
    return { success: true, data: profile };
  }).pipe(
    Effect.catchTag("NotFoundError", () => 
      Effect.succeed({ success: false, error: "User not found", status: 404 })
    ),
    Effect.catchAll((error) => 
      Effect.succeed({ success: false, error: "Internal error", status: 500 })
    )
  );
```

### 3. Service Design Patterns

#### Use Dependency Injection Properly

```typescript
// ✅ Good: Services depend on abstractions
const OrderService = {
  createOrder: (userId: string, orderData: OrderData) =>
    Effect.gen(function* (_) {
      // Depend on service interfaces, not implementations
      const db = yield* _(DatabaseService);
      const payment = yield* _(PaymentService);
      const notification = yield* _(NotificationService);
      const logger = yield* _(LoggingService);
      
      // Business logic using services
      const order = yield* _(db.transaction(
        Effect.gen(function* (_) {
          const orderId = generateId();
          
          // Create order
          yield* _(db.execute(
            "INSERT INTO orders (id, user_id, status) VALUES (?, ?, ?)",
            [orderId, userId, "pending"]
          ));
          
          // Process payment
          const paymentResult = yield* _(payment.processPayment({
            orderId,
            amount: orderData.total,
            paymentMethod: orderData.paymentMethod
          }));
          
          // Update order status
          yield* _(db.execute(
            "UPDATE orders SET status = ?, payment_id = ? WHERE id = ?",
            ["confirmed", paymentResult.paymentId, orderId]
          ));
          
          return orderId;
        })
      ));
      
      // Send notification (don't fail order if notification fails)
      yield* _(notification.sendOrderConfirmation(userId, order).pipe(
        Effect.catchAll((error) => 
          logger.warn("Failed to send order notification", { 
            orderId: order, 
            error: error.message 
          })
        )
      ));
      
      return order;
    })
};

// ❌ Avoid: Direct dependencies on implementations
const OrderServiceBad = {
  createOrder: (userId: string, orderData: OrderData) =>
    Effect.gen(function* (_) {
      // Direct database access - hard to test and change
      const connection = yield* _(getDbConnection());
      
      // Inline payment processing - not reusable
      const paymentResponse = yield* _(fromPromise(() => 
        fetch('/payment-api', { 
          method: 'POST', 
          body: JSON.stringify(orderData) 
        })
      ));
      
      // Mixed concerns
      yield* _(fromPromise(() => 
        sendEmail(userId, "Order confirmed")
      ));
      
      return "order-id";
    })
};
```

## Performance Optimization Patterns

### 1. Concurrent Execution

#### Use Effect.all for Independent Operations

```typescript
// ✅ Good: Concurrent execution for independent operations
const getUserDashboard = (userId: string) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    
    // Execute queries concurrently
    const [user, orders, notifications, preferences] = yield* _(Effect.all([
      db.queryOne<User>("SELECT * FROM users WHERE id = ?", [userId]),
      db.query<Order>("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", [userId]),
      db.query<Notification>("SELECT * FROM notifications WHERE user_id = ? AND read = false", [userId]),
      db.queryOne<UserPreferences>("SELECT * FROM user_preferences WHERE user_id = ?", [userId])
    ]));
    
    return {
      user,
      recentOrders: orders,
      unreadNotifications: notifications,
      preferences: preferences || getDefaultPreferences()
    };
  });

// ❌ Avoid: Sequential execution for independent operations
const getUserDashboardBad = (userId: string) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    
    // Sequential - much slower
    const user = yield* _(db.queryOne<User>("SELECT * FROM users WHERE id = ?", [userId]));
    const orders = yield* _(db.query<Order>("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", [userId]));
    const notifications = yield* _(db.query<Notification>("SELECT * FROM notifications WHERE user_id = ? AND read = false", [userId]));
    const preferences = yield* _(db.queryOne<UserPreferences>("SELECT * FROM user_preferences WHERE user_id = ?", [userId]));
    
    return { user, recentOrders: orders, unreadNotifications: notifications, preferences };
  });
```

#### Use Effect.forEach for Concurrent Processing

```typescript
// ✅ Good: Process items concurrently with controlled concurrency
const processOrderItems = (orderItems: OrderItem[]) =>
  Effect.gen(function* (_) {
    const results = yield* _(Effect.forEach(
      orderItems,
      (item) => processOrderItem(item),
      { concurrency: 5 } // Limit concurrent operations
    ));
    
    return results;
  });

const processOrderItem = (item: OrderItem) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    const inventory = yield* _(InventoryService);
    
    // Update inventory
    yield* _(inventory.reserveItem(item.productId, item.quantity));
    
    // Log item processing
    yield* _(db.execute(
      "INSERT INTO order_item_logs (order_id, product_id, action) VALUES (?, ?, ?)",
      [item.orderId, item.productId, "reserved"]
    ));
    
    return { productId: item.productId, status: "processed" };
  });
```

### 2. Caching and Memoization

#### Implement Service-Level Caching

```typescript
// Cache implementation using Effect
const createCache = <K, V>() => {
  const cache = new Map<K, { value: V; expiry: number }>();
  
  return {
    get: (key: K) => Effect.sync(() => {
      const entry = cache.get(key);
      if (entry && entry.expiry > Date.now()) {
        return entry.value;
      }
      cache.delete(key);
      return null;
    }),
    
    set: (key: K, value: V, ttlMs = 300000) => Effect.sync(() => {
      cache.set(key, { value, expiry: Date.now() + ttlMs });
    }),
    
    clear: () => Effect.sync(() => {
      cache.clear();
    })
  };
};

// Cached user service
const CachedUserService = (() => {
  const userCache = createCache<string, User>();
  
  return {
    findUser: (id: string) =>
      Effect.gen(function* (_) {
        // Check cache first
        const cached = yield* _(userCache.get(id));
        if (cached) {
          return cached;
        }
        
        // Fetch from database
        const db = yield* _(DatabaseService);
        const user = yield* _(db.queryOne<User>(
          "SELECT * FROM users WHERE id = ?",
          [id]
        ));
        
        // Cache result
        if (user) {
          yield* _(userCache.set(id, user));
        }
        
        return user;
      })
  };
})();
```

### 3. Resource Pooling

#### Database Connection Pooling

```typescript
// Efficient database service with connection pooling
const createDatabaseService = (config: DatabaseConfig) =>
  Effect.gen(function* (_) {
    // Create connection pool
    const pool = yield* _(Effect.tryPromise({
      try: () => createPool({
        ...config,
        connectionLimit: config.maxConnections,
        acquireTimeout: config.connectionTimeout,
        // Pool optimization settings
        idleTimeout: 300000, // 5 minutes
        maxUses: 1000, // Recycle connections after 1000 uses
        reconnect: true
      }),
      catch: (error) => new DatabaseError({
        message: "Failed to create connection pool",
        operation: "createPool",
        cause: error
      })
    }));
    
    return {
      query: <T>(sql: string, params?: unknown[]) =>
        Effect.gen(function* (_) {
          // Use pool for efficient connection management
          const [rows] = yield* _(Effect.tryPromise({
            try: () => pool.execute(sql, params),
            catch: (error) => new DatabaseError({
              message: `Query failed: ${error}`,
              operation: "query",
              cause: error
            })
          }));
          
          return rows as T[];
        }),
        
      // Implement connection health monitoring
      healthCheck: () =>
        Effect.gen(function* (_) {
          const stats = yield* _(Effect.sync(() => ({
            totalConnections: pool.pool.totalConnections,
            activeConnections: pool.pool.activeConnections,
            idleConnections: pool.pool.idleConnections
          })));
          
          // Check if pool is healthy
          if (stats.activeConnections / stats.totalConnections > 0.9) {
            return { status: "warning" as const, stats };
          }
          
          return { status: "healthy" as const, stats };
        })
    };
  });
```

## Debugging and Troubleshooting

### 1. Effect Program Debugging

#### Add Debugging Information

```typescript
// ✅ Good: Add debugging context throughout Effect programs
const debugUserOperation = (userId: string, operation: string) =>
  Effect.gen(function* (_) {
    const logger = yield* _(LoggingService);
    
    yield* _(logger.debug("Starting user operation", { 
      userId, 
      operation, 
      timestamp: new Date().toISOString() 
    }));
    
    const result = yield* _(performUserOperation(userId, operation).pipe(
      Effect.tap((result) => 
        logger.debug("User operation completed", { 
          userId, 
          operation, 
          result: typeof result === 'object' ? JSON.stringify(result) : result 
        })
      ),
      Effect.tapError((error) => 
        logger.error("User operation failed", { 
          userId, 
          operation, 
          error: error.message,
          errorType: error._tag 
        })
      )
    ));
    
    return result;
  });

// Add operation timing
const timedOperation = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
  Effect.gen(function* (_) {
    const logger = yield* _(LoggingService);
    const start = Date.now();
    
    yield* _(logger.debug(`Starting ${name}`));
    
    const result = yield* _(effect.pipe(
      Effect.tapError((error) => 
        logger.error(`${name} failed after ${Date.now() - start}ms`, { error })
      )
    ));
    
    yield* _(logger.debug(`${name} completed in ${Date.now() - start}ms`));
    
    return result;
  });
```

#### Use Effect Tracing

```typescript
// Enable Effect tracing for debugging
const tracedEffect = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
  Effect.withSpan(effect, name, {
    attributes: {
      "operation.name": name,
      "operation.timestamp": Date.now()
    }
  });

// Usage
const processUserOrder = (userId: string, orderData: OrderData) =>
  tracedEffect("processUserOrder",
    Effect.gen(function* (_) {
      const validatedData = yield* _(tracedEffect("validateOrder", 
        validateOrderData(orderData)
      ));
      
      const order = yield* _(tracedEffect("createOrder",
        createOrderInDatabase(userId, validatedData)
      ));
      
      yield* _(tracedEffect("updateInventory",
        updateInventory(validatedData.items)
      ));
      
      return order;
    })
  );
```

### 2. Common Error Patterns

#### Handle Async Resource Cleanup

```typescript
// ✅ Good: Proper resource cleanup with Effect.acquireUseRelease
const withDatabaseTransaction = <A, E>(
  operation: Effect.Effect<A, E, DatabaseService>
): Effect.Effect<A, DatabaseError | E> =>
  Effect.acquireUseRelease(
    // Acquire: Start transaction
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      const connection = yield* _(Effect.tryPromise({
        try: () => db.getConnection(),
        catch: (error) => new DatabaseError({
          message: "Failed to acquire connection",
          operation: "acquireConnection",
          cause: error
        })
      }));
      
      yield* _(Effect.tryPromise({
        try: () => connection.beginTransaction(),
        catch: (error) => new DatabaseError({
          message: "Failed to begin transaction",
          operation: "beginTransaction",
          cause: error
        })
      }));
      
      return connection;
    }),
    
    // Use: Execute operation
    (connection) => Effect.provide(
      operation,
      Layer.succeed(DatabaseService, createTransactionService(connection))
    ),
    
    // Release: Commit or rollback
    (connection, exit) => 
      Effect.gen(function* (_) {
        if (Exit.isSuccess(exit)) {
          yield* _(Effect.tryPromise({
            try: () => connection.commit(),
            catch: () => {} // Log but don't fail
          }));
        } else {
          yield* _(Effect.tryPromise({
            try: () => connection.rollback(),
            catch: () => {} // Log but don't fail
          }));
        }
        
        connection.release();
      }).pipe(Effect.orDie) // Never fail the cleanup
  );
```

#### Debug Effect Composition Issues

```typescript
// Common issue: Forgetting to yield Effect results
// ❌ Wrong: Missing yield
const badEffectComposition = (userId: string) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    
    // This doesn't work - missing yield
    const user = db.queryOne<User>("SELECT * FROM users WHERE id = ?", [userId]);
    
    // user is an Effect, not a User!
    return user.name; // Type error
  });

// ✅ Correct: Proper yielding
const goodEffectComposition = (userId: string) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    
    // Properly yield the Effect
    const user = yield* _(db.queryOne<User>("SELECT * FROM users WHERE id = ?", [userId]));
    
    if (!user) {
      yield* _(Effect.fail(new NotFoundError({
        message: "User not found",
        resource: "User",
        id: userId
      })));
    }
    
    return user.name;
  });
```

### 3. Performance Debugging

#### Monitor Effect Performance

```typescript
// Performance monitoring utility
const withPerformanceMonitoring = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>,
  thresholdMs = 1000
): Effect.Effect<A, E, R> =>
  Effect.gen(function* (_) {
    const logger = yield* _(LoggingService);
    const start = performance.now();
    
    const result = yield* _(effect);
    
    const duration = performance.now() - start;
    
    if (duration > thresholdMs) {
      yield* _(logger.warn("Slow operation detected", {
        operation: name,
        durationMs: duration,
        threshold: thresholdMs
      }));
    } else {
      yield* _(logger.debug("Operation completed", {
        operation: name,
        durationMs: duration
      }));
    }
    
    return result;
  });

// Usage
const monitoredDatabaseQuery = (sql: string, params?: unknown[]) =>
  withPerformanceMonitoring(
    `database_query:${sql.split(' ')[0].toLowerCase()}`,
    DatabaseService.pipe(
      Effect.flatMap(db => db.query(sql, params))
    ),
    500 // Warn if query takes more than 500ms
  );
```

## Resource Management and Cleanup

### 1. Connection Management

#### Implement Proper Connection Lifecycle

```typescript
// Connection manager with proper lifecycle
const createConnectionManager = (config: DatabaseConfig) => {
  let pool: Pool | null = null;
  
  return {
    initialize: () =>
      Effect.gen(function* (_) {
        if (pool) {
          return pool;
        }
        
        pool = yield* _(Effect.tryPromise({
          try: () => createPool(config),
          catch: (error) => new DatabaseError({
            message: "Failed to initialize connection pool",
            operation: "initialize",
            cause: error
          })
        }));
        
        // Set up pool event handlers
        pool.on('connection', (connection) => {
          console.log('New connection established');
        });
        
        pool.on('error', (error) => {
          console.error('Pool error:', error);
        });
        
        return pool;
      }),
      
    shutdown: () =>
      Effect.gen(function* (_) {
        if (!pool) {
          return;
        }
        
        yield* _(Effect.tryPromise({
          try: () => pool!.end(),
          catch: (error) => {
            console.error('Error closing pool:', error);
          }
        }));
        
        pool = null;
      }),
      
    getPool: () => Effect.sync(() => {
      if (!pool) {
        throw new Error("Connection pool not initialized");
      }
      return pool;
    })
  };
};
```

### 2. Memory Management

#### Prevent Memory Leaks in Long-Running Effects

```typescript
// ✅ Good: Proper cleanup in streaming operations
const processLargeDataset = (dataSource: AsyncIterable<DataChunk>) =>
  Effect.gen(function* (_) {
    const logger = yield* _(LoggingService);
    let processedCount = 0;
    
    // Use streaming to avoid loading all data into memory
    for await (const chunk of dataSource) {
      yield* _(processChunk(chunk));
      processedCount += chunk.length;
      
      // Periodic logging and memory cleanup
      if (processedCount % 1000 === 0) {
        yield* _(logger.info("Processing progress", { processedCount }));
        
        // Force garbage collection hint (if available)
        if (global.gc) {
          global.gc();
        }
      }
    }
    
    return { processedCount };
  });

// ❌ Avoid: Loading large datasets into memory
const processLargeDatasetBad = () =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    
    // This loads all data into memory at once
    const allData = yield* _(db.query<DataRow>("SELECT * FROM large_table"));
    
    // Process all data - can cause memory issues
    const results = allData.map(processRow);
    
    return results;
  });
```

## Production Deployment Considerations

### 1. Environment Configuration

#### Environment-Specific Service Configuration

```typescript
// Environment-aware configuration
const createProductionConfig = (): AppConfig => ({
  database: {
    url: process.env.DATABASE_URL!,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "20"),
    connectionTimeout: parseInt(process.env.DB_TIMEOUT || "30000")
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || "3600"),
    refreshTokenExpiry: parseInt(process.env.REFRESH_TOKEN_EXPIRY || "604800")
  },
  server: {
    port: parseInt(process.env.PORT || "3000"),
    host: process.env.HOST || "0.0.0.0",
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ["*"],
      credentials: process.env.CORS_CREDENTIALS === "true"
    }
  },
  logging: {
    level: (process.env.LOG_LEVEL as LogLevel) || "info",
    format: (process.env.LOG_FORMAT as "json" | "pretty") || "json",
    enableCorrelationId: process.env.ENABLE_CORRELATION_ID !== "false"
  }
});

// Validate configuration at startup
const validateProductionConfig = (config: AppConfig) =>
  Effect.gen(function* (_) {
    const errors: string[] = [];
    
    if (!config.database.url) {
      errors.push("DATABASE_URL is required");
    }
    
    if (!config.auth.jwtSecret) {
      errors.push("JWT_SECRET is required");
    }
    
    if (config.auth.jwtSecret && config.auth.jwtSecret.length < 32) {
      errors.push("JWT_SECRET must be at least 32 characters");
    }
    
    if (errors.length > 0) {
      yield* _(Effect.fail(new ConfigError({
        message: `Configuration validation failed: ${errors.join(', ')}`
      })));
    }
    
    return config;
  });
```

### 2. Health Checks and Monitoring

#### Implement Comprehensive Health Checks

```typescript
// Health check service
const HealthCheckService = {
  checkDatabase: () =>
    Effect.gen(function* (_) {
      const db = yield* _(DatabaseService);
      
      const start = Date.now();
      const result = yield* _(db.healthCheck().pipe(
        Effect.timeout(Duration.seconds(5)),
        Effect.catchAll(() => Effect.succeed({ status: "unhealthy" as const }))
      ));
      const duration = Date.now() - start;
      
      return {
        service: "database",
        status: result.status,
        responseTime: duration,
        details: result.stats || {}
      };
    }),
    
  checkExternalServices: () =>
    Effect.gen(function* (_) {
      const checks = yield* _(Effect.all([
        checkPaymentService(),
        checkNotificationService(),
        checkCacheService()
      ], { concurrency: 3 }));
      
      return checks;
    }),
    
  getOverallHealth: () =>
    Effect.gen(function* (_) {
      const [dbHealth, externalHealth] = yield* _(Effect.all([
        HealthCheckService.checkDatabase(),
        HealthCheckService.checkExternalServices()
      ]));
      
      const allChecks = [dbHealth, ...externalHealth];
      const unhealthyServices = allChecks.filter(check => check.status !== "healthy");
      
      return {
        status: unhealthyServices.length === 0 ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        services: allChecks,
        summary: {
          total: allChecks.length,
          healthy: allChecks.length - unhealthyServices.length,
          unhealthy: unhealthyServices.length
        }
      };
    })
};

// Health check endpoint
app.get('/health', 
  effectMiddleware(HealthCheckService.getOverallHealth()),
  (c) => {
    const health = c.get('effectResult');
    const status = health.status === "healthy" ? 200 : 503;
    return c.json(health, status);
  }
);
```

### 3. Graceful Shutdown

#### Implement Proper Application Shutdown

```typescript
// Graceful shutdown manager
const createShutdownManager = (services: {
  database: DatabaseService;
  server: Server;
}) => {
  let isShuttingDown = false;
  
  const shutdown = (signal: string) =>
    Effect.gen(function* (_) {
      if (isShuttingDown) {
        return;
      }
      
      isShuttingDown = true;
      console.log(`Received ${signal}, starting graceful shutdown...`);
      
      // Stop accepting new requests
      yield* _(Effect.tryPromise({
        try: () => services.server.close(),
        catch: (error) => {
          console.error("Error closing server:", error);
        }
      }));
      
      // Close database connections
      yield* _(Effect.tryPromise({
        try: () => services.database.shutdown(),
        catch: (error) => {
          console.error("Error closing database:", error);
        }
      }));
      
      console.log("Graceful shutdown completed");
      process.exit(0);
    });
  
  // Register signal handlers
  process.on('SIGTERM', () => {
    Runtime.runPromise(Runtime.defaultRuntime)(shutdown('SIGTERM'));
  });
  
  process.on('SIGINT', () => {
    Runtime.runPromise(Runtime.defaultRuntime)(shutdown('SIGINT'));
  });
  
  return { shutdown };
};
```

## Common Pitfalls and Solutions

### 1. Effect Composition Issues

```typescript
// ❌ Common mistake: Not handling null/undefined properly
const badNullHandling = (userId: string) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    const user = yield* _(db.queryOne<User>("SELECT * FROM users WHERE id = ?", [userId]));
    
    // This will throw if user is null
    return user.name; // Runtime error!
  });

// ✅ Correct: Proper null handling
const goodNullHandling = (userId: string) =>
  Effect.gen(function* (_) {
    const db = yield* _(DatabaseService);
    const user = yield* _(db.queryOne<User>("SELECT * FROM users WHERE id = ?", [userId]));
    
    if (!user) {
      yield* _(Effect.fail(new NotFoundError({
        message: "User not found",
        resource: "User",
        id: userId
      })));
    }
    
    return user.name;
  });
```

### 2. Error Handling Mistakes

```typescript
// ❌ Common mistake: Swallowing errors
const badErrorHandling = (userId: string) =>
  Effect.gen(function* (_) {
    const user = yield* _(fetchUser(userId).pipe(
      Effect.catchAll(() => Effect.succeed(null)) // Loses error information
    ));
    
    return user;
  });

// ✅ Correct: Preserve error context
const goodErrorHandling = (userId: string) =>
  Effect.gen(function* (_) {
    const user = yield* _(fetchUser(userId).pipe(
      Effect.catchTag("NotFoundError", (error) => {
        // Log the error but provide fallback
        console.warn("User not found, using default:", error);
        return Effect.succeed(createDefaultUser(userId));
      }),
      Effect.catchTag("DatabaseError", (error) => {
        // Re-throw database errors - they need different handling
        return Effect.fail(error);
      })
    ));
    
    return user;
  });
```

### 3. Performance Anti-Patterns

```typescript
// ❌ Anti-pattern: Sequential processing of independent operations
const inefficientDataFetching = (userIds: string[]) =>
  Effect.gen(function* (_) {
    const users: User[] = [];
    
    // This processes users one by one - very slow
    for (const userId of userIds) {
      const user = yield* _(fetchUser(userId));
      if (user) {
        users.push(user);
      }
    }
    
    return users;
  });

// ✅ Efficient: Concurrent processing
const efficientDataFetching = (userIds: string[]) =>
  Effect.gen(function* (_) {
    const users = yield* _(Effect.forEach(
      userIds,
      (userId) => fetchUser(userId).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      ),
      { concurrency: 10 } // Process up to 10 users concurrently
    ));
    
    // Filter out null results
    return users.filter((user): user is User => user !== null);
  });
```

## Monitoring and Observability

### 1. Structured Logging

```typescript
// Structured logging with correlation IDs
const withCorrelationId = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  correlationId?: string
): Effect.Effect<A, E, R> => {
  const id = correlationId || generateCorrelationId();
  
  return Effect.gen(function* (_) {
    const logger = yield* _(LoggingService);
    
    yield* _(logger.debug("Operation started", { correlationId: id }));
    
    const result = yield* _(effect.pipe(
      Effect.tapError((error) => 
        logger.error("Operation failed", { 
          correlationId: id, 
          error: error.message,
          errorType: error._tag 
        })
      )
    ));
    
    yield* _(logger.debug("Operation completed", { correlationId: id }));
    
    return result;
  });
};
```

### 2. Metrics Collection

```typescript
// Metrics collection service
const MetricsService = {
  incrementCounter: (name: string, tags?: Record<string, string>) =>
    Effect.sync(() => {
      // Implement your metrics backend (Prometheus, DataDog, etc.)
      metricsClient.increment(name, 1, tags);
    }),
    
  recordDuration: (name: string, duration: number, tags?: Record<string, string>) =>
    Effect.sync(() => {
      metricsClient.histogram(name, duration, tags);
    }),
    
  recordGauge: (name: string, value: number, tags?: Record<string, string>) =>
    Effect.sync(() => {
      metricsClient.gauge(name, value, tags);
    })
};

// Instrument Effect operations with metrics
const withMetrics = <A, E, R>(
  name: string,
  effect: Effect.Effect<A, E, R>,
  tags?: Record<string, string>
): Effect.Effect<A, E, R> =>
  Effect.gen(function* (_) {
    const metrics = yield* _(MetricsService);
    const start = Date.now();
    
    yield* _(metrics.incrementCounter(`${name}.started`, tags));
    
    const result = yield* _(effect.pipe(
      Effect.tap(() => 
        Effect.gen(function* (_) {
          const duration = Date.now() - start;
          yield* _(metrics.incrementCounter(`${name}.success`, tags));
          yield* _(metrics.recordDuration(`${name}.duration`, duration, tags));
        })
      ),
      Effect.tapError((error) => 
        metrics.incrementCounter(`${name}.error`, { 
          ...tags, 
          errorType: error._tag 
        })
      )
    ));
    
    return result;
  });
```

## Security Considerations

### 1. Input Validation and Sanitization

```typescript
// Comprehensive input validation
const validateAndSanitizeUserInput = (input: unknown) =>
  Effect.gen(function* (_) {
    // Type validation
    const validatedInput = yield* _(validateInput(
      input,
      (data): data is UserInput => 
        typeof data === 'object' && 
        data !== null && 
        typeof (data as any).email === 'string' &&
        typeof (data as any).name === 'string',
      'userInput'
    ));
    
    // Sanitize HTML content
    const sanitizedName = yield* _(Effect.sync(() => 
      sanitizeHtml(validatedInput.name, {
        allowedTags: [],
        allowedAttributes: {}
      })
    ));
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(validatedInput.email)) {
      yield* _(Effect.fail(new ValidationError({
        message: "Invalid email format",
        field: "email",
        value: validatedInput.email
      })));
    }
    
    return {
      ...validatedInput,
      name: sanitizedName
    };
  });
```

### 2. Secure Error Handling

```typescript
// Don't expose sensitive information in errors
const secureErrorHandling = <A, E extends ApplicationError>(
  effect: Effect.Effect<A, E>,
  isProduction: boolean
): Effect.Effect<A, ApplicationError> =>
  Effect.catchAll(effect, (error) => {
    // Log full error details server-side
    console.error("Application error:", {
      type: error._tag,
      message: error.message,
      timestamp: error.timestamp,
      stack: error.stack
    });
    
    // Return sanitized error to client
    if (isProduction) {
      switch (error._tag) {
        case "ValidationError":
          return Effect.fail(new ValidationError({
            message: "Invalid input provided",
            field: error.field,
            value: "[REDACTED]"
          }));
          
        case "DatabaseError":
          return Effect.fail(new NetworkError({
            message: "Service temporarily unavailable",
            url: "internal"
          }));
          
        default:
          return Effect.fail(new NetworkError({
            message: "An error occurred",
            url: "internal"
          }));
      }
    }
    
    // In development, return full error details
    return Effect.fail(error);
  });
```

This comprehensive best practices guide provides the foundation for building robust, performant, and maintainable Effect.ts applications in production environments.
