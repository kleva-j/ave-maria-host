import type { HttpClientError } from "@effect/platform";
import type { UserId, Money } from "@host/domain";
import type {
  PaymentService,
  PaymentResult,
  PaymentMethod,
  BankAccount,
  Bank,
} from "@host/domain";

import { DEFAULT_CURRENCY, type CurrencyCode } from "@host/shared";

import { Effect, Context, Layer, Config, Data, pipe, Redacted } from "effect";
import { PaymentError, PaymentStatus } from "@host/domain";
import {
  HttpClientResponse,
  HttpClientRequest,
  HttpClient,
} from "@effect/platform";

/**
 * Flutterwave API configuration
 */
interface FlutterwaveConfig {
  readonly secretKey: string;
  readonly publicKey: string;
  readonly encryptionKey: string;
  readonly webhookSecret: string;
  readonly baseUrl: string;
}

/**
 * Flutterwave API response wrapper
 */
interface FlutterwaveResponse {
  readonly status: string;
  readonly message: string;
  readonly data: unknown;
}

/**
 * Flutterwave API errors
 */
class FlutterwaveApiError extends Data.TaggedError("FlutterwaveApiError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {}

/**
 * Flutterwave API client using @effect/platform
 */
class FlutterwaveClient {
  constructor(
    private readonly config: FlutterwaveConfig,
    private readonly httpClient: HttpClient.HttpClient
  ) {}

  private request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: unknown;
      query?: Record<string, string>;
    } = {}
  ): Effect.Effect<T, FlutterwaveApiError | HttpClientError.HttpClientError> {
    const { method = "GET", body, query } = options;
    const self = this;

    return pipe(
      Effect.gen(function* () {
        // Create the request
        let request = HttpClientRequest.make(method)(
          `${self.config.baseUrl}${endpoint}`
        );

        // Add authorization header
        request = HttpClientRequest.setHeader(
          request,
          "Authorization",
          `Bearer ${self.config.secretKey}`
        );
        request = HttpClientRequest.setHeader(
          request,
          "Content-Type",
          "application/json"
        );

        // Add query parameters if provided
        if (query) {
          request = HttpClientRequest.setUrlParams(request, query);
        }

        // Add body if provided
        if (body) {
          request = HttpClientRequest.bodyUnsafeJson(request, body);
        }

        // Execute the request
        const response = yield* self.httpClient.execute(request);

        // Parse JSON response
        const flutterwaveResponse = (yield* HttpClientResponse.json(
          response
        )) as FlutterwaveResponse;

        // Validate Flutterwave response status
        if (flutterwaveResponse.status !== "success") {
          return yield* Effect.fail(
            new FlutterwaveApiError({
              message:
                flutterwaveResponse.message || "Flutterwave API request failed",
            })
          );
        }

        return flutterwaveResponse.data as T;
      }),

      // Add logging
      Effect.tap(() =>
        Effect.logDebug(`Flutterwave API request: ${method} ${endpoint}`)
      ),
      Effect.tapError((error) =>
        Effect.logError(`Flutterwave API error: ${method} ${endpoint}`, error)
      )
    );
  }

  initializePayment(params: {
    tx_ref: string;
    amount: number;
    currency: string;
    customer: { email: string; name?: string };
    payment_options?: string;
  }): Effect.Effect<
    {
      link: string;
    },
    FlutterwaveApiError | HttpClientError.HttpClientError
  > {
    return this.request("/payments", {
      method: "POST",
      body: params,
    });
  }

  verifyTransaction(transactionId: string): Effect.Effect<
    {
      id: number;
      tx_ref: string;
      flw_ref: string;
      amount: number;
      currency: string;
      charged_amount: number;
      app_fee: number;
      status: string;
      customer: { email: string };
    },
    FlutterwaveApiError | HttpClientError.HttpClientError
  > {
    return this.request(`/transactions/${transactionId}/verify`, {
      method: "GET",
    });
  }

  createTransfer(params: {
    account_bank: string;
    account_number: string;
    amount: number;
    currency: string;
    reference: string;
    narration?: string;
    beneficiary_name?: string;
  }): Effect.Effect<
    {
      id: number;
      reference: string;
      status: string;
      amount: number;
      fee: number;
    },
    FlutterwaveApiError | HttpClientError.HttpClientError
  > {
    return this.request("/transfers", {
      method: "POST",
      body: params,
    });
  }

  listBanks(country = "NG"): Effect.Effect<
    Array<{
      id: number;
      code: string;
      name: string;
    }>,
    FlutterwaveApiError | HttpClientError.HttpClientError
  > {
    return this.request(`/banks/${country}`, {
      method: "GET",
    });
  }

  resolveAccount(params: {
    account_number: string;
    account_bank: string;
  }): Effect.Effect<
    {
      account_number: string;
      account_name: string;
    },
    FlutterwaveApiError | HttpClientError.HttpClientError
  > {
    return this.request("/accounts/resolve", {
      method: "POST",
      body: params,
    });
  }

  verifyWebhookSignature(signature: string): Effect.Effect<boolean, never> {
    return Effect.sync(() => signature === this.config.webhookSecret);
  }
}

