# Cache Service

A high-performance, type-safe caching service built on top of Redis, providing flexible caching strategies and utilities.

## Features

- **Key-Value Storage**: Simple get/set/delete operations
- **Time-to-Live (TTL)**: Automatic expiration of cached items
- **Tag-based Invalidation**: Group and invalidate related cache entries
- **Batch Operations**: Efficient multi-get and multi-set operations
- **Atomic Counters**: Thread-safe increment/decrement operations
- **Statistics**: Track cache hits, misses, and memory usage
- **Cache Warming**: Preload frequently accessed data

## Installation

```bash
# Using pnpm
pnpm add @host/infrastructure

# Using npm
npm install @host/infrastructure
```

## Usage

### Basic Operations

```typescript
import { CacheService } from '@host/infrastructure/cache';

// Set a value with TTL (in seconds)
await CacheService.set('user:123', { id: 123, name: 'John' }, { ttl: 3600 });

// Get a value
const user = await CacheService.get('user:123');

// Delete a value
await CacheService.del('user:123');
```

### Tag-based Caching

```typescript
// Set values with tags
await CacheService.set('post:1', post1, { tags: ['user:1', 'recent'] });
await CacheService.set('post:2', post2, { tags: ['user:1', 'featured'] });

// Invalidate all cache entries with a specific tag
await CacheService.invalidateTags(['user:1']);
```

### Batch Operations

```typescript
// Set multiple values
await CacheService.mset({
  'user:1': user1,
  'user:2': user2,
  'post:1': post1
}, { ttl: 300 });

// Get multiple values
const [user, post] = await CacheService.mget(['user:1', 'post:1']);
```

### Cache-Aside Pattern

```typescript
async function getUser(userId: string) {
  return CacheService.getOrSet(
    `user:${userId}`,
    async () => {
      // This function is called if the key doesn't exist in cache
      const user = await userRepository.findById(userId);
      return user;
    },
    { ttl: 600 } // 10 minutes
  );
}
```

## Configuration

Configure the cache service using environment variables:

```env
# Cache TTL (in seconds)
CACHE_DEFAULT_TTL=300

# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
```

Or programmatically:

```typescript
import { CacheService } from '@host/infrastructure/cache';

CacheService.configure({
  defaultTTL: 300, // 5 minutes
  prefix: 'app:',  // Cache key prefix
  // Other options...
});
```

## Error Handling

The cache service uses Effect-TS for error handling:

```typescript
import { Effect } from 'effect';
import { CacheError } from '@host/infrastructure/cache';

const getUser = (userId: string) =>
  Effect.gen(function* () {
    const user = yield* CacheService.get(`user:${userId}`).pipe(
      Effect.catchAll((error) => {
        if (error._tag === 'CacheMiss') {
          // Handle cache miss (e.g., fetch from database)
          return fetchUserFromDb(userId);
        }
        // Rethrow other errors
        return Effect.fail(error);
      })
    );
    return user;
  });
```

## Best Practices

1. **Key Design**:
   - Use consistent naming conventions (e.g., `entity:id:field`)
   - Keep keys short but descriptive
   - Use namespacing to avoid collisions

2. **TTL Strategy**:
   - Set appropriate TTLs based on data volatility
   - Consider using shorter TTLs for frequently changing data
   - Implement cache stampede protection for expensive computations

3. **Memory Management**:
   - Monitor Redis memory usage
   - Implement eviction policies (LRU, LFU)
   - Use SCAN for bulk operations on large datasets

## Testing

```typescript
import { TestCache } from '@host/infrastructure/test-utils';

describe('CacheService', () => {
  beforeEach(() => {
    TestCache.clearAll();
  });

  test('should set and get values', async () => {
    await CacheService.set('test', { key: 'value' });
    const value = await CacheService.get('test');
    expect(value).toEqual({ key: 'value' });
  });
});
```

## Monitoring

Monitor cache performance using the built-in metrics:

```typescript
const stats = await CacheService.getStats();
console.log('Cache hit rate:', stats.hitRate);
console.log('Memory usage:', stats.memoryUsage);
```

## License

MIT
