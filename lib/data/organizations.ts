import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createHash } from "node:crypto";
import { DataError } from "./errors";

export type Organization = {
  id: number;
  name: string;
  registeredAt: string;
};

export async function findOrganizationByApiKey(
  apiKey: string,
): Promise<Organization | null> {
  const { data, error } = await createClient()
    .from("organization")
    .select("id, name, registered_at")
    .eq("api_key_hash", createHash("sha256").update(apiKey).digest("hex"))
    .maybeSingle();

  if (error) {
    throw new DataError("Could not load organization", { cause: error });
  }

  return (
    data && {
      id: data.id,
      name: data.name,
      registeredAt: data.registered_at,
    }
  );
}
