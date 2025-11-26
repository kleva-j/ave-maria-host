# Monitoring Service

A comprehensive monitoring solution for the AV-Daily platform, providing health checks, metrics collection, and alerting capabilities.

## Features

- **Health Checks**: Built-in and custom health checks for all critical services
- **Metrics Collection**: Runtime metrics and performance indicators
- **Alerting**: Configurable alerting for system anomalies
- **Distributed Tracing**: End-to-end request tracing
- **Log Aggregation**: Centralized log management

## Installation

```bash
# Using pnpm
pnpm add @host/infrastructure

# Using npm
npm install @host/infrastructure
```

## Usage

### Health Checks

```typescript
import { HealthCheckService } from '@host/infrastructure/monitoring';

// Run all health checks
const health = await HealthCheckService.checkAll();

// Check specific service
const dbHealth = await HealthCheckService.check('database');

// Create a custom health check
HealthCheckService.register('custom', {
  name: 'Custom Service',
  check: async () => {
    // Implementation
    return { status: 'healthy' };
  },
  timeout: 5000, // ms
  retries: 2
});
```

### Metrics Collection

```typescript
import { MetricsService } from '@host/infrastructure/monitoring';

// Record a metric
await MetricsService.record('api_request', {
  endpoint: '/users',
  method: 'GET',
  duration: 150, // ms
  status: 200
});

// Get metrics
const metrics = await MetricsService.getMetrics({
  name: 'api_request',
  from: Date.now() - 3600000, // Last hour
  to: Date.now(),
  groupBy: ['endpoint', 'method']
});
```

### Distributed Tracing

```typescript
import { trace } from '@host/infrastructure/monitoring';

// Create a new trace
const span = trace('user:create', { userId: '123' });

try {
  // Your code here
  span.addEvent('user_created');
  
  // Nested span
  await trace('send_welcome_email', { userId: '123' }, async () => {
    // Email sending logic
  });
  
  span.setStatus('success');
} catch (error) {
  span.recordException(error);
  span.setStatus('error');
  throw error;
} finally {
  span.end();
}
```

## Configuration

```typescript
import { MonitoringConfig } from '@host/infrastructure/monitoring';

// Configure monitoring
MonitoringConfig.setup({
  // Service name for distributed tracing
  serviceName: 'api-service',
  
  // Sampling rate (0.0 - 1.0)
  samplingRate: 1.0,
  
  // Exporters
  exporters: {
    // Console exporter for development
    console: {
      enabled: true,
      level: 'debug'
    },
    
    // Prometheus metrics endpoint
    prometheus: {
      enabled: true,
      port: 9090
    },
    
    // Jaeger for distributed tracing
    jaeger: {
      enabled: true,
      endpoint: 'http://jaeger:14268/api/traces'
    }
  },
  
  // Health check configuration
  healthChecks: {
    // Default timeout for health checks (ms)
    timeout: 5000,
    
    // Cache health check results (ms)
    cacheTtl: 30000,
    
    // Built-in checks to enable
    builtIn: ['database', 'redis', 'memory']
  }
});
```

## Built-in Health Checks

| Name | Description | Dependencies |
|------|-------------|--------------|
| `database` | Database connection check | Database client |
| `redis` | Redis connection check | Redis client |
| `memory` | Memory usage check | - |
| `disk` | Disk space check | - |
| `ping` | Basic ping check | - |

## Custom Health Checks

Create custom health checks by implementing the `HealthCheck` interface:

```typescript
import { HealthCheck, HealthCheckResult } from '@host/infrastructure/monitoring';

class CustomHealthCheck implements HealthCheck {
  name = 'custom';
  
  async check(): Promise<HealthCheckResult> {
    try {
      // Your health check logic here
      return {
        status: 'healthy',
        details: {
          version: '1.0.0',
          // Add any relevant details
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message
        }
      };
    }
  }
}

// Register the custom health check
HealthCheckService.register(new CustomHealthCheck());
```

## Alerting

Configure alerts based on metrics and health checks:

```typescript
import { AlertManager } from '@host/infrastructure/monitoring';

// Create an alert rule
AlertManager.createRule({
  name: 'high_error_rate',
  condition: async () => {
    const metrics = await MetricsService.getMetrics({
      name: 'http_requests',
      from: Date.now() - 60000, // Last minute
      where: {
        status: { $gte: 500 } // Error status codes
      }
    });
    
    const errorRate = metrics.count / 100; // Calculate error rate
    return errorRate > 0.05; // 5% error rate threshold
  },
  severity: 'critical',
  notify: ['slack:alerts', 'email:team@example.com'],
  cooldown: 300000 // 5 minutes
});

// Check all alert rules
await AlertManager.checkAll();
```

## Testing

```typescript
import { TestMonitoring } from '@host/infrastructure/test-utils';

describe('Monitoring', () => {
  let monitoring: TestMonitoring;

  beforeEach(() => {
    monitoring = new TestMonitoring();
  });

  afterEach(async () => {
    await monitoring.reset();
  });

  test('should record metrics', async () => {
    await monitoring.recordMetric('test_metric', { value: 42 });
    const metrics = await monitoring.getMetrics('test_metric');
    expect(metrics).toHaveLength(1);
  });
});
```

## License

MIT
