#!/usr/bin/env bun

import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { PlatformConfigProvider, Terminal } from "@effect/platform";
import { Effect, Layer, Console } from "effect";
import { fileURLToPath } from "node:url";
import { SqlClient } from "@effect/sql";
import { join } from "node:path";

import { PgLive } from "../database";

/**
 * Data Integrity Checker
 *
 * This script performs comprehensive data integrity checks on the AV-Daily database:
 * - Foreign key constraint validation
 * - Business rule validation
 * - Data consistency checks
 * - Performance analysis
 * - Orphaned record detection
 *
 * Usage:
 *   bun run src/scripts/data-integrity-checker.ts [options]
 *
 * Options:
 *   --fix     - Attempt to fix detected issues
 *   --report  - Generate detailed report
 *   --quick   - Run only critical checks
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface IntegrityIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  description: string;
  count: number;
  query?: string;
  fixQuery?: string;
}

interface IntegrityReport {
  timestamp: Date;
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  issues: IntegrityIssue[];
}

// ============================================================================
// Integrity Check Functions
// ============================================================================

const checkOrphanedRecords = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const issues: IntegrityIssue[] = [];

  yield* Console.log("🔍 Checking for orphaned records...\n");

  // Check orphaned wallets
  const orphanedWallets = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM wallets w 
    LEFT JOIN "user" u ON w.user_id = u.id 
    WHERE u.id IS NULL
  `;

  if ((orphanedWallets[0]?.count || 0) > 0) {
    issues.push({
      severity: 'critical',
      category: 'Orphaned Records',
      description: 'Wallets without corresponding users',
      count: orphanedWallets[0]?.count || 0,
      query: 'SELECT * FROM wallets w LEFT JOIN "user" u ON w.user_id = u.id WHERE u.id IS NULL',
      fixQuery: 'DELETE FROM wallets WHERE user_id NOT IN (SELECT id FROM "user")'
    });
  }

  // Check orphaned savings plans
  const orphanedPlans = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM savings_plans sp 
    LEFT JOIN "user" u ON sp.user_id = u.id 
    WHERE u.id IS NULL
  `;

  if ((orphanedPlans[0]?.count || 0) > 0) {
    issues.push({
      severity: 'critical',
      category: 'Orphaned Records',
      description: 'Savings plans without corresponding users',
      count: orphanedPlans[0]?.count || 0,
      query: 'SELECT * FROM savings_plans sp LEFT JOIN "user" u ON sp.user_id = u.id WHERE u.id IS NULL',
      fixQuery: 'DELETE FROM savings_plans WHERE user_id NOT IN (SELECT id FROM "user")'
    });
  }

  // Check orphaned transactions
  const orphanedTransactions = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM transactions t 
    LEFT JOIN "user" u ON t.user_id = u.id 
    WHERE u.id IS NULL
  `;

  if ((orphanedTransactions[0]?.count || 0) > 0) {
    issues.push({
      severity: 'critical',
      category: 'Orphaned Records',
      description: 'Transactions without corresponding users',
      count: orphanedTransactions[0]?.count || 0,
      query: 'SELECT * FROM transactions t LEFT JOIN "user" u ON t.user_id = u.id WHERE u.id IS NULL',
      fixQuery: 'DELETE FROM transactions WHERE user_id NOT IN (SELECT id FROM "user")'
    });
  }

  // Check orphaned group members
  const orphanedGroupMembers = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM group_members gm 
    LEFT JOIN ajo_groups ag ON gm.group_id = ag.id 
    LEFT JOIN "user" u ON gm.user_id = u.id 
    WHERE ag.id IS NULL OR u.id IS NULL
  `;

  if ((orphanedGroupMembers[0]?.count || 0) > 0) {
    issues.push({
      severity: 'critical',
      category: 'Orphaned Records',
      description: 'Group members without corresponding groups or users',
      count: orphanedGroupMembers[0]?.count || 0,
      query: 'SELECT * FROM group_members gm LEFT JOIN ajo_groups ag ON gm.group_id = ag.id LEFT JOIN "user" u ON gm.user_id = u.id WHERE ag.id IS NULL OR u.id IS NULL'
    });
  }

  yield* Console.log(`Found ${issues.length} orphaned record issues\n`);
  return issues;
});

const checkBusinessRules = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const issues: IntegrityIssue[] = [];

  yield* Console.log("📋 Checking business rules...\n");

  // Check negative wallet balances
  const negativeBalances = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM wallets 
    WHERE balance < 0
  `;

  if ((negativeBalances[0]?.count || 0) > 0) {
    issues.push({
      severity: 'critical',
      category: 'Business Rules',
      description: 'Wallets with negative balances',
      count: negativeBalances[0]?.count || 0,
      query: 'SELECT * FROM wallets WHERE balance < 0'
    });
  }

  // Check savings plans with invalid date ranges
  const invalidDateRanges = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM savings_plans 
    WHERE start_date > end_date
  `;

  if ((invalidDateRanges[0]?.count || 0) > 0) {
    issues.push({
      severity: 'critical',
      category: 'Business Rules',
      description: 'Savings plans with start date after end date',
      count: invalidDateRanges[0]?.count || 0,
      query: 'SELECT * FROM savings_plans WHERE start_date > end_date'
    });
  }

  // Check users with invalid KYC tiers
  const invalidKycTiers = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM "user" 
    WHERE kyc_tier NOT IN (0, 1, 2)
  `;

  if ((invalidKycTiers[0]?.count || 0) > 0) {
    issues.push({
      severity: 'warning',
      category: 'Business Rules',
      description: 'Users with invalid KYC tiers',
      count: invalidKycTiers[0]?.count || 0,
      query: 'SELECT * FROM "user" WHERE kyc_tier NOT IN (0, 1, 2)'
    });
  }

  // Check Ajo groups with inconsistent member counts
  const inconsistentMemberCounts = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM ajo_groups ag 
    LEFT JOIN (
      SELECT group_id, COUNT(*) as actual_count 
      FROM group_members 
      WHERE status = 'active' 
      GROUP BY group_id
    ) gm ON ag.id = gm.group_id 
    WHERE ag.current_member_count != COALESCE(gm.actual_count, 0)
  `;

  if ((inconsistentMemberCounts[0]?.count || 0) > 0) {
    issues.push({
      severity: 'warning',
      category: 'Business Rules',
      description: 'Ajo groups with inconsistent member counts',
      count: inconsistentMemberCounts[0]?.count || 0,
      query: `
        SELECT ag.id, ag.group_name, ag.current_member_count, COALESCE(gm.actual_count, 0) as actual_count
        FROM ajo_groups ag 
        LEFT JOIN (
          SELECT group_id, COUNT(*) as actual_count 
          FROM group_members 
          WHERE status = 'active' 
          GROUP BY group_id
        ) gm ON ag.id = gm.group_id 
        WHERE ag.current_member_count != COALESCE(gm.actual_count, 0)
      `
    });
  }

  // Check transactions with invalid amounts
  const invalidTransactionAmounts = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM transactions 
    WHERE amount <= 0
  `;

  if ((invalidTransactionAmounts[0]?.count || 0) > 0) {
    issues.push({
      severity: 'warning',
      category: 'Business Rules',
      description: 'Transactions with zero or negative amounts',
      count: invalidTransactionAmounts[0]?.count || 0,
      query: 'SELECT * FROM transactions WHERE amount <= 0'
    });
  }

  yield* Console.log(`Found ${issues.length} business rule violations\n`);
  return issues;
});

const checkDataConsistency = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const issues: IntegrityIssue[] = [];

  yield* Console.log("🔄 Checking data consistency...\n");

  // Check savings plan current amounts vs transaction totals
  const inconsistentSavingsAmounts = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM savings_plans sp 
    LEFT JOIN (
      SELECT 
        plan_id, 
        SUM(CASE WHEN type = 'contribution' AND status = 'completed' THEN amount ELSE 0 END) -
        SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN amount ELSE 0 END) as calculated_amount
      FROM transactions 
      WHERE plan_id IS NOT NULL 
      GROUP BY plan_id
    ) t ON sp.id = t.plan_id 
    WHERE ABS(sp.current_amount - COALESCE(t.calculated_amount, 0)) > 0.01
  `;

  if ((inconsistentSavingsAmounts[0]?.count || 0) > 0) {
    issues.push({
      severity: 'critical',
      category: 'Data Consistency',
      description: 'Savings plans with incorrect current amounts',
      count: inconsistentSavingsAmounts[0]?.count || 0,
      query: `
        SELECT sp.id, sp.plan_name, sp.current_amount, COALESCE(t.calculated_amount, 0) as calculated_amount
        FROM savings_plans sp 
        LEFT JOIN (
          SELECT 
            plan_id, 
            SUM(CASE WHEN type = 'contribution' AND status = 'completed' THEN amount ELSE 0 END) -
            SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN amount ELSE 0 END) as calculated_amount
          FROM transactions 
          WHERE plan_id IS NOT NULL 
          GROUP BY plan_id
        ) t ON sp.id = t.plan_id 
        WHERE ABS(sp.current_amount - COALESCE(t.calculated_amount, 0)) > 0.01
      `
    });
  }

  // Check user analytics vs actual data
  const inconsistentAnalytics = yield* sql<{ count: number }>`
    SELECT COUNT(*) as count 
    FROM user_analytics ua 
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as actual_active_plans,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as actual_completed_plans
      FROM savings_plans 
      GROUP BY user_id
    ) sp ON ua.user_id = sp.user_id 
    WHERE ua.active_plans != COALESCE(sp.actual_active_plans, 0) 
       OR ua.completed_plans != COALESCE(sp.actual_completed_plans, 0)
  `;

  if ((inconsistentAnalytics[0]?.count || 0) > 0) {
    issues.push({
      severity: 'warning',
      category: 'Data Consistency',
      description: 'User analytics with incorrect plan counts',
      count: inconsistentAnalytics[0]?.count || 0,
      query: `
        SELECT ua.user_id, ua.active_plans, ua.completed_plans, 
               COALESCE(sp.actual_active_plans, 0) as actual_active_plans,
               COALESCE(sp.actual_completed_plans, 0) as actual_completed_plans
        FROM user_analytics ua 
        LEFT JOIN (
          SELECT 
            user_id,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as actual_active_plans,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as actual_completed_plans
          FROM savings_plans 
          GROUP BY user_id
        ) sp ON ua.user_id = sp.user_id 
        WHERE ua.active_plans != COALESCE(sp.actual_active_plans, 0) 
           OR ua.completed_plans != COALESCE(sp.actual_completed_plans, 0)
      `
    });
  }

  yield* Console.log(`Found ${issues.length} data consistency issues\n`);
  return issues;
});

const checkPerformanceIssues = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const issues: IntegrityIssue[] = [];

  yield* Console.log("⚡ Checking performance issues...\n");

  // Check for missing indexes on frequently queried columns
  const missingIndexes = yield* sql<{ 
    table_name: string; 
    column_name: string; 
  }>`
    SELECT 
      t.table_name,
      c.column_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.column_name IN ('user_id', 'created_at', 'status', 'email')
    AND NOT EXISTS (
      SELECT 1 FROM pg_indexes i 
      WHERE i.tablename = t.table_name 
      AND i.indexdef LIKE '%' || c.column_name || '%'
    )
  `;

  if (missingIndexes.length > 0) {
    issues.push({
      severity: 'info',
      category: 'Performance',
      description: 'Tables missing recommended indexes',
      count: missingIndexes.length,
      query: 'Check pg_indexes for missing indexes on user_id, created_at, status, email columns'
    });
  }

  // Check for large tables without recent maintenance
  const largeTablesStats = yield* sql<{ 
    table_name: string; 
    row_count: number; 
  }>`
    SELECT 
      schemaname || '.' || tablename as table_name,
      n_tup_ins + n_tup_upd + n_tup_del as row_count
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    AND (n_tup_ins + n_tup_upd + n_tup_del) > 10000
    ORDER BY row_count DESC
  `;

  if (largeTablesStats.length > 0) {
    issues.push({
      severity: 'info',
      category: 'Performance',
      description: 'Large tables that may need maintenance',
      count: largeTablesStats.length,
      query: 'SELECT * FROM pg_stat_user_tables WHERE schemaname = \'public\' ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC'
    });
  }

  yield* Console.log(`Found ${issues.length} performance issues\n`);
  return issues;
});

// ============================================================================
// Fix Functions
// ============================================================================

const fixIssues = (issues: IntegrityIssue[]) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    
    yield* Console.log("🔧 Attempting to fix issues...\n");

    let fixedCount = 0;

    for (const issue of issues) {
      if (issue.fixQuery && issue.severity === 'critical') {
        try {
          yield* Console.log(`Fixing: ${issue.description}...\n`);
          yield* sql.unsafe(issue.fixQuery);
          fixedCount++;
          yield* Console.log(`✅ Fixed: ${issue.description}\n`);
        } catch (error) {
          yield* Console.log(`❌ Failed to fix: ${issue.description} - ${error}\n`);
        }
      }
    }

    yield* Console.log(`Fixed ${fixedCount} issues\n`);
  });

// ============================================================================
// Report Generation
// ============================================================================

const generateReport = (report: IntegrityReport) =>
  Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;

    yield* terminal.display("📊 Data Integrity Report\n");
    yield* terminal.display("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    yield* terminal.display(`Timestamp: ${report.timestamp.toISOString()}\n`);
    yield* terminal.display(`Total Issues: ${report.totalIssues}\n`);
    yield* terminal.display(`Critical: ${report.criticalIssues}\n`);
    yield* terminal.display(`Warnings: ${report.warningIssues}\n`);
    yield* terminal.display(`Info: ${report.infoIssues}\n\n`);

    if (report.issues.length === 0) {
      yield* terminal.display("✅ No issues found - database integrity is good!\n");
      return;
    }

    // Group issues by category
    const categories = [...new Set(report.issues.map(i => i.category))];
    
    for (const category of categories) {
      const categoryIssues = report.issues.filter(i => i.category === category);
      
      yield* terminal.display(`\n${category}:\n`);
      yield* terminal.display(`${"─".repeat(category.length + 1)}\n`);
      
      for (const issue of categoryIssues) {
        const severityIcon = issue.severity === 'critical' ? '🔴' : 
                           issue.severity === 'warning' ? '🟡' : '🔵';
        
        yield* terminal.display(`${severityIcon} ${issue.description} (${issue.count})\n`);
        
        if (issue.query) {
          yield* terminal.display(`   Query: ${issue.query.substring(0, 100)}...\n`);
        }
      }
    }

    yield* terminal.display("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });

// ============================================================================
// Main Program
// ============================================================================

const parseArgs = () => {
  const args = process.argv.slice(2);
  return {
    fix: args.includes('--fix'),
    report: args.includes('--report'),
    quick: args.includes('--quick'),
  };
};

const program = Effect.gen(function* () {
  const options = parseArgs();
  
  yield* Console.log("🔍 AV-Daily Data Integrity Checker\n");
  yield* Console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Run integrity checks
  const [orphanedIssues, businessRuleIssues, consistencyIssues, performanceIssues] = 
    yield* Effect.all([
      checkOrphanedRecords,
      checkBusinessRules,
      checkDataConsistency,
      options.quick ? Effect.succeed([]) : checkPerformanceIssues,
    ]);

  const allIssues = [
    ...orphanedIssues,
    ...businessRuleIssues,
    ...consistencyIssues,
    ...performanceIssues,
  ];

  const report: IntegrityReport = {
    timestamp: new Date(),
    totalIssues: allIssues.length,
    criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
    warningIssues: allIssues.filter(i => i.severity === 'warning').length,
    infoIssues: allIssues.filter(i => i.severity === 'info').length,
    issues: allIssues,
  };

  // Generate report
  yield* generateReport(report);

  // Fix issues if requested
  if (options.fix && report.criticalIssues > 0) {
    const criticalIssues = allIssues.filter(i => i.severity === 'critical');
    yield* fixIssues(criticalIssues);
  }

  // Exit with error code if critical issues found
  if (report.criticalIssues > 0) {
    yield* Console.log(`\n❌ Found ${report.criticalIssues} critical issues that need attention\n`);
    return yield* Effect.fail(new Error("Critical integrity issues found"));
  }

  yield* Console.log("\n✅ Data integrity check completed successfully!\n");
}).pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Console.log(`\n❌ Integrity check failed: ${error}\n`);
      return yield* Effect.fail(error);
    })
  )
);

const ConfigLayer = PlatformConfigProvider.layerDotEnv(
  join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../../../apps/server/.env"
  )
);

NodeRuntime.runMain(
  program.pipe(
    Effect.provide(
      Layer.mergeAll(NodeContext.layer, ConfigLayer).pipe(
        Layer.provide(NodeContext.layer)
      )
    ),
    Effect.provide(PgLive)
  )
);
