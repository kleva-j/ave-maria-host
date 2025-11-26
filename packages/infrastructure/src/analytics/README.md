# Analytics Service

A powerful analytics service for tracking and analyzing platform metrics in real-time, built on Redis for high performance and scalability.

## Features

- **Real-time Metrics**: Track various platform events and metrics
- **Time-series Data**: Store and query time-series data efficiently
- **User Analytics**: Track user behavior and engagement
- **Aggregations**: Pre-computed aggregations for common time windows
- **Leaderboards**: Track top performers and trending items
- **Retention Policies**: Automatic data retention management

## Installation

```bash
# Using pnpm
pnpm add @host/infrastructure

# Using npm
npm install @host/infrastructure
```

## Usage

### Tracking Events

```typescript
import { RedisAnalyticsService } from '@host/infrastructure/analytics';

// Track a user contribution
await RedisAnalyticsService.recordMetric({
  type: 'contribution',
  userId: 'user-123',
  amount: 1000,
  metadata: { planId: 'plan-456' }
});

// Track a page view
await RedisAnalyticsService.recordMetric({
  type: 'page_view',
  userId: 'user-123',
  path: '/dashboard',
  metadata: { referrer: 'google.com' }
});
```

### Querying Analytics

```typescript
// Get user activity summary
const userStats = await RedisAnalyticsService.getUserStats('user-123', {
  period: '7d', // Last 7 days
  include: ['contribution', 'withdrawal']
});

// Get platform-wide metrics
const platformStats = await RedisAnalyticsService.getPlatformStats({
  period: '30d',
  interval: 'day' // Group by day
});

// Get leaderboard
const topUsers = await RedisAnalyticsService.getLeaderboard('contribution', {
  limit: 10,
  period: '30d'
});
```

### Available Metric Types

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `contribution` | User contributions | `amount`, `userId` |
| `withdrawal` | User withdrawals | `amount`, `userId` |
| `page_view` | Page views | `path`, `userId` |
| `login` | User logins | `userId` |
| `signup` | New user registrations | `userId` |
| `transaction` | Financial transactions | `amount`, `type`, `userId` |

## Configuration

Configure the analytics service using environment variables:

```env
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379

# Data retention (in seconds)
ANALYTICS_RETENTION_DAYS=90

# Aggregation intervals (comma-separated)
ANALYTICS_AGGREGATIONS=1h,1d,7d,30d
```

Or programmatically:

```typescript
import { RedisAnalyticsService } from '@host/infrastructure/analytics';

RedisAnalyticsService.configure({
  retentionDays: 90,
  aggregations: ['1h', '1d', '7d', '30d'],
  // Other options...
});
```

## Data Model

The analytics service stores data in Redis using the following structure:

- `analytics:events:{type}:{timestamp}` - Raw events (sorted set)
- `analytics:user:{userId}:{type}` - User-specific metrics (sorted set)
- `analytics:aggregate:{type}:{interval}:{timestamp}` - Pre-aggregated metrics (hash)
- `analytics:leaderboard:{type}:{period}` - Leaderboard data (sorted set)

## Performance Considerations

1. **Data Volume**:
   - The service is optimized for high write throughput
   - Consider sampling for extremely high-volume events
   - Use appropriate retention policies

2. **Query Performance**:
   - Prefer using pre-aggregated data when possible
   - Limit time ranges for queries over raw events
   - Use pagination for large result sets

3. **Memory Usage**:
   - Monitor Redis memory usage
   - Adjust retention policies based on available memory
   - Consider enabling Redis persistence

## Testing

```typescript
import { TestAnalytics } from '@host/infrastructure/test-utils';

describe('AnalyticsService', () => {
  let analytics: TestAnalytics;

  beforeEach(() => {
    analytics = new TestAnalytics();
  });

  afterEach(async () => {
    await analytics.reset();
  });

  test('should track and retrieve events', async () => {
    await analytics.recordMetric({
      type: 'page_view',
      userId: 'user-1',
      path: '/home'
    });

    const events = await analytics.getEvents('page_view');
    expect(events).toHaveLength(1);
    expect(events[0].path).toBe('/home');
  });
});
```

## Monitoring

Monitor the analytics service using the built-in metrics:

```typescript
const metrics = await RedisAnalyticsService.getServiceMetrics();
console.log('Events processed:', metrics.eventsProcessed);
console.log('Storage used:', metrics.storageUsed);
console.log('Error rate:', metrics.errorRate);
```

## License

MIT
