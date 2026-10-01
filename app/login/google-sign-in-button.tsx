"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    // Exactly /auth/callback, no query params: it must match the redirect URL
    // allow-listed in Supabase.
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <button
      onClick={signIn}
      disabled={loading}
      className="w-full rounded-lg border border-gray-300 px-4 py-3 font-medium hover:bg-gray-50 disabled:opacity-60 dark:hover:bg-gray-900"
    >
      {loading ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}
