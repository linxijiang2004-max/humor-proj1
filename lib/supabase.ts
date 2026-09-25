import { createClient } from "@supabase/supabase-js";

// Values come from .env.local locally and from the Vercel project settings in
// production. Next.js inlines NEXT_PUBLIC_* values at build time.
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Set them in .env.local (local) or in Vercel project settings (deployed).",
    );
  }

  return createClient(url, key);
}
