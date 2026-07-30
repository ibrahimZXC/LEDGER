import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Create a .env file with your Supabase project credentials. " +
      "See README.md for setup instructions.",
  );
}

/**
 * Shared Supabase client.
 * Configure via VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");

/** True when Supabase env vars are configured. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
