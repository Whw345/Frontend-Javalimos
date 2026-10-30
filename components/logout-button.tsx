"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await authClient.signOut();
    router.push("/auth/login");
    // Clear the client router cache so the signed-out user's pages can't be
    // reopened with the back button.
    router.refresh();
  };

  return <Button onClick={logout}>Logout</Button>;
}
