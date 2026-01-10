import type { TransactionType } from "@host/shared";
import type {
  GatewayBankAccount,
  PaymentService,
  PaymentMethod,
  UserId,
  Money,
  Bank,
} from "@host/domain";

import { Effect, Context, Layer, pipe, Schedule, Duration } from "effect";
import { FlutterwavePaymentService } from "./flutterwave-payment-service";
import { PaystackPaymentService } from "./paystack-payment-service";
import { PaymentError } from "@host/domain";

/**
 * Composite Payment Service that provides failover between multiple payment providers
 */
export const CompositePaymentService = Context.GenericTag<PaymentService>(
  "@infrastructure/CompositePaymentService"
);

/**
 * Configuration for payment provider failover
 */
interface FailoverConfig {
  readonly primaryProvider: "paystack" | "flutterwave";
  readonly retryAttempts: number;
  readonly retryDelay: Duration.Duration;
  readonly enableFailover: boolean;
}

export const CompositePaymentServiceLive = Layer.effect(
  CompositePaymentService,
  Effect.gen(function* () {
    // Get both payment services - we need to provide them as dependencies
    const paystackService = yield* PaystackPaymentService;
    const flutterwaveService = yield* FlutterwavePaymentService;

    const config: FailoverConfig = {
      primaryProvider: "paystack", // Default to Paystack as primary
      retryAttempts: 3,
      retryDelay: Duration.seconds(2),
      enableFailover: true,
    };

    const getPrimaryService = () =>
      config.primaryProvider === "paystack"
        ? paystackService
        : flutterwaveService;

    const getSecondaryService = () =>
      config.primaryProvider === "paystack"
        ? flutterwaveService
        : paystackService;

    const withFailover = <A, E>(
      operation: (service: PaymentService) => Effect.Effect<A, E>
    ): Effect.Effect<A, E> => {
      const primaryAttempt = pipe(
        operation(getPrimaryService()),
        Effect.retry(
          Schedule.exponential(config.retryDelay, 2.0).pipe(
            Schedule.intersect(Schedule.recurs(config.retryAttempts))
          )
        ),
        Effect.tapError((error) =>
          Effect.logWarning(
            `Primary payment provider (${config.primaryProvider}) failed`,
            error
          )
        )
      );

      if (!config.enableFailover) {
        return primaryAttempt;
      }

      return pipe(
        primaryAttempt,
        Effect.catchAll((primaryError) =>
          pipe(
            operation(getSecondaryService()),
            Effect.retry(
              Schedule.exponential(config.retryDelay, 2.0).pipe(
                Schedule.intersect(Schedule.recurs(config.retryAttempts))
              )
            ),
            Effect.tapError((error) =>
              Effect.logError(
                "Secondary payment provider failed, both providers exhausted",
                error
              )
            ),
            Effect.tap(() =>
              Effect.logInfo(
                `Successfully failed over to secondary provider (${
                  config.primaryProvider === "paystack"
                    ? "flutterwave"
                    : "paystack"
                })`
              )
            ),
            Effect.catchAll(() => Effect.fail(primaryError)) // Return original error if both fail
          )
        )
      );
    };

    return CompositePaymentService.of({
      processPayment: (
        userId: UserId,
        amount: Money,
        paymentMethodId: string,
        reference: string
      ) =>
        withFailover((service) =>
          service.processPayment(userId, amount, paymentMethodId, reference)
        ),

      processWithdrawal: (
        userId: UserId,
        amount: Money,
        bankAccount: GatewayBankAccount,
        reference: string
      ) =>
        withFailover((service) =>
          service.processWithdrawal(userId, amount, bankAccount, reference)
        ),

      verifyTransaction: (reference: string) =>
        withFailover((service) => service.verifyTransaction(reference)),

      getPaymentMethods: (userId: UserId) =>
        Effect.gen(function* () {
          // Combine payment methods from both providers
          const primaryMethods = yield* pipe(
            getPrimaryService().getPaymentMethods(userId),
            Effect.catchAll(() => Effect.succeed([] as PaymentMethod[]))
          );

          const secondaryMethods = yield* pipe(
            getSecondaryService().getPaymentMethods(userId),
            Effect.catchAll(() => Effect.succeed([] as PaymentMethod[]))
          );

          // Merge and deduplicate methods
          const allMethods = [...primaryMethods, ...secondaryMethods];
          const uniqueMethods = allMethods.filter(
            (method, index, self) =>
              index === self.findIndex((m) => m.type === method.type)
          );

          return uniqueMethods;
        }),

      addPaymentMethod: (
        userId: UserId,
        paymentDetails: Record<string, unknown>
      ) =>
        withFailover((service) =>
          service.addPaymentMethod(userId, paymentDetails)
        ),

      removePaymentMethod: (userId: UserId, paymentMethodId: string) =>
        withFailover((service) =>
          service.removePaymentMethod(userId, paymentMethodId)
        ),

      getSupportedBanks: () =>
        Effect.gen(function* () {
          // Combine banks from both providers
          const primaryBanks = yield* pipe(
            getPrimaryService().getSupportedBanks(),
            Effect.catchAll(() => Effect.succeed([] as Bank[]))
          );

          const secondaryBanks = yield* pipe(
            getSecondaryService().getSupportedBanks(),
            Effect.catchAll(() => Effect.succeed([] as Bank[]))
          );

          // Merge and deduplicate banks by code
          const allBanks = [...primaryBanks, ...secondaryBanks];
          const uniqueBanks = allBanks.filter(
            (bank, index, self) =>
              index === self.findIndex((b) => b.code === bank.code)
          );

          return uniqueBanks;
        }),

      resolveBankAccount: (accountNumber: string, bankCode: string) =>
        withFailover((service) =>
          service.resolveBankAccount(accountNumber, bankCode)
        ),

      calculateFees: (amount: Money, transactionType: TransactionType) =>
        Effect.gen(function* () {
          // Use primary provider for fee calculation
          const primaryFees = yield* pipe(
            getPrimaryService().calculateFees(amount, transactionType),
            Effect.catchAll(() =>
              // Fallback to secondary provider
              getSecondaryService().calculateFees(amount, transactionType)
            )
          );

          return primaryFees;
        }),

      handleWebhook: (payload: Record<string, unknown>, signature: string) =>
        Effect.gen(function* () {
          // Try to determine which provider the webhook is from
          const provider = payload["provider"] as string | undefined;

          if (
            provider === "paystack" ||
            payload["event"]?.toString().includes("paystack")
          ) {
            return yield* paystackService.handleWebhook(payload, signature);
          }

          if (
            provider === "flutterwave" ||
            payload["event"]?.toString().includes("flutterwave")
          ) {
            return yield* flutterwaveService.handleWebhook(payload, signature);
          }

          // Try both providers if we can't determine the source
          const paystackResult = yield* pipe(
            paystackService.handleWebhook(payload, signature),
            Effect.catchAll(() =>
              Effect.fail(
                new PaymentError({
                  code: "WEBHOOK_PROCESSING_FAILED",
                  message: "Paystack webhook processing failed",
                  provider: "Paystack",
                })
              )
            )
          );

          return paystackResult;
        }),
    });
  })
);
