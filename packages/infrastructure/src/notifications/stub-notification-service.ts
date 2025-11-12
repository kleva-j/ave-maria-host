import type { UserId } from "@host/domain";

import type {
  NotificationPreferences,
  NotificationService,
  NotificationMessage,
  NotificationChannel,
  NotificationResult,
  NotificationType,
} from "@host/domain";

import { Effect, Context, Layer } from "effect";

/**
 * Stub implementation of NotificationService for development
 * TODO: Replace with actual implementations (Twilio, Firebase, SendGrid, etc.)
 */
export const StubNotificationService = Context.GenericTag<NotificationService>(
  "@infrastructure/StubNotificationService"
);

export const StubNotificationServiceLive = Layer.succeed(
  StubNotificationService,
  StubNotificationService.of({
    sendSMS: (phoneNumber: string, message: string, reference?: string) =>
      Effect.succeed({
        id: reference || crypto.randomUUID(),
        channel: "sms" as NotificationChannel,
        status: "sent" as const,
        message: `SMS sent to ${phoneNumber}: ${message}`,
        sentAt: new Date(),
      } as NotificationResult),

    sendPushNotification: (
      userId: UserId,
      message: NotificationMessage,
      reference?: string
    ) =>
      Effect.succeed({
        id: reference || crypto.randomUUID(),
        channel: "push" as NotificationChannel,
        status: "sent" as const,
        message: `Push notification sent to user ${userId.value}: ${message.title}`,
        sentAt: new Date(),
      } as NotificationResult),

    sendEmail: (
      email: string,
      subject: string,
      _htmlContent: string,
      reference?: string
    ) =>
      Effect.succeed({
        id: reference || crypto.randomUUID(),
        channel: "email" as NotificationChannel,
        status: "sent" as const,
        message: `Email sent to ${email}: ${subject}`,
        sentAt: new Date(),
      } as NotificationResult),

    sendToUser: (
      userId: UserId,
      _type: NotificationType,
      message: NotificationMessage,
      _channels?: NotificationChannel[]
    ) =>
      Effect.succeed([
        {
          id: crypto.randomUUID(),
          channel: "in_app" as NotificationChannel,
          status: "sent" as const,
          message: `Notification sent to user ${userId.value}: ${message.title}`,
          sentAt: new Date(),
        },
      ] as NotificationResult[]),

    scheduleNotification: (
      _userId: UserId,
      _type: NotificationType,
      _message: NotificationMessage,
      _scheduledFor: Date,
      _channels?: NotificationChannel[]
    ) => Effect.succeed(crypto.randomUUID()),

    cancelScheduledNotification: (_notificationId: string) =>
      Effect.succeed(undefined),

    getPreferences: (userId: UserId) =>
      Effect.succeed({
        userId,
        smsEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
        contributionReminders: true,
        transactionAlerts: true,
        promotionalMessages: false,
        securityAlerts: true,
      } as NotificationPreferences),

    updatePreferences: (_preferences: NotificationPreferences) =>
      Effect.succeed(undefined),

    sendBulkNotifications: (
      notifications: Array<{
        userId: UserId;
        type: NotificationType;
        message: NotificationMessage;
        channels?: NotificationChannel[];
      }>
    ) =>
      Effect.succeed(
        notifications.map(
          (n) =>
            ({
              id: crypto.randomUUID(),
              channel: "in_app" as NotificationChannel,
              status: "sent" as const,
              message: `Notification sent to user ${n.userId.value}`,
              sentAt: new Date(),
            }) as NotificationResult
        )
      ),

    getDeliveryStatus: (notificationId: string) =>
      Effect.succeed({
        id: notificationId,
        channel: "in_app" as NotificationChannel,
        status: "sent" as const,
        message: "Notification delivered",
        sentAt: new Date(),
        deliveredAt: new Date(),
      } as NotificationResult),

    sendContributionReminders: (userIds: UserId[]) =>
      Effect.succeed(
        userIds.map(
          (userId) =>
            ({
              id: crypto.randomUUID(),
              channel: "push" as NotificationChannel,
              status: "sent" as const,
              message: `Contribution reminder sent to user ${userId.value}`,
              sentAt: new Date(),
            }) as NotificationResult
        )
      ),
  })
);
