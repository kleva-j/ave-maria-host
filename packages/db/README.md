# Database Package

This package contains the database schema, migrations, and utilities for the AV-Daily application.

## Overview

- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Effect-TS Integration**: Full Effect-TS support for type-safe database operations
- **Migration System**: Both Drizzle Kit and Effect-TS migration runners

## Directory Structure

```
packages/db/
├── src/
│   ├── schema/           # Database schema definitions
│   │   ├── auth.ts       # Authentication tables
│   │   ├── savings.ts    # Savings plans and transactions
│   │   ├── groups.ts     # Ajo/Esusu group tables
│   │   ├── permissions.ts # RBAC tables
│   │   ├── analytics.ts  # Analytics and reporting tables
│   │   └── notifications.ts # Notification tables
│   ├── migrations/       # Generated migration files
│   ├── scripts/          # Database utility scripts
│   │   ├── migrator.ts   # Run migrations
│   │   ├── reset.ts      # Reset database
│   │   ├── seed.ts       # Seed test data
│   │   ├── backup.ts     # Backup database
│   │   └── restore.ts    # Restore from backup
│   ├── effects/          # Effect-TS service implementations
│   ├── database.ts       # Database connection configuration
│   └── index.ts          # Package exports
├── backups/              # Database backups (gitignored)
├── docker-compose.yml    # Local PostgreSQL setup
└── drizzle.config.ts     # Drizzle Kit configuration
```

## Getting Started

### 1. Start PostgreSQL Database

```bash
# Start PostgreSQL in Docker
pnpm run db:start

# Or watch logs
pnpm run db:watch

# Stop database
pnpm run db:stop

# Stop and remove containers
pnpm run db:down
```

### 2. Environment Variables

Create a `.env` file in `apps/server/` with:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/avdaily
```

### 3. Run Migrations

```bash
# Generate migration files from schema changes
pnpm run db:generate

# Apply migrations using Drizzle Kit
pnpm run db:migrate

# Or use Effect-TS migration runner
pnpm run effect:migrate-db
```

### 4. Seed Development Data

```bash
# Seed the database with test data
pnpm run effect:seed-db

# Or with Node.js
pnpm run effect:seed-db:node
```

This will create:
- System roles (admin, moderator, user, premium_user)
- System permissions for all resources
- Test users with different KYC tiers
- Sample savings plans
- Sample Ajo groups
- Sample transactions
- Notification preferences

**Test Users Created:**
- `admin@avdaily.test` - Admin user (KYC Tier 2)
- `user1@avdaily.test` - Regular user (KYC Tier 1)
- `user2@avdaily.test` - Regular user (KYC Tier 2)
- `user3@avdaily.test` - Unverified user (KYC Tier 0)

## Database Operations

### Schema Management

```bash
# Push schema changes directly to database (development only)
pnpm run db:push

# Open Drizzle Studio to browse data
pnpm run db:studio
```

### Reset Database

⚠️ **WARNING**: This will delete all data!

```bash
# Reset database (requires confirmation)
DB_RESET_CONFIRM=1 pnpm run effect:reset-db

# Allow reset in production (use with extreme caution)
DB_RESET_CONFIRM=1 DB_RESET_ALLOW_PRODUCTION=1 pnpm run effect:reset-db
```

### Backup and Restore

#### Create Backup

```bash
# Create a backup of the database
pnpm run effect:backup-db

# Backups are stored in packages/db/backups/
# Format: avdaily_backup_YYYY-MM-DD_HH-MM-SS.sql.gz
```

#### Restore from Backup

```bash
# Restore database from backup (requires confirmation)
DB_RESTORE_CONFIRM=1 pnpm run effect:restore-db ./backups/avdaily_backup_2024-01-01_12-00-00.sql.gz

