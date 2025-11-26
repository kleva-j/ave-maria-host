# Notifications Service

A flexible and extensible notification service for sending various types of notifications including email, SMS, and push notifications.

## Features

- **Multiple Channels**: Support for email, SMS, and push notifications
- **Templates**: Reusable notification templates with dynamic data
- **Rate Limiting**: Prevent notification spam
- **Delivery Status Tracking**: Track delivery status and retry failed attempts
- **User Preferences**: Respect user notification preferences

## Installation

```bash
# Using pnpm
pnpm add @host/infrastructure

# Using npm
npm install @host/infrastructure
```

## Usage

### Sending Notifications

```typescript
import { NotificationService } from '@host/infrastructure/notifications';

// Send an email
await NotificationService.send({
  type: 'email',
  to: 'user@example.com',
  template: 'welcome',
  data: {
    name: 'John Doe',
    // Other template variables
  },
  metadata: {
    // Additional metadata
  }
});

// Send an SMS
await NotificationService.send({
  type: 'sms',
  to: '+1234567890',
  message: 'Your verification code is: 123456',
  metadata: {
    // Additional metadata
  }
});

// Send a push notification
await NotificationService.send({
  type: 'push',
  to: 'user-device-token',
  title: 'New Message',
  body: 'You have a new message',
  data: {
    // Additional data
  }
});
```

### Notification Templates

Define notification templates in `config/notifications.json`:

```json
{
  "welcome": {
    "subject": "Welcome to Our Service, {{name}}!",
    "text": "Hello {{name}}, welcome to our platform!",
    "html": "<p>Hello <strong>{{name}}</strong>, welcome to our platform!</p>"
  },
  "password_reset": {
    "subject": "Password Reset Request",
    "text": "Your password reset code is: {{code}}",
    "sms": "Your password reset code is: {{code}}"
  }
}
```

### Configuration

```typescript
import { NotificationConfig } from '@host/infrastructure/notifications';

// Configure notification providers
NotificationConfig.setup({
  // Email provider (SMTP)
  email: {
    provider: 'smtp',
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    from: 'noreply@example.com'
  },
  
  // SMS provider (Twilio)
  sms: {
    provider: 'twilio',
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_PHONE_NUMBER
  },
  
  // Push notification provider (Firebase)
  push: {
    provider: 'firebase',
    credentials: process.env.FIREBASE_CREDENTIALS_JSON
  },
  
  // Rate limiting
  rateLimiting: {
    enabled: true,
    max: 5, // Max notifications per window
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many notifications, please try again later.'
  },
  
  // Retry configuration
  retry: {
    maxAttempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000 // Initial delay in ms
    }
  }
});
```

### Custom Notification Providers

Implement custom notification providers by extending the `NotificationProvider` class:

```typescript
import { NotificationProvider, NotificationType } from '@host/infrastructure/notifications';

export class CustomSmsProvider implements NotificationProvider {
  name = 'custom-sms';
  
  async send(notification: NotificationType): Promise<void> {
    // Your custom SMS sending logic here
    console.log(`Sending SMS to ${notification.to}:`, notification.message);
  }
  
  async checkStatus(notificationId: string): Promise<NotificationStatus> {
    // Check delivery status
    return { status: 'delivered' };
  }
}

// Register the custom provider
NotificationService.registerProvider(new CustomSmsProvider());
```

### Handling User Preferences

```typescript
import { UserPreferencesService } from '@host/infrastructure/notifications';

// Get user preferences
const preferences = await UserPreferencesService.getPreferences('user-123');

// Update preferences
await UserPreferencesService.updatePreferences('user-123', {
  email: true,
  sms: false,
  push: true,
  // Channel-specific preferences
  channels: {
    marketing: false,
    security: true,
    updates: true
  }
});

// Check if a notification should be sent
const shouldSend = await UserPreferencesService.shouldNotify('user-123', {
  type: 'email',
  category: 'marketing'
});
```

### Testing

```typescript
import { TestNotificationService } from '@host/infrastructure/test-utils';

describe('NotificationService', () => {
  let notifications: TestNotificationService;

  beforeEach(() => {
    notifications = new TestNotificationService();
  });

  afterEach(async () => {
    await notifications.reset();
  });

  test('should send email notification', async () => {
    await notifications.send({
      type: 'email',
      to: 'test@example.com',
      template: 'welcome',
      data: { name: 'Test User' }
    });

    const sent = await notifications.getSent();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe('test@example.com');
  });
});
```

## License

MIT
