import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Mail, Clock } from "lucide-react";

interface ResendVerificationProps {
  email: string;
  onSuccess?: () => void;
}

export function ResendVerification({
  email,
  onSuccess,
}: ResendVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [retryAfter, setRetryAfter] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for rate limiting
  useEffect(() => {
    if (!retryAfter) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = retryAfter.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown(0);
        setRetryAfter(null);
      } else {
        setCountdown(Math.ceil(diff / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [retryAfter]);

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // TODO: Call RPC endpoint
      // await rpcClient.ResendVerification({ email });

      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess(true);
      onSuccess?.();

      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      if (err.code === "RATE_LIMIT_EXCEEDED") {
        const retryDate = new Date(err.retryAfter);
        setRetryAfter(retryDate);
        setError(
          `Rate limit exceeded. Please wait ${Math.ceil((retryDate.getTime() - Date.now()) / 60000)} minutes`
        );
      } else if (err.code === "EMAIL_ALREADY_VERIFIED") {
        setError("Your email is already verified");
      } else {
        setError(err.message || "Failed to resend verification email");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const canResend = !loading && !retryAfter && !success;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Mail className="w-4 h-4" />
        <span>Didn't receive the email?</span>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>
            Verification email sent successfully! Please check your inbox.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleResend}
        disabled={!canResend}
        variant="outline"
        className="w-full"
      >
        {loading && "Sending..."}
        {success && "Email Sent!"}
        {retryAfter && (
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Retry in {formatCountdown(countdown)}
          </span>
        )}
        {!loading && !success && !retryAfter && "Resend Verification Email"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        You can request up to 3 verification emails per hour
      </p>
    </div>
  );
}