# Allow restore in production (use with extreme caution)
DB_RESTORE_CONFIRM=1 DB_RESTORE_ALLOW_PRODUCTION=1 pnpm run effect:restore-db <backup-file>
```

## Schema Overview

### Authentication & Users
- `user` - User accounts with KYC information
- `account` - OAuth provider accounts
- `session` - User sessions with refresh tokens
- `verification` - Email/phone verification codes
- `biometric_auth` - Biometric authentication keys
- `kyc_verification` - KYC verification records
- `phone_verification` - Phone OTP verification

### Savings & Transactions
- `savings_plans` - Flexi-Daily savings plans
- `transactions` - All financial transactions
- `wallets` - User wallet balances

### Groups (Ajo/Esusu)
- `ajo_groups` - Group savings schemes
- `group_members` - Group membership
- `group_contributions` - Member contributions
- `group_payouts` - Payout records
- `group_invitations` - Group invitations

### Permissions & Roles
- `roles` - System and custom roles
- `permissions` - Granular permissions
- `role_permissions` - Role-permission mappings
- `user_roles` - User role assignments
- `user_permissions` - Direct user permissions

### Analytics & Gamification
- `user_analytics` - User savings statistics
- `daily_analytics` - System-wide daily metrics
- `savings_milestones` - Achievement tracking
- `rewards` - User rewards and badges

### Notifications
- `notifications` - Notification history
- `notification_preferences` - User preferences
- `push_tokens` - Push notification tokens
- `scheduled_notifications` - Scheduled notifications

### Audit & Compliance
- `audit_log` - System audit trail

## Migration Workflow

### Development Workflow

1. **Modify Schema**: Edit files in `src/schema/`
2. **Generate Migration**: `pnpm run db:generate`
3. **Review Migration**: Check generated SQL in `src/migrations/`
4. **Apply Migration**: `pnpm run effect:migrate-db`
5. **Seed Data**: `pnpm run effect:seed-db` (if needed)

### Production Workflow

1. **Test Locally**: Run migrations on local database
2. **Backup Production**: `pnpm run effect:backup-db`
3. **Apply Migration**: `pnpm run effect:migrate-db`
4. **Verify**: Check application functionality
5. **Rollback if Needed**: Restore from backup

## Effect-TS Integration

The database package provides Effect-TS services for type-safe database operations:

```typescript
import { Effect } from "effect";
import { PgLive } from "@host/db";
import { SqlClient } from "@effect/sql";

const program = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  
  const users = yield* sql<{ id: string; email: string }>`
    SELECT id, email FROM "user" WHERE is_active = true
  `;
  
  return users;
});

// Run with database layer
Effect.runPromise(program.pipe(Effect.provide(PgLive)));
```

## Best Practices

### Schema Changes

1. **Always generate migrations** - Don't use `db:push` in production
2. **Review generated SQL** - Check migrations before applying
3. **Test migrations** - Apply to local database first
4. **Backup before migrating** - Always backup production data
5. **Use transactions** - Migrations run in transactions by default

### Seeding

1. **Idempotent seeds** - Seeds should be safe to run multiple times
2. **Use ON CONFLICT** - Handle existing data gracefully
3. **Separate test data** - Keep test data separate from production seeds
4. **Document test accounts** - Clearly mark test users

### Backups

1. **Regular backups** - Schedule automated backups
2. **Test restores** - Regularly test backup restoration
3. **Secure storage** - Store backups securely
4. **Retention policy** - Define backup retention periods

## Troubleshooting

### Migration Fails

```bash
# Check database connection
pnpm run db:studio

# Reset and reapply (development only)
DB_RESET_CONFIRM=1 pnpm run effect:reset-db
pnpm run effect:migrate-db
```

### Connection Issues

```bash
# Check if PostgreSQL is running
pnpm run db:start

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

### Seed Fails

```bash
# Reset database and try again
DB_RESET_CONFIRM=1 pnpm run effect:reset-db
pnpm run effect:migrate-db
pnpm run effect:seed-db
```

## Security Notes

### Production Safety

- Reset and restore operations require explicit confirmation
- Production operations require additional environment variable
- All destructive operations are logged
- Backup files should be encrypted and stored securely

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:password@host:port/database

# Safety checks
DB_RESET_CONFIRM=1                    # Required for reset
DB_RESET_ALLOW_PRODUCTION=1           # Required for production reset
DB_RESTORE_CONFIRM=1                  # Required for restore
DB_RESTORE_ALLOW_PRODUCTION=1         # Required for production restore
NODE_ENV=production                   # Environment indicator

# Optional
BACKUP_DIR=./backups                  # Custom backup directory
```

## Contributing

When adding new tables or modifying schema:

1. Update schema files in `src/schema/`
2. Generate migration: `pnpm run db:generate`
3. Update seed script if needed: `src/scripts/seed.ts`
4. Update this README with new tables
5. Test locally before committing

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Effect-TS Documentation](https://effect.website/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
