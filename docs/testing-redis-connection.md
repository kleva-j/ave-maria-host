# Testing Redis Connection

Great! You've completed steps 1-3 (Upstash account, database creation, connection string).

## Quick Test

Run this command with your Upstash Redis URL:

```bash
REDIS_URL='rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379' pnpm tsx scripts/test-redis-connection.ts
```

Or if you have a `.env` file:

```bash
# Load environment variables and run test
source .env && pnpm tsx scripts/test-redis-connection.ts

# Or use dotenv
pnpm tsx -r dotenv/config scripts/test-redis-connection.ts
```

## What the Test Does

The test script will:

1. ✅ **Connect to Upstash Redis** - Verify basic connectivity
2. ✅ **Test basic operations** - SET, GET, DEL commands
3. ✅ **Test rate limiter** - Verify sliding window algorithm
4. ✅ **Test email verification limits** - Simulate 3 requests/hour limit
5. ✅ **Clean up** - Remove test data

## Expected Output

```
🔍 Testing Upstash Redis connection...

1️⃣ Testing basic Redis connection...
✅ Redis connection successful!

2️⃣ Testing Rate Limiter Service...
   Testing limit: 3 requests per 5s
   ✓ Request 1/3 allowed
   ✓ Request 2/3 allowed
   ✓ Request 3/3 allowed
   ✓ Request 4 correctly blocked (rate limit exceeded)
   ⏰ Retry after: 2025-11-28T17:49:10.000Z
   ℹ️  Remaining requests: 0/3
   ✓ Rate limit reset successful
   ✓ Request allowed after reset

✅ Rate Limiter Service working correctly!

3️⃣ Testing Email Verification Rate Limiting...
   ✓ Verification email 1/3 allowed
   ✓ Verification email 2/3 allowed
   ✓ Verification email 3/3 allowed
   ✓ 4th verification correctly blocked
   ⏰ User can retry in ~60 minutes
   ✓ Cleanup complete

✅ Email verification rate limiting working correctly!

🎉 All tests passed!

📊 Summary:
   ✅ Redis connection established
   ✅ Basic operations working
   ✅ Rate limiter service functional
   ✅ Email verification rate limiting configured

🚀 Your Upstash Redis is ready for production!

✨ Test completed successfully
```

## Troubleshooting

### Error: "REDIS_URL environment variable is not set"

Make sure you've added the URL to your environment:

```bash
export REDIS_URL='rediss://default:PASSWORD@ENDPOINT.upstash.io:6379'
```

### Error: "Connection refused" or "ECONNREFUSED"

- Check that the URL is correct (should start with `rediss://`)
- Verify the password and endpoint in Upstash dashboard
- Check firewall/network settings

### Error: "WRONGPASS"

- Password is incorrect
- Copy the connection string again from Upstash dashboard

## Next Steps After Successful Test

Once the test passes:

1. ✅ **Add to your main app** - The rate limiting is already integrated!
2. ✅ **Test email verification** - Try the RPC endpoints
3. ✅ **Monitor in Upstash** - Check the dashboard for command usage
4. ✅ **Deploy to production** - Add `REDIS_URL` to your production environment

## Alternative: Manual Test

If you prefer to test manually:

```bash
# Install redis-cli (if not already installed)
brew install redis  # macOS
# or
apt-get install redis-tools  # Linux

# Connect to Upstash
redis-cli -u 'rediss://default:PASSWORD@ENDPOINT.upstash.io:6379'

# Test commands
> SET test:key "hello"
> GET test:key
> DEL test:key
> QUIT
```

## Monitoring Usage

Check your Upstash dashboard to see:
- Commands executed during the test
- Latency metrics
- Storage usage

The test should use approximately 20-30 commands total.
