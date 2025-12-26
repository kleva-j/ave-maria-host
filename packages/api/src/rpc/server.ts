/**
 * @fileoverview @effect/rpc Server Integration
 *
 * This module provides server-side integration for @effect/rpc with the existing
 * Better-T-Stack infrastructure. It handles HTTP protocol setup, middleware integration,
 * and service layer composition.
 *
 * ## Key Features:
 * - **HTTP Protocol**: Native HTTP transport for RPC communication
 * - **Middleware Integration**: Authentication and other middleware support
 * - **Service Composition**: Integration with existing Effect services
 * - **Error Handling**: Proper error mapping and response formatting
 */

// Import services
import type { RedisRateLimiterService } from "@host/infrastructure";
import type { HttpServer } from "@effect/platform";
import type { DatabaseService } from "@host/db";
import type { Hono } from "hono";
import type {
  WithdrawFromSavingsPlanUseCase,
  GetSavingsPlanProgressUseCase,
  GenerateProgressReportUseCase,
  GetTransactionHistoryUseCase,
  ValidateContributionUseCase,
  ProcessContributionUseCase,
  GetSpendingInsightsUseCase,
  GetSavingsAnalyticsUseCase,
  SuspendUserAccountUseCase,
  CreateSavingsPlanUseCase,
  UpdateSavingsPlanUseCase,
  UpdateUserProfileUseCase,
  GetLinkedAccountsUseCase,
  GetPaymentMethodsUseCase,
  CalculateRewardsUseCase,
  GetWalletBalanceUseCase,
  LinkBankAccountUseCase,
  ListSavingsPlanUseCase,
  UpdateKycStatusUseCase,
  GetUserProfileUseCase,
  GetSavingsPlanUseCase,
  WithdrawFundsUseCase,
  FundWalletUseCase,
} from "@host/application";

// Import service layer
import { AuthService } from "@host/auth";

// Import Effect tools
import { RpcServer, RpcSerialization } from "@effect/rpc";
import { HttpRouter, Headers } from "@effect/platform";
import { Effect, Layer, Option } from "effect";

// Import RPC groups
import { AnalyticsRpcs, AnalyticsHandlersLive } from "./analytics-rpc";
import { SavingsRpcs, SavingsHandlersLive } from "./savings-rpc";
import { PaymentRpcs, PaymentHandlersLive } from "./payment-rpc";
import { WalletRpcs, WalletHandlersLive } from "./wallet-rpc";
import { UserRpcs, UserHandlersLive } from "./user-rpc";
import { TodoRpcs, TodoHandlersLive } from "./todo-rpc";
import {
  AuthenticationError,
  AuthValidationError,
  AuthorizationError,
  AuthHandlersLive,
  AuthMiddleware,
  AuthRpcs,
} from "./auth-rpc";
import {
  EmailVerificationHandlersLive,
  EmailVerificationRpcs,
} from "./email-verification-rpc";

export type AppUseCaseGroup =
  | WithdrawFromSavingsPlanUseCase
  | GetSavingsPlanProgressUseCase
  | GenerateProgressReportUseCase
  | GetTransactionHistoryUseCase
  | ValidateContributionUseCase
  | ProcessContributionUseCase
  | GetSavingsAnalyticsUseCase
  | GetSpendingInsightsUseCase
  | SuspendUserAccountUseCase
  | GetPaymentMethodsUseCase
  | CreateSavingsPlanUseCase
  | UpdateSavingsPlanUseCase
  | GetLinkedAccountsUseCase
  | UpdateUserProfileUseCase
  | GetWalletBalanceUseCase
  | CalculateRewardsUseCase
  | UpdateKycStatusUseCase
  | LinkBankAccountUseCase
  | ListSavingsPlanUseCase
  | GetUserProfileUseCase
  | GetSavingsPlanUseCase
  | WithdrawFundsUseCase
  | FundWalletUseCase;

/**
 * Combined RPC groups for the entire application
 */
export const AppRpcs = TodoRpcs.merge(AuthRpcs)
  .merge(EmailVerificationRpcs)
  .merge(AnalyticsRpcs)
  .merge(SavingsRpcs)
  .merge(PaymentRpcs)
  .merge(WalletRpcs)
  .merge(UserRpcs);

