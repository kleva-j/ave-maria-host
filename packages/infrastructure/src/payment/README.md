# Payment Service

A secure and flexible payment processing service supporting multiple payment providers and payment methods.

## Features

- **Multiple Payment Providers**: Support for Stripe, PayPal, and custom providers
- **Payment Methods**: Credit cards, bank transfers, mobile money, etc.
- **Subscription Billing**: Recurring payments and subscription management
- **Payouts**: Send money to vendors, partners, or customers
- **Webhook Handling**: Process payment events asynchronously
- **Idempotency**: Safe retry of payment operations

## Installation

```bash
# Using pnpm
pnpm add @host/infrastructure

# Using npm
npm install @host/infrastructure
```

## Usage

### Initialize Payment Service

```typescript
import { PaymentService } from '@host/infrastructure/payment';

// Initialize with configuration
PaymentService.initialize({
  defaultProvider: 'stripe',
  providers: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      apiVersion: '2023-08-16'
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox'
    }
  },
  webhookPath: '/api/webhooks/payment',
  successUrl: 'https://example.com/payment/success',
  cancelUrl: 'https://example.com/payment/cancel'
});
```

### Process Payments

#### One-time Payment

```typescript
// Create a payment intent
const payment = await PaymentService.createPayment({
  amount: 1000, // in smallest currency unit (e.g., cents)
  currency: 'usd',
  customer: {
    id: 'cus_123',
    email: 'customer@example.com'
  },
  paymentMethod: 'card',
  metadata: {
    orderId: 'order_123'
  }
});

// Confirm payment (client-side)
const result = await PaymentService.confirmPayment(payment.id, {
  paymentMethod: 'pm_card_visa'
});
```

#### Recurring Payments (Subscriptions)

```typescript
// Create a subscription
const subscription = await PaymentService.createSubscription({
  customerId: 'cus_123',
  priceId: 'price_123',
  paymentMethod: 'pm_card_visa',
  metadata: {
    userId: 'user_123',
    plan: 'premium'
  }
});

// Cancel subscription
await PaymentService.cancelSubscription(subscription.id, {
  cancelAtPeriodEnd: true
});
```

### Handle Webhooks

```typescript
import express from 'express';
import { PaymentService, PaymentWebhookEvent } from '@host/infrastructure/payment';

const app = express();
app.post('/webhooks/payment', express.raw({ type: 'application/json' }), 
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;
    
    try {
      const event = await PaymentService.handleWebhook(req.body, signature);
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSucceeded(event);
          break;
        case 'charge.refunded':
          await handleRefund(event);
          break;
        // Handle other event types
      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }
);
```

### Payment Methods

```typescript
// Add a payment method
const paymentMethod = await PaymentService.addPaymentMethod({
  customerId: 'cus_123',
  type: 'card',
  card: {
    number: '4242424242424242',
    expMonth: 12,
    expYear: 2025,
    cvc: '123'
  },
  billingDetails: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});

// List payment methods
const methods = await PaymentService.listPaymentMethods('cus_123');

// Set default payment method
await PaymentService.setDefaultPaymentMethod('cus_123', 'pm_123');
```

### Payouts

```typescript
// Create a payout
const payout = await PaymentService.createPayout({
  amount: 1000,
  currency: 'usd',
  destination: 'ba_1J8x3x2eZvKYlo2C',
  description: 'Payout for order #123',
  metadata: {
    orderId: 'order_123',
    userId: 'user_123'
  }
});

// Get payout status
const status = await PaymentService.getPayoutStatus(payout.id);
```

### Testing

```typescript
import { TestPaymentService } from '@host/infrastructure/test-utils';

describe('PaymentService', () => {
  let paymentService: TestPaymentService;

  beforeEach(() => {
    paymentService = new TestPaymentService();
  });

  afterEach(async () => {
    await paymentService.reset();
  });

  test('should process payment', async () => {
    const payment = await paymentService.createPayment({
      amount: 1000,
      currency: 'usd',
      customer: {
        id: 'test_customer',
        email: 'test@example.com'
      }
    });

    expect(payment.amount).toBe(1000);
    expect(payment.currency).toBe('usd');
  });
});
```

## Security Considerations

- Always use HTTPS for all API requests
- Never expose API keys in client-side code
- Use webhook signatures to verify event authenticity
- Implement proper error handling and logging
- Comply with PCI DSS requirements when handling card data

## License

MIT
