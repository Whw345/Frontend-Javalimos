"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function OAuthError() {
  const error = useSearchParams().get("error");

  if (!error) return null;

  return (
    <p className="text-sm text-red-500">
      {error === "account_not_linked"
        ? "This email already has an account. Login with your password instead."
        : "Could not sign in with Google. Please try again."}
    </p>
  );
}

export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/protected",
      errorCallbackURL: "/auth/login",
    });
    if (error) {
      setError(error.message ?? "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <Suspense>
        <OAuthError />
      </Suspense>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isLoading}
        onClick={handleGoogleSignIn}
      >
        {isLoading ? "Redirecting..." : "Continue with Google"}
      </Button>
    </div>
  );
}