/**
 * Authentication middleware implementation for the server
 * This validates tokens and provides user context to RPC handlers
 *
 * Note: The middleware throws errors instead of using Effect.fail to ensure
 * they are properly caught by the RPC framework's error handling system.
 */
export const AuthMiddlewareLive: Layer.Layer<
  AuthMiddleware,
  never,
  AuthService
> = Layer.effect(
  AuthMiddleware,
  Effect.gen(function* (_) {
    const authService = yield* _(AuthService);

    return AuthMiddleware.of(({ headers }) =>
      Effect.gen(function* (_) {
        // Extract token from Authorization header
        const authHeaderOption = Headers.get(headers, "authorization");

        if (Option.isNone(authHeaderOption)) {
          throw new AuthorizationError({
            message: "Authorization header missing",
            action: "token_validation",
          });
        }

        const authHeader = authHeaderOption.value;
        const token = authHeader.replace(/^Bearer\s+/, "");

        if (!token || token === authHeader) {
          throw new AuthValidationError({
            field: "authorization",
            value: authHeader,
            message:
              "Invalid authorization header format. Expected 'Bearer <token>'",
          });
        }

        // Validate token and get authentication context
        // Use orDie to convert Effect errors to exceptions that the middleware can handle
        const authContext = yield* _(
          authService.validateToken(token).pipe(
            Effect.mapError((error) => {
              if (error._tag === "InvalidTokenError") {
                return new AuthenticationError({
                  type: "InvalidToken",
                  message: "Invalid or malformed token",
                });
              }
              if (error._tag === "SessionExpiredError") {
                return new AuthenticationError({
                  type: "SessionExpired",
                  message: "Token has expired",
                });
              }
              if (error._tag === "UserNotFoundError") {
                return new AuthenticationError({
                  type: "UserNotFound",
                  message: "User associated with token not found",
                });
              }
              // Fallback for any other auth errors
              return new AuthenticationError({
                type: "InvalidToken",
                message: "Authentication failed",
              });
            }),
            Effect.orDie
          )
        );

        // Map the auth service user to the RPC User schema
        // The auth service User has additional fields (emailVerified, image)
        // that we don't include in the RPC User schema
        return {
          id: authContext.user.id,
          email: authContext.user.email,
          name: authContext.user.name,
          createdAt: authContext.user.createdAt,
          updatedAt: authContext.user.updatedAt,
        };
      })
    );
  })
);

/**
 * Web handler for RPC communication
 * Creates a complete RPC web handler with all services integrated
 *
 * TODO: Full implementation requires proper use case layer setup and dependency injection
 */
