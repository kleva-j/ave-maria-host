# Email Verification Environment Variables

## Required Variables

Add these environment variables to your `.env` file:

```bash
# Resend API Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@av-daily.com
EMAIL_FROM_NAME=AV-Daily

# Application URL (for verification links)
APP_URL=https://av-daily.com

# Node Environment
NODE_ENV=development  # or 'production'
```

## Getting Your Resend API Key

1. Sign up at [https://resend.com](https://resend.com)
2. Navigate to API Keys section
3. Create a new API key
4. Copy the key (starts with `re_`)

## Email Domain Setup

### Development
- Use Resend's test domain: `onboarding@resend.dev`
- No DNS configuration needed
- Emails sent to your verified email addresses

### Production
1. Add your domain in Resend dashboard
2. Add DNS records (SPF, DKIM, DMARC)
3. Verify domain
4. Update `EMAIL_FROM` to use your domain

## Testing

### Local Development
```bash
# Set to development to see fallback URLs in console
NODE_ENV=development

# Emails will be sent via Resend
# If Resend fails, verification URL will be logged to console
```

### Production
```bash
# Set to production for production behavior
NODE_ENV=production

# Emails will be sent via Resend
# Errors will be logged but URLs won't be shown
```

## Verification Email Template

The email sent to users includes:
- Professional HTML design with gradient header
- Clear call-to-action button
- 24-hour expiration notice
- Plain text fallback for email clients that don't support HTML

## Rate Limiting

**TODO**: Implement Redis-based rate limiting
- Current: No rate limiting enforced
- Target: 3 verification emails per hour per email address
- Priority: High (before production launch)

## Security Notes

1. **Never commit API keys** - Keep `.env` in `.gitignore`
2. **Use environment-specific keys** - Different keys for dev/staging/prod
3. **Monitor email sending** - Watch for abuse/spam
4. **Implement rate limiting** - Prevent email bombing attacks
