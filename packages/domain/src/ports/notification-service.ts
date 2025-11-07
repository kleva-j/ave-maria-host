import type { UserId } from "../value-objects";

import { type Effect, Data } from "effect";

/**
 * Notification types
 */
export const NotificationType = {
  CONTRIBUTION_REMINDER: "contribution_reminder",
  CONTRIBUTION_SUCCESS: "contribution_success",
  CONTRIBUTION_FAILED: "contribution_failed",
  WITHDRAWAL_SUCCESS: "withdrawal_success",
  WITHDRAWAL_FAILED: "withdrawal_failed",
  AUTO_SAVE_SUCCESS: "auto_save_success",
  AUTO_SAVE_FAILED: "auto_save_failed",
  SECURITY_ALERT: "security_alert",
  PLAN_COMPLETED: "plan_completed",
  PROMOTIONAL: "promotional",
  KYC_UPDATE: "kyc_update",
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

/**
 * Notification channels
 */
export const NotificationChannel = {
  IN_APP: "in_app",
  EMAIL: "email",
  PUSH: "push",
  SMS: "sms",
} as const;

export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

/**
 * Notification message
 */
export interface NotificationMessage {
  readonly title: string;
  readonly body: string;
  readonly data?: Record<string, unknown>;
  readonly actionUrl?: string;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  readonly userId: UserId;
  readonly smsEnabled: boolean;
  readonly pushEnabled: boolean;
  readonly emailEnabled: boolean;
  readonly contributionReminders: boolean;
  readonly transactionAlerts: boolean;
  readonly promotionalMessages: boolean;
  readonly securityAlerts: boolean;
}

/**
 * Notification result
 */
const NotificationResultStatus = {
  SENT: "sent",
  FAILED: "failed",
  PENDING: "pending",
} as const;

export type NotificationResultStatus =
  (typeof NotificationResultStatus)[keyof typeof NotificationResultStatus];

export interface NotificationResult {
  readonly id: string;
  readonly channel: NotificationChannel;
  readonly status: NotificationResultStatus;
  readonly message: string;
  readonly sentAt?: Date;
  readonly deliveredAt?: Date;
}

/**
 * Port interface for notification services
 */
export interface NotificationService {
  /**
   * Send SMS notification
   */
  readonly sendSMS: (
    phoneNumber: string,
    message: string,
    reference?: string
  ) => Effect.Effect<NotificationResult, NotificationError>;

  /**
   * Send push notification
   */
  readonly sendPushNotification: (
    userId: UserId,
    message: NotificationMessage,
    reference?: string
  ) => Effect.Effect<NotificationResult, NotificationError>;

  /**
   * Send email notification
   */
  readonly sendEmail: (
    email: string,
    subject: string,
    htmlContent: string,
    reference?: string
  ) => Effect.Effect<NotificationResult, NotificationError>;

  /**
   * Send notification to user based on their preferences
   */
  readonly sendToUser: (
    userId: UserId,
    type: NotificationType,
    message: NotificationMessage,
    channels?: NotificationChannel[]
  ) => Effect.Effect<NotificationResult[], NotificationError>;

  /**
   * Schedule a notification for later delivery
   */
  readonly scheduleNotification: (
    userId: UserId,
    type: NotificationType,
    message: NotificationMessage,
    scheduledFor: Date,
    channels?: NotificationChannel[]
  ) => Effect.Effect<string, NotificationError>;

  /**
   * Cancel a scheduled notification
   */
  readonly cancelScheduledNotification: (
    notificationId: string
  ) => Effect.Effect<void, NotificationError>;

  /**
   * Get user notification preferences
   */
  readonly getPreferences: (
    userId: UserId
  ) => Effect.Effect<NotificationPreferences, NotificationError>;

  /**
   * Update user notification preferences
   */
  readonly updatePreferences: (
    preferences: NotificationPreferences
  ) => Effect.Effect<void, NotificationError>;

  /**
   * Send bulk notifications
   */
  readonly sendBulkNotifications: (
    notifications: Array<{
      userId: UserId;
      type: NotificationType;
      message: NotificationMessage;
      channels?: NotificationChannel[];
    }>
  ) => Effect.Effect<NotificationResult[], NotificationError>;

  /**
   * Get notification delivery status
   */
  readonly getDeliveryStatus: (
    notificationId: string
  ) => Effect.Effect<NotificationResult, NotificationError>;

  /**
   * Send contribution reminder notifications
   */
  readonly sendContributionReminders: (
    userIds: UserId[]
  ) => Effect.Effect<NotificationResult[], NotificationError>;
}

/**
 * Notification service error
 */

export class NotificationError extends Data.TaggedError("NotificationError")<{
  readonly code: string;
  readonly message: string;
  readonly channel?: NotificationChannel;
  readonly timestamp?: Date;
  readonly cause?: unknown;
}> {
  constructor(args: NotificationError) {
    super({ ...args, timestamp: new Date() });
  }
}