export const createRpcWebHandler = (
  _authServiceLayer: Layer.Layer<AuthService>,
  _databaseServiceLayer: Layer.Layer<DatabaseService>,
  _redisRateLimiterServiceLayer: Layer.Layer<RedisRateLimiterService>
) => {
  return Effect.succeed((_request: Request) => {
    // For now, return a simple response indicating RPC is available
    // Full implementation requires proper use case layer setup
    return Promise.resolve(
      new Response(
        JSON.stringify({
          message: "RPC endpoint available",
          timestamp: new Date().toISOString(),
          status: "RPC handlers registered (use case integration pending)",
          handlers: [
            "TodoHandlersLive",
            "AuthHandlersLive",
            "SavingsHandlersLive",
            "WalletHandlersLive",
            "PaymentHandlersLive",
            "AnalyticsHandlersLive",
            "EmailVerificationHandlersLive",
            "UserHandlersLive",
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      )
    );
  });
};

/**
 * Combined RPC server layer with all handlers
 * Requires AuthService and DatabaseService to be provided
 */

type RpcServerDeps =
  | RedisRateLimiterService
  | RpcServer.Protocol
  | DatabaseService
  | AppUseCaseGroup
  | AuthService;

export const RpcServerLive: Layer.Layer<never, never, RpcServerDeps> =
  RpcServer.layer(AppRpcs).pipe(
    // Handlers
    Layer.provide(TodoHandlersLive),
    Layer.provide(AuthHandlersLive),
    Layer.provide(WalletHandlersLive),
    Layer.provide(SavingsHandlersLive),
    Layer.provide(PaymentHandlersLive),
    Layer.provide(AnalyticsHandlersLive),
    Layer.provide(EmailVerificationHandlersLive),
    Layer.provide(UserHandlersLive),
    // Middleware
    Layer.provide(AuthMiddlewareLive)
  );

/**
 * HTTP protocol layer for RPC communication
 */
export const RpcHttpProtocolLive: Layer.Layer<RpcServer.Protocol> =
  RpcServer.layerProtocolHttp({
    path: "/rpc",
  }).pipe(Layer.provide(RpcSerialization.layerNdjson));

/**
 * Complete RPC layer ready for integration with HTTP server
 * Requires AuthService, DatabaseService, and all use cases to be provided
 */
export const RpcLayerLive: Layer.Layer<
  never,
  never,
  | AuthService
  | DatabaseService
  | RedisRateLimiterService
  | HttpServer.HttpServer
  | AppUseCaseGroup
> = HttpRouter.Default.serve().pipe(
  Layer.provide(RpcServerLive),
  Layer.provide(RpcHttpProtocolLive)
);

/**
 * Create a complete RPC layer with all dependencies provided
 *
 * Note: This function requires all use case layers to be provided separately.
 * The use cases are not automatically wired up yet.
 *
 * @param authServiceLayer - The authentication service layer
 * @param databaseServiceLayer - The database service layer
 * @returns A complete RPC layer ready for use (requires use case layers)
 *
 * @example
 * ```typescript
 * import { AuthServiceLive } from "@host/auth";
 * import { DatabaseServiceLive } from "@host/db";
 *
 * const completeRpcLayer = createCompleteRpcLayer(
 *   AuthServiceLive,
 *   DatabaseServiceLive
 * );
 * // Note: You still need to provide use case layers
 * ```
 */
export const createCompleteRpcLayer = (
  authServiceLayer: Layer.Layer<AuthService>,
  databaseServiceLayer: Layer.Layer<DatabaseService>,
  redisRateLimiterServiceLayer: Layer.Layer<RedisRateLimiterService>
): Layer.Layer<never, never, HttpServer.HttpServer | AppUseCaseGroup> =>
  RpcLayerLive.pipe(
    Layer.provide(authServiceLayer),
    Layer.provide(databaseServiceLayer),
    Layer.provide(redisRateLimiterServiceLayer)
  );

/**
 * Integration helper for Hono applications
 * This allows mounting the RPC server on an existing Hono app
 *
 * @param app - The Hono application instance
 * @param authServiceLayer - The authentication service layer
 * @param databaseServiceLayer - The database service layer
 * @returns The Hono app with RPC endpoints mounted
 *
 * @example
 * ```typescript
 * import { AuthServiceLive } from "@host/auth";
 * import { DatabaseServiceLive } from "@host/db";
 *
 * const app = new Hono();
 * const rpcApp = integrateWithHono(app, AuthServiceLive, DatabaseServiceLive);
 * ```
 */
export const integrateWithHono = (
  app: Hono,
  authServiceLayer: Layer.Layer<AuthService>,
  databaseServiceLayer: Layer.Layer<DatabaseService>,
  redisRateLimiterServiceLayer: Layer.Layer<RedisRateLimiterService>
) => {
  // Create the web handler once and reuse it
  let webHandlerPromise: Promise<
    (request: Request) => Promise<Response>
  > | null = null;

  // Mount the RPC web handler at the /rpc endpoint
  app.all("/rpc", async (c) => {
    try {
      // Create the web handler if it doesn't exist
      if (!webHandlerPromise) {
        webHandlerPromise = Effect.runPromise(
          createRpcWebHandler(
            authServiceLayer,
            databaseServiceLayer,
            redisRateLimiterServiceLayer
          )
        );
      }

      const webHandler = await webHandlerPromise;
      const response = await webHandler(c.req.raw);

      return response;
    } catch (error) {
      console.error("RPC handler error:", error);
      return new Response(
        JSON.stringify({
          error: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  });

  return app;
};
