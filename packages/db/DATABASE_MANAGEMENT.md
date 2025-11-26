# AV-Daily Database Management Guide

This document provides comprehensive guidance for managing the AV-Daily database using the enhanced migration and seeding system.

## Overview

The AV-Daily database management system provides:

- **Enhanced Migration Management** - Advanced migration tools with rollback support
- **Environment-Specific Seeding** - Tailored seed data for different environments
- **Data Integrity Checking** - Automated validation and consistency checks
- **Backup & Recovery** - Comprehensive backup and restore capabilities
- **Deployment Management** - Safe, automated deployment workflows

## Quick Start

### Basic Operations

```bash
# Start database
pnpm run db:start

# Check migration status
pnpm run migration:status

# Run pending migrations
pnpm run migration:up

# Seed development data
pnpm run seed:development

# Check data integrity
pnpm run integrity:check
```

### Development Workflow

```bash
# 1. Start fresh development environment
pnpm run db:start
pnpm run migration:up
pnpm run seed:development

# 2. Make schema changes
# Edit schema files in src/schema/

# 3. Generate migration
pnpm run db:generate

# 4. Apply migration
pnpm run migration:up

# 5. Validate changes
pnpm run integrity:check
```

## Migration Management

### Migration Manager (`migration-manager.ts`)

Enhanced migration management with comprehensive features:

```bash
# Check migration status
pnpm run migration:status

# Run pending migrations (interactive)
pnpm run migration:up

# Validate schema against migrations
pnpm run migration:validate

# Show migration history
pnpm run migration:history
```

#### Features:
- **Interactive Migration** - Prompts for confirmation before running
- **Automatic Backup** - Creates backup before applying migrations
- **Schema Validation** - Validates database schema after migration
- **Migration History** - Tracks applied migrations with timestamps
- **Rollback Support** - Preparation for future rollback capabilities

### Creating Migrations

1. **Edit Schema Files**
   ```typescript
   // packages/db/src/schema/your-table.ts
   export const yourTable = pgTable("your_table", {
     id: uuid("id").primaryKey().defaultRandom(),
     // ... other columns
   });
   ```

2. **Generate Migration**
   ```bash
   pnpm run db:generate
   ```

3. **Review Generated SQL**
   ```bash
   # Check the generated migration file in src/migrations/
   cat packages/db/src/migrations/XXXX_your_migration.sql
   ```

4. **Apply Migration**
   ```bash
   pnpm run migration:up
   ```

## Seeding System

### Enhanced Seeding (`enhanced-seed.ts`)

Environment-specific seeding with validation and consistency checks:

```bash
# Development environment (full test data)
pnpm run seed:development

# Testing environment (minimal data)
pnpm run seed:testing

# Staging environment (production-like data)
pnpm run seed:staging

# Demo environment (presentation data)
pnpm run seed:demo
```

#### Seeding Options:

```bash
# Clean existing data before seeding
pnpm run seed:enhanced development --clean

# Validate data after seeding
pnpm run seed:enhanced development --validate

# Minimal seeding (essential data only)
pnpm run seed:enhanced development --minimal
```

### Environment-Specific Data

#### Development Environment
- **Users**: 5 test users with different KYC tiers
- **Roles**: Admin, moderator, user, premium_user
- **Permissions**: Full permission set
- **Wallets**: Pre-funded with test balances
- **Analytics**: Sample user analytics data

#### Testing Environment
- **Users**: 1 basic test user
- **Roles**: Admin, user (minimal set)
- **Permissions**: Basic permissions only
- **Data**: Minimal for automated testing

#### Staging Environment
- **Users**: Staging admin and user accounts
- **Data**: Production-like structure with safe test data
- **Validation**: Full integrity checks

#### Demo Environment
- **Users**: Demo user with showcase data
- **Data**: Curated for presentations and demos

## Data Integrity Management

### Integrity Checker (`data-integrity-checker.ts`)

Comprehensive data validation and consistency checking:

```bash
# Run full integrity check
pnpm run integrity:check

# Quick check (critical issues only)
pnpm run integrity:quick

# Generate detailed report
pnpm run integrity:report

# Attempt to fix critical issues
pnpm run integrity:fix
```

#### Check Categories:

1. **Orphaned Records**
   - Wallets without users
   - Savings plans without users
   - Transactions without users
   - Group members without groups/users

2. **Business Rules**
   - Negative wallet balances
   - Invalid date ranges in savings plans
   - Invalid KYC tiers
   - Inconsistent group member counts

3. **Data Consistency**
   - Savings plan amounts vs transaction totals
   - User analytics vs actual data
   - Group contribution calculations

4. **Performance Issues**
   - Missing recommended indexes
   - Large tables needing maintenance
   - Query performance problems

### Fixing Issues

The integrity checker can automatically fix certain critical issues:

```bash
# Fix critical issues automatically
pnpm run integrity:fix

# Review issues before fixing
pnpm run integrity:check
# Then manually run fix queries if needed
```

## Backup & Recovery

### Backup System (`backup.ts`)

Automated backup creation with compression and metadata:

```bash
# Create backup
pnpm run effect:backup-db

# Create backup with custom directory
BACKUP_DIR=./custom-backups pnpm run effect:backup-db
```

#### Backup Features:
- **Automatic Compression** - Gzip compression for space efficiency
- **Timestamped Files** - Unique filenames with timestamps
- **Metadata Tracking** - File size and creation details
- **Cross-Platform** - Works on macOS, Linux, and Windows

