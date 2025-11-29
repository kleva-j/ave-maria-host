# Email Verification Environment Variables

## Required Variables

Add these environment variables to your `.env` file:

```bash
# Resend API Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@av-daily.com
EMAIL_FROM_NAME=AV-Daily

# Redis Configuration (Upstash recommended)
REDIS_URL=rediss://default:xxxxx@xxxxx.upstash.io:6379

# Application URL (for verification links)
APP_URL=https://av-daily.com

# Node Environment
NODE_ENV=development  # or 'production'
```

## Redis Setup (Upstash Recommended)

### Why Upstash?
- ✅ **Serverless** - Pay only for what you use, scales to zero
- ✅ **Free Tier** - 10,000 commands/day (perfect for development)
- ✅ **Global** - Low latency worldwide with multi-region replication
- ✅ **Compatible** - Works with existing `ioredis` client
- ✅ **No Management** - No servers to maintain

### Getting Started with Upstash

1. **Sign up** at [https://upstash.com](https://upstash.com)
2. **Create a Redis database**:
   - Click "Create Database"
   - Choose a region (closest to your users)
   - Select "Global" for multi-region (optional)
3. **Get connection string**:
   - Copy the `UPSTASH_REDIS_REST_URL` or connection string
   - Use the format: `rediss://default:PASSWORD@ENDPOINT:6379`
4. **Add to `.env`**:
   ```bash
   REDIS_URL=rediss://default:your-password@your-endpoint.upstash.io:6379
   ```

### Alternative: Traditional Redis

If you prefer self-hosted Redis:

```bash
# Local Development
REDIS_HOST=localhost
REDIS_PORT=6379

# Production
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

**Start local Redis:**
```bash
# Using Docker
docker run -d -p 6379:6379 redis

# Or install locally
redis-server
```

## Getting Your Resend API Key

1. Sign up at [https://resend.com](https://resend.com)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key (starts with `re_`)

## Email Domain Setup

### Development
- Use Resend's test domain: `onboarding@resend.dev`
- No DNS configuration needed
- Emails sent to your verified email addresses

### Production
1. Add your domain in Resend dashboard
2. Add DNS records (SPF, DKIM, DMARC)
3. Verify domain
4. Update `EMAIL_FROM` to use your domain

## Testing

### Local Development
```bash
# Set to development to see fallback URLs in console
NODE_ENV=development

# Emails will be sent via Resend
# If Resend fails, verification URL will be logged to console
```

### Production
```bash
# Set to production for production behavior
NODE_ENV=production

# Emails will be sent via Resend
# Errors will be logged but URLs won't be shown
```

## Verification Email Template

The email sent to users includes:
- Professional HTML design with gradient header
- Clear call-to-action button
- 24-hour expiration notice
- Plain text fallback for email clients that don't support HTML

## Rate Limiting

**Implemented**: Redis-based rate limiting with sliding window algorithm
- **Limit**: 3 verification emails per hour per email address
- **Storage**: Upstash Redis (serverless, auto-scaling)
- **Cost**: Free tier covers ~333 verifications/day

## Security Notes

1. **Never commit API keys** - Keep `.env` in `.gitignore`
2. **Use environment-specific keys** - Different keys for dev/staging/prod
3. **Monitor email sending** - Watch for abuse/spam via Resend dashboard
4. **Upstash Security** - TLS encryption enabled by default
5. **Rate limiting** - Prevents email bombing attacks
