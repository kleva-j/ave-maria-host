import { Layer } from "effect";
import { HttpClient } from "@effect/platform";

import {
  PaystackPaymentServiceLive,
  FlutterwavePaymentServiceLive,
  CompositePaymentServiceLive,
} from "./index";

/**
 * Individual payment service layers
 */
export const PaystackLayer = PaystackPaymentServiceLive.pipe(
  Layer.provide(HttpClient.layer)
);

export const FlutterwaveLayer = FlutterwavePaymentServiceLive.pipe(
  Layer.provide(HttpClient.layer)
);

/**
 * Composite payment service layer with failover support
 * This layer provides both Paystack and Flutterwave services with automatic failover
 */
export const CompositePaymentLayer = CompositePaymentServiceLive.pipe(
  Layer.provide(PaystackLayer),
  Layer.provide(FlutterwaveLayer)
);

/**
 * Default payment layer - uses composite service for production
 * For testing or specific use cases, you can use individual service layers
 */
export const PaymentLayer = CompositePaymentLayer;

/**
 * Payment layer for testing with mock services
 */
export const MockPaymentLayer = Layer.succeed(
  // This would be implemented with a mock payment service
  // For now, we'll use the composite layer
  CompositePaymentLayer
);
