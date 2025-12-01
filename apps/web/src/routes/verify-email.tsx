import { useNavigate, useSearch } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/verify-email" });
  const token = search.token as string | undefined;

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("No verification token provided");
        return;
      }

      try {
        // TODO: Call RPC endpoint
        // await rpcClient.VerifyEmail({ token });

        // Simulate API call for now
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setStatus("success");
        setMessage("Your email has been successfully verified!");

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate({ to: "/dashboard" });
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        if (err.code === "INVALID_TOKEN") {
          setMessage("Invalid or expired verification token");
        } else {
          setMessage(err.message || "Failed to verify email");
        }
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 space-y-6">
        <div className="text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin" />
              <h1 className="text-2xl font-bold">Verifying Your Email</h1>
              <p className="text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
              <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">
                Email Verified!
              </h1>
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                Redirecting to dashboard...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 mx-auto text-red-500" />
              <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
                Verification Failed
              </h1>
              <Alert variant="destructive">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Button
                  onClick={() => navigate({ to: "/request-verification" })}
                  className="w-full"
                >
                  Request New Verification Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/" })}
                  className="w-full"
                >
                  Go to Home
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
