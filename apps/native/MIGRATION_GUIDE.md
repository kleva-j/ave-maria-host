# @effect/rpc Migration Guide - Native Application

This guide explains how to migrate from oRPC to @effect/rpc using feature flags for a gradual rollout in React Native.

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
EXPO_PUBLIC_USE_EFFECT_RPC=true
```

### Granular Endpoint Flags
```bash
# Migrate specific endpoints individually
EXPO_PUBLIC_EFFECT_RPC_TODOS=true      # Todo operations
EXPO_PUBLIC_EFFECT_RPC_AUTH=true       # Authentication
EXPO_PUBLIC_EFFECT_RPC_HEALTH=true     # Health check
```

### Development Flags
```bash
# Enable debugging and logging
EXPO_PUBLIC_DEBUG_RPC=true             # Debug RPC calls
EXPO_PUBLIC_LOG_MIGRATION=true         # Log which client is used
```

## Migration Strategies

### Strategy 1: All-at-Once Migration
```bash
# .env
EXPO_PUBLIC_USE_EFFECT_RPC=true
```

### Strategy 2: Gradual Endpoint Migration
```bash
# .env
EXPO_PUBLIC_USE_EFFECT_RPC=false
EXPO_PUBLIC_EFFECT_RPC_HEALTH=true     # Start with health check
EXPO_PUBLIC_LOG_MIGRATION=true         # Monitor usage
```

Then gradually enable more endpoints:
```bash
EXPO_PUBLIC_EFFECT_RPC_TODOS=true      # Add todos
EXPO_PUBLIC_EFFECT_RPC_AUTH=true       # Add auth
```

### Strategy 3: Platform-Specific Testing
```bash
# .env.development
EXPO_PUBLIC_USE_EFFECT_RPC=true
EXPO_PUBLIC_DEBUG_RPC=true

# .env.production
EXPO_PUBLIC_USE_EFFECT_RPC=false
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
EXPO_PUBLIC_LOG_MIGRATION=true
```

Check Metro console for migration logs:
```
[Migration] getAllTodos using effect-rpc client
[Migration] healthCheck using orpc client
```

### Debug Mode
```bash
EXPO_PUBLIC_DEBUG_RPC=true
```

Enables detailed RPC call debugging.

## Rollback Plan

If issues occur, immediately disable the problematic endpoint:

```bash
# Rollback todos to oRPC
EXPO_PUBLIC_EFFECT_RPC_TODOS=false

# Or rollback everything
EXPO_PUBLIC_USE_EFFECT_RPC=false
```

Changes take effect on next app reload.

## Testing

### Local Testing
1. Set feature flags in `.env`
2. Restart Expo development server
3. Test functionality on device/simulator
4. Monitor Metro console for migration logs

### Production Testing
1. Deploy with conservative flags (single endpoint)
2. Monitor application metrics and crash reports
3. Gradually enable more endpoints
4. Keep rollback plan ready

## Platform Considerations

### iOS Specific
- Test authentication flow thoroughly
- Verify network requests in iOS simulator
- Check for any iOS-specific networking issues

### Android Specific
- Test on various Android versions
- Verify network security config compatibility
- Check for Android-specific networking issues

## Troubleshooting

### Common Issues

**Issue**: "Effect is not defined"
**Solution**: Ensure `@effect/rpc` and `effect` are installed and Metro cache is cleared

**Issue**: Authentication not working with @effect/rpc
**Solution**: Check that auth cookies are properly passed in headers

**Issue**: Network requests failing on device
**Solution**: Verify server URL is accessible from device, check network security settings

**Issue**: Type errors with unified client
**Solution**: Ensure `@host/api` package exports are up to date, restart TypeScript server

### Getting Help

1. Check Metro console for migration logs
2. Enable debug mode: `EXPO_PUBLIC_DEBUG_RPC=true`
3. Verify feature flag values in console
4. Test with individual endpoint flags first
5. Clear Metro cache: `npx expo start --clear`

## Next Steps

1. Start with health check endpoint: `EXPO_PUBLIC_EFFECT_RPC_HEALTH=true`
2. Test on both iOS and Android
3. Monitor for 24 hours
4. Add todos: `EXPO_PUBLIC_EFFECT_RPC_TODOS=true`
5. Test thoroughly on both platforms
6. Monitor for 48 hours
7. Add auth: `EXPO_PUBLIC_EFFECT_RPC_AUTH=true`
8. After successful migration, enable global flag: `EXPO_PUBLIC_USE_EFFECT_RPC=true`

## Deployment Notes

### Expo Updates
- Feature flags work with Expo Updates
- Changes to environment variables require new build for production apps
- Use Expo Updates for gradual rollout in production

### App Store Considerations
- Test thoroughly before App Store submission
- Consider phased rollout using Expo Updates
- Keep rollback plan ready for production issues
