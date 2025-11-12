import type { HttpClientError } from "@effect/platform";
import type { UserId, Money } from "@host/domain";
import type {
  PaymentService,
  PaymentResult,
  PaymentMethod,
  BankAccount,
  Bank,
} from "@host/domain";

import { Effect, Context, Layer, Config, Data, pipe, Redacted } from "effect";
import { PaymentError, PaymentStatus } from "@host/domain";
import {
  HttpClientResponse,
  HttpClientRequest,
  HttpClient,
} from "@effect/platform";

/**
 * Paystack API configuration
 */
interface PaystackConfig {
  readonly secretKey: string;
  readonly publicKey: string;
  readonly webhookSecret: string;
  readonly baseUrl: string;
}

/**
 * Paystack API response wrapper
 */
interface PaystackResponse {
  readonly status: boolean;
  readonly message: string;
  readonly data: unknown;
}

/**
 * Paystack API errors
 */
class PaystackApiError extends Data.TaggedError("PaystackApiError")<{
  readonly message: string;
  readonly statusCode?: number;
  readonly cause?: unknown;
}> {}

/**
 * Paystack API client using @effect/platform
 */
class PaystackClient {
  constructor(
    private readonly config: PaystackConfig,
    private readonly httpClient: HttpClient.HttpClient
  ) {}

  private request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: unknown;
      query?: Record<string, string>;
    } = {}
  ): Effect.Effect<T, PaystackApiError | HttpClientError.HttpClientError> {
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
        const paystackResponse = (yield* HttpClientResponse.json(
          response
        )) as PaystackResponse;

        // Validate Paystack response status
        if (!paystackResponse.status) {
          return yield* Effect.fail(
            new PaystackApiError({
              message:
                paystackResponse.message || "Paystack API request failed",
            })
          );
        }

        return paystackResponse.data as T;
      }),

      // Add logging
      Effect.tap(() =>
        Effect.logDebug(`Paystack API request: ${method} ${endpoint}`)
      ),
      Effect.tapError((error) =>
        Effect.logError(`Paystack API error: ${method} ${endpoint}`, error)
      )
    );
  }

  initializeTransaction(params: {
    email: string;
    amount: number;
    reference: string;
    currency: string;
  }): Effect.Effect<
    {
      authorization_url: string;
      access_code: string;
      reference: string;
    },
    PaystackApiError | HttpClientError.HttpClientError
  > {
    return this.request("/transaction/initialize", {
      method: "POST",
      body: params,
    });
  }

  verifyTransaction(reference: string): Effect.Effect<
    {
      reference: string;
      amount: number;
      currency: string;
      status: string;
      fees: number;
      customer: { email: string };
    },
    PaystackApiError | HttpClientError.HttpClientError
  > {
    return this.request(`/transaction/verify/${reference}`, {
      method: "GET",
    });
  }

  createTransferRecipient(params: {
    type: string;
    name: string;
    account_number: string;
    bank_code: string;
    currency: string;
  }): Effect.Effect<
    {
      recipient_code: string;
      type: string;
      name: string;
      details: {
        account_number: string;
        bank_code: string;
        bank_name: string;
      };
    },
    PaystackApiError | HttpClientError.HttpClientError
  > {
    return this.request("/transferrecipient", {
      method: "POST",
      body: params,
    });
  }

  initiateTransfer(params: {
    source: string;
    amount: number;
    recipient: string;
    reference: string;
    reason?: string;
  }): Effect.Effect<
    {
      reference: string;
      transfer_code: string;
      status: string;
      amount: number;
    },
    PaystackApiError | HttpClientError.HttpClientError
  > {
    return this.request("/transfer", {
      method: "POST",
      body: params,
    });
  }

  listBanks(
    params: {
      country?: string;
      currency?: string;
    } = {}
  ): Effect.Effect<
    Array<{
      id: number;
      name: string;
      slug: string;
      code: string;
      country: string;
      currency: string;
    }>,
    PaystackApiError | HttpClientError.HttpClientError
  > {
    return this.request("/bank", {
      method: "GET",
      query: params as Record<string, string>,
    });
  }

  resolveAccountNumber(params: {
    account_number: string;
    bank_code: string;
  }): Effect.Effect<
    {
      account_number: string;
      account_name: string;
      bank_id: number;
    },
    PaystackApiError | HttpClientError.HttpClientError
  > {
    return this.request("/bank/resolve", {
      method: "GET",
      query: params,
    });
  }

  verifyWebhookSignature(
    payload: string,
    signature: string
  ): Effect.Effect<boolean, never> {
    return Effect.sync(() => {
      const crypto = require("node:crypto");
      const hash = crypto
        .createHmac("sha512", this.config.webhookSecret)
        .update(payload)
        .digest("hex");
      return hash === signature;
    });
  }
}

