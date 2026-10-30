import "server-only";

import { auth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { DataError } from "./errors";

export type User = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

const columns = "id, name, email, image";

// Validates the session against the database, once per request.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return null;

  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
});

export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  return user;
}

// findUserByEmail and listUsers don't check the session, so they expose other
// people's data. Only call them from functions that authorize the caller first.
export async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await createClient()
    .from("user")
    .select(columns)
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw new DataError("Could not load user", { cause: error });

  return data;
}

export async function listUsers(ids: string[]): Promise<User[]> {
  const { data, error } = await createClient()
    .from("user")
    .select(columns)
    .in("id", ids);

  if (error) throw new DataError("Could not load users", { cause: error });

  return data;
}
