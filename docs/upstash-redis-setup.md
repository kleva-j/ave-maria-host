# Upstash Redis Setup Guide

## Overview

This project uses [Upstash Redis](https://upstash.com) for serverless rate limiting. Upstash is recommended over traditional Redis for its serverless architecture, pay-per-request pricing, and zero infrastructure management.

## Why Upstash?

### Key Benefits
- **Serverless** - Automatically scales with your traffic, scales to zero when idle
- **Cost-Effective** - Pay only for what you use ($0.20 per 100K commands)
- **Free Tier** - 10,000 commands/day or 500K/month (perfect for development)
- **Global** - Multi-region replication for low latency worldwide
- **Compatible** - Works with existing `ioredis` client (already in dependencies)
- **HTTP API** - Also provides REST API for edge/serverless functions
- **Managed** - No servers to maintain, automatic backups, 99.99% uptime SLA

### Cost Comparison

**Upstash (Serverless)**:
- Free: 10K commands/day
- Pay-as-you-go: $0.20 per 100K commands
- Example: 1M commands/month = $2.00

**Traditional Redis (Self-hosted)**:
- AWS ElastiCache: ~$15-50/month minimum
- DigitalOcean: ~$15/month minimum
- Self-managed: Server costs + maintenance time

## Setup Instructions

### 1. Create Upstash Account

1. Go to [https://upstash.com](https://upstash.com)
2. Sign up with GitHub, Google, or email
3. Verify your email

### 2. Create Redis Database

1. Click **"Create Database"** in the dashboard
2. Configure your database:
   - **Name**: `av-daily-redis` (or your preferred name)
   - **Type**: Choose based on your needs:
     - **Regional**: Single region (lower latency, lower cost)
     - **Global**: Multi-region replication (best for global users)
   - **Region**: Select closest to your primary users
     - US East (Virginia) for US users
     - EU West (Ireland) for European users
     - Asia Pacific (Singapore) for Asian users
3. Click **"Create"**

### 3. Get Connection Details

After creating the database, you'll see connection details:

#### Option A: Using REDIS_URL (Recommended)

Copy the connection string that looks like:
```
rediss://default:AbCdEf123456@us1-example-12345.upstash.io:6379
```

Add to your `.env`:
```bash
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
```

#### Option B: Using Individual Variables

Alternatively, copy individual values:
```bash
REDIS_HOST=us1-example-12345.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AbCdEf123456
```

### 4. Update Code (Already Done!)

The code is already configured to work with Upstash:
- Uses `ioredis` client (compatible with Upstash)
- TLS/SSL enabled by default (`rediss://`)
- Connection pooling configured

### 5. Test Connection

Start your development server:
```bash
pnpm dev:server
```

The Redis connection will be established automatically. Check logs for:
```
✓ Redis connected successfully
```

## Usage in Code

The `RedisRateLimiterService` automatically uses the Redis connection:

```typescript
import { RedisRateLimiterService } from "@host/infrastructure";

// In your Effect handler
const rateLimiter = yield* RedisRateLimiterService;

// Check rate limit
yield* rateLimiter.checkLimit(
  "email:verification:user@example.com",
  3,  // 3 requests
  60 * 60 * 1000  // per hour
);
```

## Monitoring

### Upstash Dashboard

Monitor your Redis usage in the Upstash dashboard:
- **Commands**: Total commands executed
- **Storage**: Data size
- **Bandwidth**: Network usage
- **Latency**: Response times

### Set Up Alerts

1. Go to database settings
2. Configure alerts for:
   - High command rate
   - Storage limits
   - Error rates

## Production Considerations

### 1. Choose the Right Plan

**Free Tier** (Development/Small Apps):
- 10,000 commands/day
- 256 MB storage
- Perfect for testing and small apps

**Pay-as-You-Go** (Production):
- $0.20 per 100K commands
- Up to 100 GB storage
- Scales automatically

**Fixed Plans** (Predictable Costs):
- Starting at $10/month
- Fixed monthly cost
- Good for consistent traffic

### 2. Enable Global Replication (Optional)

For global users, enable multi-region replication:
1. Edit database settings
2. Enable "Global Database"
3. Select additional regions
4. Traffic automatically routes to nearest region

### 3. Security Best Practices

- ✅ Use TLS/SSL (enabled by default with `rediss://`)
- ✅ Rotate passwords regularly
- ✅ Use environment variables (never commit credentials)
- ✅ Enable IP whitelisting (optional, in database settings)
- ✅ Monitor for unusual activity

### 4. Backup Strategy

Upstash provides automatic backups:
- Daily snapshots (retained for 7 days)
- Point-in-time recovery available
- Manual backups via dashboard

## Troubleshooting

### Connection Issues

**Error: "ECONNREFUSED"**
- Check `REDIS_URL` is correct
- Verify TLS is enabled (`rediss://` not `redis://`)
- Check firewall/network settings

**Error: "WRONGPASS"**
- Password is incorrect
- Regenerate password in Upstash dashboard
- Update `.env` file

### Performance Issues

**High Latency**
- Choose region closer to your application
- Consider Global database for worldwide users
- Check network connectivity

**Rate Limit Errors**
- Monitor command usage in dashboard
- Upgrade plan if hitting limits
- Optimize command usage (use pipelining)

## Migration from Traditional Redis

If you're migrating from traditional Redis:

1. **Export data** from old Redis:
   ```bash
   redis-cli --rdb dump.rdb
   ```

2. **Import to Upstash**:
   - Use Upstash CLI or REST API
   - Or use `redis-cli` with Upstash connection string

3. **Update connection string**:
   ```bash
   # Old
   REDIS_HOST=localhost
   REDIS_PORT=6379
   
   # New
   REDIS_URL=rediss://default:PASSWORD@ENDPOINT.upstash.io:6379
   ```

4. **Test thoroughly** before switching production traffic

## Cost Estimation

### Email Verification Use Case

**Assumptions**:
- 3 rate limit checks per email verification request
- Average 1,000 verification requests/day

**Calculation**:
- Commands/day: 1,000 requests × 3 checks = 3,000 commands
- Commands/month: 3,000 × 30 = 90,000 commands
- Cost: 90K commands = $0.18/month

**Free tier covers**: Up to 3,333 verification requests/day!

## Support

- **Documentation**: https://docs.upstash.com/redis
- **Discord**: https://upstash.com/discord
- **Email**: support@upstash.com
- **Status**: https://status.upstash.com

## Next Steps

1. ✅ Create Upstash account
2. ✅ Create Redis database
3. ✅ Add `REDIS_URL` to `.env`
4. ✅ Test connection
5. ✅ Monitor usage in dashboard
6. 🔄 Deploy to production
7. 🔄 Set up monitoring alerts