/**
 * Paystack implementation of PaymentService
 */
export const PaystackPaymentService = Context.GenericTag<PaymentService>(
  "@infrastructure/PaystackPaymentService"
);

export const PaystackPaymentServiceLive = Layer.effect(
  PaystackPaymentService,
  Effect.gen(function* () {
    const secretKey = yield* Config.redacted("PAYSTACK_SECRET_KEY");
    const publicKey = yield* Config.string("PAYSTACK_PUBLIC_KEY");
    const webhookSecret = yield* Config.redacted("PAYSTACK_WEBHOOK_SECRET");
    const httpClient = yield* HttpClient.HttpClient;

    const config: PaystackConfig = {
      secretKey: Redacted.value(secretKey),
      publicKey,
      webhookSecret: Redacted.value(webhookSecret),
      baseUrl: "https://api.paystack.co",
    };

    const client = new PaystackClient(config, httpClient);

    return PaystackPaymentService.of({
      processPayment: (
        userId: UserId,
        amount: Money,
        paymentMethodId: string,
        reference: string
      ) =>
        Effect.gen(function* () {
          // Convert amount to kobo (Paystack uses smallest currency unit)
          const amountInKobo = Math.round(amount.value * 100);

          // For now, we'll use a placeholder email - in production, fetch from user service
          const userEmail = `user-${userId.value}@avdaily.com`;

          const result = yield* pipe(
            client.initializeTransaction({
              email: userEmail,
              amount: amountInKobo,
              reference,
              currency: amount.currency,
            }),
            Effect.catchAll((error) =>
              Effect.fail(
                new PaymentError({
                  code: "PAYMENT_INITIALIZATION_FAILED",
                  message: String(error),
                  provider: "Paystack",
                  cause: error,
                })
              )
            )
          );

          return {
            transactionId: result.reference,
            reference: result.reference,
            status: PaymentStatus.PENDING,
            amount,
            fees: { value: 0, currency: amount.currency } as Money,
            message: "Payment initialized successfully",
            providerResponse: result,
          } as PaymentResult;
        }),

      processWithdrawal: (
        userId: UserId,
        amount: Money,
        bankAccount: BankAccount,
        reference: string
      ) =>
        Effect.gen(function* () {
          // Create transfer recipient
          const recipient = yield* pipe(
            client.createTransferRecipient({
              type: "nuban",
              name: bankAccount.accountName,
              account_number: bankAccount.accountNumber,
              bank_code: bankAccount.bankCode,
              currency: amount.currency,
            }),
            Effect.catchAll((error) =>
              Effect.fail(
                new PaymentError({
                  code: "RECIPIENT_CREATION_FAILED",
                  message: String(error),
                  provider: "Paystack",
                  cause: error,
                })
              )
            )
          );

          // Initiate transfer
          const amountInKobo = Math.round(amount.value * 100);
          const transfer = yield* pipe(
            client.initiateTransfer({
              source: "balance",
              amount: amountInKobo,
              recipient: recipient.recipient_code,
              reference,
              reason: "Withdrawal from AV-Daily",
            }),
            Effect.catchAll((error) =>
              Effect.fail(
                new PaymentError({
                  code: "TRANSFER_FAILED",
                  message: String(error),
                  provider: "Paystack",
                  cause: error,
                })
              )
            )
          );

          return {
            transactionId: transfer.transfer_code,
            reference: transfer.reference,
            status:
              transfer.status === "success"
                ? PaymentStatus.SUCCESS
                : PaymentStatus.PENDING,
            amount,
            fees: { value: 0, currency: amount.currency } as Money,
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
                  provider: "Paystack",
                  cause: error,
                })
              )
            )
          );

          const status =
            result.status === "success"
              ? PaymentStatus.SUCCESS
              : result.status === "failed"
                ? PaymentStatus.FAILED
                : PaymentStatus.PENDING;

          return {
            transactionId: result.reference,
            reference: result.reference,
            status,
            amount: {
              value: result.amount / 100,
              currency: result.currency as "NGN" | "USD" | "EUR",
            } as Money,
            fees: {
              value: result.fees / 100,
              currency: result.currency as "NGN" | "USD" | "EUR",
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
            provider: "Paystack",
          })
        ),

      removePaymentMethod: (_userId: UserId, _paymentMethodId: string) =>
        Effect.fail(
          new PaymentError({
            code: "NOT_IMPLEMENTED",
            message: "Remove payment method not yet implemented",
            provider: "Paystack",
          })
        ),

      getSupportedBanks: () =>
        Effect.gen(function* () {
          const banks = yield* pipe(
            client.listBanks({ country: "nigeria", currency: "NGN" }),
            Effect.catchAll((error) =>
              Effect.fail(
                new PaymentError({
                  code: "BANKS_FETCH_FAILED",
                  message: String(error),
                  provider: "Paystack",
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
                slug: bank.slug,
                country: bank.country,
                currency: bank.currency,
              }) as Bank
          );
        }),

      resolveBankAccount: (accountNumber: string, bankCode: string) =>
        Effect.gen(function* () {
          const result = yield* pipe(
            client.resolveAccountNumber({
              account_number: accountNumber,
              bank_code: bankCode,
            }),
            Effect.catchAll((error) =>
              Effect.fail(
                new PaymentError({
                  code: "ACCOUNT_RESOLUTION_FAILED",
                  message: String(error),
                  provider: "Paystack",
                  cause: error,
                })
              )
            )
          );

          // Fetch bank name from banks list
          const banks = yield* pipe(
            client.listBanks({ country: "nigeria", currency: "NGN" }),
            Effect.catchAll(() => Effect.succeed([]))
          );
          const bank = banks.find((b) => b.code === bankCode);

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
            amount.currency === "NGN"
              ? Math.min(amount.value * 0.015, 2000)
              : amount.value * 0.039 + 100,
          currency: amount.currency,
        } as Money),

      handleWebhook: (payload: Record<string, unknown>, signature: string) =>
        Effect.gen(function* () {
          const payloadString = JSON.stringify(payload);

          const isValid = yield* client.verifyWebhookSignature(
            payloadString,
            signature
          );

          if (!isValid) {
            return yield* Effect.fail(
              new PaymentError({
                code: "INVALID_SIGNATURE",
                message: "Webhook signature verification failed",
                provider: "Paystack",
              })
            );
          }

          const event = payload.event as string;
          const data = payload.data as Record<string, unknown>;

          if (event === "charge.success" || event === "transfer.success") {
            return {
              transactionId: data.reference as string,
              reference: data.reference as string,
              status: PaymentStatus.SUCCESS,
              amount: {
                value: (data.amount as number) / 100,
                currency: data.currency as "NGN" | "USD" | "EUR",
              } as Money,
              fees: {
                value: ((data.fees as number) || 0) / 100,
                currency: data.currency as "NGN" | "USD" | "EUR",
              } as Money,
              message: `Webhook event: ${event}`,
              providerResponse: data,
            } as PaymentResult;
          }

          return yield* Effect.fail(
            new PaymentError({
              code: "UNHANDLED_EVENT",
              message: `Unhandled webhook event: ${event}`,
              provider: "Paystack",
            })
          );
        }),
    });
  })
);
