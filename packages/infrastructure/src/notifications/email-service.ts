import { Effect, Context, Layer, Data, Config, Duration } from "effect";
import { Resend } from "resend";

type CustomError = {
  message: string;
  cause?: unknown;
};

/**
 * Email service errors
 */
export class EmailError extends Data.TaggedError("EmailError")<CustomError> {}

/**
 * Email rate limit error
 */
export class EmailRateLimitError extends Data.TaggedError(
  "EmailRateLimitError"
)<CustomError & { email: string; retryAfter?: Date }> {}

/**
 * Email service interface
 */
type EmailServiceError = EmailError | EmailRateLimitError;

export interface EmailService {
  /**
   * Send email verification email with token
   */
  readonly sendVerificationEmail: (
    email: string,
    token: string,
    userName: string
  ) => Effect.Effect<void, EmailServiceError>;

  /**
   * Send generic email
   */
  readonly sendEmail: (
    to: string,
    subject: string,
    html: string,
    text?: string
  ) => Effect.Effect<void, EmailServiceError>;

  /**
   * Send templated email
   */
  readonly sendTemplateEmail: (
    to: string,
    templateId: string,
    data: Record<string, unknown>
  ) => Effect.Effect<void, EmailServiceError>;
}

/**
 * Context tag for EmailService
 */
export const EmailService = Context.GenericTag<EmailService>(
  "@infrastructure/EmailService"
);

export type EmailServiceConfig = {
  fromEmail: string;
  fromName: string;
  appUrl: string;
};

type EmailData = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const oneHourDuration = Duration.toMillis(Duration.hours(1));

/**
 * Resend email service implementation
 */
class ResendEmailServiceImpl implements EmailService {
  constructor(
    private readonly resend: Resend,
    private readonly config: EmailServiceConfig
  ) {}

  sendVerificationEmail = (
    email: string,
    token: string,
    userName: string
  ): Effect.Effect<void, EmailServiceError> =>
    Effect.tryPromise({
      try: async () => {
        const verificationUrl = `${this.config.appUrl}/verify-email?token=${token}`;

        const html = this.generateVerificationEmailHtml(
          userName,
          verificationUrl
        );
        const text = this.generateVerificationEmailText(
          userName,
          verificationUrl
        );

        const result = await this.resend.emails.send({
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: email,
          subject: "Verify your email address",
          html,
          text,
        });

        if (result.error) {
          if (result.error.name === "rate_limit_exceeded") {
            throw new EmailRateLimitError({
              message: `Rate limit exceeded for email: ${email}`,
              retryAfter: new Date(Date.now() + oneHourDuration), // 1 hour from now
              cause: result.error,
              email,
            });
          }
          throw new EmailError({
            message: `Failed to send verification email: ${result.error.message}`,
            cause: result.error,
          });
        }
      },
      catch: (error) => {
        if (
          error instanceof EmailError ||
          error instanceof EmailRateLimitError
        ) {
          return error;
        }
        return new EmailError({
          message: "Failed to send verification email",
          cause: error,
        });
      },
    });

  sendEmail = (
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Effect.Effect<void, EmailServiceError> =>
    Effect.tryPromise({
      try: async () => {
        const emailData: EmailData = {
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          subject,
          html,
          to,
        };
        if (text) {
          emailData.text = text;
        }
        const result = await this.resend.emails.send(emailData);

        if (result.error) {
          if (result.error.name === "rate_limit_exceeded") {
            throw new EmailRateLimitError({
              message: `Rate limit exceeded for email: ${to}`,
              email: to,
              retryAfter: new Date(Date.now() + oneHourDuration), // 1 hour from now
              cause: result.error,
            });
          }
          throw new EmailError({
            message: `Failed to send email: ${result.error.message}`,
            cause: result.error,
          });
        }
      },
      catch: (error) => {
        if (
          error instanceof EmailError ||
          error instanceof EmailRateLimitError
        ) {
          return error;
        }
        return new EmailError({
          message: "Failed to send email",
          cause: error,
        });
      },
    });

  sendTemplateEmail = (
    _to: string,
    _templateId: string,
    _data: Record<string, unknown>
  ): Effect.Effect<void, EmailServiceError> =>
    Effect.tryPromise({
      try: async () => {
        // Resend doesn't have built-in templates, so we'll implement this later
        // For now, throw an error
        throw new EmailError({
          message: "Template emails not yet implemented",
        });
      },
      catch: (error) => {
        if (
          error instanceof EmailError ||
          error instanceof EmailRateLimitError
        ) {
          return error;
        }
        return new EmailError({
          message: "Failed to send template email",
          cause: error,
        });
      },
    });

  private generateVerificationEmailHtml(
    userName: string,
    verificationUrl: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">AV-Daily</h1>
  </div>
  
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Hi ${userName},</h2>
    
    <p style="font-size: 16px; color: #555;">
      Welcome to AV-Daily! We're excited to have you on board. Please verify your email address to get started with your savings journey.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 14px 32px; 
                text-decoration: none; 
                border-radius: 6px; 
                font-weight: 600;
                font-size: 16px;
                display: inline-block;">
        Verify Email Address
      </a>
    </div>
    
    <p style="font-size: 14px; color: #777; margin-top: 30px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="font-size: 14px; color: #667eea; word-break: break-all;">
      ${verificationUrl}
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999;">
      This verification link will expire in 24 hours. If you didn't create an account with AV-Daily, you can safely ignore this email.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>© ${new Date().getFullYear()} AV-Daily. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim();
  }

  private generateVerificationEmailText(
    userName: string,
    verificationUrl: string
  ): string {
    return `
Hi ${userName},

Welcome to AV-Daily! We're excited to have you on board.

Please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account with AV-Daily, you can safely ignore this email.

---
© ${new Date().getFullYear()} AV-Daily. All rights reserved.
    `.trim();
  }
}

/**
 * Create Resend email service layer
 */
export const makeResendEmailService = (config: {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  appUrl: string;
}): Layer.Layer<EmailService, never, never> => {
  return Layer.succeed(
    EmailService,
    new ResendEmailServiceImpl(new Resend(config.apiKey), {
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      appUrl: config.appUrl,
    })
  );
};

/**
 * Create email service from environment variables
 */
export const ResendEmailServiceLive = Layer.effect(
  EmailService,
  Effect.gen(function* () {
    const { apiKey, fromEmail, fromName, appUrl } = yield* Config.all({
      apiKey: Config.string("RESEND_API_KEY"),
      fromEmail: Config.string("EMAIL_FROM").pipe(
        Config.withDefault("noreply@av-daily.com")
      ),
      fromName: Config.string("EMAIL_FROM_NAME").pipe(
        Config.withDefault("AV-Daily")
      ),
      appUrl: Config.string("APP_URL").pipe(
        Config.withDefault("http://localhost:3001")
      ),
    });

    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }

    const config: EmailServiceConfig = { fromEmail, fromName, appUrl };

    return new ResendEmailServiceImpl(new Resend(apiKey), config);
  })
);
