# @effect/rpc Migration Guide - Web Application

This guide explains how to migrate from oRPC to @effect/rpc using feature flags for a gradual rollout.

## Overview

The migration system provides:
- **Feature Flags**: Control which endpoints use @effect/rpc vs oRPC
- **Backward Compatibility**: Existing code continues to work unchanged
- **Gradual Rollout**: Migrate endpoints one by one or all at once
- **Easy Rollback**: Disable flags to revert to oRPC

## Feature Flags

Configure these environment variables in your `.env` file:

### Global Migration Flag
```bash
# Enable @effect/rpc for all endpoints
VITE_USE_EFFECT_RPC=true
```

### Granular Endpoint Flags
```bash
# Migrate specific endpoints individually
VITE_EFFECT_RPC_TODOS=true      # Todo operations
VITE_EFFECT_RPC_AUTH=true       # Authentication
VITE_EFFECT_RPC_HEALTH=true     # Health check
```

### Development Flags
```bash
# Enable debugging and logging
VITE_DEBUG_RPC=true             # Debug RPC calls
VITE_LOG_MIGRATION=true         # Log which client is used
```

## Migration Strategies

### Strategy 1: All-at-Once Migration
```bash
# .env
VITE_USE_EFFECT_RPC=true
```

### Strategy 2: Gradual Endpoint Migration
```bash
# .env
VITE_USE_EFFECT_RPC=false
VITE_EFFECT_RPC_HEALTH=true     # Start with health check
VITE_LOG_MIGRATION=true         # Monitor usage
```

Then gradually enable more endpoints:
```bash
VITE_EFFECT_RPC_TODOS=true      # Add todos
VITE_EFFECT_RPC_AUTH=true       # Add auth
```

### Strategy 3: Feature Branch Testing
```bash
# .env.development
VITE_USE_EFFECT_RPC=true
VITE_DEBUG_RPC=true

# .env.production
VITE_USE_EFFECT_RPC=false
```

## Code Changes Required

### No Changes Needed
Your existing React Query code continues to work:

```typescript
// This code works with both oRPC and @effect/rpc
const todos = useQuery(orpc.todo.getAll.queryOptions());
const createMutation = useMutation(orpc.todo.create.mutationOptions());
```

### Optional: Direct Client Usage
You can also use the unified client directly:

```typescript
import { unifiedClient } from '@/utils/unified-client';

// This automatically uses the right client based on feature flags
const todos = await unifiedClient.getAllTodos();
```

## Monitoring Migration

### Enable Logging
```bash
VITE_LOG_MIGRATION=true
```

Check browser console for migration logs:
```
[Migration] getAllTodos using effect-rpc client
[Migration] healthCheck using orpc client
```

### Debug Mode
```bash
VITE_DEBUG_RPC=true
```

Enables detailed RPC call debugging.

## Rollback Plan

If issues occur, immediately disable the problematic endpoint:

```bash
# Rollback todos to oRPC
VITE_EFFECT_RPC_TODOS=false

# Or rollback everything
VITE_USE_EFFECT_RPC=false
```

Changes take effect on next page reload.

## Testing

### Local Testing
1. Set feature flags in `.env`
2. Restart development server
3. Test functionality with browser dev tools open
4. Monitor console for migration logs

### Production Testing
1. Deploy with conservative flags (single endpoint)
2. Monitor application metrics
3. Gradually enable more endpoints
4. Keep rollback plan ready

## Troubleshooting

### Common Issues

**Issue**: "Effect is not defined"
**Solution**: Ensure `@effect/rpc` and `effect` are installed

**Issue**: Authentication not working with @effect/rpc
**Solution**: Check that auth tokens are properly passed in headers

**Issue**: Type errors with unified client
**Solution**: Ensure `@host/api` package exports are up to date

### Getting Help

1. Check browser console for migration logs
2. Enable debug mode: `VITE_DEBUG_RPC=true`
3. Verify feature flag values in console
4. Test with individual endpoint flags first

## Next Steps

1. Start with health check endpoint: `VITE_EFFECT_RPC_HEALTH=true`
2. Monitor for 24 hours
3. Add todos: `VITE_EFFECT_RPC_TODOS=true`
4. Monitor for 48 hours
5. Add auth: `VITE_EFFECT_RPC_AUTH=true`
6. After successful migration, enable global flag: `VITE_USE_EFFECT_RPC=true`
