# Redis Client

A shared Redis client implementation for the AV-Daily platform, providing a type-safe interface to interact with Redis.

## Features

- Singleton Redis client instance management
- Type-safe interface for Redis operations
- Connection pooling and error handling
- Support for all Redis data structures
- Configurable connection options

## Usage

### Basic Setup

```typescript
import { RedisClient } from '@host/infrastructure/redis';

// Create a Redis client instance
const redis = new RedisClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  // Additional ioredis options can be passed here
});

// Basic operations
await redis.client.set('key', 'value');
const value = await redis.client.get('key');
```

### Configuration Options

The Redis client accepts all standard [ioredis](https://github.com/redis/ioredis) options:

```typescript
{
  host: string;           // Redis server hostname
  port: number;          // Redis server port
  username?: string;     // ACL username (if required)
  password?: string;     // Redis password
  db: number;           // Database index to use
  tls?: TlsOptions;     // TLS/SSL options
  // ... other ioredis options
}
```

### Error Handling

All Redis operations can throw errors. It's recommended to handle them appropriately:

```typescript
try {
  await redis.client.set('key', 'value');
} catch (error) {
  console.error('Redis operation failed:', error);
  // Handle error (retry, fallback, etc.)
}
```

## Best Practices

1. **Connection Management**:
   - Reuse the Redis client instance across your application
   - Handle connection errors and implement reconnection logic
   - Set appropriate timeouts and retry strategies

2. **Resource Cleanup**:
   - Ensure proper cleanup of connections when shutting down the application
   - Use connection pooling for high-throughput scenarios

3. **Error Handling**:
   - Implement circuit breakers for Redis operations
   - Log errors appropriately for monitoring
   - Consider fallback mechanisms for cache misses

## Testing

For testing, you can use the test utilities provided in the package:

```typescript
import { TestRedis } from '@host/infrastructure/test-utils';

describe('Redis Client', () => {
  let redis: RedisClient;

  beforeEach(() => {
    redis = new TestRedis();
  });

  afterEach(async () => {
    await redis.client.quit();
  });

  test('should set and get values', async () => {
    await redis.client.set('test', 'value');
    const value = await redis.client.get('test');
    expect(value).toBe('value');
  });
});
```

## Monitoring

Monitor Redis performance using the built-in monitoring tools:

```typescript
redis.client.on('connect', () => {
  console.log('Redis client connected');
});

redis.client.on('error', (error) => {
  console.error('Redis error:', error);
});

// Monitor memory usage
const memoryInfo = await redis.client.info('memory');
```

## License

MIT
