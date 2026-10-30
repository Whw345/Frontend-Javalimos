import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * This client uses the secret key, which bypasses RLS. Only lib/data may import
 * it, and every query on user data must filter by requireCurrentUser().id.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
