import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface EmailVerificationRequestProps {
  onSuccess?: () => void;
}

export function EmailVerificationRequest({
  onSuccess,
}: EmailVerificationRequestProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [retryAfter, setRetryAfter] = useState<Date | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // TODO: Call RPC endpoint
      // const result = await rpcClient.RequestVerification({ email });

      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      if (err.code === "RATE_LIMIT_EXCEEDED") {
        setRetryAfter(new Date(err.retryAfter));
        setError(
          `Rate limit exceeded. Please try again after ${new Date(err.retryAfter).toLocaleTimeString()}`
        );
      } else if (err.code === "EMAIL_ALREADY_VERIFIED") {
        setError("This email is already verified");
      } else {
        setError(err.message || "Failed to send verification email");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Verify Your Email</h2>
        <p className="text-muted-foreground">
          We'll send you a verification link to confirm your email address
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || success}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>
              Verification email sent! Please check your inbox and click the
              link to verify your email. The link will expire in 24 hours.
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading || success || !email}
        >
          {loading
            ? "Sending..."
            : success
              ? "Email Sent!"
              : "Send Verification Email"}
        </Button>
      </form>

      {retryAfter && (
        <p className="text-sm text-muted-foreground text-center">
          You can request another email after {retryAfter.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
