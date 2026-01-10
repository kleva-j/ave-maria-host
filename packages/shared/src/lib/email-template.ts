/**
 * Helper function to generate verification email plain text
 */
export function generateVerificationEmailText(
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

/**
 * Helper function to generate verification email HTML
 */
export function generateVerificationEmailHtml(
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
