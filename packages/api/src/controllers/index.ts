/**
 * @fileoverview API Controllers
 *
 * This module exports all API controllers. Controllers are implemented as RPC handlers
 * in the rpc/ directory following the @effect/rpc pattern.
 *
 * ## Architecture:
 * - Controllers are defined as RPC groups in packages/api/src/rpc/
 * - Each controller handles a specific domain (savings, wallet, analytics)
 * - Controllers integrate with application use cases
 * - All controllers use Effect-TS for type-safe error handling
 *
 * ## Available Controllers:
 * - SavingsController: Savings plan management (savings-rpc.ts)
 * - WalletController: Wallet and transaction operations (wallet-rpc.ts)
 * - AnalyticsController: Analytics and reporting (analytics-rpc.ts)
 * - AuthController: Authentication operations (auth-rpc.ts)
 * - TodoController: Todo operations (todo-rpc.ts)
 *
 * @see {@link ../rpc/savings-rpc.ts} for savings controller implementation
 * @see {@link ../rpc/wallet-rpc.ts} for wallet controller implementation
 * @see {@link ../rpc/analytics-rpc.ts} for analytics controller implementation
 */

// Re-export RPC handlers as controllers
export {
  SavingsRpcs as SavingsController,
  SavingsHandlersLive,
} from "../rpc/savings-rpc";

export {
  WalletRpcs as WalletController,
  WalletHandlersLive,
} from "../rpc/wallet-rpc";

export {
  AnalyticsRpcs as AnalyticsController,
  AnalyticsHandlersLive,
} from "../rpc/analytics-rpc";

export { AuthRpcs as AuthController, AuthHandlersLive } from "../rpc/auth-rpc";

export { TodoRpcs as TodoController, TodoHandlersLive } from "../rpc/todo-rpc";