### Restore System (`restore.ts`)

Safe database restoration with multiple safety checks:

```bash
# Restore from backup
DB_RESTORE_CONFIRM=1 pnpm run effect:restore-db ./backups/backup_file.sql.gz

# Allow production restore (use with extreme caution)
DB_RESTORE_CONFIRM=1 DB_RESTORE_ALLOW_PRODUCTION=1 pnpm run effect:restore-db ./backup.sql.gz
```

#### Safety Features:
- **Confirmation Required** - Must set DB_RESTORE_CONFIRM=1
- **Production Protection** - Blocks production restores by default
- **Automatic Decompression** - Handles .gz files automatically
- **Validation Checks** - Verifies backup file exists

## Deployment Management

### Deployment Manager (`deployment-manager.ts`)

Comprehensive deployment workflow with safety checks:

```bash
# Development deployment
pnpm run deploy:development

# Staging deployment with seeding
pnpm run deploy:staging --seed

# Production deployment (requires additional confirmations)
pnpm run deploy:production

# Dry run (show what would be deployed)
pnpm run deploy:staging --dry-run
```

#### Deployment Features:
- **Environment-Specific** - Different strategies per environment
- **Safety Checks** - Pre-deployment validation
- **Automatic Backup** - Creates backup before deployment
- **Post-Deployment Validation** - Verifies deployment success
- **Rollback Preparation** - Sets up for potential rollback

### Deployment Workflow:

1. **Pre-Deployment Checks**
   - Database connectivity
   - Disk space validation
   - Environment-specific safety checks

2. **Backup Creation**
   - Automatic backup for production
   - Optional backup for other environments

3. **Migration Execution**
   - Applies pending migrations
   - Validates schema changes

4. **Seeding (Optional)**
   - Environment-specific data seeding
   - Data validation

5. **Post-Deployment Validation**
   - Schema validation
   - Data integrity checks
   - Functionality testing

## Environment Variables

### Required Variables

```bash
# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/avdaily

# Backup configuration (optional)
BACKUP_DIR=./backups

# Restore safety (required for restore operations)
DB_RESTORE_CONFIRM=1
DB_RESTORE_ALLOW_PRODUCTION=1  # Only for production restores
```

### Environment Detection

The system automatically detects the environment based on:
- `NODE_ENV` environment variable
- Database URL patterns
- Explicit environment parameters

## Best Practices

### Development

1. **Always backup before major changes**
   ```bash
   pnpm run effect:backup-db
   ```

2. **Run integrity checks regularly**
   ```bash
   pnpm run integrity:check
   ```

3. **Use environment-specific seeding**
   ```bash
   pnpm run seed:development
   ```

4. **Validate migrations before applying**
   ```bash
   pnpm run migration:status
   pnpm run migration:validate
   ```

### Production

1. **Always use deployment manager**
   ```bash
   pnpm run deploy:production
   ```

2. **Never skip backups**
   - Automatic backups are created during deployment
   - Manual backups before major changes

3. **Monitor integrity regularly**
   ```bash
   # Set up automated integrity checks
   pnpm run integrity:quick
   ```

4. **Use staging environment**
   - Test all changes in staging first
   - Validate deployment process

### Troubleshooting

#### Migration Issues

```bash
# Check migration status
pnpm run migration:status

# Validate current schema
pnpm run migration:validate

# Check for data issues
pnpm run integrity:check
```

#### Data Corruption

```bash
# Run comprehensive integrity check
pnpm run integrity:check --report

# Attempt automatic fixes
pnpm run integrity:fix

# Restore from backup if needed
DB_RESTORE_CONFIRM=1 pnpm run effect:restore-db ./backup.sql.gz
```

#### Performance Issues

```bash
# Check for performance problems
pnpm run integrity:check

# Review database statistics
pnpm run db:studio
```

## Monitoring and Maintenance

### Regular Tasks

1. **Daily**
   - Monitor application logs
   - Check system resources

2. **Weekly**
   - Run integrity checks
   - Review backup status
   - Monitor database performance

3. **Monthly**
   - Full database maintenance
   - Archive old backups
   - Review and optimize queries

### Automated Monitoring

Consider setting up automated monitoring for:
- Database connectivity
- Backup creation success
- Data integrity issues
- Performance degradation
- Disk space usage

## Security Considerations

### Access Control
- Use strong database passwords
- Limit database access by IP
- Use SSL/TLS for connections
- Regular security updates

### Backup Security
- Encrypt sensitive backups
- Secure backup storage
- Regular backup testing
- Access logging

### Production Safety
- Multiple confirmation steps
- Automated rollback capabilities
- Change approval processes
- Audit logging

## Support and Troubleshooting

### Common Issues

1. **Migration Failures**
   - Check database connectivity
   - Verify schema syntax
   - Review migration logs

2. **Seeding Errors**
   - Check data constraints
   - Verify foreign key relationships
   - Review seed data format

3. **Integrity Issues**
   - Run detailed integrity report
   - Check for data corruption
   - Verify business rule compliance

### Getting Help

1. **Check Logs**
   - Application logs
   - Database logs
   - Migration output

2. **Run Diagnostics**
   ```bash
   pnpm run integrity:report
   pnpm run migration:status
   ```

3. **Review Documentation**
   - Schema documentation
   - Migration history
   - Business requirements

For additional support, refer to the main project documentation or contact the development team.