/**
 * Flutterwave implementation of PaymentService
 */
export const FlutterwavePaymentService = Context.GenericTag<PaymentService>(
  "@infrastructure/FlutterwavePaymentService"
);

export const FlutterwavePaymentServiceLive = Layer.effect(
  FlutterwavePaymentService,
  Effect.gen(function* () {
    const secretKey = yield* Config.redacted("FLUTTERWAVE_SECRET_KEY");
    const publicKey = yield* Config.string("FLUTTERWAVE_PUBLIC_KEY");
    const encryptionKey = yield* Config.redacted("FLUTTERWAVE_ENCRYPTION_KEY");
    const webhookSecret = yield* Config.redacted("FLUTTERWAVE_WEBHOOK_SECRET");
    const httpClient = yield* HttpClient.HttpClient;

    const config: FlutterwaveConfig = {
      secretKey: Redacted.value(secretKey),
      publicKey,
      encryptionKey: Redacted.value(encryptionKey),
      webhookSecret: Redacted.value(webhookSecret),
      baseUrl: "https://api.flutterwave.com/v3",
    };

    const client = new FlutterwaveClient(config, httpClient);

    return FlutterwavePaymentService.of({
      processPayment: (
        userId: UserId,
        amount: Money,
        _paymentMethodId: string,
        reference: string
      ) =>
        Effect.gen(function* () {
          const userEmail = `user-${userId.value}@avdaily.com`;

          const result = yield* pipe(
            client.initializePayment({
              tx_ref: reference,
              amount: amount.value,
              currency: amount.currency,
              customer: { email: userEmail },
              payment_options: "card,banktransfer,ussd",
            }),
            Effect.catchAll((error) =>
              Effect.fail(
                new PaymentError({
                  code: "PAYMENT_INITIALIZATION_FAILED",
                  message: String(error),
                  provider: "Flutterwave",
                  cause: error,
                })
              )
            )
          );

          return {
            transactionId: reference,
            reference,
            status: PaymentStatus.PENDING,
            amount,
            fees: { value: 0, currency: amount.currency } as Money,
            message: "Payment initialized successfully",
            providerResponse: result,
          } as PaymentResult;
        }),

      processWithdrawal: (
        _userId: UserId,
        amount: Money,
        bankAccount: BankAccount,
        reference: string
      ) =>
        Effect.gen(function* () {
          const transfer = yield* pipe(
            client.createTransfer({
              account_bank: bankAccount.bankCode,
              account_number: bankAccount.accountNumber,
              amount: amount.value,
              currency: amount.currency,
              reference,
              narration: "Withdrawal from AV-Daily",
              beneficiary_name: bankAccount.accountName,
            }),
            Effect.catchAll((error) =>
              Effect.fail(
                new PaymentError({
                  code: "TRANSFER_FAILED",
                  message: String(error),
                  provider: "Flutterwave",
                  cause: error,
                })
              )
            )
          );

          return {
            transactionId: transfer.id.toString(),
            reference: transfer.reference,
            status:
              transfer.status === "SUCCESS"
                ? PaymentStatus.SUCCESS
                : PaymentStatus.PENDING,
            amount,
            fees: { value: transfer.fee, currency: amount.currency } as Money,
            message: "Withdrawal initiated successfully",
            providerResponse: transfer,
          } as PaymentResult;
        }),

      verifyTransaction: (reference: string) =>
        Effect.gen(function* () {
          const result = yield* pipe(
            client.verifyTransaction(reference),
            Effect.catchAll((error) =>
              Effect.fail(
                new PaymentError({
                  code: "VERIFICATION_FAILED",
                  message: String(error),
                  provider: "Flutterwave",
                  cause: error,
                })
              )
            )
          );

          const status =
            result.status === "successful"
              ? PaymentStatus.SUCCESS
              : result.status === "failed"
                ? PaymentStatus.FAILED
                : PaymentStatus.PENDING;

          return {
            transactionId: result.id.toString(),
            reference: result.tx_ref,
            status,
            amount: {
              value: result.amount,
              currency: result.currency as CurrencyCode,
            } as Money,
            fees: {
              value: result.app_fee,
              currency: result.currency as CurrencyCode,
            } as Money,
            message: `Transaction ${status}`,
            providerResponse: result,
          } as PaymentResult;
        }),

      getPaymentMethods: (_userId: UserId) =>
        Effect.succeed([] as PaymentMethod[]),

      addPaymentMethod: (
        _userId: UserId,
        _paymentDetails: Record<string, unknown>
      ) =>
        Effect.fail(
          new PaymentError({
            code: "NOT_IMPLEMENTED",
            message: "Add payment method not yet implemented",
            provider: "Flutterwave",
          })
        ),

      removePaymentMethod: (_userId: UserId, _paymentMethodId: string) =>
        Effect.fail(
          new PaymentError({
            code: "NOT_IMPLEMENTED",
            message: "Remove payment method not yet implemented",
            provider: "Flutterwave",
          })
        ),

      getSupportedBanks: () =>
        Effect.gen(function* () {
          const banks = yield* pipe(
            client.listBanks("NG"),
            Effect.catchAll((error) =>
              Effect.fail(
                new PaymentError({
                  code: "BANKS_FETCH_FAILED",
                  message: String(error),
                  provider: "Flutterwave",
                  cause: error,
                })
              )
            )
          );

          return banks.map(
            (bank) =>
              ({
                code: bank.code,
                name: bank.name,
                slug: bank.name.toLowerCase().replace(/\s+/g, "-"),
                country: "NG",
                currency: DEFAULT_CURRENCY,
              }) as Bank
          );
        }),

      resolveBankAccount: (accountNumber: string, bankCode: string) =>
        Effect.gen(function* () {
          const result = yield* pipe(
            client.resolveAccount({
              account_number: accountNumber,
              account_bank: bankCode,
            }),
            Effect.catchAll((error) =>
              Effect.fail(
                new PaymentError({
                  code: "ACCOUNT_RESOLUTION_FAILED",
                  message: String(error),
                  provider: "Flutterwave",
                  cause: error,
                })
              )
            )
          );

          const banks = yield* pipe(
            client.listBanks("NG"),
            Effect.catchAll(() => Effect.succeed([]))
          );
          const bank = banks.find((b: { code: string }) => b.code === bankCode);

          return {
            accountNumber: result.account_number,
            bankCode,
            bankName: bank?.name || "Unknown Bank",
            accountName: result.account_name,
          } as BankAccount;
        }),

      calculateFees: (amount: Money, _transactionType: string) =>
        Effect.succeed({
          value:
            amount.currency === DEFAULT_CURRENCY
              ? Math.min(amount.value * 0.014, 2000)
              : amount.value * 0.038,
          currency: amount.currency,
        } as Money),

      handleWebhook: (payload: Record<string, unknown>, signature: string) =>
        Effect.gen(function* () {
          const isValid = yield* client.verifyWebhookSignature(signature);

          if (!isValid) {
            return yield* Effect.fail(
              new PaymentError({
                code: "INVALID_SIGNATURE",
                message: "Webhook signature verification failed",
                provider: "Flutterwave",
              })
            );
          }

          const event = payload.event as string;
          const data = payload.data as Record<string, unknown>;

          if (event === "charge.completed" || event === "transfer.completed") {
            return {
              transactionId: (data.id as number).toString(),
              reference: data.tx_ref as string,
              status:
                data.status === "successful"
                  ? PaymentStatus.SUCCESS
                  : PaymentStatus.FAILED,
              amount: {
                value: data.amount as number,
                currency: data.currency as CurrencyCode,
              } as Money,
              fees: {
                value: (data.app_fee as number) || 0,
                currency: data.currency as CurrencyCode,
              } as Money,
              message: `Webhook event: ${event}`,
              providerResponse: data,
            } as PaymentResult;
          }

          return yield* Effect.fail(
            new PaymentError({
              code: "UNHANDLED_EVENT",
              message: `Unhandled webhook event: ${event}`,
              provider: "Flutterwave",
            })
          );
        }),
    });
  })
);
